import React, { useLayoutEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sparkles, Loader2, MapPin, AlertCircle, Vote } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import { VotingSlotItem, TopNav, PageHeader, ConfirmModal, PageFooter, LoadingButton } from 'components';
import { useMeetingVoting } from 'hooks';

dayjs.locale('ko');

/**
 * 일정 조율 투표 컴포넌트입니다.
 * 제안된 여러 일정 슬롯에 대해 사용자가 가능 여부(가능/아마도/불가능)를 투표하고 메모를 남깁니다.
 * * @returns {JSX.Element} 투표 화면
 */
const MeetingVoting = () => {
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

  return (
    <div className="flex flex-col min-h-dvh bg-white dark:bg-gray-950 font-['Pretendard']">
      <TopNav title="투표하기" />

      <div ref={scrollContainerRef} className="flex-1 px-6 pt-[calc(76px+env(safe-area-inset-top))] overflow-y-auto w-full pb-[calc(10rem+env(safe-area-inset-bottom))]">
        {/* 헤더 섹션 */}
        <PageHeader icon={<Vote className="text-blue-600 w-6 h-6" />}>
          <>
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-2xl font-black text-gray-900 dark:text-white leading-[1.3] tracking-tight">{meetingData.title}</h2>
            </div>
            {meetingData.location && (
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 font-medium mb-2">
                <MapPin size={16} />
                <span>{meetingData.location}</span>
              </div>
            )}
            <p className="text-gray-500 dark:text-gray-400 font-medium">
              {meetingData.isRetry ? (
                <>
                  재요청된 일정입니다. <br />
                  <span className="text-blue-600 dark:text-blue-400 font-bold">가능 여부</span>를 다시 알려주세요.
                </>
              ) : (
                <>
                  나의 <span className="text-blue-600 dark:text-blue-400 font-bold">가능 여부</span>를 알려주세요.
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
      </div>

      {/* 하단 고정 제출 버튼 */}
      <PageFooter>
        <div className="flex gap-3">
          {isHost && (
            <button
              onClick={() => navigate(`/meeting/status/${meetingId}`)}
              className="h-[62px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-[24px] font-black text-[17px] shadow-lg active:scale-[0.98] transition-all flex-1"
            >
              현황 보기
            </button>
          )}
          <LoadingButton
            onClick={handleSubmit}
            disabled={!isAllVoted}
            // isLoading={isSubmitting} // 로딩 상태 변수가 있다면 여기에 연결하세요
            className={`h-[62px] rounded-[24px] font-black text-[17px] shadow-lg transition-all flex items-center justify-center gap-2 ${isHost ? 'flex-[2]' : 'w-full'}
            ${
              isAllVoted
                ? 'bg-blue-600 text-white shadow-blue-100 dark:shadow-blue-900/50 active:scale-[0.98]'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed shadow-none'
            }`}
          >
            투표 완료하기
          </LoadingButton>
        </div>
      </PageFooter>

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
        confirmButtonClassName="bg-blue-600"
      />
    </div>
  );
};

export default MeetingVoting;
