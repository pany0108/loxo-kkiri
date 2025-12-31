import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Plus, ChevronDown, Check, X, Settings, User, Users } from 'lucide-react';
import { SlotLabelContentArg, DateSelectArg, DatesSetArg, DayHeaderContentArg, EventContentArg } from '@fullcalendar/core';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import './CalendarMain.css';

import { useCalendar, CalendarEvent, CalendarType } from '../contexts';

dayjs.extend(isSameOrBefore);

const getWeekOfMonth = (date: Date): string => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const firstDayOfMonth = new Date(year, date.getMonth(), 1);
  const firstWeekday = firstDayOfMonth.getDay();
  const weekNumber = Math.ceil((date.getDate() + firstWeekday) / 7);
  return `${year}년 ${month}월 ${weekNumber}째주`;
};

const CalendarMain = () => {
  const navigate = useNavigate();
  const calendarRef = useRef<FullCalendar>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const minSwipeDistance = 50;
  const sheetTouchStartY = useRef<number | null>(null);
  const sheetTouchEndY = useRef<number | null>(null);
  const minSheetSwipeDistance = 50;

  const [isCalListOpen, setIsCalListOpen] = useState(false);
  const [currentView, setCurrentView] = useState('dayGridMonth');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isListVisible, setIsListVisible] = useState(false);

  // [수정] Context에서 데이터 가져오기
  const { myCalendars, events, activeCalendar, setActiveCalendar } = useCalendar();

  // [추가] 화면에 보여줄 일정 필터링 로직
  // 기본 캘린더(isDefault)가 선택되어 있거나 선택된 캘린더가 없으면 -> 모든 일정 표시 (통합 뷰)
  // 특정 공유 캘린더가 선택되어 있으면 -> 해당 캘린더 일정만 표시
  const displayedEvents = React.useMemo(() => {
    if (!activeCalendar || activeCalendar.isDefault) {
      return events;
    }
    return events.filter((event: CalendarEvent) => event.calendarId === activeCalendar.id);
  }, [events, activeCalendar]);

  // --- UI 로직 (기존과 동일) ---
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

    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      if (isLeftSwipe) calendarApi.next();
      if (isRightSwipe) calendarApi.prev();
    }
  };

  const onSheetTouchStart = (e: React.TouchEvent) => {
    sheetTouchEndY.current = null;
    sheetTouchStartY.current = e.targetTouches[0].clientY;
  };
  const onSheetTouchMove = (e: React.TouchEvent) => {
    sheetTouchEndY.current = e.targetTouches[0].clientY;
  };
  const onSheetTouchEnd = () => {
    if (!sheetTouchStartY.current || !sheetTouchEndY.current) return;
    const distance = sheetTouchEndY.current - sheetTouchStartY.current;
    const isDownSwipe = distance > minSheetSwipeDistance;
    if (isDownSwipe) {
      setIsListVisible(false);
      setSelectedDate(null);
    }
  };

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
    const originalId = info.event.extendedProps.originalId || info.event.id;
    const eventData = events.find((e: CalendarEvent) => e.id === info.event.id);

    if (currentView === 'dayGridMonth') {
      const dateStr = dayjs(info.event.start).format('YYYY-MM-DD');
      executeDateSelection(dateStr);
    } else {
      if (eventData) {
        const clickedEventData = {
          ...eventData,
          id: originalId,
          start: info.event.startStr,
          end: info.event.endStr,
        };
        navigate(`/schedule/${originalId}`, {
          state: {
            ...clickedEventData,
          },
        });
      }
    }
  };

  const handleListItemClick = (event: CalendarEvent) => {
    const originalId = event.originalId || event.id;
    navigate(`/schedule/${originalId}`, { state: { ...event, id: originalId } });
  };

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    const calendarApi = selectInfo.view.calendar;
    calendarApi.unselect();
    navigate('/add-schedule', {
      // [중요] 일정을 등록할 때 현재 활성 캘린더 ID를 넘겨줍니다.
      state: {
        start: selectInfo.startStr,
        end: selectInfo.endStr,
        allDay: selectInfo.allDay,
        calendarId: activeCalendar?.id, // 추가됨
      },
    });
  };

  const handleDatesSet = (arg: DatesSetArg) => {
    const titleEl = document.querySelector('.fc-toolbar-title') as HTMLElement;
    if (titleEl) {
      const customTitle = arg.view.type === 'timeGridWeek' ? getWeekOfMonth(arg.view.currentStart) : arg.view.title;
      titleEl.setAttribute('data-custom-title', customTitle);
    }
  };

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
        {!eventInfo.event.allDay && (
          <div className="flex flex-wrap items-center gap-1 text-[10px] font-extrabold text-white/90 leading-tight mb-0.5 tracking-tight">
            <span>{startStr}</span>
            {endStr && (
              <>
                <span className="opacity-70">-</span>
                <span className="opacity-90">{endStr}</span>
              </>
            )}
          </div>
        )}

        {eventInfo.event.title && (
          <div className={`font-bold text-white leading-tight break-words w-full ${isWeekView ? 'text-[10px]' : 'text-[12px] px-0.5'}`}>{eventInfo.event.title}</div>
        )}
      </div>
    );
  };

  // 활성 캘린더가 로딩 중일 때 처리 (선택 사항)
  if (!activeCalendar && myCalendars.length === 0) {
    // 캘린더가 하나도 없을 때 보여줄 화면 (예: 캘린더 생성 유도 등)
    // 여기서는 일단 기본 렌더링을 유지하되 데이터만 비어있음
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-white dark:bg-gray-950 font-['Pretendard'] overflow-hidden relative">
      <header className="px-6 pt-6 pb-2 bg-white/90 dark:bg-gray-950/80 backdrop-blur-md z-50">
        <div className="flex items-center justify-between pb-2">
          <div className="relative" ref={dropdownRef}>
            <button onClick={() => setIsCalListOpen(!isCalListOpen)} className="group flex items-center gap-2 active:opacity-70 transition-opacity">
              <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{activeCalendar?.name || '캘린더 선택'}</h1>
              <ChevronDown size={20} className={`text-gray-400 transition-transform duration-300 ${isCalListOpen ? 'rotate-180' : ''}`} />
            </button>
            <p className="text-[12px] text-gray-400 font-bold mt-1 ml-0.5">
              {activeCalendar ? (activeCalendar.isPrivate ? '나만의 공간' : `${activeCalendar.members.length}명과 공유중`) : '캘린더를 생성해주세요'}
            </p>

            {isCalListOpen && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-[24px] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] dark:shadow-black/50 border border-gray-100 dark:border-gray-700 p-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                {myCalendars.map((cal: CalendarType) => (
                  <button
                    key={cal.id}
                    onClick={() => {
                      setActiveCalendar(cal);
                      setIsCalListOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-4 rounded-[18px] transition-all ${
                      activeCalendar?.id === cal.id
                        ? 'bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="flex flex-col items-start">
                      <span className="text-[14px] font-bold ">{cal.name}</span>
                      {!cal.isPrivate && <span className="text-[10px] opacity-70 dark:opacity-50 mt-0.5">멤버: {cal.members.length}명</span>}
                    </div>
                    {activeCalendar?.id === cal.id && <Check size={16} />}
                  </button>
                ))}
                <div className="h-[1px] bg-gray-50 dark:bg-gray-700 my-2 mx-2" />
                <button
                  onClick={() => {
                    setIsCalListOpen(false);
                    navigate('/calendar-manager');
                  }}
                  className="w-full flex items-center gap-2 p-3.5 text-gray-500 dark:text-gray-400 font-bold text-[13px] hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5 rounded-[18px] transition-colors"
                >
                  <Settings size={16} /> 캘린더 관리
                </button>
                <button
                  onClick={() => navigate('/create-calendar')}
                  className="w-full flex items-center gap-2 p-4 text-gray-500 dark:text-gray-400 font-bold text-[13px] hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-blue-500/10 rounded-[18px] transition-colors"
                >
                  <Plus size={16} /> 새 캘린더 만들기
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-[14px]">
              {[
                { id: 'dayGridMonth', label: '월' },
                { id: 'timeGridWeek', label: '주' },
                { id: 'timeGridDay', label: '일' },
              ].map((view) => (
                <button
                  key={view.id}
                  onClick={() => handleViewChange(view.id)}
                  className={`px-3 py-1.5 text-[12px] font-bold rounded-[10px] transition-all duration-200 ${
                    currentView === view.id ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                  }`}
                >
                  {view.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col bg-white dark:bg-gray-900 overflow-hidden relative rounded-t-[32px] shadow-[0_-5px_20px_rgba(0,0,0,0.02)]">
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
            events={displayedEvents} // [수정] 필터링된 일정 목록 전달
            eventDidMount={(info) => {
              const color = info.event.backgroundColor || info.event.extendedProps.color;
              if (color) {
                info.el.style.setProperty('--event-color', color);
              }
            }}
          />
        </div>

        {/* 바텀시트 */}
        <div
          ref={listRef}
          onTouchStart={onSheetTouchStart}
          onTouchMove={onSheetTouchMove}
          onTouchEnd={onSheetTouchEnd}
          className={`absolute left-0 right-0 bottom-0 bg-white dark:bg-gray-800 z-30 transition-transform duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] border-t border-gray-100 dark:border-gray-700 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] rounded-t-[32px] ${
            isListVisible && currentView === 'dayGridMonth' ? 'translate-y-0' : 'translate-y-full'
          }`}
          style={{ height: '50%' }}
        >
          <div className="w-full flex justify-center pt-3 pb-1" onClick={() => setIsListVisible(false)}>
            <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full" />
          </div>

          <div className="flex items-center justify-between px-6 pt-2 pb-4 bg-white dark:bg-gray-800">
            <div className="flex items-center gap-2">
              <span className="w-1 h-4 bg-blue-600 rounded-full"></span>
              <h3 className="text-[16px] font-black text-gray-900 dark:text-white">{selectedDate ? `${parseInt(selectedDate.split('-')[2])}일의 일정` : '일정'}</h3>
            </div>
            <button
              onClick={() => {
                setIsListVisible(false);
                setSelectedDate(null);
              }}
              className="p-2 -mr-2 text-gray-300 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="px-6 pb-24 overflow-y-auto h-full">
            <div className="space-y-3">
              {displayedEvents
                .filter((event: CalendarEvent) => {
                  if (!selectedDate) return true;
                  return dayjs(event.start).format('YYYY-MM-DD') === selectedDate;
                })
                .map((event: CalendarEvent, index: number) => (
                  <div
                    key={`${event.id}-${index}`}
                    onClick={() => handleListItemClick(event)}
                    className="relative bg-white dark:bg-gray-800/50 p-5 rounded-[24px] border border-gray-100 dark:border-gray-700/50 shadow-sm active:scale-[0.98] transition-all cursor-pointer group hover:shadow-md overflow-hidden"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-[6px]" style={{ backgroundColor: event.color || '#3b82f6' }} />

                    <div className="pl-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-2 py-1 bg-gray-50 dark:bg-gray-700 text-[10px] font-bold text-gray-600 dark:text-gray-300 rounded-[8px]">
                          {event.allDay ? '종일' : `${dayjs(event.start).format('A h:mm')} - ${event.end ? dayjs(event.end).format('A h:mm') : ''}`}
                        </span>

                        <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 dark:text-gray-500">
                          {event.attendees.length > 1 ? <Users size={12} /> : <User size={12} />}
                          <span>{event.attendees.length > 1 ? `${event.attendees.length}명` : '나'}</span>
                        </div>
                      </div>

                      <h4 className="text-[15px] font-black text-gray-900 dark:text-white mb-1 group-hover:text-blue-600 transition-colors truncate">{event.title}</h4>

                      {event.location && <p className="text-[12px] font-medium text-gray-400 dark:text-gray-500 flex items-center gap-1 truncate">{event.location}</p>}
                    </div>
                  </div>
                ))}

              {displayedEvents.filter((e: CalendarEvent) => dayjs(e.start).format('YYYY-MM-DD') === selectedDate).length === 0 && (
                <div className="py-10 text-center text-gray-400 dark:text-gray-500 text-[13px] font-medium">일정이 없습니다.</div>
              )}
            </div>
          </div>
        </div>
      </main>

      <button
        onClick={() => {
          const targetDate = selectedDate || new Date().toISOString().split('T')[0];
          navigate('/add-schedule', {
            state: {
              start: targetDate,
              end: targetDate,
              allDay: true,
              calendarId: activeCalendar?.id, // [수정] 활성 캘린더 ID 전달
            },
          });
        }}
        className="absolute right-6 bottom-6 w-[56px] h-[56px] bg-gray-900 dark:bg-blue-500 text-white rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.3)] flex items-center justify-center z-40 active:scale-90 transition-transform hover:bg-black"
      >
        <Plus size={24} strokeWidth={3} />
      </button>
    </div>
  );
};

export default CalendarMain;
