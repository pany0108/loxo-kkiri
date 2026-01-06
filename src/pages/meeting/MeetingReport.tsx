import { useState, useMemo, useLayoutEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { sendPushNotificationToUser } from 'utils';
import { Loader2 } from 'lucide-react';
import { ConfirmMeetingDialog, ReportHeader, ReportSlotCard, ReportActions, CancelMeetingModal, TopNav } from 'components';
import { doc, updateDoc, addDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { useFirestoreDoc } from 'hooks';
import dayjs from 'dayjs';

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
 * Firestore에서 가져온 미팅 데이터 인터페이스
 */
interface MeetingData {
  id: string;
  title: string;
  description?: string;
  location?: string;
  hostId: string;
  participants: string[];
  dates: string[];
  timeSlots: Record<string, { start: string; end: string; isAllDay: boolean }[]>;
  votes?: Record<string, Record<string, { vote: 'available' | 'maybe' | 'unavailable'; memo: string; name: string }>>;
  status: 'PENDING' | 'VOTING' | 'CONFIRMED';
  confirmedSlot?: { date: string; time: string };
  scheduleId?: string;
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
   * 사용자가 확정하려고 선택한 시간대 데이터
   */
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; time: string } | null>(null);

  const meetingDocRef = useMemo(() => (meetingId ? doc(db, 'meetings', meetingId) : null), [meetingId]);
  const { data: meetingData, loading } = useFirestoreDoc<MeetingData>(meetingDocRef);

  const reportData: ReportSlot[] = useMemo(() => {
    if (!meetingData) return [];

    const slots: ReportSlot[] = [];
    const totalParticipants = meetingData.participants.length;

    meetingData.dates.sort().forEach((dateStr) => {
      meetingData.timeSlots[dateStr]?.forEach((ts, index) => {
        const slotId = `${dateStr}_${index}`;
        const votesForSlot = meetingData.votes?.[slotId] || {};
        const voteValues = Object.values(votesForSlot);

        const available = voteValues.filter((v) => v.vote === 'available').map((v) => v.name);
        const maybe = voteValues.filter((v) => v.vote === 'maybe').map((v) => v.name);
        const unavailable = voteValues.filter((v) => v.vote === 'unavailable').map((v) => v.name);
        const memos = voteValues.filter((v) => v.memo).map((v) => ({ user: v.name, text: v.memo }));

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
    if (!selectedSlot || !meetingData || !meetingId || !auth.currentUser) return;

    setIsConfirmOpen(false);

    try {
      // [수정] 약속이 등록될 캘린더를 결정하는 로직
      let targetCalendarId = '';
      const participants = meetingData.participants;
      const calendarsRef = collection(db, 'calendars');

      // 1. 약속 참여자들과 정확히 일치하는 공유 캘린더를 찾습니다.
      const q = query(calendarsRef, where('members', 'array-contains', auth.currentUser.uid));
      const querySnapshot = await getDocs(q);

      const sharedCalendar = querySnapshot.docs.find((doc) => {
        const calMembers = doc.data().members;
        // 멤버 수와 멤버 목록이 모두 일치하는지 확인
        return calMembers.length === participants.length && participants.every((p) => calMembers.includes(p));
      });

      if (sharedCalendar) {
        targetCalendarId = sharedCalendar.id;
      } else {
        // 2. 일치하는 공유 캘린더가 없으면, 내 기본 캘린더를 찾습니다.
        const defaultCalQ = query(calendarsRef, where('ownerId', '==', auth.currentUser.uid), where('isDefault', '==', true));
        const defaultCalSnapshot = await getDocs(defaultCalQ);
        if (!defaultCalSnapshot.empty) {
          targetCalendarId = defaultCalSnapshot.docs[0].id;
        }
      }

      // 1. 'schedules' 컬렉션에 새 일정 생성
      const [startTime, endTime] = selectedSlot.time.split(' ~ ');
      const isAllDay = selectedSlot.time === '종일';

      const scheduleRef = await addDoc(collection(db, 'schedules'), {
        title: meetingData.title,
        content: meetingData.description || '',
        location: meetingData.location || '',
        calendarId: targetCalendarId, // [수정] 찾은 캘린더 ID로 설정
        isAllDay,
        start: isAllDay ? dayjs(selectedSlot.date).format('YYYY-MM-DD') : dayjs(`${selectedSlot.date}T${startTime}`).toISOString(),
        end: isAllDay ? dayjs(selectedSlot.date).format('YYYY-MM-DD') : dayjs(`${selectedSlot.date}T${endTime}`).toISOString(),
        attendees: meetingData.participants,
        createdAt: new Date().toISOString(),
        userId: auth.currentUser?.uid,
      });

      // 2. 약속 상태를 'CONFIRMED'로 변경하고, 생성된 scheduleId 저장
      await updateDoc(doc(db, 'meetings', meetingId), {
        status: 'CONFIRMED',
        confirmedSlot: selectedSlot,
        scheduleId: scheduleRef.id,
      });

      // [추가] 약속 확정 알림 전송
      const batch = writeBatch(db);
      // meetingData.participants.forEach((uid) => {
      //   if (uid === auth.currentUser?.uid) return; // 본인 제외
      //   const notiRef = doc(collection(db, 'notifications'));
      //   batch.set(notiRef, {
      //     userId: uid,
      //     type: 'MEETING_CONFIRMED',
      //     message: `'${meetingData.title}' 약속이 확정되었습니다.`,
      //     relatedId: meetingId,
      //     isRead: false,
      //     createdAt: new Date().toISOString(),
      //   });
      //   // [추가] 푸시 알림 전송
      //   await sendPushNotificationToUser({
      //     userId: uid,
      //     title: '약속 확정',
      //     body: `'${meetingData.title}' 약속이 확정되었습니다.`,
      //     data: { type: 'MEETING_CONFIRMED', relatedId: meetingId, scheduleId: scheduleRef.id },
      //   });
      // });
      // await batch.commit();

      // [수정] forEach 대신 for...of 사용
      for (const uid of meetingData.participants) {
        if (uid === auth.currentUser?.uid) continue; // return 대신 continue 사용

        // 1. Firestore 알림 저장 (Batch)
        const notiRef = doc(collection(db, 'notifications'));
        batch.set(notiRef, {
          userId: uid,
          type: 'MEETING_CONFIRMED',
          message: `'${meetingData.title}' 약속이 확정되었습니다.`,
          relatedId: meetingId,
          isRead: false,
          createdAt: new Date().toISOString(),
        });

        // 2. 푸시 알림 전송 (확실하게 기다림)
        await sendPushNotificationToUser({
          userId: uid,
          title: '약속 확정',
          body: `'${meetingData.title}' 약속이 확정되었습니다.`,
          data: { type: 'MEETING_CONFIRMED', relatedId: meetingId, scheduleId: scheduleRef.id },
        });
      }

      // 루프가 다 끝난 뒤 배치 커밋
      await batch.commit();

      toast.success('약속이 확정되어 캘린더에 추가되었습니다!');
      // [수정] 약속 확정 후, 현재 리포트 페이지에 머물러 확정 상태를 보여주므로 별도 이동은 불필요합니다.
      // navigate('/calendar');
    } catch (error) {
      console.error('Error confirming meeting:', error);
      toast.error('약속 확정 중 오류가 발생했습니다.');
    }
  };

  /**
   * 일정 재요청 핸들러
   * 멤버들에게 다시 투표를 요청하는 로직을 수행합니다.
   */
  const handleRequestRetry = () => {
    // TODO: 재요청 알림 전송 로직 구현
    toast('재요청 기능은 준비 중입니다.', { icon: '🚧' });
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
    if (!meetingId || !meetingData || !auth.currentUser) return;
    try {
      const batch = writeBatch(db);

      // 1. 약속 문서 삭제
      const meetingRef = doc(db, 'meetings', meetingId);
      batch.delete(meetingRef);

      // 2. 참여자들에게 취소 알림 전송 (주최자 제외)
      // meetingData.participants.forEach((uid) => {
      //   if (uid === auth.currentUser?.uid) return;

      //   const notiRef = doc(collection(db, 'notifications'));
      //   batch.set(notiRef, {
      //     userId: uid,
      //     type: 'MEETING_CANCELED',
      //     message: `'${meetingData.title}' 약속이 주최자에 의해 취소되었습니다.`,
      //     relatedId: meetingId,
      //     isRead: false,
      //     createdAt: new Date().toISOString(),
      //   });
      //   // [추가] 푸시 알림 전송
      //   await sendPushNotificationToUser({
      //     userId: uid,
      //     title: '약속 취소',
      //     body: `'${meetingData.title}' 약속이 주최자에 의해 취소되었습니다.`,
      //     data: { type: 'MEETING_CANCELED', relatedId: meetingId },
      //   });
      // });

      // await batch.commit();

      // [수정] forEach 대신 for...of 사용
      for (const uid of meetingData.participants) {
        if (uid === auth.currentUser?.uid) continue; // return 대신 continue 사용

        // 1. Firestore 알림 저장 (Batch)
        const notiRef = doc(collection(db, 'notifications'));
        batch.set(notiRef, {
          userId: uid,
          type: 'MEETING_CANCELED',
          message: `'${meetingData.title}' 약속이 주최자에 의해 취소되었습니다.`,
          relatedId: meetingId,
          isRead: false,
          createdAt: new Date().toISOString(),
        });

        // 2. 푸시 알림 전송 (확실하게 기다림)
        await sendPushNotificationToUser({
          userId: uid,
          title: '약속 취소',
          body: `'${meetingData.title}' 약속이 주최자에 의해 취소되었습니다.`,
          data: { type: 'MEETING_CANCELED', relatedId: meetingId },
        });
      }

      // 루프가 다 끝난 뒤 배치 커밋
      await batch.commit();

      setIsCancelModalOpen(false);
      toast.success('약속이 취소되었습니다.');
      navigate('/propose');
    } catch (error) {
      console.error('Error canceling meeting:', error);
      toast.error('약속 취소 중 오류가 발생했습니다.');
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

        {/* [추가] 약속 취소 확인 모달 */}
        <CancelMeetingModal isOpen={isCancelModalOpen} onClose={() => setIsCancelModalOpen(false)} onConfirm={handleCancelConfirm} />
      </div>
    </div>
  );
};

export default MeetingReport;
