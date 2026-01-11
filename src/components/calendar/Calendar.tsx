import React, { forwardRef, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin, { DateClickArg } from '@fullcalendar/interaction';
import { DateSelectArg, DatesSetArg, DayHeaderContentArg, EventContentArg, EventClickArg, DayCellContentArg, EventMountArg } from '@fullcalendar/core';
import { CalendarEvent } from 'contexts';
import dayjs from 'dayjs';

interface CalendarProps {
  currentView: string;
  events: CalendarEvent[];
  selectedDate: string | null;
  dateClick: (arg: DateClickArg) => void;
  eventClick: (info: EventClickArg) => void;
  handleDateSelect: (selectInfo: DateSelectArg) => void;
  handleDatesSet: (arg: DatesSetArg) => void;
  renderEventContent: (eventInfo: EventContentArg) => JSX.Element;
  renderTimeGridHeader: (args: DayHeaderContentArg) => JSX.Element;
  goToPrev: () => void;
  goToNext: () => void;
  eventDidMount: (info: EventMountArg) => void;
}

const Calendar = forwardRef<FullCalendar, CalendarProps>(
  (
    { currentView, events, selectedDate, dateClick, eventClick, handleDateSelect, handleDatesSet, renderEventContent, renderTimeGridHeader, goToPrev, goToNext, eventDidMount },
    ref,
  ) => {
    const customButtons = useMemo(
      () => ({
        myPrev: {
          icon: 'chevron-left',
          click: goToPrev,
        },
        myToday: {
          text: '오늘',
          click: () => {
            if (ref && typeof ref !== 'function' && ref.current) {
              ref.current.getApi().today();
            }
          },
        },
        myNext: {
          icon: 'chevron-right',
          click: goToNext,
        },
      }),
      [goToPrev, goToNext, ref],
    );

    const views = useMemo(
      () => ({
        dayGridMonth: {
          titleFormat: { year: 'numeric', month: 'short' } as const,
          dayHeaderFormat: { weekday: 'short' } as const,
          dayCellContent: (args: DayCellContentArg) => args.date.getDate(),
        },
        timeGridWeek: {
          dayHeaderContent: renderTimeGridHeader,
        },
        timeGridDay: {
          titleFormat: { year: 'numeric', month: 'long', day: 'numeric' } as const,
          dayHeaderContent: renderTimeGridHeader,
        },
      }),
      [renderTimeGridHeader],
    );

    return (
      <FullCalendar
        ref={ref}
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
        dateClick={dateClick}
        eventClick={eventClick}
        eventClassNames="cursor-pointer"
        eventContent={renderEventContent}
        select={handleDateSelect}
        unselectAuto={true}
        dragScroll={true}
        longPressDelay={500}
        eventDragMinDistance={5}
        headerToolbar={{
          left: 'title',
          center: '',
          right: 'myToday,myPrev,myNext',
        }}
        customButtons={customButtons}
        datesSet={handleDatesSet}
        views={views}
        slotMinTime="00:00:00"
        slotMaxTime="24:00:00"
        slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
        allDayText="종일"
        displayEventTime={false}
        dayCellClassNames={(arg: DayCellContentArg) => {
          const dateStr = dayjs(arg.date).format('YYYY-MM-DD');
          let classes = dateStr === selectedDate ? 'selected-day' : '';

          const isHoliday = events.some((e) => e.calendarId === 'holidays' && dayjs(e.start).format('YYYY-MM-DD') === dateStr);

          if (isHoliday) {
            classes += ' holiday-day';
          }
          return classes;
        }}
        events={events}
        eventDidMount={eventDidMount}
      />
    );
  },
);

Calendar.displayName = 'Calendar';
export default Calendar;
