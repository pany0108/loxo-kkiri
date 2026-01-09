import React, { forwardRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin, { DateClickArg } from '@fullcalendar/interaction';
import { DateSelectArg, DatesSetArg, DayHeaderContentArg, EventContentArg, EventClickArg, DayCellContentArg, EventMountArg } from '@fullcalendar/core';
import { CalendarEvent } from 'contexts';

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
        customButtons={{
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
        }}
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
        slotMinTime="00:00:00"
        slotMaxTime="24:00:00"
        slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
        allDayText="종일"
        displayEventTime={false}
        dayCellClassNames={(arg: DayCellContentArg) => {
          const dateStr = arg.date.toLocaleDateString('en-CA');
          return dateStr === selectedDate ? 'selected-day' : '';
        }}
        events={events}
        eventDidMount={eventDidMount}
      />
    );
  },
);

Calendar.displayName = 'Calendar';
export default Calendar;
