import { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import lunisolar from 'lunisolar';
import { useFirestoreQuery } from '../hooks/useFirestore';

dayjs.extend(isSameOrBefore);

export interface CalendarType {
  id: string;
  name: string;
  members: string[];
  isPrivate: boolean;
  isDefault: boolean;
  color?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay: boolean;
  color: string;
  location?: string;
  attendees: string[];
  recurrence?: any;
  originalId?: string;
  calendarId: string;
  isLeapMonth?: boolean; // [추가] 윤달 여부
  isLunar?: boolean; // [추가] 음력 여부
}

interface CalendarContextType {
  myCalendars: CalendarType[];
  events: CalendarEvent[];
  activeCalendar: CalendarType | null;
  setActiveCalendar: (cal: CalendarType | null) => void;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

/**
 * Firestore Timestamp 또는 날짜 문자열을 dayjs 객체로 안전하게 변환합니다.
 * @param date - Firestore Timestamp, ISO 문자열, 또는 Date 객체
 * @returns dayjs 객체 또는 null
 */
const safeDayjs = (date: any): dayjs.Dayjs | null => {
  if (!date) return null;
  if (typeof date === 'string') return dayjs(date);
  if (date.toDate && typeof date.toDate === 'function') return dayjs(date.toDate()); // Firestore Timestamp
  return dayjs(date); // Fallback for Date objects
};

const expandRecurringEvents = (events: any[]) => {
  const expandedEvents: any[] = [];

  events.forEach((event) => {
    if (!event.recurrence || event.recurrence.frequency === 'none') {
      expandedEvents.push({ ...event, originalId: event.id });
      return;
    }

    const { frequency, endType, daysOfWeek } = event.recurrence;
    const interval = Math.max(1, parseInt(event.recurrence.interval || '1', 10));
    const endDate = event.recurrence.endDate;
    const endCount = event.recurrence.endCount ? parseInt(event.recurrence.endCount, 10) : 0;
    const isAllDay = event.allDay;

    const initialStart = safeDayjs(event.start);
    if (!initialStart) return; // 유효한 시작 날짜가 없으면 이벤트를 건너뜁니다.
    let currentStart: dayjs.Dayjs = initialStart;

    const durationDays = isAllDay && event.end ? safeDayjs(event.end)!.diff(initialStart, 'day') : 0;
    const durationMs = !isAllDay && event.end ? safeDayjs(event.end)!.diff(initialStart, 'ms') : 0;

    // 반복 종료일이 없으면, 넉넉하게 5년 후까지 이벤트를 확장합니다.
    const viewLimit = dayjs().add(5, 'year');
    const limitDate = endType === 'date' && endDate ? dayjs(endDate).endOf('day') : viewLimit;

    let count = 0;
    let loopSafety = 0; // 무한 루프 방지 장치
    const targetDays = daysOfWeek ? daysOfWeek.map(String) : [];
    const exceptions = event.recurrence.exceptions || [];

    while (loopSafety < 500) {
      // 최대 500회 반복으로 제한
      loopSafety++;

      // [추가] 음력 생일인 경우, 현재 반복 연도에 맞는 양력 날짜로 변환합니다.
      if (event.isLunar && frequency === 'yearly') {
        const originalLunarDate = safeDayjs(event.start);
        if (originalLunarDate) {
          const lunarMonth = originalLunarDate.month() + 1;
          const lunarDay = originalLunarDate.date();
          const currentLoopYear = currentStart.year();

          // lunisolar 라이브러리를 사용하여 해당 연도의 양력 날짜를 계산합니다.
          const luni = lunisolar.fromLunar({
            year: currentLoopYear,
            month: lunarMonth,
            day: lunarDay,
            isLeapMonth: event.isLeapMonth || false, // [추가] 윤달 여부 전달
          });
          const solarDate = luni.toDate();
          currentStart = dayjs(solarDate);
        }
      }

      if (currentStart.isAfter(limitDate)) break;
      if (endType === 'count' && count >= endCount) break;

      let shouldAdd = true;
      if (frequency === 'weekly' && targetDays.length > 0) {
        const currentDayStr = currentStart.day().toString();
        if (!targetDays.includes(currentDayStr)) {
          shouldAdd = false;
        }
      }

      const currentDateStr = currentStart.format('YYYY-MM-DD');
      if (exceptions.includes(currentDateStr)) {
        shouldAdd = false;
      }

      if (shouldAdd) {
        let finalStartStr, finalEndStr;

        if (isAllDay) {
          finalStartStr = currentStart.format('YYYY-MM-DD');
          const originalStart = safeDayjs(event.start);
          const originalEnd = safeDayjs(event.end);

          // 하루짜리 '종일' 일정 (생일 등)은 end 속성이 없어야 FullCalendar에서 올바르게 렌더링됩니다.
          // 1. end가 없거나, 2. start와 end가 같은 날짜인 경우(이전 데이터 호환)
          if (!originalEnd || (originalStart && originalStart.isSame(originalEnd, 'day'))) {
            finalEndStr = null;
          } else {
            // 여러 날에 걸친 '종일' 일정의 경우, 기간을 유지합니다.
            // diff는 이미 위에서 계산된 durationDays를 사용합니다.
            finalEndStr = currentStart.add(durationDays, 'day').format('YYYY-MM-DD');
          }
        } else {
          finalStartStr = currentStart.toISOString();
          finalEndStr = event.end ? currentStart.add(durationMs, 'millisecond').toISOString() : null;
        }

        expandedEvents.push({
          ...event,
          id: `${event.id}_${currentStart.format('YYYYMMDD')}`,
          originalId: event.id,
          start: finalStartStr,
          end: finalEndStr,
        });
        count++;
      }

      if (frequency === 'daily') {
        currentStart = currentStart.add(interval, 'day');
      } else if (frequency === 'weekly') {
        if (targetDays.length > 0) {
          currentStart = currentStart.add(1, 'day');
        } else {
          currentStart = currentStart.add(interval, 'week');
        }
      } else if (frequency === 'monthly') {
        currentStart = currentStart.add(interval, 'month');
      } else if (frequency === 'yearly') {
        currentStart = currentStart.add(interval, 'year');
      } else {
        break;
      }
    }
  });

  return expandedEvents;
};

export const CalendarProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [activeCalendar, setActiveCalendar] = useState<CalendarType | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setActiveCalendar(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const calendarsQuery = useMemo(() => {
    if (!user) return null;
    return query(collection(db, 'calendars'), where('members', 'array-contains', user.uid));
  }, [user]);

  const { data: myCalendarsData } = useFirestoreQuery<CalendarType>(calendarsQuery);
  const myCalendars = useMemo(() => myCalendarsData || [], [myCalendarsData]);

  useEffect(() => {
    if (myCalendars && myCalendars.length > 0) {
      setActiveCalendar((prev) => {
        if (prev && myCalendars.find((c) => c.id === prev.id)) return prev;
        return myCalendars.find((c) => c.isDefault) || myCalendars[0];
      });
    } else if (myCalendars) {
      setActiveCalendar(null);
    }
  }, [myCalendars]);

  const eventsQuery = useMemo(() => {
    if (!user) return null;
    return query(collection(db, 'schedules'), where('attendees', 'array-contains', user.uid));
  }, [user]);

  const { data: rawEvents } = useFirestoreQuery<any>(eventsQuery);

  const events = useMemo(() => {
    if (!rawEvents) return [];
    // Firestore의 isAllDay를 FullCalendar가 사용하는 allDay 속성으로 매핑합니다.
    const mappedEvents = rawEvents.map((event) => ({
      ...event,
      allDay: event.isAllDay,
    }));
    return expandRecurringEvents(mappedEvents);
  }, [rawEvents]);

  return <CalendarContext.Provider value={{ myCalendars, events, activeCalendar, setActiveCalendar }}>{children}</CalendarContext.Provider>;
};

export const useCalendar = () => {
  const context = useContext(CalendarContext);
  if (!context) throw new Error('useCalendar must be used within a CalendarProvider');
  return context;
};
