import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import dayjs from 'dayjs';

interface DatePickerPopupProps {
  isOpen: boolean;
  datePickerRef: React.RefObject<HTMLDivElement>;
  pickerYear: number;
  onYearChange: (year: number) => void;
  onMonthSelect: (month: number) => void;
  currentDate: Date;
}

const DatePickerPopup: React.FC<DatePickerPopupProps> = ({ isOpen, datePickerRef, pickerYear, onYearChange, onMonthSelect, currentDate }) => {
  if (!isOpen) return null;

  return (
    <div
      ref={datePickerRef}
      className="absolute top-[72px] left-1/2 -translate-x-1/2 sm:left-6 sm:translate-x-0 z-50 w-72 bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 border border-gray-200 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-200"
    >
      <div className="flex items-center justify-between mb-4 px-2">
        <button onClick={() => onYearChange(pickerYear - 1)} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
          <ChevronLeft size={20} />
        </button>
        <span className="text-lg font-bold text-gray-900 dark:text-white">{pickerYear}년</span>
        <button onClick={() => onYearChange(pickerYear + 1)} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
          <ChevronRight size={20} />
        </button>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 12 }).map((_, i) => {
          const isCurrentSelection = dayjs(currentDate).year() === pickerYear && dayjs(currentDate).month() === i;
          return (
            <button
              key={i}
              onClick={() => onMonthSelect(i)}
              className={`p-3 rounded-lg text-sm font-bold transition-colors ${
                isCurrentSelection ? 'bg-[#4C82B6] text-gray-900' : 'bg-[#F7F6F2] dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-[#4C82B6]/20'
              }`}
            >
              {i + 1}월
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DatePickerPopup;
