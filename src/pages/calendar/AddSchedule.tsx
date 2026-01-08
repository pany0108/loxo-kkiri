import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import { MapPin, AlignLeft, Clock, Camera, Bell, Sparkles, ChevronDown, Plus, Check, Loader2, History } from 'lucide-react';
import { sendPushNotificationToUser } from 'utils';
import { PageLayout, RecurrenceOptions, RecurrenceSettings, PageHeader } from 'components';
import { collection, addDoc, query, where, writeBatch, doc, orderBy } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useFirestoreQuery } from 'hooks';

dayjs.extend(isSameOrAfter);

const NOTIFICATION_OPTIONS = [
  { label: '알림 안함', value: 'none' },
  { label: '정시', value: '0' },
  { label: '5분 전', value: '5' },
  { label: '10분 전', value: '10' },
  { label: '30분 전', value: '30' },
  { label: '1시간 전', value: '60' },
  { label: '1일 전', value: '1440' },
];

// [추가] 캘린더 타입 정의
interface CalendarType {
  id: string;
  name: string;
  members: string[];
  isDefault: boolean;
  color: string;
}

// [추가] 폼 데이터 타입 정의
interface FormDataState {
  title: string;
  calendarId: string;
  isAllDay: boolean;
  start: string;
  end: string;
  location: string;
  content: string;
  color: string;
  notification: string;
}

