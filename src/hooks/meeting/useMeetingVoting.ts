import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc, writeBatch } from 'firebase/firestore';
import toast from 'react-hot-toast';

import { useCalendar } from 'contexts';
import { useFirestoreDoc } from 'hooks/common/useFirestore';
import { notifyMeetingVote, notifyVotingCompleteForHost, notifyVotingCompleteForParticipant } from 'services';
import { auth, db } from '../../firebase';

/** 투표 슬롯 인터페이스 */
export interface VotingSlot {
  id: string;
  date: string;
  time: string;
  registeredMembers: string[];
  myVote: 'available' | 'maybe' | 'unavailable' | '';
  myMemo: string;
}

/** 약속 데이터 인터페이스 */
export interface MeetingData {
  id: string;
  title: string;
  hostId: string;
  location?: string;
  participants: string[];
  dates: string[];
  timeSlots: Record<string, { start: string; end: string; isAllDay: boolean }[]>;
  votes?: Record<string, Record<string, { vote: string; memo: string; name: string }>>;
  scheduleId?: string;
  isRetry?: boolean;
}

/**
 * 약속 투표 로직을 처리하는 커스텀 훅
 * - 투표 데이터 로딩, 투표 상태 관리, 충돌 확인, 투표 제출 기능을 제공합니다.
 */
