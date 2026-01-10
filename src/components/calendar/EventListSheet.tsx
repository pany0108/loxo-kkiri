import React from 'react';
import { X, Trash2, User, Users } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import { CalendarEvent } from 'contexts';
import { motion, AnimatePresence } from 'framer-motion';

dayjs.locale('ko');

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
}) => {
  const filteredEvents = events.filter((event: CalendarEvent) => {
    if (!selectedDate) return false;
    if (event.calendarId === 'holidays') return false;

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
      className={`absolute left-0 right-0 bottom-0 bg-white dark:bg-gray-800 z-30 transition-transform duration-300 ease-sheet-ease border-t border-gray-100 dark:border-gray-700 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] rounded-t-[32px] ${
        isVisible ? 'translate-y-0' : 'translate-y-full'
      }`}
      style={{ height: '50%' }}
    >
      <div className="w-full flex justify-center pt-3 pb-1" onClick={onClose}>
        <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full" />
      </div>

      <div className="flex items-center justify-between px-6 pt-2 pb-4 bg-white dark:bg-gray-800">
        <div className="flex items-center gap-2">
          <h3 className="text-[16px] font-black text-gray-900 dark:text-white">{selectedDate ? `${parseInt(selectedDate.split('-')[2])}일의 일정` : '일정'}</h3>
        </div>
        <button onClick={onClose} className="p-2 -mr-2 text-gray-300 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-300 transition-colors">
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
                  className={`relative bg-white dark:bg-gray-800/50 p-5 rounded-[24px] border border-gray-100 dark:border-gray-700/50 shadow-sm active:scale-[0.98] transition-all cursor-pointer group hover:shadow-md overflow-hidden ${
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
                  <div className="absolute left-0 top-0 bottom-0 w-[6px]" style={{ backgroundColor: event.color || '#3b82f6' }} />
                  <div className="pl-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2 py-1 bg-gray-50 dark:bg-gray-700 text-[10px] font-bold text-gray-600 dark:text-gray-300 rounded-[8px]">{timeDisplay}</span>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 dark:text-gray-500">
                        {event.attendees.length > 1 ? <Users size={12} /> : <User size={12} />}
                        <span>{event.attendees.length > 1 ? `${event.attendees.length}명` : '나'}</span>
                      </div>
                    </div>
                    <h4 className="text-[15px] font-black text-gray-900 dark:text-white mb-1 group-hover:text-blue-600 transition-colors truncate">{event.title}</h4>
                    {event.location && <p className="text-[12px] font-medium text-gray-400 dark:text-gray-500 flex items-center gap-1 truncate">{event.location}</p>}
                  </div>
                </div>
              );
            })}
            {filteredEvents.length === 0 && <div className="py-10 text-center text-gray-400 dark:text-gray-500 text-[13px] font-medium">일정이 없습니다.</div>}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default EventListSheet;
