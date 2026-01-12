import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ChevronRight, Camera, Bell, ShieldCheck, Users, LogOut, User, Edit2, ClipboardList, Loader2, Check, Moon, Sun } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { auth, db } from '../../firebase';
import { doc, updateDoc, arrayRemove } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useTheme } from 'contexts';
import { useFirestoreDoc, useScrollToTop } from 'hooks';
import { PageHeader, ConfirmModal } from 'components';
import { UserProfile } from 'types';

/**
 * 마이페이지(내 프로필) 컴포넌트입니다.
 * - 사용자 정보를 조회하고 상태 메시지를 수정할 수 있습니다.
 * - 개인 정보 관리, 친구 목록, 설정 등 하위 메뉴로 이동하는 진입점 역할을 합니다.
 * * @returns {JSX.Element} 마이페이지 화면
 */
const MyProfile = () => {
  const navigate = useNavigate();
  const { themeMode, toggleThemeMode } = useTheme();
  const scrollContainerRef = useScrollToTop();

  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const [isCheckingPermission, setIsCheckingPermission] = useState(true);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [tempStatus, setTempStatus] = useState('');

  const user = auth.currentUser;
  const userDocRef = useMemo(() => (user ? doc(db, 'users', user.uid) : null), [user]);
  const { data: userData, loading: isLoading } = useFirestoreDoc<UserProfile>(userDocRef);

  // [추가] 푸시 알림 권한 상태를 확인하여 토글 초기 상태를 설정합니다.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      setIsCheckingPermission(false);
      return;
    }
    const checkPermission = async () => {
      try {
        const permStatus = await PushNotifications.checkPermissions();
        setIsPushEnabled(permStatus.receive === 'granted');
      } catch (error) {
        console.error('푸시 알림 권한 확인 오류:', error);
      } finally {
        setIsCheckingPermission(false);
      }
    };
    checkPermission();
  }, []);

  // [추가] 푸시 알림 토글 핸들러
  const handleTogglePush = async () => {
    if (isCheckingPermission || !Capacitor.isNativePlatform()) return;

    if (isPushEnabled) {
      // --- 알림 끄기 ---
      const token = localStorage.getItem('fcm_token');
      if (token && user) {
        try {
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, { fcmTokens: arrayRemove(token) });
          localStorage.removeItem('fcm_token');
          setIsPushEnabled(false);
          toast.success('푸시 알림을 해제했습니다.');
        } catch (error) {
          toast.error('알림 해제 중 오류가 발생했습니다.');
        }
      }
    } else {
      // --- 알림 켜기 ---
      try {
        const permStatus = await PushNotifications.requestPermissions();
        if (permStatus.receive === 'granted') {
          await PushNotifications.register();
          setIsPushEnabled(true);
          toast.success('푸시 알림을 설정했습니다.');
        } else {
          toast.error('알림 권한이 거부되었습니다. 기기 설정에서 직접 권한을 허용해주세요.');
        }
      } catch (error) {
        toast.error('알림 설정 중 오류가 발생했습니다.');
      }
    }
  };

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

      // 실시간 리스너(useFirestoreDoc)가 자동으로 데이터를 업데이트하므로 수동 업데이트 불필요
      toast.success('상태 메시지가 변경되었습니다.');
    } catch (e) {
      toast.error('상태 메시지 변경 중 오류가 발생했습니다.');
      console.error('상태 메시지 업데이트 오류:', e);
    } finally {
      setIsStatusModalOpen(false);
    }
  };

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
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950 font-['Pretendard']">
      {/* [수정] 뒤로가기 버튼을 제거하고, 상단 여백을 pt-6으로 조정합니다. */}
      <div ref={scrollContainerRef} className="flex-1 px-6 pt-[calc(1.5rem+env(safe-area-inset-top))] space-y-8 overflow-y-auto pb-24">
        <PageHeader className="mb-2">
          <h2 className="text-2xl font-black text-[#191F28] dark:text-white leading-[1.3] tracking-tight">
            <span className="text-[#007AFF] dark:text-blue-400">{userData?.name || '사용자'}</span>님,
            <br />
            안녕하세요!
          </h2>
        </PageHeader>

        {/* 프로필 카드 섹션 */}
        <section className="bg-white dark:bg-gray-800 p-6 rounded-[28px] border border-gray-100 dark:border-gray-700 flex items-center gap-5 shadow-sm">
          <div className="relative shrink-0">
            <div className="w-[88px] h-[88px] bg-gray-100 rounded-[32px] flex items-center justify-center text-white shadow-lg border-4 border-white dark:border-gray-800 overflow-hidden">
              <div className="w-full h-full bg-gradient-to-br from-[#007AFF] to-[#0062cc] flex items-center justify-center">
                <User size={40} strokeWidth={2.5} />
              </div>
            </div>
            {/* 프로필 사진 변경 기능 (개발 예정) */}
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-black text-[#191F28] dark:text-white truncate">{userData?.name || '사용자'}</h2>
            <p className="text-[14px] font-medium text-[#8B95A1] dark:text-gray-500 mb-3 truncate">{userData?.email}</p>

            {/* 상태 메시지 표시 및 수정 트리거 */}
            <div
              onClick={() => openStatusModal(userData?.statusMessage || '')}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-700 rounded-full text-[#8B95A1] dark:text-gray-300 text-[13px] cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <span>{userData?.statusMessage || '상태 메시지를 입력해주세요'}</span>
              <Edit2 size={12} className="text-[#8B95A1]" />
            </div>
          </div>
        </section>

        {/* 메뉴 리스트 섹션 */}
        <section className="space-y-6">
          <h3 className="px-1 text-[13px] font-bold text-[#8B95A1] dark:text-gray-500">계정 관리</h3>
          <div className="bg-white dark:bg-gray-800 rounded-[28px] border border-gray-100 dark:border-gray-700 overflow-hidden p-2 space-y-1">
            <MenuBtn icon={<ClipboardList size={20} />} iconBg="bg-emerald-50 text-emerald-600" label="개인 정보 관리" onClick={() => navigate('/edit-info')} />
            <MenuBtn icon={<Users size={20} />} iconBg="bg-[#007AFF]/10 text-[#007AFF]" label="친구 목록 편집" onClick={() => navigate('/friend-list')} />
            <MenuBtn icon={<ShieldCheck size={20} />} iconBg="bg-orange-50 text-orange-500" label="비밀번호 변경" onClick={() => navigate('/change-password')} />
          </div>

          <h3 className="px-1 text-[13px] font-bold text-[#8B95A1] dark:text-gray-500">설정</h3>
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
              toggleValue={isPushEnabled} // 실제 권한 상태를 반영
              onToggle={handleTogglePush} // 권한 요청/토큰 제거 로직 실행
            />
            <MenuBtn icon={<LogOut size={20} />} iconBg="bg-red-50 text-red-500" label="로그아웃" onClick={handleLogout} color="text-red-500" hideArrow />
          </div>
        </section>
      </div>

      {/* 로그아웃 확인 모달 */}
      {isLogoutModalOpen && (
        <ConfirmModal
          isOpen={isLogoutModalOpen}
          onClose={() => setIsLogoutModalOpen(false)}
          onConfirm={handleLogoutConfirm}
          icon={<LogOut size={32} />}
          iconContainerClassName="bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400"
          title="로그아웃"
          message="정말 로그아웃 하시겠습니까?"
          confirmText="로그아웃"
          confirmButtonClassName="bg-red-500"
        />
      )}

      {isStatusModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-5 ">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsStatusModalOpen(false)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-[#191F28] dark:text-white mb-2">상태 메시지 수정</h3>
            <p className="text-[#8B95A1] dark:text-gray-500 text-[13px] mb-6 font-medium leading-relaxed">나를 표현하는 멋진 메시지를 남겨보세요.</p>
            <input
              value={tempStatus}
              onChange={(e) => setTempStatus(e.target.value)}
              type="text"
              maxLength={60}
              enterKeyHint="done"
              onKeyDown={(e) => e.key === 'Enter' && handleSaveStatus()}
              className="w-full h-[58px] bg-gray-50 dark:bg-gray-700 dark:text-white border-2 border-transparent focus:border-[#007AFF] focus:bg-white dark:focus:bg-gray-700 rounded-[18px] px-5 font-bold text-[#191F28] outline-none mb-6 transition-all"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setIsStatusModalOpen(false)}
                className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 text-[#8B95A1] dark:text-gray-300 font-bold rounded-[20px] active:scale-95 transition-transform"
              >
                취소
              </button>
              <button
                onClick={handleSaveStatus}
                className="flex-1 py-4 bg-[#007AFF] text-white font-bold rounded-[20px] shadow-lg shadow-[#007AFF]/20 active:scale-95 transition-transform flex items-center justify-center gap-2"
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
const MenuBtn = ({ icon, iconBg, label, onClick, isToggle, toggleValue, onToggle, color = 'text-[#191F28]', hideArrow }: MenuBtnProps) => (
  <button
    onClick={isToggle ? onToggle : onClick}
    role={isToggle ? 'switch' : 'button'}
    aria-checked={isToggle ? toggleValue : undefined}
    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 active:bg-gray-100 dark:active:bg-gray-700 transition-all rounded-[20px] group cursor-pointer"
  >
    <div className="flex items-center gap-4">
      <div className={`w-[42px] h-[42px] rounded-[16px] flex items-center justify-center transition-colors shadow-sm ${iconBg} dark:bg-opacity-10`}>{icon}</div>
      <span className={`font-bold text-[15px] ${color} dark:text-gray-200`}>{label}</span>
    </div>

    <div className="flex items-center gap-2">
      {isToggle ? (
        // iOS 스타일 토글 스위치
        <div
          className={`w-[48px] h-[28px] flex items-center rounded-full px-1 transition-colors duration-300 ${toggleValue ? 'bg-[#007AFF]' : 'bg-gray-200 dark:bg-gray-600'}`}
          aria-hidden="true"
        >
          <div
            className={`bg-white w-[22px] h-[22px] rounded-full shadow-md transform transition-transform duration-300 ${toggleValue ? 'translate-x-[20px]' : 'translate-x-0'}`}
          />
        </div>
      ) : (
        !hideArrow && <ChevronRight size={18} className="text-[#8B95A1] dark:text-gray-600 group-hover:text-[#8B95A1] dark:group-hover:text-gray-400 transition-colors" />
      )}
    </div>
  </button>
);

export default MyProfile;
