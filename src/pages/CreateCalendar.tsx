import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Users, Check, Sparkles, UserPlus, Search } from 'lucide-react';

const CreateCalendar = () => {
  const navigate = useNavigate();
  const [calName, setCalName] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);

  // 가상의 친구 목록
  const friends = ['엄마', '아빠', '동생', '언니', '김철수', '이영희'];

  const toggleFriend = (name: string) => {
    setSelectedFriends((prev) => (prev.includes(name) ? prev.filter((f) => f !== name) : [...prev, name]));
  };

  // 캘린더 이름 자동 생성 로직
  const finalName = calName || (selectedFriends.length > 0 ? `${selectedFriends.join(', ')}의 캘린더` : '');

  const isSubmitDisabled = selectedFriends.length === 0;

  return (
    <div className="flex flex-col min-h-screen bg-white font-['Pretendard']">
      {/* 헤더 영역 - Signup.tsx와 동일한 스타일 */}
      <header className="px-6 py-6 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center bg-gray-50 rounded-xl active:scale-90 transition-all">
          <ChevronLeft size={24} className="text-gray-900" />
        </button>
        <h2 className="text-[18px] font-black tracking-tight">새 캘린더 만들기</h2>
        <div className="w-10" /> {/* 좌우 밸런스용 */}
      </header>

      <div className="px-8 pt-4 flex-1 overflow-y-auto">
        <div className="space-y-10">
          {/* 1. 캘린더 이름 입력 - AddSchedule.tsx 입력창 스타일 적용 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 ml-1">
              <Sparkles size={16} className="text-blue-500" />
              <label className="text-[15px] font-black text-gray-900">캘린더 이름</label>
            </div>
            <div className="group relative">
              <input
                value={calName}
                onChange={(e) => setCalName(e.target.value)}
                placeholder="멤버 이름으로 자동 설정됩니다"
                className="w-full h-[64px] bg-gray-50 rounded-[22px] px-6 outline-none border-2 border-transparent focus:border-blue-500 focus:bg-white transition-all font-bold text-[16px] text-gray-800 placeholder:text-gray-300 shadow-sm"
              />
            </div>
          </div>

          {/* 2. 공유 멤버 선택 - 칩 스타일 그리드 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between ml-1">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-blue-500" />
                <label className="text-[15px] font-black text-gray-900">공유할 친구 선택</label>
              </div>
              <span className="text-[12px] font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded-lg">{selectedFriends.length}명 선택됨</span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {friends.map((friend) => {
                const isSelected = selectedFriends.includes(friend);
                return (
                  <button
                    key={friend}
                    onClick={() => toggleFriend(friend)}
                    className={`relative py-4 rounded-[20px] text-[14px] font-bold transition-all border-2 flex flex-col items-center gap-2 active:scale-95 ${
                      isSelected ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-white border-gray-100 text-gray-400 hover:border-blue-200'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isSelected ? 'bg-white/20' : 'bg-gray-50'}`}>
                      <Check size={16} className={isSelected ? 'text-white' : 'text-gray-200'} />
                    </div>
                    {friend}
                  </button>
                );
              })}
              {/* 친구 초대 버튼 스타일 */}
              <button className="py-4 rounded-[20px] text-[14px] font-bold border-2 border-dashed border-gray-200 text-gray-300 flex flex-col items-center gap-2 hover:bg-gray-50 transition-all">
                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center">
                  <UserPlus size={16} />
                </div>
                초대하기
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 하단 버튼 영역 - Signup/Login의 고정 버튼 스타일 */}
      <div className="p-8 bg-gradient-to-t from-white via-white to-transparent">
        <div className="mb-4 text-center">
          {finalName && <p className="text-[13px] font-bold text-blue-500 animate-in fade-in slide-in-from-bottom-1">"{finalName}"가 생성될 예정입니다.</p>}
        </div>
        <button
          disabled={isSubmitDisabled}
          className={`w-full h-[64px] rounded-[24px] font-black text-[18px] shadow-xl transition-all flex items-center justify-center gap-3 active:scale-[0.98] ${
            !isSubmitDisabled ? 'bg-blue-600 text-white shadow-blue-100' : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
          }`}
          onClick={() => {
            alert(`"${finalName}" 캘린더가 생성되었습니다.`);
            navigate('/calendar');
          }}
        >
          <span>캘린더 생성하기</span>
          <Check size={20} strokeWidth={3} />
        </button>
      </div>
    </div>
  );
};

export default CreateCalendar;
