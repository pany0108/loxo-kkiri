import { useCallback, useEffect, useState } from 'react';
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
  BlockedUserList,
} from 'pages';
import { Loader2 } from 'lucide-react';
import { AuthProvider, CalendarProvider, ThemeProvider, UIProvider } from 'contexts';
import { usePushNotification, useFcmToken, useAuth, useNotificationNavigation, useSystemUI } from 'hooks';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

/**
 * 인증 상태에 따라 앱의 콘텐츠를 렌더링하는 내부 컴포넌트입니다.
 */
const AppContent = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const originalHandleNavigation = useNotificationNavigation();

  // [수정] 단순 boolean 대신 검증된 상태를 메모리에 유지
  const [isUserVerified, setIsUserVerified] = useState(false);
  const [isCheckingDb, setIsCheckingDb] = useState(false);

  // [수정] 로그인 후 유저 검증 및 라우팅 처리 (캐싱 적용)
  useEffect(() => {
    const checkUserAndRedirect = async () => {
      // 1. 로그인이 안 된 상태거나, 로딩 중이면 패스
      if (!user || loading) return;

      // 2. 이미 검증 완료된 상태라면 로직 중단 (중복 실행 방지)
      if (isUserVerified) return;

      // 3. 현재 이미 회원가입 관련 페이지라면 검사 중단
      if (location.pathname === '/signup' || location.pathname === '/signup-social') return;

      // [핵심] 로컬 스토리지 캐시 확인 (앱을 껐다 켜도 유지됨)
      // "이 기기에서, 이 아이디(uid)로 이미 검증을 통과했는가?" 확인
      const cachedVerifiedUid = localStorage.getItem('verifiedUserUid');

      if (cachedVerifiedUid === user.uid) {
        setIsUserVerified(true);
        // 이미 검증된 유저이므로 DB 조회 없이 즉시 통과
        // 단, 푸시 알림 등으로 다른 경로(예: /chat)에 진입한 경우는 리다이렉트 하지 않음
        if (location.pathname === '/' || location.pathname === '/login') {
          navigate('/calendar', { replace: true });
        }
        return;
      }

      try {
        setIsCheckingDb(true); // 로딩 시작

        // 4. Firestore에서 유저 정보 조회 (캐시가 없을 때만 실행)
        const userDocRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userDocRef);

        // 유저 정보가 없거나 필수 정보(전화번호, 생년월일)가 없는 경우
        if (!userSnap.exists() || !userSnap.data()?.phone || !userSnap.data()?.birthDate) {
          const displayName = user.displayName?.trim() || '';
          let lastName = '';
          let firstName = '';

          if (displayName.includes(' ')) {
            const parts = displayName.split(' ');
            if (/[a-zA-Z]/.test(displayName) && !/[가-힣]/.test(displayName)) {
              // 영문 이름인 경우 (예: "Nayoung Park" -> 성: Park, 이름: Nayoung)
              lastName = parts.pop() || '';
              firstName = parts.join(' ');
            } else {
              // 한글 이름에 띄어쓰기가 있는 경우 (예: "박 나영" -> 성: 박, 이름: 나영)
              lastName = parts[0];
              firstName = parts.slice(1).join(' ');
            }
          } else {
            // 띄어쓰기가 없는 경우
            if (/[가-힣]/.test(displayName)) {
              // 한글 (예: "박나영" -> 성: 박, 이름: 나영)
              lastName = displayName.charAt(0);
              firstName = displayName.slice(1);
            } else {
              // 영문 단일 단어 등 (예: "Nayoung" -> 이름: Nayoung)
              lastName = '';
              firstName = displayName;
            }
          }

          // 정보 없음 -> 소셜 가입 페이지로 이동
          navigate('/signup-social', {
            replace: true,
            state: {
              email: user.email,
              name: user.displayName,
              lastName,
              firstName,
              photoURL: user.photoURL,
              uid: user.uid,
              providerId: 'google.com',
            },
          });
        } else {
          // 5. 정보 확인 성공 -> 로컬 스토리지에 "검증됨" 도장 찍기
          localStorage.setItem('verifiedUserUid', user.uid);
          setIsUserVerified(true);

          // 로그인 페이지에 갇혀있다면 캘린더로 이동
          if (location.pathname === '/' || location.pathname === '/login') {
            navigate('/calendar', { replace: true });
          }
        }
      } catch (error) {
        console.error('유저 정보 확인 중 오류:', error);
        // [중요] 에러 발생 시 가입 페이지로 보내지 않고, 그냥 콘솔만 찍고 넘어감 (재시도 유도)
        // 네트워크 오류로 인해 멀쩡한 유저를 가입 페이지로 보내는 것을 방지
      } finally {
        setIsCheckingDb(false); // 로딩 끝
      }
    };

    checkUserAndRedirect();
  }, [user, loading, navigate, location.pathname, isUserVerified]);

  // 푸시 알림 클릭 시 내비게이션을 처리하는 핸들러
  const handlePushNotificationNavigation = useCallback(
    async (notification: any) => {
      const data = notification.data || notification;
      // [수정] 푸시 클릭 시 검증 로직이 간섭하지 않도록 처리
      if (data.type === 'CHAT' && data.scheduleId) {
        navigate(`/chat/${data.scheduleId}`);
      } else if (data.url) {
        navigate(data.url);
      } else {
        await originalHandleNavigation(notification);
      }
    },
    [navigate, originalHandleNavigation],
  );

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
    '/blocked-users',
  ];

  const shouldHideNav = hideNavPaths.includes(location.pathname) || ['/schedule/', '/meeting/', '/chat/', '/profile/'].some((path) => location.pathname.startsWith(path));

  // 인증 상태 확인 중일 때 로딩 화면 표시
  // [수정] 캐시로 즉시 통과되는 경우 로딩을 보여주지 않아 체감 속도 향상
  if (loading || (user && isCheckingDb && !isUserVerified)) {
    return (
      <div className="flex items-center justify-center min-h-[100dvh] bg-white dark:bg-gray-950 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
        <Loader2 className="w-8 h-8 animate-spin text-[#007AFF]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-white dark:bg-gray-950 pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      <div className="flex-1 min-h-0">
        <div className="h-full pb-[calc(54px+env(safe-area-inset-bottom))]">
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
            <Route path="/blocked-users" element={user ? <BlockedUserList /> : <Navigate to="/" />} />
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
