import React from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import dayjs from 'dayjs';

interface ProposalCalendarProps {
  currentMonth: dayjs.Dayjs;
  onMonthChange: (newMonth: dayjs.Dayjs) => void;
  selectedDates: string[];
  schedulesByDate: Map<string, any[]>;
  onDateClick: (dateStr: string) => void;
  isRangeMode: boolean;
  onToggleRangeMode: () => void;
  votingItems?: string[]; // [추가] 범위 정보를 확인하기 위한 prop
}

// [추가] 범위별 구분을 위한 색상 팔레트 (Blue Variations)
const RANGE_PALETTES = [
  // 1. Primary (Standard): 메인 컬러 그대로 사용. 가장 눈에 띄어야 하는 범위.
  {
    main: 'bg-[#007AFF]',
    strip: 'bg-[#007AFF]/15 dark:bg-[#007AFF]/30', // 너무 진하지 않게 15% 투명도
    shadow: 'shadow-[#007AFF]/25 dark:shadow-[#007AFF]/40',
  },
  // 2. Soft Blue (Light): 부드럽고 산뜻한 느낌. 일반적인 일정에 적합.
  {
    main: 'bg-[#5E9EFF]', // Primary보다 밝고 부드러운 블루
    strip: 'bg-[#5E9EFF]/15 dark:bg-[#5E9EFF]/30',
    shadow: 'shadow-[#5E9EFF]/25 dark:shadow-[#5E9EFF]/40',
  },
  // 3. Ice Blue (Pale): 아주 연한 배경색 느낌. 중요도가 낮거나 긴 기간의 범위.
  {
    main: 'bg-[#9DCFFF]', // 파스텔 톤의 아주 밝은 블루
    strip: 'bg-[#9DCFFF]/20 dark:bg-[#9DCFFF]/30', // 연한 색이라 투명도를 20%로 살짝 올림
    shadow: 'shadow-[#9DCFFF]/30 dark:shadow-[#9DCFFF]/40',
  },
  // 4. Deep Ocean (Dark): 차분하고 진중한 느낌. 업무나 중요 일정.
  {
    main: 'bg-[#0055B3]', // Primary보다 명도를 낮춘 진한 블루
    strip: 'bg-[#0055B3]/10 dark:bg-[#0055B3]/30', // 진한 색이라 투명도를 10%로 낮춤
    shadow: 'shadow-[#0055B3]/20 dark:shadow-[#0055B3]/40',
  },
  // 5. Midnight Navy (Darkest): 폰트 색상(#191F28)과 어우러지는 가장 어두운 블루.
  {
    main: 'bg-[#2B4C7E]', // 남색에 가까운 무게감 있는 블루
    strip: 'bg-[#2B4C7E]/10 dark:bg-[#2B4C7E]/30',
    shadow: 'shadow-[#2B4C7E]/20 dark:shadow-[#2B4C7E]/40',
  },
];

