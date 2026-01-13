import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Plus,
  Users,
  Settings,
  Calendar as CalendarIcon,
  AlertCircle,
  Loader2,
  Home,
  Briefcase,
  GraduationCap,
  Dumbbell,
  Plane,
  Music,
  Heart,
  Star,
  Gift,
  Coffee,
  ShoppingCart,
  Gamepad2,
} from 'lucide-react';
// [추가] Firebase 관련 import
import { collection, query, where } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { EditCalendarModal, PageHeader, ConfirmModal, PageTitle, PageLayout } from 'components';
import { useFirestoreQuery } from 'hooks';
import { CalendarType } from 'contexts';
import { deleteCalendar, leaveCalendar } from 'services';

const ICON_MAP: Record<string, React.ElementType> = {
  home: Home,
  work: Briefcase,
  study: GraduationCap,
  workout: Dumbbell,
  travel: Plane,
  music: Music,
  love: Heart,
  star: Star,
  gift: Gift,
  food: Coffee,
  shopping: ShoppingCart,
  game: Gamepad2,
};

const CalendarManager = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [calendarToEdit, setCalendarToEdit] = useState<CalendarType | null>(null);
  const [calendarToDelete, setCalendarToDelete] = useState<CalendarType | null>(null);

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

  const { data: calendarsData, loading: isLoading } = useFirestoreQuery<CalendarType>(calendarsQuery);

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
  const openDeleteModal = (calendar: CalendarType, e?: React.MouseEvent) => {
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
      await deleteCalendar(calendarToDelete.id);
      toast.success('캘린더와 포함된 일정이 모두 삭제되었습니다.');
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

    try {
      await leaveCalendar(calendarToDelete as any, user);

      // [수정] 커스텀 이름 반영
      const displayName = (calendarToDelete as any).customNames?.[user.uid] || calendarToDelete.name;

      // 사용자가 마지막 멤버인 경우, 캘린더를 삭제합니다.
      if (calendarToDelete.members.length <= 1) {
        toast.success(`'${displayName}' 캘린더가 삭제되었습니다.`);
      } else {
        toast.success(`'${displayName}' 캘린더에서 나갔습니다.`);
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
        <Loader2 className="animate-spin text-[#007AFF] w-8 h-8" />
      </div>
    );
  }

  return (
    <PageLayout title="캘린더 관리">
      <div className="pb-16">
        <PageHeader icon={<CalendarIcon className="text-[#007AFF] w-6 h-6" />}>
          <PageTitle>
            나의 <span className="text-[#007AFF]">캘린더</span>를 <br />
            관리해보세요
          </PageTitle>
        </PageHeader>

        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[15px] font-black text-[#191F28] dark:text-white flex items-center gap-2">
              <Users size={18} className="text-[#8B95A1] dark:text-gray-500" /> 참여 중인 캘린더
            </h3>
            <span className="text-[11px] font-bold text-[#8B95A1] dark:text-gray-500 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded-lg">{sortedCalendars.length}개</span>
          </div>

          <div className="space-y-3">
            {sortedCalendars.map((cal) => {
              const IconComponent = cal.icon && ICON_MAP[cal.icon] ? ICON_MAP[cal.icon] : CalendarIcon;
              // [추가] customNames가 있으면 내 uid에 맞는 이름을 우선 사용
              const displayName = (cal as any).customNames?.[user?.uid] || cal.name;
              return (
                <div
                  key={cal.id}
                  onClick={() => handleSwitch(cal.id)}
                  className="group relative w-full bg-white dark:bg-gray-800 p-5 pr-3 rounded-[24px] border-2 border-gray-50 dark:border-gray-700/50 flex items-center justify-between active:scale-[0.98] transition-all hover:border-[#007AFF]/50 dark:hover:border-[#007AFF]/20 hover:shadow-lg hover:shadow-[#007AFF]/20 cursor-pointer"
                >
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-[18px] flex items-center justify-center shadow-sm text-white" style={{ backgroundColor: cal.color || '#007AFF' }}>
                      <IconComponent size={20} />
                    </div>

                    <div className="flex flex-col justify-center pt-0.5 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-[16px] font-black text-[#191F28] dark:text-white leading-none truncate">{displayName}</h4>
                        {cal.isDefault && <span className="text-[9px] font-bold text-[#007AFF] bg-[#007AFF]/20 px-1.5 py-0.5 rounded-md shrink-0">기본</span>}
                      </div>
                      <p className="text-[13px] font-medium text-[#8B95A1] dark:text-gray-500 flex items-center gap-1 min-w-0">{formatMembers(cal.members)}</p>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCalendarToEdit(cal);
                      setIsEditModalOpen(true);
                    }}
                    className="p-4 text-[#8B95A1] dark:text-gray-600 hover:text-[#007AFF] hover:bg-[#007AFF]/20 rounded-xl transition-all"
                    title="수정"
                  >
                    <Settings size={18} />
                  </button>
                </div>
              );
            })}

            <button
              onClick={() => navigate('/create-calendar')}
              className="w-full py-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-[24px] flex flex-col items-center justify-center gap-2 text-[#8B95A1] dark:text-gray-500 hover:border-[#007AFF] hover:text-[#007AFF] hover:bg-[#007AFF]/20 transition-all active:scale-[0.98]"
            >
              <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center transition-colors">
                <Plus size={18} />
              </div>
              <span className="text-[13px] font-bold">새로운 캘린더 만들기</span>
            </button>
          </div>
        </section>

        {/* 삭제 확인 모달 */}
        {calendarToDelete && (
          <ConfirmModal
            isOpen={isDeleteModalOpen}
            onClose={() => setIsDeleteModalOpen(false)}
            onConfirm={handleDeleteConfirm}
            icon={<AlertCircle size={32} />}
            iconContainerClassName="bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400"
            title="캘린더 삭제"
            message={
              <>
                정말 <span className="text-[#191F28] dark:text-white font-bold">'{(calendarToDelete as any).customNames?.[user?.uid] || calendarToDelete.name}'</span> 캘린더를
                삭제하시겠습니까?
                <br />
                <span className="text-red-500 dark:text-red-400 font-bold">포함된 모든 일정이 사라집니다.</span>
              </>
            }
            confirmText="삭제하기"
            confirmButtonClassName="bg-red-500"
          />
        )}

        {/* [추가] 캘린더 나가기 확인 모달 */}
        {calendarToDelete && (
          <ConfirmModal
            isOpen={isLeaveModalOpen}
            onClose={() => setIsLeaveModalOpen(false)}
            onConfirm={handleLeaveConfirm}
            icon={<AlertCircle size={32} />}
            iconContainerClassName="bg-yellow-50 dark:bg-yellow-500/10 text-yellow-500 dark:text-yellow-400"
            title="캘린더 나가기"
            message={
              <>
                정말 <span className="text-[#191F28] dark:text-white font-bold">'{(calendarToDelete as any).customNames?.[user?.uid] || calendarToDelete.name}'</span> 캘린더에서
                나가시겠습니까?
                <br />
                <span className="text-yellow-500 dark:text-yellow-400 font-bold">더 이상 이 캘린더의 일정을 볼 수 없습니다.</span>
              </>
            }
            confirmText="나가기"
            confirmButtonClassName="bg-yellow-500"
          />
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
    </PageLayout>
  );
};

export default CalendarManager;
