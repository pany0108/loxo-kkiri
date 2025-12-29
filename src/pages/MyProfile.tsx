import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Camera, Bell, ShieldCheck, Users, LogOut, User, ChevronLeft, Edit2 } from 'lucide-react';
import dayjs from 'dayjs';

const MyProfile = () => {
  const navigate = useNavigate();
  const [nickname, setNickname] = useState('슈퍼유저');
  const [statusMessage, setStatusMessage] = useState('오늘도 파이팅! 🔥'); // [추가] 상태 메시지 State
  const [lastChanged] = useState('2025-12-01');
  const [isPushEnabled, setIsPushEnabled] = useState(true);

  // 닉네임 수정 핸들러
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

  // [추가] 상태 메시지 수정 핸들러
  const handleStatusEdit = () => {
    const newStatus = prompt('상태 메시지를 입력하세요', statusMessage);
    if (newStatus !== null) {
      setStatusMessage(newStatus);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-['Pretendard'] pb-24">
      {/* 1. 상단 헤더 */}
      <nav className="px-4 pt-6 pb-2 flex items-center sticky top-0 bg-white/90 backdrop-blur-md z-40 transition-all">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-400 hover:text-gray-900 transition-colors active:scale-90">
          <ChevronLeft size={28} />
        </button>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight ml-1">내 프로필</h1>
      </nav>

      <div className="px-6 pt-4 space-y-6">
        {/* 2. 프로필 카드 섹션 */}
        <section className="bg-white rounded-[32px] p-8 flex flex-col items-center shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] border border-gray-100">
          <div className="relative mb-5">
            {/* 프로필 이미지 (Avatar) */}
            <div className="w-[110px] h-[110px] bg-gradient-to-br from-blue-500 to-blue-600 rounded-[38px] flex items-center justify-center text-white shadow-blue-200 shadow-xl border-[5px] border-white">
              <User size={48} strokeWidth={2.5} />
            </div>
            {/* 사진 변경 버튼 */}
            <button className="absolute -bottom-2 -right-2 p-3 bg-gray-900 rounded-[20px] text-white shadow-lg border-[4px] border-white active:scale-90 transition-all hover:bg-black">
              <Camera size={18} />
            </button>
          </div>

          <div className="text-center w-full mt-2">
            {/* 닉네임 및 수정 버튼 */}
            <div className="flex items-center justify-center gap-2 mb-1">
              <h2 className="text-2xl font-black text-gray-900">{nickname}</h2>
              <button
                onClick={handleNicknameEdit}
                className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                title="닉네임 수정"
              >
                <Edit2 size={15} />
              </button>
            </div>

            <p className="text-[14px] font-bold text-gray-400 mb-4">user@example.com</p>

            {/* [추가] 상태 메시지 표시 및 수정 버튼 */}
            <div
              onClick={handleStatusEdit}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-[16px] text-gray-600 text-[14px] font-medium hover:bg-gray-100 transition-colors cursor-pointer active:scale-95"
            >
              <span>{statusMessage || '상태 메시지를 입력해주세요'}</span>
              <Edit2 size={12} className="text-gray-400" />
            </div>
          </div>
        </section>

        {/* 3. 메뉴 리스트 섹션 */}
        <section className="space-y-4">
          <h3 className="px-2 text-[12px] font-bold text-gray-400 uppercase tracking-wider">Settings</h3>

          <div className="bg-white rounded-[28px] shadow-[0_5px_20px_rgba(0,0,0,0.02)] border border-gray-100 overflow-hidden p-2 space-y-1">
            <MenuBtn icon={<Users size={20} />} iconBg="bg-blue-50 text-blue-600" label="친구 목록 편집" onClick={() => navigate('/friend-list')} />
            <MenuBtn icon={<ShieldCheck size={20} />} iconBg="bg-orange-50 text-orange-500" label="비밀번호 변경" onClick={() => navigate('/change-password')} />
            <MenuBtn
              icon={<Bell size={20} />}
              iconBg="bg-purple-50 text-purple-500"
              label="푸시 알림"
              isToggle={true}
              toggleValue={isPushEnabled}
              onToggle={() => setIsPushEnabled(!isPushEnabled)}
            />
          </div>

          <div className="bg-white rounded-[28px] shadow-[0_5px_20px_rgba(0,0,0,0.02)] border border-gray-100 overflow-hidden p-2 mt-4">
            <MenuBtn icon={<LogOut size={20} />} iconBg="bg-red-50 text-red-500" label="로그아웃" onClick={() => navigate('/')} color="text-red-500" hideArrow />
          </div>
        </section>

        {/* 하단 정보 */}
        <div className="pt-8 pb-4 text-center opacity-40">
          <p className="text-[10px] font-bold text-gray-400 leading-relaxed">
            마지막 닉네임 변경일: {lastChanged} <br />
            SUPER SCHEDULER v1.0.0
          </p>
        </div>
      </div>
    </div>
  );
};

// [재사용 컴포넌트] 메뉴 버튼
interface MenuBtnProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  onClick?: () => void;
  isToggle?: boolean;
  toggleValue?: boolean;
  onToggle?: () => void;
  color?: string;
  hideArrow?: boolean;
}

const MenuBtn = ({ icon, iconBg, label, onClick, isToggle, toggleValue, onToggle, color = 'text-gray-900', hideArrow }: MenuBtnProps) => (
  <button
    onClick={isToggle ? onToggle : onClick}
    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 active:bg-gray-100 transition-all rounded-[20px] group cursor-pointer"
  >
    <div className="flex items-center gap-4">
      <div className={`w-[42px] h-[42px] rounded-[16px] flex items-center justify-center transition-colors shadow-sm ${iconBg}`}>{icon}</div>
      <span className={`font-bold text-[15px] ${color}`}>{label}</span>
    </div>

    <div className="flex items-center gap-2">
      {isToggle ? (
        // iOS 스타일 토글 스위치
        <div className={`w-[48px] h-[28px] flex items-center rounded-full px-1 transition-colors duration-300 ${toggleValue ? 'bg-blue-600' : 'bg-gray-200'}`}>
          <div
            className={`bg-white w-[22px] h-[22px] rounded-full shadow-md transform transition-transform duration-300 ${toggleValue ? 'translate-x-[20px]' : 'translate-x-0'}`}
          />
        </div>
      ) : (
        !hideArrow && <ChevronRight size={18} className="text-gray-300 group-hover:text-gray-400 transition-colors" />
      )}
    </div>
  </button>
);

export default MyProfile;
