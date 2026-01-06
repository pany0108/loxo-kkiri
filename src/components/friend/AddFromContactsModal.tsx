import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence, AnimatePresenceProps } from 'framer-motion';
import { X, Search, UserPlus, Phone, Mail, Loader2 } from 'lucide-react'; // Check 제거
import { Contacts } from '@capacitor-community/contacts'; // Only Contacts imported, other types will be local
import { Capacitor } from '@capacitor/core';
import toast from 'react-hot-toast';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db, auth } from 'firebase';

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

// Define local types to match the expected structure from the plugin's output
// These mirror the ContactPayload, PhoneNumber, EmailAddress types from @capacitor-community/contacts
// as they might not be directly exported or cause import issues.
interface LocalPhoneNumber {
  label: string;
  number?: string;
}

interface LocalEmailAddress {
  label: string;
  address?: string;
}

// This should match the structure of ContactPayload from the plugin
interface LocalContact {
  contactId: string;
  name?: {
    display?: string;
  };
  phones?: LocalPhoneNumber[];
  emails?: LocalEmailAddress[];
}

const AddFromContactsModal: React.FC<AddFromContactsModalProps> = ({ isOpen, onClose, myInfo, existingFriends }) => {
  const [contacts, setContacts] = useState<LocalContact[]>([]); // Using local Contact type
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false); // 초기 로딩 상태를 false로 설정
  const [permissionGranted, setPermissionGranted] = useState(false);
  const sheetTouchStartY = useRef<number | null>(null);
  const sheetTouchEndY = useRef<number | null>(null);
  const minSheetSwipeDistance = 50;

  const AnimatePresenceSafe = AnimatePresence as React.FC<React.PropsWithChildren<AnimatePresenceProps>>;

  useEffect(() => {
    // useEffect 내부에서 isLoading을 true로 설정
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

      setIsLoading(true); // 연락처 로딩 시작 시 true
      try {
        // 1. 권한 상태 확인
        let permission = await Contacts.checkPermissions();

        // 2. 권한이 'prompt' 상태일 경우, 권한 요청
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
          // 'denied'
          toast.error('연락처 접근 권한이 필요합니다. 설정에서 허용해주세요.');
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

  const formatPhoneNumber = (value: string | undefined) => {
    if (!value) return '';
    const nums = value.replace(/[^\d]/g, '');
    if (nums.length <= 3) return nums;
    if (nums.length <= 7) return `${nums.slice(0, 3)}-${nums.slice(3)}`;
    return `${nums.slice(0, 3)}-${nums.slice(3, 7)}-${nums.slice(7, 11)}`;
  };

  const handleAddFriend = async (contact: LocalContact) => {
    // Changed type from Contact to LocalContact
    if (!myInfo || !auth.currentUser) {
      toast.error('로그인이 필요합니다.');
      return;
    }

    const contactEmails = contact.emails?.map((e) => e.address?.toLowerCase()).filter(Boolean) || [];
    const contactPhones = contact.phones?.map((p) => formatPhoneNumber(p.number)).filter(Boolean) || [];

    if (contactEmails.length === 0 && contactPhones.length === 0) {
      toast.error('친구의 이메일 또는 전화번호 정보가 없습니다.');
      return;
    }

    try {
      let friendUserUid: string | null = null;

      // 1. 이메일로 사용자 찾기
      if (contactEmails.length > 0) {
        const q = query(collection(db, 'users'), where('email', 'in', contactEmails));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          friendUserUid = querySnapshot.docs[0].id;
        }
      }

      // 2. 전화번호로 사용자 찾기 (이메일로 못 찾았을 경우)
      if (!friendUserUid && contactPhones.length > 0) {
        const q = query(collection(db, 'users'), where('phone', 'in', contactPhones));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          friendUserUid = querySnapshot.docs[0].id;
        }
      }

      if (friendUserUid) {
        if (friendUserUid === auth.currentUser!.uid) {
          // auth.currentUser is already null-checked
          toast('본인은 친구로 추가할 수 없습니다.');
          return;
        }
        if (existingFriends.some((f) => f.uid === friendUserUid)) {
          toast('이미 친구입니다.');
          return;
        }

        const friendDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', friendUserUid)));
        if (!friendDoc.empty) {
          const friendData = friendDoc.docs[0].data();
          const newFriend: Friend = {
            uid: friendData.uid,
            name: friendData.name,
            email: friendData.email,
            statusMessage: friendData.statusMessage || '',
            photoURL: friendData.photoURL || '',
          };

          const userRef = doc(db, 'users', auth.currentUser!.uid); // auth.currentUser is already null-checked
          await updateDoc(userRef, {
            friendsList: arrayUnion(newFriend),
          });
          toast.success(`${newFriend.name}님을 친구로 추가했습니다!`);
          onClose();
        }
      } else {
        toast.error('해당 연락처와 일치하는 사용자를 찾을 수 없습니다.');
      }
    } catch (error) {
      console.error('Error adding friend from contacts:', error);
      toast.error('친구 추가 중 오류가 발생했습니다.');
    }
  };

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
          <motion.div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div
            className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-t-[32px] pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl h-[80vh] flex flex-col"
            initial={{ y: '100%' }}
            animate={{ y: '0%' }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            <button onClick={onClose} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
              <X size={20} />
            </button>
            <div className="px-6 pt-6" onTouchStart={onSheetTouchStart} onTouchMove={onSheetTouchMove} onTouchEnd={onSheetTouchEnd}>
              <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full mx-auto mb-6" />
              <h3 className="text-xl font-black text-gray-900 dark:text-white mb-4">연락처에서 친구 추가</h3>
            </div>
            {!permissionGranted && !isLoading && (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-500 dark:text-gray-400 px-6">
                <UserPlus size={48} className="mb-4 opacity-30" />
                <p className="font-bold">연락처 접근 권한이 필요합니다.</p>
                <p className="text-sm">설정에서 권한을 허용해주세요.</p>
              </div>
            )}

            {permissionGranted && (
              <>
                <div className="mb-4 px-6">
                  <div className="relative flex items-center">
                    <Search size={18} className="absolute left-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="이름, 전화번호, 이메일로 검색"
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-full text-gray-900 dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                {isLoading ? (
                  <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="animate-spin text-blue-500 w-8 h-8" />
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto space-y-2 px-6">
                    {filteredContacts.length > 0 ? (
                      filteredContacts.map((contact, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold text-sm overflow-hidden">
                              {contact.name?.display ? contact.name.display[0] : '?'}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 dark:text-white">{contact.name?.display || '이름 없음'}</p>
                              {contact.phones && contact.phones.length > 0 && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                  <Phone size={12} /> {contact.phones[0].number || '번호 없음'}
                                </p>
                              )}
                              {contact.emails && contact.emails.length > 0 && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                  <Mail size={12} /> {contact.emails[0].address || '이메일 없음'}
                                </p>
                              )}
                            </div>
                          </div>
                          <button onClick={() => handleAddFriend(contact)} className="p-2 bg-blue-600 text-white rounded-full active:scale-95 transition-transform">
                            <UserPlus size={18} />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
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
