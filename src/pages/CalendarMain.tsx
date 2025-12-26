import React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { FloatingBubble, Toast } from 'antd-mobile';
import { Plus } from 'lucide-react'; // 아이콘 추가
import './CalendarMain.css'; // 아래에서 스타일 파일을 만들 거예요

const CalendarMain = () => {
  // 날짜 클릭 시 (일정 추가 시나리오)
  const handleDateClick = (arg: any) => {
    Toast.show(`선택한 날짜: ${arg.dateStr}\n여기에 일정 등록 팝업을 띄울 거예요!`);
  };

  return (
    <div className="calendar-container">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth" // 초기값: 월 보기
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay', // 월, 주, 일 버튼
        }}
        locale="ko" // 한국어 설정
        height="100vh"
        selectable={true}
        dateClick={handleDateClick}
        events={[{ title: '내 캘린더 예시 일정', start: new Date(), color: '#1677ff' }]}
      />

      {/* 우측 하단 일정 추가 플로팅 버튼 */}
      <FloatingBubble
        axis="xy"
        magnetic="x"
        style={{
          '--initial-position-bottom': '24px',
          '--initial-position-right': '24px',
          '--edge-distance': '24px',
        }}
        onClick={() => Toast.show('일정 등록 화면으로 이동합니다.')}
      >
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff' }}>
          <Plus size={28} />
        </div>
      </FloatingBubble>
    </div>
  );
};

export default CalendarMain;
