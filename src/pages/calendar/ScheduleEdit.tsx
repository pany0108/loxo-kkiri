import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import dayjs from 'dayjs'; // Keep dayjs import
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import {
  MapPin,
  AlignLeft,
  Clock,
  Bell,
  X,
  Check,
  ImageIcon,
  Paperclip,
  BookOpen,
  Sparkles,
  ChevronDown,
  Plus,
  Camera,
  Trash2,
  Calendar as CalendarIcon,
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
import { PageLayout, RecurrenceOptions, RecurrenceSettings, DeleteRecurringModal, ConfirmModal, PageHeader } from 'components';
import { doc, updateDoc, deleteDoc, arrayUnion, writeBatch } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { useCalendar } from 'contexts';
import { onAuthStateChanged } from 'firebase/auth';
import { notifyScheduleUpdated } from 'services';
import LoadingButton from '../../components/ui/LoadingButton';
dayjs.extend(isSameOrAfter); // [추가] dayjs 플러그인 활성화

const NOTIFICATION_OPTIONS = [
  { label: '알림 안함', value: 'none' },
  { label: '정시', value: '0' }, // AddSchedule과 옵션 통일
  { label: '5분 전', value: '5' }, // AddSchedule과 옵션 통일
  { label: '10분 전', value: '10' },
  { label: '30분 전', value: '30' },
  { label: '1시간 전', value: '60' },
  { label: '1일 전', value: '1440' },
];

const COLOR_OPTIONS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#84cc16', // lime
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#0ea5e9', // sky
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#d946ef', // fuchsia
  '#ec4899', // pink
  '#f43f5e', // rose
  '#64748b', // slate
  '#71717a', // zinc
];

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

interface Attachment {
  name: string;
  type: 'image' | 'doc';
  url?: string;
}

// [추가] location.state로 전달되는 데이터의 타입을 명확하게 정의합니다.
// ScheduleDetail.tsx에서 navigate시 전달하는 state 객체의 구조와 일치시킵니다.
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
}

