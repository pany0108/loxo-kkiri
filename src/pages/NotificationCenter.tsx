import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc, updateDoc, writeBatch, getDoc, deleteDoc, setDoc, QuerySnapshot, QueryDocumentSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { ChevronLeft, Bell, Check, Trash2, Calendar, Info, CheckCircle2, X, Loader2, ClipboardList, BellRing, FileCheck } from 'lucide-react';
import dayjs from 'dayjs';
import toast, { Toast } from 'react-hot-toast';
import { motion, AnimatePresence, AnimatePresenceProps, useDragControls, PanInfo } from 'framer-motion';
import 'dayjs/locale/ko';
import relativeTime from 'dayjs/plugin/relativeTime';
import { onAuthStateChanged } from 'firebase/auth';

dayjs.extend(relativeTime);
dayjs.locale('ko');

interface Notification {
  id: string;
  userId: string;
  type: string;
  message: string;
  relatedId?: string;
  isRead: boolean;
  createdAt: string;
}

const TABS = [
  { id: 'all', label: '전체' },
  { id: 'MEETING_INVITE', label: '초대' },
  { id: 'MEETING_VOTING_STARTED', label: '투표' },
  { id: 'MEETING_VOTING_COMPLETE_FOR_HOST', label: '확정 요청' },
  { id: 'MEETING_VOTING_COMPLETE_FOR_PARTICIPANT', label: '투표 완료' },
  { id: 'MEETING_CONFIRMED', label: '확정' },
  { id: 'MEETING_URGE', label: '재촉' },
  { id: 'MEETING_CANCELED', label: '취소' },
];

// [수정] framer-motion과 @types/react 버전 호환성 문제로 인한 타입 에러 해결
const SafeAnimatePresence = AnimatePresence as React.FC<React.PropsWithChildren<AnimatePresenceProps>>;

