import dayjs from 'dayjs';
import { Sparkles } from 'lucide-react';
import React from 'react';

interface MyNewSlot {
  date: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
}

interface NewProposalSlotItemProps {
  slot: MyNewSlot;
  onTimeChange: (date: string, field: 'startTime' | 'endTime', value: string) => void;
  onToggleAllDay: (date: string) => void;
}

/**
 * 새로운 제안 시간대 아이템 컴포넌트
 * - 날짜와 시작/종료 시간을 입력받거나 종일 설정을 할 수 있습니다.
 *
 * @param {MyNewSlot} slot - 현재 슬롯 데이터
 * @param {function} onTimeChange - 시간 변경 핸들러
 * @param {function} onToggleAllDay - 종일 설정 토글 핸들러
 */
const NewProposalSlotItem: React.FC<NewProposalSlotItemProps> = ({ slot, onTimeChange, onToggleAllDay }) => {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border-2 border-emerald-100 dark:border-emerald-500/30 shadow-sm">
        {/* 헤더: 날짜 및 종일 토글 */}
        <div className="flex justify-between items-center mb-4">
          <span className="text-[15px] font-black text-main dark:text-white">{dayjs(slot.date).format('MM월 DD일 (ddd)')}</span>
          <div onClick={() => onToggleAllDay(slot.date)} className="flex items-center gap-2 cursor-pointer group">
            <span className={`text-[11px] font-bold transition-colors ${slot.isAllDay ? 'text-emerald-600 dark:text-emerald-400' : 'text-sub'}`}>종일</span>
            <div className={`relative w-10 h-6 rounded-full transition-colors duration-200 shrink-0 ${slot.isAllDay ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-600'}`}>
              <div
                className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow-sm transition-transform duration-200 ${slot.isAllDay ? 'translate-x-4' : 'translate-x-0'}`}
              />
            </div>
          </div>
        </div>
        {slot.isAllDay ? (
          /* 종일 설정 시 표시 */
          <div className="bg-emerald-50 dark:bg-emerald-500/10 px-3 py-[15px] rounded-xl border border-emerald-100 dark:border-emerald-500/20 text-center">
            <p className="text-[12px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center gap-1.5">
              <Sparkles size={14} /> 하루 종일 가능해요!
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 h-[50px] bg-gray-50 dark:bg-gray-700/50 rounded-[16px] px-4 border border-gray-100 dark:border-gray-700">
            {/* 시간 입력 필드 */}
            <div className="flex-1 flex items-center justify-between gap-2">
              <input
                type="time"
                value={slot.startTime}
                onChange={(e) => onTimeChange(slot.date, 'startTime', e.target.value)}
                className="bg-transparent border-none outline-none w-full text-[14px] font-bold text-main dark:text-white text-center"
              />
              <span className="text-sub dark:text-gray-400">-</span>
              <input
                type="time"
                value={slot.endTime}
                onChange={(e) => onTimeChange(slot.date, 'endTime', e.target.value)}
                className="bg-transparent border-none outline-none w-full text-[14px] font-bold text-main dark:text-white text-center"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewProposalSlotItem;
