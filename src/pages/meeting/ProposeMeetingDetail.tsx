import React, { useState, useLayoutEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import { Sparkles, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { collection, addDoc, writeBatch, doc } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { MeetingSummaryCard, DateSlotEditor, SyncTimeModal, TopNav } from 'components';

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
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  /**
   * 페이지가 로드될 때 스크롤을 최상단으로 이동시킵니다.
   */
  useLayoutEffect(() => {
    // 페이지 전환 시 브라우저의 스크롤 복원 기능과 관계없이 항상 화면 최상단에서 시작하도록 강제합니다.
    window.scrollTo(0, 0);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

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

  /**
   * 날짜별 시간 슬롯 상태 관리
   * 초기값: 선택된 모든 날짜에 대해 기본적으로 19:00~21:00 슬롯 하나를 생성합니다.
   */
  const [timeSlots, setTimeSlots] = useState<Record<string, TimeSlot[]>>(
    selectedDates.reduce((acc: any, dateStr: string) => {
      acc[dateStr] = [{ start: '19:00', end: '21:00', isAllDay: false }];
      return acc;
    }, {}),
  );

  // [추가] 시간 통일 모달 상태
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [syncTime, setSyncTime] = useState({ start: '19:00', end: '20:00' });

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
    toast.success('모든 시간대가 통일되었습니다.');
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
    }
    setSyncTime(newSyncTime);
  };

  /**
   * 최종 약속 생성 핸들러
   * 설정된 모든 데이터를 서버로 전송하고 완료 처리를 합니다.
   */
  const handleFinalConfirm = async () => {
    if (!auth.currentUser) return;

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
      });

      // [추가] 초대된 친구들에게 알림 전송
      const batch = writeBatch(db);
      invitedFriends.forEach((friend) => {
        const notiRef = doc(collection(db, 'notifications'));
        batch.set(notiRef, {
          userId: friend.id,
          type: 'MEETING_INVITE',
          message: `${auth.currentUser?.displayName || '알 수 없음'}님이 '${title}' 약속에 초대했습니다.`,
          relatedId: meetingRef.id,
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      });
      await batch.commit();

      navigate('/propose'); // 목록 페이지로 이동
    } catch (error) {
      console.error('Error creating meeting:', error);
      toast.error('약속 생성 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="flex flex-col min-h-dvh bg-white dark:bg-gray-950 font-['Pretendard']">
      <TopNav title="세부 시간 설정" />

      <div ref={scrollContainerRef} className="flex-1 px-6 pt-[calc(76px+env(safe-area-inset-top))] overflow-y-auto w-full pb-[calc(10rem+env(safe-area-inset-bottom))]">
        {/* 헤더 섹션 */}
        <header className="mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-50 dark:bg-blue-500/10 rounded-xl mb-6">
            <Sparkles className="text-blue-600 dark:text-blue-400 w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white leading-[1.3] tracking-tight">
            선택한 날짜의 <span className="text-blue-600 dark:text-blue-400">시간</span>을<br />
            설정해주세요.
          </h2>
        </header>

        <MeetingSummaryCard title={title} description={description} location={meetingLocation} invitedFriends={invitedFriends} />

        {/* [추가] 시간 설정 헤더 및 통일 버튼 */}
        <div className="flex items-center justify-between mb-6 pt-8 border-t border-gray-100 dark:border-gray-700/50">
          <h3 className="text-[15px] font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Clock size={18} className="text-blue-600 dark:text-blue-400" />
            시간대 설정
          </h3>
          <button
            onClick={handleSyncTimes}
            className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs font-bold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
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
      </div>

      {/* [추가] 시간 통일 모달 */}
      <SyncTimeModal isOpen={isSyncModalOpen} onClose={() => setIsSyncModalOpen(false)} syncTime={syncTime} onSyncTimeChange={handleSyncTimeChange} onApply={applySyncedTime} />

      {/* 하단 고정 제안 발송 버튼 */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-t border-gray-50 dark:border-gray-800 z-20 px-6 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <button
          onClick={handleFinalConfirm}
          className="w-full h-[62px] bg-blue-600 text-white rounded-[24px] font-black text-[17px] shadow-lg shadow-blue-100 dark:shadow-blue-900/50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <span>약속 제안 발송하기</span>
          <span className="bg-white/20 px-2.5 py-0.5 rounded-lg text-[12px] font-bold">{Object.values(timeSlots).flat().length}개 슬롯</span>
        </button>
      </footer>
    </div>
  );
};

export default ProposeMeetingDetail;
