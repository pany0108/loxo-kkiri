import { useLayoutEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { ConfirmMeetingDialog, ReportHeader, ReportSlotCard, ReportActions, ConfirmModal, TopNav } from 'components';
import { useMeetingReport } from 'hooks';

const MeetingReport = () => {
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

  const { state, handlers } = useMeetingReport();
  const { meetingData, loading, reportData, isConfirmOpen, isCancelModalOpen, isRetryModalOpen, selectedSlot } = state;
  const {
    handleConfirmClick,
    handleFinalConfirm,
    handleRequestRetry,
    handleRetryConfirm,
    handleCancel,
    handleCancelConfirm,
    setIsConfirmOpen,
    setIsCancelModalOpen,
    setIsRetryModalOpen,
  } = handlers;

  if (loading || !meetingData) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-white dark:bg-gray-950">
        <Loader2 className="animate-spin text-blue-500 w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-dvh bg-white dark:bg-gray-950 font-['Pretendard']">
      <TopNav title="투표 결과" />

      <div ref={scrollContainerRef} className="flex-1 px-6 pt-[calc(76px+env(safe-area-inset-top))] pb-[calc(10rem+env(safe-area-inset-bottom))] overflow-y-auto w-full">
        {/* 헤더 섹션 */}
        <ReportHeader
          title={meetingData.title}
          location={meetingData.location}
          status={meetingData.status}
          confirmedSlot={meetingData.confirmedSlot}
          scheduleId={meetingData.scheduleId}
          onNavigate={navigate}
          isRetry={(meetingData as any).isRetry}
        />

        {/* 리포트 카드 리스트 */}
        <div className="space-y-6">
          {reportData.map((slot) => (
            <ReportSlotCard key={slot.id} slot={slot} status={meetingData.status} onConfirmClick={handleConfirmClick} />
          ))}
        </div>

        {/* 하단 관리 메뉴 (재요청/취소) */}
        {meetingData.status !== 'CONFIRMED' && <ReportActions onRetry={handleRequestRetry} onCancel={handleCancel} />}

        {/* 확정 확인 다이얼로그 */}
        <ConfirmMeetingDialog isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={handleFinalConfirm} slotData={selectedSlot} />

        {/* [추가] 일정 재요청 확인 모달 */}
        <ConfirmModal
          isOpen={isRetryModalOpen}
          onClose={() => setIsRetryModalOpen(false)}
          onConfirm={handleRetryConfirm}
          icon={<RefreshCw size={32} />}
          iconContainerClassName="bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
          title="일정 재요청"
          message={
            <>
              멤버들에게 일정 재요청 알림을 보낼까요?
              <br />
              투표 현황은 유지됩니다.
            </>
          }
          confirmText="재요청하기"
          confirmButtonClassName="bg-blue-600"
        />

        {/* [추가] 약속 취소 확인 모달 */}
        <ConfirmModal
          isOpen={isCancelModalOpen}
          onClose={() => setIsCancelModalOpen(false)}
          onConfirm={handleCancelConfirm}
          icon={<AlertCircle size={32} />}
          iconContainerClassName="bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400"
          title="약속 취소"
          message={
            <>
              정말 이 약속을 취소하시겠습니까?
              <br />
              모든 멤버에게 취소 알림이 전송됩니다.
            </>
          }
          confirmText="네, 취소할게요"
          cancelText="아니요"
          confirmButtonClassName="bg-red-500"
        />
      </div>
    </div>
  );
};

export default MeetingReport;
