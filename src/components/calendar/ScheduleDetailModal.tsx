import React from 'react';
import { X, Clock, MapPin, AlignLeft, Users, Calendar } from 'lucide-react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';

interface ScheduleDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: any;
  scheduleId: string;
}

const ScheduleDetailModal: React.FC<ScheduleDetailModalProps> = ({ isOpen, onClose, schedule, scheduleId }) => {
  const navigate = useNavigate();

  if (!isOpen || !schedule) return null;

  const formatDate = (start: any, end: any, isAllDay: boolean) => {
    // Firestore Timestamp 처리
    const startDate = start?.toDate ? dayjs(start.toDate()) : dayjs(start);
    const endDate = end?.toDate ? dayjs(end.toDate()) : dayjs(end);

    if (isAllDay) {
      if (startDate.isSame(endDate, 'day')) {
        return `${startDate.format('M월 D일 (ddd)')} 종일`;
      }
      return `${startDate.format('M월 D일 (ddd)')} ~ ${endDate.format('M월 D일 (ddd)')}`;
    }

    if (startDate.isSame(endDate, 'day')) {
      return `${startDate.format('M월 D일 (ddd)')} ${startDate.format('A h:mm')} ~ ${endDate.format('A h:mm')}`;
    }

    return `${startDate.format('M월 D일 (ddd) A h:mm')} ~ ${endDate.format('M월 D일 (ddd) A h:mm')}`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-5">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-[32px] p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-full transition-colors"
        >
          <X size={20} />
        </button>

        <div className="mb-6 pt-2">
          <h3 className="text-xl font-black text-gray-900 dark:text-white leading-tight">{schedule.title}</h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
              <Clock size={16} className="text-gray-500 dark:text-gray-400" />
            </div>
            <div className="py-1.5">
              <p className="text-[14px] font-bold text-gray-700 dark:text-gray-200 leading-snug">{formatDate(schedule.start, schedule.end, schedule.isAllDay)}</p>
            </div>
          </div>

          {schedule.location && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                <MapPin size={16} className="text-gray-500 dark:text-gray-400" />
              </div>
              <div className="py-1.5">
                <p className="text-[14px] font-medium text-gray-700 dark:text-gray-200">{schedule.location}</p>
              </div>
            </div>
          )}

          {schedule.content && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                <AlignLeft size={16} className="text-gray-500 dark:text-gray-400" />
              </div>
              <div className="py-1.5">
                <p className="text-[14px] text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{schedule.content}</p>
              </div>
            </div>
          )}

          {schedule.attendees && schedule.attendees.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                <Users size={16} className="text-gray-500 dark:text-gray-400" />
              </div>
              <p className="text-[13px] font-bold text-gray-600 dark:text-gray-400">{schedule.attendees.length}명 참여중</p>
            </div>
          )}
        </div>

        <div className="mt-8">
          <button
            onClick={() => {
              navigate(`/schedule/${scheduleId}`);
            }}
            className="w-full py-3.5 bg-primary text-white font-bold rounded-2xl text-[14px] shadow-lg shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Calendar size={18} />
            일정 상세 페이지로 이동
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScheduleDetailModal;
