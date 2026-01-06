import React, { useRef, useState, useEffect, useMemo, useLayoutEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import { Loader2 } from 'lucide-react';
import { DateSelectArg, DatesSetArg, DayHeaderContentArg, EventContentArg, EventClickArg, EventMountArg } from '@fullcalendar/core';
import { DateClickArg } from '@fullcalendar/interaction';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import './CalendarMain.css';
import { useCalendar, CalendarEvent, CalendarType } from 'contexts';
import { useFirestoreQuery } from 'hooks';
import { collection, query, where, doc, deleteDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { setupPushNotifications } from 'utils';
import { DeleteRecurringModal, Calendar, SimpleDeleteModal, CalendarHeader, DatePickerPopup, EventListSheet, AddScheduleFAB } from 'components';
import toast from 'react-hot-toast';

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
  const location = useLocation();
  const calendarRef = useRef<FullCalendar>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);

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
  const [animationClass, setAnimationClass] = useState(''); // [추가] 스와이프 애니메이션 클래스 상태
  const [isNavigating, setIsNavigating] = useState(false); // [추가] 캘린더 이동 애니메이션 중복 방지 상태

  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());

  // [추가] Jiggle 모드 및 삭제 관련 상태
  const [isJiggleMode, setIsJiggleMode] = useState(false);
  const [jigglingItemId, setJigglingItemId] = useState<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [eventToDelete, setEventToDelete] = useState<CalendarEvent | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSimpleDeleteModalOpen, setIsSimpleDeleteModalOpen] = useState(false);

  // [추가] 소셜 로그인 후 신규/기존 유저 확인 중 캘린더가 잠깐 보이는 현상 방지
  const [isInitialAuthChecking, setIsInitialAuthChecking] = useState(() => sessionStorage.getItem('isAuthChecking') === 'true');

  // [추가] 공휴일 데이터 상태
  const [holidays, setHolidays] = useState<CalendarEvent[]>([]);
  const [fetchedYears, setFetchedYears] = useState<Set<number>>(new Set());

  useLayoutEffect(() => {
    // 페이지 전환 시 브라우저의 스크롤 복원 기능과 관계없이 항상 화면 최상단에서 시작하도록 강제합니다.
    window.scrollTo(0, 0);
    // 바텀시트 스크롤 초기화
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  // [수정] Context에서 데이터 가져오기 (useEffect보다 먼저 선언)
  const { myCalendars, events, activeCalendar, setActiveCalendar } = useCalendar();

  // [추가] 소셜 로그인 플래시 방지 로직
  useEffect(() => {
    if (isInitialAuthChecking) {
      sessionStorage.removeItem('isAuthChecking');
      setIsInitialAuthChecking(false);
    }
  }, [isInitialAuthChecking]);

  // [추가] 다른 페이지에서 특정 날짜로 이동 요청 시 처리
  useEffect(() => {
    const calendarApi = calendarRef.current?.getApi();
    if (!location.state) return;

    const { targetDate, targetView, targetCalendarId } = location.state;

    let stateModified = false;

    // 1. 캘린더 뷰 변경
    if (calendarApi && targetView) {
      calendarApi.changeView(targetView);
      setCurrentView(targetView); // 뷰 버튼 UI 동기화
      stateModified = true;
    }

    // 2. 특정 날짜로 이동
    if (calendarApi && targetDate) {
      calendarApi.gotoDate(targetDate);
      stateModified = true;
    }

    // 3. 활성 캘린더 변경 (알림 클릭 시)
    if (targetCalendarId && myCalendars.length > 0) {
      const targetCalendar = myCalendars.find((c: CalendarType) => c.id === targetCalendarId);
      if (targetCalendar) setActiveCalendar(targetCalendar);
      stateModified = true;
    }

    // 처리된 state는 비워서 중복 실행 방지
    if (stateModified) {
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, myCalendars, setActiveCalendar, navigate]);

  // [추가] 푸시 알림 설정
  useEffect(() => {
    if (auth.currentUser) {
      setupPushNotifications(auth.currentUser.uid, navigate);
    }
  }, [navigate]);

  // [추가] 읽지 않은 알림 확인
  const notificationsQuery = useMemo(() => {
    if (!auth.currentUser) return null;
    return query(collection(db, 'notifications'), where('userId', '==', auth.currentUser.uid), where('isRead', '==', false));
  }, []);

  const { data: unreadNotifications } = useFirestoreQuery(notificationsQuery);
  const hasUnread = useMemo(() => (unreadNotifications ? unreadNotifications.length > 0 : false), [unreadNotifications]);

  // [추가] 화면에 보여줄 일정 필터링 로직
  // 기본 캘린더(isDefault)가 선택되어 있거나 선택된 캘린더가 없으면 -> 모든 일정 표시 (통합 뷰)
  // 특정 공유 캘린더가 선택되어 있으면 -> 해당 캘린더 일정만 표시
  const displayedEvents = useMemo(() => {
    // 1. 활성 캘린더가 없으면 모든 일정을 표시합니다. (초기 로딩 등)
    if (!activeCalendar) {
      return events;
    }
    // 2. 활성 캘린더가 '내 캘린더'(기본 캘린더)이면 모든 일정을 표시합니다.
    if (activeCalendar.isDefault) {
      return events;
    }
    // 3. 특정 공유 캘린더가 선택된 경우, 해당 캘린더의 일정만 필터링하여 표시합니다.
    return events.filter((event: CalendarEvent) => event.calendarId === activeCalendar.id);
  }, [events, activeCalendar]);

  // [추가] 공휴일과 사용자 이벤트를 합친 최종 이벤트 목록
  const allDisplayedEvents = useMemo(() => {
    return [...displayedEvents, ...holidays];
  }, [displayedEvents, holidays]);

  // [추가] 공휴일 정보 가져오기
  const fetchHolidays = async (year: number) => {
    if (fetchedYears.has(year)) return;

    try {
      const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/KR`);
      if (!response.ok) {
        console.error(`Failed to fetch holidays for ${year}`);
        return;
      }
      const data = await response.json();
      const holidayEvents: CalendarEvent[] = data.map((holiday: any) => ({
        id: `holiday-${holiday.date}`,
        title: holiday.localName,
        start: holiday.date,
        allDay: true,
        color: 'transparent', // 배경색 없앰
        calendarId: 'holidays', // 공휴일용 특수 ID
        attendees: [],
        extendedProps: { isHoliday: true },
      }));

      setHolidays((prev) => [...prev.filter((p) => !holidayEvents.some((h) => h.id === p.id)), ...holidayEvents]);
      setFetchedYears((prev) => new Set(prev).add(year));
    } catch (error) {
      console.error('Error fetching holidays:', error);
    }
  };

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
      // [추가] Jiggle 모드일 때 외부 클릭 시 모드 종료
      if (isJiggleMode && listRef.current && !listRef.current.contains(event.target as Node)) {
        exitJiggleMode();
      }
      // [추가] Date picker 외부 클릭 시 닫기
      const titleEl = document.querySelector('.fc-toolbar-title');
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node) && titleEl && !titleEl.contains(event.target as Node)) {
        setIsDatePickerOpen(false);
      }
    };
    if (isCalListOpen || isJiggleMode || isDatePickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isCalListOpen, isJiggleMode, isDatePickerOpen]);

  // [추가] 캘린더 타이틀 클릭 핸들러 추가
  useEffect(() => {
    const titleEl = document.querySelector('.fc-toolbar-title');
    if (titleEl) {
      (titleEl as HTMLElement).style.cursor = 'pointer';
      const handleClick = () => {
        const calendarApi = calendarRef.current?.getApi();
        if (calendarApi) {
          setPickerYear(calendarApi.getDate().getFullYear());
          setIsDatePickerOpen((prev) => !prev);
        }
      };
      titleEl.addEventListener('click', handleClick);
      return () => {
        titleEl.removeEventListener('click', handleClick);
      };
    }
  }, []);

  // [추가] Jiggle 모드 및 삭제 관련 핸들러
  const handlePointerDown = (event: CalendarEvent) => {
    if (isJiggleMode) return;
    longPressTimer.current = setTimeout(() => {
      setIsJiggleMode(true);
      setJigglingItemId(event.id!);
    }, 500);
  };

  const handlePointerUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const exitJiggleMode = () => {
    setIsJiggleMode(false);
    setJigglingItemId(null);
  };

  const handleDeleteClick = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    setEventToDelete(event);
    if (event.recurrence && event.recurrence.frequency !== 'none') {
      setIsDeleteModalOpen(true);
    } else {
      setIsSimpleDeleteModalOpen(true);
    }
  };

  const getDocId = (event: CalendarEvent | null) => event?.originalId || event?.id;

  const deleteEntireSchedule = async () => {
    if (!eventToDelete) return;
    const docId = getDocId(eventToDelete);
    try {
      if (docId) {
        await deleteDoc(doc(db, 'schedules', docId));
        toast.success('일정이 삭제되었습니다.');
      }
    } catch (error) {
      toast.error('삭제 중 오류가 발생했습니다.');
    } finally {
      setIsSimpleDeleteModalOpen(false);
      setIsDeleteModalOpen(false);
      exitJiggleMode();
    }
  };

  const deleteOnlyThis = async () => {
    if (!eventToDelete) return;
    const docId = getDocId(eventToDelete);
    try {
      if (docId) {
        const dateToDelete = dayjs(eventToDelete.start).format('YYYY-MM-DD');
        await updateDoc(doc(db, 'schedules', docId), {
          'recurrence.exceptions': arrayUnion(dateToDelete),
        });
        toast.success('해당 날짜의 일정이 삭제되었습니다.');
      }
    } catch (error) {
      toast.error('삭제 중 오류가 발생했습니다.');
    } finally {
      setIsDeleteModalOpen(false);
      exitJiggleMode();
    }
  };

  const deleteFollowing = async () => {
    if (!eventToDelete) return;
    const docId = getDocId(eventToDelete);
    try {
      if (docId) {
        const newEndDate = dayjs(eventToDelete.start).subtract(1, 'day').format('YYYY-MM-DD');
        await updateDoc(doc(db, 'schedules', docId), {
          'recurrence.endType': 'date',
          'recurrence.endDate': newEndDate,
        });
        toast.success('이후 일정이 모두 삭제되었습니다.');
      }
    } catch (error) {
      toast.error('삭제 중 오류가 발생했습니다.');
    } finally {
      setIsDeleteModalOpen(false);
      exitJiggleMode();
    }
  };

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

    if (isLeftSwipe) goToNext();
    if (isRightSwipe) goToPrev();
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

  // [추가] 이전/다음 이동 함수 (애니메이션 제어 포함)
  const goToNext = () => {
    if (isNavigating) return; // [수정] 애니메이션 중복 실행 방지
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      setIsNavigating(true);
      setAnimationClass('calendar-swipe-left');
      calendarApi.next();
      setTimeout(() => {
        setAnimationClass('');
        setIsNavigating(false);
      }, 350);
    }
  };

  const goToPrev = () => {
    if (isNavigating) return; // [수정] 애니메이션 중복 실행 방지
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      setIsNavigating(true);
      setAnimationClass('calendar-swipe-right');
      calendarApi.prev();
      setTimeout(() => {
        setAnimationClass('');
        setIsNavigating(false);
      }, 350);
    }
  };

  // [추가] 연/월 선택기에서 월 선택 시
  const handleMonthSelect = (month: number) => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      const newDate = new Date(pickerYear, month, 1);
      calendarApi.gotoDate(newDate);
    }
    setIsDatePickerOpen(false);
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
      calendarApi?.updateSize();
    }, 100);
  };

  const handleDateClick = (arg: DateClickArg) => {
    executeDateSelection(arg.dateStr);
  };

  const handleEventClick = (info: EventClickArg) => {
    // [추가] 공휴일 이벤트는 클릭 무시
    // [수정] isHoliday 대신 calendarId로 공휴일 식별
    if (info.event.extendedProps.calendarId === 'holidays') {
      info.jsEvent.preventDefault();
      return;
    }

    const originalId = info.event.extendedProps.originalId || info.event.id;
    const eventData = events.find((e: CalendarEvent) => e.id === originalId);

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
            fromView: currentView, // [추가] 현재 뷰 정보를 전달
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

    // [추가] 년도가 바뀔 때 공휴일 정보 가져오기
    const startYear = arg.view.activeStart.getFullYear();
    const endYear = arg.view.activeEnd.getFullYear();

    fetchHolidays(startYear);
    if (startYear !== endYear) {
      fetchHolidays(endYear);
    }
  };

  const renderTimeGridHeader = (args: DayHeaderContentArg) => {
    const date = args.date.getDate();
    const dayName = new Intl.DateTimeFormat('ko-KR', { weekday: 'short' }).format(args.date);
    const dayOfWeek = args.date.getDay();
    let dateColor = 'text-gray-900 dark:text-gray-200';
    let dayNameColor = 'text-gray-400 dark:text-gray-500';
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
    const isHoliday = eventInfo.event.extendedProps.calendarId === 'holidays';

    // [추가] 공휴일 스타일링
    if (isHoliday) {
      return <div className="fc-event-title fc-sticky px-1 text-[11px] font-bold text-red-500 dark:text-red-400">{eventInfo.event.title}</div>;
    }

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

    // --- 주/일 뷰 이벤트 렌더링 ---
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

  // [추가] 소셜 로그인 처리 중 전체 화면 로더 표시
  if (isInitialAuthChecking) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-white dark:bg-gray-950">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-950 font-['Pretendard'] overflow-hidden relative pt-[env(safe-area-inset-top)]">
      <CalendarHeader
        activeCalendar={activeCalendar}
        myCalendars={myCalendars}
        isCalListOpen={isCalListOpen}
        onCalListToggle={() => setIsCalListOpen(!isCalListOpen)}
        onCalendarChange={(cal) => {
          setActiveCalendar(cal);
          setIsCalListOpen(false);
        }}
        onManageClick={() => {
          setIsCalListOpen(false);
          navigate('/calendar-manager');
        }}
        onCreateClick={() => navigate('/create-calendar')}
        dropdownRef={dropdownRef}
        hasUnreadNotifications={hasUnread}
        onNotificationsClick={() => navigate('/notifications')}
        currentView={currentView}
        onViewChange={handleViewChange}
      />

      <main className="flex-1 flex flex-col bg-white dark:bg-gray-900 overflow-hidden relative rounded-t-[32px] shadow-[0_-5px_20px_rgba(0,0,0,0.02)]">
        {/* [추가] 연/월 선택 팝업 */}
        <DatePickerPopup
          isOpen={isDatePickerOpen}
          datePickerRef={datePickerRef}
          pickerYear={pickerYear}
          onYearChange={setPickerYear}
          onMonthSelect={handleMonthSelect}
          currentDate={calendarRef.current?.getApi().getDate() || new Date()}
        />
        <div
          onTouchStart={onCalendarTouchStart}
          onTouchMove={onCalendarTouchMove}
          onTouchEnd={onCalendarTouchEnd}
          className={`flex-shrink-0 flex flex-col overflow-hidden calendar-transition ${
            currentView === 'dayGridMonth' && isListVisible ? 'compact-mode' : 'h-full'
          } ${animationClass}`}
          style={{
            height: currentView === 'dayGridMonth' && isListVisible ? '50%' : '100%',
            paddingBottom: isListVisible ? '0' : '64px',
          }}
        >
          <Calendar
            currentView={currentView}
            events={allDisplayedEvents}
            selectedDate={selectedDate}
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            handleDateSelect={handleDateSelect}
            handleDatesSet={handleDatesSet}
            renderEventContent={renderEventContent}
            renderTimeGridHeader={renderTimeGridHeader}
            goToPrev={goToPrev}
            goToNext={goToNext}
            eventDidMount={(info: EventMountArg) => {
              const color = info.event.backgroundColor || info.event.extendedProps.color;
              if (color) {
                info.el.style.setProperty('--event-color', color);
              }
            }}
            ref={calendarRef}
          />
        </div>

        {/* 바텀시트 */}
        <EventListSheet
          isVisible={isListVisible && currentView === 'dayGridMonth'}
          onClose={() => {
            setIsListVisible(false);
            setSelectedDate(null);
          }}
          selectedDate={selectedDate}
          events={allDisplayedEvents}
          onListItemClick={handleListItemClick}
          isJiggleMode={isJiggleMode}
          jigglingItemId={jigglingItemId}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onDeleteClick={handleDeleteClick}
          listRef={listRef}
          onTouchStart={onSheetTouchStart}
          onTouchMove={onSheetTouchMove}
          onTouchEnd={onSheetTouchEnd}
          exitJiggleMode={exitJiggleMode}
        />
      </main>

      <AddScheduleFAB
        onClick={() => {
          const targetDate = selectedDate || new Date().toISOString().split('T')[0];
          navigate('/add-schedule', { state: { start: targetDate, end: targetDate, allDay: true, calendarId: activeCalendar?.id } });
        }}
      />

      {/* [추가] 삭제 관련 모달 */}
      {isDeleteModalOpen && eventToDelete && (
        <DeleteRecurringModal onClose={() => setIsDeleteModalOpen(false)} onDeleteOne={deleteOnlyThis} onDeleteFollowing={deleteFollowing} onDeleteAll={deleteEntireSchedule} />
      )}
      <SimpleDeleteModal
        isOpen={isSimpleDeleteModalOpen}
        onClose={() => setIsSimpleDeleteModalOpen(false)}
        onConfirm={deleteEntireSchedule}
        title="일정 삭제"
        message={
          <>
            정말 이 일정을 삭제하시겠습니까?
            <br />
            삭제된 일정은 복구할 수 없습니다.
          </>
        }
      />
    </div>
  );
};

export default CalendarMain;
