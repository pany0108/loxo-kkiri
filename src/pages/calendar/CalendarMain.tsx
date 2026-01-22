import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DayHeaderContentArg, EventContentArg, EventMountArg } from '@fullcalendar/core';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { collection, query, where } from 'firebase/firestore';
import { Briefcase, Coffee, Dumbbell, Gamepad2, Gift, GraduationCap, Heart, Home, Loader2, Music, Plane, ShoppingCart, Star, Trash2 } from 'lucide-react';

import { auth, db } from '../../firebase';
import { AddScheduleFAB, Calendar, CalendarHeader, ConfirmModal, DatePickerPopup, DeleteRecurringModal, EventListSheet } from 'components';
import { useCalendar } from 'contexts';
import { useCalendarMain, useDoubleBackExit, useFirestoreQuery } from 'hooks';
import './CalendarMain.css';

dayjs.extend(isSameOrBefore);

const ICON_MAP: Record<string, React.ElementType> = {
  home: Home,
  work: Briefcase,
  study: GraduationCap,
  workout: Dumbbell,
  travel: Plane,
  music: Music,
  love: Heart,
  star: Star,
  gift: Gift,
  food: Coffee,
  shopping: ShoppingCart,
  game: Gamepad2,
};

/**
 * 캘린더 메인 페이지 컴포넌트
 * - 월/주/일 뷰 캘린더 표시
 * - 일정 목록 바텀 시트 관리
 * - 날짜 이동 및 일정 추가/삭제/수정 진입점
 *
 * @returns {JSX.Element} 캘린더 메인 화면
 */