const AddSchedule = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLDivElement>(null);

  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const receivedData = location.state as {
    start?: string;
    end?: string;
    allDay?: boolean;
    calendarId?: string; // From CalendarMain
    // From CreateCalendar
    from?: string;
    newlyCreatedCalendarId?: string;
    scheduleData?: any; // From CreateCalendar
    // From ScheduleDetail (copy)
    title?: string;
    content?: string;
    location?: string;
    color?: string;
    notification?: string;
  } | null;

  const getInitialDate = (dateStr?: string, isAllDay?: boolean) => {
    if (!dateStr) return dayjs().format('YYYY-MM-DDTHH:mm');
    return isAllDay ? dayjs(dateStr).format('YYYY-MM-DD') : dayjs(dateStr).format('YYYY-MM-DDTHH:mm');
  };

  // Let's initialize state based on where we came from.
  const [formData, setFormData] = useState<FormDataState>(() => {
    // ... (이하 로직은 동일하므로 생략)
    const baseData = {
      title: '',
      calendarId: '',
      isAllDay: false,
      start: dayjs().format('YYYY-MM-DDT09:00'),
      end: dayjs().add(1, 'hour').format('YYYY-MM-DDT10:00'),
      location: '',
      content: '',
      color: '#3b82f6',
      notification: 'none',
    };

    if (!receivedData) {
      return baseData;
    }

    // Case 1: From CreateCalendar (restoring form state)
    if (receivedData.from === '/create-calendar' && receivedData.scheduleData) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { recurrence, ...restOfScheduleData } = receivedData.scheduleData;
      return {
        ...baseData,
        ...restOfScheduleData,
        calendarId: receivedData.newlyCreatedCalendarId || '',
      };
    }

    // Case 2: From ScheduleDetail (copying) or CalendarMain (date selection)
    const initialData = {
      ...baseData,
      ...(receivedData as any), // This will overwrite baseData with any provided fields
      start: getInitialDate(receivedData?.start, receivedData?.allDay),
      end: getInitialDate(receivedData?.end || receivedData?.start, receivedData?.allDay),
      isAllDay: receivedData?.allDay ?? false,
    };

    // '종일'이 기본으로 넘어온 경우(캘린더의 날짜만 클릭) 시간 지정(9시-10시)으로 변경합니다.
    // 단, 일정 복사하기로 넘어온 경우는 제외합니다 (title이 있음).
    if (initialData.isAllDay && !initialData.title) {
      initialData.isAllDay = false;
      initialData.start = dayjs(initialData.start).format('YYYY-MM-DDT09:00');
      initialData.end = dayjs(initialData.start).add(1, 'hour').format('YYYY-MM-DDT10:00');
    }
    return initialData;
  });

  // [추가] 캘린더 목록 및 드롭다운 상태
  const [isCalListOpen, setIsCalListOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // [추가] 일정 제목으로 검색/추천 기능
  const [scheduleSearchResults, setScheduleSearchResults] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [debouncedTitle, setDebouncedTitle] = useState('');

  // [수정] useFirestoreQuery 훅으로 캘린더 목록 실시간 로딩
  const calendarsQuery = useMemo(() => {
    if (!user) return null;
    return query(collection(db, 'calendars'), where('members', 'array-contains', user.uid));
  }, [user]);

  const { data: myCalendarsData } = useFirestoreQuery<CalendarType>(calendarsQuery);
  const myCalendars = myCalendarsData || [];

  // [추가] 내 모든 일정을 불러옵니다 (제목으로 검색하기 위함)
  const schedulesQuery = useMemo(() => {
    if (!user) return null;
    return query(collection(db, 'schedules'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
  }, [user]);

  const { data: mySchedules } = useFirestoreQuery<any>(schedulesQuery);

  // [추가] 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
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

  // [추가] 제목 추천 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (titleInputRef.current && !titleInputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // [추가] 캘린더 목록이 로드되면, 전달받은 캘린더 ID나 기본 캘린더를 기준으로 초기값 설정
  useEffect(() => {
    if (myCalendars.length === 0) return;

    let initialCalendar: CalendarType | undefined;

    // If a calendarId is already set (e.g., coming back from CreateCalendar), find that calendar.
    if (formData.calendarId) {
      initialCalendar = myCalendars.find((c) => c.id === formData.calendarId);
    }
    // If not, find based on receivedData from CalendarMain or default.
    else if (receivedData?.calendarId) {
      initialCalendar = myCalendars.find((c) => c.id === receivedData.calendarId);
    } else {
      initialCalendar = myCalendars.find((c) => c.isDefault) || myCalendars[0];
    }

    if (initialCalendar) {
      setFormData((prev: FormDataState) => ({ ...prev, calendarId: initialCalendar!.id, color: initialCalendar!.color || '#3b82f6' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myCalendars, receivedData?.newlyCreatedCalendarId]);

  const [recurrence, setRecurrence] = useState<RecurrenceSettings>(() => {
    if (receivedData?.from === '/create-calendar' && receivedData.scheduleData) {
      return receivedData.scheduleData.recurrence;
    }
    return {
      frequency: 'none',
      interval: 1,
      daysOfWeek: [],
      monthlyType: 'date',
      endType: 'none',
      endDate: dayjs().add(1, 'month').format('YYYY-MM-DD'),
      endCount: 10,
    };
  });

  // [추가] 제목 입력 debounce 처리
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedTitle(formData.title);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [formData.title]);

  // [추가] 일정 제목으로 이전 일정 검색
  useEffect(() => {
    if (!debouncedTitle || !mySchedules || debouncedTitle.length < 2) {
      setScheduleSearchResults([]);
      setShowSuggestions(false);
      return;
    }

    const lowerCaseTitle = debouncedTitle.toLowerCase();
    const results = mySchedules.filter((schedule) => schedule.title.toLowerCase().includes(lowerCaseTitle));

    // 제목이 같은 경우 중복 제거 (가장 최근 것만 남김)
    const uniqueResults = Array.from(new Map(results.map((item) => [item.title, item])).values());

    setScheduleSearchResults(uniqueResults.slice(0, 5)); // 최대 5개 표시
    setShowSuggestions(uniqueResults.length > 0);
  }, [debouncedTitle, mySchedules]);

  // [수정] 시작일 변경 시 종료일도 같이 변경되도록 로직 추가
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    setFormData((prev: FormDataState) => {
      const newData = { ...prev, [name]: value };

      // 종일 일정이 아닐 때만 시간 자동 조정
      if (!newData.isAllDay && name === 'start') {
        // [수정] 최초 시간이 설정되지 않았거나(시작=종료), 시작 시간이 종료 시간을 넘어서는 경우에만 종료 시간을 1시간 뒤로 자동 조정
        const isInitialTime = dayjs(prev.start).isSame(dayjs(prev.end));
        const isStartTimeAfterEndTime = dayjs(value).isSameOrAfter(dayjs(prev.end));

        if (isInitialTime || isStartTimeAfterEndTime) {
          newData.end = dayjs(value).add(1, 'hour').format('YYYY-MM-DDTHH:mm');
        }
      }

      return newData;
    });
  };

  // [추가] 캘린더 선택 핸들러
  const handleCalendarSelect = (calendar: CalendarType) => {
    setFormData((prev: FormDataState) => ({
      ...prev,
      calendarId: calendar.id,
      color: calendar.color || '#3b82f6',
    }));
    setIsCalListOpen(false);
  };

  // [추가] 추천 일정 클릭 핸들러
  const handleSuggestionClick = (schedule: any) => {
    setFormData({
      ...formData, // 현재 선택된 캘린더 ID 등은 유지
      title: schedule.title,
      content: '', // [수정] 메모는 복사하지 않음
      location: '', // [수정] 장소는 복사하지 않음
      isAllDay: schedule.isAllDay,
      // [수정] 날짜는 현재 폼에 선택된 날짜를 유지하고, 시간과 기간만 불러온 일정에서 가져옵니다.
      start: dayjs(formData.start).hour(dayjs(schedule.start).hour()).minute(dayjs(schedule.start).minute()).second(0).format('YYYY-MM-DDTHH:mm'),
      end: (() => {
        const baseDate = dayjs(formData.start);
        const originalStart = dayjs(schedule.start);
        const originalEnd = dayjs(schedule.end);
        const duration = originalEnd.diff(originalStart);
        const newStart = baseDate.hour(originalStart.hour()).minute(originalStart.minute()).second(0);
        return newStart.add(duration).format('YYYY-MM-DDTHH:mm');
      })(),
      notification: schedule.notification || 'none',
      // recurrence는 복사하지 않음
    });
    setShowSuggestions(false);
    toast.success(`'${schedule.title}' 일정을 불러왔습니다.`);
  };

  const handleToggle = () => {
    setFormData((prev: FormDataState) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('로그인이 필요합니다.');
      return;
    }
    if (!formData.title) {
      toast.error('제목을 입력해주세요.');
      return;
    }

    // [추가] 캘린더 선택 유효성 검사
    if (!formData.calendarId) {
      toast.error('일정을 저장할 캘린더를 선택해주세요.');
      return;
    }

    // 종료 시간이 시작 시간보다 빠른 경우 경고 (선택 사항)
    if (dayjs(formData.end).isBefore(dayjs(formData.start))) {
      toast.error('종료 시간이 시작 시간보다 빠를 수 없습니다.');
      return;
    }

    setIsSubmitting(true);
    const selectedCalendar = myCalendars.find((c) => c.id === formData.calendarId);

    try {
      const scheduleDocRef = await addDoc(collection(db, 'schedules'), {
        userId: user.uid,
        ...formData,
        recurrence,
        createdAt: new Date().toISOString(),
        attendees: selectedCalendar ? selectedCalendar.members : [user.uid],
      });
      // [추가] 공유 캘린더에 일정이 추가되면 멤버들에게 알림 전송
      if (selectedCalendar && selectedCalendar.members.length > 1) {
        const batch = writeBatch(db);

        // [수정] forEach 대신 for...of 사용
        for (const memberId of selectedCalendar.members) {
          if (memberId === user.uid) continue; // return 대신 continue 사용

          // 1. Firestore 알림 저장 (Batch)
          const notiRef = doc(collection(db, 'notifications'));
          batch.set(notiRef, {
            userId: memberId,
            type: 'SCHEDULE_ADDED',
            message: `'${selectedCalendar.name}' 캘린더에 '${formData.title}' 일정이 추가되었습니다.`,
            relatedId: scheduleDocRef.id,
            isRead: false,
            createdAt: new Date().toISOString(),
          });

          // 2. 푸시 알림 전송 (확실하게 기다림)
          await sendPushNotificationToUser({
            userId: memberId,
            title: '새로운 일정',
            body: `'${selectedCalendar.name}' 캘린더에 '${formData.title}' 일정이 추가되었습니다.`,
            data: { type: 'SCHEDULE_ADDED', relatedId: scheduleDocRef.id, calendarId: selectedCalendar.id },
          });
        }

        // 루프가 다 끝난 뒤 배치 커밋
        await batch.commit();
      }
      toast.success('일정이 저장되었습니다! ☁️');
      navigate('/calendar');
    } catch (error) {
      console.error('Error adding document: ', error);
      toast.error('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // [추가] 화면에 표시할 선택된 캘린더 정보
  const selectedCalendar = myCalendars.find((c) => c.id === formData.calendarId);

  const renderFooter = () => (
    <footer className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-t border-gray-50 dark:border-gray-800 z-20 px-6 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <button
        type="submit"
        form="add-schedule-form" // [추가] form 속성으로 외부 form과 연결
        disabled={!formData.title || isSubmitting}
        className={`w-full h-[62px] rounded-[24px] font-black text-[17px] shadow-lg transition-all flex items-center justify-center gap-2
                ${
                  formData.title && !isSubmitting
                    ? 'bg-blue-600 text-white shadow-blue-100 dark:shadow-blue-900/50 active:scale-[0.98]'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed shadow-none'
                }`}
      >
        {isSubmitting ? <Loader2 className="animate-spin" /> : <span>일정 등록하기</span>}
      </button>
    </footer>
  );

  return (
    // [수정] PageLayout으로 전체 구조 변경
    <PageLayout title="새 일정 등록" onBack={() => navigate(-1)} footer={renderFooter()}>
      <>
        <PageHeader icon={<Sparkles className="text-blue-600 w-6 h-6" />}>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white leading-[1.3] tracking-tight">
            새로운 <span className="text-blue-600">일정</span>을<br />
            등록해볼까요?
          </h2>
        </PageHeader>

        {/* [수정] form에 id 추가 */}
        <form id="add-schedule-form" onSubmit={handleSubmit} className="space-y-6">
          <section className="space-y-4">
            <div ref={titleInputRef} className="group relative">
              <label className="block text-[13px] font-black text-gray-400 dark:text-gray-500 ml-1 mb-2">일정 제목</label>
              <div className="flex items-center h-[60px] bg-gray-50 dark:bg-gray-800/50 border-2 border-transparent focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-gray-800 rounded-[20px] px-5 transition-all">
                <input
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  onFocus={() => formData.title && scheduleSearchResults.length > 0 && setShowSuggestions(true)}
                  placeholder="무엇을 하나요?"
                  className="bg-transparent border-none outline-none w-full h-full text-[16px] font-bold text-gray-800 dark:text-white placeholder:text-gray-300"
                  required
                  autoComplete="off"
                />
              </div>
              {/* [추가] 이전 일정 추천 UI */}
              {showSuggestions && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-700 rounded-xl shadow-lg border border-gray-100 dark:border-gray-600 z-20 max-h-48 overflow-y-auto">
                  {scheduleSearchResults.map((schedule) => (
                    <button
                      key={schedule.id}
                      type="button"
                      onClick={() => handleSuggestionClick(schedule)}
                      className="w-full text-left px-4 py-3 text-sm font-bold text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-3"
                    >
                      <History size={14} className="text-gray-400" />
                      <div className="flex-1">
                        <p>{schedule.title}</p>
                        <p className="text-xs text-gray-400 font-medium">
                          {dayjs(schedule.start).format('M/D')}
                          {schedule.location ? ` · ${schedule.location}` : ''}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* [추가] 캘린더 선택 섹션 */}
            <div className="group relative" ref={dropdownRef}>
              <label className="block text-[13px] font-black text-gray-400 dark:text-gray-500 ml-1 mb-2">캘린더</label>
              <button
                type="button"
                onClick={() => setIsCalListOpen(!isCalListOpen)}
                className="w-full flex items-center justify-between h-[60px] bg-gray-50 dark:bg-gray-800/50 border-2 border-transparent focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-gray-800 rounded-[20px] px-5 transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: selectedCalendar?.color || '#ccc' }} />
                  <span className="text-[15px] font-bold text-gray-800 dark:text-gray-200">{selectedCalendar?.name || '캘린더 선택...'}</span>
                </div>
                <ChevronDown size={20} className={`text-gray-400 dark:text-gray-500 transition-transform duration-200 ${isCalListOpen ? 'rotate-180' : ''}`} />
              </button>

              {isCalListOpen && (
                <div className="absolute top-full left-0 mt-2 w-full bg-white dark:bg-gray-800 rounded-[24px] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] dark:shadow-black/50 border border-gray-100 dark:border-gray-700 p-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                  {myCalendars.map((cal) => (
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
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cal.color }} />
                        <span className="text-[14px] font-bold">{cal.name}</span>
                      </div>
                      {selectedCalendar?.id === cal.id && <Check size={16} className="text-blue-600 dark:text-blue-300" />}
                    </button>
                  ))}
                  <div className="h-[1px] bg-gray-50 dark:bg-gray-700 my-2 mx-2" />
                  <button
                    type="button"
                    onClick={() =>
                      navigate('/create-calendar', {
                        state: {
                          from: '/add-schedule',
                          scheduleData: { ...formData, recurrence }, // Pass current form data
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
                <div onClick={handleToggle} className="flex items-center gap-2 cursor-pointer group">
                  <span className={`text-[12px] font-bold transition-colors ${formData.isAllDay ? 'text-emerald-600' : 'text-gray-400'}`}>종일</span>
                  <div className={`relative w-10 h-6 rounded-full transition-colors duration-200 shrink-0 ${formData.isAllDay ? 'bg-emerald-500' : 'bg-gray-200'}`}>
                    <div
                      className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow-sm transition-transform duration-200 ${
                        formData.isAllDay ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-[24px] p-2 space-y-1">
                <div className="flex items-center h-[56px] px-4 gap-4">
                  <Clock size={18} className="text-gray-400 dark:text-gray-600 shrink-0" />
                  <div className="flex-1 flex items-center justify-between">
                    <span className="text-[14px] font-bold text-gray-400 dark:text-gray-500 shrink-0">시작</span>
                    <input
                      type={formData.isAllDay ? 'date' : 'datetime-local'}
                      name="start"
                      value={formData.isAllDay ? formData.start.split('T')[0] : formData.start}
                      onChange={handleChange}
                      className="bg-transparent text-[14px] font-bold text-gray-800 dark:text-white outline-none text-right font-mono"
                    />
                  </div>
                </div>
                <div className="h-[1px] bg-gray-100 dark:bg-gray-700/50 mx-4" />
                <div className="flex items-center h-[56px] px-4 gap-4">
                  <Clock size={18} className="text-gray-400 dark:text-gray-600 shrink-0" />
                  <div className="flex-1 flex items-center justify-between">
                    <span className="text-[14px] font-bold text-gray-400 dark:text-gray-500 shrink-0">종료</span>
                    <input
                      type={formData.isAllDay ? 'date' : 'datetime-local'}
                      name="end"
                      value={formData.isAllDay ? formData.end.split('T')[0] : formData.end}
                      onChange={handleChange}
                      className="bg-transparent text-[14px] font-bold text-gray-800 dark:text-white outline-none text-right font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            <RecurrenceOptions startDate={formData.start} value={recurrence} onChange={setRecurrence} />

            <div className="group relative">
              <label className="block text-[13px] font-black text-gray-400 dark:text-gray-500 ml-1 mb-2">푸시 알림</label>
              <div className="flex items-center h-[60px] bg-gray-50 dark:bg-gray-800/50 border-2 border-transparent focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-gray-800 rounded-[20px] px-5 transition-all">
                <Bell size={18} className="text-gray-300 mr-4 group-focus-within:text-blue-600" />
                <select
                  name="notification"
                  value={formData.notification}
                  onChange={handleChange}
                  className="bg-transparent border-none outline-none w-full h-full text-[15px] font-bold text-gray-800 dark:text-gray-200 appearance-none"
                >
                  {NOTIFICATION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-[13px] font-black text-gray-400 dark:text-gray-500 ml-1">상세 정보</label>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-[24px] p-2 space-y-1">
                <div className="flex items-center h-[56px] px-4 gap-4">
                  <MapPin size={18} className="text-gray-300 dark:text-gray-600 shrink-0" />
                  <input
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="장소 추가"
                    className="bg-transparent outline-none w-full text-[14px] font-bold text-gray-800 dark:text-gray-200 placeholder:text-gray-300"
                  />
                </div>
                <div className="h-[1px] bg-gray-100 dark:bg-gray-700/50 mx-4" />
                <div className="flex items-start p-4 gap-4">
                  <AlignLeft size={18} className="text-gray-300 dark:text-gray-600 mt-0.5 shrink-0" />
                  <textarea
                    name="content"
                    value={formData.content}
                    onChange={handleChange}
                    placeholder="메모를 입력하세요"
                    rows={3}
                    className="bg-transparent outline-none w-full text-[14px] font-bold text-gray-800 dark:text-gray-200 placeholder:text-gray-300 resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => toast('파일 첨부 기능은 준비중입니다.')}
                className="w-full h-[56px] bg-gray-50 dark:bg-gray-800/50 border-2 border-gray-100 dark:border-gray-700/50 rounded-[20px] flex items-center justify-center gap-2 text-gray-400 dark:text-gray-500 cursor-not-allowed"
              >
                <Camera size={20} />
                <span className="text-[14px] font-bold">파일 첨부 (준비중)</span>
              </button>
            </div>
          </section>
        </form>
      </>
    </PageLayout>
  );
};

export default AddSchedule;
