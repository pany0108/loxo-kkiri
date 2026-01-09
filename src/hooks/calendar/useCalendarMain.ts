import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import { DateSelectArg, DatesSetArg, EventClickArg } from '@fullcalendar/core';
import { DateClickArg } from '@fullcalendar/interaction';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import { doc, deleteDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../firebase';
import { useCalendar, CalendarEvent, CalendarType } from 'contexts';
import { getWeekOfMonth } from 'utils';

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
  const [isNavigating, setIsNavigating] = useState(false);
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

  useEffect(() => {
    if (isInitialAuthChecking) {
      sessionStorage.removeItem('isAuthChecking');
      setIsInitialAuthChecking(false);
    }
  }, [isInitialAuthChecking]);

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

  const displayedEvents = useMemo(() => {
    if (!activeCalendar || activeCalendar.isDefault) {
      return events;
    }
    return events.filter((event: CalendarEvent) => event.calendarId === activeCalendar.id);
  }, [events, activeCalendar]);

  const allDisplayedEvents = useMemo(() => {
    return [...displayedEvents, ...holidays];
  }, [displayedEvents, holidays]);

  useEffect(() => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.updateSize();
      // [수정] 리스트 열림/닫힘 애니메이션(0.3s) 동안 캘린더 크기를 지속적으로 업데이트하여 부드럽게 전환
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

  const exitJiggleMode = useCallback(() => {
    setIsJiggleMode(false);
    setJigglingItemId(null);
  }, []);

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

  const goToNext = useCallback(() => {
    if (isNavigating) return;
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
  }, [isNavigating]);

  const goToPrev = useCallback(() => {
    if (isNavigating) return;
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
  }, [isNavigating]);

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
      calendarRef.current?.getApi().updateSize();
    }, 100);
  };

  const handleDateClick = (arg: DateClickArg) => {
    executeDateSelection(arg.dateStr);
  };

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

  const handleListItemClick = (event: CalendarEvent) => {
    const originalId = event.originalId || event.id;
    navigate(`/schedule/${originalId}`, { state: { ...event, id: originalId } });
  };

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
