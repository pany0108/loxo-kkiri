import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import { AlertCircle, Loader2, Vote, AlignLeft, MapPin, Users } from 'lucide-react';

import { ConfirmModal, LoadingButton, MapPopupModal, PageFooter, PageHeader, PageLayout, PageTitle, ParticipantListModal, VotingSlotItem } from 'components';
import { useMeetingVoting, useUserProfiles } from 'hooks';

dayjs.locale('ko');

/**
 * 일정 조율 투표 컴포넌트입니다.
 * 제안된 여러 일정 슬롯에 대해 사용자가 가능 여부(가능/아마도/불가능)를 투표하고 메모를 남깁니다.
 *
 * @returns {JSX.Element} 투표 화면
 */
const MeetingVoting = () => {
  const navigate = useNavigate();
  const { state, handlers } = useMeetingVoting();
  const { loading, meetingData, votingSlots, isHost, isConflictModalOpen, isAllVoted, meetingId } = state;
  const { handleVote, handleMemoChange, getConflictInfo, handleSubmit, submitVote, setIsConflictModalOpen } = handlers;
  const [isParticipantModalOpen, setIsParticipantModalOpen] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  // 참여자 프로필 정보 가져오기
  const participantUids = useMemo(() => meetingData?.participants || [], [meetingData]);
  const { profiles } = useUserProfiles(participantUids);

  const participantsList = useMemo(() => {
    if (!participantUids) return [];
    return participantUids.map((uid: string) => ({
      uid,
      name: profiles[uid]?.name,
      photoURL: profiles[uid]?.photoURL,
    }));
  }, [participantUids, profiles]);

  if (loading || !meetingData) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-white dark:bg-gray-950">
        <Loader2 className="animate-spin text-blue-500 w-8 h-8" />
      </div>
    );
  }

  const renderFooter = () => (
    <PageFooter>
      <div className="flex gap-3">
        {isHost && (
          <button
            onClick={() => navigate(`/meeting/status/${meetingId}`)}
            className="h-[62px] bg-gray-100 dark:bg-gray-700 text-sub dark:text-gray-300 rounded-[24px] font-black text-[17px] shadow-lg active:scale-[0.98] transition-all flex-1"
          >
            현황 보기
          </button>
        )}
        <LoadingButton onClick={handleSubmit} disabled={!isAllVoted} className={`btn-primary ${isHost ? 'flex-[2]' : 'w-full'}`}>
          투표 완료하기
        </LoadingButton>
      </div>
    </PageFooter>
  );

  return (
    <PageLayout title="투표하기" footer={renderFooter()}>
      <>
        <PageHeader className="mb-6" icon={<Vote className="text-primary w-6 h-6" />}>
          <PageTitle>
            {meetingData.isRetry ? (
              <>
                재요청된 일정입니다. <br />
                <span className="text-primary dark:text-blue-400">가능 여부</span>를 다시 알려주세요.
              </>
            ) : (
              <>
                나의 <span className="text-primary dark:text-blue-400">가능 여부</span>를<br />
                알려주세요.
              </>
            )}
          </PageTitle>
        </PageHeader>

        {/* 약속 상세 정보 */}
        <section className="bg-gray-50 dark:bg-gray-800 rounded-3xl p-6 mb-10 border border-gray-100 dark:border-gray-700/50 shadow-card">
          <h3 className="text-[19px] font-black text-main dark:text-white mb-3">{meetingData.title}</h3>
          <div className="space-y-3">
            {/* 참여 인원 */}
            {participantsList.length > 0 && (
              <button
                type="button"
                onClick={() => setIsParticipantModalOpen(true)}
                className="flex items-start gap-2.5 text-left cursor-pointer hover:opacity-70 transition-opacity"
              >
                <Users size={16} className="text-sub dark:text-gray-500 mt-0.5 shrink-0" />
                <p className="text-[14px] font-medium text-sub dark:text-gray-300 leading-relaxed underline decoration-dashed underline-offset-4 decoration-gray-300 dark:decoration-gray-600">
                  {participantsList.length}명 참여
                </p>
              </button>
            )}
            {/* 메모 */}
            {(meetingData as any).description && (
              <div className="flex items-start gap-2.5">
                <AlignLeft size={16} className="text-sub dark:text-gray-500 mt-0.5 shrink-0" />
                <p className="text-[14px] font-medium text-sub dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{(meetingData as any).description}</p>
              </div>
            )}
            {/* 위치 */}
            {meetingData.location && (
              <button type="button" onClick={() => setIsMapModalOpen(true)} className="flex items-start gap-2.5 text-left cursor-pointer hover:opacity-70 transition-opacity">
                <MapPin size={16} className="text-sub dark:text-gray-500 mt-0.5 shrink-0" />
                <p className="text-[14px] font-medium text-sub dark:text-gray-300 leading-relaxed underline decoration-dashed underline-offset-4 decoration-gray-300 dark:decoration-gray-600">
                  {meetingData.location}
                </p>
              </button>
            )}
          </div>
        </section>

        {/* 투표 슬롯 리스트 */}
        <div className="space-y-6">
          {votingSlots.map((slot) => (
            <VotingSlotItem key={slot.id} slot={slot} onVote={handleVote} onMemoChange={handleMemoChange} conflictInfo={getConflictInfo(slot.date, slot.time)} />
          ))}
        </div>

        {/* 일정 충돌 경고 모달 */}
        <ConfirmModal
          isOpen={isConflictModalOpen}
          onClose={() => setIsConflictModalOpen(false)}
          onConfirm={() => {
            setIsConflictModalOpen(false);
            submitVote();
          }}
          icon={<AlertCircle size={32} />}
          iconContainerClassName="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
          title="일정 겹침 확인"
          message={
            <>
              선택한 시간 중 <span className="text-amber-500 font-bold">내 일정과 겹치는 시간</span>이 있습니다.
              <br />
              그래도 투표를 제출하시겠습니까?
            </>
          }
          confirmText="제출하기"
          confirmButtonClassName="bg-primary"
        />

        {/* 참여자 목록 모달 */}
        <ParticipantListModal isOpen={isParticipantModalOpen} onClose={() => setIsParticipantModalOpen(false)} participants={participantsList} />

        {/* 지도 팝업 모달 */}
        {isMapModalOpen && meetingData.location && <MapPopupModal isOpen={isMapModalOpen} onClose={() => setIsMapModalOpen(false)} location={meetingData.location} />}
      </>
    </PageLayout>
  );
};

export default MeetingVoting;
