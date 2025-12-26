import React from 'react';
import { useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { FloatingBubble, NavBar } from 'antd-mobile'; // NavBar 추가
import { Plus, Settings2, Users } from 'lucide-react'; // 아이콘 추가
import './CalendarMain.css';

const CalendarMain = () => {
  const navigate = useNavigate();

  const handleDateClick = (arg: any) => {
    // 날짜 클릭 시 동작 (필요 시 구현)
  };

  return (
    <div className="calendar-page-wrapper" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* [기획 반영] 상단 내비게이션 바 */}
      <NavBar
        back={null}
        style={{ background: '#fff', borderBottom: '1px solid #eee' }}
        left={<Settings2 size={24} color="#333" onClick={() => navigate('/profile')} />}
        right={<Users size={24} color="#333" onClick={() => navigate('/calendar-manager')} />}
      >
        우리 가족 모임 {/* 현재 활성화된 캘린더 이름 */}
      </NavBar>

      {/* 캘린더 영역 (나머지 공간 전체 차지) */}
      <div className="calendar-container" style={{ flex: 1, overflow: 'hidden' }}>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek', // 모바일 가독성을 위해 Day 제외 권장
          }}
          locale="ko"
          height="100%" // 부모 div 높이에 맞춤
          selectable={true}
          dateClick={handleDateClick}
          events={[{ title: '내 일정 예시', start: new Date(), color: '#1677ff' }]}
        />
      </div>

      {/* 우측 하단 일정 추가 버튼 */}
      <FloatingBubble
        axis="xy"
        magnetic="x"
        style={{
          '--initial-position-bottom': '24px',
          '--initial-position-right': '24px',
          '--edge-distance': '24px',
          '--z-index': '1000',
        }}
        onClick={() => navigate('/add-schedule')}
      >
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff' }}>
          <Plus size={28} />
        </div>
      </FloatingBubble>
    </div>
  );
};

export default CalendarMain;
