import dayjs from 'dayjs';
import { AlertCircle, Calendar, CheckCircle2, Clock, MessageSquare, TriangleAlert, XCircle } from 'lucide-react';
import React, { useState } from 'react';

interface VotingSlot {
  id: string;
  date: string;
  time: string;
  registeredMembers: string[];
  myVote: 'available' | 'maybe' | 'unavailable' | '';
  myMemo: string;
}

// 충돌 정보 상세 인터페이스
interface ConflictDetail {
  date: string;
  title: string;
  time: string;
}

interface VotingSlotItemProps {
  slot: VotingSlot;
  onVote: (slotId: string, status: 'available' | 'maybe' | 'unavailable') => void;
  onMemoChange: (slotId: string, text: string) => void;
  conflictInfo?: { isConflict: boolean; title?: string; time?: string; conflicts?: ConflictDetail[] };
}

/**
 * 투표용 시간대 아이템 컴포넌트
 * - 특정 시간대에 대해 가능/아마도/불가능 투표를 할 수 있습니다.
 * - 충돌 일정 정보를 표시합니다.
 * @param {VotingSlot} slot - 투표 대상 시간대 정보
 * @param {function} onVote - 투표 핸들러
 * @param {function} onMemoChange - 메모 변경 핸들러
 * @param {object} [conflictInfo] - 일정 충돌 정보
 */
