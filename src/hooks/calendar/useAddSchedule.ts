import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { onAuthStateChanged } from 'firebase/auth';
import { addDoc, collection, orderBy, query, where, writeBatch } from 'firebase/firestore';
import toast from 'react-hot-toast';

import { RecurrenceSettings } from 'components';
import { useFirestoreQuery } from '../common/useFirestore';
import { notifyScheduleAdded } from 'services';
import { auth, db } from '../../firebase';

/** 캘린더 타입 인터페이스 */
export interface CalendarType {
  id: string;
  name: string;
  members: string[];
  isDefault: boolean;
  color: string;
}

/** 일정 입력 폼 상태 인터페이스 */
export interface FormDataState {
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

/**
 * 일정 추가 페이지의 로직을 담당하는 커스텀 훅
 * - 폼 데이터 관리, 캘린더 선택, 일정 저장 등의 기능을 제공합니다.
 */
export const useAddSchedule = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLDivElement>(null);

  const [user, setUser] = useState<any>(null);
  const [isCalListOpen, setIsCalListOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scheduleSearchResults, setScheduleSearchResults] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [debouncedTitle, setDebouncedTitle] = useState('');

  // 사용자 인증 상태 감지
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // 캘린더 목록 로딩
  const calendarsQuery = useMemo(() => {
    if (!user) return null;
    return query(collection(db, 'calendars'), where('members', 'array-contains', user.uid));
  }, [user]);

  const { data: myCalendarsData } = useFirestoreQuery<CalendarType>(calendarsQuery);
  const myCalendars = useMemo(() => myCalendarsData || [], [myCalendarsData]);

