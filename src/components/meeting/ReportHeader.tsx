import React from 'react';
import { Sparkles, MapPin, CalendarCheck, Calendar } from 'lucide-react';
import dayjs from 'dayjs';

interface ReportHeaderProps {
  title: string;
  location?: string;
  status: 'PENDING' | 'VOTING' | 'CONFIRMED';
  confirmedSlot?: { date: string; time: string };
  scheduleId?: string;
  onNavigate?: (path: string) => void;
  isRetry?: boolean;
}

const ReportHeader: React.FC<ReportHeaderProps> = ({ title, location, status, confirmedSlot, scheduleId, onNavigate, isRetry }) => {
  // [추가] 확정된 날짜 표시 포맷팅
  let confirmedDateDisplay = confirmedSlot?.date;
  if (confirmedSlot?.date) {
    if (confirmedSlot.date.includes(':')) {
      const [start, end] = confirmedSlot.date.split(':');
      confirmedDateDisplay = `${dayjs(start).format('MM.DD(ddd)')} ~ ${dayjs(end).format('MM.DD(ddd)')}`;
    } else if (dayjs(confirmedSlot.date).isValid()) {
      confirmedDateDisplay = dayjs(confirmedSlot.date).format('MM월 DD일 (ddd)');
    }
  }

  return (
    <header className="mb-8">
      <div className="inline-flex items-center justify-center w-12 h-12 bg-[#007AFF]/10 dark:bg-blue-500/10 rounded-xl mb-6">
        <CalendarCheck className="text-[#007AFF] dark:text-blue-400 w-6 h-6" />
      </div>
      <h3 className="text-lg font-bold text-[#8B95A1] dark:text-gray-400 mb-2">{title}</h3>
      {location && (
        <div className="flex items-center gap-2 text-[#8B95A1] dark:text-gray-400 font-medium mb-2">
          <MapPin size={16} />
          <span>{location}</span>
        </div>
      )}
      {status === 'CONFIRMED' ? (
        <>
          <h2 className="text-2xl font-black text-[#191F28] dark:text-white leading-[1.3] tracking-tight">
            약속이 <span className="text-[#007AFF] dark:text-blue-400">확정</span>되었습니다!
          </h2>
          <div className="mt-4 bg-[#007AFF]/10 dark:bg-blue-900/50 p-4 rounded-2xl border border-[#007AFF]/20 dark:border-blue-800">
            <p className="text-center text-lg font-black text-[#007AFF] dark:text-blue-300">{confirmedDateDisplay}</p>
            <p className="text-center text-2xl font-black text-[#007AFF] dark:text-blue-300">{confirmedSlot?.date.includes(':') ? '' : confirmedSlot?.time}</p>
          </div>
          {scheduleId && onNavigate && (
            <div className="mt-4">
              <button
                onClick={() => onNavigate(`/schedule/${scheduleId}`)}
                className="w-full h-[56px] bg-[#007AFF] text-white rounded-[20px] font-black text-[16px] shadow-lg shadow-[#007AFF]/20 dark:shadow-blue-900/50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Calendar size={20} />
                약속 일정 보러가기
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          <h2 className="text-2xl font-black text-[#191F28] dark:text-white leading-[1.3] tracking-tight">
            {isRetry ? (
              <>
                재요청된 약속의 <br />
                <span className="text-[#007AFF] dark:text-blue-400">시간</span>을 확정해주세요!
              </>
            ) : (
              <>
                가장 <span className="text-[#007AFF] dark:text-blue-400">적절한 시간</span>을<br />
                확정해주세요!
              </>
            )}
          </h2>
          <p className="mt-2 text-[#8B95A1] dark:text-gray-500 text-sm font-medium flex items-center gap-1.5">
            <Sparkles size={14} className="text-emerald-500 dark:text-emerald-400" />
            전원 가능인 시간을 우선 추천합니다.
          </p>
        </>
      )}
    </header>
  );
};

export default ReportHeader;
