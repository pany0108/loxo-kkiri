import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { signOut } from 'firebase/auth';
import { arrayRemove, doc, updateDoc } from 'firebase/firestore';
import { Bell, Check, ChevronRight, ClipboardList, Edit2, Loader2, LogOut, Moon, ShieldCheck, Sun, User, Users } from 'lucide-react';
import toast from 'react-hot-toast';

import { auth, db } from '../../firebase';
import { ConfirmModal, PageHeader, PageLayout, PageTitle } from 'components';
import { useTheme } from 'contexts';
import { useFirestoreDoc } from 'hooks';
import { UserProfile } from 'types';

/**
 * 마이페이지(내 프로필) 컴포넌트입니다.
 * - 사용자 정보를 조회하고 상태 메시지를 수정할 수 있습니다.
 * - 개인 정보 관리, 친구 목록, 설정 등 하위 메뉴로 이동하는 진입점 역할을 합니다.
 * @returns {JSX.Element} 마이페이지 화면
 */
const MyProfile = () => {
  const navigate = useNavigate();
  const { themeMode, toggleThemeMode } = useTheme();

  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const [isCheckingPermission, setIsCheckingPermission] = useState(true);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [tempStatus, setTempStatus] = useState('');

  const user = auth.currentUser;
  const userDocRef = useMemo(() => (user ? doc(db, 'users', user.uid) : null), [user]);
  const { data: userData, loading: isLoading } = useFirestoreDoc<UserProfile>(userDocRef);

  // 푸시 알림 권한 상태 확인
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

  /** 푸시 알림 토글 핸들러 */
  const handleTogglePush = async () => {
    if (isCheckingPermission || !Capacitor.isNativePlatform()) return;

    if (isPushEnabled) {
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

  /** 상태 메시지 수정 모달 오픈 */
  const openStatusModal = (currentStatus: string) => {
    setTempStatus(currentStatus);
    setIsStatusModalOpen(true);
  };

  /** 상태 메시지 저장 */
  const handleSaveStatus = async () => {
    if (tempStatus === userData?.statusMessage) {
      setIsStatusModalOpen(false);
      return;
    }

    try {
      const userRef = doc(db, 'users', auth.currentUser!.uid);
      await updateDoc(userRef, { statusMessage: tempStatus });
      toast.success('상태 메시지가 변경되었습니다.');
    } catch (e) {
      toast.error('상태 메시지 변경 중 오류가 발생했습니다.');
      console.error('상태 메시지 업데이트 오류:', e);
    } finally {
      setIsStatusModalOpen(false);
    }
  };

  /** 로그아웃 핸들러 */
  const handleLogout = () => {
    setIsLogoutModalOpen(true);
  };

  /** 로그아웃 확정 핸들러 */
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
    <PageLayout onBack={null} hideTopNav>
      <div className="space-y-8 pb-24">
        <PageHeader className="mb-2">
          <PageTitle>
            <span className="text-primary dark:text-blue-400">{userData?.name || '사용자'}</span>님,
            <br />
            안녕하세요!
          </PageTitle>
        </PageHeader>

        <section className="bg-white dark:bg-gray-800 p-6 rounded-[28px] border border-gray-100 dark:border-gray-700 flex items-center gap-5 shadow-sm">
          <div className="relative shrink-0">
            <div className="w-[88px] h-[88px] bg-gray-100 rounded-[32px] flex items-center justify-center text-white shadow-lg border-4 border-white dark:border-gray-800 overflow-hidden">
              <div className="w-full h-full bg-gradient-to-br from-primary to-[#0062cc] flex items-center justify-center">
                <User size={40} strokeWidth={2.5} />
              </div>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-black text-main dark:text-white truncate">{userData?.name || '사용자'}</h2>
            <p className="text-[14px] font-medium text-sub dark:text-gray-500 mb-3 truncate">{userData?.email}</p>
            <div
              onClick={() => openStatusModal(userData?.statusMessage || '')}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-700 rounded-full text-sub dark:text-gray-300 text-[13px] cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <span>{userData?.statusMessage || '상태 메시지를 입력해주세요'}</span>
              <Edit2 size={12} className="text-sub" />
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <h3 className="px-1 text-[13px] font-bold text-sub dark:text-gray-500">계정 관리</h3>
          <div className="bg-white dark:bg-gray-800 rounded-[28px] border border-gray-100 dark:border-gray-700 overflow-hidden p-2 space-y-1">
            <MenuBtn icon={<ClipboardList size={20} />} iconBg="bg-emerald-50 text-emerald-600" label="개인 정보 관리" onClick={() => navigate('/edit-info')} />
            <MenuBtn icon={<Users size={20} />} iconBg="bg-primary/10 text-primary" label="친구 목록 편집" onClick={() => navigate('/friend-list')} />
            <MenuBtn icon={<ShieldCheck size={20} />} iconBg="bg-orange-50 text-orange-500" label="비밀번호 변경" onClick={() => navigate('/change-password')} />
          </div>

          <h3 className="px-1 text-[13px] font-bold text-sub dark:text-gray-500">설정</h3>
          <div className="bg-white dark:bg-gray-800 rounded-[28px] border border-gray-100 dark:border-gray-700 overflow-hidden p-2 space-y-1">
            <MenuBtn
              icon={themeMode === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
              iconBg="bg-yellow-50 text-yellow-500"
              label="다크 모드"
              isToggle={true}
              toggleValue={themeMode === 'dark'}
              onToggle={toggleThemeMode}
            />
            <MenuBtn icon={<Bell size={20} />} iconBg="bg-purple-50 text-purple-500" label="푸시 알림" isToggle={true} toggleValue={isPushEnabled} onToggle={handleTogglePush} />
            <MenuBtn icon={<LogOut size={20} />} iconBg="bg-red-50 text-red-500" label="로그아웃" onClick={handleLogout} color="text-red-500" hideArrow />
          </div>
        </section>
      </div>

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
            <h3 className="text-xl font-black text-main dark:text-white mb-2">상태 메시지 수정</h3>
            <p className="text-sub dark:text-gray-500 text-[13px] mb-6 font-medium leading-relaxed">나를 표현하는 멋진 메시지를 남겨보세요.</p>
            <input
              value={tempStatus}
              onChange={(e) => setTempStatus(e.target.value)}
              type="text"
              maxLength={60}
              enterKeyHint="done"
              onKeyDown={(e) => e.key === 'Enter' && handleSaveStatus()}
              className="w-full h-[58px] bg-gray-50 dark:bg-gray-700 dark:text-white border-2 border-transparent focus:border-primary focus:bg-white dark:focus:bg-gray-700 rounded-[18px] px-5 font-bold text-main outline-none mb-6 transition-all"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setIsStatusModalOpen(false)}
                className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 text-sub dark:text-gray-300 font-bold rounded-[20px] active:scale-95 transition-transform"
              >
                취소
              </button>
              <button
                onClick={handleSaveStatus}
                className="flex-1 py-4 bg-primary text-white font-bold rounded-[20px] shadow-lg shadow-primary/20 active:scale-95 transition-transform flex items-center justify-center gap-2"
              >
                <Check size={18} strokeWidth={3} />
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
};

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
const MenuBtn = ({ icon, iconBg, label, onClick, isToggle, toggleValue, onToggle, color = 'text-main', hideArrow }: MenuBtnProps) => (
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
        <div
          className={`w-[48px] h-[28px] flex items-center rounded-full px-1 transition-colors duration-300 ${toggleValue ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-600'}`}
          aria-hidden="true"
        >
          <div
            className={`bg-white w-[22px] h-[22px] rounded-full shadow-md transform transition-transform duration-300 ${toggleValue ? 'translate-x-[20px]' : 'translate-x-0'}`}
          />
        </div>
      ) : (
        !hideArrow && <ChevronRight size={18} className="text-sub dark:text-gray-600 group-hover:text-sub dark:group-hover:text-gray-400 transition-colors" />
      )}
    </div>
  </button>
);

export default MyProfile;
