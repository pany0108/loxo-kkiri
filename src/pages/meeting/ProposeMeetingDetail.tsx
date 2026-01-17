import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
import { Clock, CalendarClock } from 'lucide-react';
import toast from 'react-hot-toast';
import { collection, addDoc, writeBatch } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { MeetingSummaryCard, DateSlotEditor, SyncTimeModal, PageLayout, PageHeader, PageFooter, LoadingButton, PageTitle } from 'components';
import { notifyMeetingInvite } from 'services';

/**
 * 초대된 친구 데이터 인터페이스
 */
interface InvitedFriend {
  id: string;
  name: string;
}

/**
 * 이전 페이지(ProposeMeetingCreate)로부터 전달받는 Location State 인터페이스
 */
interface LocationState {
  title: string;
  description: string;
  location?: string;
  invitedFriends: InvitedFriend[];
  selectedDates: string[];
  calendarName: string;
}

/**
 * 개별 시간 슬롯 데이터 인터페이스
 */
interface TimeSlot {
  start: string;
  end: string;
  isAllDay: boolean;
}

/**
 * 약속 제안 상세 설정 페이지 (Step 2) 컴포넌트입니다.
 * - 선택된 날짜별로 구체적인 시간(Time Slot)을 설정합니다.
 * - '종일' 옵션 또는 '특정 시간대'를 여러 개 추가할 수 있습니다.
 * * @returns {JSX.Element} 약속 상세 설정 화면
 */
const ProposeMeetingDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();

  /**
   * 라우터 상태로부터 약속 기본 정보를 불러옵니다.
   * 데이터가 없을 경우 기본값을 사용하여 에러를 방지합니다.
   */
  const {
    title,
    description,
    location: meetingLocation,
    invitedFriends,
    selectedDates,
  } = (location.state as LocationState) || {
    title: '새 약속',
    description: '',
    location: '',
    selectedDates: [dayjs().format('YYYY-MM-DD')],
    invitedFriends: [] as InvitedFriend[],
    calendarName: '',
  };

  // [추가] 현재 시간 기준 기본값 계산
  const now = dayjs();
  const minute = now.minute();
  let startObj = now;

  if (minute >= 30) {
    startObj = now.add(1, 'hour').startOf('hour');
  } else {
    startObj = now.startOf('hour');
  }

  const defaultStartStr = startObj.format('HH:mm');
  const defaultEndStr = startObj.add(1, 'hour').format('HH:mm');

  /**
   * 날짜별 시간 슬롯 상태 관리
   * 초기값: 선택된 모든 날짜에 대해 기본적으로 현재 시간 기준 1시간 슬롯 하나를 생성합니다.
   */
  const [timeSlots, setTimeSlots] = useState<Record<string, TimeSlot[]>>(
    selectedDates.reduce((acc: any, dateStr: string) => {
      acc[dateStr] = [{ start: defaultStartStr, end: defaultEndStr, isAllDay: false }];
      return acc;
    }, {}),
  );

  // [추가] 시간 통일 모달 상태
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [syncTime, setSyncTime] = useState({ start: defaultStartStr, end: defaultEndStr });
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * 특정 날짜에 새로운 시간 슬롯을 추가합니다.
   * 기본값: 12:00 ~ 13:00
   * @param {string} dateStr - 대상 날짜 문자열
   */
  const handleAddSlot = (dateStr: string) => {
    setTimeSlots({
      ...timeSlots,
      [dateStr]: [...timeSlots[dateStr], { start: '12:00', end: '13:00', isAllDay: false }],
    });
  };

  /**
   * 특정 날짜의 시간 슬롯을 삭제합니다.
   * 최소 1개의 슬롯은 유지되어야 하므로, 남은 슬롯이 1개 이하일 경우 삭제하지 않습니다.
   * @param {string} dateStr - 대상 날짜 문자열
   * @param {number} index - 삭제할 슬롯의 인덱스
   */
  const handleDeleteSlot = (dateStr: string, index: number) => {
    if (timeSlots[dateStr].length <= 1) {
      return; // UI에서 삭제 버튼을 조건부 렌더링하거나 토스트 메시지로 대체 가능
    }
    const newSlots = [...timeSlots[dateStr]];
    newSlots.splice(index, 1);
    setTimeSlots({ ...timeSlots, [dateStr]: newSlots });
  };

  /**
   * 시간 슬롯의 시작/종료 시간을 변경합니다.
   * @param {string} dateStr - 대상 날짜 문자열
   * @param {number} index - 변경할 슬롯의 인덱스
   * @param {'start' | 'end'} field - 변경할 필드 (시작/종료)
   * @param {string} value - 변경된 시간 값 (HH:mm)
   */
  const handleTimeChange = (dateStr: string, index: number, field: 'start' | 'end', value: string) => {
    const newSlots = [...timeSlots[dateStr]];
    const newSlotData = { ...newSlots[index], [field]: value };

    // 시작 시간을 변경했을 때, 종료 시간이 시작 시간보다 빠르거나 같으면 종료 시간을 1시간 뒤로 자동 조정
    if (field === 'start') {
      const startTime = dayjs(`${dateStr}T${value}`);
      const endTime = dayjs(`${dateStr}T${newSlotData.end}`);
      if (startTime.isSameOrAfter(endTime)) {
        newSlotData.end = startTime.add(1, 'hour').format('HH:mm');
      }
    } else if (field === 'end') {
      const startTime = dayjs(`${dateStr}T${newSlotData.start}`);
      const endTime = dayjs(`${dateStr}T${value}`);

      if (endTime.isSameOrBefore(startTime)) {
        toast.error('종료 시간을 시작 시간 이후로 설정해주세요.');
        return;
      }
    }

    newSlots[index] = newSlotData;
    setTimeSlots({ ...timeSlots, [dateStr]: newSlots });
  };

  /**
   * 특정 날짜의 '종일' 옵션을 토글합니다.
   * - 종일 설정 시: 기존 슬롯을 모두 지우고 00:00~23:59 (isAllDay: true) 슬롯 1개로 대체합니다.
   * - 종일 해제 시: 기본 시간대(12:00~13:00) 슬롯 1개로 초기화합니다.
   * @param {string} dateStr - 대상 날짜 문자열
   */
  const handleToggleDayAllDay = (dateStr: string) => {
    const currentSlots = timeSlots[dateStr];
    const isCurrentlyAllDay = currentSlots.length > 0 && currentSlots[0].isAllDay;

    if (isCurrentlyAllDay) {
      setTimeSlots({
        ...timeSlots,
        [dateStr]: [{ start: '12:00', end: '13:00', isAllDay: false }],
      });
    } else {
      setTimeSlots({
        ...timeSlots,
        [dateStr]: [{ start: '00:00', end: '23:59', isAllDay: true }],
      });
    }
  };

  /**
   * [수정] 시간 통일 모달을 엽니다.
   */
  const handleSyncTimes = () => {
    if (selectedDates.length < 1) {
      toast('시간을 설정할 날짜를 먼저 선택해주세요.');
      return;
    }

    const firstDate = selectedDates.sort()[0];
    const firstSlot = timeSlots[firstDate]?.[0];

    // 모달의 초기 시간을 첫 번째 날짜의 시간으로 설정 (종일이 아닐 경우)
    if (firstSlot && !firstSlot.isAllDay) {
      setSyncTime({ start: firstSlot.start, end: firstSlot.end });
    }

    setIsSyncModalOpen(true);
  };

  /**
   * [추가] 시간 통일 모달에서 설정한 시간으로 모든 슬롯을 업데이트합니다.
   */
  const applySyncedTime = () => {
    const newTimeSlots = { ...timeSlots };

    for (const dateStr of selectedDates) {
      newTimeSlots[dateStr] = [
        {
          start: syncTime.start,
          end: syncTime.end,
          isAllDay: false, // 시간을 지정하므로 종일 옵션은 해제
        },
      ];
    }

    setTimeSlots(newTimeSlots);
    toast.success(`${selectedDates.length}일의 시간이 ${syncTime.start}~${syncTime.end}로 설정되었습니다.`);
    setIsSyncModalOpen(false);
  };

  /**
   * [추가] 시간 통일 모달의 시간 입력 변경을 처리합니다.
   */
  const handleSyncTimeChange = (field: 'start' | 'end', value: string) => {
    const newSyncTime = { ...syncTime, [field]: value };

    if (field === 'start') {
      const startTime = dayjs(`2000-01-01T${value}`);
      const endTime = dayjs(`2000-01-01T${newSyncTime.end}`);
      if (startTime.isSameOrAfter(endTime)) {
        newSyncTime.end = startTime.add(1, 'hour').format('HH:mm');
      }
    } else if (field === 'end') {
      const startTime = dayjs(`2000-01-01T${newSyncTime.start}`);
      const endTime = dayjs(`2000-01-01T${value}`);

      if (endTime.isSameOrBefore(startTime)) {
        toast.error('종료 시간을 시작 시간 이후로 설정해주세요.');
        return;
      }
    }
    setSyncTime(newSyncTime);
  };

  /**
   * 최종 약속 생성 핸들러
   * 설정된 모든 데이터를 서버로 전송하고 완료 처리를 합니다.
   */
  const handleFinalConfirm = async () => {
    if (!auth.currentUser) return;
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const meetingRef = await addDoc(collection(db, 'meetings'), {
        title,
        description,
        location: meetingLocation,
        hostId: auth.currentUser.uid,
        hostName: auth.currentUser.displayName || '알 수 없음',
        participants: [auth.currentUser.uid, ...invitedFriends.map((f) => f.id)],
        invitedFriends: invitedFriends.map((f) => ({ uid: f.id, name: f.name })), // [추가] 이름 표시용 데이터
        dates: selectedDates,
        timeSlots,
        status: 'PENDING', // [수정] 생성 시 기본 상태는 조율 중(PENDING)
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // [추가] 초대된 친구들에게 알림 전송
      const batch = writeBatch(db);
      if (invitedFriends.length > 0) {
        for (const friend of invitedFriends) {
          await notifyMeetingInvite(batch, {
            friendId: friend.id,
            inviterName: auth.currentUser?.displayName || '알 수 없음',
            meetingTitle: title,
            meetingId: meetingRef.id,
          });
        }

        // 모든 알림 준비가 끝난 후 배치 커밋
        await batch.commit();
      }

      navigate('/propose'); // 목록 페이지로 이동
    } catch (error) {
      console.error('Error creating meeting:', error);
      toast.error('약속 생성 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderFooter = () => (
    <PageFooter>
      <LoadingButton onClick={handleFinalConfirm} isLoading={isSubmitting} className="btn-primary">
        <span>약속 제안 발송하기</span>
        <span className="bg-white/20 px-2.5 py-0.5 rounded-lg text-[12px] font-bold">{Object.values(timeSlots).flat().length}개 슬롯</span>
      </LoadingButton>
    </PageFooter>
  );

  return (
    <PageLayout title="세부 시간 설정" footer={renderFooter()}>
      <>
        <PageHeader icon={<CalendarClock className="text-primary dark:text-blue-400 w-6 h-6" />}>
          <PageTitle>
            선택한 날짜의 <span className="text-primary dark:text-blue-400">시간</span>을<br />
            설정해주세요.
          </PageTitle>
        </PageHeader>

        <MeetingSummaryCard title={title} description={description} location={meetingLocation} invitedFriends={invitedFriends} />

        {/* [추가] 시간 설정 헤더 및 통일 버튼 */}
        <div className="flex items-center justify-between mb-6 pt-8 border-t border-gray-100 dark:border-gray-700/50">
          <h3 className="text-[15px] font-black text-main dark:text-white flex items-center gap-2">
            <Clock size={18} className="text-primary dark:text-blue-400" />
            시간대 설정
          </h3>
          <button
            onClick={handleSyncTimes}
            className="px-3 py-1.5 bg-primary/10 dark:bg-blue-500/10 text-primary dark:text-blue-400 text-xs font-bold rounded-lg hover:bg-primary/20 dark:hover:bg-blue-500/20 transition-colors"
          >
            시간 일괄 설정
          </button>
        </div>

        {/* 날짜별 시간 설정 리스트 */}
        <div className="space-y-10">
          {selectedDates.sort().map((dateStr: string) => (
            <DateSlotEditor
              key={dateStr}
              dateStr={dateStr}
              slots={timeSlots[dateStr]}
              onToggleAllDay={handleToggleDayAllDay}
              onTimeChange={handleTimeChange}
              onDeleteSlot={handleDeleteSlot}
              onAddSlot={handleAddSlot}
            />
          ))}
        </div>

        {/* [추가] 시간 통일 모달 */}
        <SyncTimeModal isOpen={isSyncModalOpen} onClose={() => setIsSyncModalOpen(false)} syncTime={syncTime} onSyncTimeChange={handleSyncTimeChange} onApply={applySyncedTime} />
      </>
    </PageLayout>
  );
};

export default ProposeMeetingDetail;
