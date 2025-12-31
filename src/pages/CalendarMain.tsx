import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Plus, ChevronDown, Check, X, Settings, User, Users } from 'lucide-react';
import { SlotLabelContentArg, DateSelectArg, DatesSetArg, DayHeaderContentArg, EventContentArg } from '@fullcalendar/core';
import './CalendarMain.css';

/**
 * 캘린더 메타데이터 인터페이스
 */
interface CalendarType {
  id: string;
  name: string;
  members: string[];
  isPrivate: boolean;
}

/**
 * 일정(이벤트) 데이터 인터페이스
 */
interface CalendarEvent {
  id: string;
  title: string;
  start: Date | string;
  end?: Date | string;
  allDay: boolean;
  color: string;
  location?: string;
  attendees: string[];
}

/**
 * 특정 날짜가 해당 월의 몇 번째 주인지 계산합니다.
 */
const getWeekOfMonth = (date: Date): string => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const firstDayOfMonth = new Date(year, date.getMonth(), 1);
  const firstWeekday = firstDayOfMonth.getDay();
  const weekNumber = Math.ceil((date.getDate() + firstWeekday) / 7);
  return `${year}년 ${month}월 ${weekNumber}째주`;
};

/**
 * 메인 캘린더 컴포넌트입니다.
 * - 월간/주간/일간 뷰 전환 및 일정 확인
 * - 바텀시트를 통한 일자별 상세 리스트 조회 (터치 슬라이드 다운 닫기 지원)
 * * @returns {JSX.Element} 메인 캘린더 화면
 */
