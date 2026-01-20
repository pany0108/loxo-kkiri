import React from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { AlertCircle, CheckCircle2, Clock, Loader2, MapPin, Sparkles, Users, XCircle } from 'lucide-react';

import { PageFooter, PageHeader, PageLayout, PageTitle } from 'components';
import { useMeetingParticipantStatus } from 'hooks';

/**
 * 참여자용 투표 현황 페이지 컴포넌트
 * - 투표가 완료된 후, 주최자가 확정하기 전까지 전체 투표 결과를 보여줍니다.
 * @returns {JSX.Element} 참여자 현황 화면
 */
const MeetingParticipantStatus = () => {
  const navigate = useNavigate();
  const { state } = useMeetingParticipantStatus();
  const { meetingData, loading, statusData, totalMembers, votedCount, votedUids, allParticipants } = state;

  if (loading || !meetingData) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-white dark:bg-gray-950">
        <Loader2 className="animate-spin text-primary w-8 h-8" />
      </div>
    );
  }

  return (
    <PageLayout
      title="투표 현황"
      footer={
        <PageFooter>
          <button
            onClick={() => navigate('/propose')}
            className="w-full h-[56px] bg-primary text-white rounded-[20px] font-black text-[16px] shadow-lg shadow-primary/20 dark:shadow-blue-900/50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            목록으로 돌아가기
          </button>
        </PageFooter>
      }
    >
      <PageHeader icon={<Sparkles className="text-primary dark:text-blue-400 w-6 h-6" />}>
        <>
          <div className="flex items-center gap-2 mb-2">
            {meetingData.isRetry && (
              <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-[11px] font-bold px-2 py-1 rounded-md">재요청</span>
            )}
            <h3 className="text-lg font-bold text-sub dark:text-gray-400">{meetingData.title}</h3>
          </div>
          {meetingData.location && (
            <div className="flex items-center gap-2 text-sub dark:text-gray-400 font-medium mb-2">
              <MapPin size={16} />
              <span>{meetingData.location}</span>
            </div>
          )}
          <PageTitle>
            투표가 완료되었습니다.
            <br />
            <span className="text-primary dark:text-blue-400">주최자의 확정을 기다려주세요.</span>
          </PageTitle>
        </>
      </PageHeader>
      <div className="mb-8">
        <div className="mt-4 flex items-center gap-2 text-[13px] font-bold text-sub dark:text-gray-300 bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-lg w-fit">
          <Users size={16} />
          <span>
            참여 현황: {votedCount} / {totalMembers}명
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {allParticipants.map((p) => (
            <div
              key={p.uid}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                votedUids.has(p.uid) ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-gray-50 dark:bg-gray-700 text-sub dark:text-gray-500'
              }`}
            >
              {votedUids.has(p.uid) && <CheckCircle2 size={12} />}
              <span>{p.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {statusData.map((slot) => (
          <div key={slot.id} className="bg-white dark:bg-gray-800 rounded-2xl p-5 border-2 border-gray-100 dark:border-gray-700/50 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[16px] font-black text-main dark:text-white">{dayjs(slot.date).format('MM월 DD일 (ddd)')}</span>
                </div>
                <div className="flex items-center gap-1.5 text-sub dark:text-gray-400 font-bold">
                  <Clock size={14} />
                  <span className="text-[13px]">{slot.time}</span>
                </div>
              </div>
            </div>

            {/* 투표 현황 바 */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <CheckCircle2 size={14} />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-[11px] font-bold mb-1">
                    <span className="text-sub dark:text-gray-300">가능 ({slot.counts.available}명)</span>
                    <span className="text-sub dark:text-gray-500">{slot.voters.available.join(', ')}</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${(slot.counts.available / (totalMembers || 1)) * 100}%` }} />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                  <AlertCircle size={14} />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-[11px] font-bold mb-1">
                    <span className="text-sub dark:text-gray-300">미정 ({slot.counts.maybe}명)</span>
                    <span className="text-sub dark:text-gray-500">{slot.voters.maybe.join(', ')}</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full transition-all duration-500" style={{ width: `${(slot.counts.maybe / (totalMembers || 1)) * 100}%` }} />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                  <XCircle size={14} />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-[11px] font-bold mb-1">
                    <span className="text-sub dark:text-gray-300">불가능 ({slot.counts.unavailable}명)</span>
                    <span className="text-sub dark:text-gray-500">{slot.voters.unavailable.join(', ')}</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 rounded-full transition-all duration-500" style={{ width: `${(slot.counts.unavailable / (totalMembers || 1)) * 100}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </PageLayout>
  );
};

export default MeetingParticipantStatus;
