import React from 'react';
import { BrowserRouter as Routes, Route, BrowserRouter } from 'react-router-dom';
import './App.css';
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
import BottomNav from './components/BottomNav';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 pb-20">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/calendar" element={<CalendarMain />} />
          <Route path="/add-schedule" element={<AddSchedule />} />
          <Route path="/propose-detail" element={<ProposeMeetingDetail />} />
          <Route path="/calendar-manager" element={<CalendarManager />} />
          <Route path="/create-calendar" element={<CreateCalendar />} />
          <Route path="/profile" element={<MyProfile />} />
          <Route path="/friend-list" element={<FriendList />} />
          <Route path="/change-password" element={<ChangePassword />} />
        </Routes>
        <BottomNav />
      </div>
    </BrowserRouter>
  );
}

export default App;
