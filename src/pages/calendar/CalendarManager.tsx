import React, { useState, useEffect, useMemo, useLayoutEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Users, Settings, Calendar as CalendarIcon, AlertCircle, Loader2 } from 'lucide-react';
// [추가] Firebase 관련 import
import { collection, query, where, deleteDoc, doc, arrayRemove, writeBatch } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { EditCalendarModal } from 'components';
import { TopNav } from 'components';
import { useFirestoreQuery } from 'hooks';

interface CalendarData {
  id: string;
  name: string;
  members: string[];
  isDefault: boolean;
  color: string;
  ownerId?: string; // 소유자 확인용
}

const CalendarManager = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  /**
   * 페이지가 로드될 때 스크롤을 최상단으로 이동시킵니다.
   */
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  const [user, setUser] = useState<any>(null);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [calendarToEdit, setCalendarToEdit] = useState<CalendarData | null>(null);
  const [calendarToDelete, setCalendarToDelete] = useState<CalendarData | null>(null);

  // 1. 유저 인증 상태 확인
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // [수정] useFirestoreQuery 훅으로 캘린더 목록 실시간 로딩
  const calendarsQuery = useMemo(() => {
    if (!user) return null;
    return query(collection(db, 'calendars'), where('members', 'array-contains', user.uid));
  }, [user]);

  const { data: calendarsData, loading: isLoading } = useFirestoreQuery<CalendarData>(calendarsQuery);

  // [추가] 기본 캘린더("내 캘린더")를 항상 최상단에 위치시키기 위한 정렬 로직
  const sortedCalendars = useMemo(() => {
    const calendars = calendarsData || [];
    return [...calendars].sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1; // a가 기본 캘린더면 위로
      if (!a.isDefault && b.isDefault) return 1; // b가 기본 캘린더면 위로
      return 0; // 나머지는 순서 유지
    });
  }, [calendarsData]);

  const formatMembers = (members: string[]) => {
    // 실제로는 uid를 이름으로 변환하는 과정이 필요하지만 지금은 배열 길이로 표현
    const count = members.length;
    return count <= 1 ? '나만 보기' : `나 포함 ${count}명`;
  };

  // 삭제 모달 열기
  const openDeleteModal = (calendar: CalendarData, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCalendarToDelete(calendar);
    // [수정] 캘린더 소유자인지 확인하여 삭제/나가기 모달을 분기합니다.
    if (user?.uid === calendar.ownerId) {
      setIsDeleteModalOpen(true);
    } else {
      setIsLeaveModalOpen(true);
    }
  };

  // [수정] 캘린더 삭제 확인
  const handleDeleteConfirm = async () => {
    if (!calendarToDelete) return;

    try {
      await deleteDoc(doc(db, 'calendars', calendarToDelete.id));
      // TODO: 해당 캘린더에 속한 일정(schedules)들도 삭제하는 로직 필요 (Batch 작업 등)
      toast.success('캘린더가 삭제되었습니다.');
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error('삭제 중 오류가 발생했습니다.');
    } finally {
      setIsDeleteModalOpen(false);
      setCalendarToDelete(null);
    }
  };

  // [추가] 캘린더 나가기 확인
  const handleLeaveConfirm = async () => {
    if (!calendarToDelete || !user) return;

    const calendarRef = doc(db, 'calendars', calendarToDelete.id);
    try {
      // 사용자가 마지막 멤버인 경우, 캘린더를 삭제합니다.
      if (calendarToDelete.members.length <= 1) {
        await deleteDoc(calendarRef);
        toast.success(`'${calendarToDelete.name}' 캘린더가 삭제되었습니다.`);
      } else {
        // [수정] 멤버 목록에서 자신을 제거하고 남은 멤버들에게 알림을 보냅니다.
        const batch = writeBatch(db);

        // 1. 멤버 목록에서 자신을 제거 (나가기)
        batch.update(calendarRef, {
          members: arrayRemove(user.uid),
        });

        // 2. 남은 멤버들에게 알림 전송
        const remainingMembers = calendarToDelete.members.filter((memberId) => memberId !== user.uid);
        const notificationsCollection = collection(db, 'notifications');
        remainingMembers.forEach((memberId) => {
          const newNotiRef = doc(notificationsCollection);
          batch.set(newNotiRef, {
            userId: memberId,
            type: 'CALENDAR_LEAVE', // 새로운 알림 타입
            message: `${user.displayName || '누군가'}님이 '${calendarToDelete.name}' 캘린더에서 나갔습니다.`,
            relatedId: calendarToDelete.id,
            isRead: false,
            createdAt: new Date().toISOString(),
          });
        });

        await batch.commit();
        toast.success(`'${calendarToDelete.name}' 캘린더에서 나갔습니다.`);
      }
    } catch (error) {
      console.error('캘린더 나가기 실패:', error);
      toast.error('캘린더에서 나가는 중 오류가 발생했습니다.');
    } finally {
      setIsLeaveModalOpen(false);
      setCalendarToDelete(null);
    }
  };

  const handleSwitch = (id: string) => {
    // [수정] 선택한 캘린더 ID를 state로 전달하고, 뒤로가기 스택에 남지 않도록 replace: true 사용
    navigate('/calendar', { state: { targetCalendarId: id }, replace: true });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950">
        <Loader2 className="animate-spin text-blue-500 w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-950 font-['Pretendard']">
      {/* 상단 네비게이션 */}
      <TopNav title="캘린더 관리" />

      {/* TopNav가 fixed이므로 콘텐츠가 가려지지 않도록 pt-[76px]로 상단 패딩 조정 */}
      <div ref={scrollContainerRef} className="flex-1 px-6 pt-[76px] pb-[calc(4rem+env(safe-area-inset-bottom))] overflow-y-auto w-full">
        <header className="mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-50 dark:bg-blue-500/10 rounded-xl mb-6">
            <CalendarIcon className="text-blue-600 dark:text-blue-400 w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white leading-[1.3] tracking-tight">
            나의 <span className="text-blue-600 dark:text-blue-400">캘린더</span>를 <br />
            관리해보세요
          </h2>
        </header>

        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[15px] font-black text-gray-900 dark:text-white flex items-center gap-2">
              <Users size={18} className="text-gray-400 dark:text-gray-500" /> 참여 중인 캘린더
            </h3>
            <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded-lg">{sortedCalendars.length}개</span>
          </div>

          <div className="space-y-3">
            {sortedCalendars.map((cal) => (
              <div
                key={cal.id}
                onClick={() => handleSwitch(cal.id)}
                className="group relative w-full bg-white dark:bg-gray-800 p-5 pr-3 rounded-[24px] border-2 border-gray-50 dark:border-gray-700/50 flex items-center justify-between active:scale-[0.98] transition-all hover:border-blue-100 dark:hover:border-blue-900/20 hover:shadow-lg hover:shadow-blue-50/20 dark:hover:shadow-blue-900/30 cursor-pointer"
              >
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-[18px] flex items-center justify-center shadow-sm text-white" style={{ backgroundColor: cal.color || '#3b82f6' }}>
                    <CalendarIcon size={20} />
                  </div>

                  <div className="flex flex-col justify-center pt-0.5 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-[16px] font-black text-gray-900 dark:text-white leading-none truncate">{cal.name}</h4>
                      {cal.isDefault && (
                        <span className="text-[9px] font-bold text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded-md shrink-0">기본</span>
                      )}
                    </div>
                    <p className="text-[13px] font-medium text-gray-400 dark:text-gray-500 flex items-center gap-1 min-w-0">{formatMembers(cal.members)}</p>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCalendarToEdit(cal);
                    setIsEditModalOpen(true);
                  }}
                  className="p-4 text-gray-300 dark:text-gray-600 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"
                  title="수정"
                >
                  <Settings size={18} />
                </button>
              </div>
            ))}

            <button
              onClick={() => navigate('/create-calendar')}
              className="w-full py-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-[24px] flex flex-col items-center justify-center gap-2 text-gray-400 dark:text-gray-500 hover:border-blue-300 dark:hover:border-blue-500/50 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50/30 dark:hover:bg-blue-900/20 transition-all active:scale-[0.98]"
            >
              <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center transition-colors">
                <Plus size={18} />
              </div>
              <span className="text-[13px] font-bold">새로운 캘린더 만들기</span>
            </button>
          </div>
        </section>
      </div>

      {/* 삭제 확인 모달 */}
      {isDeleteModalOpen && calendarToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-5">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsDeleteModalOpen(false)} />
          <div className="relative w-full max-w-[340px] bg-white dark:bg-gray-800 rounded-[32px] p-8 text-center shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">캘린더 삭제</h3>
            <p className="text-gray-500 dark:text-gray-400 text-[14px] mb-8 font-medium leading-relaxed">
              정말 <span className="text-gray-900 dark:text-white font-bold">'{calendarToDelete.name}'</span> 캘린더를
              <br />
              삭제하시겠습니까?
              <br />
              <span className="text-red-500 dark:text-red-400 font-bold">포함된 모든 일정이 사라집니다.</span>
            </p>
            <div className="flex flex-col gap-2">
              <button onClick={handleDeleteConfirm} className="w-full py-4 bg-red-500 text-white font-bold rounded-[20px] active:scale-95 transition-all">
                삭제하기
              </button>
              <button onClick={() => setIsDeleteModalOpen(false)} className="w-full py-4 text-gray-400 dark:text-gray-500 font-bold hover:text-gray-600 dark:hover:text-gray-300">
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* [추가] 캘린더 나가기 확인 모달 */}
      {isLeaveModalOpen && calendarToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-5">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsLeaveModalOpen(false)} />
          <div className="relative w-full max-w-[340px] bg-white dark:bg-gray-800 rounded-[32px] p-8 text-center shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-yellow-50 dark:bg-yellow-500/10 text-yellow-500 dark:text-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">캘린더 나가기</h3>
            <p className="text-gray-500 dark:text-gray-400 text-[14px] mb-8 font-medium leading-relaxed">
              정말 <span className="text-gray-900 dark:text-white font-bold">'{calendarToDelete.name}'</span> 캘린더에서
              <br />
              나가시겠습니까?
              <br />
              <span className="text-yellow-500 dark:text-yellow-400 font-bold">더 이상 이 캘린더의 일정을 볼 수 없습니다.</span>
            </p>
            <div className="flex flex-col gap-2">
              <button onClick={handleLeaveConfirm} className="w-full py-4 bg-yellow-500 text-white font-bold rounded-[20px] active:scale-95 transition-all">
                나가기
              </button>
              <button onClick={() => setIsLeaveModalOpen(false)} className="w-full py-4 text-gray-400 dark:text-gray-500 font-bold hover:text-gray-600 dark:hover:text-gray-300">
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 캘린더 수정 모달 */}
      <EditCalendarModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        calendar={calendarToEdit}
        onDelete={() => {
          setIsEditModalOpen(false);
          // 모달이 닫히는 애니메이션 시간을 고려하여 약간의 딜레이를 줍니다.
          setTimeout(() => {
            if (calendarToEdit) openDeleteModal(calendarToEdit);
          }, 150);
        }}
      />
    </div>
  );
};

export default CalendarManager;
