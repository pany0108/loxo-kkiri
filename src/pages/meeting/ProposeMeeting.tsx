import React, { useState, useEffect, useMemo, useLayoutEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Clock, Sparkles, Loader2 } from 'lucide-react';
import { collection, query, where } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useFirestoreQuery } from 'hooks';
import { NewMeetingButton, MeetingListItem, EmptyMeetingList, PageHeader } from 'components';

/**
 * 약속 데이터 인터페이스
 */
interface Meeting {
  id: string;
  title: string;
  status: 'PENDING' | 'VOTING' | 'CONFIRMED';
  members: number;
  hostId: string; // [추가] 주최자 ID
  scheduleId?: string;
  isRetry?: boolean; // [추가] 재요청 여부
  isVotingCompleted?: boolean; // [추가] 투표 완료 여부
}

/**
 * 약속 제안 및 목록 페이지 컴포넌트입니다.
 * - 진행 중인 약속의 상태(조율 중, 투표 중, 확정)를 한눈에 확인할 수 있습니다.
 * - 각 약속을 클릭하면 해당 진행 단계에 맞는 페이지로 라우팅합니다.
 * - 새로운 약속을 생성하는 진입점 역할을 합니다.
 * * @returns {JSX.Element} 약속 제안 메인 화면
 */
const ProposeMeeting = () => {
  const navigate = useNavigate();
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

  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // [수정] DB에서 내가 참여 중인 약속 목록 불러오기
  const meetingsQuery = useMemo(() => {
    if (!user) return null;
    return query(collection(db, 'meetings'), where('participants', 'array-contains', user.uid));
  }, [user]);

  const { data: meetingsData, loading } = useFirestoreQuery<any>(meetingsQuery);

  const ongoingMeetings: Meeting[] = useMemo(() => {
    if (!meetingsData) return [];
    return meetingsData.map((m: any) => {
      // [추가] 투표 완료 여부 계산
      let isVotingCompleted = false;
      if (m.status === 'VOTING') {
        const totalParticipants = m.participants?.length || 0;
        const votedUserIds = new Set<string>();
        if (m.votes) {
          Object.values(m.votes).forEach((slotVotes: any) => {
            if (slotVotes) Object.keys(slotVotes).forEach((uid) => votedUserIds.add(uid));
          });
        }
        if (totalParticipants > 0 && votedUserIds.size >= totalParticipants) {
          isVotingCompleted = true;
        }
      }

      return {
        id: m.id,
        title: m.title,
        status: m.status,
        members: m.participants?.length || 0,
        hostId: m.hostId,
        scheduleId: m.scheduleId,
        isRetry: m.isRetry,
        isVotingCompleted, // [추가]
      };
    });
  }, [meetingsData]);

  /**
   * 약속 아이템 클릭 시 현재 상태에 따라 적절한 페이지로 이동합니다.
   * - PENDING: 시간 조율 화면 (Response)
   * - VOTING: 최종 투표 화면 (Vote)
   * - CONFIRMED: 결과 리포트 화면 (Report)
   * @param {Meeting} meeting - 선택된 약속 객체
   */
  const handleMeetingClick = (meeting: Meeting) => {
    switch (meeting.status) {
      case 'PENDING':
        // [수정] PENDING 상태에서도 주최자는 현황판으로 이동
        if (user && user.uid === meeting.hostId) {
          navigate(`/meeting/status/${meeting.id}`);
        } else {
          navigate(`/meeting/response/${meeting.id}`);
        }
        break;
      case 'VOTING':
        // [수정] 투표 완료 여부에 따라 분기 (미리 계산된 값 사용)
        if (meeting.isVotingCompleted) {
          // 투표 완료: 주최자는 확정 페이지로, 참여자는 현황판으로
          navigate(user && user.uid === meeting.hostId ? `/meeting/report/${meeting.id}` : `/meeting/participant-status/${meeting.id}`);
        } else {
          // 투표 미완료: 모두 투표 페이지로
          navigate(`/meeting/vote/${meeting.id}`);
        }
        break;
      case 'CONFIRMED':
        navigate(`/meeting/report/${meeting.id}`);
        break;
      default:
        navigate(`/meeting/report/${meeting.id}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-white dark:bg-gray-950">
        <Loader2 className="animate-spin text-blue-500 w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-dvh bg-gray-50 dark:bg-gray-950 font-['Pretendard']">
      {/* [수정] 뒤로가기 버튼을 제거하고, 상단 여백을 pt-6으로 조정합니다. */}
      <div ref={scrollContainerRef} className="flex-1 px-6 pt-[calc(1.5rem+env(safe-area-inset-top))] space-y-8 overflow-y-auto pb-24">
        {/* 헤더 섹션 */}
        <PageHeader className="mb-2" icon={<Sparkles className="text-blue-600 w-6 h-6" />}>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white leading-[1.3] tracking-tight">
            소중한 사람들과의 <br />
            <span className="text-blue-600 dark:text-blue-400">약속을 잡아보세요</span>
          </h2>
        </PageHeader>

        {/* 새 약속 만들기 버튼 */}
        <NewMeetingButton />

        {/* 진행 중인 약속 리스트 */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[15px] font-black text-gray-900 dark:text-white flex items-center gap-2">
              <Clock size={18} className="text-blue-600 dark:text-blue-400" /> 진행 중인 약속
            </h2>
            <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded-lg">{ongoingMeetings.length}개</span>
          </div>

          {ongoingMeetings.length > 0 ? (
            <div className="space-y-3">
              {ongoingMeetings.map((meeting) => (
                <MeetingListItem key={meeting.id} meeting={meeting} onClick={handleMeetingClick} />
              ))}
            </div>
          ) : (
            <EmptyMeetingList />
          )}
        </section>
      </div>
    </div>
  );
};

export default ProposeMeeting;