const CalendarMain = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { myCalendars, activeCalendar, setActiveCalendar } = useCalendar(); // Context

  // --- Refs & State ---
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const minSwipeDistance = 50;
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');
  const sheetTouchStartX = useRef<number | null>(null);
  const sheetTouchStartY = useRef<number | null>(null);
  const sheetTouchEndX = useRef<number | null>(null);
  const sheetTouchEndY = useRef<number | null>(null);

  // --- Custom Hook for Calendar Logic ---
  const { refs, state, handlers } = useCalendarMain();
  const { calendarRef, dropdownRef, listRef, datePickerRef } = refs;
  const {
    isCalListOpen,
    currentView,
    selectedDate,
    isListVisible,
    animationClass,
    isDatePickerOpen,
    pickerYear,
    isJiggleMode,
    jigglingItemId,
    isDeleteModalOpen,
    isSimpleDeleteModalOpen,
    isInitialAuthChecking,
    allDisplayedEvents,
  } = state;
  const {
    setIsCalListOpen,
    goToNext,
    goToPrev,
    handleMonthSelect,
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
    setIsDeleteModalOpen,
    setIsSimpleDeleteModalOpen,
  } = handlers;

  // --- Effects ---
  // 페이지 진입 시 스크롤 초기화
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [listRef, location.pathname]);

  // 읽지 않은 알림 확인 쿼리
  const notificationsQuery = useMemo(() => {
    if (!auth.currentUser) return null;
    return query(collection(db, 'notifications'), where('userId', '==', auth.currentUser.uid), where('isRead', '==', false));
  }, []);

  const { data: unreadNotifications } = useFirestoreQuery(notificationsQuery);
  const hasUnread = useMemo(() => (unreadNotifications ? unreadNotifications.length > 0 : false), [unreadNotifications]);

  /**
   * 안드로이드 하드웨어 뒤로가기 버튼 처리
   * - 메인 탭 진입점에서는 뒤로가기 2회 시 앱이 종료되도록 설정합니다.
   */
  useDoubleBackExit();

  // --- Handlers ---

  /** 캘린더 영역 터치 시작 핸들러 */
  const onCalendarTouchStart = (e: React.TouchEvent) => {
    touchEndX.current = null;
    touchStartX.current = e.targetTouches[0].clientX;
  };

  /** 캘린더 영역 터치 이동 핸들러 */
  const onCalendarTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  /** 캘린더 영역 터치 종료 핸들러 (스와이프 감지) */
  const onCalendarTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) goToNext();
    if (isRightSwipe) goToPrev();
  };

  /** 이전 날짜로 이동 (일간 뷰) */
  const handlePrevDate = () => {
    if (!selectedDate) return;
    setSlideDirection('left');
    const prevDate = dayjs(selectedDate).subtract(1, 'day');
    handlers.setSelectedDate(prevDate.format('YYYY-MM-DD'));

    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.gotoDate(prevDate.toDate());
    }
  };

  /** 다음 날짜로 이동 (일간 뷰) */
  const handleNextDate = () => {
    if (!selectedDate) return;
    setSlideDirection('right');
    const nextDate = dayjs(selectedDate).add(1, 'day');
    handlers.setSelectedDate(nextDate.format('YYYY-MM-DD'));

    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.gotoDate(nextDate.toDate());
    }
  };

  /** 바텀 시트 터치 시작 핸들러 */
  const onSheetTouchStart = (e: React.TouchEvent) => {
    sheetTouchStartX.current = e.targetTouches[0].clientX;
    sheetTouchStartY.current = e.targetTouches[0].clientY;
    handlers.onSheetTouchStart(e);
  };

  /** 바텀 시트 터치 이동 핸들러 */
  const onSheetTouchMove = (e: React.TouchEvent) => {
    sheetTouchEndX.current = e.targetTouches[0].clientX;
    sheetTouchEndY.current = e.targetTouches[0].clientY;
    handlers.onSheetTouchMove(e);
  };

  /** 바텀 시트 터치 종료 핸들러 (스와이프 감지) */
  const onSheetTouchEnd = (e: React.TouchEvent) => {
    if (sheetTouchStartX.current !== null && sheetTouchEndX.current !== null && sheetTouchStartY.current !== null && sheetTouchEndY.current !== null) {
      const xDiff = sheetTouchStartX.current - sheetTouchEndX.current;
      const yDiff = sheetTouchStartY.current - sheetTouchEndY.current;

      if (Math.abs(xDiff) > Math.abs(yDiff) && Math.abs(xDiff) > minSwipeDistance) {
        if (xDiff > 0) {
          handleNextDate();
        } else {
          handlePrevDate();
        }
      }
    }

    sheetTouchStartX.current = null;
    sheetTouchStartY.current = null;
    sheetTouchEndX.current = null;
    sheetTouchEndY.current = null;

    handlers.onSheetTouchEnd();
  };

  /** 주/일 뷰 헤더 커스텀 렌더링 */
  const renderTimeGridHeader = (args: DayHeaderContentArg) => {
    const date = args.date.getDate();
    const dayName = new Intl.DateTimeFormat('ko-KR', { weekday: 'short' }).format(args.date);
    const dayOfWeek = args.date.getDay();

    const dateStr = dayjs(args.date).format('YYYY-MM-DD');
    const isHoliday = allDisplayedEvents.some((e) => e.calendarId === 'holidays' && dayjs(e.start).format('YYYY-MM-DD') === dateStr);

    let dateColor = 'text-[#191F28] dark:text-gray-200';
    let dayNameColor = 'text-[#8B95A1] dark:text-gray-500';
    if (dayOfWeek === 0 || isHoliday) {
      dateColor = 'text-red-500';
      dayNameColor = 'text-red-400';
    } else if (dayOfWeek === 6) {
      dateColor = 'text-primary';
      dayNameColor = 'text-primary/80';
    }
    return (
      <div className="flex flex-col items-center justify-center gap-0.5 pb-2">
        <span className={`text-[14px] font-black leading-none ${dateColor}`}>{date}</span>
        <span className={`text-[10px] font-bold leading-none ${dayNameColor}`}>{dayName}</span>
      </div>
    );
  };

  /** 이벤트 콘텐츠 커스텀 렌더링 */
  const renderEventContent = (eventInfo: EventContentArg) => {
    const isHoliday = eventInfo.event.extendedProps.calendarId === 'holidays';
    const calendarId = eventInfo.event.extendedProps.calendarId;
    const eventCalendar = myCalendars.find((c) => c.id === calendarId);

    let IconComponent = null;
    if (activeCalendar?.isDefault && eventCalendar && !eventCalendar.isDefault && eventCalendar.icon) {
      IconComponent = ICON_MAP[eventCalendar.icon];
    }

    if (isHoliday) {
      return <div className="fc-event-title fc-sticky px-1 text-[9px] font-bold text-red-500 dark:text-red-400">{eventInfo.event.title}</div>;
    }

    if (eventInfo.view.type === 'dayGridMonth') {
      if (eventInfo.event.allDay) {
        return (
          <div className="px-1 overflow-hidden flex items-center justify-center">
            {IconComponent && <IconComponent size={10} className="mr-1 shrink-0" />}
            <div className="text-[10px] truncate">{eventInfo.event.title}</div>
          </div>
        );
      }
      return (
        <div
          className="flex items-center h-full w-full overflow-hidden"
          style={{ backgroundColor: `color-mix(in srgb, ${eventInfo.backgroundColor || 'var(--color-primary)'}, transparent 90%)` }}
        >
          <div className="w-0.5 h-3.5 mr-0.5 shrink-0" style={{ backgroundColor: eventInfo.backgroundColor || 'var(--color-primary)' }} />
          {IconComponent && <IconComponent size={10} className="mr-1 text-sub dark:text-gray-400 shrink-0" />}
          <div className="text-[10px] font-bold text-main dark:text-gray-200 truncate">{eventInfo.event.title}</div>
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
      <div className={`px-1 overflow-hidden flex items-center justify-center ${isWeekView ? 'p-0.5' : 'p-1'}`}>
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
        {IconComponent && <IconComponent size={10} className="text-white/90 mr-0.5" />}
        {eventInfo.event.title && <div className={`font-bold text-white leading-tight truncate ${isWeekView ? 'text-[10px]' : 'text-[12px] px-0.5'}`}>{eventInfo.event.title}</div>}
      </div>
    );
  };

  if (isInitialAuthChecking) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-white dark:bg-gray-950">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-950 font-['Pretendard'] overflow-hidden relative pt-[env(safe-area-inset-top)]">
      <CalendarHeader
        activeCalendar={activeCalendar}
        myCalendars={myCalendars}
        isCalListOpen={isCalListOpen}
        onCalListToggle={() => handlers.setIsCalListOpen(!isCalListOpen)}
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

      {/* 캘린더 영역 */}
      <main className="flex-1 flex flex-col bg-white dark:bg-gray-900 overflow-hidden relative rounded-t-[32px] shadow-[0_-5px_20px_rgba(0,0,0,0.02)]">
        <DatePickerPopup
          isOpen={isDatePickerOpen}
          datePickerRef={datePickerRef}
          pickerYear={pickerYear}
          onYearChange={handlers.setPickerYear}
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
            paddingBottom: isListVisible ? '0' : '54px',
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
              if (!info.event.allDay && info.view.type === 'dayGridMonth') {
                info.el.style.backgroundColor = 'transparent';
                info.el.style.borderColor = 'transparent';
              }
            }}
            ref={calendarRef}
          />
        </div>

        {/* 일정 목록 바텀 시트 */}
        <EventListSheet
          isVisible={isListVisible && currentView === 'dayGridMonth'}
          onClose={() => {
            handlers.setIsListVisible(false);
            handlers.setSelectedDate(null);
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
          slideDirection={slideDirection}
          activeCalendar={activeCalendar}
          myCalendars={myCalendars}
        />
      </main>

      {/* 일정 추가 FAB (월간 뷰에서 목록이 보일 때만 표시) */}
      {isListVisible && currentView === 'dayGridMonth' && (
        <AddScheduleFAB
          onClick={() => {
            const targetDate = selectedDate || new Date().toISOString().split('T')[0];
            navigate('/add-schedule', { state: { start: targetDate, end: targetDate, allDay: true, calendarId: activeCalendar?.id } });
          }}
        />
      )}

      {/* 반복 일정 삭제 옵션 모달 */}
      {isDeleteModalOpen && (
        <DeleteRecurringModal onClose={() => setIsDeleteModalOpen(false)} onDeleteOne={deleteOnlyThis} onDeleteFollowing={deleteFollowing} onDeleteAll={deleteEntireSchedule} />
      )}

      {/* 일반 일정 삭제 확인 모달 */}
      <ConfirmModal
        isOpen={isSimpleDeleteModalOpen}
        onClose={() => setIsSimpleDeleteModalOpen(false)}
        onConfirm={deleteEntireSchedule}
        icon={<Trash2 size={32} />}
        iconContainerClassName="bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400"
        title="일정 삭제"
        message={
          <>
            정말 이 일정을 삭제하시겠습니까?
            <br />
            삭제된 일정은 복구할 수 없습니다.
          </>
        }
        confirmText="삭제하기"
        confirmButtonClassName="bg-red-500"
      />
    </div>
  );
};

export default CalendarMain;
