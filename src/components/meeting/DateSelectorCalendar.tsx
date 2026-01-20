import dayjs from 'dayjs';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import React from 'react';

interface DateSelectorCalendarProps {
  currentMonth: dayjs.Dayjs;
  onMonthChange: (newMonth: dayjs.Dayjs) => void;
  myNewSlots: { date: string }[];
  hostSlots: { date: string }[];
  myExistingSchedules: string[];
  onDateClick: (dateStr: string) => void;
}

/**
 * 날짜 선택 달력 컴포넌트
 * - 월 이동 및 날짜 선택 기능을 제공합니다.
 * - 내 일정, 주최자 제안 일정, 내가 선택한 일정 등을 표시합니다.
 * @param {dayjs.Dayjs} currentMonth - 현재 표시 중인 월
 * @param {function} onMonthChange - 월 변경 핸들러
 * @param {object[]} myNewSlots - 내가 새로 제안한 슬롯 목록
 * @param {object[]} hostSlots - 주최자가 제안한 슬롯 목록
 * @param {string[]} myExistingSchedules - 내 기존 일정이 있는 날짜 목록
 * @param {function} onDateClick - 날짜 클릭 핸들러
 */
const DateSelectorCalendar: React.FC<DateSelectorCalendarProps> = ({ currentMonth, onMonthChange, myNewSlots, hostSlots, myExistingSchedules, onDateClick }) => {
  const generateDates = () => {
    const startOfMonth = currentMonth.startOf('month');
    const endOfMonth = currentMonth.endOf('month');
    const dates = [];
    for (let i = 0; i < startOfMonth.day(); i++) dates.push(null);
    for (let i = 1; i <= endOfMonth.date(); i++) dates.push(startOfMonth.date(i).format('YYYY-MM-DD'));
    return dates;
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-[32px] p-6 border-2 border-transparent">
      {/* 월 이동 네비게이션 */}
      <div className="flex items-center justify-between mb-6 px-2">
        <button
          onClick={() => onMonthChange(currentMonth.subtract(1, 'month'))}
          className="p-2 bg-white dark:bg-gray-700 rounded-xl text-gray-400 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white shadow-sm transition-all active:scale-95"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-[16px] font-black text-main dark:text-white">{currentMonth.format('YYYY년 MM월')}</span>
        <button
          onClick={() => onMonthChange(currentMonth.add(1, 'month'))}
          className="p-2 bg-white dark:bg-gray-700 rounded-xl text-gray-400 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white shadow-sm transition-all active:scale-95"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 gap-y-3 gap-x-1 text-center">
        {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
          <span key={d} className="text-[11px] font-black text-sub dark:text-gray-400 mb-2">
            {d}
          </span>
        ))}
        {generateDates().map((date, idx) => {
          if (!date) return <div key={`empty-${idx}`} />;

          const hasMySchedule = myExistingSchedules.includes(date);
          const isHostProposed = hostSlots.some((s) => s.date === date);
          const isMyNewProposal = myNewSlots.some((s) => s.date === date);

          return (
            <button
              key={date}
              onClick={() => onDateClick(date)}
              disabled={isHostProposed}
              className={`
                relative w-full aspect-square flex flex-col items-center justify-center rounded-[14px] transition-all duration-200
                ${
                  isMyNewProposal
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 dark:shadow-emerald-900/50 scale-105 z-10'
                    : 'bg-white dark:bg-gray-700/50 text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                }
                ${isHostProposed ? 'opacity-50 cursor-not-allowed ring-2 ring-primary/20 dark:ring-blue-500/30' : ''}
              `}
            >
              <span className={`text-[13px] font-bold ${isMyNewProposal ? 'text-white' : 'text-main dark:text-gray-300'}`}>{dayjs(date).date()}</span>
              {hasMySchedule && !isMyNewProposal && <div className="absolute bottom-2 w-1 h-1 rounded-full bg-red-400 ring-2 ring-white dark:ring-gray-800" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DateSelectorCalendar;
