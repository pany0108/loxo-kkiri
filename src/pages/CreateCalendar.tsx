import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Users, Check, Sparkles, UserPlus, PenLine, CheckCircle2 } from 'lucide-react';

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
      {/* 1. 상단 네비게이션 */}
      <nav className="px-6 pt-6 flex items-center sticky top-0 bg-white/80 backdrop-blur-md z-10">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-400 hover:text-gray-900 transition-colors active:scale-90">
          <ChevronLeft size={28} />
        </button>
      </nav>

      <div className="flex-1 px-6 pt-4 pb-40 overflow-y-auto w-full">
        {/* 2. 헤더 타이틀 */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-50 rounded-xl mb-6">
            <Sparkles className="text-blue-600 w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 leading-[1.3] tracking-tight">
            새로운 <span className="text-blue-600">캘린더</span>를<br />
            만들어볼까요?
          </h2>
        </div>

        <div className="space-y-8">
          {/* 3. 캘린더 이름 입력 */}
          <div className="space-y-3">
            <label className="block text-[13px] font-black text-gray-400 ml-1">캘린더 이름</label>
            <div className="flex items-center h-[60px] bg-gray-50 border-2 border-transparent focus-within:border-blue-500 focus-within:bg-white rounded-[20px] px-5 transition-all shadow-sm">
              <PenLine size={20} className="text-gray-300 mr-4" />
              <input
                value={calName}
                onChange={(e) => setCalName(e.target.value)}
                placeholder="멤버 이름으로 자동 설정됩니다"
                className="bg-transparent border-none outline-none w-full h-full text-[16px] font-bold text-gray-800 placeholder:text-gray-400/80"
              />
            </div>
          </div>

          {/* 4. 공유 멤버 선택 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-gray-400" />
                <label className="text-[13px] font-black text-gray-400">공유할 친구 선택</label>
              </div>
              <span
                className={`text-[11px] font-bold px-2 py-1 rounded-lg transition-colors ${selectedFriends.length > 0 ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-400'}`}
              >
                {selectedFriends.length}명 선택됨
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {friends.map((friend) => {
                const isSelected = selectedFriends.includes(friend);
                return (
                  <button
                    key={friend}
                    onClick={() => toggleFriend(friend)}
                    className={`
                      relative p-4 rounded-[20px] border-2 transition-all duration-200 flex items-center gap-3 text-left active:scale-[0.98]
                      ${
                        isSelected
                          ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100'
                          : 'bg-white border-gray-100 text-gray-600 hover:border-blue-100 hover:bg-gray-50'
                      }
                    `}
                  >
                    {/* 아바타 플레이스홀더 */}
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-black transition-colors ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {friend[0]}
                    </div>

                    <div className="flex-1">
                      <span className={`text-[15px] font-bold block ${isSelected ? 'text-white' : 'text-gray-900'}`}>{friend}</span>
                    </div>

                    {isSelected && (
                      <div className="absolute top-3 right-3 text-white">
                        <CheckCircle2 size={18} />
                      </div>
                    )}
                  </button>
                );
              })}

              {/* 친구 초대 버튼 */}
              <button
                className="p-4 rounded-[20px] border-2 border-dashed border-gray-200 text-gray-400 flex flex-col items-center justify-center gap-2 hover:bg-gray-50 hover:border-blue-200 hover:text-blue-500 transition-all active:scale-[0.98]"
                onClick={() => alert('친구 초대 기능은 준비중입니다!')}
              >
                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
                  <UserPlus size={20} />
                </div>
                <span className="text-[13px] font-bold">새 친구 초대</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 5. 하단 고정 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-md border-t border-gray-50 z-20">
        <div className="mb-3 text-center h-5">
          {finalName && <p className="text-[13px] font-bold text-blue-600 animate-in fade-in slide-in-from-bottom-1">✨ "{finalName}" 생성 예정</p>}
        </div>
        <button
          disabled={isSubmitDisabled}
          onClick={() => {
            alert(`"${finalName}" 캘린더가 생성되었습니다.`);
            navigate('/calendar');
          }}
          className={`
            w-full h-[62px] rounded-[24px] font-black text-[17px] shadow-lg transition-all flex items-center justify-center gap-2
            ${!isSubmitDisabled ? 'bg-blue-600 text-white shadow-blue-100 active:scale-[0.98]' : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'}
          `}
        >
          <span>캘린더 생성하기</span>
          <Check size={20} strokeWidth={3} />
        </button>
      </div>
    </div>
  );
};

export default CreateCalendar;
