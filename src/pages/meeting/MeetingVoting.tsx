import React, { useState, useEffect, useMemo, useLayoutEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Sparkles, Loader2, MapPin } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import { db, auth } from '../../firebase';
import { doc, updateDoc, getDoc, writeBatch, collection } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import toast from 'react-hot-toast';
import { useFirestoreDoc } from 'hooks';
import { VotingSlotItem, TopNav } from 'components';

dayjs.locale('ko');

/**
 * 투표 슬롯 데이터 인터페이스
 */
interface VotingSlot {
  id: string;
  date: string;
  time: string;
  registeredMembers: string[];
  myVote: 'available' | 'maybe' | 'unavailable' | '';
  myMemo: string;
}

/**
 * Firestore에서 가져온 미팅 데이터 인터페이스
 */
interface MeetingData {
  id: string;
  title: string;
  hostId: string;
  location?: string;
  participants: string[];
  dates: string[];
  timeSlots: Record<string, { start: string; end: string; isAllDay: boolean }[]>;
  votes?: Record<string, Record<string, { vote: string; memo: string; name: string }>>;
  scheduleId?: string;
}

/**
 * 일정 조율 투표 컴포넌트입니다.
 * 제안된 여러 일정 슬롯에 대해 사용자가 가능 여부(가능/아마도/불가능)를 투표하고 메모를 남깁니다.
 * * @returns {JSX.Element} 투표 화면
 */
