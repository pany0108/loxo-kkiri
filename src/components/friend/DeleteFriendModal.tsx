import React from 'react';
import { AlertCircle } from 'lucide-react';

interface DeleteFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
  friendName: string | undefined;
  onConfirm: () => void;
  sharedCalendarName?: string;
  sharedCalendarActionText?: React.ReactNode;
}

const DeleteFriendModal: React.FC<DeleteFriendModalProps> = ({ isOpen, onClose, friendName, onConfirm, sharedCalendarName, sharedCalendarActionText }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-5">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[320px] bg-white dark:bg-gray-800 rounded-[32px] p-8 text-center shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={32} />
        </div>
        <h3 className="text-xl font-black text-[#191F28] dark:text-white mb-2">친구 삭제</h3>
        <p className="text-[#8B95A1] dark:text-gray-400 text-[14px] mb-8 font-medium leading-relaxed break-keep">
          {sharedCalendarName ? (
            <>
              <span className="text-[#191F28] dark:text-gray-200 font-bold">'{friendName}'</span>님과 함께 사용하는
              <br />
              <span className="text-[#007AFF] font-bold">'{sharedCalendarName}'</span> 캘린더{sharedCalendarActionText || '도 함께 삭제됩니다.'}
            </>
          ) : (
            <>
              정말 <span className="text-[#191F28] dark:text-gray-200 font-bold">'{friendName}'</span>님을
              <br />
              친구 목록에서 삭제할까요?
            </>
          )}
        </p>
        <div className="flex flex-col gap-2">
          <button onClick={onConfirm} className="w-full py-4 bg-red-500 text-white font-bold rounded-[20px] active:scale-95 transition-all">
            삭제하기
          </button>
          <button onClick={onClose} className="w-full py-4 text-[#8B95A1] dark:text-gray-500 font-bold hover:text-[#191F28] dark:hover:text-gray-300">
            취소
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteFriendModal;
