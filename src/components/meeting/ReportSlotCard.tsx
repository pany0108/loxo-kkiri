import React from 'react';
import dayjs from 'dayjs';
import { CheckCircle2, AlertCircle, XCircle, MessageSquare, Clock } from 'lucide-react';

interface ReportSlot {
  id: string;
  date: string;
  time: string;
  responses: {
    available: string[];
    maybe: string[];
    unavailable: string[];
  };
  memos: { user: string; text: string }[];
  isAllAvailable: boolean;
}

interface ReportSlotCardProps {
  slot: ReportSlot;
  status: 'PENDING' | 'VOTING' | 'CONFIRMED';
  onConfirmClick: (slot: ReportSlot) => void;
}

const ReportSlotCard: React.FC<ReportSlotCardProps> = ({ slot, status, onConfirmClick }) => {
  return (
    <div
      className={`rounded-[32px] overflow-hidden border-2 transition-all duration-300 ${
        slot.isAllAvailable
          ? 'bg-white dark:bg-gray-800 border-emerald-500 dark:border-emerald-700 shadow-xl shadow-emerald-50 dark:shadow-emerald-900/30 ring-4 ring-emerald-50 dark:ring-emerald-900/20 scale-[1.02]'
          : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 shadow-sm'
      }`}
    >
      <div className={`px-6 py-5 flex justify-between items-start ${slot.isAllAvailable ? 'bg-emerald-50/30 dark:bg-emerald-500/10' : 'bg-gray-50 dark:bg-gray-800/50'}`}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[16px] font-black text-gray-900 dark:text-white">{dayjs(slot.date).format('MM월 DD일 (ddd)')}</span>
            {slot.isAllAvailable && (
              <span className="bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse shadow-sm shadow-emerald-200">BEST CHOICE</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 font-bold">
            <Clock size={14} />
            <span className="text-[13px]">{slot.time}</span>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        <div className="space-y-4">
          {/* Available */}
          <div className="flex items-start gap-3 p-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-500/10 border border-emerald-100/50 dark:border-emerald-900/50">
            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 shadow-sm">
              <CheckCircle2 size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Available</span>
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/50 px-1.5 py-0.5 rounded-md">
                  {slot.responses.available.length}명
                </span>
              </div>
              <p className="text-[13px] font-bold text-gray-700 dark:text-gray-300 truncate">{slot.responses.available.length > 0 ? slot.responses.available.join(', ') : '-'}</p>
            </div>
          </div>

          {/* Maybe */}
          <div
            className={`flex items-start gap-3 p-3 rounded-2xl border ${
              slot.responses.maybe.length > 0
                ? 'bg-amber-50/50 dark:bg-amber-500/10 border-amber-100/50 dark:border-amber-900/50'
                : 'bg-gray-50 dark:bg-gray-800/50 border-transparent opacity-60'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                slot.responses.maybe.length > 0
                  ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
              }`}
            >
              <AlertCircle size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-[11px] font-black uppercase tracking-wide ${
                    slot.responses.maybe.length > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400 dark:text-gray-500'
                  }`}
                >
                  Maybe
                </span>
                <span
                  className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md ${
                    slot.responses.maybe.length > 0
                      ? 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/50'
                      : 'text-gray-400 dark:text-gray-500 bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  {slot.responses.maybe.length}명
                </span>
              </div>
              <p className="text-[13px] font-bold text-gray-700 dark:text-gray-300 truncate">{slot.responses.maybe.length > 0 ? slot.responses.maybe.join(', ') : '-'}</p>
            </div>
          </div>

          {/* Unavailable */}
          <div
            className={`flex items-start gap-3 p-3 rounded-2xl border ${
              slot.responses.unavailable.length > 0
                ? 'bg-rose-50/50 dark:bg-rose-500/10 border-rose-100/50 dark:border-rose-900/50'
                : 'bg-gray-50 dark:bg-gray-800/50 border-transparent opacity-60'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                slot.responses.unavailable.length > 0
                  ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
              }`}
            >
              <XCircle size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-[11px] font-black uppercase tracking-wide ${
                    slot.responses.unavailable.length > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-gray-400 dark:text-gray-500'
                  }`}
                >
                  Unavailable
                </span>
                <span
                  className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md ${
                    slot.responses.unavailable.length > 0
                      ? 'text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/50'
                      : 'text-gray-400 dark:text-gray-500 bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  {slot.responses.unavailable.length}명
                </span>
              </div>
              <p className="text-[13px] font-bold text-gray-700 dark:text-gray-300 truncate">
                {slot.responses.unavailable.length > 0 ? slot.responses.unavailable.join(', ') : '-'}
              </p>
            </div>
          </div>
        </div>

        {slot.memos.length > 0 && (
          <div className="pt-2">
            <div className="space-y-2">
              {slot.memos.map((memo, i) => (
                <div
                  key={i}
                  className="flex gap-2 text-[12px] text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 px-3 py-2.5 rounded-xl border border-gray-100 dark:border-gray-700"
                >
                  <MessageSquare size={14} className="shrink-0 mt-0.5 text-gray-400 dark:text-gray-500" />
                  <span>
                    <strong className="text-gray-900 dark:text-gray-200 mr-1">{memo.user}:</strong>
                    {memo.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {status !== 'CONFIRMED' && (
          <button
            onClick={() => onConfirmClick(slot)}
            className={`w-full py-4 rounded-[20px] font-black text-[15px] transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-2 ${
              slot.isAllAvailable
                ? 'bg-emerald-500 text-white shadow-emerald-200 dark:shadow-emerald-900/50 hover:bg-emerald-600'
                : 'bg-white dark:bg-gray-700 text-gray-400 dark:text-gray-400 border-2 border-gray-100 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:text-gray-600 dark:hover:text-gray-300 shadow-none'
            }`}
          >
            {slot.isAllAvailable ? (
              <>
                <CheckCircle2 size={18} /> 이 시간으로 확정하기
              </>
            ) : (
              '선택하기'
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default ReportSlotCard;
