import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Contacts } from '@capacitor-community/contacts';
import { Capacitor } from '@capacitor/core';
import { arrayUnion, collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { AnimatePresence, AnimatePresenceProps, motion } from 'framer-motion';
import { Loader2, Mail, Phone, Search, UserPlus, X } from 'lucide-react';
import toast from 'react-hot-toast';

import { auth, db } from '../../firebase';

interface Friend {
  uid: string;
  name: string;
  email: string;
  statusMessage?: string;
  photoURL?: string;
  group?: string;
}

interface UserInfo {
  uid: string;
  email: string;
  name: string;
  friendsList: Friend[];
}

interface AddFromContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  myInfo: UserInfo | null;
  existingFriends: Friend[];
}

interface LocalPhoneNumber {
  label: string;
  number?: string;
}

interface LocalEmailAddress {
  label: string;
  address?: string;
}

interface LocalContact {
  contactId: string;
  name?: {
    display?: string;
  };
  phones?: LocalPhoneNumber[];
  emails?: LocalEmailAddress[];
}

/**
 * 연락처에서 친구 추가 모달 컴포넌트
 * - 모바일 기기의 연락처를 불러와서 앱 사용자인 경우 친구로 추가할 수 있습니다.
 * - 연락처 접근 권한 요청 및 검색 기능을 제공합니다.
 * @param {boolean} isOpen - 모달 열림 여부
 * @param {function} onClose - 모달 닫기 핸들러
 * @param {UserInfo | null} myInfo - 현재 사용자 정보
 * @param {Friend[]} existingFriends - 이미 친구인 사용자 목록
 */
