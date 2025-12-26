import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, UserPlus, MoreVertical, UserMinus, User } from 'lucide-react';

const FriendList = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  // 가상의 친구 데이터
  const [friends] = useState([
    { id: '1', name: '강호동', tag: '#1111', status: '운동 중' },
    { id: '2', name: '김철수', tag: '#1234', status: '업무 중' },
    { id: '3', name: '박지성', tag: '#9988', status: '영국 여행' },
    { id: '4', name: '이영희', tag: '#4321', status: '' },
  ]);

  // [기획 반영] ㄱㄴㄷ 순 정렬 및 검색 필터링
  const filteredFriends = friends.filter((f) => f.name.includes(searchTerm)).sort((a, b) => a.name.localeCompare(b.name, 'ko'));

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 1. 고정 상단바 */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-md z-10 px-6 py-4 flex items-center justify-between border-b border-gray-100">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">친구</h1>
          <p className="text-[10px] text-blue-500 font-bold mt-0.5 uppercase tracking-wider">Total {friends.length}</p>
        </div>
        <button className="p-2.5 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-100 active:scale-95 transition-all" onClick={() => alert('친구 추가 페이지로 이동')}>
          <UserPlus size={20} />
        </button>
      </header>

      {/* 2. 검색창 */}
      <div className="px-5 py-4">
        <div className="flex items-center bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
          <Search size={18} className="text-gray-400 mr-3" />
          <input
            type="text"
            placeholder="이름으로 검색"
            className="flex-1 bg-transparent outline-none text-gray-700 text-sm placeholder:text-gray-300"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* 3. 친구 리스트 */}
      <div className="px-5">
        <div className="bg-white rounded-[28px] shadow-sm border border-gray-100 overflow-hidden">
          {filteredFriends.map((friend, index) => (
            <div key={friend.id} className={`flex items-center p-4 active:bg-gray-50 transition-colors ${index !== filteredFriends.length - 1 ? 'border-b border-gray-50' : ''}`}>
              {/* Avatar 대체: 이미지 대신 이름 첫 글자나 아이콘 노출 */}
              <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-[18px] mr-4 flex items-center justify-center text-gray-400 shadow-inner">
                <User size={24} />
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-gray-900 text-[15px]">{friend.name}</span>
                  <span className="text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-tighter">{friend.tag}</span>
                </div>
                {friend.status && <p className="text-[12px] text-gray-500 mt-0.5 font-medium leading-none tracking-tight">{friend.status}</p>}
              </div>

              <button className="p-2 text-gray-300 hover:text-gray-600 transition-colors">
                <MoreVertical size={20} />
              </button>
            </div>
          ))}

          {/* 데이터 없을 때 */}
          {filteredFriends.length === 0 && (
            <div className="py-20 text-center space-y-3">
              <div className="inline-flex p-4 bg-gray-50 rounded-full text-gray-300">
                <Search size={32} />
              </div>
              <p className="text-gray-400 text-sm font-medium">찾으시는 친구가 없어요 🥲</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FriendList;
