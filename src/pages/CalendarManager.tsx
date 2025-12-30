import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, ChevronLeft, Settings, Trash2, CheckCircle2, Calendar as CalendarIcon } from 'lucide-react';

/**
 * 캘린더 개별 데이터 구조 정의
 */
interface CalendarData {
  id: string;
  name: string;
  members: string[];
  isDefault: boolean;
  color: string;
}

/**
 * 참여 중인 캘린더 목록을 관리하고 수정/삭제 및 전환 기능을 제공하는 컴포넌트입니다.
 * * @returns {JSX.Element} 캘린더 관리 화면
 */
const CalendarManager = () => {
  const navigate = useNavigate();

  /**
   * 캘린더 목록 상태 (실제 서비스 시 서버 API 연동 필요)
   */
  const [calendars, setCalendars] = useState<CalendarData[]>([
    { id: '1', name: '가족 공유 캘린더', members: ['나', '엄마', '아빠'], isDefault: true, color: 'bg-blue-500' },
    { id: '2', name: '신년회 모임', members: ['나', '김철수', '이영희', '박지성'], isDefault: false, color: 'bg-emerald-500' },
    { id: '3', name: '데브 프로젝트', members: ['나', '팀장님', '에디'], isDefault: false, color: 'bg-purple-500' },
  ]);

  /**
   * 참여 멤버 이름을 요약된 문자열로 포맷팅합니다.
   * * @param {string[]} members - 멤버 이름 배열
   * @returns {string} 포맷팅된 멤버 리스트 문자열
   */
  const formatMembers = (members: string[]): string => {
    const displayCount = 3;
    if (members.length <= displayCount) {
      return members.join(', ');
    }
    return `${members.slice(0, displayCount).join(', ')} 외 ${members.length - displayCount}명`;
  };

  /**
   * 특정 캘린더를 삭제합니다. (기본 캘린더는 삭제 불가)
   * * @param {string} id - 삭제할 캘린더 ID
   * @param {React.MouseEvent} e - 클릭 이벤트
   */
  const handleDelete = (id: string, e: React.MouseEvent): void => {
    e.stopPropagation();
    if (window.confirm('정말 이 캘린더를 삭제하시겠습니까?\n포함된 모든 일정이 삭제됩니다.')) {
      setCalendars(calendars.filter((cal) => cal.id !== id));
    }
  };

  /**
   * 선택한 캘린더의 수정 페이지로 이동합니다.
   * * @param {string} id - 수정할 캘린더 ID
   * @param {React.MouseEvent} e - 클릭 이벤트
   */
  const handleEdit = (id: string, e: React.MouseEvent): void => {
    e.stopPropagation();
    navigate(`/edit-calendar/${id}`);
  };

  /**
   * 현재 활성 캘린더를 변경하고 메인 캘린더 화면으로 이동합니다.
   * * @param {string} name - 전환할 캘린더 이름
   */
  const handleSwitch = (name: string): void => {
    // TODO: 전역 상태 관리 로직(Context 또는 Redux) 연동 필요
    navigate('/calendar');
  };

  return (
    <div className="flex flex-col min-h-screen bg-white font-['Pretendard']">
      {/* 상단 네비게이션 바 */}
      <nav className="px-6 pt-6 flex items-center sticky top-0 bg-white/80 backdrop-blur-md z-10">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-400 hover:text-gray-900 transition-colors active:scale-90" aria-label="뒤로 가기">
          <ChevronLeft size={28} />
        </button>
      </nav>

      <div className="flex-1 px-6 pt-4 pb-24 overflow-y-auto w-full">
        {/* 헤더 섹션 */}
        <header className="mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-50 rounded-xl mb-6">
            <CalendarIcon className="text-blue-600 w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 leading-[1.3] tracking-tight">
            나의 <span className="text-blue-600">캘린더</span>를 <br />
            관리해보세요
          </h2>
        </header>

        {/* 캘린더 목록 섹션 */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[15px] font-black text-gray-900 flex items-center gap-2">
              <Users size={18} className="text-gray-400" /> 참여 중인 캘린더
            </h3>
            <span className="text-[11px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">{calendars.length}개</span>
          </div>

          <div className="space-y-3">
            {calendars.map((cal) => (
              <div
                key={cal.id}
                onClick={() => handleSwitch(cal.name)}
                className="group relative w-full bg-white p-5 rounded-[24px] border-2 border-gray-50 flex items-start justify-between active:scale-[0.98] transition-all hover:border-blue-100 hover:shadow-lg hover:shadow-blue-50/20 cursor-pointer"
              >
                <div className="flex gap-4">
                  {/* 상태 아이콘 표시 */}
                  <div className={`w-12 h-12 rounded-[18px] flex items-center justify-center shadow-sm ${cal.isDefault ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-400'}`}>
                    {cal.isDefault ? <CheckCircle2 size={20} /> : <CalendarIcon size={20} />}
                  </div>

                  <div className="flex flex-col pt-0.5 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-[16px] font-black text-gray-900 leading-none truncate">{cal.name}</h4>
                      {cal.isDefault && <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md shrink-0">기본</span>}
                    </div>
                    <p className="text-[13px] font-medium text-gray-400 flex items-center gap-1 min-w-0">
                      <span className="whitespace-nowrap shrink-0">멤버 {cal.members.length}명</span>
                      <span className="w-0.5 h-0.5 bg-gray-300 rounded-full mx-0.5 shrink-0" />
                      <span className="truncate">{formatMembers(cal.members)}</span>
                    </p>
                  </div>
                </div>

                {/* 제어 버튼 영역 */}
                <div className="flex gap-1">
                  <button onClick={(e) => handleEdit(cal.id, e)} className="p-2 text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="수정">
                    <Settings size={18} />
                  </button>
                  {!cal.isDefault && (
                    <button onClick={(e) => handleDelete(cal.id, e)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" title="삭제">
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* 신규 생성 버튼 */}
            <button
              onClick={() => navigate('/create-calendar')}
              className="w-full h-[80px] border-2 border-dashed border-gray-200 rounded-[24px] flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50/30 transition-all active:scale-[0.98]"
            >
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center transition-colors">
                <Plus size={18} />
              </div>
              <span className="text-[13px] font-bold">새로운 캘린더 만들기</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default CalendarManager;
