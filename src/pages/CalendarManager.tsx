import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, ChevronLeft, Settings2, Trash2, CheckCircle2 } from 'lucide-react';

const CalendarManager = () => {
  const navigate = useNavigate();

  const [calendars, setCalendars] = useState([
    { id: '1', name: '가족 공유 캘린더', members: ['나', '엄마', '아빠'], isDefault: true },
    { id: '2', name: '신년회 모임', members: ['나', '김철수', '이영희', '박지성'], isDefault: false },
    { id: '3', name: '데브 프로젝트', members: ['나', '팀장님', '에디'], isDefault: false },
  ]);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // 카드 클릭 이벤트 전파 방지
    if (window.confirm('캘린더를 삭제하시겠습니까?')) {
      setCalendars(calendars.filter((cal) => cal.id !== id));
      alert('캘린더가 삭제되었습니다.');
    }
  };

  const handleSwitch = (name: string) => {
    alert(`${name}로 전환되었습니다.`);
    navigate('/calendar');
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-10">
      {/* 1. 상단 네비게이션 */}
      <nav className="bg-white px-4 py-4 flex items-center justify-between border-b sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft size={24} className="text-gray-700" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">캘린더 관리</h1>
        </div>
        <button onClick={() => navigate('/create-calendar')} className="p-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors">
          <Plus size={20} />
        </button>
      </nav>

      <div className="p-4 space-y-6">
        {/* 2. 도움말 안내 */}
        <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100">
          <p className="text-xs text-blue-700 leading-relaxed">
            • 카드를 클릭하면 해당 캘린더로 전환됩니다.
            <br />• 공유 캘린더는 본인이 등록한 일정만 수정 가능합니다.
          </p>
        </div>

        {/* 3. 캘린더 목록 */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-400 ml-1">참여 중인 캘린더</h3>

          {calendars.map((cal) => (
            <div
              key={cal.id}
              onClick={() => handleSwitch(cal.name)}
              className="group relative bg-white rounded-2xl p-4 shadow-sm border border-transparent hover:border-blue-200 active:scale-[0.98] transition-all cursor-pointer overflow-hidden"
            >
              <div className="flex items-start justify-between">
                <div className="flex gap-4">
                  <div className={`p-3 rounded-xl ${cal.isDefault ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                    <Users size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-gray-900">{cal.name}</h4>
                      {cal.isDefault && (
                        <span className="flex items-center gap-0.5 text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-bold">
                          <CheckCircle2 size={10} /> 기본
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">멤버: {cal.members.join(', ')}</p>
                  </div>
                </div>

                {/* 우측 관리 버튼 영역 (호버 시 또는 모바일 액션) */}
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/edit-calendar/${cal.id}`);
                    }}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Settings2 size={18} />
                  </button>
                  <button onClick={(e) => handleDelete(cal.id, e)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 4. 추가 버튼 */}
        <button
          onClick={() => navigate('/create-calendar')}
          className="w-full py-4 bg-white border-2 border-dashed border-gray-200 rounded-2xl text-gray-500 font-medium flex items-center justify-center gap-2 hover:bg-gray-50 hover:border-blue-300 hover:text-blue-600 transition-all"
        >
          <Plus size={20} />
          <span>새 공유 캘린더 만들기</span>
        </button>
      </div>
    </div>
  );
};

export default CalendarManager;