  // 내 일정 로딩 (검색용)
  const schedulesQuery = useMemo(() => {
    if (!user) return null;
    return query(collection(db, 'schedules'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
  }, [user]);

  const { data: mySchedules } = useFirestoreQuery<any>(schedulesQuery);

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCalListOpen(false);
      }
      if (titleInputRef.current && !titleInputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const receivedData = location.state as any;

  /** 초기 날짜 설정 함수 */
  const getInitialDate = (dateStr?: string, isAllDay?: boolean) => {
    if (!dateStr) return dayjs().format('YYYY-MM-DDTHH:mm');
    return isAllDay ? dayjs(dateStr).format('YYYY-MM-DD') : dayjs(dateStr).format('YYYY-MM-DDTHH:mm');
  };

  // 폼 데이터 초기화
  const [formData, setFormData] = useState<FormDataState>(() => {
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

    if (!receivedData) return baseData;

    if (receivedData.from === '/create-calendar' && receivedData.scheduleData) {
      const { recurrence, ...restOfScheduleData } = receivedData.scheduleData;
      return {
        ...baseData,
        ...restOfScheduleData,
        calendarId: receivedData.newlyCreatedCalendarId || '',
      };
    }

    const initialData = {
      ...baseData,
      ...receivedData,
      start: getInitialDate(receivedData?.start, receivedData?.allDay),
      end: getInitialDate(receivedData?.end || receivedData?.start, receivedData?.allDay),
      isAllDay: receivedData?.allDay ?? false,
    };

    if (initialData.isAllDay && !initialData.title) {
      initialData.isAllDay = false;
      initialData.start = dayjs(initialData.start).format('YYYY-MM-DDT09:00');
      initialData.end = dayjs(initialData.start).add(1, 'hour').format('YYYY-MM-DDT10:00');
    }
    return initialData;
  });

  // 캘린더 초기값 설정
  useEffect(() => {
    if (myCalendars.length === 0) return;
    let initialCalendar: CalendarType | undefined;

    if (formData.calendarId) {
      initialCalendar = myCalendars.find((c) => c.id === formData.calendarId);
    } else if (receivedData?.calendarId) {
      initialCalendar = myCalendars.find((c) => c.id === receivedData.calendarId);
    } else {
      initialCalendar = myCalendars.find((c) => c.isDefault) || myCalendars[0];
    }

    if (initialCalendar) {
      setFormData((prev) => ({ ...prev, calendarId: initialCalendar!.id, color: initialCalendar!.color || '#3b82f6' }));
    }
  }, [formData.calendarId, myCalendars, receivedData?.calendarId, receivedData?.newlyCreatedCalendarId]);

  // 반복 설정 초기화
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

  // 제목 검색 Debounce
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedTitle(formData.title), 300);
    return () => clearTimeout(handler);
  }, [formData.title]);

  // 일정 검색
  useEffect(() => {
    if (!debouncedTitle || !mySchedules || debouncedTitle.length < 2) {
      setScheduleSearchResults([]);
      setShowSuggestions(false);
      return;
    }
    const lowerCaseTitle = debouncedTitle.toLowerCase();
    const results = mySchedules.filter((schedule: any) => schedule.title.toLowerCase().includes(lowerCaseTitle));
    const uniqueResults = Array.from(new Map(results.map((item: any) => [item.title, item])).values());
    setScheduleSearchResults(uniqueResults.slice(0, 5));
    setShowSuggestions(uniqueResults.length > 0);
  }, [debouncedTitle, mySchedules]);

  /** 입력 필드 변경 핸들러 */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const newData = { ...prev, [name]: value };
      if (!newData.isAllDay) {
        if (name === 'start') {
          // 최초 시간이 설정되지 않았거나(시작=종료), 시작 시간이 종료 시간을 넘어서는 경우에만 종료 시간을 1시간 뒤로 자동 조정
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

  /** 캘린더 선택 핸들러 */
  const handleCalendarSelect = (calendar: CalendarType) => {
    setFormData((prev) => ({ ...prev, calendarId: calendar.id, color: calendar.color || '#3b82f6' }));
    setIsCalListOpen(false);
  };

  /** 일정 추천 항목 클릭 핸들러 */
  const handleSuggestionClick = (schedule: any) => {
    setFormData({
      ...formData,
      title: schedule.title,
      content: '',
      location: '',
      isAllDay: schedule.isAllDay,
      start: dayjs(formData.start).hour(dayjs(schedule.start).hour()).minute(dayjs(schedule.start).minute()).second(0).format('YYYY-MM-DDTHH:mm'),
      end: (() => {
        const baseDate = dayjs(formData.start);
        const originalStart = dayjs(schedule.start);
        const originalEnd = dayjs(schedule.end);
        const duration = originalEnd.diff(originalStart);
        return baseDate.hour(originalStart.hour()).minute(originalStart.minute()).second(0).add(duration).format('YYYY-MM-DDTHH:mm');
      })(),
      notification: schedule.notification || 'none',
    });
    setShowSuggestions(false);
    toast.success(`'${schedule.title}' 일정을 불러왔습니다.`);
  };

  /** 종일 설정 토글 핸들러 */
  const handleToggle = () => {
    setFormData((prev) => {
      const nextIsAllDay = !prev.isAllDay;
      return {
        ...prev,
        isAllDay: nextIsAllDay,
        start: nextIsAllDay ? dayjs(prev.start).startOf('day').format('YYYY-MM-DDTHH:mm') : dayjs(prev.start).format('YYYY-MM-DDT09:00'),
        end: nextIsAllDay ? dayjs(prev.start).endOf('day').format('YYYY-MM-DDTHH:mm') : dayjs(prev.start).format('YYYY-MM-DDT10:00'),
      };
    });
  };

  /** 폼 제출 핸들러 */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return toast.error('로그인이 필요합니다.');
    if (!formData.title) return toast.error('제목을 입력해주세요.');
    if (!formData.calendarId) return toast.error('일정을 저장할 캘린더를 선택해주세요.');
    if (dayjs(formData.end).isBefore(dayjs(formData.start))) return toast.error('종료 시간이 시작 시간보다 빠를 수 없습니다.');

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

      if (selectedCalendar && selectedCalendar.members.length > 1) {
        const batch = writeBatch(db);
        for (const memberId of selectedCalendar.members) {
          if (memberId === user.uid) continue;
          await notifyScheduleAdded(batch, {
            memberId,
            editorName: user.displayName,
            calendarName: selectedCalendar.name,
            scheduleTitle: formData.title,
            scheduleId: scheduleDocRef.id,
            calendarId: selectedCalendar.id,
          });
        }
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

  const selectedCalendar = myCalendars.find((c) => c.id === formData.calendarId);

  return {
    state: {
      formData,
      recurrence,
      isCalListOpen,
      isSubmitting,
      scheduleSearchResults,
      showSuggestions,
      myCalendars,
      selectedCalendar,
    },
    refs: {
      dropdownRef,
      titleInputRef,
    },
    handlers: {
      setRecurrence,
      setIsCalListOpen,
      setShowSuggestions,
      handleChange,
      handleCalendarSelect,
      handleSuggestionClick,
      handleToggle,
      handleSubmit,
    },
  };
};
