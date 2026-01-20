import React, { useEffect, useRef, useState } from 'react';
import { Contacts } from '@capacitor-community/contacts';
import { Capacitor } from '@capacitor/core';
import { AndroidSettings, IOSSettings, NativeSettings } from 'capacitor-native-settings';
import { addDoc, arrayUnion, collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { AlertCircle, Check, Loader2, Users } from 'lucide-react';
import toast from 'react-hot-toast';

import { auth, db } from '../../firebase';
import { ConfirmModal } from 'components';
import { sendPushNotificationToUser } from 'utils';

interface Friend {
  uid: string;
}

interface AddFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
  myInfo: any; // Contains current user's info like email, phone, name
  friends: Friend[]; // Current friends list to check for duplicates
  onOpenContacts: () => void;
}

/**
 * 친구 추가 모달 컴포넌트
 * - 이메일 또는 휴대폰 번호로 사용자를 검색하여 친구로 추가합니다.
 * - 모바일 환경에서는 연락처 연동 기능을 제공합니다.
 */
const AddFriendModal: React.FC<AddFriendModalProps> = ({ isOpen, onClose, myInfo, friends, onOpenContacts }) => {
  const [newFriendInput, setNewFriendInput] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isCheckingContacts, setIsCheckingContacts] = useState(false);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [addFriendMethod, setAddFriendMethod] = useState<'email' | 'phone'>('email');
  const addFriendInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setNewFriendInput('');
      setAddFriendMethod('email');
      setTimeout(() => addFriendInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      addFriendInputRef.current?.focus();
    }
  }, [addFriendMethod, isOpen]);

  /** 휴대폰 번호 포맷팅 함수 */
  const formatPhone = (value: string) => {
    const nums = value.replace(/[^\d]/g, '');
    if (nums.length <= 3) return nums;
    if (nums.length <= 7) return `${nums.slice(0, 3)}-${nums.slice(3)}`;
    return `${nums.slice(0, 3)}-${nums.slice(3, 7)}-${nums.slice(7, 11)}`;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (addFriendMethod === 'phone') {
      setNewFriendInput(formatPhone(e.target.value));
    } else {
      setNewFriendInput(e.target.value);
    }
  };

  /** 친구 추가 핸들러 */
  const handleAddFriend = async () => {
    if (!newFriendInput.trim() || !auth.currentUser) return;

    const searchField = addFriendMethod;
    let searchValue = newFriendInput.trim();

    if (searchField === 'phone') {
      searchValue = searchValue.replace(/[^\d]/g, '');
    }

    if ((searchField === 'email' && searchValue === auth.currentUser.email) || (searchField === 'phone' && searchValue === myInfo?.phone)) {
      toast.error('자기 자신은 친구로 추가할 수 없습니다.');
      return;
    }

    setIsAdding(true);
    try {
      const q = query(collection(db, 'users'), where(searchField, '==', searchValue));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast.error(`존재하지 않는 ${searchField === 'email' ? '이메일' : '휴대폰 번호'}입니다.`);
        setIsAdding(false);
        return;
      }

      const targetUserDoc = querySnapshot.docs[0];
      const targetUserData = targetUserDoc.data();

      if (friends.some((f) => f.uid === targetUserDoc.id)) {
        toast('이미 친구 목록에 있습니다.', { icon: '⚠️' });
        setIsAdding(false);
        return;
      }

      const myRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(myRef, {
        friendsList: arrayUnion({
          uid: targetUserDoc.id,
          name: targetUserData.name,
          email: targetUserData.email,
          statusMessage: targetUserData.statusMessage || '',
          photoURL: targetUserData.photoURL || '',
        }),
      });

      await addDoc(collection(db, 'notifications'), {
        userId: targetUserDoc.id,
        type: 'FRIEND_REQUEST',
        message: `${myInfo?.name || myInfo?.displayName || '누군가'}님이 당신을 친구로 추가했습니다.`,
        relatedId: auth.currentUser.uid,
        fromUserName: myInfo?.name || myInfo?.displayName || '누군가',
        isRead: false,
        createdAt: new Date().toISOString(),
      });

      // 푸시 알림 전송
      await sendPushNotificationToUser({
        userId: targetUserDoc.id,
        title: '새로운 친구 요청',
        body: `${myInfo?.name || myInfo?.displayName || '누군가'}님이 당신을 친구로 추가했습니다.`,
        data: { type: 'FRIEND_REQUEST', relatedId: auth.currentUser.uid },
      });
      toast.success(`${targetUserData.name}님을 친구로 추가했습니다.`);
      onClose();
    } catch (error) {
      console.error('친구 추가 오류:', error);
      toast.error('친구 추가 중 오류가 발생했습니다.');
    } finally {
      setIsAdding(false);
    }
  };

  /** 연락처 연동 버튼 클릭 핸들러 */
  const handleContactsClick = async () => {
    if (!Capacitor.isNativePlatform()) {
      toast.error('이 기능은 모바일 기기에서만 지원됩니다.');
      return;
    }

    setIsCheckingContacts(true);
    try {
      const permission = await Contacts.checkPermissions();

      if (permission.contacts === 'granted') {
        onOpenContacts();
      } else if (permission.contacts === 'denied') {
        setIsPermissionModalOpen(true);
      } else {
        const result = await Contacts.requestPermissions();
        if (result.contacts === 'granted') {
          onOpenContacts();
        } else {
          setIsPermissionModalOpen(true);
        }
      }
    } catch (error) {
      console.error('Permission check failed', error);
      toast.error('권한 확인 중 오류가 발생했습니다.');
    } finally {
      setIsCheckingContacts(false);
    }
  };

  /** 설정 화면으로 이동 */
  const openSettings = async () => {
    try {
      await NativeSettings.open({
        optionAndroid: AndroidSettings.ApplicationDetails,
        optionIOS: IOSSettings.App,
      });
    } catch (e) {
      console.error('Open settings failed', e);
      toast.error('설정을 열 수 없습니다. 직접 설정에서 권한을 허용해주세요.');
    }
    setIsPermissionModalOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-4xl p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <h3 className="text-xl font-black text-main dark:text-white mb-1">새 친구 찾기</h3>
        <p className="text-sub dark:text-gray-500 text-[13px] mb-6 font-medium leading-relaxed">친구의 이메일 또는 휴대폰 번호로 추가하세요.</p>
        <div className="flex p-1 bg-gray-100 dark:bg-gray-700/50 rounded-xl mb-4">
          <button
            onClick={() => {
              setAddFriendMethod('email');
              setNewFriendInput('');
            }}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${addFriendMethod === 'email' ? 'bg-white dark:bg-gray-600 shadow-sm' : 'text-sub'}`}
          >
            이메일
          </button>
          <button
            onClick={() => {
              setAddFriendMethod('phone');
              setNewFriendInput('');
            }}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${addFriendMethod === 'phone' ? 'bg-white dark:bg-gray-600 shadow-sm' : 'text-sub'}`}
          >
            휴대폰 번호
          </button>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-2 mb-6 border border-gray-100 dark:border-gray-700/50 focus-within:border-primary focus-within:bg-white dark:focus-within:bg-gray-800 transition-all">
          <input
            ref={addFriendInputRef}
            type={addFriendMethod === 'email' ? 'email' : 'tel'}
            value={newFriendInput}
            onChange={handleInputChange}
            enterKeyHint="send"
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddFriend())}
            placeholder={addFriendMethod === 'email' ? 'example@email.com' : '010-0000-0000'}
            className="w-full bg-transparent outline-none p-3 text-[15px] font-bold dark:text-white"
            maxLength={addFriendMethod === 'phone' ? 13 : undefined}
            autoFocus
          />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-sub dark:text-gray-300 font-bold text-[14px]">
            취소
          </button>
          <button
            onClick={handleAddFriend}
            disabled={isAdding || !newFriendInput.trim()}
            className="flex-1 py-3.5 rounded-xl bg-primary text-white font-bold text-[14px] flex items-center justify-center gap-2 active:scale-95 disabled:bg-primary/50 dark:disabled:bg-primary/30"
          >
            {isAdding ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                <Check size={16} strokeWidth={3} /> 추가하기
              </>
            )}
          </button>
        </div>
        <button
          type="button"
          onClick={handleContactsClick}
          disabled={isCheckingContacts}
          className="w-full flex items-center justify-center gap-2 mt-3 py-3.5 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-sub dark:text-gray-400 font-bold text-[14px] hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          {isCheckingContacts ? <Loader2 size={16} className="animate-spin" /> : <Users size={16} />}
          연락처에서 친구 추가
        </button>
      </div>

      <ConfirmModal
        isOpen={isPermissionModalOpen}
        onClose={() => setIsPermissionModalOpen(false)}
        onConfirm={openSettings}
        title="권한 설정 필요"
        message="연락처에서 친구를 찾기 위해 연락처 접근 권한이 필요합니다. 설정에서 권한을 허용해주세요."
        confirmText="설정으로 이동"
        icon={<AlertCircle size={32} />}
        iconContainerClassName="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
        confirmButtonClassName="bg-primary"
      />
    </div>
  );
};

export default AddFriendModal;
