import React from 'react';
import dayjs from 'dayjs';
import { X, Clock } from 'lucide-react';

interface Schedule {
  id: string;
  title: string;
  isAllDay: boolean;
  start: string;
  end: string;
}

interface SchedulePopupProps {
  isOpen: boolean;
  date: string;
  schedules: Schedule[];
  onClose: () => void;
  onConfirm: (date: string) => void;
}

const SchedulePopup: React.FC<SchedulePopupProps> = ({ isOpen, date, schedules, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-4xl p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-black text-[#191F28] dark:text-white">{dayjs(date).format('M월 D일의 일정')}</h3>
          <button onClick={onClose} className="p-2 -mr-2 text-[#8B95A1] dark:text-gray-500 hover:text-[#191F28] dark:hover:text-gray-300">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
          {schedules.map((schedule) => (
            <div key={schedule.id} className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl">
              <p className="font-bold text-sm text-[#191F28] dark:text-gray-200">{schedule.title}</p>
              <p className="text-xs text-[#8B95A1] dark:text-gray-400 font-medium flex items-center gap-1 mt-1">
                <Clock size={12} />
                {schedule.isAllDay ? '하루 종일' : `${dayjs(schedule.start).format('HH:mm')} - ${dayjs(schedule.end).format('HH:mm')}`}
              </p>
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-3.5 bg-gray-100 dark:bg-gray-700 text-[#8B95A1] dark:text-gray-300 font-bold rounded-xl text-sm">
            닫기
          </button>
          <button
            onClick={() => onConfirm(date)}
            className="flex-1 py-3.5 bg-[#007AFF] text-white font-bold rounded-xl text-sm shadow-lg shadow-[#007AFF]/30 dark:shadow-blue-900/50"
          >
            이 날짜 선택하기
          </button>
        </div>
      </div>
    </div>
  );
};

export default SchedulePopup;
