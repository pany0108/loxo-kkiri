import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Sparkles, Clock, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { doc } from 'firebase/firestore';
import { db } from '../../firebase';
import 'dayjs/locale/ko';
import { useFirestoreDoc, useAuth, useScrollToTop, useMeetingResponseForm } from 'hooks';
import { useCalendar } from 'contexts';
import toast from 'react-hot-toast';
import { HostSlotItem, DateSelectorCalendar, NewProposalSlotItem, MeetingInfoCard, EmptyProposalGuide, TopNav, PageHeader, PageFooter, SyncTimeModal } from 'components';
import { submitMeetingResponse, Meeting as MeetingData } from 'services';

dayjs.extend(isSameOrBefore);
dayjs.locale('ko');

/**
 * 초대받은 약속에 대해 응답하는 페이지 컴포넌트입니다.
 * - 주최자가 제안한 시간 중 가능한 시간을 선택할 수 있습니다.
 * - 주최자의 제안 외에 새로운 시간을 역으로 제안할 수 있습니다 (달력 인터랙션).
 * * @returns {JSX.Element} 약속 응답 화면
 */
const MeetingResponse = () => {
  const navigate = useNavigate();
  const { id: meetingId } = useParams<{ id: string }>();
  const scrollContainerRef = useScrollToTop();

  // --- 상태 관리 ---
  const { user, loading: authLoading } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const { events } = useCalendar();

  const meetingDocRef = useMemo(() => (meetingId ? doc(db, 'meetings', meetingId) : null), [meetingId]);
  const { data: meetingData, loading } = useFirestoreDoc<MeetingData>(meetingDocRef);

  // 내 기존 일정 데이터 (충돌 확인용)
  const myExistingSchedules = useMemo(() => {
    const dates = new Set<string>();
    events.forEach((event) => {
      const start = dayjs(event.start);
      // 종료일이 없으면 시작일과 동일하게 처리
      const end = event.end ? dayjs(event.end) : start;

      // 종료 시간이 00:00이면 해당 날짜는 포함하지 않음 (예: 1/1 00:00 ~ 1/2 00:00 -> 1/1만 포함)
      const isMidnight = end.hour() === 0 && end.minute() === 0;
      const effectiveEnd = event.end && isMidnight ? end.subtract(1, 'day') : end;

      let curr = start.clone();
      while (curr.isSameOrBefore(effectiveEnd, 'day')) {
        dates.add(curr.format('YYYY-MM-DD'));
        curr = curr.add(1, 'day');
      }
    });
    return Array.from(dates);
  }, [events]);

  // 주최자 제안 슬롯 데이터 변환
  const hostSlots = useMemo(() => {
    if (!meetingData) return [];
    const slots: any[] = [];
    meetingData.dates.sort().forEach((dateStr) => {
      meetingData.timeSlots[dateStr]?.forEach((ts, index) => {
        slots.push({
          id: `${dateStr}_${index}`,
          date: dateStr,
          time: ts.isAllDay ? '종일' : `${ts.start} ~ ${ts.end}`,
        });
      });
    });
    return slots;
  }, [meetingData]);

  // [Refactor] 응답 폼 로직 훅 사용
  const { selectedHostSlots, myNewSlots, toggleHostSlot, toggleMyNewSlot, updateSlotTime, toggleAllDay } = useMeetingResponseForm(hostSlots);

  // [추가] 시간 통일 모달 상태
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [syncTime, setSyncTime] = useState({ start: '19:00', end: '20:00' });

  const handleSyncTimes = () => {
    if (myNewSlots.length < 1) {
      toast('시간을 설정할 날짜를 먼저 선택해주세요.');
      return;
    }
    // 첫 번째 슬롯의 시간으로 초기화
    const firstSlot = myNewSlots[0];
    if (firstSlot && !firstSlot.isAllDay) {
      setSyncTime({ start: firstSlot.startTime, end: firstSlot.endTime });
    }
    setIsSyncModalOpen(true);
  };

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

  const applySyncedTime = () => {
    myNewSlots.forEach((slot) => {
      updateSlotTime(slot.date, 'startTime', syncTime.start);
      updateSlotTime(slot.date, 'endTime', syncTime.end);
    });
    toast.success('모든 제안 시간이 통일되었습니다.');
    setIsSyncModalOpen(false);
  };

  /**
   * 최종 응답 제출 핸들러
   * 선택한 주최자 제안 슬롯과 새로 추가한 역제안 슬롯을 서버로 전송합니다.
   */
  const handleSubmitResponse = async () => {
    if (!meetingId || !user || !meetingData) return;

    try {
      const result = await submitMeetingResponse(meetingId, user, {
        selectedHostSlots,
        myNewSlots,
      });

      if (result.escalatedToVoting) {
        toast.success('모든 친구가 응답하여 투표가 시작됩니다!');
      } else {
        toast.success('응답이 제출되었습니다.');
      }

      navigate('/propose');
    } catch (error) {
      console.error('Error submitting response:', error);
      toast.error((error as Error).message || '응답 제출 중 오류가 발생했습니다.');
    }
  };

  if (authLoading || loading || !meetingData) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-white dark:bg-gray-950">
        <Loader2 className="animate-spin text-blue-500 w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-dvh bg-white dark:bg-gray-950 font-['Pretendard']">
      <TopNav title="약속 응답하기" />

      <div ref={scrollContainerRef} className="flex-1 px-6 pt-[calc(76px+env(safe-area-inset-top))] pb-[calc(10rem+env(safe-area-inset-bottom))] overflow-y-auto w-full">
        {/* 헤더 섹션 */}
        <PageHeader className="mb-6" icon={<Sparkles className="text-blue-600 dark:text-blue-400 w-6 h-6" />}>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white leading-[1.3] tracking-tight">
            {(meetingData as any).isRetry ? (
              <>
                {meetingData.hostName}님이 <br />
                <span className="text-blue-600 dark:text-blue-400">일정을 재요청했어요</span>
              </>
            ) : (
              <>
                {meetingData.hostName}님의 제안에
                <br />
                <span className="text-blue-600 dark:text-blue-400">응답해주세요</span>
              </>
            )}
          </h2>
        </PageHeader>

        {/* 약속 상세 정보 카드 */}
        <MeetingInfoCard title={meetingData.title} description={meetingData.description} location={meetingData.location} />

        {/* 주최자 제안 확인 및 선택 영역 */}
        <section className="space-y-4 mb-10">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[15px] font-black text-gray-900 dark:text-white flex items-center gap-2">
              <Clock size={18} className="text-blue-600 dark:text-blue-400" /> 제안된 시간
            </h3>
            <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500">가능한 시간을 모두 선택하세요</span>
          </div>

          <div className="space-y-3">
            {hostSlots.map((slot) => (
              <HostSlotItem
                key={slot.id}
                slot={slot}
                isSelected={selectedHostSlots.includes(slot.id)}
                isConflict={myExistingSchedules.includes(slot.date)}
                onToggle={toggleHostSlot}
              />
            ))}
          </div>
        </section>

        {/* 내 캘린더 대조 및 역제안 영역 */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[15px] font-black text-gray-900 dark:text-white flex items-center gap-2">
              <CalendarIcon size={18} className="text-emerald-500 dark:text-emerald-400" /> 다른 시간 제안하기
            </h3>

            <div className="flex gap-2 text-[10px] font-bold">
              <span className="flex items-center gap-1 text-gray-400 dark:text-gray-500">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>내 일정
              </span>
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>선택됨
              </span>
            </div>
          </div>

          {/* 달력 컴포넌트 */}
          <DateSelectorCalendar
            currentMonth={currentMonth}
            onMonthChange={setCurrentMonth}
            myNewSlots={myNewSlots}
            hostSlots={hostSlots}
            myExistingSchedules={myExistingSchedules}
            onDateClick={toggleMyNewSlot}
          />

          {/* 추가된 역제안 슬롯 설정 영역 */}
          {myNewSlots.length > 0 && (
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between px-1 border-t border-gray-100 dark:border-gray-700/50 pt-6 mt-2">
                <p className="text-[13px] font-black text-gray-900 dark:text-gray-200 flex items-center gap-2">
                  <Clock size={16} className="text-blue-600 dark:text-blue-400" />
                  추가된 시간 설정
                </p>
                <button
                  onClick={handleSyncTimes}
                  className="px-3 py-1.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-lg hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
                >
                  시간 일괄 설정
                </button>
              </div>

              <div className="space-y-3">
                {myNewSlots.map((slot) => (
                  <NewProposalSlotItem key={slot.date} slot={slot} onTimeChange={updateSlotTime} onToggleAllDay={toggleAllDay} />
                ))}
              </div>
            </div>
          )}

          {/* 역제안이 없을 때 표시되는 가이드 */}
          {myNewSlots.length === 0 && <EmptyProposalGuide />}
        </section>
      </div>

      {/* [추가] 시간 통일 모달 */}
      <SyncTimeModal isOpen={isSyncModalOpen} onClose={() => setIsSyncModalOpen(false)} syncTime={syncTime} onSyncTimeChange={handleSyncTimeChange} onApply={applySyncedTime} />

      {/* 하단 고정 제출 버튼 */}
      <PageFooter>
        <button
          onClick={handleSubmitResponse}
          className="w-full h-[62px] bg-blue-600 text-white rounded-[24px] font-black text-[17px] shadow-lg shadow-blue-100 dark:shadow-blue-900/50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <span>제안 제출하기</span>
          {myNewSlots.length > 0 && (
            <span className="bg-emerald-500 dark:bg-emerald-400 text-white dark:text-emerald-900 px-2 py-0.5 rounded-lg text-[11px] font-bold">+ 역제안 {myNewSlots.length}건</span>
          )}
        </button>
      </PageFooter>
    </div>
  );
};

export default MeetingResponse;
