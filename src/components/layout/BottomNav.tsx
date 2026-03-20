import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { collection, query, where } from 'firebase/firestore';
import { Calendar, Handshake, User, Users } from 'lucide-react';

import { useUI } from 'contexts';
import { useAuth, useFirestoreQuery } from 'hooks';
import { db } from '../../firebase';

/**
 * 하단 네비게이션 바 컴포넌트
 * - 주요 탭(캘린더, 소셜, 약속, 프로필)으로 이동하는 링크를 제공합니다.
 * - 현재 활성화된 탭을 표시하고, 읽지 않은 알림 상태를 보여줍니다.
 */
const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isBottomNavVisible } = useUI();
  const { user } = useAuth();

  // --- Firestore 쿼리 및 데이터 ---

  // 채팅 읽지 않은 메시지 확인 쿼리
  const schedulesQuery = useMemo(() => {
    if (!user) return null;
    return query(collection(db, 'schedules'), where('attendees', 'array-contains', user.uid));
  }, [user]);

  const { data: schedules } = useFirestoreQuery<any>(schedulesQuery);

  // 읽지 않은 채팅 존재 여부 계산
  const hasUnreadChats = useMemo(() => {
    if (!schedules || !user) return false;
    return schedules.some((schedule: any) => (schedule.unreadCounts?.[user.uid] || 0) > 0);
  }, [schedules, user]);

  // --- 렌더링 조건 ---

  // 로그인/회원가입 페이지에서는 하단바 숨김
  if (location.pathname === '/login' || location.pathname === '/signup') return null;
  // UI 컨텍스트에서 숨김 처리된 경우
  if (!isBottomNavVisible) return null;

  const navItems = [
    { icon: <Calendar size={22} />, path: '/calendar' },
    { icon: <Users size={22} />, path: '/social' },
    { icon: <Handshake size={22} />, path: '/propose' },
    { icon: <User size={22} />, path: '/profile' },
  ];

  return (
    /* 하단 네비게이션 컨테이너 */
    <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-t border-gray-100 dark:border-gray-800 pb-[max(env(safe-area-inset-bottom),32px)] shadow-[0_-5px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_-5px_20px_rgba(0,0,0,0.2)] z-40">
      <div className="flex justify-around items-center h-[54px] max-w-md mx-auto">
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
                {/* 소셜 탭에 읽지 않은 알림 표시 */}
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
