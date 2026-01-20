import dayjs from 'dayjs';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import React from 'react';

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

/**
 * 주최자가 제안한 시간대 아이템 컴포넌트
 * - 선택 상태 및 충돌 여부를 시각적으로 표시합니다.
 * @param {object} slot - 시간대 정보 (id, date, time)
 * @param {boolean} isSelected - 선택 여부
 * @param {boolean} isConflict - 일정 충돌 여부
 * @param {function} onToggle - 선택 토글 핸들러
 */
const HostSlotItem: React.FC<HostSlotItemProps> = ({ slot, isSelected, isConflict, onToggle }) => {
  return (
    <button
      onClick={() => onToggle(slot.id)}
      className={`
        w-full flex items-center justify-between p-5 rounded-2xl border-2 transition-all duration-200 ease-out relative overflow-hidden group
        ${
          isSelected
            ? 'bg-primary border-primary text-white shadow-lg shadow-primary/30 dark:shadow-blue-900/50 scale-[1.02] z-10'
            : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-main shadow-sm hover:border-primary/20 dark:hover:border-blue-500/20 active:scale-[0.98]'
        }
      `}
    >
      {/* 날짜 및 시간 정보 */}
      <div className="text-left relative z-10">
        <div className="flex items-center gap-2 mb-1">
          <p className={`text-[16px] font-black tracking-tight ${isSelected ? 'text-white' : 'text-main dark:text-white'}`}>{dayjs(slot.date).format('MM월 DD일 (ddd)')}</p>
          {!isSelected && <span className="text-[9px] bg-primary/10 dark:bg-blue-500/10 text-primary dark:text-blue-300 px-1.5 py-0.5 rounded-md font-bold">HOST</span>}
        </div>
        <div className="flex items-center gap-1.5">
          <p className={`text-[13px] font-bold ${isSelected ? 'text-blue-100' : 'text-sub dark:text-gray-500'}`}>{slot.time}</p>
        </div>

        {/* 충돌 경고 표시 */}
        {isConflict && !isSelected && (
          <div className="inline-flex items-center gap-1.5 text-[11px] text-red-500 dark:text-red-400 font-bold mt-2 bg-red-50 dark:bg-red-500/10 px-2 py-1 rounded-lg">
            <AlertCircle size={12} strokeWidth={2.5} />
            <span>내 일정과 겹침</span>
          </div>
        )}
      </div>

      {/* 선택 상태 아이콘 */}
      <div className="relative z-10">
        {isSelected ? (
          <CheckCircle2 size={24} className="text-white" />
        ) : (
          <div className="w-6 h-6 rounded-full border-2 border-gray-200 dark:border-gray-600 group-hover:border-primary/50 dark:group-hover:border-blue-400 transition-colors" />
        )}
      </div>
    </button>
  );
};

export default HostSlotItem;
