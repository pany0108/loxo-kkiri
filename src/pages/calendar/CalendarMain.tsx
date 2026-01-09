import React, { useMemo, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2, Trash2 } from 'lucide-react';
import { DayHeaderContentArg, EventContentArg, EventMountArg } from '@fullcalendar/core';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import './CalendarMain.css';
import { useCalendar } from 'contexts';
import { useFirestoreQuery, useCalendarMain } from 'hooks';
import { collection, query, where } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { DeleteRecurringModal, Calendar, ConfirmModal, CalendarHeader, DatePickerPopup, EventListSheet, AddScheduleFAB } from 'components';

dayjs.extend(isSameOrBefore);

const CalendarMain = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const minSwipeDistance = 50;

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

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [listRef, location.pathname]);

  const { myCalendars, activeCalendar, setActiveCalendar } = useCalendar();

  const notificationsQuery = useMemo(() => {
    if (!auth.currentUser) return null;
    return query(collection(db, 'notifications'), where('userId', '==', auth.currentUser.uid), where('isRead', '==', false));
  }, []);

  const { data: unreadNotifications } = useFirestoreQuery(notificationsQuery);
  const hasUnread = useMemo(() => (unreadNotifications ? unreadNotifications.length > 0 : false), [unreadNotifications]);

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
      return <div className="fc-event-title fc-sticky px-1 text-[10px] font-bold text-red-500 dark:text-red-400">{eventInfo.event.title}</div>;
    }

    if (eventInfo.view.type === 'dayGridMonth') {
      if (eventInfo.event.allDay) {
        return <div className="fc-event-title fc-sticky px-1 text-[10px] font-bold">{eventInfo.event.title}</div>;
      }
      return (
        <div className="flex items-center h-full w-full overflow-hidden pl-0.5">
          <div className="w-1.5 h-1.5 rounded-full mr-1 shrink-0" style={{ backgroundColor: eventInfo.backgroundColor || '#3b82f6' }} />
          <div className="text-[10px] font-medium text-gray-400 mr-1 whitespace-nowrap">{eventInfo.timeText}</div>
          <div className="text-[10px] font-bold text-gray-700 truncate">{eventInfo.event.title}</div>
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

      <main className="flex-1 flex flex-col bg-white dark:bg-gray-900 overflow-hidden relative rounded-t-[32px] shadow-[0_-5px_20px_rgba(0,0,0,0.02)]">
        {/* [추가] 연/월 선택 팝업 */}
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
          onTouchStart={handlers.onSheetTouchStart}
          onTouchMove={handlers.onSheetTouchMove}
          onTouchEnd={handlers.onSheetTouchEnd}
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
      {isDeleteModalOpen && (
        <DeleteRecurringModal onClose={() => setIsDeleteModalOpen(false)} onDeleteOne={deleteOnlyThis} onDeleteFollowing={deleteFollowing} onDeleteAll={deleteEntireSchedule} />
      )}
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
