// src/pages/social/SocialMain.tsx
import React, { useState, useRef } from 'react';
import { PageLayout } from 'components';
import ChatList from './ChatList';
import FriendList from './FriendList';
import { MessageCircle, Users } from 'lucide-react';
import { motion } from 'framer-motion';

const SocialMain = () => {
  const [activeTab, setActiveTab] = useState<'chat' | 'friend'>('chat');
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);

  // 스와이프 감지를 위한 Refs
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

  const tabs = [
    { id: 'chat', label: '채팅', icon: MessageCircle },
    { id: 'friend', label: '친구', icon: Users },
  ] as const;

  const headerContent = (
    <div className="relative flex-1 flex items-center p-1 bg-gray-100/80 dark:bg-gray-800/80 rounded-[20px] w-[220px]">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`relative flex-1 flex items-center justify-center gap-2 py-2 rounded-[16px] text-[13px] font-bold transition-colors z-10 ${
              isActive ? 'text-[#191F28] dark:text-white' : 'text-[#8B95A1] dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400'
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-white dark:bg-gray-700 rounded-[16px] shadow-sm shadow-black/5"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                style={{ zIndex: -1 }}
              />
            )}
            <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <PageLayout headerContent={headerContent} onBack={null} className="px-0">
      <div
        key={activeTab}
        className={`flex-1 flex flex-col bg-gray-50 dark:bg-gray-950 animate-in fade-in duration-300 ${
          slideDirection === 'left' ? 'slide-in-from-right-4' : slideDirection === 'right' ? 'slide-in-from-left-4' : ''
        }`}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {activeTab === 'chat' ? <ChatList /> : <FriendList isEmbedded={true} />}
      </div>
    </PageLayout>
  );
};

export default SocialMain;
