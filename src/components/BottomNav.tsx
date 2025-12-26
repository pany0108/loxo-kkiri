import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Calendar, Users, Send, User } from 'lucide-react';

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { icon: <Calendar size={24} />, label: '캘린더', path: '/calendar' },
    { icon: <Users size={24} />, label: '친구', path: '/friend-list' },
    { icon: <Send size={24} />, label: '약속제안', path: '/propose' },
    { icon: <User size={24} />, label: '프로필', path: '/profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe-area shadow-[0_-2px_10px_rgba(0,0,0,0.05)] z-50">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${isActive ? 'text-blue-600' : 'text-gray-400'}`}
            >
              {item.icon}
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
