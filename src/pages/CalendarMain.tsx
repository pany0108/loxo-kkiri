import React, { useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

const CalendarMain = () => {
  return (
    <div className="mobile-container">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay',
        }}
        editable={true}
        selectable={true}
        select={(info) => {
          // 일정 추가 팝업 띄우기 로직
          console.log('선택된 기간:', info.start, info.end);
        }}
        events={
          [
            // 등록된 일정 리스트 데이터
          ]
        }
      />
    </div>
  );
};
