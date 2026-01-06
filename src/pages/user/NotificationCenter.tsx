import React, { useState, useEffect, useRef, useMemo, useLayoutEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc, updateDoc, writeBatch, getDoc, QuerySnapshot, QueryDocumentSnapshot } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { ChevronLeft, Bell, Check, Trash2, Calendar, Info, CheckCircle2, X, ClipboardList, BellRing, FileCheck, Edit2, RefreshCw, UserPlus, UserX } from 'lucide-react';
import dayjs from 'dayjs';
import toast, { Toast } from 'react-hot-toast';
import { motion, AnimatePresence, AnimatePresenceProps, useMotionValue, useTransform, animate } from 'framer-motion';
import 'dayjs/locale/ko';
import relativeTime from 'dayjs/plugin/relativeTime';
import { onAuthStateChanged } from 'firebase/auth';

dayjs.extend(relativeTime);
dayjs.locale('ko');

// ... (Notification 인터페이스 및 TABS, SafeAnimatePresence 등 기존 코드 유지) ...
interface Notification {
  id: string;
  userId: string;
  type: string;
  message: string;
  relatedId?: string;
  isRead: boolean;
  createdAt: string;
  fromUserId?: string;
  fromUserName?: string;
}

const TABS = [
  { id: 'all', label: '전체' },
  { id: 'schedule', label: '일정' },
  { id: 'meeting', label: '약속' },
];

const SafeAnimatePresence = AnimatePresence as React.FC<React.PropsWithChildren<AnimatePresenceProps>>;

