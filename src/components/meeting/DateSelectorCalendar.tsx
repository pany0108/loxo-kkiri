import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import dayjs from 'dayjs';

interface DateSelectorCalendarProps {
  currentMonth: dayjs.Dayjs;
  onMonthChange: (newMonth: dayjs.Dayjs) => void;
  myNewSlots: { date: string }[];
  hostSlots: { date: string }[];
  myExistingSchedules: string[];
  onDateClick: (dateStr: string) => void;
}

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
