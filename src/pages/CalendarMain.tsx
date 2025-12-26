import React from 'react';
import { useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction'; // 클릭 이벤트를 위해 추가
import { Plus, Bell, Calendar as CalendarIcon, Users, Settings } from 'lucide-react';
import './CalendarMain.css';

const CalendarMain = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-screen bg-gray-50/50">
      {/* 1. 상단바: 더 세련된 블러 효과 */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">우리 가족 모임</h1>
          <p className="text-[10px] text-blue-500 font-bold uppercase tracking-widest mt-0.5">Family Scheduler</p>
        </div>
        <button className="relative p-2.5 bg-gray-50 text-gray-500 hover:bg-gray-100 rounded-xl transition-all">
          <Bell size={20} />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
      </header>

      {/* 2. 메인 캘린더 영역 */}
      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-32">
        <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 p-3 mb-6">
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            locale="ko"
            height="auto"
            headerToolbar={{
              left: 'title',
              center: '',
              right: 'prev,next',
            }}
            dayMaxEvents={2} // 모바일에서 이벤트가 너무 많으면 +N개로 표시
            events={[{ title: '🍕 저녁 약속', start: new Date(), className: 'custom-event' }]}
          />
        </div>

        {/* 3. 오늘의 일정 카드: 카드형 디자인 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-base font-bold text-gray-800">오늘의 일정</h3>
            <span className="text-xs text-blue-600 font-medium">전체보기</span>
          </div>

          <div className="group bg-white p-4 rounded-[20px] border border-gray-100 shadow-sm flex items-center gap-4 active:scale-[0.98] transition-all">
            <div className="flex flex-col items-center justify-center w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl">
              <span className="text-xs font-bold leading-none">26</span>
              <span className="text-[10px] font-medium uppercase">Dec</span>
            </div>
            <div className="flex-1">
              <p className="text-gray-900 font-bold text-sm text-ellipsis overflow-hidden">맛있는 저녁 식사</p>
              <div className="flex items-center gap-1.5 mt-1 text-gray-400">
                <span className="text-[11px]">오후 7:00 • 강남역 5번 출구</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 4. 플로팅 액션 버튼 (FAB) */}
      <button
        onClick={() => navigate('/add-schedule')}
        className="fixed right-6 bottom-24 w-15 h-15 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-200 flex items-center justify-center hover:bg-blue-700 active:scale-90 transition-all z-40"
      >
        <Plus size={28} strokeWidth={2.5} />
      </button>

      {/* 5. 하단 탭바 (라이브러리 없이 직접 구현) */}
      <footer className="fixed bottom-0 w-full bg-white/90 backdrop-blur-lg border-t border-gray-100 px-8 py-3 pb-8 flex justify-between items-center z-50">
        <button className="flex flex-col items-center gap-1 text-blue-600">
          <CalendarIcon size={22} />
          <span className="text-[10px] font-bold">캘린더</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600" onClick={() => navigate('/propose')}>
          <Users size={22} />
          <span className="text-[10px] font-medium">약속제안</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600">
          <Settings size={22} />
          <span className="text-[10px] font-medium">설정</span>
        </button>
      </footer>
    </div>
  );
};

export default CalendarMain;
