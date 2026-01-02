import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Clock, Users, ChevronRight, CalendarCheck, Sparkles, Loader2 } from 'lucide-react';
import { collection, query, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useFirestoreQuery } from 'hooks';

/**
 * 약속 데이터 인터페이스
 */
interface Meeting {
  id: string;
  title: string;
  status: 'PENDING' | 'VOTING' | 'CONFIRMED';
  members: number;
  dday: string;
  hostId: string; // [추가] 주최자 ID
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
    return meetingsData.map((m: any) => ({
      id: m.id,
      title: m.title,
      status: m.status,
      members: m.participants?.length || 0,
      dday: m.status === 'VOTING' ? '투표중' : m.status === 'CONFIRMED' ? '확정' : '진행중',
      hostId: m.hostId, // [추가]
    }));
  }, [meetingsData]);

  /**
   * 약속 아이템 클릭 시 현재 상태에 따라 적절한 페이지로 이동합니다.
   * - PENDING: 시간 조율 화면 (Response)
   * - VOTING: 최종 투표 화면 (Vote)
   * - CONFIRMED: 결과 리포트 화면 (Report)
   * @param {Meeting} meeting - 선택된 약속 객체
   */
  const handleMeetingClick = (meeting: Meeting) => {
    if (!meetingsData) return;
    const fullMeetingData = meetingsData.find((m: any) => m.id === meeting.id);

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
        // [수정] 투표 완료 여부에 따라 분기
        if (fullMeetingData) {
          const totalParticipants = fullMeetingData.participants?.length ?? 0;
          const firstDate = fullMeetingData.dates?.[0];
          // 투표 수를 확인하기 위한 대표 슬롯 ID 생성 로직을 더 명확하게 개선
          const representativeSlotId = firstDate && fullMeetingData.timeSlots?.[firstDate]?.[0] ? `${firstDate}_0` : null;

          if (representativeSlotId) {
            const votes = fullMeetingData.votes?.[representativeSlotId] || {};
            const votedCount = Object.keys(votes).length;
            const isVotingComplete = totalParticipants > 0 && votedCount >= totalParticipants;

            if (isVotingComplete) {
              // 투표 완료: 주최자는 확정 페이지로, 참여자는 현황판으로
              navigate(user && user.uid === meeting.hostId ? `/meeting/report/${meeting.id}` : `/meeting/participant-status/${meeting.id}`);
              return;
            }
          }
        }
        // 투표 미완료: 모두 투표 페이지로
        navigate(`/meeting/vote/${meeting.id}`);
        break;
      case 'CONFIRMED':
        navigate(`/meeting/report/${meeting.id}`);
        break;
      default:
        navigate(`/meeting/report/${meeting.id}`);
    }
  };

  /**
   * 약속 상태에 따른 배지 스타일과 텍스트를 반환합니다.
   * @param {string} status - 약속 상태 ('VOTING' | 'CONFIRMED' | 'PENDING')
   * @returns {{ className: string; text: string }} 스타일 클래스와 표시 텍스트
   */
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VOTING':
        return { className: 'bg-amber-50 text-amber-600', text: '투표 진행중' };
      case 'CONFIRMED':
        return { className: 'bg-green-50 text-green-600', text: '약속 확정' };
      default:
        return { className: 'bg-blue-50 text-blue-600', text: '시간 조율중' };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-950">
        <Loader2 className="animate-spin text-blue-500 w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950 font-['Pretendard']">
      {/* [수정] 뒤로가기 버튼을 제거하고, 상단 여백을 pt-6으로 조정합니다. */}
      <div className="flex-1 px-6 pt-6 pb-32 overflow-y-auto w-full">
        {/* 헤더 섹션 */}
        <header className="mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-50 dark:bg-blue-500/10 rounded-xl mb-6">
            <Sparkles className="text-blue-600 w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white leading-[1.3] tracking-tight">
            소중한 사람들과의 <br />
            <span className="text-blue-600 dark:text-blue-400">약속을 잡아보세요</span>
          </h2>
        </header>

        {/* 새 약속 만들기 버튼 */}
        <button
          onClick={() => navigate('/propose/create')}
          className="w-full h-[80px] bg-blue-600 rounded-[24px] flex items-center justify-between px-6 shadow-xl shadow-blue-100 dark:shadow-blue-900/50 active:scale-[0.98] transition-all group mb-8"
        >
          <div className="text-left">
            <p className="text-blue-200 text-[11px] font-bold mb-1 tracking-wider uppercase">New Meeting</p>
            <h3 className="text-white font-black text-[17px]">새로운 약속 제안하기</h3>
          </div>
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white group-hover:bg-white group-hover:text-blue-600 transition-all">
            <Plus size={24} strokeWidth={3} />
          </div>
        </button>

        {/* 진행 중인 약속 리스트 */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[15px] font-black text-gray-900 dark:text-white flex items-center gap-2">
              <Clock size={18} className="text-blue-600" /> 진행 중인 약속
            </h2>
            <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded-lg">{ongoingMeetings.length}개</span>
          </div>

          {ongoingMeetings.length > 0 ? (
            <div className="space-y-3">
              {ongoingMeetings.map((meeting) => {
                const badge = getStatusBadge(meeting.status);

                return (
                  <button
                    key={meeting.id}
                    onClick={() => handleMeetingClick(meeting)}
                    className="w-full bg-white dark:bg-gray-800 p-5 rounded-[24px] border-2 border-gray-50 dark:border-gray-700/50 flex items-center justify-between active:scale-[0.98] transition-all hover:border-blue-100 dark:hover:border-blue-500/20 hover:shadow-lg hover:shadow-blue-50/50 dark:hover:shadow-blue-900/30 group"
                  >
                    <div className="text-left space-y-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black px-2 py-1 rounded-md ${badge.className}`}>{badge.text}</span>
                        <span className="text-[11px] font-bold text-gray-300 dark:text-gray-600">| {meeting.dday}</span>
                      </div>
                      <h4 className="font-black text-gray-800 dark:text-gray-200 text-[16px] group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {meeting.title}
                      </h4>
                      <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500">
                        <Users size={14} />
                        <span className="text-[12px] font-bold">{meeting.members}명 참여중</span>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-300 dark:text-gray-600 group-hover:bg-blue-50 dark:group-hover:bg-blue-500/10 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
                      <ChevronRight size={18} />
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center space-y-3 bg-gray-50 dark:bg-gray-800/50 rounded-[24px] border-2 border-dashed border-gray-100 dark:border-gray-700/50">
              <div className="w-14 h-14 bg-white dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto text-gray-300 dark:text-gray-600 mb-2 shadow-sm">
                <CalendarCheck size={24} />
              </div>
              <div className="space-y-1">
                <p className="text-gray-500 dark:text-gray-400 font-bold text-[13px]">현재 진행 중인 약속이 없어요.</p>
                <p className="text-gray-400 dark:text-gray-500 text-[11px]">새로운 약속을 만들어보세요!</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default ProposeMeeting;
