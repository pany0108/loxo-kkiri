import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Camera, Bell, ShieldCheck, Users, LogOut, User } from 'lucide-react';
import dayjs from 'dayjs';

const MyProfile = () => {
  const navigate = useNavigate();
  const [nickname, setNickname] = useState('슈퍼유저');
  const [lastChanged] = useState('2025-12-01');
  const [isPushEnabled, setIsPushEnabled] = useState(true);

  const handleNicknameEdit = () => {
    const today = dayjs();
    const diff = today.diff(dayjs(lastChanged), 'month');

    if (diff < 1) {
      alert('닉네임 변경은 1달에 한 번만 가능합니다.');
    } else {
      const newName = prompt('새로운 닉네임을 입력하세요', nickname);
      if (newName) setNickname(newName);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* 1. 상단 바 */}
      <nav className="bg-white px-6 py-5 flex items-center border-b border-gray-100 sticky top-0 z-10">
        <h1 className="text-xl font-extrabold text-gray-900">내 정보</h1>
      </nav>

      {/* 2. 프로필 카드 섹션 */}
      <div className="bg-white px-5 py-10 flex flex-col items-center border-b border-gray-100 shadow-sm">
        <div className="relative mb-5">
          {/* Avatar 대체 */}
          <div className="w-28 h-28 bg-gradient-to-br from-blue-50 to-blue-100 rounded-[40px] flex items-center justify-center text-blue-300 border-4 border-white shadow-xl shadow-blue-100/50">
            <User size={48} />
          </div>
          <button className="absolute bottom-1 right-1 p-2.5 bg-blue-600 rounded-2xl text-white shadow-lg border-2 border-white hover:bg-blue-700 active:scale-90 transition-all">
            <Camera size={18} />
          </button>
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-black text-gray-900 flex items-center justify-center gap-2">
            {nickname}
            <button
              onClick={handleNicknameEdit}
              className="text-xs bg-gray-100 px-2 py-1 rounded-md text-gray-400 font-bold hover:bg-blue-50 hover:text-blue-500 transition-colors"
            >
              수정
            </button>
          </h2>
          <p className="text-sm font-semibold text-gray-400 mt-1">user@example.com</p>
        </div>
      </div>

      {/* 3. 메뉴 리스트 */}
      <div className="p-6 space-y-6">
        <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden px-2">
          <MenuBtn icon={<Users size={20} />} iconBg="bg-blue-50 text-blue-500" label="친구 목록 편집" onClick={() => navigate('/friend-list')} />
          <div className="h-[1px] bg-gray-50 mx-4" />
          <MenuBtn icon={<ShieldCheck size={20} />} iconBg="bg-orange-50 text-orange-500" label="비밀번호 변경하기" onClick={() => navigate('/change-password')} />
          <div className="h-[1px] bg-gray-50 mx-4" />
          <MenuBtn
            icon={<Bell size={20} />}
            iconBg="bg-purple-50 text-purple-500"
            label="푸시 알림"
            isToggle={true}
            toggleValue={isPushEnabled}
            onToggle={() => setIsPushEnabled(!isPushEnabled)}
          />
        </div>

        <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden px-2">
          <MenuBtn icon={<LogOut size={20} />} iconBg="bg-red-50 text-red-400" label="로그아웃" onClick={() => navigate('/login')} color="text-red-500" hideArrow />
        </div>
      </div>

      <div className="px-10 text-center opacity-30">
        <p className="text-[11px] font-bold text-gray-400 leading-relaxed">
          마지막 닉네임 변경: {lastChanged} <br />
          SUPER SCHEDULER v1.0.0
        </p>
      </div>
    </div>
  );
};

// 재사용 가능한 메뉴 버튼 컴포넌트
const MenuBtn = ({ icon, iconBg, label, onClick, isToggle, toggleValue, onToggle, color = 'text-gray-700', hideArrow }: any) => (
  <button onClick={isToggle ? onToggle : onClick} className="w-full flex items-center justify-between p-5 hover:bg-gray-50 active:bg-gray-100/50 transition-all rounded-2xl group">
    <div className="flex items-center gap-4">
      <div className={`p-2.5 rounded-xl transition-colors ${iconBg}`}>{icon}</div>
      <span className={`font-bold text-[15px] ${color}`}>{label}</span>
    </div>
    <div className="flex items-center gap-2">
      {isToggle ? (
        // 직접 구현한 Tailwind Switch
        <div className={`w-11 h-6 flex items-center rounded-full px-1 transition-colors duration-300 ${toggleValue ? 'bg-blue-600' : 'bg-gray-200'}`}>
          <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform duration-300 ${toggleValue ? 'translate-x-5' : 'translate-x-0'}`} />
        </div>
      ) : (
        !hideArrow && <ChevronRight size={18} className="text-gray-300 group-hover:text-gray-400 transition-colors" />
      )}
    </div>
  </button>
);

export default MyProfile;
