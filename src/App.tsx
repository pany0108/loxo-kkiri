import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        {/* 비밀번호 찾기나 메인 캘린더 페이지도 여기에 추가하게 됩니다 */}
      </Routes>
    </Router>
  );
}

export default App;
