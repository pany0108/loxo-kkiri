import React from 'react';
import { RefreshCw, Trash2 } from 'lucide-react';

interface ReportActionsProps {
  onRetry: () => void;
  onCancel: () => void;
}

const ReportActions: React.FC<ReportActionsProps> = ({ onRetry, onCancel }) => {
  return (
    <div className="mt-10 pt-6 border-t border-gray-100 dark:border-gray-800">
      <p className="text-center text-[12px] font-bold text-gray-400 dark:text-gray-500 mb-4">마음에 드는 시간이 없으신가요?</p>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onRetry}
          className="flex items-center justify-center gap-2 h-[56px] rounded-[20px] bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold text-[14px] hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-[0.98] transition-all"
        >
          <RefreshCw size={16} /> 일정 재요청
        </button>
        <button
          onClick={onCancel}
          className="flex items-center justify-center gap-2 h-[56px] rounded-[20px] bg-white dark:bg-gray-800 border-2 border-rose-100 dark:border-rose-500/30 text-rose-500 dark:text-rose-400 font-bold text-[14px] hover:bg-rose-50 dark:hover:bg-rose-500/10 active:scale-[0.98] transition-all"
        >
          <Trash2 size={16} /> 약속 취소
        </button>
      </div>
    </div>
  );
};

export default ReportActions;
