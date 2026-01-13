// src/pages/social/ChatList.tsx
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { useFirestoreQuery, useUserProfiles } from 'hooks';
import { MessageCircle, Search, Bell } from 'lucide-react';
import dayjs from 'dayjs';
import { UserProfile } from 'types';

const ChatList = () => {
  const navigate = useNavigate();
  const user = auth.currentUser;
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyUnread, setShowOnlyUnread] = useState(false);

  const schedulesQuery = useMemo(() => {
    if (!user) return null;
    return query(collection(db, 'schedules'), where('attendees', 'array-contains', user.uid));
  }, [user]);

  const { data: schedules, loading } = useFirestoreQuery<any>(schedulesQuery);

  // [추가] 채팅방에 참여한 모든 유저의 프로필 정보를 한 번에 불러옵니다.
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
    return (schedules || []).filter((schedule: any) => schedule.attendees && schedule.attendees.length > 1);
  }, [schedules]);

  const filteredSchedules = useMemo(() => {
    return validSchedules
      .filter((schedule: any) => {
        // 안 읽은 메시지 필터
        if (showOnlyUnread) {
          const unreadCount = schedule.unreadCounts?.[user?.uid || ''] || 0;
          if (unreadCount === 0) return false;
        }
        return schedule.title.toLowerCase().includes(searchTerm.toLowerCase());
      })
      .sort((a: any, b: any) => {
        // 마지막 메시지 시간 > 생성 시간 > 일정 시작 시간 순으로 정렬
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
      <div className="flex justify-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#007AFF]"></div>
      </div>
    );
  }

  if (validSchedules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-[#8B95A1] dark:text-gray-500">
        <MessageCircle size={48} className="mb-4 opacity-20" />
        <p className="text-sm font-bold">참여 중인 채팅방이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="p-4 pb-[calc(4rem+env(safe-area-inset-bottom))] flex-1">
      <div className="flex gap-2 mb-4 shrink-0">
        <div className="flex-1 flex items-center bg-gray-50 dark:bg-gray-800 rounded-[20px] px-4 py-3.5 shadow-sm border border-gray-100 dark:border-gray-700/50 focus-within:ring-2 focus-within:ring-blue-500/50 transition-all">
          <Search size={18} className="text-[#8B95A1] dark:text-gray-500 mr-3 shrink-0" />
          <input
            type="text"
            value={searchTerm}
            placeholder="채팅방 이름 검색"
            className="flex-1 bg-transparent outline-none text-[#191F28] dark:text-white text-[15px] font-bold placeholder:text-[#8B95A1] dark:placeholder:text-gray-600"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          onClick={() => setShowOnlyUnread(!showOnlyUnread)}
          className={`relative shrink-0 w-[52px] h-[52px] flex items-center justify-center rounded-[20px] shadow-sm border transition-all active:scale-95 ${
            showOnlyUnread ? 'bg-[#007AFF] border-transparent text-white' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700/50 text-[#8B95A1] dark:text-gray-500'
          }`}
          aria-label="안 읽은 메시지만 보기"
        >
          <Bell size={20} />
        </button>
      </div>

      {filteredSchedules.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-[#8B95A1] dark:text-gray-500">
          <Search size={40} className="mb-3 opacity-20" />
          <p className="text-sm font-bold">검색 결과가 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSchedules.map((schedule: any) => {
            const lastMessageTime = schedule.lastMessageTime ? dayjs(schedule.lastMessageTime.toDate()) : null;
            const timeDisplay = lastMessageTime ? (lastMessageTime.isSame(dayjs(), 'day') ? lastMessageTime.format('A h:mm') : lastMessageTime.format('M월 D일')) : '';

            // [추가] 읽지 않은 메시지 개수 가져오기
            const unreadCount = schedule.unreadCounts?.[user?.uid || ''] || 0;

            // [추가] 아바타 렌더링 로직
            const otherAttendees = (schedule.attendees || []).filter((uid: string) => uid !== user?.uid);
            const isGroupChat = otherAttendees.length > 1;

            const getAvatar = () => {
              if (isGroupChat) {
                const membersToShow = otherAttendees.slice(0, 2).map((uid: string) => userProfiles[uid]);
                return (
                  <div className="relative w-14 h-14 shrink-0">
                    {membersToShow.map((p: UserProfile | undefined, i: number) =>
                      p?.photoURL ? (
                        <img
                          key={p.uid}
                          src={p.photoURL}
                          alt={p.name}
                          className={`absolute w-9 h-9 rounded-full object-cover border-2 border-white dark:border-gray-800 ${i === 0 ? 'top-0 left-0 z-10' : 'bottom-0 right-0'}`}
                        />
                      ) : (
                        <div
                          key={p?.uid || i}
                          className={`absolute w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs border-2 border-white dark:border-gray-800 bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 ${
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
                <div className="w-10 h-10 rounded-2xl shrink-0 bg-gray-100 dark:bg-gray-700 overflow-hidden flex items-center justify-center font-bold text-xl text-gray-400">
                  {otherUser?.photoURL ? <img src={otherUser.photoURL} alt={otherUser.name} className="w-full h-full object-cover" /> : otherUser?.name?.[0] || '?'}
                </div>
              );
            };

            return (
              <button
                key={schedule.id}
                onClick={() => navigate(`/chat/${schedule.id}`)}
                className="w-full bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 flex items-center gap-4 active:scale-[0.98] transition-all hover:shadow-md"
              >
                {/* <div className="text-left flex-1 min-w-0 mr-4">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-bold text-[#191F28] dark:text-white text-[16px] truncate pr-2">{schedule.title}</h4>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {timeDisplay && <span className="text-[11px] text-[#8B95A1] dark:text-gray-500">{timeDisplay}</span>} */}

                {/* {unreadCount > 0 && (
                        <span className="bg-[#FF3B30] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] h-[18px] flex items-center justify-center leading-none">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </div> */}
                {getAvatar()}
                <div className="text-left flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-bold text-[#191F28] dark:text-white text-[15px] truncate pr-2">{schedule.title}</h4>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {timeDisplay && <span className="text-[11px] text-[#8B95A1] dark:text-gray-500">{timeDisplay}</span>}
                      {unreadCount > 0 && (
                        <span className="bg-[#FF3B30] text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full leading-none">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* <p className="text-[13px] text-[#8B95A1] dark:text-gray-400 truncate mb-2 font-medium">{schedule.lastMessage || '대화 내용이 없습니다.'}</p>
                  <div className="flex items-center gap-3 text-xs text-[#8B95A1]/70 dark:text-gray-600">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {dayjs(schedule.start).format('M월 D일')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users size={12} />
                      {schedule.attendees?.length || 0}명
                    </span>
                  </div> */}
                  <p className="text-[13px] text-[#8B95A1] dark:text-gray-400 truncate font-medium">{schedule.lastMessage || '대화 내용이 없습니다.'}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ChatList;
