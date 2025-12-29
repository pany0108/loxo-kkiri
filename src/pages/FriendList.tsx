import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, UserPlus, User, ChevronRight, MessageCircle, X } from 'lucide-react';

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

  // 친구 목록 데이터
  const [friends] = useState<Friend[]>([
    { id: '1', name: '강호동', tag: '#1111', status: '오늘 운동 가실 분? 💪', isOnline: true },
    { id: '2', name: '김철수', tag: '#1234', status: '업무 중... 연락 늦어요', isOnline: false },
    { id: '3', name: '박지성', tag: '#9988', status: '영국 여행 중 ✈️', isOnline: true },
    { id: '4', name: '이영희', tag: '#4321', status: '', isOnline: false },
    { id: '5', name: '정준하', tag: '#5555', status: '맛집 탐방', isOnline: false },
  ]);

  // 검색어 필터링 및 이름순 정렬
  const filteredFriends = friends.filter((f) => f.name.includes(searchTerm)).sort((a, b) => a.name.localeCompare(b.name, 'ko'));

  return (
    <div className="min-h-screen bg-gray-50 font-['Pretendard'] pb-[100px]">
      {/* 1. 상단 헤더 및 검색 영역 */}
      <header className="sticky top-0 bg-white/90 backdrop-blur-md z-40 px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">친구</h1>
          <button
            className="p-2.5 bg-gray-900 text-white rounded-full shadow-lg shadow-gray-200 active:scale-90 transition-all hover:bg-black"
            onClick={() => alert('친구 추가 모달 오픈')}
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
        {/* 2. 내 프로필 (검색 중이 아닐 때만 표시) */}
        {!searchTerm && (
          <section>
            <h2 className="text-[12px] font-bold text-gray-400 mb-3 px-1">내 프로필</h2>
            <div
              className="bg-white p-4 rounded-[28px] shadow-[0_5px_20px_rgba(0,0,0,0.02)] border border-gray-100 flex items-center justify-between active:scale-[0.99] transition-transform cursor-pointer"
              onClick={() => navigate('/profile')}
            >
              <div className="flex items-center gap-4">
                <div className="w-[56px] h-[56px] bg-gradient-to-br from-blue-500 to-blue-600 rounded-[22px] flex items-center justify-center text-white shadow-blue-200 shadow-lg">
                  <User size={26} strokeWidth={2.5} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[17px] font-black text-gray-900">내 이름</span>
                    <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-md">ME</span>
                  </div>
                  <p className="text-[13px] text-gray-500 font-medium mt-0.5">상태 메시지를 입력해주세요</p>
                </div>
              </div>
              <ChevronRight size={20} className="text-gray-300" />
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
                      {/* 프로필 이미지 (이니셜) */}
                      <div className="relative shrink-0">
                        <div
                          className={`w-[48px] h-[48px] rounded-[18px] flex items-center justify-center text-gray-500 font-bold text-lg
                          ${friend.isOnline ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-400'}`}
                        >
                          {friend.name[0]}
                        </div>
                        {/* 접속 상태 표시 점 */}
                        {friend.isOnline && <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-[3px] border-white rounded-full"></div>}
                      </div>

                      {/* 정보 텍스트 */}
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[16px] font-bold text-gray-900 truncate">{friend.name}</span>
                        </div>
                        <p className={`text-[12px] font-medium truncate mt-0.5 ${friend.status ? 'text-gray-500' : 'text-gray-300'}`}>{friend.status || '상태 메시지 없음'}</p>
                      </div>
                    </div>

                    {/* 액션 버튼 */}
                    <div className="flex items-center gap-1 pl-2">
                      <button className="p-2 text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                        <MessageCircle size={20} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // 검색 결과 없음 상태
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
    </div>
  );
};

export default FriendList;
