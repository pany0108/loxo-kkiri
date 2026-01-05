import React from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import dayjs from 'dayjs';

interface ProposalCalendarProps {
  currentMonth: dayjs.Dayjs;
  onMonthChange: (newMonth: dayjs.Dayjs) => void;
  selectedDates: string[];
  schedulesByDate: Map<string, any[]>;
  onDateClick: (dateStr: string) => void;
}

const ProposalCalendar: React.FC<ProposalCalendarProps> = ({ currentMonth, onMonthChange, selectedDates, schedulesByDate, onDateClick }) => {
  const generateDates = () => {
    const startOfMonth = currentMonth.startOf('month');
    const endOfMonth = currentMonth.endOf('month');
    const dates = [];
    for (let i = 0; i < startOfMonth.day(); i++) dates.push(null);
    for (let i = 1; i <= endOfMonth.date(); i++) dates.push(startOfMonth.date(i).format('YYYY-MM-DD'));
    return dates;
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <CalendarIcon size={18} className="text-gray-400 dark:text-gray-500" />
          <label className="text-[13px] font-black text-gray-400 dark:text-gray-500">날짜 선택</label>
        </div>
        <div className="flex gap-3 text-[10px] font-bold bg-gray-50 dark:bg-gray-800/50 px-3 py-1 rounded-full">
          <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-500">
            <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>내 일정
          </span>
          <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>선택됨
          </span>
        </div>
      </div>

      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-[32px] p-6 border-2 border-transparent">
        <div className="flex items-center justify-between mb-6 px-2">
          <button
            onClick={() => onMonthChange(currentMonth.subtract(1, 'month'))}
            className="p-2 bg-white dark:bg-gray-700 rounded-xl text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white shadow-sm transition-all active:scale-95"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-[16px] font-black text-gray-900 dark:text-white">{currentMonth.format('YYYY년 MM월')}</span>
          <button
            onClick={() => onMonthChange(currentMonth.add(1, 'month'))}
            className="p-2 bg-white dark:bg-gray-700 rounded-xl text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white shadow-sm transition-all active:scale-95"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-y-3 gap-x-1 text-center">
          {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
            <span key={d} className="text-[11px] font-black text-gray-300 dark:text-gray-600 mb-2">
              {d}
            </span>
          ))}
          {generateDates().map((date, idx) => {
            if (!date) return <div key={`empty-${idx}`} />;
            const dailySchedules = schedulesByDate.get(date) || [];
            const hasMySchedule = dailySchedules.length > 0;
            const isSelected = selectedDates.includes(date);

            return (
              <button
                key={date}
                onClick={() => onDateClick(date)}
                className={`relative w-full aspect-square flex flex-col items-center justify-center rounded-[14px] transition-all duration-200 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-blue-900/50 scale-105 z-10'
                    : 'bg-white dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <span
                  className={`text-[13px] font-bold relative transition-all ${isSelected ? 'text-white' : 'text-gray-700 dark:text-gray-300'} ${
                    hasMySchedule && !isSelected ? 'bottom-1' : ''
                  }`}
                >
                  {dayjs(date).date()}
                </span>
                {hasMySchedule && !isSelected && (
                  <div className="absolute bottom-1.5 left-1 right-1 px-1 text-white bg-red-400/90 text-[9px] font-bold rounded-sm truncate leading-tight flex items-center justify-center">
                    <span className="truncate">{dailySchedules[0].title}</span>
                    {dailySchedules.length > 1 && <span className="ml-0.5 shrink-0">+{dailySchedules.length - 1}</span>}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ProposalCalendar;
