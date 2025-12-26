import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Plus, Bell } from 'lucide-react';
import { SlotLabelContentArg, DateSelectArg, DatesSetArg } from '@fullcalendar/core';
import './CalendarMain.css';

/**
 * [Utility] 주차 계산 함수
 * 해당 날짜가 해당 월의 몇 번째 주인지 계산합니다.
 */
const getWeekOfMonth = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const firstDayOfMonth = new Date(year, date.getMonth(), 1);
  const firstWeekday = firstDayOfMonth.getDay();
  const weekNumber = Math.ceil((date.getDate() + firstWeekday) / 7);
  return `${year}년 ${month}월 ${weekNumber}째주`;
};

const CalendarMain = () => {
  const navigate = useNavigate();
  const calendarRef = useRef<FullCalendar>(null);
  const [currentView, setCurrentView] = useState('dayGridMonth');

  // [Handler] 뷰 전환 제어 (월/주/일)
  const handleViewChange = (view: string) => {
    setCurrentView(view);
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.changeView(view);
    }
  };

  // [Handler] 날짜 선택 시 일정 추가 (드래그/클릭)
  const handleDateSelect = (selectInfo: DateSelectArg) => {
    const title = prompt('새로운 일정을 입력하세요:');
    const calendarApi = selectInfo.view.calendar;
    calendarApi.unselect();

    if (title) {
      calendarApi.addEvent({
        title,
        start: selectInfo.startStr,
        end: selectInfo.endStr,
        allDay: selectInfo.allDay,
      });
    }
  };

  // [Handler] 캘린더 날짜/뷰 변경 시 호출 (타이틀 커스텀)
  const handleDatesSet = (arg: DatesSetArg) => {
    const titleEl = document.querySelector('.fc-toolbar-title') as HTMLElement;
    if (titleEl) {
      const customTitle = arg.view.type === 'timeGridWeek' ? getWeekOfMonth(arg.view.currentStart) : arg.view.title;

      // CSS에서 attr(data-custom-title)로 읽을 수 있도록 속성 설정
      titleEl.setAttribute('data-custom-title', customTitle);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* 1. 상단 헤더 섹션 */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">내 캘린더</h1>
          <p className="text-[10px] text-blue-500 font-bold uppercase tracking-widest mt-0.5">Family Scheduler</p>
        </div>
        <button className="relative p-2.5 bg-gray-50 text-gray-500 hover:bg-gray-100 rounded-xl transition-all">
          <Bell size={20} />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
      </header>

      {/* 2. 뷰 전환 탭 (월/주/일) */}
      <nav className="px-4 py-2">
        <div className="flex p-1 bg-gray-100/80 rounded-2xl">
          {[
            { id: 'dayGridMonth', label: '월' },
            { id: 'timeGridWeek', label: '주' },
            { id: 'timeGridDay', label: '일' },
          ].map((view) => (
            <button
              key={view.id}
              onClick={() => handleViewChange(view.id)}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                currentView === view.id ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-500'
              }`}
            >
              {view.label}
            </button>
          ))}
        </div>
      </nav>

      {/* 3. 메인 콘텐츠 영역 (캘린더 + 일정 카드) */}
      <main className="flex-1 flex flex-col overflow-y-auto bg-gray-50/50">
        {/* 캘린더 카드 섹션 */}
        <div className="bg-white px-4 pb-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] mb-4 rounded-b-[32px]">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            locale="ko"
            height="auto"
            selectable={true}
            selectMirror={true}
            select={handleDateSelect}
            datesSet={handleDatesSet}
            // 헤더 및 툴바 설정
            headerToolbar={{
              left: 'title',
              center: '',
              right: 'today,prev,next',
            }}
            buttonText={{ today: '오늘' }}
            // 뷰별 상세 설정
            views={{
              dayGridMonth: {
                titleFormat: { year: 'numeric', month: 'long' },
                dayHeaderFormat: { weekday: 'short' },
              },
              timeGridWeek: {
                titleFormat: { year: 'numeric', month: 'long' },
                dayHeaderContent: (arg) => `${arg.date.getMonth() + 1}.${arg.date.getDate()}`,
              },
              timeGridDay: {
                titleFormat: { year: 'numeric', month: 'long', day: 'numeric' },
              },
            }}
            // 시간축 설정 (주/일 뷰)
            slotMinTime="06:00:00"
            slotMaxTime="24:00:00"
            slotLabelFormat={{
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
              meridiem: 'short',
            }}
            slotLabelContent={(args: SlotLabelContentArg) => {
              const hourText = args.text.replace(':00', '');
              return hourText + '시';
            }}
            // 기타 UI 설정
            allDaySlot={true}
            allDayText="종일"
            displayEventTime={false}
            dayMaxEventRows={3}
            dayCellContent={(args) => args.date.getDate()}
            // 샘플 데이터
            events={[
              { title: '강남역 저녁 약속', start: new Date(), allDay: false },
              { title: '제주도 가족 여행', start: '2025-12-24', allDay: true },
            ]}
          />
        </div>

        {/* 4. 오늘의 일정 섹션 (월 뷰 전용) */}
        {currentView === 'dayGridMonth' && (
          <div className="px-6 py-4 space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-extrabold text-gray-900">오늘의 일정</h3>
              <span className="text-[11px] text-blue-600 font-bold cursor-pointer bg-blue-50 px-2 py-1 rounded-lg">전체보기</span>
            </div>

            {/* 샘플 일정 카드 */}
            <div className="group bg-white p-4 rounded-[24px] border border-gray-100/80 shadow-sm flex items-center gap-4 active:scale-[0.98] transition-all">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-gray-900 font-bold text-sm truncate">맛있는 저녁 식사</p>
                  <span className="px-1.5 py-0.5 bg-blue-100 text-[9px] font-bold text-blue-600 rounded-md">가족</span>
                </div>
                <p className="text-[11px] font-medium text-gray-400 mt-1">오후 7:00 • 강남역 5번 출구</p>
              </div>
              <Plus size={16} className="text-gray-300 rotate-45" />
            </div>
          </div>
        )}
      </main>

      {/* 5. 플로팅 추가 버튼 (FAB) */}
      <button
        onClick={() => navigate('/add-schedule')}
        className="fixed right-6 bottom-24 w-14 h-14 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-200 flex items-center justify-center hover:bg-blue-700 active:scale-95 transition-all z-40"
      >
        <Plus size={26} strokeWidth={3} />
      </button>
    </div>
  );
};

export default CalendarMain;
