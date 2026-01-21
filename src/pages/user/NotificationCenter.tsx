import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc, writeBatch } from 'firebase/firestore';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import relativeTime from 'dayjs/plugin/relativeTime';
import { AnimatePresence, AnimatePresenceProps, motion, useTransform } from 'framer-motion';
import { Bell, BellRing, Calendar, Check, CheckCircle2, ClipboardList, Edit2, FileCheck, Info, RefreshCw, Trash2, UserPlus, UserX } from 'lucide-react';
import toast from 'react-hot-toast';

import { auth, db } from '../../firebase';
import { NotificationHeader } from 'components';
import { Notification, useNotificationNavigation, useNotifications, usePullToRefresh } from 'hooks';

dayjs.extend(relativeTime);
dayjs.locale('ko');

// --- Constants & Types ---
const TABS = [
  { id: 'all', label: '전체' },
  { id: 'schedule', label: '일정' },
  { id: 'meeting', label: '약속' },
];

const SafeAnimatePresence = AnimatePresence as React.FC<React.PropsWithChildren<AnimatePresenceProps>>;

/**
 * 알림 센터 페이지 컴포넌트
 * - 사용자의 모든 알림을 목록으로 표시하고 관리(읽음 처리, 삭제)합니다.
 */
const NotificationCenter = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState('all');
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  const handleNavigation = useNotificationNavigation();
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Pull to Refresh ---
  const handleRefresh = useCallback(async () => {
    // 실제 데이터는 실시간(onSnapshot)이므로 여기서는 시각적 피드백만 제공합니다.
    await new Promise((resolve) => setTimeout(resolve, 1500));
    toast.success('알림이 업데이트되었습니다!', { id: 'refresh-toast' });
  }, []);

  const { isRefreshing, y, containerRef, handlers } = usePullToRefresh({
    onRefresh: handleRefresh,
    disabled: isSelectionMode,
  });

  // 당기는 거리에 따라 아이콘의 투명도, 크기, 회전 조절
  const iconOpacity = useTransform(y, [0, 60], [0, 1]);
  const iconScale = useTransform(y, [0, 80], [0.5, 1.2]);

  // --- Effects ---
  useLayoutEffect(() => {
    // 페이지 전환 시 브라우저의 스크롤 복원 기능과 관계없이 항상 화면 최상단에서 시작하도록 강제합니다.
    window.scrollTo(0, 0);
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [containerRef, location.pathname]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser: any) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);
  const notifications = useNotifications(user);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.isRead).length, [notifications]);

  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'all') return notifications;
    if (activeFilter === 'unread') return notifications.filter((n) => !n.isRead);
    if (activeFilter === 'schedule') return notifications.filter((n) => n.type === 'SCHEDULE_ADDED' || n.type === 'SCHEDULE_UPDATED');
    if (activeFilter === 'meeting') return notifications.filter((n) => n.type.startsWith('MEETING_'));
    return notifications.filter((n: Notification) => n.type === activeFilter);
  }, [notifications, activeFilter]);

  // --- Handlers ---

  const handleNotificationClick = async (notification: Notification) => {
    if (isSelectionMode) {
      setSelectedIds((prev: Set<string>) => {
        const newSet = new Set(prev);
        if (newSet.has(notification.id)) newSet.delete(notification.id);
        else newSet.add(notification.id);
        return newSet;
      });
      return;
    }

    if (!notification.isRead) {
      try {
        await updateDoc(doc(db, 'notifications', notification.id), { isRead: true });
      } catch (e) {
        console.error(e);
      }
    }

    // 재요청 알림 클릭 시 처리
    if (notification.type === 'MEETING_RETRY' && notification.relatedId) {
      try {
        const meetingDoc = await getDoc(doc(db, 'meetings', notification.relatedId));
        if (meetingDoc.exists()) {
          const data = meetingDoc.data();
          navigate('/propose/detail', {
            state: {
              title: data.title,
              description: data.description,
              location: data.location,
              invitedFriends: (data.invitedFriends || []).map((f: any) => ({ id: f.uid, name: f.name })),
              selectedDates: data.dates,
              calendarName: data.title,
              isRetry: true,
            },
          });
          return;
        } else {
          toast.error('해당 약속 정보를 찾을 수 없습니다.');
        }
      } catch (error) {
        console.error('Error fetching meeting data:', error);
        toast.error('약속 정보를 불러오는 중 오류가 발생했습니다.');
      }
      return;
    }

    await handleNavigation(notification);
  };

  const handleCancelSelection = () => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleMarkSelectedAsRead = async () => {
    if (selectedIds.size === 0) return;
    const batch = writeBatch(db);
    selectedIds.forEach((id) => {
      const noti = notifications.find((n) => n.id === id);
      if (noti && !noti.isRead) batch.update(doc(db, 'notifications', id), { isRead: true });
    });
    await batch.commit();
    toast.success(`${selectedIds.size}개의 알림을 읽음 처리했습니다.`);
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleDeleteAll = async () => {
    if (notifications.length === 0) return;
    setIsDeleteAllModalOpen(true);
  };

  const confirmDeleteAll = async () => {
    if (notifications.length === 0) return;
    const batch = writeBatch(db);
    notifications.forEach((noti) => batch.delete(doc(db, 'notifications', noti.id)));
    await batch.commit();
    toast.success('모든 알림을 삭제했습니다.');
    setIsDeleteAllModalOpen(false);
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    const notificationsToDelete = notifications.filter((n) => selectedIds.has(n.id));
    const batch = writeBatch(db);
    selectedIds.forEach((id) => batch.delete(doc(db, 'notifications', id)));
    await batch.commit();
    setIsSelectionMode(false);
    setSelectedIds(new Set());
    toast.success(`${notificationsToDelete.length}개의 알림이 삭제되었습니다.`);
  };

  const isAllInFilterSelected = useMemo(() => filteredNotifications.length > 0 && filteredNotifications.every((n) => selectedIds.has(n.id)), [filteredNotifications, selectedIds]);

  const handleSelectAll = () => {
    if (filteredNotifications.length === 0) return;
    const allCurrentFilterIds = new Set(filteredNotifications.map((n) => n.id));

    if (isAllInFilterSelected) {
      // 현재 필터의 모든 항목을 선택 해제합니다.
      setSelectedIds((prev) => {
        const newSet = new Set(prev);
        allCurrentFilterIds.forEach((id) => newSet.delete(id));
        return newSet;
      });
    } else {
      // 현재 필터의 모든 항목을 선택합니다.
      setSelectedIds((prev) => new Set([...Array.from(prev), ...Array.from(allCurrentFilterIds)]));
    }
  };

  const startLongPress = () => {
    if (isSelectionMode) return;
    longPressTimer.current = setTimeout(() => {
      setIsSelectionMode(true);
    }, 500);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'SCHEDULE_UPDATED':
        return <Edit2 size={20} className="text-orange-500" />;
      case 'SCHEDULE_ADDED':
        return <Calendar size={20} className="text-green-500" />;
      case 'MEETING_INVITE':
        return <Calendar size={20} className="text-blue-500" />;
      case 'MEETING_CONFIRMED':
        return <CheckCircle2 size={20} className="text-emerald-500" />;
      case 'MEETING_CANCELED':
        return <Info size={20} className="text-red-500" />;
      case 'MEETING_VOTING_STARTED':
        return <ClipboardList size={20} className="text-purple-500" />;
      case 'MEETING_URGE':
        return <BellRing size={20} className="text-amber-500" />;
      case 'MEETING_VOTING_COMPLETE_FOR_HOST':
        return <FileCheck size={20} className="text-indigo-500" />;
      case 'MEETING_VOTING_COMPLETE_FOR_PARTICIPANT':
        return <FileCheck size={20} className="text-gray-500" />;
      case 'FRIEND_REQUEST':
        return <UserPlus size={20} className="text-sky-500" />;
      case 'CALENDAR_LEAVE':
        return <UserX size={20} className="text-gray-500" />;
      case 'MEETING_RETRY':
        return <RefreshCw size={20} className="text-amber-500" />;
      default:
        return <Bell size={20} className="text-gray-500" />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-950 font-['Pretendard']">
      <NotificationHeader
        isSelectionMode={isSelectionMode}
        selectedCount={selectedIds.size}
        onCancelSelection={handleCancelSelection}
        onMarkSelectedAsRead={handleMarkSelectedAsRead}
        onDeleteSelected={handleDeleteSelected}
        onSelectAll={handleSelectAll}
        isAllInFilterSelected={isAllInFilterSelected}
        filteredNotificationsCount={filteredNotifications.length}
        onBack={() => navigate(-1)}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        unreadCount={unreadCount}
        tabs={TABS}
      />

      <div className="flex-1 relative overflow-hidden z-0 bg-white dark:bg-gray-950">
        {/* 새로고침 스피너 (고정 위치) */}
        <motion.div
          className="absolute top-44 left-0 right-0 flex justify-center items-center z-20 pointer-events-none pt-[env(safe-area-inset-top)]"
          style={{
            opacity: iconOpacity,
            scale: iconScale,
          }}
        >
          <div className="p-2 bg-white dark:bg-gray-800 rounded-full shadow-md border border-gray-100 dark:border-gray-700">
            <RefreshCw className={`w-4 h-4 text-blue-600 dark:text-blue-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          </div>
        </motion.div>

        {/* 스크롤 컨테이너 */}
        <div
          ref={containerRef}
          className={`relative h-full pb-[calc(10rem+env(safe-area-inset-bottom))] overflow-y-auto overscroll-y-contain z-10 flex flex-col ${
            isSelectionMode ? 'pt-[calc(105px+env(safe-area-inset-top))]' : 'pt-[calc(148px+env(safe-area-inset-top))]'
          }`}
          {...handlers}
        >
          {/* 당겨서 새로고침을 위한 스페이서 */}
          <motion.div style={{ height: y }} className="w-full shrink-0" />

          {/* 실제 콘텐츠 영역 */}
          <div
            className="flex-1 flex flex-col bg-white dark:bg-gray-950 "
            onClick={() => {
              if (isSelectionMode) {
                setIsSelectionMode(false);
                setSelectedIds(new Set());
              }
            }}
          >
            {filteredNotifications.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center px-6 pb-20 pt-4 text-sub dark:text-gray-400">
                <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6 animate-in zoom-in-95 duration-500">
                  <Bell size={32} className="text-sub dark:text-gray-400" />
                </div>
                <p className="text-[16px] font-black text-main dark:text-white mb-2">새로운 알림이 없습니다</p>
                <p className="text-[13px] font-medium text-sub dark:text-gray-400 text-center leading-relaxed">
                  약속 초대나 변경 사항이 생기면
                  <br />
                  이곳에서 알려드릴게요!
                </p>
              </div>
            ) : (
              <div className="px-6 pb-20 pt-4 space-y-3">
                <SafeAnimatePresence mode="popLayout">
                  {filteredNotifications.map((noti) => {
                    const isSelected = selectedIds.has(noti.id);
                    return (
                      <motion.div
                        key={noti.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -100, transition: { duration: 0.2 } }}
                        className="relative rounded-[24px] overflow-hidden"
                      >
                        <motion.div
                          onPointerDown={startLongPress}
                          onPointerUp={cancelLongPress}
                          onPointerLeave={cancelLongPress}
                          onPointerCancel={cancelLongPress}
                          onDragStart={cancelLongPress}
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            handleNotificationClick(noti);
                          }}
                          className={`relative p-5 ring-2 ring-inset transition-all cursor-pointer z-10 rounded-[24px]
                            ${
                              isSelected
                                ? 'bg-white dark:bg-gray-900 border-primary shadow-md shadow-blue-100 dark:shadow-none'
                                : noti.isRead
                                ? 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800'
                                : 'bg-primary/10 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800 shadow-sm'
                            }`}
                        >
                          <div className="flex gap-4 items-center">
                            {isSelectionMode && (
                              <div
                                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                  isSelected ? 'bg-primary border-primary' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                                }`}
                              >
                                {isSelected && <Check size={16} className="text-white" />}
                              </div>
                            )}
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                                noti.isRead ? 'bg-gray-100 dark:bg-gray-800' : 'bg-white dark:bg-gray-800 shadow-sm'
                              }`}
                            >
                              {getIcon(noti.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-[14px] leading-relaxed mb-1 ${noti.isRead ? 'text-sub dark:text-gray-400 font-medium' : 'text-main dark:text-white font-bold'}`}>
                                {noti.message}
                              </p>
                              <p className="text-[11px] text-sub dark:text-gray-400 font-medium">{dayjs(noti.createdAt).fromNow()}</p>
                            </div>
                            {!noti.isRead && !isSelectionMode && <div className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                          </div>
                        </motion.div>
                      </motion.div>
                    );
                  })}
                </SafeAnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>

      {isDeleteAllModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-5">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsDeleteAllModalOpen(false)} />
          <div className="relative w-full max-w-[340px] bg-white dark:bg-gray-800 rounded-[32px] p-8 text-center shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={32} />
            </div>
            <h3 className="text-xl font-black text-main dark:text-white mb-2">모든 알림 삭제</h3>
            <p className="text-sub dark:text-gray-400 text-[14px] mb-8 font-medium leading-relaxed">
              정말 모든 알림을 삭제하시겠습니까?
              <br />이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex flex-col gap-2">
              <button onClick={confirmDeleteAll} className="w-full py-4 bg-red-500 text-white font-bold rounded-[20px] active:scale-95 transition-all">
                모두 삭제
              </button>
              <button onClick={() => setIsDeleteAllModalOpen(false)} className="w-full py-4 text-sub dark:text-gray-500 font-bold hover:text-gray-600">
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {!isSelectionMode && notifications.length > 0 && (
        <footer className="fixed bottom-0 left-0 right-0 px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-white/80 dark:bg-gray-950/80 backdrop-blur-md z-20 text-center border-t border-gray-100 dark:border-gray-800/50">
          <button onClick={handleDeleteAll} className="text-xs font-bold text-sub dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors">
            모든 알림 지우기
          </button>
        </footer>
      )}
    </div>
  );
};

export default NotificationCenter;
