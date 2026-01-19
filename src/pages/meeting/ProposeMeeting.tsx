import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Loader2, CalendarCheck2 } from 'lucide-react';
import dayjs from 'dayjs';
import { collection, query, where } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useFirestoreQuery, useUserProfiles } from 'hooks';
import { NewMeetingButton, MeetingListItem, EmptyMeetingList, PageHeader, PageTitle, PageLayout } from 'components';

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
  createdAt?: string;
  updatedAt?: string;
  confirmedSlot?: { date: string; time: string };
  isRecentlyUpdated?: boolean;
  participants?: { uid: string; name?: string; photoURL?: string }[];
  hasVoted?: boolean;
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

  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'ongoing' | 'past'>('ongoing');

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

  // [추가] 모든 약속의 참여자 UID 수집
  const allParticipantUids = useMemo(() => {
    if (!meetingsData) return [];
    const uids = new Set<string>();
    meetingsData.forEach((m: any) => {
      if (m.participants && Array.isArray(m.participants)) {
        m.participants.forEach((uid: string) => uids.add(uid));
      }
    });
    return Array.from(uids);
  }, [meetingsData]);

  const { profiles: userProfiles } = useUserProfiles(allParticipantUids);

  const { ongoingMeetings, pastMeetings } = useMemo(() => {
    if (!meetingsData) return { ongoingMeetings: [], pastMeetings: [] };

    // [수정] 최신순(updatedAt 또는 createdAt 내림차순) 정렬
    const sortedData = [...meetingsData].sort((a: any, b: any) => {
      const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    const ongoing: Meeting[] = [];
    const past: Meeting[] = [];

    sortedData.forEach((m: any) => {
      // [추가] 투표 완료 여부 계산
      let isVotingCompleted = false;
      let hasVoted = false; // [추가] 내 투표/응답 여부

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
        // [추가] VOTING 상태일 때 내 투표 여부 확인
        if (user && votedUserIds.has(user.uid)) {
          hasVoted = true;
        }
      } else if (m.status === 'PENDING') {
        // [추가] PENDING 상태일 때 내 응답 여부 확인 (responses 필드)
        if (m.responses && user && m.responses[user.uid]) {
          hasVoted = true;
        }
      } else {
        // CONFIRMED 등 다른 상태는 투표/응답 필요 없음으로 간주
        hasVoted = true;
      }

      // [추가] 최근 업데이트 여부 확인 (1시간 이내 업데이트 된 경우)
      const lastUpdateTime = m.updatedAt ? dayjs(m.updatedAt) : null;
      const isRecentlyUpdated = lastUpdateTime ? lastUpdateTime.isAfter(dayjs().subtract(1, 'hour')) : false;

      // [추가] 참여자 프로필 매핑
      const participants = (m.participants || []).map((uid: string) => ({
        uid,
        name: userProfiles[uid]?.name,
        photoURL: userProfiles[uid]?.photoURL,
      }));

      const meetingObj: Meeting = {
        id: m.id,
        title: m.title,
        status: m.status,
        members: m.participants?.length || 0,
        hostId: m.hostId,
        scheduleId: m.scheduleId,
        isRetry: m.isRetry,
        isVotingCompleted, // [추가]
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
        confirmedSlot: m.confirmedSlot,
        isRecentlyUpdated,
        participants,
        hasVoted,
      };

      // [추가] 지난 약속 분리 로직 (확정된 약속 중 날짜가 지난 경우)
      if (m.status === 'CONFIRMED' && m.confirmedSlot?.date) {
        let dateStr = m.confirmedSlot.date;
        if (dateStr.includes(':')) {
          dateStr = dateStr.split(':')[1]; // 범위인 경우 종료일 기준
        }
        if (dayjs(dateStr).isBefore(dayjs(), 'day')) {
          past.push(meetingObj);
        } else {
          ongoing.push(meetingObj);
        }
      } else {
        ongoing.push(meetingObj);
      }
    });

    // [추가] 최근 업데이트된 항목을 최상단으로 정렬
    ongoing.sort((a, b) => {
      if (a.isRecentlyUpdated && !b.isRecentlyUpdated) return -1;
      if (!a.isRecentlyUpdated && b.isRecentlyUpdated) return 1;
      return 0;
    });

    return { ongoingMeetings: ongoing, pastMeetings: past };
  }, [meetingsData, userProfiles]);

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

  const currentList = activeTab === 'ongoing' ? ongoingMeetings : pastMeetings;

  return (
    <PageLayout onBack={null}>
      <div className="space-y-8 pb-24">
        {/* 헤더 섹션 */}
        <PageHeader className="mb-2" icon={<CalendarCheck2 className="text-primary w-6 h-6" />}>
          <PageTitle>
            소중한 사람들과의 <br />
            <span className="text-primary dark:text-blue-400">약속을 잡아보세요</span>
          </PageTitle>
        </PageHeader>

        {/* 새 약속 만들기 버튼 */}
        <NewMeetingButton />

        {/* [추가] 탭 버튼 */}
        <div className="flex p-1 bg-gray-50 dark:bg-gray-800 rounded-lg mb-6">
          <button
            onClick={() => setActiveTab('ongoing')}
            className={`flex-1 py-2.5 rounded-md text-caption transition-all ${
              activeTab === 'ongoing' ? 'bg-white dark:bg-gray-700 text-main dark:text-white shadow-sm' : 'text-sub'
            }`}
          >
            진행 중 ({ongoingMeetings.length})
          </button>
          <button
            onClick={() => setActiveTab('past')}
            className={`flex-1 py-2.5 rounded-md text-caption transition-all ${
              activeTab === 'past' ? 'bg-white dark:bg-gray-700 text-main dark:text-white shadow-sm' : 'text-sub'
            }`}
          >
            지난 약속 ({pastMeetings.length})
          </button>
        </div>

        {/* 진행 중인 약속 리스트 */}
        <>
          {currentList.length > 0 ? (
            <div className="space-y-3">
              {currentList.map((meeting) => (
                <MeetingListItem key={meeting.id} meeting={meeting} onClick={handleMeetingClick} />
              ))}
            </div>
          ) : activeTab === 'ongoing' ? (
            <EmptyMeetingList />
          ) : (
            <div className="py-12 text-center text-caption">지난 약속이 없습니다.</div>
          )}
        </>
      </div>
    </PageLayout>
  );
};

export default ProposeMeeting;
