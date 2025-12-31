import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ChevronRight, Camera, Bell, ShieldCheck, Users, LogOut, User, ChevronLeft, Edit2, ClipboardList, Loader2, Check, Moon, Sun } from 'lucide-react';
import { auth, db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useTheme } from '../contexts';
// import { updateProfile } from 'firebase/auth';

/**
 * 사용자 프로필 데이터 인터페이스
 */
interface UserProfile {
  name: string;
  email: string;
  statusMessage?: string;
  photoURL?: string;
  [key: string]: any;
}

/**
 * 마이페이지(내 프로필) 컴포넌트입니다.
 * - 사용자 정보를 조회하고 상태 메시지를 수정할 수 있습니다.
 * - 개인 정보 관리, 친구 목록, 설정 등 하위 메뉴로 이동하는 진입점 역할을 합니다.
 * * @returns {JSX.Element} 마이페이지 화면
 */
const MyProfile = () => {
  const navigate = useNavigate();
  const { themeMode, toggleThemeMode } = useTheme();

  // --- 상태 관리 ---
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPushEnabled, setIsPushEnabled] = useState(true);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [tempStatus, setTempStatus] = useState('');

  /**
   * 컴포넌트 마운트 시 Firestore에서 사용자 정보를 불러옵니다.
   */
  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            setUserData(userSnap.data() as UserProfile);
          }
        } catch (error) {
          // 데이터 로드 실패 처리
        }
      }
      setIsLoading(false);
    };
    fetchUserData();
  }, []);

  /**
   * [수정] 상태 메시지 수정 모달을 엽니다.
   * @param {string} currentStatus - 현재 상태 메시지
   */
  const openStatusModal = (currentStatus: string) => {
    setTempStatus(currentStatus);
    setIsStatusModalOpen(true);
  };

  /**
   * [추가] 상태 메시지를 저장합니다.
   */
  const handleSaveStatus = async () => {
    if (tempStatus === userData?.statusMessage) {
      setIsStatusModalOpen(false);
      return;
    }

    try {
      const userRef = doc(db, 'users', auth.currentUser!.uid);
      await updateDoc(userRef, { statusMessage: tempStatus });

      // 로컬 상태 즉시 업데이트
      setUserData((prev) => (prev ? { ...prev, statusMessage: tempStatus } : null));
      toast.success('상태 메시지가 변경되었습니다.');
    } catch (e) {
      toast.error('상태 메시지 변경 중 오류가 발생했습니다.');
      console.error('상태 메시지 업데이트 오류:', e);
    } finally {
      setIsStatusModalOpen(false);
    }
  };

  // [주석 처리] Firebase Storage 유료 플랜 필요로 기능 개발 보류
  // const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => { ... }
  // const fileInputRef = useRef<HTMLInputElement>(null);
  // const [isUploading, setIsUploading] = useState(false);
  // import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

  /**
   * 로그아웃 핸들러
   * Firebase 인증 세션을 종료하고 로그인 화면으로 이동합니다.
   */
  const handleLogout = () => {
    setIsLogoutModalOpen(true);
  };

  const handleLogoutConfirm = async () => {
    try {
      await signOut(auth);
      toast.success('안전하게 로그아웃 되었습니다.');
      navigate('/');
    } catch (error) {
      toast.error('로그아웃 중 오류가 발생했습니다.');
      console.error('로그아웃 오류:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-gray-950">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400 mb-2" />
        <p className="text-gray-400 font-bold">정보를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 font-['Pretendard'] pb-24">
      {/* 상단 네비게이션 */}
      <nav className="px-6 pt-6 flex items-center sticky top-0 bg-gray-50/80 dark:bg-gray-950/80 backdrop-blur-md z-40">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors" aria-label="뒤로 가기">
          <ChevronLeft size={28} />
        </button>
      </nav>

      <div className="px-6 pt-4 space-y-8">
        <header className="mb-2">
          <h2 className="text-2xl font-black text-gray-900 dark:text-white leading-[1.3] tracking-tight">
            <span className="text-blue-600 dark:text-blue-400">{userData?.name || '사용자'}</span>님,
            <br />
            안녕하세요!
          </h2>
        </header>

        {/* 프로필 카드 섹션 */}
        <section className="bg-white dark:bg-gray-800 p-6 rounded-[28px] border border-gray-100 dark:border-gray-700 flex items-center gap-5 shadow-sm">
          <div className="relative shrink-0">
            <div className="w-[88px] h-[88px] bg-gray-100 rounded-[32px] flex items-center justify-center text-white shadow-lg border-4 border-white dark:border-gray-800 overflow-hidden">
              {userData?.photoURL ? (
                <img src={userData.photoURL} alt={userData.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <User size={40} strokeWidth={2.5} />
                </div>
              )}
            </div>
            <button
              onClick={() => toast('프로필 사진 변경 기능은 준비중입니다.')}
              className="absolute -bottom-1 -right-1 w-10 h-10 flex items-center justify-center bg-gray-900 dark:bg-gray-700 rounded-full text-white shadow-md border-2 border-white dark:border-gray-800 active:scale-90"
            >
              <Camera size={16} />
            </button>
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-black text-gray-900 dark:text-white truncate">{userData?.name || '사용자'}</h2>
            <p className="text-[14px] font-medium text-gray-400 dark:text-gray-500 mb-3 truncate">{userData?.email}</p>

            {/* 상태 메시지 표시 및 수정 트리거 */}
            <div
              onClick={() => openStatusModal(userData?.statusMessage || '')}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300 text-[13px] cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <span>{userData?.statusMessage || '상태 메시지를 입력해주세요'}</span>
              <Edit2 size={12} className="text-gray-400" />
            </div>
          </div>
        </section>

        {/* 메뉴 리스트 섹션 */}
        <section className="space-y-6">
          <h3 className="px-1 text-[13px] font-bold text-gray-400 dark:text-gray-500">계정 관리</h3>
          <div className="bg-white dark:bg-gray-800 rounded-[28px] border border-gray-100 dark:border-gray-700 overflow-hidden p-2 space-y-1">
            <MenuBtn icon={<ClipboardList size={20} />} iconBg="bg-emerald-50 text-emerald-600" label="개인 정보 관리" onClick={() => navigate('/edit-info')} />
            <MenuBtn icon={<Users size={20} />} iconBg="bg-blue-50 text-blue-600" label="친구 목록 편집" onClick={() => navigate('/friend-list')} />
            <MenuBtn icon={<ShieldCheck size={20} />} iconBg="bg-orange-50 text-orange-500" label="비밀번호 변경" onClick={() => navigate('/change-password')} />
          </div>

          <h3 className="px-1 text-[13px] font-bold text-gray-400 dark:text-gray-500">설정</h3>
          <div className="bg-white dark:bg-gray-800 rounded-[28px] border border-gray-100 dark:border-gray-700 overflow-hidden p-2 space-y-1">
            <MenuBtn
              icon={themeMode === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
              iconBg="bg-yellow-50 text-yellow-500"
              label="다크 모드"
              isToggle={true}
              toggleValue={themeMode === 'dark'}
              onToggle={toggleThemeMode}
            />
            <MenuBtn
              icon={<Bell size={20} />}
              iconBg="bg-purple-50 text-purple-500"
              label="푸시 알림"
              isToggle={true}
              toggleValue={isPushEnabled}
              onToggle={() => setIsPushEnabled(!isPushEnabled)}
            />
            <MenuBtn icon={<LogOut size={20} />} iconBg="bg-red-50 text-red-500" label="로그아웃" onClick={handleLogout} color="text-red-500" hideArrow />
          </div>
        </section>
      </div>

      {/* 로그아웃 확인 모달 */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-5 ">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsLogoutModalOpen(false)} />
          <div className="relative w-full max-w-[340px] bg-white dark:bg-gray-800 rounded-[32px] p-8 text-center shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <LogOut size={32} />
            </div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">로그아웃</h3>
            <p className="text-gray-500 dark:text-gray-400 text-[14px] mb-8 font-medium leading-relaxed">정말 로그아웃 하시겠습니까?</p>
            <div className="flex flex-col gap-2">
              <button onClick={handleLogoutConfirm} className="w-full py-4 bg-red-500 text-white font-bold rounded-[20px] active:scale-95 transition-all">
                로그아웃
              </button>
              <button onClick={() => setIsLogoutModalOpen(false)} className="w-full py-4 text-gray-400 font-bold hover:text-gray-600">
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {isStatusModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-5 ">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsStatusModalOpen(false)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">상태 메시지 수정</h3>
            <p className="text-gray-400 dark:text-gray-500 text-[13px] mb-6 font-medium leading-relaxed">나를 표현하는 멋진 메시지를 남겨보세요.</p>
            <input
              value={tempStatus}
              onChange={(e) => setTempStatus(e.target.value)}
              type="text"
              maxLength={60}
              enterKeyHint="done"
              onKeyDown={(e) => e.key === 'Enter' && handleSaveStatus()}
              className="w-full h-[58px] bg-gray-50 dark:bg-gray-700 dark:text-white border-2 border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-700 rounded-[18px] px-5 font-bold text-gray-800 outline-none mb-6 transition-all"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setIsStatusModalOpen(false)}
                className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 font-bold rounded-[20px] active:scale-95 transition-transform"
              >
                취소
              </button>
              <button
                onClick={handleSaveStatus}
                className="flex-1 py-4 bg-blue-600 text-white font-bold rounded-[20px] shadow-lg shadow-blue-100 active:scale-95 transition-transform flex items-center justify-center gap-2"
              >
                <Check size={18} strokeWidth={3} />
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- 하위 컴포넌트 ---

/**
 * 메뉴 버튼 Props 인터페이스
 */
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

/**
 * 설정 메뉴의 각 항목을 렌더링하는 재사용 버튼 컴포넌트
 * - 일반 이동 버튼 또는 토글 스위치 형태를 지원합니다.
 */
const MenuBtn = ({ icon, iconBg, label, onClick, isToggle, toggleValue, onToggle, color = 'text-gray-900', hideArrow }: MenuBtnProps) => (
  <button
    onClick={isToggle ? onToggle : onClick}
    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 active:bg-gray-100 dark:active:bg-gray-700 transition-all rounded-[20px] group cursor-pointer"
  >
    <div className="flex items-center gap-4">
      <div className={`w-[42px] h-[42px] rounded-[16px] flex items-center justify-center transition-colors shadow-sm ${iconBg} dark:bg-opacity-10`}>{icon}</div>
      <span className={`font-bold text-[15px] ${color} dark:text-gray-200`}>{label}</span>
    </div>

    <div className="flex items-center gap-2">
      {isToggle ? (
        // iOS 스타일 토글 스위치
        <div className={`w-[48px] h-[28px] flex items-center rounded-full px-1 transition-colors duration-300 ${toggleValue ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'}`}>
          <div
            className={`bg-white w-[22px] h-[22px] rounded-full shadow-md transform transition-transform duration-300 ${toggleValue ? 'translate-x-[20px]' : 'translate-x-0'}`}
          />
        </div>
      ) : (
        !hideArrow && <ChevronRight size={18} className="text-gray-300 dark:text-gray-600 group-hover:text-gray-400 dark:group-hover:text-gray-400 transition-colors" />
      )}
    </div>
  </button>
);

export default MyProfile;