const VotingSlotItem: React.FC<VotingSlotItemProps> = ({ slot, onVote, onMemoChange, conflictInfo }) => {
  // 충돌 일정 펼치기/접기 상태
  const [isExpanded, setIsExpanded] = useState(false);

  // 날짜 범위 처리 로직
  const isRange = slot.date.includes(':');
  let dateDisplay = dayjs(slot.date).format('MM월 DD일 (ddd)');

  if (isRange) {
    const [start, end] = slot.date.split(':');
    dateDisplay = `${dayjs(start).format('MM.DD')} ~ ${dayjs(end).format('MM.DD')}`;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-card border-2 border-gray-100 dark:border-gray-700/50 space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 일정 정보 및 등록 멤버 표시 */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[15px] font-black text-main dark:text-white">{dateDisplay}</span>
          </div>
          {!isRange && (
            <div className="flex items-center gap-1.5 text-primary dark:text-blue-400 font-bold bg-primary/10 dark:bg-blue-500/10 px-2 py-1 rounded-lg w-fit">
              <Clock size={14} />
              <span className="text-[13px]">{slot.time}</span>
            </div>
          )}
          {conflictInfo && (
            <div className="mt-2 flex flex-col gap-1 animate-in fade-in slide-in-from-top-1">
              {conflictInfo.conflicts ? (
                // 충돌 일정이 많을 경우 일부만 표시하고 더보기 버튼 제공
                <>
                  {conflictInfo.conflicts.slice(0, isExpanded ? undefined : 2).map((c, idx) => (
                    <div
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-bold border bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-500/20 w-fit"
                    >
                      <AlertCircle size={12} className="shrink-0" />
                      <span className="shrink-0">{c.date}</span>
                      <span className="truncate max-w-[120px]">{c.title}</span>
                      <span className="shrink-0 opacity-80 font-medium">{c.time}</span>
                    </div>
                  ))}
                  {conflictInfo.conflicts.length > 2 && (
                    <button
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="text-[11px] font-bold text-sub hover:text-main dark:text-gray-500 dark:hover:text-gray-300 text-left px-1 mt-0.5 w-fit transition-colors"
                    >
                      {isExpanded ? '접기' : `외 ${conflictInfo.conflicts.length - 2}건 더보기`}
                    </button>
                  )}
                </>
              ) : (
                // 기존 단일 충돌 일정 표시
                <div
                  className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-bold border ${
                    conflictInfo.isConflict
                      ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-500/20'
                      : 'bg-primary/10 dark:bg-blue-500/10 text-primary dark:text-blue-400 border-primary/20 dark:border-blue-500/20'
                  }`}
                >
                  {conflictInfo.isConflict ? <TriangleAlert size={14} /> : <Calendar size={14} />}
                  <span className="truncate max-w-[180px]">
                    {conflictInfo.title} ({conflictInfo.time})
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 등록 멤버 아바타 */}
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex -space-x-2">
            {slot.registeredMembers.map((m, i) => (
              <div
                key={i}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 border-2 border-white dark:border-gray-800 flex items-center justify-center text-[11px] font-black text-sub dark:text-gray-400 shadow-sm"
              >
                {m[0]}
              </div>
            ))}
          </div>
          {slot.registeredMembers.length > 0 && <span className="text-[10px] font-bold text-sub dark:text-gray-500">{slot.registeredMembers.length}명 가능</span>}
        </div>
      </div>

      {/* 투표 버튼 그룹 (가능 / 아마도 / 불가능) */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => onVote(slot.id, 'available')}
          className={`flex flex-col items-center justify-center gap-2 py-4 rounded-xl border-2 transition-all active:scale-95
            ${
              slot.myVote === 'available'
                ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-200 dark:shadow-emerald-900/50'
                : conflictInfo?.isConflict
                ? 'bg-gray-50 dark:bg-gray-800/30 border-gray-100 dark:border-gray-700/50 text-gray-300 dark:text-gray-600 opacity-50 hover:opacity-100 hover:border-emerald-200 hover:text-emerald-500'
                : 'bg-white dark:bg-gray-700/50 border-gray-100 dark:border-gray-700 text-sub dark:text-gray-500 hover:border-emerald-200 dark:hover:border-emerald-500/50 hover:text-emerald-500 dark:hover:text-emerald-400 hover:bg-emerald-50/30 dark:hover:bg-emerald-500/10'
            }`}
        >
          <CheckCircle2 size={24} className={slot.myVote === 'available' ? 'fill-white/20' : ''} />
          <span className="text-[12px] font-black">가능</span>
        </button>

        <button
          onClick={() => onVote(slot.id, 'maybe')}
          className={`flex flex-col items-center justify-center gap-2 py-4 rounded-xl border-2 transition-all active:scale-95
            ${
              slot.myVote === 'maybe'
                ? 'bg-amber-400 border-amber-400 text-white shadow-lg shadow-amber-200 dark:shadow-amber-900/50'
                : 'bg-white dark:bg-gray-700/50 border-gray-100 dark:border-gray-700 text-sub dark:text-gray-500 hover:border-amber-200 dark:hover:border-amber-500/50 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-amber-50/30 dark:hover:bg-amber-500/10'
            }`}
        >
          <AlertCircle size={24} className={slot.myVote === 'maybe' ? 'fill-white/20' : ''} />
          <span className="text-[12px] font-black">아마도</span>
        </button>

        <button
          onClick={() => onVote(slot.id, 'unavailable')}
          className={`flex flex-col items-center justify-center gap-2 py-4 rounded-xl border-2 transition-all active:scale-95
            ${
              slot.myVote === 'unavailable'
                ? 'bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-200 dark:shadow-rose-900/50'
                : 'bg-white dark:bg-gray-700/50 border-gray-100 dark:border-gray-700 text-sub dark:text-gray-500 hover:border-rose-200 dark:hover:border-rose-500/50 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50/30 dark:hover:bg-rose-500/10'
            }`}
        >
          <XCircle size={24} className={slot.myVote === 'unavailable' ? 'fill-white/20' : ''} />
          <span className="text-[12px] font-black">불가능</span>
        </button>
      </div>

      {/* 메모 입력 필드 */}
      <div className="group relative">
        <div className="flex items-center bg-gray-50 dark:bg-gray-700/50 border-2 border-transparent focus-within:border-primary focus-within:bg-white dark:focus-within:bg-gray-700 rounded-lg px-4 py-3 transition-all">
          <MessageSquare size={16} className="text-sub dark:text-gray-500 mr-3 group-focus-within:text-primary" />
          <input
            value={slot.myMemo}
            onChange={(e) => onMemoChange(slot.id, e.target.value)}
            placeholder="메모 남기기 (선택)"
            className="bg-transparent border-none outline-none w-full text-[13px] font-bold text-main dark:text-white placeholder:text-sub"
          />
        </div>
      </div>
    </div>
  );
};

export default VotingSlotItem;
