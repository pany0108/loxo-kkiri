import React from 'react';
import { X } from 'lucide-react';

interface Friend {
  uid: string;
  name: string;
  email: string;
  statusMessage?: string;
  photoURL?: string;
}

interface ProfilePopupProps {
  friend: Friend | null;
  onClose: () => void;
}

/**
 * 친구 프로필 팝업 컴포넌트
 * - 친구의 프로필 사진, 이름, 이메일, 상태 메시지를 보여줍니다.
 */
const ProfilePopup: React.FC<ProfilePopupProps> = ({ friend, onClose }) => {
  if (!friend) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-xs bg-white dark:bg-gray-800 rounded-4xl p-6 text-center shadow-2xl animate-in zoom-in-95 duration-200">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-sub hover:text-main dark:text-gray-500 dark:hover:text-gray-300">
          <X size={20} />
        </button>
        <div className="w-24 h-24 rounded-full mx-auto mb-4 overflow-hidden border-4 border-white dark:border-gray-700 shadow-lg">
          {friend.photoURL ? (
            <img src={friend.photoURL} alt={friend.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-primary/10 dark:bg-blue-500/10 text-primary dark:text-blue-300 flex items-center justify-center text-4xl font-bold">
              {friend.name[0]}
            </div>
          )}
        </div>
        <h3 className="text-xl font-black text-main dark:text-white">{friend.name}</h3>
        <p className="text-sm text-sub dark:text-gray-500 font-medium mt-1 mb-4">{friend.email}</p>
        <p className="text-sm font-semibold text-sub dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 rounded-xl px-4 py-3">{friend.statusMessage || '상태 메시지가 없습니다.'}</p>
      </div>
    </div>
  );
};

export default ProfilePopup;
