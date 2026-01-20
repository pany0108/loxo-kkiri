import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { AlertCircle, BellRing, CheckCircle2, Clock, Hourglass, Loader2, MapPin, Share2, Trash2, Users, XCircle } from 'lucide-react';

import { auth } from '../../firebase';
import { ConfirmModal, PageFooter, PageHeader, PageLayout, PageTitle, ShareMeetingModal } from 'components';
import { useMeetingHostStatus } from 'hooks';

/**
 * 주최자용 약속 현황 페이지 컴포넌트
 * - PENDING 상태: 친구들의 응답 현황을 확인하고, 약속을 삭제하거나 공유할 수 있습니다.
 * - VOTING 상태: 투표 진행 상황을 확인하고, 미투표자에게 재촉 알림을 보낼 수 있습니다.
 * @returns {JSX.Element} 주최자 현황 화면
 */
const MeetingHostStatus = () => {
  const navigate = useNavigate();
  const { state, handlers } = useMeetingHostStatus();
  const { meetingData, loading, responseStatus, statusData, allParticipants, isDeleteModalOpen, isShareModalOpen, meetingId } = state;
  const { handleBack, handleUrge, handleDeleteMeeting, setIsDeleteModalOpen, setIsShareModalOpen } = handlers;

  if (loading || !meetingData) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-white dark:bg-gray-950">
        <Loader2 className="animate-spin text-primary w-8 h-8" />
      </div>
    );
  }

  // --- PENDING 상태 뷰 (응답 현황) ---
  if (meetingData.status === 'PENDING' && responseStatus) {
    const isHost = auth.currentUser?.uid === meetingData.hostId;
    const canDelete = isHost && (!meetingData.responses || Object.keys(meetingData.responses).length === 0);

    return (
      <PageLayout
        title="응답 현황"
        onBack={handleBack}
        extraNav={
          isHost ? (
            <button onClick={() => setIsShareModalOpen(true)} className="p-2 text-sub dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              <Share2 size={22} />
            </button>
          ) : undefined
        }
      >
        <PageHeader icon={<Hourglass className="text-primary dark:text-blue-400 w-6 h-6" />}>
          <>
            <h3 className="text-lg font-bold text-sub dark:text-gray-400">{meetingData.title}</h3>
            {meetingData.location && (
              <div className="flex items-center gap-2 text-sub dark:text-gray-400 font-medium mb-2">
                <MapPin size={16} />
                <span>{meetingData.location}</span>
              </div>
            )}
            <PageTitle>
              {(meetingData as any).isRetry ? (
                <>
                  재요청에 대한 <br />
                  <span className="text-primary dark:text-blue-400">응답을 기다리는 중</span>입니다.
                </>
              ) : (
                <>
                  친구들의 <span className="text-primary dark:text-blue-400">응답을 기다리는 중</span>입니다.
                </>
              )}
            </PageTitle>
          </>
        </PageHeader>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700/50 shadow-card">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-bold text-main dark:text-white">응답 현황</h4>
            <span className="text-sm font-bold text-primary dark:text-blue-400">
              {responseStatus.respondedCount} / {responseStatus.totalCount}명
            </span>
          </div>
          <div className="space-y-3">
            {responseStatus.list.map((friend) => (
              <div key={friend.uid} className="flex items-center justify-between p-3 bg-white dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600/50">
                <span className="font-bold text-main dark:text-gray-200">{friend.name}</span>
                {friend.hasResponded ? (
                  <span className="text-[12px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-lg">응답 완료</span>
                ) : (
                  <span className="text-[12px] font-bold text-sub bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded-lg">대기 중</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 약속 삭제 버튼 */}
        {canDelete && (
          <footer className="pt-8 mt-auto border-t border-gray-100 dark:border-gray-800 flex flex-col items-center gap-4">
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="w-full text-center text-sm font-bold text-red-500 dark:text-red-500/80 hover:text-red-700 dark:hover:text-red-400 transition-colors py-3 flex items-center justify-center gap-2"
            >
              <Trash2 size={14} /> 이 약속 삭제하기
            </button>
          </footer>
        )}

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
      </PageLayout>
    );
  }

  // --- VOTING 상태 뷰 (기존 로직) ---
  // 투표 참여 현황 계산 (주최자 제외)
  const totalMembers = meetingData.participants.length; // 본인 포함 전체

  // 모든 슬롯의 투표를 확인하여 유니크한 투표자 수 계산
  const votedUids = new Set<string>();
  if (meetingData.votes) {
    Object.values(meetingData.votes).forEach((slotVotes: any) => {
      if (slotVotes) Object.keys(slotVotes).forEach((uid) => votedUids.add(uid));
    });
  }
  const votedCount = votedUids.size;

  const unvotedCount = meetingData.participants.length - votedCount;

  return (
    <PageLayout
      title="투표 현황"
      onBack={handleBack}
      extraNav={
        <button
          onClick={handleUrge}
          disabled={unvotedCount === 0}
          className="flex items-center gap-2 px-4 py-2 bg-[#FFAD1F] text-white rounded-full text-sm font-bold shadow-lg shadow-amber-100 dark:shadow-amber-900/50 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all"
        >
          <BellRing size={16} /> 재촉하기
        </button>
      }
      footer={
        <PageFooter>
          <button
            onClick={() => navigate(`/meeting/vote/${meetingId}`)}
            className="w-full h-[56px] bg-primary text-white rounded-[20px] font-black text-[16px] shadow-lg shadow-primary/20 dark:shadow-blue-900/50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            투표하러 가기
          </button>
        </PageFooter>
      }
    >
      <PageHeader icon={<Hourglass className="text-primary dark:text-blue-400 w-6 h-6" />}>
        <>
          <h3 className="text-lg font-bold text-sub dark:text-gray-400 mb-2">{meetingData.title}</h3>
          {meetingData.location && (
            <div className="flex items-center gap-2 text-sub dark:text-gray-400 font-medium mb-2">
              <MapPin size={16} />
              <span>{meetingData.location}</span>
            </div>
          )}
          <PageTitle>
            현재 <span className="text-primary dark:text-blue-400">투표 진행 중</span>입니다.
          </PageTitle>
        </>
      </PageHeader>

      <div className="mb-8">
        <div className="mt-4 flex items-center gap-2 text-[13px] font-bold text-sub dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-lg w-fit">
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
                votedUids.has(p.uid) ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-gray-100 dark:bg-gray-700 text-sub dark:text-gray-500'
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
          <div key={slot.id} className="bg-white dark:bg-gray-800 rounded-2xl p-5 border-2 border-gray-100 dark:border-gray-700/50 shadow-card">
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

export default MeetingHostStatus;
