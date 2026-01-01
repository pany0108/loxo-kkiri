import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Calendar, Users, Send, User } from 'lucide-react';

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // 로그인 페이지에서는 하단바를 숨깁니다.
  if (location.pathname === '/login' || location.pathname === '/signup') return null;

  const navItems = [
    { icon: <Calendar size={24} />, label: '캘린더', path: '/calendar' },
    { icon: <Users size={24} />, label: '친구', path: '/friend-list' },
    { icon: <Send size={24} />, label: '약속', path: '/propose' },
    { icon: <User size={24} />, label: '내정보', path: '/profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-t border-gray-100 dark:border-gray-800 pb-safe shadow-[0_-5px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_-5px_20px_rgba(0,0,0,0.2)] z-[1000]">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center w-full h-full transition-all duration-200 ${
                isActive ? 'text-blue-600 scale-110' : 'text-gray-400 dark:text-gray-500'
              }`}
            >
              <div className={isActive ? 'drop-shadow-[0_0_8px_rgba(37,99,235,0.3)]' : ''}>{item.icon}</div>
              <span className={`text-[10px] mt-1 font-bold ${isActive ? 'text-blue-600' : 'text-gray-400 dark:text-gray-500'}`}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