const NotificationCenter = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState('all');
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Pull to Refresh 상태 및 변수 ---
  const [isRefreshing, setIsRefreshing] = useState(false);
  const y = useMotionValue(0);
  const containerRef = useRef<HTMLDivElement>(null); // 스크롤 컨테이너 Ref
  const touchStart = useRef(0); // 터치 시작 지점 저장

  // 당기는 거리에 따라 아이콘의 투명도, 크기, 회전 조절
  const iconOpacity = useTransform(y, [0, 60], [0, 1]);
  const iconScale = useTransform(y, [0, 80], [0.5, 1.2]);
  // const iconRotate = useTransform(y, [0, 100], [0, 360]);

  useLayoutEffect(() => {
    // 페이지 전환 시 브라우저의 스크롤 복원 기능과 관계없이 항상 화면 최상단에서 시작하도록 강제합니다.
    window.scrollTo(0, 0);
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  // ... (useEffect 및 Firestore 관련 로직은 기존과 동일) ...
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser: any) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'notifications'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot) => {
      const notis = snapshot.docs.map((doc: QueryDocumentSnapshot) => ({
        id: doc.id,
        ...doc.data(),
      })) as Notification[];
      notis.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setNotifications(notis);
    });
    return () => unsubscribe();
  }, [user]);

  // ... (unreadCount, filteredNotifications, handleNotificationClick 등 기존 로직 유지) ...
  const unreadCount = useMemo(() => notifications.filter((n) => !n.isRead).length, [notifications]);

  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'all') return notifications;
    if (activeFilter === 'unread') return notifications.filter((n) => !n.isRead);
    if (activeFilter === 'schedule') return notifications.filter((n) => n.type === 'SCHEDULE_ADDED' || n.type === 'SCHEDULE_UPDATED');
    if (activeFilter === 'meeting') return notifications.filter((n) => n.type.startsWith('MEETING_'));
    return notifications.filter((n: Notification) => n.type === activeFilter);
  }, [notifications, activeFilter]);

  const handleNotificationClick = async (notification: Notification) => {
    // ... (기존 로직 동일) ...
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

    if (notification.relatedId) {
      if (notification.type === 'FRIEND_REQUEST') {
        navigate(`/profile/${notification.relatedId}`);
        return;
      }
      if (notification.type === 'CALENDAR_INVITE' || notification.type === 'CALENDAR_LEAVE') {
        navigate('/calendar', { state: { targetCalendarId: notification.relatedId } });
        return;
      }
      if (notification.type === 'SCHEDULE_ADDED' || notification.type === 'SCHEDULE_UPDATED') {
        try {
          const scheduleDoc = await getDoc(doc(db, 'schedules', notification.relatedId));
          if (scheduleDoc.exists()) navigate(`/schedule/${notification.relatedId}`);
          else toast.error('삭제된 일정입니다.');
        } catch (error) {
          toast.error('일정 정보를 불러오는 중 오류가 발생했습니다.');
        }
        return;
      }
      if (notification.type === 'MEETING_VOTING_COMPLETE_FOR_HOST') {
        navigate(`/meeting/report/${notification.relatedId}`);
        return;
      }
      if (notification.type === 'MEETING_VOTING_COMPLETE_FOR_PARTICIPANT') {
        navigate(`/meeting/participant-status/${notification.relatedId}`);
        return;
      }
      if (notification.type.startsWith('MEETING_')) {
        try {
          const meetingDoc = await getDoc(doc(db, 'meetings', notification.relatedId));
          if (!meetingDoc.exists()) {
            toast.error('관련된 약속을 찾을 수 없습니다.');
            return;
          }
          const meetingData = meetingDoc.data();
          const isHost = auth.currentUser?.uid === meetingData.hostId;
          switch (meetingData.status) {
            case 'PENDING':
              navigate(isHost ? `/meeting/status/${notification.relatedId}` : `/meeting/response/${notification.relatedId}`);
              break;
            case 'VOTING':
              navigate(`/meeting/vote/${notification.relatedId}`);
              break;
            case 'CONFIRMED':
              navigate(`/meeting/report/${notification.relatedId}`);
              break;
            default:
              navigate('/propose');
          }
        } catch (error) {
          toast.error('페이지 이동 중 오류가 발생했습니다.');
        }
      }
    }
  };

  const handleMarkSelectedAsRead = async () => {
    // ... (기존 로직 동일) ...
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
    // ... (기존 로직 동일) ...
    if (notifications.length === 0) return;
    const batch = writeBatch(db);
    notifications.forEach((noti) => batch.delete(doc(db, 'notifications', noti.id)));
    await batch.commit();
    toast.success('모든 알림을 삭제했습니다.');
    setIsDeleteAllModalOpen(false);
  };

  const handleDeleteSelected = async () => {
    // ... (기존 로직 동일) ...
    if (selectedIds.size === 0) return;
    const notificationsToDelete = notifications.filter((n) => selectedIds.has(n.id));
    const batch = writeBatch(db);
    selectedIds.forEach((id) => batch.delete(doc(db, 'notifications', id)));
    await batch.commit();
    setIsSelectionMode(false);
    setSelectedIds(new Set());
    toast(
      (t: Toast) => (
        <div className="flex items-center justify-between w-full">
          <span>{notificationsToDelete.length}개의 알림이 삭제되었습니다.</span>
          <button
            className="ml-4 px-2 py-1 rounded-md text-xs font-bold bg-white/20 hover:bg-white/30"
            onClick={async () => {
              const undoBatch = writeBatch(db);
              notificationsToDelete.forEach((n) => {
                const { id, ...data } = n;
                undoBatch.set(doc(db, 'notifications', id), data);
              });
              await undoBatch.commit();
              toast.dismiss(t.id);
            }}
          >
            실행 취소
          </button>
        </div>
      ),
      { duration: 4000 },
    );
  };

  const handleSelectAll = () => {
    // ... (기존 로직 동일) ...
    const anyInFilterSelected = filteredNotifications.some((n) => selectedIds.has(n.id));
    const currentFilterIds = new Set(filteredNotifications.map((n) => n.id));
    if (anyInFilterSelected) {
      setSelectedIds((prev) => {
        const newSet = new Set(prev);
        currentFilterIds.forEach((id) => newSet.delete(id));
        return newSet;
      });
    } else {
      setSelectedIds((prev) => new Set([...Array.from(prev), ...Array.from(currentFilterIds)]));
    }
  };

  const anyInFilterSelected = useMemo(() => filteredNotifications.some((n) => selectedIds.has(n.id)), [filteredNotifications, selectedIds]);

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

  // --- [수정] Pull-to-Refresh 핸들러 ---
  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      touchStart.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // 스크롤이 최상단이 아니거나 새로고침 중이면 무시
    if (containerRef.current && containerRef.current.scrollTop > 0) return;
    if (isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStart.current;

    // 아래로 당길 때만 작동 (diff > 0)
    if (diff > 0 && containerRef.current?.scrollTop === 0) {
      // 당기는 느낌을 주기 위해 거리를 줄임 (0.4배)
      y.set(diff * 0.4);
    }
  };

  const handleTouchEnd = () => {
    if (isRefreshing) return;

    // 임계값(80) 이상 당겼을 때 새로고침 실행
    if (y.get() > 80) {
      handleRefresh();
    } else {
      // 아니면 원래 위치로 복귀
      animate(y, 0, { type: 'spring', stiffness: 300, damping: 30 });
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    // 로딩 위치로 고정
    animate(y, 80, { type: 'spring', stiffness: 300, damping: 30 });

    setTimeout(() => {
      setIsRefreshing(false);
      toast.success('알림이 업데이트되었습니다!', {
        id: 'refresh-toast',
      });
      animate(y, 0, { type: 'spring', stiffness: 300, damping: 30 });
    }, 1500);
  };
  // -------------------------------------------------------------

  const getIcon = (type: string) => {
    // ... (기존 로직 동일) ...
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
      default:
        return <Bell size={20} className="text-gray-500" />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-950 font-['Pretendard']">
      {/* 상단 네비게이션 & 탭 */}
      <div className="sticky top-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md z-40 border-b border-transparent dark:border-gray-800">
        {isSelectionMode ? ( // Selection mode header
          <>
            <nav className="px-6 pt-6 flex items-center justify-between pb-4 animate-in fade-in duration-200">
              <button
                onClick={() => {
                  setIsSelectionMode(false);
                  setSelectedIds(new Set());
                }}
                className="p-2 -ml-2 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <X size={28} />
              </button>
              <div className="flex flex-col items-center">
                <h1 className="text-xl font-black text-gray-900 dark:text-white">{selectedIds.size}개 선택됨</h1>
              </div>
              <div className="flex items-center gap-2">
                {selectedIds.size > 0 && (
                  <>
                    <button onClick={handleMarkSelectedAsRead} className="p-2 text-blue-600 dark:text-blue-400 text-sm font-bold hover:bg-blue-50 rounded-lg">
                      모두읽음
                    </button>
                    <button onClick={handleDeleteSelected} className="p-2 text-red-500 text-sm font-bold hover:bg-red-50 rounded-lg">
                      삭제
                    </button>
                  </>
                )}
              </div>
            </nav>
            <div className="px-6 pb-4 animate-in fade-in duration-200">
              <button onClick={handleSelectAll} disabled={filteredNotifications.length === 0} className="flex items-center gap-2 group disabled:opacity-50">
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    anyInFilterSelected ? 'border-blue-600' : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {anyInFilterSelected && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" />}
                </div>
                <span className="text-sm font-bold text-gray-600 dark:text-gray-300">{anyInFilterSelected ? '전체 해제' : '전체 선택'}</span>
              </button>
            </div>
          </>
        ) : (
          // Normal mode header
          <>
            <nav className="px-6 pt-6 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                  <ChevronLeft size={28} />
                </button>
                <h1 className="text-2xl font-black text-gray-900 dark:text-white">알림 센터</h1>
              </div>
              <button
                onClick={() => setActiveFilter(activeFilter === 'unread' ? 'all' : 'unread')}
                className={`relative px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  activeFilter === 'unread' ? 'bg-red-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                }`}
              >
                읽지 않음
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 text-[9px] font-black text-white bg-red-500 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-950">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            </nav>
            <div className="px-6 pb-4">
              <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-[16px]">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveFilter(tab.id)}
                    className={`flex-1 py-2.5 rounded-[12px] text-[13px] font-bold transition-all ${
                      activeFilter === tab.id ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-400'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex-1 relative overflow-hidden z-0 bg-white dark:bg-gray-950">
        {/* 새로고침 스피너 (고정 위치) */}
        <motion.div
          className="absolute top-4 left-0 right-0 flex justify-center items-center z-0 pointer-events-none"
          style={{
            opacity: iconOpacity,
            scale: iconScale,
          }}
        >
          <div className="p-2 bg-white dark:bg-gray-800 rounded-full shadow-md border border-gray-100 dark:border-gray-700">
            <RefreshCw className={`w-4 h-4 text-blue-600 ${isRefreshing ? 'animate-spin' : ''}`} />
          </div>
        </motion.div>

        {/* [중요] 스크롤 컨테이너 
          - flex-col을 추가하여 내부 요소를 수직으로 정렬합니다.
          - 스페이서와 콘텐츠 영역으로 분리하여 클리핑 문제를 해결합니다.
        */}
        <div
          ref={containerRef}
          className="relative h-full overflow-y-auto overscroll-y-contain z-10 flex flex-col"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* 당겨서 새로고침을 위한 스페이서 */}
          <motion.div style={{ height: y }} className="w-full shrink-0" />

          {/* 실제 콘텐츠 영역 */}
          <div
            className="flex-1 flex flex-col bg-white dark:bg-gray-950"
            onClick={() => {
              if (isSelectionMode) {
                setIsSelectionMode(false);
                setSelectedIds(new Set());
              }
            }}
          >
            {filteredNotifications.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center px-6 pb-20 text-gray-400 dark:text-gray-600">
                <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6 animate-in zoom-in-95 duration-500">
                  <Bell size={32} className="text-gray-300 dark:text-gray-600" />
                </div>
                <p className="text-[16px] font-black text-gray-900 dark:text-white mb-2">새로운 알림이 없습니다</p>
                <p className="text-[13px] font-medium text-gray-400 dark:text-gray-500 text-center leading-relaxed">
                  약속 초대나 변경 사항이 생기면
                  <br />
                  이곳에서 알려드릴게요!
                </p>
              </div>
            ) : (
              <div className="px-6 pb-20 pt-2 space-y-3">
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
                                ? 'bg-white dark:bg-gray-900 border-blue-500 shadow-md shadow-blue-100 dark:shadow-none'
                                : noti.isRead
                                ? 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800'
                                : 'bg-blue-50/60 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800 shadow-sm'
                            }`}
                        >
                          <div className="flex gap-4 items-center">
                            {isSelectionMode && (
                              <div
                                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                  isSelected ? 'bg-blue-600 border-blue-600' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
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
                              <p
                                className={`text-[14px] leading-relaxed mb-1 ${
                                  noti.isRead ? 'text-gray-600 dark:text-gray-400 font-medium' : 'text-gray-900 dark:text-white font-bold'
                                }`}
                              >
                                {noti.message}
                              </p>
                              <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">{dayjs(noti.createdAt).fromNow()}</p>
                            </div>
                            {!noti.isRead && !isSelectionMode && <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />}
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
            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">모든 알림 삭제</h3>
            <p className="text-gray-500 dark:text-gray-400 text-[14px] mb-8 font-medium leading-relaxed">
              정말 모든 알림을 삭제하시겠습니까?
              <br />이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex flex-col gap-2">
              <button onClick={confirmDeleteAll} className="w-full py-4 bg-red-500 text-white font-bold rounded-[20px] active:scale-95 transition-all">
                모두 삭제
              </button>
              <button onClick={() => setIsDeleteAllModalOpen(false)} className="w-full py-4 text-gray-400 dark:text-gray-500 font-bold hover:text-gray-600">
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {!isSelectionMode && notifications.length > 0 && (
        <footer className="fixed bottom-0 left-0 right-0 px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-white/80 dark:bg-gray-950/80 backdrop-blur-md z-20 text-center border-t border-gray-100 dark:border-gray-800/50">
          <button onClick={handleDeleteAll} className="text-xs font-bold text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors">
            모든 알림 지우기
          </button>
        </footer>
      )}
    </div>
  );
};

export default NotificationCenter;
