// src/pages/social/ChatList.tsx
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { useFirestoreQuery, useUserProfiles } from 'hooks';
import { MessageCircle, Search, Bell } from 'lucide-react';
import dayjs from 'dayjs';
import { UserProfile } from 'types';
import { FormInput } from 'components';

const ChatList = () => {
  const navigate = useNavigate();
  const user = auth.currentUser;
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyUnread, setShowOnlyUnread] = useState(false);

  // ... (기존 useMemo, query, hook 등 로직 유지)
  const schedulesQuery = useMemo(() => {
    if (!user) return null;
    return query(collection(db, 'schedules'), where('attendees', 'array-contains', user.uid));
  }, [user]);

  const { data: schedules, loading } = useFirestoreQuery<any>(schedulesQuery);

  const allAttendeeUids = useMemo(() => {
    if (!schedules) return [];
    const uids = new Set<string>();
    schedules.forEach((schedule: any) => {
      schedule.attendees?.forEach((uid: string) => uids.add(uid));
    });
    return Array.from(uids);
  }, [schedules]);

  const { profiles: userProfiles, loading: profilesLoading } = useUserProfiles(allAttendeeUids);

  const validSchedules = useMemo(() => {
    return (schedules || []).filter((schedule: any) => {
      if (!schedule.attendees || schedule.isAnniversary) return false;

      // 참여자가 2명 이상이거나, 1명이더라도 대화 내역(lastMessage)이 있는 경우 표시 (상대방이 나간 경우)
      return schedule.attendees.length > 1 || (schedule.attendees.length === 1 && schedule.lastMessage);
    });
  }, [schedules]);

  const filteredSchedules = useMemo(() => {
    return validSchedules
      .filter((schedule: any) => {
        if (showOnlyUnread) {
          const unreadCount = schedule.unreadCounts?.[user?.uid || ''] || 0;
          if (unreadCount === 0) return false;
        }
        return schedule.title.toLowerCase().includes(searchTerm.toLowerCase());
      })
      .sort((a: any, b: any) => {
        const getTime = (item: any) => {
          if (item.lastMessageTime) return item.lastMessageTime.toDate().getTime();
          if (item.createdAt) return new Date(item.createdAt).getTime();
          return new Date(item.start).getTime();
        };
        return getTime(b) - getTime(a);
      });
  }, [validSchedules, searchTerm, showOnlyUnread, user]);

  if (loading || profilesLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full">
      {/* 검색 및 필터 영역 [수정됨: min-w-0 추가] */}
      <div className="py-2 flex gap-3 shrink-0 items-center">
        <FormInput
          containerClassName="flex-1 min-w-0"
          wrapperClassName="!h-[52px]"
          icon={<Search size={20} />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="대화방 검색"
          onClear={() => setSearchTerm('')}
        />
        <button
          onClick={() => setShowOnlyUnread(!showOnlyUnread)}
          className={`shrink-0 w-[52px] h-[52px] flex items-center justify-center rounded-xl transition-all active:scale-95 border-2 ${
            showOnlyUnread
              ? 'bg-primary border-primary text-white shadow-md shadow-primary/30'
              : 'bg-gray-50 dark:bg-gray-800/50 border-transparent text-sub dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
          aria-label="안 읽은 메시지만 보기"
        >
          <Bell size={24} className={showOnlyUnread ? 'fill-current' : ''} />
        </button>
      </div>

      {/* 리스트 영역 */}
      <div className="pt-2 pb-24">
        {filteredSchedules.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-sub dark:text-gray-400">
            <MessageCircle size={48} className="mb-4 opacity-10" />
            <p className="text-sm font-bold text-gray-400">{searchTerm ? '검색 결과가 없습니다.' : '참여 중인 채팅방이 없습니다.'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSchedules.map((schedule: any) => {
              const lastMessageTime = schedule.lastMessageTime ? dayjs(schedule.lastMessageTime.toDate()) : null;
              const timeDisplay = lastMessageTime ? (lastMessageTime.isSame(dayjs(), 'day') ? lastMessageTime.format('A h:mm') : lastMessageTime.format('M월 D일')) : '';
              const unreadCount = schedule.unreadCounts?.[user?.uid || ''] || 0;
              const otherAttendees = (schedule.attendees || []).filter((uid: string) => uid !== user?.uid);
              const isGroupChat = otherAttendees.length > 1;

              const getAvatar = () => {
                if (isGroupChat) {
                  const membersToShow = otherAttendees.slice(0, 2).map((uid: string) => userProfiles[uid]);
                  return (
                    <div className="relative w-[48px] h-[48px] shrink-0">
                      {membersToShow.map((p: UserProfile | undefined, i: number) =>
                        p?.photoURL ? (
                          <img
                            key={p.uid || i}
                            src={p.photoURL}
                            alt={p.name}
                            className={`absolute w-[30px] h-[30px] rounded-full object-cover border-2 border-white dark:border-black ${
                              i === 0 ? 'top-0 left-0 z-10' : 'bottom-0 right-0'
                            }`}
                          />
                        ) : (
                          <div
                            key={p?.uid || i}
                            className={`absolute w-[30px] h-[30px] rounded-full flex items-center justify-center font-bold text-[10px] border-2 border-white dark:border-black bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 ${
                              i === 0 ? 'top-0 left-0 z-10' : 'bottom-0 right-0'
                            }`}
                          >
                            {p?.name?.[0] || '?'}
                          </div>
                        ),
                      )}
                    </div>
                  );
                }
                const otherUser = userProfiles[otherAttendees[0]];
                return (
                  <div className="w-[48px] h-[48px] rounded-[18px] shrink-0 bg-gray-50 dark:bg-gray-800 overflow-hidden flex items-center justify-center font-bold text-xl text-gray-300">
                    {otherUser?.photoURL ? <img src={otherUser.photoURL} alt={otherUser.name} className="w-full h-full object-cover" /> : otherUser?.name?.[0] || '?'}
                  </div>
                );
              };

              return (
                <button
                  key={schedule.id}
                  onClick={() => navigate(`/chat/${schedule.id}`)}
                  className="w-full p-3 flex items-center gap-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm active:scale-[0.99] transition-all group"
                >
                  {getAvatar()}
                  <div className="text-left flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <h4 className="font-bold text-main dark:text-white text-[15px] truncate pr-2">{schedule.title}</h4>
                      {timeDisplay && <span className="text-[11px] text-gray-400 font-medium shrink-0">{timeDisplay}</span>}
                    </div>
                    <div className="flex justify-between items-center">
                      <p
                        className={`text-[13px] truncate font-medium leading-snug max-w-[85%] ${
                          unreadCount > 0 ? 'text-gray-800 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {schedule.lastMessage || '대화 내용이 없습니다.'}
                      </p>
                      {unreadCount > 0 && (
                        <span className="bg-[#FF3B30] text-white text-[10px] font-bold px-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full leading-none shadow-sm">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatList;
