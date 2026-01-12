import React from 'react';
import { X, Trash2, User, Users, Home, Briefcase, GraduationCap, Dumbbell, Plane, Music, Heart, Star, Gift, Coffee, ShoppingCart, Gamepad2 } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import { CalendarEvent, CalendarType } from 'contexts';
import { motion, AnimatePresence } from 'framer-motion';

dayjs.locale('ko');

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

interface EventListSheetProps {
  isVisible: boolean;
  onClose: () => void;
  selectedDate: string | null;
  events: CalendarEvent[];
  onListItemClick: (event: CalendarEvent) => void;
  isJiggleMode: boolean;
  jigglingItemId: string | null;
  onPointerDown: (event: CalendarEvent) => void;
  onPointerUp: () => void;
  onPointerLeave: () => void;
  onDeleteClick: (event: CalendarEvent, e: React.MouseEvent) => void;
  listRef: React.RefObject<HTMLDivElement>;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  exitJiggleMode: () => void;
  slideDirection?: 'left' | 'right';
  activeCalendar: CalendarType | null;
  myCalendars: CalendarType[];
}

const EventListSheet: React.FC<EventListSheetProps> = ({
  isVisible,
  onClose,
  selectedDate,
  events,
  onListItemClick,
  isJiggleMode,
  jigglingItemId,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  onDeleteClick,
  listRef,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  exitJiggleMode,
  slideDirection = 'right',
  activeCalendar,
  myCalendars,
}) => {
  const filteredEvents = events.filter((event: CalendarEvent) => {
    if (!selectedDate) return false;
    if (event.calendarId === 'holidays') return false;

    // [수정] 종일 일정 필터링 로직 개선
    if (event.allDay) {
      const targetDateStr = selectedDate;
      const startDateStr = dayjs(event.start).format('YYYY-MM-DD');

      if (!event.end) {
        return startDateStr === targetDateStr;
      }

      const endDateStr = dayjs(event.end).format('YYYY-MM-DD');

      // 종료일이 시작일과 같은 경우 (단일 일정인데 end가 있는 경우)
      if (startDateStr === endDateStr) {
        return startDateStr === targetDateStr;
      }

      // 범위 일정 (exclusive end: 종료일은 포함하지 않음)
      return targetDateStr >= startDateStr && targetDateStr < endDateStr;
    }

    const targetDate = dayjs(selectedDate);
    const eventStart = dayjs(event.start);
    const eventEnd = event.end ? dayjs(event.end) : null;

    if (!eventEnd) {
      return eventStart.isSame(targetDate, 'day');
    }
    return eventStart.isBefore(targetDate.endOf('day')) && eventEnd.isAfter(targetDate.startOf('day'));
  });

  return (
    <div
      ref={listRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      className={`absolute left-0 right-0 bottom-0 bg-white dark:bg-gray-900 z-30 transition-transform duration-500 border-t border-gray-100 dark:border-gray-800 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] rounded-t-[32px] ${
        isVisible ? 'translate-y-0' : 'translate-y-full'
      }`}
      style={{ height: '50%', transitionTimingFunction: 'cubic-bezier(0.32, 0.72, 0, 1)' }}
    >
      <div className="w-full flex justify-center pt-3 pb-1" onClick={onClose}>
        <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full" />
      </div>

      <div className="flex items-center justify-between px-6 pt-2 pb-4 bg-white dark:bg-gray-900">
        <div className="flex items-center gap-2">
          <h3 className="text-[16px] font-black text-[#191F28] dark:text-white">{selectedDate ? `${parseInt(selectedDate.split('-')[2])}일의 일정` : '일정'}</h3>
        </div>
        <button onClick={onClose} className="p-2 -mr-2 text-[#8B95A1] dark:text-gray-500 hover:text-[#191F28] dark:hover:text-gray-300 transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="px-6 pb-24 overflow-y-auto h-full" onClick={exitJiggleMode}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={selectedDate}
            initial={{ opacity: 0, x: slideDirection === 'right' ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: slideDirection === 'right' ? -20 : 20 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            {filteredEvents.map((event: CalendarEvent, index: number) => {
              const originalId = event.originalId || event.id!;
              const displayStart = (event as any).extendedProps?.originalStart || event.start;
              const displayEnd = (event as any).extendedProps?.originalEnd || event.end;
              const displayAllDay = (event as any).extendedProps?.originalAllDay ?? event.allDay;

              const eventCalendar = myCalendars.find((c) => c.id === event.calendarId);
              let IconComponent = null;
              if (activeCalendar?.isDefault && eventCalendar && !eventCalendar.isDefault && eventCalendar.icon) {
                IconComponent = ICON_MAP[eventCalendar.icon];
              }

              let timeDisplay = '';
              if (displayAllDay) {
                timeDisplay = '종일';
              } else {
                const start = dayjs(displayStart);
                const end = displayEnd ? dayjs(displayEnd) : null;
                if (end && !start.isSame(end, 'day')) {
                  if (start.isSame(end, 'month')) {
                    timeDisplay = `${start.format('M월 D일 A h:mm')} ~ ${end.format('D일 A h:mm')}`;
                  } else {
                    timeDisplay = `${start.format('M월 D일 A h:mm')} ~ ${end.format('M월 D일 A h:mm')}`;
                  }
                } else {
                  timeDisplay = `${start.format('A h:mm')} - ${end ? end.format('A h:mm') : ''}`;
                }
              }

              return (
                <div
                  key={`${originalId}-${index}`}
                  onPointerDown={() => onPointerDown(event)}
                  onPointerUp={onPointerUp}
                  onPointerLeave={onPointerLeave}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isJiggleMode) {
                      exitJiggleMode();
                      return;
                    }
                    onListItemClick(event);
                  }}
                  className={`relative bg-white dark:bg-gray-800 p-5 rounded-[24px] border-2 border-gray-50 dark:border-gray-700/50 shadow-sm active:scale-[0.98] transition-all cursor-pointer group hover:shadow-md overflow-hidden ${
                    isJiggleMode ? 'jiggle-animation' : ''
                  }`}
                >
                  {isJiggleMode && jigglingItemId === event.id && (
                    <button
                      onClick={(e) => onDeleteClick(event, e)}
                      className="absolute bottom-4 right-4 w-9 h-9 bg-red-500 text-white rounded-full flex items-center justify-center z-20 shadow-lg animate-in zoom-in-95"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                  <div className="absolute left-0 top-0 bottom-0 w-[6px]" style={{ backgroundColor: event.color || '#007AFF' }} />
                  <div className="pl-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2 py-1 bg-gray-50 dark:bg-gray-700/50 text-[10px] font-bold text-[#8B95A1] dark:text-gray-400 rounded-[8px]">{timeDisplay}</span>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-[#8B95A1] dark:text-gray-500">
                        {event.attendees.length > 1 ? <Users size={12} /> : <User size={12} />}
                        <span>{event.attendees.length > 1 ? `${event.attendees.length}명` : '나'}</span>
                      </div>
                    </div>
                    <h4 className="text-[15px] font-black text-[#191F28] dark:text-white mb-1 transition-colors truncate">{event.title}</h4>
                    <div className="flex items-center justify-between">
                      {event.location ? (
                        <p className="text-[12px] font-medium text-[#8B95A1] dark:text-gray-500 flex items-center gap-1 truncate flex-1 mr-2">{event.location}</p>
                      ) : (
                        <div />
                      )}
                      {IconComponent && (
                        <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-700/50 px-1.5 py-0.5 rounded-md shrink-0" title={eventCalendar?.name}>
                          <IconComponent size={12} className="text-[#8B95A1] dark:text-gray-400" />
                          <span className="text-[10px] font-bold text-[#8B95A1] dark:text-gray-400 truncate max-w-[60px]">{eventCalendar?.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredEvents.length === 0 && <div className="py-10 text-center text-[#8B95A1] dark:text-gray-500 text-[13px] font-medium">일정이 없습니다.</div>}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default EventListSheet;
