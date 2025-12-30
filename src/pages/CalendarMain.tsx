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
 * @property id - 캘린더 고유 ID
 * @property name - 캘린더 표시 이름
 * @property members - 캘린더 공유 멤버 리스트 (이름 배열)
 * @property isPrivate - 개인 캘린더 여부
 */
interface CalendarType {
  id: string;
  name: string;
  members: string[];
  isPrivate: boolean;
}

/**
 * 캘린더 이벤트(일정) 데이터 인터페이스
 * @property id - 이벤트 고유 ID
 * @property title - 이벤트 제목
 * @property start - 시작 시간 (Date 객체 또는 ISO 문자열)
 * @property end - 종료 시간 (Date 객체 또는 ISO 문자열, 선택)
 * @property allDay - 종일 일정 여부
 * @property color - 이벤트 색상 코드 (Hex)
 * @property location - 장소 정보 (선택)
 * @property attendees - 일정 참여자 이름 리스트
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
 * 주어진 날짜가 해당 월의 몇 번째 주인지 계산하는 유틸리티 함수
 * @param date - 기준 날짜
 * @returns 'YYYY년 M월 N째주' 형식의 문자열
 */
const getWeekOfMonth = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const firstDayOfMonth = new Date(year, date.getMonth(), 1);
  const firstWeekday = firstDayOfMonth.getDay();
  const weekNumber = Math.ceil((date.getDate() + firstWeekday) / 7);
  return `${year}년 ${month}월 ${weekNumber}째주`;
};

/**
 * 메인 캘린더 컴포넌트
 * - FullCalendar 라이브러리를 사용한 월간/주간/일간 뷰 제공
 * - 캘린더 선택 및 관리 기능
 * - 일정 상세 보기 (바텀시트) 및 일정 추가 기능
 */
const CalendarMain = () => {
  const navigate = useNavigate();
  const calendarRef = useRef<FullCalendar>(null);
  const dropdownRef = useRef<HTMLDivElement>(null); // 캘린더 리스트 드롭다운 참조

  // 스와이프 동작 감지를 위한 터치 좌표 Ref
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const minSwipeDistance = 50;

  // 상태 관리
  const [isCalListOpen, setIsCalListOpen] = useState(false); // 캘린더 리스트 드롭다운 열림 여부
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
  const [currentView, setCurrentView] = useState('dayGridMonth'); // 현재 보고 있는 뷰 (월/주/일)
  const [selectedDate, setSelectedDate] = useState<string | null>(null); // 선택된 날짜 (월간 뷰 바텀시트용)
  const [isListVisible, setIsListVisible] = useState(false); // 바텀시트 표시 여부

  // 일정 데이터 상태
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

  const listRef = useRef<HTMLDivElement>(null);

  /**
   * 바텀시트 열림/닫힘 시 캘린더 크기 재계산 애니메이션
   * - 바텀시트가 올라오면 캘린더 높이가 줄어들므로 레이아웃을 다시 그리기 위함
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
   * 외부 클릭 감지하여 캘린더 리스트 드롭다운 닫기
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

  // =================================================================
  // 터치 스와이프 핸들러 (월 이동)
  // =================================================================
  const onTouchStart = (e: React.TouchEvent) => {
    touchEndX.current = null;
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const onTouchEnd = () => {
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

  /**
   * 캘린더 뷰 변경 핸들러 (월/주/일)
   * @param view - 변경할 뷰 이름 ('dayGridMonth', 'timeGridWeek', 'timeGridDay')
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
   * 날짜 선택 시 바텀시트 활성화 로직
   * @param dateStr - 선택된 날짜 문자열 (YYYY-MM-DD)
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

  // 날짜 셀 클릭 핸들러
  const handleDateClick = (arg: { dateStr: string }) => {
    executeDateSelection(arg.dateStr);
  };

  // 캘린더 내 이벤트 클릭 핸들러
  const handleEventClick = (info: any) => {
    const eventData = events.find((e) => e.id === info.event.id);

    // 월간 뷰: 해당 날짜의 바텀시트 열기
    if (currentView === 'dayGridMonth') {
      const dateStr = info.event.startStr.split('T')[0];
      executeDateSelection(dateStr);
    } else {
      // 주간/일간 뷰: 상세 페이지로 바로 이동
      navigate(`/schedule/${info.event.id}`, { state: eventData });
    }
  };

  // 바텀시트 리스트 아이템 클릭 핸들러
  const handleListItemClick = (event: CalendarEvent) => {
    navigate(`/schedule/${event.id}`, { state: event });
  };

  // 빈 날짜 드래그 선택 시 일정 추가 화면으로 이동
  const handleDateSelect = (selectInfo: DateSelectArg) => {
    const calendarApi = selectInfo.view.calendar;
    calendarApi.unselect();
    navigate('/add-schedule', {
      state: { start: selectInfo.startStr, end: selectInfo.endStr, allDay: selectInfo.allDay },
    });
  };

  // 날짜 범위 변경 시 헤더 타이틀 커스텀 (주간 뷰 'N월 N째주' 표시용)
  const handleDatesSet = (arg: DatesSetArg) => {
    const titleEl = document.querySelector('.fc-toolbar-title') as HTMLElement;
    if (titleEl) {
      const customTitle = arg.view.type === 'timeGridWeek' ? getWeekOfMonth(arg.view.currentStart) : arg.view.title;
      titleEl.setAttribute('data-custom-title', customTitle);
    }
  };

  // =================================================================
  // 커스텀 렌더링 함수 (Render Hooks)
  // =================================================================

  /**
   * 주간/일간 뷰 헤더 날짜 렌더링
   * - 요일에 따라 색상 구분 (일: 빨강, 토: 파랑)
   */
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

  /**
   * 캘린더 이벤트(일정) 내용 커스텀 렌더링
   * - 월간 뷰: 점(Dot) + 제목
   * - 주간/일간 뷰: 시작-종료 시간 + 제목 박스
   */
  const renderEventContent = (eventInfo: EventContentArg) => {
    // 1. 월간 뷰 렌더링
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

    // 2. 주간/일간 뷰 렌더링
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
      {/* =================================================================
          1. 헤더 영역 (캘린더 선택, 뷰 전환 탭)
      ================================================================= */}
      <header className="px-6 pt-6 pb-2 bg-white/90 backdrop-blur-md z-50">
        <div className="flex items-center justify-between pb-2">
          {/* 캘린더 선택 드롭다운 */}
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

          {/* 뷰 전환 탭 (월/주/일) */}
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

      {/* =================================================================
          2. 메인 캘린더 영역
      ================================================================= */}
      <main className="flex-1 flex flex-col bg-white overflow-hidden relative rounded-t-[32px] shadow-[0_-5px_20px_rgba(0,0,0,0.02)]">
        <div
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
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

        {/* =================================================================
            3. 일정 상세 리스트 (바텀시트)
            - 월간 뷰에서 날짜 선택 시 하단에서 올라오는 리스트
        ================================================================= */}
        <div
          ref={listRef}
          className={`absolute left-0 right-0 bottom-0 bg-white z-30 transition-transform duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] border-t border-gray-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] rounded-t-[32px]
            ${isListVisible && currentView === 'dayGridMonth' ? 'translate-y-0' : 'translate-y-full'}`}
          style={{ height: '50%' }}
        >
          {/* 바텀시트 헤더 */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4 bg-white rounded-t-[32px]">
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

          {/* 일정 리스트 */}
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

      {/* =================================================================
          4. 플로팅 액션 버튼 (FAB)
          - 일정 추가 화면으로 이동
      ================================================================= */}
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
