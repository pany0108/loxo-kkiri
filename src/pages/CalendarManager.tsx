import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Users, ChevronLeft, Settings, Calendar as CalendarIcon, AlertCircle, Loader2 } from 'lucide-react';
// [추가] Firebase 관련 import
import { collection, query, where, deleteDoc, doc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { EditCalendarModal } from '../components';
import { useFirestoreQuery } from '../hooks/useFirestore';

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
  const [user, setUser] = useState<any>(null);
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
  const calendars = calendarsData || [];

  const formatMembers = (members: string[]) => {
    // 실제로는 uid를 이름으로 변환하는 과정이 필요하지만 지금은 배열 길이로 표현
    const count = members.length;
    return count <= 1 ? '나만 보기' : `나 포함 ${count}명`;
  };

  // 삭제 모달 열기
  const openDeleteModal = (calendar: CalendarData, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCalendarToDelete(calendar);
    setIsDeleteModalOpen(true);
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

  const handleSwitch = (id: string) => {
    // 여기서 선택한 캘린더 ID를 전역 상태나 로컬 스토리지에 저장하여
    // CalendarMain에서 해당 캘린더의 일정만 보여주도록 해야 함.
    // 지금은 단순히 캘린더 메인으로 이동
    navigate('/calendar');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950">
        <Loader2 className="animate-spin text-blue-500 w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white font-['Pretendard']">
      <nav className="px-6 pt-6 flex items-center sticky top-0 bg-white/80 backdrop-blur-md z-10">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-400 hover:text-gray-900 transition-colors active:scale-90" aria-label="뒤로 가기">
          <ChevronLeft size={28} />
        </button>
      </nav>

      <div className="flex-1 px-6 pt-4 pb-24 overflow-y-auto w-full">
        <header className="mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-50 rounded-xl mb-6">
            <CalendarIcon className="text-blue-600 w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 leading-[1.3] tracking-tight">
            나의 <span className="text-blue-600">캘린더</span>를 <br />
            관리해보세요
          </h2>
        </header>

        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[15px] font-black text-gray-900 flex items-center gap-2">
              <Users size={18} className="text-gray-400" /> 참여 중인 캘린더
            </h3>
            <span className="text-[11px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">{calendars.length}개</span>
          </div>

          <div className="space-y-3">
            {calendars.map((cal) => (
              <div
                key={cal.id}
                onClick={() => handleSwitch(cal.id)}
                className="group relative w-full bg-white p-5 rounded-[24px] border-2 border-gray-50 flex items-start justify-between active:scale-[0.98] transition-all hover:border-blue-100 hover:shadow-lg hover:shadow-blue-50/20 cursor-pointer"
              >
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-[18px] flex items-center justify-center shadow-sm text-white" style={{ backgroundColor: cal.color || '#3b82f6' }}>
                    <CalendarIcon size={20} />
                  </div>

                  <div className="flex flex-col pt-0.5 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-[16px] font-black text-gray-900 leading-none truncate">{cal.name}</h4>
                      {cal.isDefault && <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md shrink-0">기본</span>}
                    </div>
                    <p className="text-[13px] font-medium text-gray-400 flex items-center gap-1 min-w-0">{formatMembers(cal.members)}</p>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCalendarToEdit(cal);
                    setIsEditModalOpen(true);
                  }}
                  className="p-2 text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                  title="수정"
                >
                  <Settings size={18} />
                </button>
              </div>
            ))}

            <button
              onClick={() => navigate('/create-calendar')}
              className="w-full h-[80px] border-2 border-dashed border-gray-200 rounded-[24px] flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50/30 transition-all active:scale-[0.98]"
            >
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center transition-colors">
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
          <div className="relative w-full max-w-[340px] bg-white rounded-[32px] p-8 text-center shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">캘린더 삭제</h3>
            <p className="text-gray-500 text-[14px] mb-8 font-medium leading-relaxed">
              정말 <span className="text-gray-900 font-bold">'{calendarToDelete.name}'</span> 캘린더를
              <br />
              삭제하시겠습니까?
              <br />
              <span className="text-red-500 font-bold">포함된 모든 일정이 사라집니다.</span>
            </p>
            <div className="flex flex-col gap-2">
              <button onClick={handleDeleteConfirm} className="w-full py-4 bg-red-500 text-white font-bold rounded-[20px] active:scale-95 transition-all">
                삭제하기
              </button>
              <button onClick={() => setIsDeleteModalOpen(false)} className="w-full py-4 text-gray-400 font-bold hover:text-gray-600">
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
          openDeleteModal(calendarToEdit!);
        }}
      />
    </div>
  );
};

export default CalendarManager;
