import React, { useEffect, useState } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import BottomNav from './components/BottomNav';
import {
  Login,
  Signup,
  SignupSocial,
  ChangePassword,
  CalendarMain,
  AddSchedule,
  ScheduleDetail,
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
  ScheduleChat,
} from './pages';
import { Loader2 } from 'lucide-react';

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
  const hideNavPaths = ['/', '/signup', '/login', '/change-password', '/edit-info', '/create-calendar', '/add-schedule', '/propose/create', '/propose/detail'];

  const shouldHideNav = hideNavPaths.includes(location.pathname) || ['/schedule/', '/meeting/', '/chat/'].some((path) => location.pathname.startsWith(path));

  if (loading) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        {/* --- 01. 계정 및 인증 --- */}
        <Route path="/" element={!user ? <Login /> : <Navigate to="/calendar" />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/signup-social" element={user ? <SignupSocial /> : <Navigate to="/" />} />
        <Route path="/change-password" element={user ? <ChangePassword /> : <Navigate to="/" />} />

        {/* --- 02. 사용자 및 소셜 --- */}
        <Route path="/profile" element={user ? <MyProfile /> : <Navigate to="/" />} />
        <Route path="/edit-info" element={user ? <EditUserInfo /> : <Navigate to="/" />} />
        <Route path="/friend-list" element={user ? <FriendList /> : <Navigate to="/" />} />

        {/* --- 03. 캘린더 핵심 기능 --- */}
        <Route path="/calendar" element={user ? <CalendarMain /> : <Navigate to="/" />} />
        <Route path="/calendar-manager" element={user ? <CalendarManager /> : <Navigate to="/" />} />
        <Route path="/create-calendar" element={user ? <CreateCalendar /> : <Navigate to="/" />} />
        <Route path="/add-schedule" element={user ? <AddSchedule /> : <Navigate to="/" />} />
        <Route path="/schedule/:id" element={user ? <ScheduleDetail /> : <Navigate to="/" />} />

        {/* --- 04. 약속 조율 프로세스 --- */}
        <Route path="/propose" element={user ? <ProposeMeeting /> : <Navigate to="/" />} />
        <Route path="/propose/create" element={user ? <ProposeMeetingCreate /> : <Navigate to="/" />} />
        <Route path="/propose/detail" element={user ? <ProposeMeetingDetail /> : <Navigate to="/" />} />
        <Route path="/meeting/response/:id" element={user ? <MeetingResponse /> : <Navigate to="/" />} />
        <Route path="/meeting/vote/:id" element={user ? <MeetingVoting /> : <Navigate to="/" />} />
        <Route path="/meeting/report/:id" element={user ? <MeetingReport /> : <Navigate to="/" />} />

        {/* --- 05. 커뮤니케이션 --- */}
        <Route path="/chat/:id" element={user ? <ScheduleChat /> : <Navigate to="/" />} />

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

      {/* 로그인했을 때만 하단 탭 바 표시 (필요한 경우 조건 추가) */}
      {user && !shouldHideNav && <BottomNav />}
    </div>
  );
}

export default App;
