import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, MapPin, AlertCircle, Vote } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import { VotingSlotItem, PageLayout, PageHeader, ConfirmModal, PageFooter, LoadingButton, PageTitle } from 'components';
import { useMeetingVoting } from 'hooks';

dayjs.locale('ko');

/**
 * 일정 조율 투표 컴포넌트입니다.
 * 제안된 여러 일정 슬롯에 대해 사용자가 가능 여부(가능/아마도/불가능)를 투표하고 메모를 남깁니다.
 * * @returns {JSX.Element} 투표 화면
 */
const MeetingVoting = () => {
  const navigate = useNavigate();
  const { state, handlers } = useMeetingVoting();
  const { loading, meetingData, votingSlots, isHost, isConflictModalOpen, isAllVoted, meetingId } = state;
  const { handleVote, handleMemoChange, getConflictInfo, handleSubmit, submitVote, setIsConflictModalOpen } = handlers;

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
        <PageHeader icon={<Vote className="text-primary w-6 h-6" />}>
          <>
            <div className="flex items-center gap-2 mb-2">
              <PageTitle>{meetingData.title}</PageTitle>
            </div>
            {meetingData.location && (
              <div className="flex items-center gap-2 text-sub dark:text-gray-400 font-medium mb-2">
                <MapPin size={16} />
                <span>{meetingData.location}</span>
              </div>
            )}
            <p className="text-sub dark:text-gray-400 font-medium">
              {meetingData.isRetry ? (
                <>
                  재요청된 일정입니다. <br />
                  <span className="text-primary dark:text-blue-400 font-bold">가능 여부</span>를 다시 알려주세요.
                </>
              ) : (
                <>
                  나의 <span className="text-primary dark:text-blue-400 font-bold">가능 여부</span>를 알려주세요.
                </>
              )}
            </p>
          </>
        </PageHeader>

        {/* 투표 슬롯 리스트 */}
        <div className="space-y-6">
          {votingSlots.map((slot) => (
            <VotingSlotItem key={slot.id} slot={slot} onVote={handleVote} onMemoChange={handleMemoChange} conflictInfo={getConflictInfo(slot.date, slot.time)} />
          ))}
        </div>

        {/* [추가] 일정 충돌 경고 모달 */}
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
      </>
    </PageLayout>
  );
};

export default MeetingVoting;
