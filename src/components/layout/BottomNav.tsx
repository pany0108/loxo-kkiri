import React, { useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Calendar, Users, User, Handshake } from 'lucide-react';
import { useUI } from 'contexts';
import { useAuth, useFirestoreQuery } from 'hooks';
import { collection, query, where } from 'firebase/firestore';
import { db } from '../../firebase';

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isBottomNavVisible } = useUI();
  const { user } = useAuth();

  // 채팅 읽지 않은 메시지 확인
  const schedulesQuery = useMemo(() => {
    if (!user) return null;
    return query(collection(db, 'schedules'), where('attendees', 'array-contains', user.uid));
  }, [user]);

  const { data: schedules } = useFirestoreQuery<any>(schedulesQuery);

  const hasUnreadChats = useMemo(() => {
    if (!schedules || !user) return false;
    return schedules.some((schedule: any) => (schedule.unreadCounts?.[user.uid] || 0) > 0);
  }, [schedules, user]);

  // 로그인 페이지에서는 하단바를 숨깁니다.
  if (location.pathname === '/login' || location.pathname === '/signup') return null;
  if (!isBottomNavVisible) return null;

  const navItems = [
    { icon: <Calendar size={24} />, path: '/calendar' },
    { icon: <Users size={24} />, path: '/social' },
    { icon: <Handshake size={24} />, path: '/propose' },
    { icon: <User size={24} />, path: '/profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-t border-gray-100 dark:border-gray-800 pb-[env(safe-area-inset-bottom)] shadow-[0_-5px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_-5px_20px_rgba(0,0,0,0.2)] z-40">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center w-full h-full transition-all duration-200 ${
                isActive ? 'text-primary scale-110' : 'text-sub dark:text-gray-500'
              }`}
            >
              <div className={`relative ${isActive ? 'drop-shadow-[0_0_8px_rgba(0,122,255,0.3)]' : ''}`}>
                {item.icon}
                {item.path === '/social' && hasUnreadChats && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-900" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
