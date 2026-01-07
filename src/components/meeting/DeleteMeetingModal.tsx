import React from 'react';
import { AlertCircle } from 'lucide-react';

interface DeleteMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteMeetingModal: React.FC<DeleteMeetingModalProps> = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-5">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[340px] bg-white dark:bg-gray-800 rounded-[32px] p-8 text-center shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={32} />
        </div>
        <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">약속 삭제</h3>
        <p className="text-gray-500 dark:text-gray-400 text-[14px] mb-8 font-medium leading-relaxed">
          아직 아무도 응답하지 않았습니다.
          <br />
          이 약속을 정말 삭제하시겠습니까?
          <br />
          <span className="text-red-500 dark:text-red-400 font-bold">삭제 후에는 복구할 수 없습니다.</span>
        </p>
        <div className="flex flex-col gap-2">
          <button onClick={onConfirm} className="w-full py-4 bg-red-500 text-white font-bold rounded-[20px] active:scale-95 transition-all">
            삭제하기
          </button>
          <button onClick={onClose} className="w-full py-4 text-gray-400 dark:text-gray-500 font-bold hover:text-gray-600 dark:hover:text-gray-300">
            취소
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteMeetingModal;
