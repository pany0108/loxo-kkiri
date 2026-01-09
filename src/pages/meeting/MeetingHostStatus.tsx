import { useMemo, useLayoutEffect, useRef, useState, useCallback, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CheckCircle2, AlertCircle, XCircle, Sparkles, Clock, Users, Loader2, BellRing, MapPin, Trash2, Share2 } from 'lucide-react';
import dayjs from 'dayjs';
import { doc, collection, writeBatch, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { useFirestoreDoc } from 'hooks';
import { TopNav, ConfirmModal, ShareMeetingModal, PageHeader, PageFooter } from 'components';
import { MeetingData } from 'types';
import { notifyMeetingUrge } from 'services';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';

interface StatusSlot {
  id: string;
  date: string;
  time: string;
  counts: { available: number; maybe: number; unavailable: number };
  voters: { available: string[]; maybe: string[]; unavailable: string[] };
  isAllVoted: boolean;
}

const MeetingHostStatus = () => {
  const { id: meetingId } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  /**
   * 페이지가 로드될 때 스크롤을 최상단으로 이동시킵니다.
   */
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  // [추가] 뒤로가기 핸들러 (재요청으로 진입했을 경우 목록으로 이동)
  const handleBack = useCallback(() => {
    if (location.state?.fromRetry) {
      navigate('/propose', { replace: true });
    } else {
      navigate(-1);
    }
  }, [location.state, navigate]);

  // [추가] 안드로이드 시스템 뒤로가기 버튼 처리
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let backButtonListener: PluginListenerHandle;
    const setupListener = async () => {
      backButtonListener = await CapacitorApp.addListener('backButton', () => {
        handleBack();
      });
    };
    setupListener();
    return () => {
      if (backButtonListener) backButtonListener.remove();
    };
  }, [handleBack]);

  const meetingDocRef = useMemo(() => (meetingId ? doc(db, 'meetings', meetingId) : null), [meetingId]);
  const { data: meetingData, loading } = useFirestoreDoc<MeetingData>(meetingDocRef);

  // [추가] PENDING 상태일 때 응답 현황 데이터
  const responseStatus = useMemo(() => {
    if (!meetingData || meetingData.status !== 'PENDING') return null;

    const invited = meetingData.invitedFriends || [];
    const responses = meetingData.responses || {};

    const list = invited.map((friend) => ({
      uid: friend.uid,
      name: friend.name,
      hasResponded: !!responses[friend.uid]?.responded,
    }));

    return { list, respondedCount: list.filter((i) => i.hasResponded).length, totalCount: list.length };
  }, [meetingData]);

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

  // [추가] 재촉하기 기능
  const handleUrge = async () => {
    if (!meetingData || !auth.currentUser) return;

    const votedUids = new Set(Object.keys(meetingData.votes?.[`${meetingData.dates[0]}_0`] || {}));
    const unvotedParticipants = meetingData.participants.filter((p) => !votedUids.has(p) && p !== auth.currentUser?.uid);

    if (unvotedParticipants.length === 0) {
      toast('모든 친구들이 투표를 완료했습니다!', { icon: '👍' });
      return;
    }

    try {
      const batch = writeBatch(db);
      for (const uid of unvotedParticipants) {
        await notifyMeetingUrge(batch, {
          participantId: uid,
          urgerName: auth.currentUser?.displayName || '주최자',
          meetingTitle: meetingData.title,
          meetingId: meetingId!,
        });
      }
      await batch.commit();
      toast.success(`${unvotedParticipants.length}명에게 재촉 알림을 보냈습니다.`);
    } catch (error) {
      toast.error('알림 전송 중 오류가 발생했습니다.');
    }
  };

  // [추가] 약속 삭제 기능
  const handleDeleteMeeting = async () => {
    if (!meetingId || !meetingDocRef) return;

    try {
      await deleteDoc(meetingDocRef);
      toast.success('약속이 성공적으로 삭제되었습니다.');
      navigate('/propose', { replace: true });
    } catch (error) {
      console.error('Error deleting meeting:', error);
      toast.error('약속 삭제 중 오류가 발생했습니다.');
    } finally {
      setIsDeleteModalOpen(false);
    }
  };

  // [수정] 모든 참여자(주최자 포함)의 이름이 정확히 표시되도록 로직 개선 (조건부 렌더링 밖으로 이동)
  const allParticipants = useMemo(() => {
    if (!meetingData) return [];
    const participantInfo = new Map<string, string>();
    (meetingData.invitedFriends || []).forEach((friend) => {
      participantInfo.set(friend.uid, friend.name);
    });
    if (meetingData.hostId && meetingData.hostName) {
      participantInfo.set(meetingData.hostId, meetingData.hostName);
    }
    return meetingData.participants.map((uid) => ({ uid, name: participantInfo.get(uid) || '알 수 없음' })).sort((a, b) => a.name.localeCompare(b.name));
  }, [meetingData]);

  if (loading || !meetingData) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-white dark:bg-gray-950">
        <Loader2 className="animate-spin text-blue-500 w-8 h-8" />
      </div>
    );
  }

  // --- [추가] PENDING 상태 뷰 (응답 현황) ---
  if (meetingData.status === 'PENDING' && responseStatus) {
    const isHost = auth.currentUser?.uid === meetingData.hostId;
    const canDelete = isHost && (!meetingData.responses || Object.keys(meetingData.responses).length === 0);

    return (
      <div className="flex flex-col min-h-dvh bg-white dark:bg-gray-950 font-['Pretendard']">
        <TopNav
          title="응답 현황"
          onBack={handleBack}
          extra={
            isHost ? (
              <button
                onClick={() => setIsShareModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-full text-sm font-bold shadow-lg shadow-blue-100 dark:shadow-blue-900/50 active:scale-95 transition-all"
              >
                <Share2 size={16} />
              </button>
            ) : undefined
          }
        />

        <div ref={scrollContainerRef} className="flex-1 px-6 pt-[calc(76px+env(safe-area-inset-top))] overflow-y-auto w-full pb-6">
          <PageHeader icon={<Clock className="text-blue-600 dark:text-blue-400 w-6 h-6" />}>
            <>
              <h3 className="text-lg font-bold text-gray-500 dark:text-gray-400">{meetingData.title}</h3>
              {meetingData.location && (
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 font-medium mb-2">
                  <MapPin size={16} />
                  <span>{meetingData.location}</span>
                </div>
              )}
              <h2 className="text-2xl font-black text-gray-900 dark:text-white leading-[1.3] tracking-tight">
                {(meetingData as any).isRetry ? (
                  <>
                    재요청에 대한 <br />
                    <span className="text-blue-600 dark:text-blue-400">응답을 기다리는 중</span>입니다.
                  </>
                ) : (
                  <>
                    친구들의 <span className="text-blue-600 dark:text-blue-400">응답을 기다리는 중</span>입니다.
                  </>
                )}
              </h2>
            </>
          </PageHeader>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-[24px] p-6 border border-gray-100 dark:border-gray-700/50">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-bold text-gray-900 dark:text-white">응답 현황</h4>
              <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                {responseStatus.respondedCount} / {responseStatus.totalCount}명
              </span>
            </div>
            <div className="space-y-3">
              {responseStatus.list.map((friend) => (
                <div key={friend.uid} className="flex items-center justify-between p-3 bg-white dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600/50">
                  <span className="font-bold text-gray-700 dark:text-gray-200">{friend.name}</span>
                  {friend.hasResponded ? (
                    <span className="text-[12px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-lg">응답 완료</span>
                  ) : (
                    <span className="text-[12px] font-bold text-gray-400 bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded-lg">대기 중</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* [추가] 약속 삭제 버튼 */}
          {canDelete && (
            <div className="pt-8 mt-auto border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(true)}
                className="w-full text-center text-sm font-bold text-red-500 dark:text-red-500/80 hover:text-red-700 dark:hover:text-red-400 transition-colors py-3"
              >
                이 약속 삭제하기
              </button>
            </div>
          )}
        </div>

        <ConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDeleteMeeting}
          icon={<AlertCircle size={32} />}
          iconContainerClassName="bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400"
          title="약속 삭제"
          message={
            <>
              아직 아무도 응답하지 않았습니다. <br /> 이 약속을 정말 삭제하시겠습니까? <br />
              <span className="text-red-500 dark:text-red-400 font-bold">삭제 후에는 복구할 수 없습니다.</span>
            </>
          }
          confirmText="삭제하기"
          confirmButtonClassName="bg-red-500"
        />
        <ShareMeetingModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} meetingTitle={meetingData.title} meetingUrl={window.location.href} />
      </div>
    );
  }

  // --- VOTING 상태 뷰 (기존 로직) ---
  // 투표 참여 현황 계산 (주최자 제외)
  const totalMembers = meetingData.participants.length; // 본인 포함 전체
  // 실제 투표 데이터에서 유니크한 투표자 수 확인 (슬롯 0번 기준 예시)
  const firstSlotVotes = meetingData.votes?.[`${meetingData.dates[0]}_0`] || {};
  const votedCount = Object.keys(firstSlotVotes).length;

  const votedUids = new Set(Object.keys(firstSlotVotes));

  const unvotedCount = meetingData.participants.length - votedCount;

  return (
    <div className="flex flex-col min-h-dvh bg-white dark:bg-gray-950 font-['Pretendard']">
      <TopNav
        title="투표 현황"
        onBack={handleBack}
        extra={
          <button
            onClick={handleUrge}
            disabled={unvotedCount === 0}
            className="flex items-center gap-2 px-4 py-2 bg-amber-400 text-white rounded-full text-sm font-bold shadow-lg shadow-amber-100 dark:shadow-amber-900/50 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all"
          >
            <BellRing size={16} /> 재촉하기
          </button>
        }
      />
      <div ref={scrollContainerRef} className="flex-1 px-6 pt-[calc(76px+env(safe-area-inset-top))] overflow-y-auto w-full pb-[calc(10rem+env(safe-area-inset-bottom))]">
        <PageHeader icon={<Sparkles className="text-blue-600 dark:text-blue-400 w-6 h-6" />}>
          <>
            <h3 className="text-lg font-bold text-gray-500 dark:text-gray-400 mb-2">{meetingData.title}</h3>
            {meetingData.location && (
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 font-medium mb-2">
                <MapPin size={16} />
                <span>{meetingData.location}</span>
              </div>
            )}
            <h2 className="text-2xl font-black text-gray-900 dark:text-white leading-[1.3] tracking-tight">
              현재 <span className="text-blue-600 dark:text-blue-400">투표 진행 중</span>입니다.
            </h2>
          </>
        </PageHeader>

        <div className="mb-8">
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
        </div>

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

      <PageFooter>
        <button
          onClick={() => navigate(`/meeting/vote/${meetingId}`)}
          className="w-full h-[56px] bg-blue-600 text-white rounded-[20px] font-black text-[16px] shadow-lg shadow-blue-100 dark:shadow-blue-900/50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          투표하러 가기
        </button>
      </PageFooter>
    </div>
  );
};

export default MeetingHostStatus;
