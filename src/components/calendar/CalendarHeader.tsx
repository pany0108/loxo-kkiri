import React from 'react';
import { Plus, ChevronDown, Check, Settings, Bell } from 'lucide-react';
import { CalendarType } from 'contexts';

interface CalendarHeaderProps {
  activeCalendar: CalendarType | null;
  myCalendars: CalendarType[];
  isCalListOpen: boolean;
  onCalListToggle: () => void;
  onCalendarChange: (cal: CalendarType) => void;
  onManageClick: () => void;
  onCreateClick: () => void;
  dropdownRef: React.RefObject<HTMLDivElement>;
  hasUnreadNotifications: boolean;
  onNotificationsClick: () => void;
  currentView: string;
  onViewChange: (view: string) => void;
}

const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  activeCalendar,
  myCalendars,
  isCalListOpen,
  onCalListToggle,
  onCalendarChange,
  onManageClick,
  onCreateClick,
  dropdownRef,
  hasUnreadNotifications,
  onNotificationsClick,
  currentView,
  onViewChange,
}) => {
  // [추가] 기본 캘린더("내 캘린더")를 항상 최상단에 위치시키기 위한 정렬 로직
  const sortedCalendars = React.useMemo(() => {
    return [...myCalendars].sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      return 0;
    });
  }, [myCalendars]);

  return (
    <header className="px-page pt-6 pb-2 bg-white/90 dark:bg-gray-950/80 backdrop-blur-md z-header">
      <div className="flex items-center justify-between pb-2">
        <div className="relative flex-1 min-w-0 mr-4" ref={dropdownRef}>
          <button onClick={onCalListToggle} className="group flex items-center gap-2 active:opacity-70 transition-opacity w-full">
            <h1 className="text-xl sm:text-2xl font-black text-[#191F28] dark:text-white tracking-tight truncate text-left">{activeCalendar?.name || '캘린더 선택'}</h1>
            <ChevronDown size={20} className={`text-[#8B95A1] transition-transform duration-300 flex-shrink-0 ${isCalListOpen ? 'rotate-180' : ''}`} />
          </button>
          <p className="text-[12px] text-[#8B95A1] font-bold mt-1 ml-0.5 truncate">
            {activeCalendar ? (activeCalendar.members.length === 1 ? '나만의 공간' : `${activeCalendar.members.length}명과 공유중`) : '캘린더를 생성해주세요'}
          </p>

          {isCalListOpen && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-[24px] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] dark:shadow-black/50 border border-gray-100 dark:border-gray-700 p-2 z-50 animate-in fade-in zoom-in-95 duration-200">
              {sortedCalendars.map((cal: CalendarType) => (
                <button
                  key={cal.id}
                  onClick={() => onCalendarChange(cal)}
                  className={`w-full flex items-center justify-between p-4 rounded-[18px] transition-all ${
                    activeCalendar?.id === cal.id ? 'bg-[#007AFF]/20 text-[#007AFF]' : 'text-[#8B95A1] dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'
                  }`}
                >
                  <div className="flex flex-col items-start">
                    <span className="text-[14px] font-bold ">{cal.name}</span>
                    {cal.members.length > 1 && <span className="text-[10px] opacity-70 dark:opacity-50 mt-0.5">멤버: {cal.members.length}명</span>}
                  </div>
                  {activeCalendar?.id === cal.id && <Check size={16} />}
                </button>
              ))}
              <div className="h-[1px] bg-gray-50 dark:bg-gray-700 my-2 mx-2" />
              <button
                onClick={onManageClick}
                className="w-full flex items-center gap-2 p-3.5 text-[#8B95A1] dark:text-gray-400 font-bold text-[13px] hover:text-[#191F28] dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5 rounded-[18px] transition-colors"
              >
                <Settings size={16} /> 캘린더 관리
              </button>
              <button
                onClick={onCreateClick}
                className="w-full flex items-center gap-2 p-4 text-[#8B95A1] dark:text-gray-400 font-bold text-[13px] hover:text-[#007AFF] hover:bg-[#007AFF]/20 rounded-[18px] transition-colors"
              >
                <Plus size={16} /> 새 캘린더 만들기
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 sm:gap-3">
          <button onClick={onNotificationsClick} className="relative p-2 text-[#8B95A1] hover:text-[#191F28] dark:hover:text-gray-300 transition-colors rounded-full">
            <Bell size={22} />
            {hasUnreadNotifications && <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-gray-950" />}
          </button>

          <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-[14px]">
            {[
              { id: 'dayGridMonth', label: '월' },
              { id: 'timeGridWeek', label: '주' },
              { id: 'timeGridDay', label: '일' },
            ].map((view) => (
              <button
                key={view.id}
                onClick={() => onViewChange(view.id)}
                className={`px-3 py-1.5 text-[12px] font-bold rounded-[10px] transition-all duration-200 ${
                  currentView === view.id ? 'bg-white dark:bg-gray-700 text-[#191F28] dark:text-white shadow-sm' : 'text-[#8B95A1] hover:text-[#191F28] dark:hover:text-gray-300'
                }`}
              >
                {view.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
};

export default CalendarHeader;
