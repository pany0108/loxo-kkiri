import React from 'react';
import { X, ArrowRight, Copy, Check } from 'lucide-react';

interface EditRecurringModalProps {
  onClose: () => void;
  onEditOne: () => void;
  onEditFollowing: () => void;
  onEditAll: () => void;
}

const EditRecurringModal = ({ onClose, onEditOne, onEditFollowing, onEditAll }: EditRecurringModalProps) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-200 font-['Pretendard']">
      <div className="w-full sm:w-[400px] bg-white dark:bg-gray-800 rounded-t-4xl sm:rounded-4xl p-6 pb-10 sm:pb-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-300">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-[18px] font-black text-main dark:text-white">반복 일정 수정</h3>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-sub dark:text-gray-500 hover:text-main dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <p className="text-[14px] text-sub dark:text-gray-400 font-medium mb-6 leading-relaxed">
          이 일정은 반복되는 일정입니다.
          <br />
          어떻게 수정하시겠습니까?
        </p>

        <div className="space-y-3">
          <button
            onClick={onEditOne}
            className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 hover:bg-primary/20 border border-transparent hover:border-primary/50 rounded-xl transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm text-sub dark:text-gray-500 group-hover:text-primary transition-colors">
                <Check size={18} />
              </div>
              <span className="text-[14px] font-bold text-main dark:text-gray-200 group-hover:text-primary">이 일정만 수정</span>
            </div>
          </button>

          <button
            onClick={onEditFollowing}
            className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 hover:bg-primary/20 border border-transparent hover:border-primary/50 rounded-xl transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm text-sub dark:text-gray-500 group-hover:text-primary transition-colors">
                <ArrowRight size={18} />
              </div>
              <div className="text-left">
                <span className="block text-[14px] font-bold text-main dark:text-gray-200 group-hover:text-primary">이 일정 포함 향후 일정 수정</span>
                <span className="text-[11px] text-sub dark:text-gray-500 font-medium">이 날짜 이후의 변동사항이 적용됩니다.</span>
              </div>
            </div>
          </button>

          <button
            onClick={onEditAll}
            className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 hover:bg-primary/20 border border-transparent hover:border-primary/50 rounded-xl transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm text-sub dark:text-gray-500 group-hover:text-primary transition-colors">
                <Copy size={18} />
              </div>
              <span className="text-[14px] font-bold text-main dark:text-gray-200 group-hover:text-primary">모든 일정 수정</span>
            </div>
          </button>
        </div>

        <div className="mt-4 text-center">
          <button onClick={onClose} className="text-[13px] font-bold text-sub dark:text-gray-500 hover:text-main dark:hover:text-gray-300 p-2">
            취소
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditRecurringModal;
