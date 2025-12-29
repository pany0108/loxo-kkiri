import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import { Login, Signup, CalendarMain, AddSchedule, ProposeMeetingDetail, CalendarManager, CreateCalendar, MyProfile, FriendList, ChangePassword, ScheduleDetail } from './pages';

function App() {
  const location = useLocation();

  const hideNavPaths = ['/', '/signup', '/login', '/propose-detail', '/create-calendar', '/add-schedule', '/add-calendar'];
  const shouldHideNav = hideNavPaths.includes(location.pathname) || location.pathname.startsWith('/schedule/');

  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/" element={<Login />} />
        {/* 비밀번호 변경 */}
        <Route path="/change-password" element={<ChangePassword />} />
        {/* 회원가입 */}
        <Route path="/signup" element={<Signup />} />
        {/* 내 프로필 */}
        <Route path="/profile" element={<MyProfile />} />
        {/* 친구 목록 */}
        <Route path="/friend-list" element={<FriendList />} />
        {/* 메인 캘린더 */}
        <Route path="/calendar" element={<CalendarMain />} />
        {/* 캘린더 생성(추가) */}
        <Route path="/create-calendar" element={<CreateCalendar />} />
        {/*  */}
        <Route path="/calendar-manager" element={<CalendarManager />} />
        {/* 일정 추가 */}
        <Route path="/add-schedule" element={<AddSchedule />} />
        {/* 일정 상세(수정) */}
        <Route path="/schedule/:id" element={<ScheduleDetail />} />
        {/* 약속 상세 */}
        <Route path="/propose-detail" element={<ProposeMeetingDetail />} />
      </Routes>

      {!shouldHideNav && <BottomNav />}
    </div>
  );
}

export default App;
