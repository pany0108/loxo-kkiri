import React from 'react';
import { Sparkles, MapPin, CalendarCheck } from 'lucide-react';

interface ReportHeaderProps {
  title: string;
  location?: string;
  status: 'PENDING' | 'VOTING' | 'CONFIRMED';
  confirmedSlot?: { date: string; time: string };
  scheduleId?: string;
  onNavigate?: (path: string) => void;
}

const ReportHeader: React.FC<ReportHeaderProps> = ({ title, location, status, confirmedSlot, scheduleId, onNavigate }) => {
  return (
    <header className="mb-8">
      <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-50 dark:bg-blue-500/10 rounded-xl mb-6">
        <Sparkles className="text-blue-600 dark:text-blue-400 w-6 h-6" />
      </div>
      <h3 className="text-lg font-bold text-gray-500 dark:text-gray-400 mb-2">{title}</h3>
      {location && (
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 font-medium mb-2">
          <MapPin size={16} />
          <span>{location}</span>
        </div>
      )}
      {status === 'CONFIRMED' ? (
        <>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white leading-[1.3] tracking-tight">
            약속이 <span className="text-blue-600 dark:text-blue-400">확정</span>되었습니다!
          </h2>
          <div className="mt-4 bg-blue-50 dark:bg-blue-900/50 p-4 rounded-2xl border border-blue-100 dark:border-blue-800">
            <p className="text-center text-lg font-black text-blue-600 dark:text-blue-300">{confirmedSlot?.date}</p>
            <p className="text-center text-2xl font-black text-blue-600 dark:text-blue-300">{confirmedSlot?.time}</p>
          </div>
          {scheduleId && onNavigate && (
            <div className="mt-4">
              <button
                onClick={() => onNavigate(`/schedule/${scheduleId}`)}
                className="w-full h-[56px] bg-blue-600 text-white rounded-[20px] font-black text-[16px] shadow-lg shadow-blue-100 dark:shadow-blue-900/50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <CalendarCheck size={20} />
                약속 일정 보러가기
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white leading-[1.3] tracking-tight">
            가장 <span className="text-blue-600 dark:text-blue-400">적절한 시간</span>을<br />
            확정해주세요!
          </h2>
          <p className="mt-2 text-gray-400 dark:text-gray-500 text-sm font-medium flex items-center gap-1.5">
            <Sparkles size={14} className="text-emerald-500 dark:text-emerald-400" />
            전원 가능인 시간을 우선 추천합니다.
          </p>
        </>
      )}
    </header>
  );
};

export default ReportHeader;
