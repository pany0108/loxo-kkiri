import React from 'react';
import { LoadingButton } from 'components';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  icon: React.ReactNode;
  iconContainerClassName?: string;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmButtonClassName?: string;
  isLoading?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  icon,
  iconContainerClassName = 'bg-gray-50 text-[#8B95A1] dark:bg-gray-700 dark:text-gray-400',
  title,
  message,
  confirmText = '확인',
  cancelText = '취소',
  confirmButtonClassName = 'bg-[#007AFF]',
  isLoading = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-5">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[340px] bg-white dark:bg-gray-800 rounded-[32px] p-8 text-center shadow-2xl animate-in zoom-in-95 duration-200">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${iconContainerClassName}`}>{icon}</div>
        <h3 className="text-xl font-black text-[#191F28] dark:text-white mb-2">{title}</h3>
        <p className="text-[#8B95A1] dark:text-gray-400 text-[14px] mb-8 font-medium leading-relaxed">{message}</p>
        <div className="flex flex-col gap-2">
          <LoadingButton
            onClick={onConfirm}
            isLoading={isLoading}
            className={`w-full py-4 text-white font-bold rounded-[20px] active:scale-95 transition-all flex items-center justify-center ${confirmButtonClassName}`}
          >
            {confirmText}
          </LoadingButton>
          <button onClick={onClose} className="w-full py-4 text-[#8B95A1] dark:text-gray-500 font-bold hover:text-[#191F28] dark:hover:text-gray-300">
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
