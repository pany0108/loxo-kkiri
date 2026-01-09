import { useMemo, useLayoutEffect, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { doc } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { useFirestoreDoc } from '../common/useFirestore';

export interface MeetingData {
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
  scheduleId?: string;
  isRetry?: boolean;
  hostId?: string;
  hostName?: string;
}

export interface StatusSlot {
  id: string;
  date: string;
  time: string;
  counts: { available: number; maybe: number; unavailable: number };
  voters: { available: string[]; maybe: string[]; unavailable: string[] };
  isAllVoted: boolean;
}

export const useMeetingParticipantStatus = () => {
  const { id: meetingId } = useParams<{ id: string }>();
  const location = useLocation();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  const meetingDocRef = useMemo(() => (meetingId ? doc(db, 'meetings', meetingId) : null), [meetingId]);
  const { data: meetingData, loading } = useFirestoreDoc<MeetingData>(meetingDocRef);

  // VOTING 상태일 때 투표 현황 데이터
  const statusData: StatusSlot[] = useMemo(() => {
    if (!meetingData || meetingData.status !== 'VOTING') return [];

    const slots: StatusSlot[] = [];
    meetingData.dates.sort().forEach((dateStr) => {
      meetingData.timeSlots[dateStr]?.forEach((ts, index) => {
        const slotId = `${dateStr}_`;
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

  const participantsInfo = useMemo(() => {
    if (!meetingData) return { totalMembers: 0, votedCount: 0, votedUids: new Set<string>(), allParticipants: [] };

    const totalMembers = meetingData.participants.length;
    const firstSlotVotes = meetingData.votes?.[`${meetingData.dates[0]}_0`] || {};
    const votedCount = Object.keys(firstSlotVotes).length;
    const votedUids = new Set(Object.keys(firstSlotVotes));

    const allParticipants = meetingData.invitedFriends?.map((f) => ({ uid: f.uid, name: f.name })) || [];

    // 현재 사용자가 이미 목록에 있는지 확인 후 추가
    if (auth.currentUser && !allParticipants.some((p) => p.uid === auth.currentUser!.uid)) {
      allParticipants.push({ uid: auth.currentUser.uid, name: auth.currentUser.displayName || '나' });
    }

    return { totalMembers, votedCount, votedUids, allParticipants };
  }, [meetingData]);

  return {
    state: {
      meetingData,
      loading,
      statusData,
      ...participantsInfo,
    },
    refs: {
      scrollContainerRef,
    },
  };
};
