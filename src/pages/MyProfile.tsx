import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Camera, Bell, ShieldCheck, Users, LogOut, User, ChevronLeft, Edit2, ClipboardList } from 'lucide-react';
import { auth, db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';

const MyProfile = () => {
  const navigate = useNavigate();

  const [userData, setUserData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPushEnabled, setIsPushEnabled] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUserData(userSnap.data());
        }
      }
      setIsLoading(false);
    };
    fetchUserData();
  }, []);

  // 상태 메시지만 수정 가능하도록 유지
  const updateStatusMessage = async (currentStatus: string) => {
    const newValue = prompt('상태 메시지 수정', currentStatus);
    if (newValue !== null && newValue !== currentStatus) {
      try {
        const userRef = doc(db, 'users', auth.currentUser!.uid);
        await updateDoc(userRef, { statusMessage: newValue });
        setUserData({ ...userData, statusMessage: newValue });
      } catch (e) {
        alert('수정 중 오류가 발생했습니다.');
      }
    }
  };

  const handleLogout = async () => {
    if (window.confirm('로그아웃 하시겠습니까?')) {
      await signOut(auth);
      navigate('/');
    }
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-white">로딩 중...</div>;

  return (
    <div className="min-h-screen bg-gray-50 font-['Pretendard'] pb-24">
      <nav className="px-6 pt-6 pb-2 flex items-center sticky top-0 bg-white/90 backdrop-blur-md z-40">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-400 hover:text-gray-900 transition-colors">
          <ChevronLeft size={28} />
        </button>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight ml-1">내 프로필</h1>
      </nav>

      <div className="px-6 pt-4 space-y-6">
        {/* 프로필 카드 섹션 */}
        <section className="bg-white rounded-[32px] p-8 flex flex-col items-center shadow-sm border border-gray-100">
          <div className="relative mb-5">
            <div className="w-[110px] h-[110px] bg-gradient-to-br from-blue-500 to-blue-600 rounded-[38px] flex items-center justify-center text-white shadow-xl border-[5px] border-white">
              <User size={48} strokeWidth={2.5} />
            </div>
            <button className="absolute -bottom-2 -right-2 p-3 bg-gray-900 rounded-[20px] text-white shadow-lg border-[4px] border-white active:scale-90">
              <Camera size={18} />
            </button>
          </div>

          <div className="text-center w-full">
            {/* [수정] 이름 영역: 수정 버튼 삭제, nickname -> name 변경 */}
            <div className="flex items-center justify-center gap-2 mb-1">
              <h2 className="text-2xl font-black text-gray-900">{userData?.name || '사용자'}</h2>
            </div>
            <p className="text-[14px] font-bold text-gray-400 mb-4">{userData?.email}</p>

            {/* 상태 메시지는 여기서 바로 수정 가능 */}
            <div
              onClick={() => updateStatusMessage(userData?.statusMessage || '')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-[16px] text-gray-600 text-[14px] cursor-pointer hover:bg-gray-100 transition-colors"
            >
              <span>{userData?.statusMessage || '상태 메시지를 입력해주세요'}</span>
              <Edit2 size={12} className="text-gray-400" />
            </div>
          </div>
        </section>

        {/* 메뉴 리스트 섹션 */}
        <section className="space-y-4">
          <h3 className="px-2 text-[12px] font-bold text-gray-400 uppercase tracking-wider">Account</h3>
          <div className="bg-white rounded-[28px] border border-gray-100 overflow-hidden p-2 space-y-1">
            {/* 실명 수정을 원하면 '개인 정보 관리'로 이동하도록 유도 */}
            <MenuBtn icon={<ClipboardList size={20} />} iconBg="bg-emerald-50 text-emerald-600" label="개인 정보 관리" onClick={() => navigate('/edit-info')} />
            <MenuBtn icon={<Users size={20} />} iconBg="bg-blue-50 text-blue-600" label="친구 목록 편집" onClick={() => navigate('/friend-list')} />
            <MenuBtn icon={<ShieldCheck size={20} />} iconBg="bg-orange-50 text-orange-500" label="비밀번호 변경" onClick={() => navigate('/change-password')} />
          </div>

          <h3 className="px-2 text-[12px] font-bold text-gray-400 uppercase tracking-wider mt-6">Settings</h3>
          <div className="bg-white rounded-[28px] border border-gray-100 overflow-hidden p-2">
            <MenuBtn
              icon={<Bell size={20} />}
              iconBg="bg-purple-50 text-purple-500"
              label="푸시 알림"
              isToggle={true}
              toggleValue={isPushEnabled}
              onToggle={() => setIsPushEnabled(!isPushEnabled)}
            />
          </div>

          <div className="bg-white rounded-[28px] border border-gray-100 overflow-hidden p-2 mt-4">
            <MenuBtn icon={<LogOut size={20} />} iconBg="bg-red-50 text-red-500" label="로그아웃" onClick={handleLogout} color="text-red-500" hideArrow />
          </div>
        </section>
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
