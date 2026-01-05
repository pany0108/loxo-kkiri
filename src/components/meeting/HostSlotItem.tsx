import React from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import dayjs from 'dayjs';

interface HostSlotItemProps {
  slot: {
    id: string;
    date: string;
    time: string;
  };
  isSelected: boolean;
  isConflict: boolean;
  onToggle: (slotId: string) => void;
}

const HostSlotItem: React.FC<HostSlotItemProps> = ({ slot, isSelected, isConflict, onToggle }) => {
  return (
    <button
      onClick={() => onToggle(slot.id)}
      className={`
        w-full flex items-center justify-between p-5 rounded-[24px] border-2 transition-all duration-200 ease-out relative overflow-hidden group
        ${
          isSelected
            ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-blue-900/50 scale-[1.02] z-10'
            : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-800 shadow-sm hover:border-blue-100 dark:hover:border-blue-500/20 active:scale-[0.98]'
        }
      `}
    >
      <div className="text-left relative z-10">
        <div className="flex items-center gap-2 mb-1">
          <p className={`text-[16px] font-black tracking-tight ${isSelected ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{dayjs(slot.date).format('MM월 DD일 (ddd)')}</p>
          {!isSelected && <span className="text-[9px] bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-300 px-1.5 py-0.5 rounded-md font-bold">HOST</span>}
        </div>
        <div className="flex items-center gap-1.5">
          <p className={`text-[13px] font-bold ${isSelected ? 'text-blue-100' : 'text-gray-400 dark:text-gray-500'}`}>{slot.time}</p>
        </div>

        {isConflict && !isSelected && (
          <div className="inline-flex items-center gap-1.5 text-[11px] text-red-500 dark:text-red-400 font-bold mt-2 bg-red-50 dark:bg-red-500/10 px-2 py-1 rounded-lg">
            <AlertCircle size={12} strokeWidth={2.5} />
            <span>내 일정과 겹침</span>
          </div>
        )}
      </div>

      <div className="relative z-10">
        {isSelected ? (
          <CheckCircle2 size={24} className="text-white" />
        ) : (
          <div className="w-6 h-6 rounded-full border-2 border-gray-200 dark:border-gray-600 group-hover:border-blue-300 dark:group-hover:border-blue-400 transition-colors" />
        )}
      </div>
    </button>
  );
};

export default HostSlotItem;
