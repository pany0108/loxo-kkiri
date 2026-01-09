import { useLayoutEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import { doc, writeBatch, collection } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { ConfirmMeetingDialog, ReportHeader, ReportSlotCard, ReportActions, ConfirmModal, TopNav } from 'components';
import { useMeetingReport } from 'hooks';
import { findTargetCalendarForMembers, notifyMeetingConfirmed } from 'services';

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
    // handleFinalConfirm, // [수정] 훅의 핸들러 대신 로컬 핸들러 사용
    handleRequestRetry,
    handleRetryConfirm,
    handleCancel,
    handleCancelConfirm,
    setIsConfirmOpen,
    setIsCancelModalOpen,
    setIsRetryModalOpen,
  } = handlers;

  const [isSubmitting, setIsSubmitting] = useState(false);

  // [추가] 연속 일정(범위) 처리를 포함한 약속 확정 핸들러
  const handleFinalConfirm = async () => {
    if (!selectedSlot || !meetingData || !auth.currentUser) return;
    setIsSubmitting(true);

    try {
      const batch = writeBatch(db);

      // 1. 날짜 및 시간 파싱
      let startDate = selectedSlot.date;
      let endDate = selectedSlot.date;
      let isAllDay = selectedSlot.time === '종일';
      let startTime = '00:00';
      let endTime = '23:59';

      // 날짜 범위 처리 (YYYY-MM-DD:YYYY-MM-DD)
      if (selectedSlot.date.includes(':')) {
        const [s, e] = selectedSlot.date.split(':');
        startDate = s;
        endDate = e;
        isAllDay = true; // 연속 일정은 기본적으로 종일로 처리
      } else if (!isAllDay) {
        // 시간 범위 처리 (HH:mm ~ HH:mm)
        const times = selectedSlot.time.split(' ~ ');
        if (times.length === 2) {
          startTime = times[0];
          endTime = times[1];
        }
      }

      const startDateTime = dayjs(`${startDate}T${startTime}`);
      let endDateTime = dayjs(`${endDate}T${endTime}`);

      // 종료 시간이 시작 시간보다 빠르면 다음날로 처리 (단일 일정의 경우)
      if (endDateTime.isBefore(startDateTime)) {
        endDateTime = endDateTime.add(1, 'day');
      }

      // 2. 캘린더 결정 (공유 캘린더 우선, 없으면 내 기본 캘린더)
      const memberUids = meetingData.participants;
      const targetCalendar = await findTargetCalendarForMembers(memberUids, auth.currentUser.uid);
      const calendarId = targetCalendar ? targetCalendar.id : 'default';

      // 3. 일정 생성
      const scheduleRef = doc(collection(db, 'schedules'));
      batch.set(scheduleRef, {
        title: meetingData.title,
        start: startDateTime.toISOString(),
        end: endDateTime.toISOString(),
        isAllDay,
        location: meetingData.location || '',
        content: meetingData.description || '',
        calendarId: calendarId,
        attendees: memberUids,
        userId: auth.currentUser.uid,
        meetingId: meetingData.id,
        createdAt: new Date().toISOString(),
        color: targetCalendar?.color || '#3b82f6',
      });

      // 4. 약속 상태 업데이트
      const meetingRef = doc(db, 'meetings', meetingData.id);
      batch.update(meetingRef, {
        status: 'CONFIRMED',
        confirmedSlot: selectedSlot,
        scheduleId: scheduleRef.id,
      });

      // 5. 알림 전송
      for (const participantId of memberUids) {
        if (participantId !== auth.currentUser.uid) {
          await notifyMeetingConfirmed(batch, { participantId, meetingTitle: meetingData.title, meetingId: meetingData.id, scheduleId: scheduleRef.id });
        }
      }

      await batch.commit();
      toast.success('약속이 확정되어 캘린더에 추가되었습니다!');
      setIsConfirmOpen(false);
    } catch (error) {
      console.error('Error confirming meeting:', error);
      toast.error('약속 확정 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
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
        <ConfirmMeetingDialog isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={handleFinalConfirm} slotData={selectedSlot} isLoading={isSubmitting} />

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
