import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, CalendarPlus, Users, Info, Check } from 'lucide-react';

const CreateCalendar = () => {
  const navigate = useNavigate();

  // 상태 관리
  const [calendarName, setCalendarName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  // 친구 목록 예시
  const friendsOptions = [
    { id: '1', label: '김철수' },
    { id: '2', label: '이영희' },
    { id: '3', label: '박지성' },
    { id: '4', label: '손흥민' },
    { id: '5', label: '유재석' },
  ];

  // 친구 선택 토글 로직 (Selector 대체)
  const toggleMember = (name: string) => {
    setSelectedMembers((prev) => (prev.includes(name) ? prev.filter((m) => m !== name) : [...prev, name]));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let finalName = calendarName;
    if (!finalName && selectedMembers.length > 0) {
      finalName = `${selectedMembers.join(', ')}의 캘린더`;
    }

    if (!finalName) {
      alert('캘린더 이름을 입력하거나 친구를 선택하세요.');
      return;
    }

    alert(`'${finalName}' 가 생성되었습니다!`);
    navigate('/calendar');
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* 상단 네비게이션 */}
      <nav className="bg-white px-4 py-4 flex items-center border-b sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1 hover:bg-gray-100 rounded-full transition-colors">
          <ChevronLeft size={24} className="text-gray-700" />
        </button>
        <h1 className="flex-1 text-center font-bold text-lg mr-6 text-gray-900">새 캘린더 생성</h1>
      </nav>

      <form onSubmit={handleSubmit} className="p-5 space-y-6">
        {/* 1. 캘린더 이름 입력 */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700 ml-1">캘린더 이름</label>
          <div className="relative">
            <input
              type="text"
              value={calendarName}
              onChange={(e) => setCalendarName(e.target.value)}
              placeholder="예: 우리 가족 모임"
              className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-4 outline-none focus:border-blue-500 transition-all text-sm shadow-sm"
            />
          </div>
          <p className="text-[11px] text-gray-400 ml-1">* 입력하지 않으면 선택한 친구 이름으로 자동 설정됩니다.</p>
        </div>

        {/* 2. 공유 멤버 선택 (Custom Selector) */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 ml-1">
            <Users size={16} className="text-gray-400" />
            <label className="text-sm font-bold text-gray-700">공유할 친구 선택</label>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {friendsOptions.map((friend) => {
              const isSelected = selectedMembers.includes(friend.label);
              return (
                <button
                  key={friend.id}
                  type="button"
                  onClick={() => toggleMember(friend.label)}
                  className={`
                    relative py-3 px-2 rounded-xl text-xs font-medium border transition-all
                    ${isSelected ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-100' : 'bg-white border-gray-200 text-gray-600 hover:border-blue-200'}
                  `}
                >
                  {friend.label}
                  {isSelected && (
                    <div className="absolute -top-1 -right-1 bg-white text-blue-600 rounded-full p-0.5 border border-blue-600">
                      <Check size={10} strokeWidth={4} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. 권한 안내 카드 */}
        <div className="bg-gray-100/50 rounded-2xl p-4 flex gap-3 border border-gray-100">
          <Info size={18} className="text-gray-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-[11px] text-gray-500 leading-relaxed">
            <p className="font-bold text-gray-600 underline">권한 안내</p>
            <p>• 모든 멤버가 일정 등록 및 보기가 가능합니다.</p>
            <p>• 일정 수정 및 삭제는 등록한 본인만 가능합니다.</p>
          </div>
        </div>

        {/* 생성 버튼 */}
        <button
          type="submit"
          className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-100 active:scale-[0.98] transition-all mt-4 flex items-center justify-center gap-2"
        >
          <CalendarPlus size={20} />
          <span>캘린더 생성하기</span>
        </button>
      </form>
    </div>
  );
};

export default CreateCalendar;
