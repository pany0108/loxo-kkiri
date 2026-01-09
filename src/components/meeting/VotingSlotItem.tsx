import React from 'react';
import { CheckCircle2, AlertCircle, XCircle, MessageSquare, Clock, Calendar } from 'lucide-react';
import dayjs from 'dayjs';

interface VotingSlot {
  id: string;
  date: string;
  time: string;
  registeredMembers: string[];
  myVote: 'available' | 'maybe' | 'unavailable' | '';
  myMemo: string;
}

interface VotingSlotItemProps {
  slot: VotingSlot;
  onVote: (slotId: string, status: 'available' | 'maybe' | 'unavailable') => void;
  onMemoChange: (slotId: string, text: string) => void;
  conflictInfo?: { isConflict: boolean; title: string; time?: string };
}

const VotingSlotItem: React.FC<VotingSlotItemProps> = ({ slot, onVote, onMemoChange, conflictInfo }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-[24px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.05)] border-2 border-gray-50 dark:border-gray-700/50 space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 일정 정보 및 등록 멤버 표시 */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[15px] font-black text-gray-900 dark:text-white">{dayjs(slot.date).format('MM월 DD일 (ddd)')}</span>
          </div>
          <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-500/10 px-2 py-1 rounded-lg w-fit">
            <Clock size={14} />
            <span className="text-[13px]">{slot.time}</span>
          </div>
          {conflictInfo && (
            <div
              className={`mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-bold animate-in fade-in slide-in-from-top-1 border ${
                conflictInfo.isConflict
                  ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-500/20'
                  : 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-500/20'
              }`}
            >
              {conflictInfo.isConflict ? <AlertCircle size={14} /> : <Calendar size={14} />}
              <span className="truncate max-w-[180px]">
                {conflictInfo.title} ({conflictInfo.time})
              </span>
            </div>
          )}
        </div>

        {/* 등록 멤버 아바타 */}
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex -space-x-2">
            {slot.registeredMembers.map((m, i) => (
              <div
                key={i}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 border-2 border-white dark:border-gray-800 flex items-center justify-center text-[11px] font-black text-gray-500 dark:text-gray-400 shadow-sm"
              >
                {m[0]}
              </div>
            ))}
          </div>
          {slot.registeredMembers.length > 0 && <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500">{slot.registeredMembers.length}명 가능</span>}
        </div>
      </div>

      {/* 투표 버튼 그룹 (가능 / 아마도 / 불가능) */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => onVote(slot.id, 'available')}
          className={`flex flex-col items-center justify-center gap-2 py-4 rounded-[20px] border-2 transition-all active:scale-95
            ${
              slot.myVote === 'available'
                ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-200 dark:shadow-emerald-900/50'
                : conflictInfo?.isConflict
                ? 'bg-gray-50 dark:bg-gray-800/30 border-gray-100 dark:border-gray-700/50 text-gray-300 dark:text-gray-600 opacity-50 hover:opacity-100 hover:border-emerald-200 hover:text-emerald-500'
                : 'bg-white dark:bg-gray-700/50 border-gray-100 dark:border-gray-700 text-gray-300 dark:text-gray-500 hover:border-emerald-200 dark:hover:border-emerald-500/50 hover:text-emerald-500 dark:hover:text-emerald-400 hover:bg-emerald-50/30 dark:hover:bg-emerald-500/10'
            }`}
        >
          <CheckCircle2 size={24} className={slot.myVote === 'available' ? 'fill-white/20' : ''} />
          <span className="text-[12px] font-black">가능</span>
        </button>

        <button
          onClick={() => onVote(slot.id, 'maybe')}
          className={`flex flex-col items-center justify-center gap-2 py-4 rounded-[20px] border-2 transition-all active:scale-95
            ${
              slot.myVote === 'maybe'
                ? 'bg-amber-400 border-amber-400 text-white shadow-lg shadow-amber-200 dark:shadow-amber-900/50'
                : 'bg-white dark:bg-gray-700/50 border-gray-100 dark:border-gray-700 text-gray-300 dark:text-gray-500 hover:border-amber-200 dark:hover:border-amber-500/50 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-amber-50/30 dark:hover:bg-amber-500/10'
            }`}
        >
          <AlertCircle size={24} className={slot.myVote === 'maybe' ? 'fill-white/20' : ''} />
          <span className="text-[12px] font-black">아마도</span>
        </button>

        <button
          onClick={() => onVote(slot.id, 'unavailable')}
          className={`flex flex-col items-center justify-center gap-2 py-4 rounded-[20px] border-2 transition-all active:scale-95
            ${
              slot.myVote === 'unavailable'
                ? 'bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-200 dark:shadow-rose-900/50'
                : 'bg-white dark:bg-gray-700/50 border-gray-100 dark:border-gray-700 text-gray-300 dark:text-gray-500 hover:border-rose-200 dark:hover:border-rose-500/50 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50/30 dark:hover:bg-rose-500/10'
            }`}
        >
          <XCircle size={24} className={slot.myVote === 'unavailable' ? 'fill-white/20' : ''} />
          <span className="text-[12px] font-black">불가능</span>
        </button>
      </div>

      {/* 메모 입력 필드 */}
      <div className="group relative">
        <div className="flex items-center bg-gray-50 dark:bg-gray-700/50 border-2 border-transparent focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-gray-700 rounded-[18px] px-4 py-3 transition-all">
          <MessageSquare size={16} className="text-gray-300 dark:text-gray-500 mr-3 group-focus-within:text-blue-600" />
          <input
            value={slot.myMemo}
            onChange={(e) => onMemoChange(slot.id, e.target.value)}
            placeholder="메모 남기기 (선택)"
            className="bg-transparent border-none outline-none w-full text-[13px] font-bold text-gray-700 dark:text-white placeholder:text-gray-500"
          />
        </div>
      </div>
    </div>
  );
};

export default VotingSlotItem;