const AddFromContactsModal: React.FC<AddFromContactsModalProps> = ({ isOpen, onClose, myInfo, existingFriends }) => {
  const [contacts, setContacts] = useState<LocalContact[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const sheetTouchStartY = useRef<number | null>(null);
  const sheetTouchEndY = useRef<number | null>(null);
  const minSheetSwipeDistance = 50;

  const AnimatePresenceSafe = AnimatePresence as React.FC<React.PropsWithChildren<AnimatePresenceProps>>;

  // 모달 열림/닫힘에 따른 초기화 및 연락처 로딩
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setContacts([]);
      setPermissionGranted(false);
      return;
    }

    const loadContacts = async () => {
      if (!Capacitor.isNativePlatform()) {
        toast.error('이 기능은 모바일 기기에서만 지원됩니다.');
        onClose();
        return;
      }

      setIsLoading(true);
      try {
        let permission = await Contacts.checkPermissions();

        if (permission.contacts === 'prompt' || permission.contacts === 'prompt-with-rationale') {
          permission = await Contacts.requestPermissions();
        }
        if (permission.contacts === 'granted') {
          setPermissionGranted(true);
          const contactList = await Contacts.getContacts({
            projection: {
              name: true,
              emails: true,
              phones: true,
            },
          });
          setContacts(contactList.contacts as unknown as LocalContact[]); // Cast to local type
        } else {
          toast.error('연락처 접근 권한이 필요합니다. 설정에서 허용해주세요.'); // 'denied'
          setPermissionGranted(false);
        }
      } catch (error) {
        console.error('Error loading contacts:', error);
        toast.error('연락처를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    loadContacts();
  }, [isOpen, onClose]);

  // 검색어에 따른 연락처 필터링
  const filteredContacts = useMemo(() => {
    if (!searchTerm) return contacts;
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return contacts.filter(
      (contact) =>
        contact.name?.display?.toLowerCase().includes(lowerCaseSearchTerm) ||
        contact.phones?.some((p) => p.number?.includes(lowerCaseSearchTerm)) ||
        contact.emails?.some((e) => e.address?.toLowerCase().includes(lowerCaseSearchTerm)),
    );
  }, [contacts, searchTerm]);

  /** 친구 추가 핸들러 */
  const handleAddFriend = async (contact: LocalContact) => {
    if (!myInfo || !auth.currentUser) {
      toast.error('로그인이 필요합니다.');
      return;
    }

    const contactEmails = contact.emails?.map((e) => e.address?.toLowerCase()).filter(Boolean) || [];

    // 전화번호를 하이픈이 있는 형식과 없는 형식 모두로 변환하여 검색 정확도를 높임
    const allPossiblePhoneFormats: string[] = [];
    contact.phones?.forEach((phone) => {
      if (!phone.number) return;
      let digits = phone.number.replace(/[^\d]/g, '');
      // 국제 번호(+82)를 국내 번호(0)로 변환
      if (digits.startsWith('82')) {
        digits = '0' + digits.substring(2);
      }
      // 010으로 시작하는 11자리 번호만 처리
      if (digits.startsWith('010') && digits.length === 11) {
        allPossiblePhoneFormats.push(digits); // "01012345678"
        allPossiblePhoneFormats.push(`${digits.substring(0, 3)}-${digits.substring(3, 7)}-${digits.substring(7)}`); // "010-1234-5678"
      }
    });
    const contactPhones = Array.from(new Set(allPossiblePhoneFormats));

    if (contactEmails.length === 0 && contactPhones.length === 0) {
      toast.error('친구의 이메일 또는 전화번호 정보가 없습니다.');
      return;
    }

    try {
      let friendDoc: any = null;

      // 1. 이메일로 사용자 찾기
      if (contactEmails.length > 0) {
        const q = query(collection(db, 'users'), where('email', 'in', contactEmails));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          friendDoc = querySnapshot.docs[0];
        }
      }

      // 2. 전화번호로 사용자 찾기 (이메일로 못 찾았을 경우)
      if (!friendDoc && contactPhones.length > 0) {
        // Firestore 'in' 쿼리는 최대 30개의 값을 가질 수 있습니다. 쿼리 실패 방지를 위해 30개로 제한합니다.
        const phoneQueryValues = contactPhones.slice(0, 30);
        const q = query(collection(db, 'users'), where('phone', 'in', phoneQueryValues));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          friendDoc = querySnapshot.docs[0];
        }
      }

      if (friendDoc) {
        const friendData = friendDoc.data();
        const friendUid = friendDoc.id;

        if (friendUid === auth.currentUser!.uid) {
          toast('본인은 친구로 추가할 수 없습니다.');
          return;
        }
        if (existingFriends.some((f) => f.uid === friendUid)) {
          toast('이미 친구입니다.');
          return;
        }

        const newFriend: Omit<Friend, 'group'> = {
          uid: friendUid, // Use the document ID as the UID
          name: friendData.name,
          email: friendData.email,
          statusMessage: friendData.statusMessage || '',
          photoURL: friendData.photoURL || '',
        };

        const userRef = doc(db, 'users', auth.currentUser!.uid);
        await updateDoc(userRef, {
          friendsList: arrayUnion(newFriend),
        });
        toast.success(`${newFriend.name}님을 친구로 추가했습니다!`);
        onClose();
      } else {
        toast.error('해당 연락처와 일치하는 사용자를 찾을 수 없습니다.');
      }
    } catch (error) {
      console.error('Error adding friend from contacts:', error);
      toast.error('친구 추가 중 오류가 발생했습니다.');
    }
  };

  // --- 바텀 시트 스와이프 핸들러 ---
  const onSheetTouchStart = (e: React.TouchEvent) => {
    sheetTouchEndY.current = null;
    sheetTouchStartY.current = e.targetTouches[0].clientY;
  };

  const onSheetTouchMove = (e: React.TouchEvent) => {
    sheetTouchEndY.current = e.targetTouches[0].clientY;
  };

  const onSheetTouchEnd = () => {
    if (!sheetTouchStartY.current || !sheetTouchEndY.current) return;
    const distance = sheetTouchEndY.current - sheetTouchStartY.current;
    if (distance > minSheetSwipeDistance) {
      onClose();
    }
  };

  return (
    <AnimatePresenceSafe>
      {isOpen && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          {/* 배경 오버레이 */}
          <motion.div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div
            className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-t-4xl pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl h-[80vh] flex flex-col"
            initial={{ y: '100%' }}
            animate={{ y: '0%' }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            <button onClick={onClose} className="absolute top-4 right-4 p-2 text-sub hover:text-main dark:text-gray-500 dark:hover:text-gray-300">
              <X size={20} />
            </button>
            {/* 헤더 영역 (스와이프 핸들 포함) */}
            <div className="px-6 pt-6" onTouchStart={onSheetTouchStart} onTouchMove={onSheetTouchMove} onTouchEnd={onSheetTouchEnd}>
              <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full mx-auto mb-6" />
              <h3 className="text-xl font-black text-main dark:text-white mb-4">연락처에서 친구 추가</h3>
            </div>
            {/* 권한 없음 상태 표시 */}
            {!permissionGranted && !isLoading && (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-sub dark:text-gray-400 px-6">
                <UserPlus size={48} className="mb-4 opacity-30" />
                <p className="font-bold">연락처 접근 권한이 필요합니다.</p>
                <p className="text-sm">설정에서 권한을 허용해주세요.</p>
              </div>
            )}

            {permissionGranted && (
              <>
                {/* 검색 입력창 */}
                <div className="mb-4 px-6">
                  <div className="relative flex items-center">
                    <Search size={18} className="absolute left-4 text-sub dark:text-gray-500 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="이름, 전화번호, 이메일로 검색"
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl text-main dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                {/* 로딩 및 연락처 목록 */}
                {isLoading ? (
                  <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="animate-spin text-primary w-8 h-8" />
                  </div>
                ) : (
                  /* 연락처 리스트 영역 */
                  <div className="flex-1 overflow-y-auto space-y-2 px-6">
                    {filteredContacts.length > 0 ? (
                      filteredContacts.map((contact, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/20 dark:bg-blue-900/20 flex items-center justify-center text-primary dark:text-blue-300 font-bold text-sm overflow-hidden">
                              {contact.name?.display ? contact.name.display[0] : '?'}
                            </div>
                            <div>
                              <p className="font-bold text-main dark:text-white">{contact.name?.display || '이름 없음'}</p>
                              {contact.phones && contact.phones.length > 0 && (
                                <p className="text-xs text-sub dark:text-gray-400 flex items-center gap-1">
                                  <Phone size={12} /> {contact.phones[0].number || '번호 없음'}
                                </p>
                              )}
                              {contact.emails && contact.emails.length > 0 && (
                                <p className="text-xs text-sub dark:text-gray-400 flex items-center gap-1">
                                  <Mail size={12} /> {contact.emails[0].address || '이메일 없음'}
                                </p>
                              )}
                            </div>
                          </div>
                          <button onClick={() => handleAddFriend(contact)} className="p-2 bg-primary text-white rounded-full active:scale-95 transition-transform">
                            <UserPlus size={18} />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-sub dark:text-gray-400">
                        <Search size={48} className="mb-4 opacity-30" />
                        <p className="font-bold">검색 결과가 없습니다.</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresenceSafe>
  );
};

export default AddFromContactsModal;
