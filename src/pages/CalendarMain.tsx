import React, { useRef, useState, useEffect } from 'react';
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
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isListVisible, setIsListVisible] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);

  /**
   * [Handler] 뷰 전환 (월/주/일)
   * 뷰 변경 시 접힘 상태와 스크롤 위치를 초기화하고 캘린더 크기를 재계산합니다.
   */
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

  /**
   * [Handler] 날짜 클릭 시 이동 (월 뷰 전용)
   */
  const handleDateClick = (arg: { dateStr: string }) => {
    setSelectedDate(arg.dateStr);
    setIsListVisible(true);

    if (listRef.current) listRef.current.scrollTop = 0;

    setTimeout(() => {
      const calendarApi = calendarRef.current?.getApi();
      if (calendarApi) {
        calendarApi.updateSize();
      }
    }, 100);
  };

  /**
   * [Handler] 시간 드래그 시 이동 (주/일 뷰 전용)
   */
  const handleDateSelect = (selectInfo: DateSelectArg) => {
    const calendarApi = selectInfo.view.calendar;
    calendarApi.unselect();
    navigate('/add-schedule', {
      state: { start: selectInfo.startStr, end: selectInfo.endStr, allDay: selectInfo.allDay },
    });
  };

  /**
   * [Handler] 캘린더 타이틀 커스텀
   * 주 뷰일 경우 'n째주' 형식을 적용합니다.
   */
  const handleDatesSet = (arg: DatesSetArg) => {
    const titleEl = document.querySelector('.fc-toolbar-title') as HTMLElement;
    if (titleEl) {
      const customTitle = arg.view.type === 'timeGridWeek' ? getWeekOfMonth(arg.view.currentStart) : arg.view.title;
      titleEl.setAttribute('data-custom-title', customTitle);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      {/* 1. 상단 헤더 영역 */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">내 캘린더</h1>
          <p className="text-[10px] text-blue-500 font-black uppercase tracking-[0.15em] mt-0.5">Family Scheduler</p>
        </div>
        <button className="relative p-2.5 bg-gray-50 text-gray-500 hover:bg-gray-100 rounded-xl transition-all">
          <Bell size={20} />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
      </header>

      {/* 2. 상단 뷰 전환 탭 네비게이션 */}
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
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${currentView === view.id ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}
            >
              {view.label}
            </button>
          ))}
        </div>
      </nav>

      {/* 3. 메인 캘린더 콘텐츠 영역 */}
      <main className="flex-1 flex flex-col bg-gray-50/50 overflow-hidden relative">
        <div
          className={`bg-white flex-shrink-0 flex flex-col overflow-hidden transition-all duration-150 ease-in-out ${
            currentView === 'dayGridMonth' ? (isListVisible ? 'h-[50%]' : 'h-full') : 'h-full'
          }`}
          style={{ paddingBottom: isListVisible ? '65px' : '130px' }}
        >
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            locale="ko"
            height="100%"
            dayMaxEvents={false}
            selectable={currentView !== 'dayGridMonth'}
            selectMirror={true}
            dateClick={handleDateClick}
            select={handleDateSelect}
            unselectAuto={true}
            dragScroll={true}
            longPressDelay={50}
            eventDragMinDistance={5}
            headerToolbar={{
              left: 'title',
              center: '',
              right: 'today,prev,next',
            }}
            buttonText={{ today: '오늘' }}
            datesSet={handleDatesSet}
            views={{
              dayGridMonth: {
                titleFormat: { year: 'numeric', month: 'long' },
                dayHeaderFormat: { weekday: 'short' },
              },
              timeGridWeek: {
                dayHeaderFormat: { weekday: 'short' },
              },
              timeGridDay: {
                titleFormat: { year: 'numeric', month: 'long', day: 'numeric' },
                dayHeaderFormat: { weekday: 'short' },
              },
            }}
            slotMinTime="06:00:00"
            slotMaxTime="24:00:00"
            slotLabelFormat={{ hour: 'numeric', minute: '2-digit', hour12: true, meridiem: 'short' }}
            slotLabelContent={(args: SlotLabelContentArg) => args.text.replace(':00', '') + '시'}
            allDayText="종일"
            dayCellContent={(args) => args.date.getDate()}
            displayEventTime={false}
            dayCellClassNames={(arg) => {
              const dateStr = arg.date.toLocaleDateString('en-CA');
              return dateStr === selectedDate ? 'selected-day' : '';
            }}
            events={[
              { title: '강남역 저녁 약속', start: new Date(), allDay: false, color: '#ff5733' },
              { title: '압구정 저녁 약속', start: new Date(), allDay: false }, // 기본 파랑
              { title: '제주도 가족 여행', start: '2025-12-24', allDay: true, color: '#10b981' }, // 종일 배경색 적용
            ]}
            eventDidMount={(info) => {
              const color = info.event.backgroundColor || info.event.extendedProps.color;
              if (color) {
                info.el.style.setProperty('--event-color', color);
              }
            }}
          />
        </div>
        {/* 4. 오늘의 일정 리스트 (월 뷰 전용) */}
        <div
          ref={listRef}
          className={`absolute left-0 right-0 bg-gray-50 transition-transform duration-150 ease-in-out z-20 overflow-y-auto 
    ${isListVisible && currentView === 'dayGridMonth' ? 'translate-y-0' : 'translate-y-full'}`}
          style={{
            bottom: '65px',
            height: 'calc(50% - 65px)',
            borderTopLeftRadius: '24px',
            borderTopRightRadius: '24px',
            boxShadow: '0 -10px 30px rgba(0,0,0,0.08)',
          }}
        >
          {/* 리스트 헤더 */}
          <div className="flex items-center justify-between px-6 pt-6 pb-3 sticky top-0 bg-gray-50/90 backdrop-blur-sm z-10">
            <h3 className="text-sm font-extrabold text-gray-900">{selectedDate ? `${selectedDate.split('-')[2]}일 일정` : '일정'}</h3>
            <button
              onClick={() => {
                setIsListVisible(false);
                setSelectedDate(null);
              }}
              className="text-[11px] text-gray-400 font-bold"
            >
              닫기
            </button>
          </div>

          {/* 리스트 내용 */}
          <div className="px-6 space-y-3 pb-[100px]">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                onClick={() => navigate(`/schedule/${i}`)}
                className="bg-white p-4 rounded-[24px] border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-center gap-4 active:scale-[0.98] transition-transform cursor-pointer"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-gray-900 font-semibold text-[15px] tracking-tight truncate">맛있는 저녁 식사 {i + 1}</p>
                    <span className="px-1.5 py-0.5 bg-blue-50 text-[9px] font-bold text-blue-500 rounded-md border border-blue-100">가족</span>
                  </div>
                  <p className="text-[11px] font-medium text-slate-400 mt-1.5 flex items-center gap-1">
                    <span className="tabular-nums">오후 7:00</span>
                    <span className="w-0.5 h-0.5 rounded-full bg-gray-300"></span>
                    <span className="truncate">강남역 5번 출구</span>
                  </p>
                </div>
                <Plus size={16} className="text-gray-300 rotate-45 flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* 5. 플로팅 버튼 (선택된 날짜가 있으면 해당 날짜로, 없으면 오늘로) */}
      <button
        onClick={() =>
          navigate('/add-schedule', {
            state: { start: selectedDate || new Date().toISOString().split('T')[0], allDay: true },
          })
        }
        className="fixed right-6 bottom-10 w-14 h-14 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center z-30 active:scale-90 transition-transform"
      >
        <Plus size={28} strokeWidth={2.5} />
      </button>
    </div>
  );
};

export default CalendarMain;
