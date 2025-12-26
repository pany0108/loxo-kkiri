import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import Login from './pages/Login';
import Signup from './pages/Signup';
import CalendarMain from './pages/CalendarMain';
import AddSchedule from './pages/AddSchedule';
import ProposeMeetingDetail from './pages/ProposeMeetingDetail';
import CalendarManager from './pages/CalendarManager';
import CreateCalendar from './pages/CreateCalendar';
import MyProfile from './pages/MyProfile';
import FriendList from './pages/FriendList';
import ChangePassword from './pages/ChangePassword';

function App() {
  const location = useLocation();

  const hideNavPaths = ['/', '/signup', '/login', '/propose-detail', '/create-calendar'];
  const shouldHideNav = hideNavPaths.includes(location.pathname);

  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/change-password" element={<ChangePassword />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/profile" element={<MyProfile />} />
        <Route path="/friend-list" element={<FriendList />} />
        <Route path="/calendar" element={<CalendarMain />} />
        <Route path="/add-schedule" element={<AddSchedule />} />
        <Route path="/propose-detail" element={<ProposeMeetingDetail />} />
        <Route path="/create-calendar" element={<CreateCalendar />} />
        <Route path="/calendar-manager" element={<CalendarManager />} />
      </Routes>

      {!shouldHideNav && <BottomNav />}
    </div>
  );
}

export default App;
