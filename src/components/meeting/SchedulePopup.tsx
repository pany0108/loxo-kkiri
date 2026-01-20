import dayjs from 'dayjs';
import { Clock, X } from 'lucide-react';
import React from 'react';

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

/**
 * 특정 날짜의 기존 일정을 보여주는 팝업 컴포넌트
 * - 캘린더에서 날짜 선택 시 해당 날짜의 기존 일정을 확인하고 선택할 수 있습니다.
 * @param {boolean} isOpen - 팝업 열림 여부
 * @param {string} date - 선택된 날짜
 * @param {Schedule[]} schedules - 해당 날짜의 일정 목록
 * @param {function} onClose - 팝업 닫기 핸들러
 * @param {function} onConfirm - 날짜 선택 확정 핸들러
 */
const SchedulePopup: React.FC<SchedulePopupProps> = ({ isOpen, date, schedules, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    /* 모달 오버레이 */
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/50 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-4xl p-6 shadow-2xl">
        {/* 헤더 */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-black text-main dark:text-white">{dayjs(date).format('M월 D일의 일정')}</h3>
          <button onClick={onClose} className="p-2 -mr-2 text-sub dark:text-gray-500 hover:text-main dark:hover:text-gray-300">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
          {/* 일정 목록 */}
          {schedules.map((schedule) => (
            <div key={schedule.id} className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl">
              <p className="font-bold text-sm text-main dark:text-gray-200">{schedule.title}</p>
              <p className="text-xs text-sub dark:text-gray-400 font-medium flex items-center gap-1 mt-1">
                <Clock size={12} />
                {schedule.isAllDay ? '하루 종일' : `${dayjs(schedule.start).format('HH:mm')} - ${dayjs(schedule.end).format('HH:mm')}`}
              </p>
            </div>
          ))}
        </div>
        {/* 하단 버튼 */}
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-3.5 bg-gray-100 dark:bg-gray-700 text-sub dark:text-gray-300 font-bold rounded-xl text-sm">
            닫기
          </button>
          <button onClick={() => onConfirm(date)} className="flex-1 py-3.5 bg-primary text-white font-bold rounded-xl text-sm shadow-lg shadow-primary/30 dark:shadow-blue-900/50">
            이 날짜 선택하기
          </button>
        </div>
      </div>
    </div>
  );
};

export default SchedulePopup;
