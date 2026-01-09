import { useState, useMemo, useLayoutEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { doc, writeBatch, collection } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { ConfirmMeetingDialog, ReportHeader, ReportSlotCard, ReportActions, ConfirmModal, TopNav } from 'components';
import { useFirestoreDoc } from 'hooks';
import { confirmMeeting, cancelMeeting, Meeting as MeetingData } from 'services';

/**
 * 리포트 슬롯 데이터 인터페이스
 */
interface ReportSlot {
  id: string;
  date: string;
  time: string;
  responses: {
    available: string[];
    maybe: string[];
    unavailable: string[];
  };
  memos: { user: string; text: string }[];
  isAllAvailable: boolean;
}

/**
 * 일정 조율 결과 리포트 컴포넌트입니다.
 * 멤버들의 투표 결과를 종합하여 보여주고, 최종 약속 시간을 확정하거나 재요청/취소할 수 있습니다.
 * * @returns {JSX.Element} 투표 결과 리포트 화면
 */
const MeetingReport = () => {
  const navigate = useNavigate();
  const { id: meetingId } = useParams<{ id: string }>();
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

  /**
   * 확정 확인 모달의 열림 상태
   */
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  /**
   * [추가] 약속 취소 확인 모달의 열림 상태
   */
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  /**
   * [추가] 일정 재요청 확인 모달의 열림 상태
   */
  const [isRetryModalOpen, setIsRetryModalOpen] = useState(false);

  /**
   * 사용자가 확정하려고 선택한 시간대 데이터
   */
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; time: string } | null>(null);

  const meetingDocRef = useMemo(() => (meetingId ? doc(db, 'meetings', meetingId) : null), [meetingId]);
  const { data: meetingData, loading } = useFirestoreDoc<MeetingData>(meetingDocRef);

  const reportData: ReportSlot[] = useMemo(() => {
    if (!meetingData) return [];

    const slots: ReportSlot[] = [];
    const totalParticipants = meetingData.participants.length;

    meetingData.dates.sort().forEach((dateStr: string) => {
      meetingData.timeSlots[dateStr]?.forEach((ts: { start: string; end: string; isAllDay: boolean }, index: number) => {
        const slotId = `${dateStr}_${index}`;
        const votesForSlot = meetingData.votes?.[slotId] || {};
        const voteValues = Object.values(votesForSlot);

        const available = voteValues.filter((v: any) => v.vote === 'available').map((v: any) => v.name);
        const maybe = voteValues.filter((v: any) => v.vote === 'maybe').map((v: any) => v.name);
        const unavailable = voteValues.filter((v: any) => v.vote === 'unavailable').map((v: any) => v.name);
        const memos = voteValues.filter((v: any) => v.memo).map((v: any) => ({ user: v.name, text: v.memo }));

        slots.push({
          id: slotId,
          date: dateStr,
          time: ts.isAllDay ? '종일' : `${ts.start} ~ ${ts.end}`,
          responses: { available, maybe, unavailable },
          memos,
          isAllAvailable: available.length === totalParticipants && maybe.length === 0 && unavailable.length === 0,
        });
      });
    });

    // '모두 가능'인 슬롯을 위로 정렬
    return slots.sort((a, b) => (b.isAllAvailable ? 1 : 0) - (a.isAllAvailable ? 1 : 0));
  }, [meetingData]);

  /**
   * 특정 시간대 선택 핸들러
   * 선택한 시간 데이터를 상태에 저장하고 확정 확인 모달을 엽니다.
   * @param {ReportSlot} slot - 선택된 시간대 객체
   */
  const handleConfirmClick = (slot: ReportSlot) => {
    setSelectedSlot({ date: slot.date, time: slot.time });
    setIsConfirmOpen(true);
  };

  /**
   * 최종 확정 핸들러
   * 모달에서 확정 버튼 클릭 시 실행되며, API 호출 후 캘린더 화면으로 이동합니다.
   */
  const handleFinalConfirm = async () => {
    if (!selectedSlot || !meetingId) return;

    setIsConfirmOpen(false);

    try {
      await confirmMeeting(meetingId, selectedSlot);
      toast.success('약속이 확정되어 캘린더에 추가되었습니다!');
      // [수정] 약속 확정 후, 현재 리포트 페이지에 머물러 확정 상태를 보여주므로 별도 이동은 불필요합니다.
      // navigate('/calendar');
    } catch (error) {
      console.error('Error confirming meeting:', error);
      toast.error((error as Error).message || '약속 확정 중 오류가 발생했습니다.');
    }
  };

  /**
   * 일정 재요청 핸들러
   * 멤버들에게 다시 투표를 요청하는 로직을 수행합니다.
   */
  const handleRequestRetry = () => {
    setIsRetryModalOpen(true);
  };

  const handleRetryConfirm = async () => {
    if (!meetingId || !meetingData || !auth.currentUser) return;

    try {
      const batch = writeBatch(db);

      // [추가] 재요청 시 상태를 'PENDING'(조율 중)으로 변경
      const meetingRef = doc(db, 'meetings', meetingId);
      batch.update(meetingRef, { status: 'PENDING', isRetry: true, votes: {}, responses: {} });

      for (const uid of meetingData.participants) {
        if (uid === auth.currentUser.uid) continue;

        const notiRef = doc(collection(db, 'notifications'));
        batch.set(notiRef, {
          userId: uid,
          type: 'MEETING_RETRY',
          message: `'${meetingData.title}' 약속의 재요청이 필요합니다. 탭하여 다시 진행해주세요.`,
          relatedId: meetingId,
          fromUserId: auth.currentUser.uid,
          fromUserName: auth.currentUser.displayName || '주최자',
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      }

      await batch.commit();
      setIsRetryModalOpen(false);
      toast.success('멤버들에게 재요청 알림을 보냈습니다.');

      // [수정] 주최자는 일정 조율 중(Host Status) 화면으로 이동
      navigate(`/meeting/status/${meetingId}`, { replace: true, state: { fromRetry: true } });
    } catch (error) {
      console.error('Error requesting retry:', error);
      toast.error('재요청 중 오류가 발생했습니다.');
    }
  };

  /**
   * 약속 취소 핸들러
   * 진행 중인 약속 잡기를 취소하고 캘린더로 돌아갑니다.
   */
  const handleCancel = () => {
    setIsCancelModalOpen(true);
  };

  /**
   * [추가] 약속 취소 최종 확인 핸들러
   * 모달에서 취소 버튼 클릭 시 실행됩니다.
   */
  const handleCancelConfirm = async () => {
    if (!meetingId || !meetingData) return;
    try {
      await cancelMeeting(meetingId, meetingData.title, meetingData.participants);
      setIsCancelModalOpen(false);
      toast.success('약속이 취소되었습니다.');
      navigate('/propose');
    } catch (error) {
      console.error('Error canceling meeting:', error);
      toast.error((error as Error).message || '약속 취소 중 오류가 발생했습니다.');
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
