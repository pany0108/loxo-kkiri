import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DateSelectArg, DatesSetArg, EventClickArg } from '@fullcalendar/core';
import { DateClickArg } from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/react';
import dayjs from 'dayjs';
import { arrayUnion, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

import { CalendarEvent, CalendarType, useCalendar } from 'contexts';
import { getWeekOfMonth } from 'utils';
import { db } from '../../firebase';

/**
 * 메인 캘린더 화면의 로직을 담당하는 커스텀 훅
 * - 캘린더 뷰 상태 관리, 이벤트 핸들링, 공휴일 가져오기 등을 처리합니다.
 */
export const useCalendarMain = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const calendarRef = useRef<FullCalendar>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);

  const [isCalListOpen, setIsCalListOpen] = useState(false);
  const [currentView, setCurrentView] = useState('dayGridMonth');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isListVisible, setIsListVisible] = useState(false);
  const [animationClass, setAnimationClass] = useState('');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
  const [isJiggleMode, setIsJiggleMode] = useState(false);
  const [jigglingItemId, setJigglingItemId] = useState<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [eventToDelete, setEventToDelete] = useState<CalendarEvent | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSimpleDeleteModalOpen, setIsSimpleDeleteModalOpen] = useState(false);
  const [isInitialAuthChecking, setIsInitialAuthChecking] = useState(() => sessionStorage.getItem('isAuthChecking') === 'true');
  const [holidays, setHolidays] = useState<CalendarEvent[]>([]);
  const [fetchedYears, setFetchedYears] = useState<Set<number>>(new Set());

  const { myCalendars, events, activeCalendar, setActiveCalendar } = useCalendar();

  /** 공휴일 정보 가져오기 */
  const fetchHolidays = useCallback(
    async (year: number) => {
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
          color: 'transparent',
          calendarId: 'holidays',
          attendees: [],
          extendedProps: { isHoliday: true },
        }));

        setHolidays((prev) => [...prev.filter((p) => !holidayEvents.some((h) => h.id === p.id)), ...holidayEvents]);
        setFetchedYears((prev) => new Set(prev).add(year));
      } catch (error) {
        console.error('Error fetching holidays:', error);
      }
    },
    [fetchedYears],
  );

  // 초기 인증 확인 상태 정리
  useEffect(() => {
    if (isInitialAuthChecking) {
      sessionStorage.removeItem('isAuthChecking');
      setIsInitialAuthChecking(false);
    }
  }, [isInitialAuthChecking]);

  // 네비게이션 상태에 따른 캘린더 뷰/날짜 변경 처리
  useEffect(() => {
    const calendarApi = calendarRef.current?.getApi();
    if (!location.state) return;

    const { targetDate, targetView, targetCalendarId } = location.state;
    let stateModified = false;

    if (calendarApi && targetView) {
      calendarApi.changeView(targetView);
      setCurrentView(targetView);
      stateModified = true;
    }
    if (calendarApi && targetDate) {
      calendarApi.gotoDate(targetDate);
      stateModified = true;
    }
    if (targetCalendarId && myCalendars.length > 0) {
      const targetCalendar = myCalendars.find((c: CalendarType) => c.id === targetCalendarId);
      if (targetCalendar) setActiveCalendar(targetCalendar);
      stateModified = true;
    }
    if (stateModified) {
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, myCalendars, setActiveCalendar, navigate]);

  // 현재 활성화된 캘린더에 따른 이벤트 필터링
  const displayedEvents = useMemo(() => {
    if (!activeCalendar || activeCalendar.isDefault) {
      return events;
    }
    return events.filter((event: CalendarEvent) => event.calendarId === activeCalendar.id);
  }, [events, activeCalendar]);

  // 공휴일 포함 및 리스트 뷰를 위한 이벤트 가공
  const allDisplayedEvents = useMemo(() => {
    const baseEvents = [...displayedEvents, ...holidays];

    // Compact 모드(리스트가 보일 때)이고 월간 뷰일 때, 연속 일정을 개별 일자로 분리하여 dot 표시
    if (isListVisible && currentView === 'dayGridMonth') {
      const expandedEvents: any[] = [];

      baseEvents.forEach((event) => {
        const start = dayjs(event.start);
        const end = event.end ? dayjs(event.end) : null;

        // 단일 날짜 일정인지 확인
        const isSingleDay = !end || start.format('YYYY-MM-DD') === end.format('YYYY-MM-DD') || (event.allDay && end.diff(start, 'day') === 1);

        if (isSingleDay) {
          expandedEvents.push(event);
          return;
        }

        // 연속 일정 분할
        let curr = start.clone().startOf('day');
        const loopEnd = end || start.clone().endOf('day');

        while (curr.isBefore(loopEnd)) {
          if (!event.allDay && curr.isSame(loopEnd, 'day') && loopEnd.format('HH:mm') === '00:00') break;
          if (event.allDay && curr.isSame(loopEnd, 'day')) break;

          expandedEvents.push({
            ...event,
            id: `${event.id}_split_${curr.format('YYYYMMDD')}`,
            start: curr.format('YYYY-MM-DD'),
            end: curr.add(1, 'day').format('YYYY-MM-DD'),
            allDay: true,
            extendedProps: {
              ...((event as any).extendedProps || {}),
              originalId: event.id,
              originalStart: event.start,
              originalEnd: event.end,
              originalAllDay: event.allDay,
            },
          });
          curr = curr.add(1, 'day');
        }
      });
      return expandedEvents;
    }

    return baseEvents;
  }, [displayedEvents, holidays, isListVisible, currentView]);

  // 리스트 뷰 토글 시 캘린더 크기 조정 애니메이션
  useEffect(() => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.updateSize();
      // 리스트 열림/닫힘 애니메이션(0.5s) 동안 캘린더 크기를 지속적으로 업데이트하여 부드럽게 전환
      let frameId: number;
      const startTime = performance.now();
      const duration = 500;
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

  /** 흔들림 모드(삭제 모드) 종료 */
  const exitJiggleMode = useCallback(() => {
    setIsJiggleMode(false);
    setJigglingItemId(null);
  }, []);

  // 외부 클릭 감지 (드롭다운, 흔들림 모드, 날짜 선택기 닫기)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCalListOpen(false);
      }
      if (isJiggleMode && listRef.current && !listRef.current.contains(event.target as Node)) {
        exitJiggleMode();
      }
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
  }, [isCalListOpen, isJiggleMode, isDatePickerOpen, exitJiggleMode]);

  // 캘린더 제목 클릭 시 날짜 선택기 토글
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

  /** 이벤트 롱프레스 핸들러 (삭제 모드 진입) */
  const handlePointerDown = (event: CalendarEvent) => {
    if (isJiggleMode) return;
    longPressTimer.current = setTimeout(() => {
      setIsJiggleMode(true);
      setJigglingItemId(event.id!);
    }, 500);
  };

  /** 롱프레스 해제 핸들러 */
  const handlePointerUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  /** 삭제 버튼 클릭 핸들러 */
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

  /** 전체 일정 삭제 */
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

  /** 이 일정만 삭제 (반복 예외 처리) */
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

  /** 이후 일정 모두 삭제 */
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

  /** 다음 달/주/일로 이동 */
  const goToNext = () => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      setAnimationClass('calendar-swipe-left');
      calendarApi.next();
      setTimeout(() => {
        setAnimationClass('');
      }, 350);
    }
  };

  /** 이전 달/주/일로 이동 */
  const goToPrev = () => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      setAnimationClass('calendar-swipe-right');
      calendarApi.prev();
      setTimeout(() => {
        setAnimationClass('');
      }, 350);
    }
  };

  /** 월 선택 핸들러 */
  const handleMonthSelect = (month: number) => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      const newDate = new Date(pickerYear, month, 1);
      calendarApi.gotoDate(newDate);
    }
    setIsDatePickerOpen(false);
  };

  /** 뷰 변경 핸들러 (월간/주간/일간) */
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

  /** 날짜 선택 실행 (리스트 뷰 열기) */
  const executeDateSelection = (dateStr: string) => {
    setSelectedDate(dateStr);
    setIsListVisible(true);
    if (listRef.current) listRef.current.scrollTop = 0;
    setTimeout(() => {
      calendarRef.current?.getApi().updateSize();
    }, 100);
  };

  /** 날짜 클릭 핸들러 */
  const handleDateClick = (arg: DateClickArg) => {
    executeDateSelection(arg.dateStr);
  };

  /** 이벤트 클릭 핸들러 */
  const handleEventClick = (info: EventClickArg) => {
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
          state: { ...clickedEventData, fromView: currentView },
        });
      }
    }
  };

  /** 리스트 아이템 클릭 핸들러 */
  const handleListItemClick = (event: CalendarEvent) => {
    const originalId = event.originalId || event.id;
    navigate(`/schedule/${originalId}`, { state: { ...event, id: originalId } });
  };

  /** 날짜 범위 선택 핸들러 (일정 추가) */
  const handleDateSelect = (selectInfo: DateSelectArg) => {
    const calendarApi = selectInfo.view.calendar;
    calendarApi.unselect();
    navigate('/add-schedule', {
      state: {
        start: selectInfo.startStr,
        end: selectInfo.endStr,
        allDay: selectInfo.allDay,
        calendarId: activeCalendar?.id,
      },
    });
  };

  /** 캘린더 날짜 세트 변경 핸들러 (제목 업데이트 및 공휴일 로드) */
  const handleDatesSet = (arg: DatesSetArg) => {
    const titleEl = document.querySelector('.fc-toolbar-title') as HTMLElement;
    if (titleEl) {
      const customTitle = arg.view.type === 'timeGridWeek' ? getWeekOfMonth(arg.view.currentStart) : arg.view.title;
      titleEl.setAttribute('data-custom-title', customTitle);
    }
    const startYear = arg.view.activeStart.getFullYear();
    const endYear = arg.view.activeEnd.getFullYear();
    fetchHolidays(startYear);
    if (startYear !== endYear) {
      fetchHolidays(endYear);
    }
  };

  const sheetTouchStartY = useRef<number | null>(null);
  const sheetTouchEndY = useRef<number | null>(null);
  const minSheetSwipeDistance = 50;

  // --- 바텀 시트 스와이프 핸들러 ---
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
    if (distance > minSheetSwipeDistance) {
      setIsListVisible(false);
      setSelectedDate(null);
    }
  };

  return {
    refs: { calendarRef, dropdownRef, listRef, datePickerRef },
    state: {
      isCalListOpen,
      currentView,
      selectedDate,
      isListVisible,
      animationClass,
      isDatePickerOpen,
      pickerYear,
      isJiggleMode,
      jigglingItemId,
      eventToDelete,
      isDeleteModalOpen,
      isSimpleDeleteModalOpen,
      isInitialAuthChecking,
      allDisplayedEvents,
    },
    handlers: {
      setIsCalListOpen,
      goToNext,
      goToPrev,
      handleMonthSelect,
      setPickerYear,
      handleViewChange,
      handleDateClick,
      handleEventClick,
      handleListItemClick,
      handleDateSelect,
      handleDatesSet,
      handlePointerDown,
      handlePointerUp,
      exitJiggleMode,
      handleDeleteClick,
      deleteEntireSchedule,
      deleteOnlyThis,
      deleteFollowing,
      setIsListVisible,
      setSelectedDate,
      setIsDeleteModalOpen,
      setIsSimpleDeleteModalOpen,
      onSheetTouchStart,
      onSheetTouchMove,
      onSheetTouchEnd,
    },
  };
};
