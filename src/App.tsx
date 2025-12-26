import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import CalendarMain from './pages/CalendarMain';
import AddSchedule from './pages/AddSchedule';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/calendar" element={<CalendarMain />} />
        <Route path="/add-schedule" element={<AddSchedule />} />
      </Routes>
    </Router>
  );
}

export default App;