const CalendarMain = () => {
  const navigate = useNavigate();
  const calendarRef = useRef<FullCalendar>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // 캘린더 스와이프 제어 Ref
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const minSwipeDistance = 50;

  // [추가] 바텀시트 스와이프 제어 Ref
  const sheetTouchStartY = useRef<number | null>(null);
  const sheetTouchEndY = useRef<number | null>(null);
  const minSheetSwipeDistance = 50; // 바텀시트를 닫기 위한 최소 드래그 거리

  // UI 상태 관리
  const [isCalListOpen, setIsCalListOpen] = useState(false);
  const [currentView, setCurrentView] = useState('dayGridMonth');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isListVisible, setIsListVisible] = useState(false);

  // 캘린더 및 이벤트 데이터 (Mock Data)
  const [activeCalendar, setActiveCalendar] = useState<CalendarType>({
    id: '1',
    name: '내 캘린더',
    members: [],
    isPrivate: true,
  });

  const [myCalendars] = useState<CalendarType[]>([
    { id: '1', name: '내 캘린더', members: [], isPrivate: true },
    { id: '2', name: '우리 가족 캘린더', members: ['엄마', '아빠', '동생'], isPrivate: false },
  ]);

  const [events] = useState<CalendarEvent[]>([
    {
      id: '1',
      title: '혼자 카페 공부 ☕',
      start: new Date(),
      end: new Date(new Date().setHours(new Date().getHours() + 2)),
      allDay: false,
      color: '#3b82f6',
      location: '스타벅스 강남점',
      attendees: ['나'],
    },
    {
      id: '2',
      title: '가족 외식 👨‍👩‍👧‍👦',
      start: new Date(new Date().setHours(new Date().getHours() + 2)),
      end: new Date(new Date().setHours(new Date().getHours() + 4)),
      allDay: false,
      color: '#f59e0b',
      location: '아웃백 스테이크하우스',
      attendees: ['나', '엄마', '아빠', '동생'],
    },
    {
      id: '3',
      title: '제주도 여행 ✈️',
      start: '2025-12-24',
      end: '2025-12-27',
      allDay: true,
      color: '#10b981',
      location: '제주도 전역',
      attendees: ['나', '친구1'],
    },
  ]);

  /**
   * 바텀시트 애니메이션 및 캘린더 리사이즈 처리
   */
  useEffect(() => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.updateSize();
      let frameId: number;
      const startTime = performance.now();
      const duration = 300;

      const animateResize = (currentTime: number) => {
        if (currentTime - startTime < duration) {
          calendarApi.updateSize();
          frameId = requestAnimationFrame(animateResize);
        } else {
          calendarApi.updateSize();
        }
      };
      frameId = requestAnimationFrame(animateResize);
      return () => cancelAnimationFrame(frameId);
    }
  }, [isListVisible]);

  /**
   * 드롭다운 외부 클릭 감지
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCalListOpen(false);
      }
    };

    if (isCalListOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isCalListOpen]);

  // 캘린더 좌우 스와이프 핸들러
  const onCalendarTouchStart = (e: React.TouchEvent) => {
    touchEndX.current = null;
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const onCalendarTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const onCalendarTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;

    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (currentView === 'dayGridMonth') {
      const calendarApi = calendarRef.current?.getApi();
      if (isLeftSwipe) calendarApi?.next();
      if (isRightSwipe) calendarApi?.prev();
    }
  };

  // [추가] 바텀시트 상하 스와이프(닫기) 핸들러
  const onSheetTouchStart = (e: React.TouchEvent) => {
    // 바텀시트 최상단에서만 스와이프 닫기 동작을 허용하려면 scrollTop 체크 가능
    // 여기서는 헤더 부분을 주로 잡고 내리는 동작을 상정하거나 전체 영역에서 내림 감지
    sheetTouchEndY.current = null;
    sheetTouchStartY.current = e.targetTouches[0].clientY;
  };

  const onSheetTouchMove = (e: React.TouchEvent) => {
    sheetTouchEndY.current = e.targetTouches[0].clientY;
  };

  const onSheetTouchEnd = () => {
    if (!sheetTouchStartY.current || !sheetTouchEndY.current) return;

    const distance = sheetTouchEndY.current - sheetTouchStartY.current;
    // 아래로 내리는 동작 (양수)이고 최소 거리 이상일 때
    const isDownSwipe = distance > minSheetSwipeDistance;

    if (isDownSwipe) {
      setIsListVisible(false);
      setSelectedDate(null);
    }
  };

  /**
   * 뷰 변경 핸들러
   */
  const handleViewChange = (view: string) => {
    const calendarApi = calendarRef.current?.getApi();
    setIsListVisible(false);
    setSelectedDate(null);
    setCurrentView(view);
    if (calendarApi) {
      calendarApi.changeView(view);
      requestAnimationFrame(() => calendarApi.updateSize());
    }
  };

  /**
   * 날짜 선택 및 바텀시트 열기
   */
  const executeDateSelection = (dateStr: string) => {
    setSelectedDate(dateStr);
    setIsListVisible(true);
    if (listRef.current) listRef.current.scrollTop = 0;
    setTimeout(() => {
      const calendarApi = calendarRef.current?.getApi();
      if (calendarApi) calendarApi.updateSize();
    }, 100);
  };

  const handleDateClick = (arg: { dateStr: string }) => {
    executeDateSelection(arg.dateStr);
  };

  const handleEventClick = (info: any) => {
    const eventData = events.find((e) => e.id === info.event.id);

    if (currentView === 'dayGridMonth') {
      const dateStr = info.event.startStr.split('T')[0];
      executeDateSelection(dateStr);
    } else {
      navigate(`/schedule/${info.event.id}`, { state: eventData });
    }
  };

  const handleListItemClick = (event: CalendarEvent) => {
    navigate(`/schedule/${event.id}`, { state: event });
  };

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    const calendarApi = selectInfo.view.calendar;
    calendarApi.unselect();
    navigate('/add-schedule', {
      state: { start: selectInfo.startStr, end: selectInfo.endStr, allDay: selectInfo.allDay },
    });
  };

  const handleDatesSet = (arg: DatesSetArg) => {
    const titleEl = document.querySelector('.fc-toolbar-title') as HTMLElement;
    if (titleEl) {
      const customTitle = arg.view.type === 'timeGridWeek' ? getWeekOfMonth(arg.view.currentStart) : arg.view.title;
      titleEl.setAttribute('data-custom-title', customTitle);
    }
  };

  // ... (renderTimeGridHeader, renderEventContent 함수는 기존과 동일) ...
  const renderTimeGridHeader = (args: DayHeaderContentArg) => {
    const date = args.date.getDate();
    const dayName = new Intl.DateTimeFormat('ko-KR', { weekday: 'short' }).format(args.date);
    const dayOfWeek = args.date.getDay();

    let dateColor = 'text-gray-900';
    let dayNameColor = 'text-gray-400';

    if (dayOfWeek === 0) {
      dateColor = 'text-red-500';
      dayNameColor = 'text-red-400';
    } else if (dayOfWeek === 6) {
      dateColor = 'text-blue-600';
      dayNameColor = 'text-blue-400';
    }

    return (
      <div className="flex flex-col items-center justify-center gap-0.5 pb-2">
        <span className={`text-[14px] font-black leading-none ${dateColor}`}>{date}</span>
        <span className={`text-[10px] font-bold leading-none ${dayNameColor}`}>{dayName}</span>
      </div>
    );
  };

  const renderEventContent = (eventInfo: EventContentArg) => {
    if (eventInfo.view.type === 'dayGridMonth') {
      if (eventInfo.event.allDay) {
        return <div className="fc-event-title fc-sticky px-1 text-[11px] font-bold">{eventInfo.event.title}</div>;
      }
      return (
        <div className="flex items-center h-full w-full overflow-hidden pl-0.5">
          <div className="w-1.5 h-1.5 rounded-full mr-1 shrink-0" style={{ backgroundColor: eventInfo.backgroundColor || '#3b82f6' }} />
          <div className="text-[10px] font-medium text-gray-400 mr-1 whitespace-nowrap">{eventInfo.timeText}</div>
          <div className="text-[11px] font-bold text-gray-700 truncate">{eventInfo.event.title}</div>
        </div>
      );
    }

    const formatTime = (date: Date | null) => {
      if (!date) return '';
      return date.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    };

    const startStr = formatTime(eventInfo.event.start);
    const endStr = formatTime(eventInfo.event.end);
    const isWeekView = eventInfo.view.type === 'timeGridWeek';

    return (
      <div className={`w-full h-full flex flex-col items-start overflow-hidden rounded-[4px] ${isWeekView ? 'p-0.5' : 'p-1'}`}>
        <div className="flex flex-wrap items-center gap-1 text-[10px] font-extrabold text-white/90 leading-tight mb-0.5 tracking-tight">
          <span>{startStr}</span>
          <span className="opacity-70">-</span>
          <span className="opacity-90">{endStr}</span>
        </div>
        {eventInfo.event.title && (
          <div className={`font-bold text-white leading-tight break-words w-full ${isWeekView ? 'text-[10px]' : 'text-[12px] px-0.5'}`}>{eventInfo.event.title}</div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-white font-['Pretendard'] overflow-hidden relative">
      {/* 헤더 (기존 코드 유지) */}
      <header className="px-6 pt-6 pb-2 bg-white/90 backdrop-blur-md z-50">
        <div className="flex items-center justify-between pb-2">
          <div className="relative" ref={dropdownRef}>
            <button onClick={() => setIsCalListOpen(!isCalListOpen)} className="group flex items-center gap-2 active:opacity-70 transition-opacity">
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">{activeCalendar.name}</h1>
              <ChevronDown size={20} className={`text-gray-400 transition-transform duration-300 ${isCalListOpen ? 'rotate-180' : ''}`} />
            </button>
            <p className="text-[12px] text-gray-400 font-bold mt-1 ml-0.5">{activeCalendar.isPrivate ? '나만의 공간' : `${activeCalendar.members.length}명과 공유중`}</p>

            {isCalListOpen && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-[24px] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] border border-gray-100 p-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                {myCalendars.map((cal) => (
                  <button
                    key={cal.id}
                    onClick={() => {
                      setActiveCalendar(cal);
                      setIsCalListOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-4 rounded-[18px] transition-all
                      ${activeCalendar.id === cal.id ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    <div className="flex flex-col items-start">
                      <span className="text-[14px] font-bold">{cal.name}</span>
                      {!cal.isPrivate && <span className="text-[10px] opacity-70 mt-0.5">멤버: {cal.members.join(', ')}</span>}
                    </div>
                    {activeCalendar.id === cal.id && <Check size={16} />}
                  </button>
                ))}
                <div className="h-[1px] bg-gray-50 my-2 mx-2" />
                <button
                  onClick={() => {
                    setIsCalListOpen(false);
                    navigate('/calendar-manager');
                  }}
                  className="w-full flex items-center gap-2 p-3.5 text-gray-500 font-bold text-[13px] hover:text-gray-900 hover:bg-gray-50 rounded-[18px] transition-colors"
                >
                  <Settings size={16} /> 캘린더 관리
                </button>
                <button
                  onClick={() => navigate('/create-calendar')}
                  className="w-full flex items-center gap-2 p-4 text-gray-500 font-bold text-[13px] hover:text-blue-600 hover:bg-gray-50 rounded-[18px] transition-colors"
                >
                  <Plus size={16} /> 새 캘린더 만들기
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex p-1 bg-gray-100 rounded-[14px]">
              {[
                { id: 'dayGridMonth', label: '월' },
                { id: 'timeGridWeek', label: '주' },
                { id: 'timeGridDay', label: '일' },
              ].map((view) => (
                <button
                  key={view.id}
                  onClick={() => handleViewChange(view.id)}
                  className={`px-3 py-1.5 text-[12px] font-bold rounded-[10px] transition-all duration-200
                    ${currentView === view.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  {view.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* 캘린더 영역 */}
      <main className="flex-1 flex flex-col bg-white overflow-hidden relative rounded-t-[32px] shadow-[0_-5px_20px_rgba(0,0,0,0.02)]">
        <div
          onTouchStart={onCalendarTouchStart}
          onTouchMove={onCalendarTouchMove}
          onTouchEnd={onCalendarTouchEnd}
          className={`flex-shrink-0 flex flex-col overflow-hidden calendar-transition 
            ${currentView === 'dayGridMonth' && isListVisible ? 'compact-mode' : 'h-full'}`}
          style={{
            height: currentView === 'dayGridMonth' && isListVisible ? '50%' : '100%',
            paddingBottom: isListVisible ? '0' : '64px',
          }}
        >
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            locale="ko"
            height="100%"
            dayMaxEvents={false}
            fixedWeekCount={true}
            contentHeight="100%"
            handleWindowResize={true}
            selectable={currentView !== 'dayGridMonth'}
            selectMirror={true}
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            eventClassNames="cursor-pointer"
            eventContent={renderEventContent}
            select={handleDateSelect}
            unselectAuto={true}
            dragScroll={true}
            longPressDelay={200}
            eventDragMinDistance={5}
            headerToolbar={{
              left: 'title',
              center: '',
              right: 'today,prev,next',
            }}
            buttonText={{ today: '오늘' }}
            datesSet={handleDatesSet}
            views={{
              dayGridMonth: {
                titleFormat: { year: 'numeric', month: 'short' },
                dayHeaderFormat: { weekday: 'short' },
                dayCellContent: (args) => args.date.getDate(),
              },
              timeGridWeek: {
                dayHeaderContent: renderTimeGridHeader,
              },
              timeGridDay: {
                titleFormat: { year: 'numeric', month: 'long', day: 'numeric' },
                dayHeaderContent: renderTimeGridHeader,
              },
            }}
            slotMinTime="06:00:00"
            slotMaxTime="24:00:00"
            slotLabelFormat={{ hour: 'numeric', minute: '2-digit', hour12: true, meridiem: 'short' }}
            slotLabelContent={(args: SlotLabelContentArg) => args.text.replace(':00', '')}
            allDayText="종일"
            displayEventTime={false}
            dayCellClassNames={(arg) => {
              const dateStr = arg.date.toLocaleDateString('en-CA');
              return dateStr === selectedDate ? 'selected-day' : '';
            }}
            events={events}
            eventDidMount={(info) => {
              const color = info.event.backgroundColor || info.event.extendedProps.color;
              if (color) {
                info.el.style.setProperty('--event-color', color);
              }
            }}
          />
        </div>

        {/* 선택 날짜 일정 리스트 (바텀시트) */}
        <div
          ref={listRef}
          onTouchStart={onSheetTouchStart}
          onTouchMove={onSheetTouchMove}
          onTouchEnd={onSheetTouchEnd}
          className={`absolute left-0 right-0 bottom-0 bg-white z-30 transition-transform duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] border-t border-gray-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] rounded-t-[32px]
            ${isListVisible && currentView === 'dayGridMonth' ? 'translate-y-0' : 'translate-y-full'}`}
          style={{ height: '50%' }}
        >
          {/* 드래그 핸들바 (시각적 힌트) */}
          <div className="w-full flex justify-center pt-3 pb-1" onClick={() => setIsListVisible(false)}>
            <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
          </div>

          <div className="flex items-center justify-between px-6 pt-2 pb-4 bg-white">
            <div className="flex items-center gap-2">
              <span className="w-1 h-4 bg-blue-600 rounded-full"></span>
              <h3 className="text-[16px] font-black text-gray-900">{selectedDate ? `${parseInt(selectedDate.split('-')[2])}일의 일정` : '일정'}</h3>
            </div>
            <button
              onClick={() => {
                setIsListVisible(false);
                setSelectedDate(null);
              }}
              className="p-2 -mr-2 text-gray-300 hover:text-gray-500 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="px-6 pb-24 overflow-y-auto h-full">
            <div className="space-y-3">
              {events
                .filter((event) => {
                  if (!selectedDate) return true;
                  const eventDate = new Date(event.start).toISOString().split('T')[0];
                  return eventDate === selectedDate;
                })
                .map((event) => (
                  <div
                    key={event.id}
                    onClick={() => handleListItemClick(event)}
                    className="bg-gray-50 p-5 rounded-[24px] border border-transparent active:scale-[0.98] transition-all cursor-pointer group hover:bg-white hover:border-gray-100 hover:shadow-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2 py-1 bg-white text-[10px] font-bold text-blue-600 rounded-[8px] shadow-sm">
                        {new Date(event.start).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })}
                      </span>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400">
                        {event.attendees.length > 1 ? <Users size={12} /> : <User size={12} />}
                        <span>{event.attendees.length > 1 ? `${event.attendees.length}명` : '나'}</span>
                      </div>
                    </div>
                    <h4 className="text-[15px] font-black text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">{event.title}</h4>
                    <p className="text-[12px] font-medium text-gray-400 flex items-center gap-1">{event.location}</p>
                  </div>
                ))}

              {events.filter((e) => new Date(e.start).toISOString().split('T')[0] === selectedDate).length === 0 && (
                <div className="py-10 text-center text-gray-400 text-[13px] font-medium">일정이 없습니다.</div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* 일정 추가 FAB (기존 코드 유지) */}
      <button
        onClick={() => {
          const targetDate = selectedDate || new Date().toISOString().split('T')[0];
          navigate('/add-schedule', {
            state: {
              start: targetDate,
              end: targetDate,
              allDay: true,
              calendarId: activeCalendar.id,
            },
          });
        }}
        className="absolute right-6 bottom-6 w-[56px] h-[56px] bg-gray-900 text-white rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.3)] flex items-center justify-center z-40 active:scale-90 transition-transform hover:bg-black"
      >
        <Plus size={24} strokeWidth={3} />
      </button>
    </div>
  );
};

export default CalendarMain;
