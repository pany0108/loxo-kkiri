// src/pages/social/SocialMain.tsx
import React, { useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { PageLayout, PageHeader, PageTitle } from 'components';
import { MessageCircle } from 'lucide-react';
import ChatList from './ChatList';
import FriendList from './FriendList';

const SocialMain = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'chat' | 'friend'>(location.state?.initialTab || 'chat');
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);

  // 스와이프 로직
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const touchEndY = useRef<number | null>(null);
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    touchEndX.current = null;
    touchEndY.current = null;
    touchStartX.current = e.targetTouches[0].clientX;
    touchStartY.current = e.targetTouches[0].clientY;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
    touchEndY.current = e.targetTouches[0].clientY;
  };

  const onTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current || !touchStartY.current || !touchEndY.current) return;
    const xDiff = touchStartX.current - touchEndX.current;
    const yDiff = touchStartY.current - touchEndY.current;

    if (Math.abs(xDiff) > Math.abs(yDiff) && Math.abs(xDiff) > minSwipeDistance) {
      if (xDiff > 0 && activeTab === 'chat') handleTabChange('friend');
      if (xDiff < 0 && activeTab === 'friend') handleTabChange('chat');
    }
  };

  const handleTabChange = (tab: 'chat' | 'friend') => {
    if (tab === activeTab) return;
    setSlideDirection(tab === 'friend' ? 'left' : 'right');
    setActiveTab(tab);
  };

  return (
    <PageLayout onBack={null} hideTopNav>
      <div className="flex flex-col min-h-dvh">
        {/* 상단 헤더 영역 (ProposeMeeting.tsx 스타일 적용) */}
        <div className="bg-white/90 dark:bg-black/90 backdrop-blur-md sticky top-0 z-30 pt-[env(safe-area-inset-top)] border-b border-gray-50 dark:border-gray-900 transition-colors">
          <div className="pb-2">
            <PageHeader className="mb-4 mt-2">
              <PageTitle>
                친구들과의 <br />
                <span className="text-primary dark:text-blue-400">즐거운 소통 공간</span>
              </PageTitle>
            </PageHeader>

            {/* 탭 버튼 */}
            <div className="flex p-1 bg-gray-50 dark:bg-gray-800 rounded-lg mb-2">
              <button
                onClick={() => handleTabChange('chat')}
                className={`flex-1 py-2.5 rounded-md text-[14px] font-bold transition-all ${
                  activeTab === 'chat' ? 'bg-white dark:bg-gray-700 text-main dark:text-white shadow-sm' : 'text-sub dark:text-gray-500'
                }`}
              >
                채팅
              </button>
              <button
                onClick={() => handleTabChange('friend')}
                className={`flex-1 py-2.5 rounded-md text-[14px] font-bold transition-all ${
                  activeTab === 'friend' ? 'bg-white dark:bg-gray-700 text-main dark:text-white shadow-sm' : 'text-sub dark:text-gray-500'
                }`}
              >
                친구
              </button>
            </div>
          </div>
        </div>

        {/* 콘텐츠 영역 */}
        <div
          className={`flex-1 flex flex-col min-h-0 dark:bg-black animate-in fade-in duration-300 ${
            slideDirection === 'left' ? 'slide-in-from-right-4' : slideDirection === 'right' ? 'slide-in-from-left-4' : ''
          }`}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {activeTab === 'chat' ? <ChatList /> : <FriendList isEmbedded={true} />}
        </div>
      </div>
    </PageLayout>
  );
};

export default SocialMain;