export const useMeetingVoting = () => {
  const navigate = useNavigate();
  const { id: meetingId } = useParams<{ id: string }>();

  const [user, setUser] = useState<any>(null);
  const [votingSlots, setVotingSlots] = useState<VotingSlot[]>([]);
  const { events } = useCalendar();
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);

  // 사용자 인증 상태 감지
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // 약속 데이터 실시간 구독
  const meetingDocRef = useMemo(() => (meetingId ? doc(db, 'meetings', meetingId) : null), [meetingId]);
  const { data: meetingData, loading } = useFirestoreDoc<MeetingData>(meetingDocRef);

  const isHost = useMemo(() => user && meetingData && user.uid === meetingData.hostId, [user, meetingData]);

  // 투표 슬롯 데이터 초기화 및 업데이트
  useEffect(() => {
    if (!meetingData || !user) return;

    setVotingSlots((prevSlots) => {
      const newSlots: VotingSlot[] = [];
      const prevSlotsMap = new Map(prevSlots.map((s) => [s.id, s]));

      meetingData.dates.sort().forEach((dateStr) => {
        meetingData.timeSlots[dateStr]?.forEach((ts) => {
          const slotId = `${dateStr}_`;
          const votesForSlot = meetingData.votes?.[slotId] || {};

          const availableVoterNames = Object.values(votesForSlot)
            .filter((v: any) => v.vote === 'available')
            .map((v: any) => v.name || '?');

          const myVoteData = votesForSlot[user.uid];
          const existingSlot = prevSlotsMap.get(slotId);

          newSlots.push({
            id: slotId,
            date: dateStr,
            time: ts.isAllDay ? '종일' : `${ts.start} ~ ${ts.end}`,
            registeredMembers: availableVoterNames,
            myVote: existingSlot?.myVote ?? ((myVoteData?.vote as any) || ''),
            myMemo: existingSlot?.myMemo ?? (myVoteData?.memo || ''),
          });
        });
      });
      return newSlots;
    });
  }, [meetingData, user]);

  /** 투표 상태 변경 핸들러 */
  const handleVote = useCallback((slotId: string, status: 'available' | 'maybe' | 'unavailable') => {
    setVotingSlots((prev) => prev.map((slot) => (slot.id === slotId ? { ...slot, myVote: status } : slot)));
  }, []);

  /** 메모 변경 핸들러 */
  const handleMemoChange = useCallback((slotId: string, text: string) => {
    setVotingSlots((prev) => prev.map((slot) => (slot.id === slotId ? { ...slot, myMemo: text } : slot)));
  }, []);

  /** 일정 충돌 정보 계산 함수 */
  const getConflictInfo = useCallback(
    (dateStr: string, timeStr: string) => {
      // 범위 선택(연속 날짜)인 경우 처리
      if (dateStr.includes(':')) {
        const [startStr, endStr] = dateStr.split(':');
        const rangeStart = dayjs(startStr).startOf('day');
        const rangeEnd = dayjs(endStr).endOf('day');

        const conflicts = events.filter((event) => {
          const eventStart = dayjs(event.start);
          const eventEnd = event.end ? dayjs(event.end) : event.allDay ? eventStart.add(1, 'day') : eventStart.add(1, 'hour');
          // 범위 내에 있거나 겹치는 일정 확인
          return rangeStart.isBefore(eventEnd) && rangeEnd.isAfter(eventStart);
        });

        if (conflicts.length > 0) {
          // 시작 시간순 정렬
          conflicts.sort((a, b) => dayjs(a.start).valueOf() - dayjs(b.start).valueOf());

          return {
            isConflict: true,
            conflicts: conflicts.map((c) => ({
              date: dayjs(c.start).format('MM.DD(ddd)'),
              title: c.title,
              time: c.allDay ? '종일' : `${dayjs(c.start).format('HH:mm')}~${c.end ? dayjs(c.end).format('HH:mm') : ''}`,
            })),
          };
        }
        return undefined;
      }

      const slotIsAllDay = timeStr === '종일';
      let slotStart: dayjs.Dayjs;
      let slotEnd: dayjs.Dayjs;

      if (slotIsAllDay) {
        slotStart = dayjs(dateStr).startOf('day');
        slotEnd = dayjs(dateStr).endOf('day');
      } else {
        const [start, end] = timeStr.split(' ~ ');
        slotStart = dayjs(`${dateStr}T${start}`);
        slotEnd = dayjs(`${dateStr}T${end}`);
      }

      const conflict = events.find((event) => {
        const eventStart = dayjs(event.start);
        let eventEnd = event.end ? dayjs(event.end) : event.allDay ? eventStart.add(1, 'day') : eventStart.add(1, 'hour');

        // 종일 일정인데 종료 시간이 시작 시간과 같거나 이전이면(잘못된 데이터 or 0duration), 하루 뒤로 설정
        if (event.allDay && event.end && !eventEnd.isAfter(eventStart)) {
          eventEnd = eventStart.add(1, 'day');
        }

        return slotStart.isBefore(eventEnd) && slotEnd.isAfter(eventStart);
      });

      if (conflict) {
        const conflictTime = conflict.allDay ? '종일' : `${dayjs(conflict.start).format('HH:mm')}~${conflict.end ? dayjs(conflict.end).format('HH:mm') : ''}`;
        return { isConflict: true, title: conflict.title, time: conflictTime };
      }

      const sameDayEvent = events.find((event) => dayjs(event.start).format('YYYY-MM-DD') === dateStr);
      if (sameDayEvent) {
        const eventTime = sameDayEvent.allDay ? '종일' : `${dayjs(sameDayEvent.start).format('HH:mm')}~${sameDayEvent.end ? dayjs(sameDayEvent.end).format('HH:mm') : ''}`;
        // 종일 일정인 경우 시간 일정과 겹치는 것으로 간주하여 conflict true 반환
        return { isConflict: sameDayEvent.allDay, title: sameDayEvent.title, time: eventTime };
      }

      return undefined;
    },
    [events],
  );

  // 모든 슬롯에 투표했는지 여부
  const isAllVoted = useMemo(() => votingSlots.every((slot) => slot.myVote !== ''), [votingSlots]);

  /** 투표 제출 실행 함수 */
  const submitVote = useCallback(async () => {
    if (!meetingDocRef || !user || !user.displayName || !meetingData || !meetingId) return;

    try {
      const updates: Record<string, any> = {};
      votingSlots.forEach((slot) => {
        updates[`votes.${slot.id}.${user.uid}`] = {
          vote: slot.myVote,
          memo: slot.myMemo,
          name: user.displayName,
        };
      });
      await updateDoc(meetingDocRef, updates);

      const updatedDocSnap = await getDoc(meetingDocRef);
      if (!updatedDocSnap.exists()) return;

      const updatedMeetingData = updatedDocSnap.data();
      const totalParticipants = updatedMeetingData.participants.length;
      const firstSlotVotes = updatedMeetingData.votes?.[`${updatedMeetingData.dates[0]}_0`] || {};
      const votedCount = Object.keys(firstSlotVotes).length;

      if (votedCount >= totalParticipants) {
        const batch = writeBatch(db);
        for (const uid of updatedMeetingData.participants) {
          const isHostNotification = uid === updatedMeetingData.hostId;

          if (isHostNotification) {
            await notifyVotingCompleteForHost(batch, {
              hostId: uid,
              meetingTitle: updatedMeetingData.title,
              meetingId: meetingId,
            });
          } else {
            await notifyVotingCompleteForParticipant(batch, {
              participantId: uid,
              meetingTitle: updatedMeetingData.title,
              meetingId: meetingId,
            });
          }
        }

        await batch.commit();

        toast.success('모든 투표가 완료되었습니다!');
        navigate('/propose');
        return;
      }
      toast.success('투표가 완료되었습니다!');
      if (meetingData.hostId !== user.uid) {
        await notifyMeetingVote({
          hostId: meetingData.hostId,
          voterName: user.displayName,
          meetingTitle: meetingData.title,
          meetingId: meetingId,
        });
      }
      navigate('/propose');
    } catch (error) {
      console.error('Error submitting vote:', error);
      toast.error('투표 제출 중 오류가 발생했습니다.');
    }
  }, [meetingDocRef, user, meetingData, meetingId, votingSlots, navigate]);

  /** 제출 버튼 핸들러 (충돌 확인 포함) */
  const handleSubmit = useCallback(async () => {
    if (!isAllVoted) {
      toast.error('모든 일정에 대해 가능 여부를 선택해주세요.');
      return;
    }

    const hasConflict = votingSlots.some((slot) => {
      if (slot.myVote === 'available') {
        const conflict = getConflictInfo(slot.date, slot.time);
        return conflict && conflict.isConflict === true;
      }
      return false;
    });

    if (hasConflict) {
      setIsConflictModalOpen(true);
      return;
    }

    await submitVote();
  }, [isAllVoted, votingSlots, getConflictInfo, submitVote]);

  return {
    state: {
      loading,
      meetingData,
      votingSlots,
      isHost,
      isConflictModalOpen,
      isAllVoted,
      meetingId,
    },
    handlers: {
      handleVote,
      handleMemoChange,
      getConflictInfo,
      handleSubmit,
      submitVote,
      setIsConflictModalOpen,
    },
  };
};
