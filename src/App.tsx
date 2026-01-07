import React, { useEffect, useState } from 'react';
import { Routes, Route, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { NavigationBar } from '@hugotomazi/capacitor-navigation-bar';
import { auth } from './firebase';
import { Toaster } from 'react-hot-toast';
import { BottomNav } from 'components';
import {
  Login,
  Signup,
  SignupSocial,
  ChangePassword,
  CalendarMain,
  AddSchedule,
  ScheduleDetail,
  ScheduleEdit,
  CalendarManager,
  CreateCalendar,
  MyProfile,
  EditUserInfo,
  FriendList,
  ProposeMeeting,
  ProposeMeetingCreate,
  ProposeMeetingDetail,
  MeetingResponse,
  MeetingVoting,
  MeetingReport,
  MeetingParticipantStatus,
  MeetingHostStatus,
  ScheduleChat,
  SharedMediaList,
  NotificationCenter,
  UserProfile,
} from './pages';
import { Loader2 } from 'lucide-react';
import { CalendarProvider, ThemeProvider } from 'contexts';
// [수정 1] useFcmToken 추가
import { useFirestoreQuery, usePushNotification, useFcmToken } from 'hooks';

function App() {
  // [수정 2] useAuth() 라인 삭제 (아래 useState와 충돌됨)
  // const { user } = useAuth(); <--- 삭제함

  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // [기존 유지] 푸시 알림 리스너 (포그라운드 알림 처리)
  usePushNotification(user, navigate);

  // [수정 3] 앱 실행/로그인 시 Firestore에 토큰 갱신 (새로 추가한 훅)
  useFcmToken(user?.uid || null);

  // 1. 사용자 로그인 상태 감시
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // [추가] 다크/라이트 모드 UI 동기화
  useEffect(() => {
    const setSystemUI = async (isDark: boolean) => {
      if (!Capacitor.isNativePlatform()) {
        return;
      }

      try {
        if (isDark) {
          const darkBgColor = '#030712';
          await StatusBar.setStyle({ style: Style.Dark });
          await StatusBar.setBackgroundColor({ color: darkBgColor });

          if (Capacitor.getPlatform() === 'android') {
            await NavigationBar.setColor({ color: darkBgColor, darkButtons: false });
          }
        } else {
          const lightBgColor = '#f9fafb';
          await StatusBar.setStyle({ style: Style.Light });
          await StatusBar.setBackgroundColor({ color: lightBgColor });

          if (Capacitor.getPlatform() === 'android') {
            await NavigationBar.setColor({ color: lightBgColor, darkButtons: true });
          }
        }
      } catch (error) {
        console.error('Failed to set system UI', error);
      }
    };

    const observer = new MutationObserver(() => {
      const isDarkMode = document.documentElement.classList.contains('dark');
      setSystemUI(isDarkMode);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    setSystemUI(document.documentElement.classList.contains('dark'));

    return () => observer.disconnect();
  }, []);

  // 2. 네비게이션 바 숨김 처리 로직
  const hideNavPaths = [
    '/',
    '/signup',
    '/signup-social',
    '/login',
    '/change-password',
    '/edit-info',
    '/create-calendar',
    '/add-schedule',
    '/propose/create',
    '/propose/detail',
    '/notifications',
    '/chat/',
    '/schedule/',
    '/meeting/',
    '/profile/',
  ];

  const shouldHideNav = hideNavPaths.includes(location.pathname) || ['/schedule/', '/meeting/', '/chat/', '/profile/'].some((path) => location.pathname.startsWith(path));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[100dvh] bg-gray-50 dark:bg-gray-950 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-gray-50 dark:bg-gray-950 pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      <Toaster
        position="top-center"
        containerStyle={{
          top: 'calc(env(safe-area-inset-top, 0px) + 20px)',
        }}
        toastOptions={{
          duration: 2500,
          style: {
            background: '#333',
            color: '#fff',
            fontSize: '14px',
          },
        }}
      />
      <ThemeProvider>
        <CalendarProvider>
          <div className="flex-1 min-h-0">
            <div className="h-full pb-[calc(4rem+env(safe-area-inset-bottom))]">
              <Routes>
                {/* --- 01. 계정 및 인증 --- */}
                <Route path="/" element={!user ? <Login /> : <Navigate to="/calendar" />} />
                <Route path="/signup" element={!user ? <Signup /> : <Navigate to="/calendar" replace />} />
                <Route path="/signup-social" element={user ? <SignupSocial /> : <Navigate to="/" />} />
                <Route path="/change-password" element={<ChangePassword />} />
                {/* --- 02. 사용자 및 소셜 --- */}
                <Route path="/profile" element={user ? <MyProfile /> : <Navigate to="/" />} />
                <Route path="/profile/:userId" element={user ? <UserProfile /> : <Navigate to="/" />} />
                <Route path="/edit-info" element={user ? <EditUserInfo /> : <Navigate to="/" />} />
                <Route path="/friend-list" element={user ? <FriendList /> : <Navigate to="/" />} />
                {/* --- 03. 캘린더 핵심 기능 --- */}
                <Route path="/calendar" element={user ? <CalendarMain /> : <Navigate to="/" />} />
                <Route path="/calendar-manager" element={user ? <CalendarManager /> : <Navigate to="/" />} />
                <Route path="/create-calendar" element={user ? <CreateCalendar /> : <Navigate to="/" />} />
                <Route path="/add-schedule" element={user ? <AddSchedule /> : <Navigate to="/" />} />
                <Route path="/schedule/:id" element={user ? <ScheduleDetail /> : <Navigate to="/" />} />
                <Route path="/schedule/edit/:id" element={user ? <ScheduleEdit /> : <Navigate to="/" />} />
                {/* --- 04. 약속 조율 프로세스 --- */}
                <Route path="/propose" element={user ? <ProposeMeeting /> : <Navigate to="/" />} />
                <Route path="/propose/create" element={user ? <ProposeMeetingCreate /> : <Navigate to="/" />} />
                <Route path="/propose/detail" element={user ? <ProposeMeetingDetail /> : <Navigate to="/" />} />
                <Route path="/meeting/response/:id" element={user ? <MeetingResponse /> : <Navigate to="/" />} />
                <Route path="/meeting/vote/:id" element={user ? <MeetingVoting /> : <Navigate to="/" />} />
                <Route path="/meeting/status/:id" element={user ? <MeetingHostStatus /> : <Navigate to="/" />} />
                <Route path="/meeting/participant-status/:id" element={user ? <MeetingParticipantStatus /> : <Navigate to="/" />} />
                <Route path="/meeting/report/:id" element={user ? <MeetingReport /> : <Navigate to="/" />} />
                {/* --- 05. 커뮤니케이션 --- */}
                <Route path="/chat/:id" element={user ? <ScheduleChat /> : <Navigate to="/" />} />
                <Route path="/schedule/:id/media" element={user ? <SharedMediaList /> : <Navigate to="/" />} />
                <Route path="/notifications" element={user ? <NotificationCenter /> : <Navigate to="/" />} />
                <Route
                  path="/__/auth/handler"
                  element={
                    <div className="flex items-center justify-center min-h-screen">
                      <Loader2 className="animate-spin" />
                    </div>
                  }
                />
                <Route path="/__/auth/iframe" element={null} />
              </Routes>
            </div>
          </div>

          {user && !shouldHideNav && <BottomNav />}
        </CalendarProvider>
      </ThemeProvider>
    </div>
  );
}

export default App;
