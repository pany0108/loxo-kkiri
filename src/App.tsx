import React, { useEffect, useState } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
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
import { CalendarProvider, ThemeProvider } from './contexts';

function App() {
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 1. 사용자 로그인 상태 감시
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
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
    // [수정] 전체 컨테이너의 하단 패딩을 제거합니다. 하단 safe-area는 마지막 요소가 처리합니다.
    <div className="flex flex-col h-[100dvh] bg-gray-50 dark:bg-gray-950 pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
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
          <div className="flex-1 min-h-0 overflow-y-auto">
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
              <Route path="/meeting/status/:id" element={user ? <MeetingHostStatus /> : <Navigate to="/" />} /> {/* [추가] 라우트 */}
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

          {user && !shouldHideNav && (
            // [수정 2] BottomNav를 감싸는 div에 직접 Safe Area 패딩을 적용합니다.
            // pb-[env(safe-area-inset-bottom)]를 여기에 적용하면, 배경색은 확장되면서 내용은 위로 밀려 올라갑니다.
            <div className="shrink-0 border-t border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900 pb-[env(safe-area-inset-bottom)]">
              <BottomNav />
            </div>
          )}
        </CalendarProvider>
      </ThemeProvider>
    </div>
  );
}

export default App;