const ProposalCalendar: React.FC<ProposalCalendarProps> = ({
  currentMonth,
  onMonthChange,
  selectedDates,
  schedulesByDate,
  onDateClick,
  isRangeMode,
  onToggleRangeMode,
  votingItems,
}) => {
  const generateDates = () => {
    const startOfMonth = currentMonth.startOf('month');
    const endOfMonth = currentMonth.endOf('month');
    const dates = [];
    for (let i = 0; i < startOfMonth.day(); i++) dates.push(null);
    for (let i = 1; i <= endOfMonth.date(); i++) dates.push(startOfMonth.date(i).format('YYYY-MM-DD'));
    return dates;
  };

  // [추가] 날짜가 속한 범위의 인덱스를 찾아 색상 세트를 반환하는 함수
  const getRangeColorSet = (dateStr: string) => {
    if (!votingItems) return RANGE_PALETTES[0];

    const index = votingItems.findIndex((item) => {
      if (item.includes(':')) {
        const [s, e] = item.split(':');
        return dateStr >= s && dateStr <= e;
      }
      return item === dateStr;
    });

    if (index === -1) return RANGE_PALETTES[0];
    return RANGE_PALETTES[index % RANGE_PALETTES.length];
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <CalendarIcon size={18} className="text-[#8B95A1] dark:text-gray-500" />
          <label className="text-[13px] font-black text-[#8B95A1] dark:text-gray-500">날짜 선택</label>
        </div>
        <button
          onClick={onToggleRangeMode}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all active:scale-95 ${
            isRangeMode ? 'bg-[#007AFF]/10 dark:bg-blue-900/20 text-[#007AFF] dark:text-blue-400' : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
          }`}
        >
          <span className="text-[11px] font-bold">연속 선택</span>
          <div className={`w-8 h-4 rounded-full relative transition-colors duration-200 ${isRangeMode ? 'bg-[#007AFF]' : 'bg-gray-300 dark:bg-gray-600'}`}>
            <div
              className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-200 ${isRangeMode ? 'translate-x-4' : 'translate-x-0'}`}
            />
          </div>
        </button>
      </div>

      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-[32px] p-6 border-2 border-transparent">
        <div className="flex items-center justify-between mb-6 px-2">
          <button
            onClick={() => onMonthChange(currentMonth.subtract(1, 'month'))}
            className="p-2 bg-white dark:bg-gray-700 rounded-xl text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white shadow-sm transition-all active:scale-95"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-[16px] font-black text-[#191F28] dark:text-white">{currentMonth.format('YYYY년 MM월')}</span>
          <button
            onClick={() => onMonthChange(currentMonth.add(1, 'month'))}
            className="p-2 bg-white dark:bg-gray-700 rounded-xl text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white shadow-sm transition-all active:scale-95"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-y-3 gap-x-1 text-center">
          {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
            <span key={d} className="text-[11px] font-black text-[#8B95A1] dark:text-gray-600 mb-2">
              {d}
            </span>
          ))}
          {generateDates().map((date, idx) => {
            if (!date) return <div key={`empty-${idx}`} />;
            const dailySchedules = schedulesByDate.get(date) || [];
            const hasMySchedule = dailySchedules.length > 0;
            const isSelected = selectedDates.includes(date);

            let selectionClasses = 'bg-white dark:bg-gray-700/50 text-[#191F28] dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700';

            // [추가] 선택된 경우 색상 세트 가져오기
            const colorSet = isSelected ? (isRangeMode ? getRangeColorSet(date) : RANGE_PALETTES[0]) : null;

            // [수정] 날짜 계산 및 인접 선택 여부 확인 (공통 로직)
            const dayObj = dayjs(date);
            const prevDateStr = dayObj.subtract(1, 'day').format('YYYY-MM-DD');
            const nextDateStr = dayObj.add(1, 'day').format('YYYY-MM-DD');

            // [추가] 두 날짜가 같은 범위에 속해있는지 확인하는 함수
            const checkConnection = (d1: string, d2: string) => {
              if (!selectedDates.includes(d1) || !selectedDates.includes(d2)) return false;
              if (!votingItems) return true; // votingItems가 없으면 기존처럼 연결
              return votingItems.some((item) => {
                if (item.includes(':')) {
                  const [s, e] = item.split(':');
                  return d1 >= s && d1 <= e && d2 >= s && d2 <= e;
                }
                return false; // 단일 날짜 아이템끼리는 연결하지 않음
              });
            };

            const isPrevConnected = checkConnection(prevDateStr, date);
            const isNextConnected = checkConnection(date, nextDateStr);

            if (isSelected && colorSet) {
              if (isPrevConnected && isNextConnected) {
                selectionClasses = `${colorSet.main} text-white shadow-sm`;
              } else {
                selectionClasses = `${colorSet.main} text-white shadow-lg ${colorSet.shadow} scale-105 z-10`;
              }
            }

            // [추가] 배경 연결 스트립 로직
            const isStartOfWeek = dayObj.day() === 0;
            const isEndOfWeek = dayObj.day() === 6;
            const connectLeft = isPrevConnected && !isStartOfWeek;
            const connectRight = isNextConnected && !isEndOfWeek;

            return (
              <div key={date} className="relative w-full aspect-square flex items-center justify-center">
                {isSelected && colorSet && (
                  <div
                    className={`absolute top-[12%] bottom-[12%] ${colorSet.strip} z-0 
                      ${connectLeft ? '-left-[3px]' : 'left-1 rounded-l-[12px]'}
                      ${connectRight ? '-right-[3px]' : 'right-1 rounded-r-[12px]'}
                    `}
                  />
                )}
                <button
                  onClick={() => onDateClick(date)}
                  className={`relative z-10 w-full h-full flex flex-col items-center justify-center rounded-[14px] transition-all duration-200 ${selectionClasses}`}
                >
                  <span
                    className={`text-[13px] font-bold relative transition-all ${isSelected ? 'text-white' : 'text-[#191F28] dark:text-gray-300'} ${
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
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ProposalCalendar;