const NotificationCenter = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragControls = useDragControls();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser: any) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    // Firestore 인덱스 없이 작동하도록 클라이언트 사이드 정렬 사용 (userId로만 필터링)
    const q = query(collection(db, 'notifications'), where('userId', '==', user.uid));

    const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot) => {
      const notis = snapshot.docs.map((doc: QueryDocumentSnapshot) => ({
        id: doc.id,
        ...doc.data(),
      })) as Notification[];

      // 최신순 정렬
      notis.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setNotifications(notis);
    });

    return () => unsubscribe();
  }, [user]);

  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'all') {
      return notifications;
    }
    return notifications.filter((n: Notification) => n.type === activeFilter);
  }, [notifications, activeFilter]);

  const handleNotificationClick = async (notification: Notification) => {
    // [추가] 선택 모드일 때의 클릭 동작
    if (isSelectionMode) {
      setSelectedIds((prev: Set<string>) => {
        const newSet = new Set(prev);
        if (newSet.has(notification.id)) {
          newSet.delete(notification.id);
        } else {
          newSet.add(notification.id);
        }
        return newSet;
      });
      return;
    }

    // 읽음 처리
    if (!notification.isRead) {
      try {
        await updateDoc(doc(db, 'notifications', notification.id), { isRead: true });
      } catch (e) {
        console.error(e);
      }
    }

    // [수정] 관련 페이지로 이동 로직 개선
    if (notification.relatedId) {
      // 약속 관련 알림일 경우에만 DB에서 상태를 확인합니다.
      // [수정] 투표 완료 알림은 DB 조회 없이 바로 이동
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
              // [수정] 주최자도 투표를 해야 하므로, 모두 투표 화면으로 이동
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

  const handleMarkAllAsRead = async () => {
    const unreadNotis = notifications.filter((n: Notification) => !n.isRead);
    if (unreadNotis.length === 0) return;

    const batch = writeBatch(db);
    unreadNotis.forEach((noti: Notification) => {
      const ref = doc(db, 'notifications', noti.id);
      batch.update(ref, { isRead: true });
    });
    await batch.commit();
    toast.success('모든 알림을 읽음 처리했습니다.');
  };

  const handleMarkSelectedAsRead = async () => {
    if (selectedIds.size === 0) return;

    const batch = writeBatch(db);
    selectedIds.forEach((id) => {
      const noti = notifications.find((n) => n.id === id);
      if (noti && !noti.isRead) {
        const ref = doc(db, 'notifications', id);
        batch.update(ref, { isRead: true });
      }
    });
    await batch.commit();
    toast.success(`${selectedIds.size}개의 알림을 읽음 처리했습니다.`);

    // 선택 모드 종료
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleDeleteAll = async () => {
    if (notifications.length === 0) return;
    if (!window.confirm('모든 알림을 삭제하시겠습니까?')) return;

    const batch = writeBatch(db);
    notifications.forEach((noti: Notification) => {
      const ref = doc(db, 'notifications', noti.id);
      batch.delete(ref);
    });
    await batch.commit();
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    const notificationsToDelete = notifications.filter((n: Notification) => selectedIds.has(n.id));

    const batch = writeBatch(db);
    selectedIds.forEach((id) => {
      const ref = doc(db, 'notifications', id);
      batch.delete(ref);
    });
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
              notificationsToDelete.forEach((n: Notification) => {
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
    const allInFilterSelected = filteredNotifications.length > 0 && filteredNotifications.every((n: Notification) => selectedIds.has(n.id));
    const currentFilterIds = new Set(filteredNotifications.map((n: Notification) => n.id));

    if (allInFilterSelected) {
      // Deselect all visible
      setSelectedIds((prev: Set<string>) => {
        const newSet = new Set(prev);
        currentFilterIds.forEach((id: string) => newSet.delete(id));
        return newSet;
      });
    } else {
      // Select all visible
      setSelectedIds((prev: Set<string>) => new Set([...Array.from(prev), ...Array.from(currentFilterIds)]));
    }
  };

  const handleRefresh = () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    // onSnapshot이 실시간으로 데이터를 가져오므로, 여기서는 시각적 피드백만 제공합니다.
    toast
      .promise(new Promise<void>((resolve) => setTimeout(resolve, 1200)), {
        loading: '새로운 알림을 확인합니다...',
        success: <b>알림 목록이 최신입니다!</b>,
        error: <b>새로고침에 실패했습니다.</b>,
      })
      .finally(() => {
        setIsRefreshing(false);
      });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const target = e.currentTarget as HTMLDivElement;
    // 스크롤이 최상단에 있을 때만 드래그를 시작합니다.
    if (target.scrollTop === 0) {
      dragControls.start(e);
    }
  };

  const allInFilterSelected = useMemo(() => filteredNotifications.length > 0 && filteredNotifications.every((n) => selectedIds.has(n.id)), [filteredNotifications, selectedIds]);

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
      default:
        return <Bell size={20} className="text-gray-500" />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-950 font-['Pretendard']">
      {/* [수정] 선택 모드에 따라 다른 네비게이션 바 렌더링 */}
      {isSelectionMode ? (
        <nav className="px-6 pt-6 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md z-10 pb-4 animate-in fade-in duration-200">
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
            <button onClick={handleSelectAll} className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline" disabled={filteredNotifications.length === 0}>
              {allInFilterSelected ? '전체 해제' : '전체 선택'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <>
                <button
                  onClick={handleMarkSelectedAsRead}
                  className="p-2 text-blue-600 dark:text-blue-400 text-sm font-bold hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                >
                  모두읽음
                </button>
                <button onClick={handleDeleteSelected} className="p-2 text-red-500 text-sm font-bold hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                  삭제
                </button>
              </>
            )}
          </div>
        </nav>
      ) : (
        <nav className="px-6 pt-6 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md z-10 pb-4">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
              <ChevronLeft size={28} />
            </button>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">알림 센터</h1>
          </div>
        </nav>
      )}

      {/* [추가] 필터 탭 */}
      {!isSelectionMode && (
        <div className="px-6 pb-4 sticky top-[88px] bg-white/80 dark:bg-gray-950/80 backdrop-blur-md z-10">
          <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-[16px]">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`flex-1 py-2.5 rounded-[12px] text-[13px] font-bold transition-all ${
                  activeFilter === tab.id ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 px-6 pb-20 overflow-y-auto">
        {filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[60vh] text-gray-400 dark:text-gray-600">
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
          <div className="space-y-3">
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
                      onClick={() => handleNotificationClick(noti)}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      className={`relative p-5 ring-2 ring-inset transition-all cursor-pointer z-10 rounded-[24px]
                                ${
                                  isSelected
                                    ? 'bg-white dark:bg-gray-900 border-blue-500 shadow-md shadow-blue-100 dark:shadow-none'
                                    : noti.isRead
                                    ? 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800'
                                    : 'bg-blue-50/60 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800 shadow-sm'
                                }
                            `}
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
                          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 
                                ${noti.isRead ? 'bg-gray-100 dark:bg-gray-800' : 'bg-white dark:bg-gray-800 shadow-sm'}
                            `}
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
  );
};

export default NotificationCenter;