const MeetingVoting = () => {
  const navigate = useNavigate();
  const { id: meetingId } = useParams<{ id: string }>();
  const location = useLocation();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  /**
   * 페이지가 로드될 때 스크롤을 최상단으로 이동시킵니다.
   */
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  // --- 상태 관리 ---
  const [user, setUser] = useState<any>(null);
  const [votingSlots, setVotingSlots] = useState<VotingSlot[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const meetingDocRef = useMemo(() => (meetingId ? doc(db, 'meetings', meetingId) : null), [meetingId]);
  const { data: meetingData, loading } = useFirestoreDoc<MeetingData>(meetingDocRef);

  // [추가] 현재 사용자가 주최자인지 확인
  const isHost = useMemo(() => user && meetingData && user.uid === meetingData.hostId, [user, meetingData]);

  // DB 데이터가 변경될 때마다 로컬 votingSlots 상태를 재구성합니다.
  useEffect(() => {
    if (!meetingData || !user) return;

    // 이전 상태를 기반으로 새로운 상태를 계산하여, 사용자의 로컬 입력을 보존합니다.
    setVotingSlots((prevSlots) => {
      const newSlots: VotingSlot[] = [];
      const prevSlotsMap = new Map(prevSlots.map((s) => [s.id, s]));

      meetingData.dates.sort().forEach((dateStr) => {
        meetingData.timeSlots[dateStr]?.forEach((ts, index) => {
          const slotId = `${dateStr}_${index}`;
          const votesForSlot = meetingData.votes?.[slotId] || {};

          // '가능' 투표자 이름 목록 생성
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
            // 사용자가 입력 중인 값을 보존하기 위해 이전 상태(prevSlots)의 값을 우선적으로 사용합니다.
            myVote: existingSlot?.myVote ?? ((myVoteData?.vote as any) || ''),
            myMemo: existingSlot?.myMemo ?? (myVoteData?.memo || ''),
          });
        });
      });
      return newSlots;
    });
  }, [meetingData, user]);

  /**
   * 특정 슬롯에 대한 투표 상태를 업데이트합니다.
   * @param {string} slotId - 슬롯 고유 ID
   * @param {string} status - 투표 상태 ('available' | 'maybe' | 'unavailable')
   */
  const handleVote = (slotId: string, status: 'available' | 'maybe' | 'unavailable') => {
    setVotingSlots((prev) => prev.map((slot) => (slot.id === slotId ? { ...slot, myVote: status } : slot)));
  };

  /**
   * 특정 슬롯에 대한 메모 내용을 업데이트합니다.
   * @param {string} slotId - 슬롯 고유 ID
   * @param {string} text - 입력된 메모 텍스트
   */
  const handleMemoChange = (slotId: string, text: string) => {
    setVotingSlots((prev) => prev.map((slot) => (slot.id === slotId ? { ...slot, myMemo: text } : slot)));
  };

  /**
   * 모든 슬롯에 대해 투표가 완료되었는지 확인합니다.
   */
  const isAllVoted = votingSlots.every((slot) => slot.myVote !== '');

  /**
   * 투표 제출 핸들러
   * 모든 항목에 응답했는지 검증 후 서버로 데이터를 전송합니다.
   */
  const handleSubmit = async () => {
    if (!isAllVoted) {
      toast.error('모든 일정에 대해 가능 여부를 선택해주세요.');
      return;
    }
    if (!meetingDocRef || !user || !user.displayName || !meetingData) return;

    try {
      // 1. 내 투표 결과를 먼저 업데이트
      const updates: Record<string, any> = {};
      votingSlots.forEach((slot) => {
        updates[`votes.${slot.id}.${user.uid}`] = {
          vote: slot.myVote,
          memo: slot.myMemo,
          name: user.displayName, // 투표자 이름 저장
        };
      });
      await updateDoc(meetingDocRef, updates);

      // 2. 모든 참여자가 투표했는지 확인
      const updatedDocSnap = await getDoc(meetingDocRef);
      if (!updatedDocSnap.exists()) return;

      const updatedMeetingData = updatedDocSnap.data();
      const totalParticipants = updatedMeetingData.participants.length;
      const firstSlotVotes = updatedMeetingData.votes?.[`${updatedMeetingData.dates[0]}_0`] || {};
      const votedCount = Object.keys(firstSlotVotes).length;

      if (votedCount >= totalParticipants) {
        // 3. 모두 투표 완료 시, 주최자와 참여자에게 각각 다른 알림 전송
        const batch = writeBatch(db);
        updatedMeetingData.participants.forEach((uid: string) => {
          const notiRef = doc(collection(db, 'notifications'));
          const isHostNotification = uid === updatedMeetingData.hostId;

          if (isHostNotification) {
            batch.set(notiRef, {
              userId: uid,
              type: 'MEETING_VOTING_COMPLETE_FOR_HOST',
              message: `'${updatedMeetingData.title}' 약속의 투표가 완료되었습니다. 최종 시간을 확정해주세요.`,
              relatedId: meetingId,
              isRead: false,
              createdAt: new Date().toISOString(),
            });
          } else {
            batch.set(notiRef, {
              userId: uid,
              type: 'MEETING_VOTING_COMPLETE_FOR_PARTICIPANT',
              message: `'${updatedMeetingData.title}' 약속의 투표가 완료되었습니다. 주최자가 약속을 확정하기를 기다리고 있습니다.`,
              relatedId: meetingId,
              isRead: false,
              createdAt: new Date().toISOString(),
            });
          }
        });
        await batch.commit();

        toast.success('모든 투표가 완료되었습니다!');
        navigate('/propose');
        return;
      }

      toast.success('투표가 완료되었습니다!');
      navigate('/propose');
    } catch (error) {
      console.error('Error submitting vote:', error);
      toast.error('투표 제출 중 오류가 발생했습니다.');
    }
  };

  if (loading || !meetingData) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-white dark:bg-gray-950">
        <Loader2 className="animate-spin text-blue-500 w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-dvh bg-white dark:bg-gray-950 font-['Pretendard']">
      <TopNav title="투표하기" />

      <div ref={scrollContainerRef} className="flex-1 px-6 pt-[calc(76px+env(safe-area-inset-top))] overflow-y-auto w-full pb-[calc(10rem+env(safe-area-inset-bottom))]">
        {/* 헤더 섹션 */}
        <header className="mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-50 dark:bg-blue-500/10 rounded-xl mb-6">
            <Sparkles className="text-blue-600 w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white leading-[1.3] tracking-tight mb-2">{meetingData.title}</h2>
          {meetingData.location && (
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 font-medium mb-2">
              <MapPin size={16} />
              <span>{meetingData.location}</span>
            </div>
          )}
          <p className="text-gray-500 dark:text-gray-400 font-medium">
            나의 <span className="text-blue-600 dark:text-blue-400 font-bold">가능 여부</span>를 알려주세요.
          </p>
        </header>

        {/* 투표 슬롯 리스트 */}
        <div className="space-y-6">
          {votingSlots.map((slot) => (
            <VotingSlotItem key={slot.id} slot={slot} onVote={handleVote} onMemoChange={handleMemoChange} />
          ))}
        </div>
      </div>

      {/* 하단 고정 제출 버튼 */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-t border-gray-50 dark:border-gray-800 z-20 px-6 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <div className="flex gap-3">
          {isHost && (
            <button
              onClick={() => navigate(`/meeting/status/${meetingId}`)}
              className="h-[62px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-[24px] font-black text-[17px] shadow-lg active:scale-[0.98] transition-all flex-1"
            >
              현황 보기
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={!isAllVoted}
            className={`h-[62px] rounded-[24px] font-black text-[17px] shadow-lg transition-all flex items-center justify-center gap-2 ${isHost ? 'flex-[2]' : 'w-full'}
              ${
                isAllVoted
                  ? 'bg-blue-600 text-white shadow-blue-100 dark:shadow-blue-900/50 active:scale-[0.98]'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed shadow-none'
              }`}
          >
            투표 완료하기
          </button>
        </div>
      </footer>
    </div>
  );
};

export default MeetingVoting;
