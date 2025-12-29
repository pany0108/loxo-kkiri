import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, UserPlus, User, ChevronRight, MessageCircle, X, Check } from 'lucide-react';

// 친구 데이터 타입 정의
interface Friend {
  id: string;
  name: string;
  tag: string;
  status: string;
  isOnline: boolean;
}

const FriendList = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  // 모달 상태 관리
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newFriendName, setNewFriendName] = useState('');

  // 내 상태 메시지 (여기서는 보여주기만 함)
  // 실제 앱에서는 전역 상태(Context/Redux)나 서버 데이터여야 합니다.
  const [myStatus] = useState('오늘도 파이팅! 🔥');

  // 친구 목록 데이터
  const [friends, setFriends] = useState<Friend[]>([
    { id: '1', name: '강호동', tag: '#1111', status: '오늘 운동 가실 분? 💪', isOnline: true },
    { id: '2', name: '김철수', tag: '#1234', status: '업무 중... 연락 늦어요', isOnline: false },
    { id: '3', name: '박지성', tag: '#9988', status: '영국 여행 중 ✈️', isOnline: true },
    { id: '4', name: '이영희', tag: '#4321', status: '', isOnline: false },
    { id: '5', name: '정준하', tag: '#5555', status: '맛집 탐방', isOnline: false },
  ]);

  // 검색어 필터링
  const filteredFriends = friends.filter((f) => f.name.includes(searchTerm)).sort((a, b) => a.name.localeCompare(b.name, 'ko'));

  // 친구 추가 핸들러
  const handleAddFriend = () => {
    if (!newFriendName.trim()) return;

    const newFriend: Friend = {
      id: Date.now().toString(),
      name: newFriendName,
      tag: `#${Math.floor(Math.random() * 9000) + 1000}`,
      status: '방금 추가된 친구에요! 👋',
      isOnline: true,
    };

    setFriends((prev) => [newFriend, ...prev]);
    setNewFriendName('');
    setIsModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 font-['Pretendard'] pb-[100px] relative">
      {/* 1. 상단 헤더 및 검색 영역 */}
      <header className="sticky top-0 bg-white/90 backdrop-blur-md z-40 px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">친구</h1>
          <button
            className="p-2.5 bg-gray-900 text-white rounded-full shadow-lg shadow-gray-200 active:scale-90 transition-all hover:bg-black"
            onClick={() => setIsModalOpen(true)}
          >
            <UserPlus size={20} />
          </button>
        </div>

        {/* 검색 Input */}
        <div className="relative mt-2">
          <div className="flex items-center bg-gray-100 rounded-[20px] px-4 py-3.5 transition-all focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:shadow-sm">
            <Search size={18} className="text-gray-400 mr-3 shrink-0" />
            <input
              type="text"
              value={searchTerm}
              placeholder="친구 이름 검색"
              className="flex-1 bg-transparent outline-none text-gray-900 text-[15px] placeholder:text-gray-400 font-medium"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="p-1 ml-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors active:scale-90">
                <X size={16} strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="px-6 space-y-6 mt-2">
        {/* 2. 내 프로필 (단순 이동 버튼 역할) */}
        {!searchTerm && (
          <section>
            <h2 className="text-[12px] font-bold text-gray-400 mb-3 px-1">내 프로필</h2>
            <div
              className="bg-white p-4 rounded-[28px] shadow-[0_5px_20px_rgba(0,0,0,0.02)] border border-gray-100 flex items-center justify-between active:scale-[0.99] transition-transform cursor-pointer"
              onClick={() => navigate('/profile')} // [중요] 전체 영역 클릭 시 이동
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="w-[56px] h-[56px] bg-gradient-to-br from-blue-500 to-blue-600 rounded-[22px] flex items-center justify-center text-white shadow-blue-200 shadow-lg shrink-0">
                  <User size={26} strokeWidth={2.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[17px] font-black text-gray-900">내 이름</span>
                    <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-md">ME</span>
                  </div>
                  {/* 단순히 텍스트만 표시 */}
                  <p className="text-[13px] font-medium text-gray-500 mt-0.5 truncate">{myStatus}</p>
                </div>
              </div>
              <ChevronRight size={20} className="text-gray-300 ml-2 shrink-0" />
            </div>
          </section>
        )}

        {/* 3. 친구 리스트 영역 */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-[12px] font-bold text-gray-400">
              친구 <span className="text-blue-600">{filteredFriends.length}</span>
            </h2>
          </div>

          <div className="bg-white rounded-[32px] shadow-[0_5px_20px_rgba(0,0,0,0.02)] border border-gray-100 overflow-hidden">
            {filteredFriends.length > 0 ? (
              <div className="divide-y divide-gray-50">
                {filteredFriends.map((friend) => (
                  <div key={friend.id} className="group flex items-center justify-between p-4 pl-5 hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className="flex items-center gap-4 overflow-hidden">
                      <div className="relative shrink-0">
                        <div
                          className={`w-[48px] h-[48px] rounded-[18px] flex items-center justify-center text-gray-500 font-bold text-lg
                          ${friend.isOnline ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-400'}`}
                        >
                          {friend.name[0]}
                        </div>
                        {friend.isOnline && <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-[3px] border-white rounded-full"></div>}
                      </div>

                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[16px] font-bold text-gray-900 truncate">{friend.name}</span>
                        </div>
                        <p className={`text-[12px] font-medium truncate mt-0.5 ${friend.status ? 'text-gray-500' : 'text-gray-300'}`}>{friend.status || '상태 메시지 없음'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 pl-2">
                      <button className="p-2 text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                        <MessageCircle size={20} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-24 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-4">
                  <Search size={28} />
                </div>
                <p className="text-gray-900 font-bold text-[15px]">검색 결과가 없어요</p>
                <p className="text-gray-400 text-[13px] mt-1">철자를 확인하거나 새로운 친구를 찾아보세요</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* 친구 추가 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-[32px] shadow-2xl p-6 transform transition-all animate-in fade-in zoom-in-95 duration-200">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-5 right-5 text-gray-300 hover:text-gray-500 transition-colors">
              <X size={24} />
            </button>

            <div className="mt-2 mb-6">
              <h3 className="text-xl font-black text-gray-900 mb-1">새 친구 추가</h3>
              <p className="text-gray-400 text-[13px] font-medium">친구의 이름이나 ID를 입력해주세요.</p>
            </div>

            <div className="bg-gray-50 rounded-[20px] p-2 mb-6 border border-gray-100 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
              <div className="flex items-center px-3 py-2">
                <Search size={18} className="text-gray-400 mr-3" />
                <input
                  type="text"
                  value={newFriendName}
                  onChange={(e) => setNewFriendName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddFriend()}
                  placeholder="예: 홍길동"
                  className="flex-1 bg-transparent outline-none text-gray-900 text-[15px] font-bold placeholder:font-medium placeholder:text-gray-300"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-3.5 rounded-[20px] bg-gray-100 text-gray-500 font-bold text-[14px] hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleAddFriend}
                disabled={!newFriendName.trim()}
                className={`flex-1 py-3.5 rounded-[20px] font-bold text-[14px] flex items-center justify-center gap-2 transition-all
                  ${newFriendName.trim() ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95' : 'bg-blue-100 text-blue-300 cursor-not-allowed'}`}
              >
                <Check size={16} strokeWidth={3} />
                추가하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FriendList;
