import React, { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, CheckCircle2, AlertCircle, XCircle, Sparkles, Clock, Users, Loader2, MapPin } from 'lucide-react';
import dayjs from 'dayjs';
import { doc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useFirestoreDoc } from 'hooks';

interface MeetingData {
  id: string;
  title: string;
  description?: string;
  location?: string;
  participants: string[];
  invitedFriends?: { uid: string; name: string }[];
  dates: string[];
  timeSlots: Record<string, { start: string; end: string; isAllDay: boolean }[]>;
  votes?: Record<string, Record<string, { vote: 'available' | 'maybe' | 'unavailable'; memo: string; name: string }>>;
  responses?: Record<string, any>;
  status: 'PENDING' | 'VOTING' | 'CONFIRMED';
}

interface StatusSlot {
  id: string;
  date: string;
  time: string;
  counts: { available: number; maybe: number; unavailable: number };
  voters: { available: string[]; maybe: string[]; unavailable: string[] };
  isAllVoted: boolean;
}

const MeetingParticipantStatus = () => {
  const navigate = useNavigate();
  const { id: meetingId } = useParams<{ id: string }>();

  const meetingDocRef = useMemo(() => (meetingId ? doc(db, 'meetings', meetingId) : null), [meetingId]);
  const { data: meetingData, loading } = useFirestoreDoc<MeetingData>(meetingDocRef);

  // VOTING 상태일 때 투표 현황 데이터
  const statusData: StatusSlot[] = useMemo(() => {
    if (!meetingData || meetingData.status !== 'VOTING') return [];

    const slots: StatusSlot[] = [];
    meetingData.dates.sort().forEach((dateStr) => {
      meetingData.timeSlots[dateStr]?.forEach((ts, index) => {
        const slotId = `${dateStr}_${index}`;
        const votesForSlot = meetingData.votes?.[slotId] || {};
        const voteValues = Object.values(votesForSlot);

        const available = voteValues.filter((v) => v.vote === 'available').map((v) => v.name);
        const maybe = voteValues.filter((v) => v.vote === 'maybe').map((v) => v.name);
        const unavailable = voteValues.filter((v) => v.vote === 'unavailable').map((v) => v.name);

        slots.push({
          id: slotId,
          date: dateStr,
          time: ts.isAllDay ? '종일' : `${ts.start} ~ ${ts.end}`,
          counts: { available: available.length, maybe: maybe.length, unavailable: unavailable.length },
          voters: { available, maybe, unavailable },
          isAllVoted: voteValues.length >= meetingData.participants.length,
        });
      });
    });

    // '가능' 인원이 많은 순서로 정렬
    return slots.sort((a, b) => b.counts.available - a.counts.available);
  }, [meetingData]);

  if (loading || !meetingData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-950">
        <Loader2 className="animate-spin text-blue-500 w-8 h-8" />
      </div>
    );
  }

  const totalMembers = meetingData.participants.length;
  const firstSlotVotes = meetingData.votes?.[`${meetingData.dates[0]}_0`] || {};
  const votedCount = Object.keys(firstSlotVotes).length;

  const votedUids = new Set(Object.keys(firstSlotVotes));
  const allParticipants = meetingData.invitedFriends?.map((f) => ({ uid: f.uid, name: f.name })) || [];
  // [수정] 현재 사용자가 이미 목록에 있는지 확인 후 추가
  if (auth.currentUser && !allParticipants.some((p) => p.uid === auth.currentUser!.uid)) {
    allParticipants.push({ uid: auth.currentUser.uid, name: auth.currentUser.displayName || '나' });
  }

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-950 font-['Pretendard']">
      <nav className="px-6 pt-6 flex items-center sticky top-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md z-10">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
          <ChevronLeft size={28} />
        </button>
      </nav>

      <div className="flex-1 px-6 pt-4 pb-20 overflow-y-auto w-full">
        <header className="mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-50 dark:bg-blue-500/10 rounded-xl mb-6">
            <Sparkles className="text-blue-600 dark:text-blue-400 w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-gray-500 dark:text-gray-400 mb-2">{meetingData.title}</h3>
          {meetingData.location && (
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 font-medium mb-2">
              <MapPin size={16} />
              <span>{meetingData.location}</span>
            </div>
          )}
          <h2 className="text-2xl font-black text-gray-900 dark:text-white leading-[1.3] tracking-tight">
            투표가 완료되었습니다.
            <br />
            <span className="text-blue-600 dark:text-blue-400">주최자의 확정을 기다려주세요.</span>
          </h2>
          <div className="mt-4 flex items-center gap-2 text-[13px] font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-lg w-fit">
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
                  votedUids.has(p.uid)
                    ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                }`}
              >
                {votedUids.has(p.uid) && <CheckCircle2 size={12} />}
                <span>{p.name}</span>
              </div>
            ))}
          </div>
        </header>

        <div className="space-y-4">
          {statusData.map((slot) => (
            <div key={slot.id} className="bg-white dark:bg-gray-800 rounded-[24px] p-5 border-2 border-gray-50 dark:border-gray-700/50 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[16px] font-black text-gray-900 dark:text-white">{dayjs(slot.date).format('MM월 DD일 (ddd)')}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 font-bold">
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
                      <span className="text-gray-600 dark:text-gray-300">가능 ({slot.counts.available}명)</span>
                      <span className="text-gray-400 dark:text-gray-500">{slot.voters.available.join(', ')}</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${(slot.counts.available / (totalMembers || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                    <AlertCircle size={14} />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-[11px] font-bold mb-1">
                      <span className="text-gray-600 dark:text-gray-300">미정 ({slot.counts.maybe}명)</span>
                      <span className="text-gray-400 dark:text-gray-500">{slot.voters.maybe.join(', ')}</span>
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
                      <span className="text-gray-600 dark:text-gray-300">불가능 ({slot.counts.unavailable}명)</span>
                      <span className="text-gray-400 dark:text-gray-500">{slot.voters.unavailable.join(', ')}</span>
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
      </div>
    </div>
  );
};

export default MeetingParticipantStatus;
