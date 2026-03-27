import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { collection, doc, writeBatch } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { sendPushNotificationToUser } from 'utils';

import { useFirestoreDoc } from 'hooks/common/useFirestore';
import { Meeting as MeetingData, cancelMeeting, confirmMeeting } from 'services';
import { auth, db } from '../../firebase';

/** 리포트 슬롯 인터페이스 */
export interface ReportSlot {
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
 * 약속 결과 리포트 및 확정/취소/재요청 로직을 처리하는 커스텀 훅
 */
export const useMeetingReport = () => {
  const navigate = useNavigate();
  const { id: meetingId } = useParams<{ id: string }>();

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isRetryModalOpen, setIsRetryModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; time: string } | null>(null);

  // 약속 데이터 실시간 구독
  const meetingDocRef = useMemo(() => (meetingId ? doc(db, 'meetings', meetingId) : null), [meetingId]);
  const { data: meetingData, loading } = useFirestoreDoc<MeetingData>(meetingDocRef);

  // 리포트 데이터 가공 (슬롯별 투표 현황)
  const reportData: ReportSlot[] = useMemo(() => {
    if (!meetingData) return [];

    const slots: ReportSlot[] = [];
    const totalParticipants = meetingData.participants.length;

    meetingData.dates.sort().forEach((dateStr: string) => {
      meetingData.timeSlots[dateStr]?.forEach((ts: { start: string; end: string; isAllDay: boolean }, index: number) => {
        const slotId = `${dateStr}_`;
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

    return slots.sort((a, b) => (b.isAllAvailable ? 1 : 0) - (a.isAllAvailable ? 1 : 0));
  }, [meetingData]);

  /** 확정 버튼 클릭 핸들러 (모달 열기) */
  const handleConfirmClick = (slot: ReportSlot) => {
    setSelectedSlot({ date: slot.date, time: slot.time });
    setIsConfirmOpen(true);
  };

  /** 최종 확정 실행 핸들러 */
  const handleFinalConfirm = async () => {
    if (!selectedSlot || !meetingId) return;

    setIsConfirmOpen(false);

    try {
      await confirmMeeting(meetingId, selectedSlot);
      toast.success('약속이 확정되어 캘린더에 추가되었습니다!');
    } catch (error) {
      console.error('Error confirming meeting:', error);
      toast.error((error as Error).message || '약속 확정 중 오류가 발생했습니다.');
    }
  };

  /** 재요청 모달 열기 */
  const handleRequestRetry = () => {
    setIsRetryModalOpen(true);
  };

  /** 재요청 실행 핸들러 */
  const handleRetryConfirm = async () => {
    if (!meetingId || !meetingData || !auth.currentUser) return;

    try {
      const batch = writeBatch(db);

      const meetingRef = doc(db, 'meetings', meetingId);
      batch.update(meetingRef, { status: 'PENDING', isRetry: true, votes: {}, responses: {} });

      const pushTargetUids: string[] = [];
      const messageBody = `'${meetingData.title}' 약속의 재요청이 필요합니다. 탭하여 다시 진행해주세요.`;

      for (const uid of meetingData.participants) {
        if (uid === auth.currentUser.uid) continue;

        pushTargetUids.push(uid);

        const notiRef = doc(collection(db, 'notifications'));
        batch.set(notiRef, {
          userId: uid,
          type: 'MEETING_RETRY',
          message: messageBody,
          relatedId: meetingId,
          fromUserId: auth.currentUser.uid,
          fromUserName: auth.currentUser.displayName || '주최자',
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      }

      await batch.commit();
      if (pushTargetUids.length > 0) {
        try {
          await Promise.all(
            pushTargetUids.map((uid) =>
              sendPushNotificationToUser({
                userId: uid,
                title: '일정 재요청 안내',
                body: messageBody,
                data: { type: 'MEETING_RETRY', relatedId: meetingId, link: '/propose' },
              })
            )
          );
        } catch (pushError) {
          console.error('푸시 전송 중 에러 (무시됨):', pushError);
        }
      }

      setIsRetryModalOpen(false);
      toast.success('멤버들에게 재요청 알림을 보냈습니다.');

      navigate('/propose', { replace: true, state: { fromRetry: true, meetingId } });

    } catch (error) {
      console.error('Error requesting retry:', error);
      toast.error('재요청 중 오류가 발생했습니다.');
    }
  };

  /** 취소 모달 열기 */
  const handleCancel = () => {
    setIsCancelModalOpen(true);
  };

  /** 취소 실행 핸들러 */
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

  return {
    state: {
      meetingData,
      loading,
      reportData,
      isConfirmOpen,
      isCancelModalOpen,
      isRetryModalOpen,
      selectedSlot,
      meetingId,
    },
    handlers: {
      handleConfirmClick,
      handleFinalConfirm,
      handleRequestRetry,
      handleRetryConfirm,
      handleCancel,
      handleCancelConfirm,
      setIsConfirmOpen,
      setIsCancelModalOpen,
      setIsRetryModalOpen,
    },
  };
};