const ScheduleEdit = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // [수정] location.state에 any 대신 명시적인 타입을 지정하여 타입 안정성을 높입니다.
  const eventData = location.state as EventDataState | null;
  const { myCalendars } = useCalendar();

  // --- [추가] 상태 관리 ---
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const [isCalListOpen, setIsCalListOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSimpleDeleteModalOpen, setIsSimpleDeleteModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    color: eventData?.color || '#3b82f6',
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

  // [추가] 드롭다운 외부 클릭 시 닫기
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCalListOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownRef]);

  const handleCalendarSelect = (calendar: any) => {
    setFormData((prev) => ({
      ...prev,
      calendarId: calendar.id,
      color: calendar.color || '#3b82f6',
    }));
    setIsCalListOpen(false);
  };

  // [추가] 삭제 관련 핸들러 (ScheduleDetail.tsx에서 가져옴)
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

  // 1. 전체 삭제 (문서 자체 삭제)
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

  // 2. 이 일정만 삭제 (exceptions 배열에 현재 날짜 추가)
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

  // 3. 향후 일정 모두 삭제 (endDate를 어제로 수정)
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

      // [수정] 종일이 아닐 때, 시작 시간을 변경하면 종료 시간을 조정 (AddSchedule.tsx와 동일한 로직 적용)
      if (!newData.isAllDay) {
        if (name === 'start') {
          const isInitialTime = dayjs(prev.start).isSame(dayjs(prev.end));
          const isStartTimeAfterEndTime = dayjs(value).isSameOrAfter(dayjs(prev.end));

          if (isInitialTime || isStartTimeAfterEndTime) {
            newData.end = dayjs(value).add(1, 'hour').format('YYYY-MM-DDTHH:mm');
          }
        } else if (name === 'end') {
          // [추가] 종료 시간이 시작 시간보다 빠를 경우 다음날로 자동 이동
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
        // [수정] 종일 옵션을 켜면 시간을 00:00 ~ 23:59로 설정하고, 끄면 기본 시간으로 되돌립니다.
        start: nextIsAllDay ? dayjs(prev.start).startOf('day').format('YYYY-MM-DDTHH:mm') : dayjs(prev.start).format('YYYY-MM-DDT09:00'),
        end: nextIsAllDay ? dayjs(prev.start).endOf('day').format('YYYY-MM-DDTHH:mm') : dayjs(prev.start).format('YYYY-MM-DDT10:00'),
      };
    });
  };

  const handleSave = async () => {
    if (isSubmitting) return;
    try {
      setIsSubmitting(true);
      const docId = getDocId();
      if (docId) {
        // [수정] 저장 시점에 선택된 캘린더의 멤버를 참석자로 설정합니다.
        const attendees = selectedCalendar?.members || (user ? [user.uid] : []);

        const scheduleUpdateData: any = {
          ...formData,
          attendees,
          recurrence,
        };

        // [수정] 반복 일정 수정 시, 시리즈의 시작 시간은 변경하지 않습니다.
        // 사용자가 UI에서 특정 발생(occurrence)의 날짜를 보고 있더라도,
        // 시리즈 전체의 시작점을 바꾸려는 의도가 아니므로 'start' 필드를 업데이트에서 제외합니다.
        // 'end' 필드 또한 반복 규칙에 의해 결정되므로 직접 업데이트하지 않습니다.
        if (eventData?.recurrence && eventData.recurrence.frequency !== 'none') {
          delete scheduleUpdateData.start;
          delete scheduleUpdateData.end;
        }

        await updateDoc(doc(db, 'schedules', docId!), scheduleUpdateData);

        // [추가] 공유 캘린더 일정 수정 시 멤버들에게 알림 전송
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

          // 모든 알림 작업이 끝난 후 배치 커밋
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
    }
  };

  return (
    <>
      <PageLayout
        title="일정 수정"
        onBack={() => navigate(-1)}
        extraNav={
          <LoadingButton
            onClick={handleSave}
            isLoading={isSubmitting}
            className="p-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          >
            <Check size={28} strokeWidth={3} />
          </LoadingButton>
        }
      >
        <>
          <PageHeader icon={<Sparkles className="text-blue-600 w-6 h-6" />}>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white leading-[1.3] tracking-tight">
              일정을 <span className="text-blue-600 dark:text-blue-400">수정</span>해볼까요?
            </h2>
          </PageHeader>

          <form className="space-y-6">
            <section className="space-y-4">
              <div className="group relative">
                <label className="block text-[13px] font-black text-gray-400 dark:text-gray-500 ml-1 mb-2">일정 제목</label>
                <div className="flex items-center h-[60px] bg-gray-50 dark:bg-gray-800/50 border-2 border-transparent focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-gray-800 rounded-[20px] px-5 transition-all">
                  <input
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="무엇을 하나요?"
                    className="bg-transparent border-none outline-none w-full h-full text-[16px] font-bold text-gray-800 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600"
                  />
                </div>
              </div>

              {/* [추가] 캘린더 선택 드롭다운 */}
              <div className="group relative" ref={dropdownRef}>
                <label className="block text-[13px] font-black text-gray-400 dark:text-gray-500 ml-1 mb-2">캘린더</label>
                <button
                  type="button"
                  onClick={() => setIsCalListOpen(!isCalListOpen)}
                  className="w-full flex items-center justify-between h-[60px] bg-gray-50 dark:bg-gray-800/50 border-2 border-transparent focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-gray-800 rounded-[20px] px-5 transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: selectedCalendar?.color || '#ccc' }}>
                      {(selectedCalendar as any)?.icon && ICON_MAP[(selectedCalendar as any).icon] ? (
                        React.createElement(ICON_MAP[(selectedCalendar as any).icon], { size: 14 })
                      ) : (
                        <CalendarIcon size={14} />
                      )}
                    </div>
                    <span className="text-[15px] font-bold text-gray-800 dark:text-gray-200">{selectedCalendar?.name || '캘린더 선택...'}</span>
                  </div>
                  <ChevronDown size={20} className={`text-gray-400 dark:text-gray-500 transition-transform duration-200 ${isCalListOpen ? 'rotate-180' : ''}`} />
                </button>

                {isCalListOpen && (
                  <div className="absolute top-full left-0 mt-2 w-full bg-white dark:bg-gray-800 rounded-[24px] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] dark:shadow-black/50 border border-gray-100 dark:border-gray-700 p-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                    {sortedCalendars.map((cal) => {
                      const IconComponent = (cal as any).icon && ICON_MAP[(cal as any).icon] ? ICON_MAP[(cal as any).icon] : CalendarIcon;
                      return (
                        <button
                          key={cal.id}
                          type="button"
                          onClick={() => handleCalendarSelect(cal)}
                          className={`w-full flex items-center justify-between p-4 rounded-[18px] transition-all ${
                            selectedCalendar?.id === cal.id
                              ? 'bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300'
                              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: cal.color || '#3b82f6' }}>
                              <IconComponent size={16} />
                            </div>
                            <span className="text-[14px] font-bold">{cal.name}</span>
                          </div>
                          {selectedCalendar?.id === cal.id && <Check size={16} className="text-blue-600 dark:text-blue-300" />}
                        </button>
                      );
                    })}
                    <div className="h-[1px] bg-gray-50 dark:bg-gray-700 my-2 mx-2" />
                    <button
                      type="button"
                      onClick={() =>
                        navigate('/create-calendar', {
                          state: {
                            from: `/schedule/edit/${getDocId()}`, // 돌아올 경로 지정
                            scheduleData: { ...formData, recurrence, id: getDocId() }, // 현재 폼 데이터 전달
                          },
                        })
                      }
                      className="w-full flex items-center gap-3 p-4 text-gray-500 dark:text-gray-400 font-bold text-[13px] hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-[18px] transition-colors"
                    >
                      <Plus size={16} /> 새 캘린더 만들기
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[13px] font-black text-gray-400 dark:text-gray-500">시간 설정</label>
                  <div onClick={handleToggleAllDay} className="flex items-center gap-2 cursor-pointer group">
                    <span
                      className={`text-[12px] font-bold transition-colors ${formData.isAllDay ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'}`}
                    >
                      종일
                    </span>
                    <div
                      className={`relative w-10 h-6 rounded-full transition-colors duration-200 shrink-0 ${formData.isAllDay ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                    >
                      <div
                        className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow-sm transition-transform duration-200 ${
                          formData.isAllDay ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-[24px] p-2 space-y-1 border border-gray-100 dark:border-gray-700/50">
                  <div className="flex items-center h-[56px] px-4 gap-4">
                    <Clock size={18} className="text-gray-400 dark:text-gray-600 shrink-0" />
                    <div className="flex-1 flex items-center justify-between gap-3">
                      <span className="text-[13px] font-bold text-gray-400 dark:text-gray-500 shrink-0">시작</span>
                      <input
                        type={formData.isAllDay ? 'date' : 'datetime-local'}
                        name="start"
                        value={formData.isAllDay ? formData.start.split('T')[0] : formData.start}
                        onChange={handleChange} // dark:text-gray-200 -> dark:text-white
                        className="bg-transparent text-[14px] font-bold text-gray-800 dark:text-white outline-none text-right font-mono w-full"
                      />
                    </div>
                  </div>
                  <div className="h-[1px] bg-gray-200 dark:bg-gray-700/50 mx-4" />
                  <div className="flex items-center h-[56px] px-4 gap-4">
                    <Clock size={18} className="text-gray-400 dark:text-gray-600 shrink-0" />
                    <div className="flex-1 flex items-center justify-between gap-3">
                      <span className="text-[13px] font-bold text-gray-400 dark:text-gray-500 shrink-0">종료</span>
                      <input
                        type={formData.isAllDay ? 'date' : 'datetime-local'}
                        name="end"
                        value={formData.isAllDay ? formData.end.split('T')[0] : formData.end}
                        onChange={handleChange} // dark:text-gray-200 -> dark:text-white
                        className="bg-transparent text-[14px] font-bold text-gray-800 dark:text-white outline-none text-right font-mono w-full"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* [추가] 색상 선택 섹션 */}
              <div className="space-y-3">
                <label className="block text-[13px] font-black text-gray-400 dark:text-gray-500 ml-1">색상</label>
                <div className="flex flex-wrap gap-3 px-1">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, color }))}
                      className={`w-8 h-8 rounded-full transition-all flex items-center justify-center ${
                        formData.color === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: color }}
                    >
                      {formData.color === color && <Check size={14} className="text-white" strokeWidth={3} />}
                    </button>
                  ))}
                </div>
              </div>

              {/* [추가] 약속 잡기로 생성된 일정(recurrence 필드가 없음)은 반복 설정 옵션을 숨깁니다. */}
              {eventData?.recurrence && <RecurrenceOptions startDate={formData.start} value={recurrence} onChange={setRecurrence} />}

              <div className="space-y-3">
                <label className="block text-[13px] font-black text-gray-400 dark:text-gray-500 ml-1">상세 정보</label>

                <div className="flex items-center h-[56px] bg-gray-50 dark:bg-gray-800/50 border-2 border-transparent focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-gray-800 rounded-[20px] px-4 gap-4 transition-all">
                  <MapPin size={18} className="text-gray-300 dark:text-gray-600" />
                  <input
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    className="bg-transparent outline-none w-full text-[14px] font-bold text-gray-800 dark:text-gray-200 placeholder:text-gray-300 dark:placeholder:text-gray-600"
                    placeholder="장소"
                  />
                </div>

                <div className="flex items-center h-[56px] bg-gray-50 dark:bg-gray-800/50 border-2 border-transparent focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-gray-800 rounded-[20px] px-4 gap-4 transition-all relative">
                  <Bell size={18} className="text-gray-300 dark:text-gray-600" />
                  <select
                    name="notification"
                    value={formData.notification}
                    onChange={handleChange}
                    className="bg-transparent outline-none w-full text-[14px] font-bold text-gray-800 dark:text-gray-200 appearance-none z-10"
                  >
                    {NOTIFICATION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-start bg-gray-50 dark:bg-gray-800/50 border-2 border-transparent focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-gray-800 rounded-[24px] p-4 gap-4 transition-all">
                  <AlignLeft size={18} className="text-gray-300 dark:text-gray-600 mt-1" />
                  <textarea
                    name="content"
                    value={formData.content}
                    onChange={handleChange}
                    rows={3}
                    className="bg-transparent outline-none w-full text-[14px] font-medium text-gray-800 dark:text-gray-200 resize-none placeholder:text-gray-300 dark:placeholder:text-gray-600 leading-relaxed"
                    placeholder="메모"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between px-1 mb-2 ">
                  <label className="text-[13px] font-black text-gray-400 dark:text-gray-500">첨부파일</label>
                  <button
                    type="button"
                    onClick={() => toast('파일 첨부 기능은 준비중입니다.')}
                    className="text-[11px] font-bold text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-500/10 px-2 py-1 rounded-md hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
                  >
                    + 추가
                  </button>
                </div>
                <div className="space-y-2">
                  {attachments.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 px-4 py-3 rounded-[16px] border border-gray-100 dark:border-gray-700/50"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        {file.type === 'image' ? <ImageIcon size={16} className="text-purple-500" /> : <Paperclip size={16} className="text-blue-500" />}
                        <span className="text-[13px] font-bold text-gray-700 dark:text-gray-300 truncate">{file.name}</span>
                      </div>
                      <button type="button" onClick={() => toast('파일 삭제 기능은 준비중입니다.')} className="text-gray-300 hover:text-red-500">
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {!isShared && isPastEvent && (
                <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-2">
                    <BookOpen size={20} className="text-emerald-500" />
                    <h3 className="text-[16px] font-black text-gray-900 dark:text-white">후기 작성</h3>
                  </div>
                  <div className="bg-white dark:bg-gray-800/50 border-2 border-dashed border-emerald-100 dark:border-emerald-900/50 rounded-[28px] p-5 space-y-4 focus-within:border-emerald-400 dark:focus-within:border-emerald-600 transition-colors">
                    <textarea
                      placeholder="후기를 작성해주세요."
                      className="w-full text-[14px] font-medium text-gray-700 dark:text-gray-300 outline-none min-h-[100px] bg-transparent resize-none placeholder:text-gray-300 dark:placeholder:text-gray-600 leading-relaxed"
                      value={formData.review}
                      onChange={(e) => setFormData({ ...formData, review: e.target.value })}
                    />
                    {formData.reviewImages && formData.reviewImages.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                        {formData.reviewImages.map((src: string, i: number) => (
                          <div key={i} className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-gray-100 dark:border-gray-700 relative">
                            <img src={src} alt="review" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex justify-end border-t border-emerald-50 dark:border-emerald-900/50 pt-3">
                      <button
                        type="button"
                        onClick={() => toast('후기 사진 추가 기능은 준비중입니다.')}
                        className="flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 rounded-xl text-[12px] font-bold hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors"
                      >
                        <Camera size={14} /> 사진 추가
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>
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

      {/* [추가] 반복 일정 삭제 모달 */}
      {isDeleteModalOpen && (
        <DeleteRecurringModal onClose={() => setIsDeleteModalOpen(false)} onDeleteOne={deleteOnlyThis} onDeleteFollowing={deleteFollowing} onDeleteAll={deleteEntireSchedule} />
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
    </>
  );
};

export default ScheduleEdit;
