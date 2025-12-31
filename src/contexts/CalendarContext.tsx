import { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
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
}

interface CalendarContextType {
  myCalendars: CalendarType[];
  events: CalendarEvent[];
  activeCalendar: CalendarType | null;
  setActiveCalendar: (cal: CalendarType | null) => void;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

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

    let currentStart = dayjs(event.start);
    let currentEnd = event.end ? dayjs(event.end) : null;

    const durationDays = isAllDay && currentEnd ? currentEnd.diff(currentStart, 'day') : 0;
    const durationMs = !isAllDay && currentEnd ? currentEnd.diff(currentStart) : 0;

    const limitDate = endType === 'date' && endDate ? dayjs(endDate).endOf('day') : dayjs().add(2, 'year');

    let count = 0;
    let loopSafety = 0;
    const targetDays = daysOfWeek ? daysOfWeek.map(String) : [];
    const exceptions = event.recurrence.exceptions || [];

    while (loopSafety < 2000) {
      loopSafety++;

      if (endType === 'date' && currentStart.isAfter(limitDate)) break;
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
          finalEndStr = currentEnd ? currentStart.add(durationDays, 'day').format('YYYY-MM-DD') : null;
        } else {
          finalStartStr = currentStart.toISOString();
          finalEndStr = currentEnd ? currentStart.add(durationMs, 'millisecond').toISOString() : null;
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
