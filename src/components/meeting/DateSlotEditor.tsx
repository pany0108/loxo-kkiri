import dayjs from 'dayjs';
import { Calendar as CalendarIcon, Plus, Sparkles, X } from 'lucide-react';
import React from 'react';

interface TimeSlot {
  start: string;
  end: string;
  isAllDay: boolean;
}

interface DateSlotEditorProps {
  dateStr: string;
  slots: TimeSlot[];
  onToggleAllDay: (dateStr: string) => void;
  onTimeChange: (dateStr: string, index: number, field: 'start' | 'end', value: string) => void;
  onDeleteSlot: (dateStr: string, index: number) => void;
  onAddSlot: (dateStr: string) => void;
}

/**
 * 날짜별 시간대 편집 컴포넌트
 * - 특정 날짜의 시간대(Slot)를 추가, 삭제, 수정할 수 있습니다.
 * - '종일' 옵션을 토글할 수 있습니다.
 * @param {string} dateStr - 편집할 날짜 문자열 (YYYY-MM-DD)
 * @param {TimeSlot[]} slots - 해당 날짜의 시간대 목록
 * @param {function} onToggleAllDay - 종일 설정 토글 핸들러
 * @param {function} onTimeChange - 시간 변경 핸들러
 * @param {function} onDeleteSlot - 시간대 삭제 핸들러
 * @param {function} onAddSlot - 시간대 추가 핸들러
 */
const DateSlotEditor: React.FC<DateSlotEditorProps> = ({ dateStr, slots, onToggleAllDay, onTimeChange, onDeleteSlot, onAddSlot }) => {
  const isAllDay = slots?.[0]?.isAllDay;

  return (
    /* 컨테이너: 애니메이션 적용 */
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 헤더: 날짜 표시 및 종일 토글 스위치 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarIcon size={18} className="text-primary dark:text-blue-400" />
          <h3 className="text-[16px] font-black text-main dark:text-white">{dayjs(dateStr).format('MM월 DD일 (ddd)')}</h3>
        </div>

        <div onClick={() => onToggleAllDay(dateStr)} className="flex items-center gap-2 cursor-pointer group py-1">
          <span className={`text-[11px] font-bold transition-colors ${isAllDay ? 'text-emerald-600 dark:text-emerald-400' : 'text-sub'}`}>종일</span>
          <div className={`relative w-10 h-6 rounded-full transition-colors duration-200 shrink-0 ${isAllDay ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-700'}`}>
            <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow-sm transition-transform duration-200 ${isAllDay ? 'translate-x-4' : 'translate-x-0'}`} />
          </div>
        </div>
      </div>

      {/* 시간대 목록 영역 */}
      <div className="space-y-3">
        {isAllDay ? (
          /* 종일 설정 시 표시되는 메시지 */
          <div className="w-full h-[60px] bg-emerald-50 dark:bg-emerald-500/10 rounded-[20px] border border-emerald-100 dark:border-emerald-900/20 flex items-center justify-center gap-2 animate-in fade-in zoom-in-95 duration-200">
            <Sparkles size={16} className="text-emerald-500" />
            <span className="text-[14px] font-bold text-emerald-600 dark:text-emerald-300">이 날은 하루 종일 가능해요!</span>
          </div>
        ) : (
          <>
            {slots.map((slot, index) => (
              /* 개별 시간대 입력 필드 */
              <div
                key={index}
                className="relative flex items-center h-[60px] bg-white dark:bg-gray-800 rounded-[20px] shadow-sm border border-gray-100 dark:border-gray-700 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30 transition-all overflow-hidden"
              >
                <div className="flex-1 flex items-center justify-center gap-2 pr-10 pl-4">
                  <input
                    type="time"
                    value={slot.start}
                    onChange={(e) => onTimeChange(dateStr, index, 'start', e.target.value)}
                    className="bg-transparent border-none outline-none text-[14px] font-bold text-main dark:text-white text-center w-full min-w-[70px] p-0"
                  />
                  <span className="text-sub dark:text-gray-400 font-bold shrink-0">-</span>
                  <input
                    type="time"
                    value={slot.end}
                    onChange={(e) => onTimeChange(dateStr, index, 'end', e.target.value)}
                    className="bg-transparent border-none outline-none text-[14px] font-bold text-main dark:text-white text-center w-full min-w-[70px] p-0"
                  />
                </div>
                {slots.length > 1 && (
                  <button
                    onClick={() => onDeleteSlot(dateStr, index)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-sub dark:text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/50 rounded-full transition-colors z-10"
                    aria-label="시간대 삭제"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            ))}
            {/* 시간대 추가 버튼 */}
            <button
              onClick={() => onAddSlot(dateStr)}
              className="w-full h-[52px] border border-dashed border-gray-300 dark:border-gray-600 rounded-[20px] flex items-center justify-center gap-2 text-sub dark:text-gray-400 font-bold text-[13px] hover:border-primary dark:hover:border-blue-500 hover:text-primary dark:hover:text-blue-400 hover:bg-primary/10 dark:hover:bg-blue-900/20 transition-all active:scale-[0.99]"
            >
              <Plus size={16} strokeWidth={2.5} />
              시간대 추가
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default DateSlotEditor;
