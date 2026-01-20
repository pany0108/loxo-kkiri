import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import dayjs from 'dayjs'; // Keep dayjs import
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import { Check, ImageIcon, BookOpen, Trash2, Pencil } from 'lucide-react';
import {
  PageLayout,
  RecurrenceSettings,
  DeleteRecurringModal,
  ConfirmModal,
  PageHeader,
  PageTitle,
  FormTextarea,
  LoadingButton,
  LocationSelectModal,
  EditRecurringModal,
} from 'components';
import { doc, updateDoc, deleteDoc, arrayUnion, writeBatch, collection, addDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { useCalendar } from 'contexts';
import { onAuthStateChanged } from 'firebase/auth';
import { notifyScheduleUpdated } from 'services';
import ScheduleForm from '../../components/calendar/ScheduleForm';
dayjs.extend(isSameOrAfter); // [추가] dayjs 플러그인 활성화

interface Attachment {
  name: string;
  type: 'image' | 'doc';
  url?: string;
}

/**
 * 수정할 일정 데이터 인터페이스
 */
interface EventDataState {
  id: string;
  title: string;
  calendarId: string;
  allDay: boolean;
  start: string; // ISO String
  end: string; // ISO String
  location?: string;
  content?: string;
  notification?: string;
  review?: string;
  reviewImages?: string[];
  files?: Attachment[];
  recurrence?: RecurrenceSettings;
  attendees?: string[]; // 이 페이지에서는 직접 사용하지 않지만, 타입 정의에 포함
  color?: string;
  isAnniversary?: boolean;
  isLunar?: boolean;
  isLeapMonth?: boolean;
}

/**
 * 일정 수정 페이지 컴포넌트
 * - 기존 일정 정보를 불러와 수정하거나 삭제할 수 있습니다.
 * - 반복 일정의 경우 단일/향후/전체 수정 옵션을 제공합니다.
 */
const ScheduleEdit = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const eventData = (location.state as EventDataState) || null;
  const { myCalendars } = useCalendar();

  // --- [추가] 상태 관리 ---
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const [isCalListOpen, setIsCalListOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSimpleDeleteModalOpen, setIsSimpleDeleteModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isEditRecurringModalOpen, setIsEditRecurringModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // 초기 상태 설정
  const [formData, setFormData] = useState({
    title: eventData?.title || '',
    calendarId: eventData?.calendarId || '',
    isAllDay: eventData?.allDay || false,
    start: eventData?.start ? dayjs(eventData.start).format('YYYY-MM-DDTHH:mm') : dayjs().format('YYYY-MM-DDTHH:mm'),
    end: eventData?.end ? dayjs(eventData.end).format('YYYY-MM-DDTHH:mm') : dayjs().add(1, 'hour').format('YYYY-MM-DDTHH:mm'),
    location: eventData?.location || '',
    content: eventData?.content || '',
    notification: eventData?.notification || 'none',
    review: eventData?.review || '',
    reviewImages: eventData?.reviewImages || [],
    color: eventData?.color || '#007AFF',
    isAnniversary: eventData?.isAnniversary || false,
    isLunar: eventData?.isLunar || false,
    isLeapMonth: eventData?.isLeapMonth || false,
  });

  const [attachments] = useState<Attachment[]>(eventData?.files || [{ name: 'menu.pdf', type: 'doc' }]);

  const [recurrence, setRecurrence] = useState<RecurrenceSettings>(
    eventData?.recurrence || {
      frequency: 'none',
      interval: 1,
      daysOfWeek: [],
      monthlyType: 'date',
      endType: 'none',
      endDate: dayjs().add(1, 'month').format('YYYY-MM-DD'),
      endCount: 10,
    },
  );

  const selectedCalendar = myCalendars.find((c) => c.id === formData.calendarId);
  const isShared = selectedCalendar ? selectedCalendar.members.length > 1 : false;
  const isPastEvent = dayjs().isAfter(formData.end);

  const sortedCalendars = React.useMemo(() => {
    return [...myCalendars].sort((a, b) => {
      if (selectedCalendar && a.id === selectedCalendar.id) return -1;
      if (selectedCalendar && b.id === selectedCalendar.id) return 1;
      if (a.isDefault) return -1;
      if (b.isDefault) return 1;
      return 0;
    });
  }, [myCalendars, selectedCalendar]);

  const handleCalendarSelect = (calendar: any) => {
    setFormData((prev) => ({
      ...prev,
      calendarId: calendar.id,
      color: calendar.color || '#007AFF',
    }));
    setIsCalListOpen(false);
  };

  /** 삭제 버튼 클릭 핸들러 */
  const handleDeleteClick = async () => {
    // 1. 반복 일정이 아니면 바로 삭제 컨펌
    if (!recurrence || recurrence.frequency === 'none') {
      setIsSimpleDeleteModalOpen(true);
      return;
    }
    // 2. 반복 일정이면 모달 띄우기
    setIsDeleteModalOpen(true);
  };

  const getDocId = () => eventData?.id || location.pathname.split('/').pop();

  /** 전체 삭제 핸들러 */
  const deleteEntireSchedule = async () => {
    try {
      const docId = getDocId();
      if (docId) {
        await deleteDoc(doc(db, 'schedules', docId));
        toast.success('일정이 삭제되었습니다.');
        navigate('/calendar');
      }
    } catch (error) {
      console.error('삭제 실패:', error);
      toast.error('삭제 중 오류가 발생했습니다.');
    }
  };

  /** 현재 일정만 삭제 핸들러 */
  const deleteOnlyThis = async () => {
    try {
      const docId = getDocId();
      if (docId) {
        const dateToDelete = dayjs(formData.start).format('YYYY-MM-DD');
        await updateDoc(doc(db, 'schedules', docId), {
          'recurrence.exceptions': arrayUnion(dateToDelete),
        });
        toast.success('해당 날짜의 일정이 삭제되었습니다.');
        navigate('/calendar');
      }
    } catch (error) {
      console.error('개별 삭제 실패:', error);
      toast.error('삭제 중 오류가 발생했습니다.');
    }
  };

  /** 향후 일정 모두 삭제 핸들러 */
  const deleteFollowing = async () => {
    try {
      const docId = getDocId();
      if (docId) {
        const newEndDate = dayjs(formData.start).subtract(1, 'day').format('YYYY-MM-DD');
        await updateDoc(doc(db, 'schedules', docId), {
          'recurrence.endType': 'date',
          'recurrence.endDate': newEndDate,
        });
        toast.success('이후 일정이 모두 삭제되었습니다.');
        navigate('/calendar');
      }
    } catch (error) {
      console.error('향후 일정 삭제 실패:', error);
      toast.error('삭제 중 오류가 발생했습니다.');
    }
  };

  // --- 핸들러 ---

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const newData = { ...prev, [name]: value };

      // 종일이 아닐 때, 시작 시간을 변경하면 종료 시간을 조정
      if (!newData.isAllDay) {
        if (name === 'start') {
          const isInitialTime = dayjs(prev.start).isSame(dayjs(prev.end));
          const isStartTimeAfterEndTime = dayjs(value).isSameOrAfter(dayjs(prev.end));

          if (isInitialTime || isStartTimeAfterEndTime) {
            newData.end = dayjs(value).add(1, 'hour').format('YYYY-MM-DDTHH:mm');
          }
        } else if (name === 'end') {
          // 종료 시간이 시작 시간보다 빠를 경우 다음날로 자동 이동
          const startTime = dayjs(prev.start);
          const newEndTime = dayjs(value);

          if (newEndTime.isValid() && startTime.isValid() && newEndTime.isBefore(startTime)) {
            newData.end = newEndTime.add(1, 'day').format('YYYY-MM-DDTHH:mm');
          }
        }
      }
      return newData;
    });
  };

  const handleToggleAllDay = () => {
    setFormData((prev) => {
      const nextIsAllDay = !prev.isAllDay;
      return {
        ...prev,
        isAllDay: nextIsAllDay,
        // 종일 옵션을 켜면 시간을 00:00 ~ 23:59로 설정하고, 끄면 기본 시간으로 되돌립니다.
        start: nextIsAllDay ? dayjs(prev.start).startOf('day').format('YYYY-MM-DDTHH:mm') : dayjs(prev.start).format('YYYY-MM-DDT09:00'),
        end: nextIsAllDay ? dayjs(prev.start).endOf('day').format('YYYY-MM-DDTHH:mm') : dayjs(prev.start).format('YYYY-MM-DDT10:00'),
      };
    });
  };

  const handleAnniversaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setFormData((prev) => {
      const newData = { ...prev, isAnniversary: checked };
      if (checked) {
        newData.isLunar = false;
        newData.isLeapMonth = false;
        if (!prev.isAllDay) {
          newData.isAllDay = true;
          newData.start = dayjs(prev.start).startOf('day').format('YYYY-MM-DDTHH:mm');
          newData.end = dayjs(prev.start).endOf('day').format('YYYY-MM-DDTHH:mm');
        }
      }
      return newData;
    });
  };

  const handleLunarChange = (isLunarValue: boolean) => {
    setFormData((prev) => ({ ...prev, isLunar: isLunarValue }));
  };

  const handleSaveClick = () => {
    if (isSubmitting) return;
    // 반복 일정이면 모달 띄우기
    if (recurrence.frequency !== 'none') {
      setIsEditRecurringModalOpen(true);
    } else {
      // 반복 일정이 아니면 바로 저장 (기존 로직 - editAllSchedule과 동일하게 처리)
      editAllSchedule();
    }
  };

  /** 이 일정만 수정 핸들러 */
  const editOneSchedule = async () => {
    try {
      setIsSubmitting(true);
      const docId = getDocId();
      if (!docId || !eventData) return;

      const batch = writeBatch(db);
      const originalRef = doc(db, 'schedules', docId);

      // 1. 원본 일정에 예외 날짜 추가 (원래 인스턴스의 날짜)
      const originalDate = dayjs(eventData.start).format('YYYY-MM-DD');
      batch.update(originalRef, {
        'recurrence.exceptions': arrayUnion(originalDate),
      });

      // 2. 새로운 단일 일정 생성
      const newScheduleRef = doc(collection(db, 'schedules'));
      const newScheduleData = {
        ...formData,
        recurrence: { frequency: 'none', interval: 1, daysOfWeek: [], monthlyType: 'date', endType: 'none', endDate: '', endCount: 0 }, // 반복 없음
        attendees: selectedCalendar?.members || (user ? [user.uid] : []),
        userId: user?.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      batch.set(newScheduleRef, newScheduleData);

      await batch.commit();
      toast.success('이 일정만 수정되었습니다.');
      navigate(-1);
    } catch (error) {
      console.error(error);
      toast.error('수정 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
      setIsEditRecurringModalOpen(false);
    }
  };

  /** 향후 일정 수정 핸들러 */
  const editFollowingSchedules = async () => {
    try {
      setIsSubmitting(true);
      const docId = getDocId();
      if (!docId || !eventData) return;

      const batch = writeBatch(db);
      const originalRef = doc(db, 'schedules', docId);

      // 1. 원본 일정 종료 (어제 날짜로 종료)
      const originalInstanceDate = dayjs(eventData.start);
      const stopDate = originalInstanceDate.subtract(1, 'day').format('YYYY-MM-DD');

      batch.update(originalRef, {
        'recurrence.endType': 'date',
        'recurrence.endDate': stopDate,
      });

      // 새 일정은 이전의 예외 날짜 기록을 가지지 않아야 합니다.
      const newRecurrence = {
        ...recurrence,
        exceptions: [],
      };

      // 2. 새로운 반복 일정 생성 (현재 설정된 값으로 시작)
      const newScheduleRef = doc(collection(db, 'schedules'));
      const newScheduleData = {
        ...formData,
        recurrence: newRecurrence, // 현재 폼의 반복 설정 사용 (예외 초기화)
        attendees: selectedCalendar?.members || (user ? [user.uid] : []),
        userId: user?.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      batch.set(newScheduleRef, newScheduleData);

      await batch.commit();
      toast.success('향후 일정이 수정되었습니다.');
      navigate(-1);
    } catch (error) {
      console.error(error);
      toast.error('수정 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
      setIsEditRecurringModalOpen(false);
    }
  };

  /** 모든 일정 수정 핸들러 */
  const editAllSchedule = async () => {
    try {
      setIsSubmitting(true);
      const docId = getDocId();
      if (docId) {
        // 저장 시점에 선택된 캘린더의 멤버를 참석자로 설정합니다.
        const attendees = selectedCalendar?.members || (user ? [user.uid] : []);

        const scheduleUpdateData: any = {
          ...formData,
          attendees,
          recurrence,
        };

        // 반복 일정 수정 시, 시리즈의 시작 시간은 변경하지 않습니다.
        if (eventData?.recurrence && eventData.recurrence.frequency !== 'none') {
          delete scheduleUpdateData.start;
          delete scheduleUpdateData.end;
        }

        await updateDoc(doc(db, 'schedules', docId!), scheduleUpdateData);

        // 공유 캘린더 일정 수정 시 멤버들에게 알림 전송
        if (attendees.length > 1) {
          const batch = writeBatch(db);
          const editorName = user?.displayName || '누군가';

          for (const memberId of attendees) {
            // 일정을 수정한 본인에게는 알림을 보내지 않음
            if (memberId === user?.uid) continue;

            await notifyScheduleUpdated(batch, {
              memberId,
              editorName,
              calendarName: selectedCalendar?.name || '공유',
              scheduleTitle: formData.title,
              scheduleId: docId,
              calendarId: selectedCalendar?.id || '',
            });
          }

          await batch.commit();
        }
        toast.success('수정되었습니다.');
        navigate(-1); // 뒤로 가기
      }
    } catch (error) {
      console.error('수정 실패:', error);
      toast.error('수정 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
      setIsEditRecurringModalOpen(false);
    }
  };

  return (
    <>
      <PageLayout
        title="일정 수정"
        onBack={() => navigate(-1)}
        extraNav={
          <LoadingButton onClick={handleSaveClick} isLoading={isSubmitting} className="p-2 text-primary hover:text-primary/80 transition-colors">
            <Check size={28} strokeWidth={3} />
          </LoadingButton>
        }
      >
        <>
          <PageHeader icon={<Pencil className="text-primary w-6 h-6" />}>
            <PageTitle>
              일정을 <span className="text-primary">수정</span>해볼까요?
            </PageTitle>
          </PageHeader>

          <form className="space-y-6">
            <ScheduleForm
              formData={formData}
              handleChange={handleChange}
              handleToggleAllDay={handleToggleAllDay}
              handleAnniversaryChange={handleAnniversaryChange}
              handleLunarChange={handleLunarChange}
              recurrence={recurrence}
              setRecurrence={setRecurrence}
              myCalendars={myCalendars}
              selectedCalendar={selectedCalendar}
              isCalListOpen={isCalListOpen}
              setIsCalListOpen={setIsCalListOpen}
              handleCalendarSelect={handleCalendarSelect}
              currentUser={user}
              navigate={navigate}
              openMapModal={() => setIsMapModalOpen(true)}
              dropdownRef={dropdownRef}
              isEditMode={true}
            />

            {!isShared && isPastEvent && (
              <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <BookOpen size={20} className="text-emerald-500" />
                  <h3 className="text-[16px] font-black text-main dark:text-white">후기 작성</h3>
                </div>
                <div className="bg-white dark:bg-gray-800/50 border-2 border-dashed border-emerald-100 dark:border-emerald-900/50 rounded-3xl p-5 space-y-4 focus-within:border-emerald-400 dark:focus-within:border-emerald-600 transition-colors">
                  <FormTextarea
                    placeholder="후기를 작성해주세요."
                    value={formData.review}
                    onChange={(e) => setFormData({ ...formData, review: e.target.value })}
                    containerClassName="border-none p-0"
                    className="min-h-[100px]"
                  />
                  <div className="flex justify-end border-t border-emerald-50 dark:border-emerald-900/50 pt-3">
                    <button
                      type="button"
                      onClick={() => toast('후기 사진 추가 기능은 준비중입니다.')}
                      className="flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 rounded-xl text-[12px] font-bold hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors"
                    >
                      <ImageIcon size={14} /> 사진 추가
                    </button>
                  </div>
                </div>
              </div>
            )}
          </form>
          <footer className="pt-8 mt-8 border-t border-gray-100 dark:border-gray-800 flex flex-col items-center gap-4">
            <button
              type="button"
              onClick={handleDeleteClick}
              className="w-full text-center text-sm font-bold text-red-500 dark:text-red-500/80 hover:text-red-700 dark:hover:text-red-400 transition-colors py-3 flex items-center justify-center gap-2"
            >
              <Trash2 size={14} /> 이 일정 삭제하기
            </button>
          </footer>
        </>
      </PageLayout>

      {isDeleteModalOpen && (
        <DeleteRecurringModal onClose={() => setIsDeleteModalOpen(false)} onDeleteOne={deleteOnlyThis} onDeleteFollowing={deleteFollowing} onDeleteAll={deleteEntireSchedule} />
      )}

      {isEditRecurringModalOpen && (
        <EditRecurringModal onClose={() => setIsEditRecurringModalOpen(false)} onEditOne={editOneSchedule} onEditFollowing={editFollowingSchedules} onEditAll={editAllSchedule} />
      )}

      {/* [수정] 일반 일정 삭제 확인 모달 컴포넌트화 */}
      <ConfirmModal
        isOpen={isSimpleDeleteModalOpen}
        onClose={() => setIsSimpleDeleteModalOpen(false)}
        onConfirm={deleteEntireSchedule}
        icon={<Trash2 size={32} />}
        iconContainerClassName="bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400"
        title="일정 삭제"
        message={
          <>
            정말 이 일정을 삭제하시겠습니까?
            <br />
            삭제된 일정은 복구할 수 없습니다.
          </>
        }
        confirmText="삭제하기"
        confirmButtonClassName="bg-red-500"
      />

      <LocationSelectModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        onSelect={(loc) => {
          setFormData((prev) => ({ ...prev, location: loc }));
          setIsMapModalOpen(false);
        }}
        initialLocation={formData.location}
      />
    </>
  );
};

export default ScheduleEdit;
