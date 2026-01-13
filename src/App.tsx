import { useCallback } from 'react';
import { Routes, Route, useLocation, Navigate, useNavigate } from 'react-router-dom';
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
  SocialMain,
} from 'pages';
import { Loader2 } from 'lucide-react';
import { AuthProvider, CalendarProvider, ThemeProvider, UIProvider } from 'contexts';
import { usePushNotification, useFcmToken, useAuth, useNotificationNavigation, useSystemUI } from 'hooks';

/**
 * 인증 상태에 따라 앱의 콘텐츠를 렌더링하는 내부 컴포넌트입니다.
 */
const AppContent = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const originalHandleNavigation = useNotificationNavigation();

  // 푸시 알림 클릭 시 내비게이션을 처리하는 핸들러를 확장합니다.
  // 채팅 알림처럼 'url' 속성이 있는 경우, 우선적으로 해당 URL로 이동시킵니다.
  const handlePushNotificationNavigation = useCallback(
    async (notification: any) => {
      // Capacitor의 PushNotificationActionPerformed 리스너는 action.notification 객체를 전달합니다.
      // 이 객체의 data 속성에 페이로드가 담겨 있습니다.
      const data = notification.data || notification;
      if (data.type === 'CHAT' && data.scheduleId) {
        navigate(`/chat/${data.scheduleId}`);
      } else if (data.url) {
        navigate(data.url);
      } else {
        // url이 없는 기존 알림들은 원래 핸들러로 처리
        await originalHandleNavigation(notification);
      }
    },
    [navigate, originalHandleNavigation],
  );

  // 사용자 상태에 의존하는 훅들
  usePushNotification(user, handlePushNotificationNavigation);
  useFcmToken(user?.uid || null);

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

  // 인증 상태 확인 중일 때 로딩 화면 표시
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[100dvh] bg-white dark:bg-gray-950 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
        <Loader2 className="w-8 h-8 animate-spin text-[#007AFF]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-white dark:bg-gray-950 pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
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
            <Route path="/social" element={user ? <SocialMain /> : <Navigate to="/" />} />
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
    </div>
  );
};

/**
 * 앱의 최상위 컴포넌트입니다.
 * 전역 컨텍스트 프로바이더들을 설정합니다.
 */
function App() {
  // 다크/라이트 모드 UI 동기화
  useSystemUI();

  return (
    <AuthProvider>
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
          <UIProvider>
            <AppContent />
          </UIProvider>
        </CalendarProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
