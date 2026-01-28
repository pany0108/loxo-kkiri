import React, { useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import dayjs from 'dayjs';
import { CalendarPlus } from 'lucide-react';
import { addDoc, collection, writeBatch } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { auth, db } from '../../firebase';
import { LoadingButton, LocationSelectModal, PageFooter, PageHeader, PageLayout, PageTitle, ScheduleForm } from 'components';
import { useAddSchedule } from 'hooks';
import { notifyScheduleAdded } from 'services';

/**
 * 일정 추가 페이지 컴포넌트
 * - 새로운 일정을 생성하는 폼 제공
 * - 날짜, 시간, 반복 설정, 위치, 알림 등을 설정할 수 있습니다.
 *
 * @returns {JSX.Element} 일정 추가 화면
 */
const AddSchedule = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = auth.currentUser;

  const { state, refs, handlers } = useAddSchedule();
  const { formData, recurrence, isCalListOpen, scheduleSearchResults, showSuggestions, myCalendars } = state;
  const { dropdownRef, titleInputRef } = refs;
  const { setRecurrence, setIsCalListOpen, setShowSuggestions, handleChange, handleToggle } = handlers;

  const [isMapModalOpen, setIsMapModalOpen] = React.useState(false);
  const [selectedCalendarIds, setSelectedCalendarIds] = React.useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // 초기화 실행 여부를 추적하는 Ref (리렌더링 루프 방지)
  const isInitialized = useRef(false);

  // 초기 진입 시 시간 설정 (현재 시간 기준 정각/30분 단위)
  React.useEffect(() => {
    // 이미 초기화되었다면 중단하여 불필요한 상태 업데이트 방지
    if (isInitialized.current) return;
    isInitialized.current = true;

    const now = dayjs();
    const minute = now.minute();
    let startObj = now;

    if (minute >= 30) {
      startObj = now.add(1, 'hour').startOf('hour');
    } else {
      startObj = now.startOf('hour');
    }

    if (!location.state) {
      const newStart = startObj.format('YYYY-MM-DDTHH:mm');
      const newEnd = startObj.add(1, 'hour').format('YYYY-MM-DDTHH:mm');

      // setTimeout 제거: 상태 업데이트는 즉시 처리하여 배치(Batch) 처리 유도
      handleChange({ target: { name: 'start', value: newStart } } as any);
      handleChange({ target: { name: 'end', value: newEnd } } as any);
      handleChange({ target: { name: 'isAllDay', value: false } } as any);
    } else {
      const state = location.state as any;
      if (state.start && typeof state.start === 'string' && state.start.length === 10) {
        const targetDate = dayjs(state.start);
        const newStart = targetDate.hour(startObj.hour()).minute(startObj.minute()).format('YYYY-MM-DDTHH:mm');
        const newEnd = targetDate.hour(startObj.hour()).minute(startObj.minute()).add(1, 'hour').format('YYYY-MM-DDTHH:mm');

        handleChange({ target: { name: 'start', value: newStart } } as any);
        handleChange({ target: { name: 'end', value: newEnd } } as any);
      }
    }
    // 의존성 배열을 비워 마운트 시 1회만 실행 보장 (eslint 경고 무시)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 초기 캘린더 선택
  React.useEffect(() => {
    if (selectedCalendarIds.length === 0 && myCalendars.length > 0) {
      if (formData.calendarId) {
        setSelectedCalendarIds([formData.calendarId]);
      } else {
        const defaultCal = myCalendars.find((c) => c.isDefault) || myCalendars[0];
        if (defaultCal) setSelectedCalendarIds([defaultCal.id]);
      }
    }
  }, [myCalendars, formData.calendarId, selectedCalendarIds.length]);

  // --- Handlers ---

  const handleCalendarSelect = (calendarId: string) => {
    setSelectedCalendarIds((prev) => {
      if (prev.includes(calendarId)) {
        if (prev.length === 1) return prev; // 최소 1개 선택 유지
        return prev.filter((id) => id !== calendarId);
      }
      return [...prev, calendarId];
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return toast.error('로그인이 필요합니다.');
    if (!formData.title) return toast.error('제목을 입력해주세요.');
    if (selectedCalendarIds.length === 0) return toast.error('일정을 저장할 캘린더를 선택해주세요.');
    if (dayjs(formData.end).isBefore(dayjs(formData.start))) return toast.error('종료 시간이 시작 시간보다 빠를 수 없습니다.');

    setIsSubmitting(true);
    try {
      const batch = writeBatch(db);

      for (const calendarId of selectedCalendarIds) {
        const selectedCalendar = myCalendars.find((c) => c.id === calendarId);
        const attendees = selectedCalendar ? selectedCalendar.members : [currentUser.uid];

        const scheduleData = {
          userId: currentUser.uid,
          ...formData,
          calendarId, // 각 일정에 맞는 캘린더 ID 설정
          recurrence,
          createdAt: new Date().toISOString(),
          attendees,
        };

        const scheduleDocRef = await addDoc(collection(db, 'schedules'), scheduleData);

        if (selectedCalendar && selectedCalendar.members.length > 1) {
          for (const memberId of selectedCalendar.members) {
            if (memberId === currentUser.uid) continue;
            await notifyScheduleAdded(batch, {
              memberId,
              editorName: currentUser.displayName || '알 수 없음',
              calendarName: selectedCalendar.name,
              scheduleTitle: formData.title,
              scheduleId: scheduleDocRef.id,
              calendarId: selectedCalendar.id,
            });
          }
        }
      }
      await batch.commit();
      toast.success('일정이 저장되었습니다! ☁️');
      navigate('/calendar');
    } catch (error) {
      console.error('Error adding document: ', error);
      toast.error('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /** * 뒤로가기 핸들러 (수정됨)
   * - 복잡한 비동기 로직(setTimeout)을 제거하고 순수한 네비게이션만 수행합니다.
   * - replace: true를 사용하여 히스토리를 깔끔하게 관리합니다.
   */
  const handleBack = React.useCallback(() => {
    // 캘린더 생성 등 특정 경로에서 왔을 경우
    if (location.state?.from === '/create-calendar') {
      navigate('/calendar', { replace: true });
    } else {
      // 일반적인 경우 캘린더 메인으로 명시적 이동
      navigate('/calendar', { replace: true });
    }
  }, [location.state, navigate]);

  // 안드로이드 하드웨어 뒤로가기 버튼 처리
  React.useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let listener: PluginListenerHandle | undefined;
    let isMounted = true;

    const setupListener = async () => {
      const handle = await CapacitorApp.addListener('backButton', () => {
        handleBack();
      });
      if (isMounted) {
        listener = handle;
      } else {
        handle.remove();
      }
    };
    setupListener();

    return () => {
      isMounted = false;
      if (listener) listener.remove();
    };
  }, [handleBack]);

  /**
   * 기념일 체크박스 변경 핸들러
   * - 기념일 설정 시 종일 일정으로 자동 변경되고, 음력/윤달 설정이 초기화됩니다.
   * @param {React.ChangeEvent<HTMLInputElement>} e - 이벤트 객체
   */
  const handleAnniversaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    handleChange({ target: { name: 'isAnniversary', value: checked } } as any);

    if (checked) {
      if (!formData.isAllDay) {
        handleToggle();
      }
      handleChange({ target: { name: 'isLunar', value: false } } as any);
      handleChange({ target: { name: 'isLeapMonth', value: false } } as any);
    }
  };

  /**
   * 음력 체크박스 변경 핸들러
   * @param {boolean} isLunarValue - 음력 여부
   */
  const handleLunarChange = (isLunarValue: boolean) => {
    handleChange({ target: { name: 'isLunar', value: isLunarValue } } as any);
  };

  /**
   * 시간 설정 토글 핸들러
   * - '종일' 설정 해제 시 현재 시간 기준으로 시작/종료 시간을 자동 설정합니다.
   * - '종일' 설정 시 시간을 초기화합니다.
   */
  const handleTimeToggle = () => {
    const nextIsAllDay = !formData.isAllDay;

    if (!nextIsAllDay) {
      const now = dayjs();
      const minute = now.minute();
      let startObj = now;

      if (minute >= 30) {
        startObj = now.add(1, 'hour').startOf('hour');
      } else {
        startObj = now.startOf('hour');
      }

      const currentDate = dayjs(formData.start);
      const newStart = currentDate.hour(startObj.hour()).minute(startObj.minute()).second(0);
      const newEnd = newStart.add(1, 'hour');

      handleChange({ target: { name: 'isAllDay', value: false } } as any);

      setTimeout(() => {
        handleChange({ target: { name: 'start', value: newStart.format('YYYY-MM-DDTHH:mm') } } as any);
        handleChange({ target: { name: 'end', value: newEnd.format('YYYY-MM-DDTHH:mm') } } as any);
      }, 0);
    } else {
      handleToggle();
    }
  };

  const renderFooter = () => (
    <PageFooter>
      <LoadingButton type="submit" form="add-schedule-form" disabled={!formData.title} isLoading={isSubmitting} className="btn-primary">
        <span>일정 등록하기</span>
      </LoadingButton>
    </PageFooter>
  );

  return (
    <PageLayout onBack={handleBack} footer={renderFooter()}>
      <>
        <PageHeader icon={<CalendarPlus className="text-primary w-6 h-6" />}>
          <PageTitle>
            새로운 <span className="text-primary">일정</span>을<br />
            등록해볼까요?
          </PageTitle>
        </PageHeader>

        {/* 일정 입력 폼 */}
        <form id="add-schedule-form" onSubmit={handleSubmit} className="space-y-6">
          <ScheduleForm
            formData={formData}
            handleChange={handleChange}
            handleToggleAllDay={handleTimeToggle}
            handleAnniversaryChange={handleAnniversaryChange}
            handleLunarChange={handleLunarChange}
            recurrence={recurrence}
            setRecurrence={setRecurrence}
            myCalendars={myCalendars}
            selectedCalendarIds={selectedCalendarIds}
            isCalListOpen={isCalListOpen}
            setIsCalListOpen={setIsCalListOpen}
            handleCalendarSelect={handleCalendarSelect}
            currentUser={currentUser}
            navigate={navigate}
            openMapModal={() => setIsMapModalOpen(true)}
            titleInputRef={titleInputRef}
            scheduleSearchResults={scheduleSearchResults}
            showSuggestions={showSuggestions}
            setShowSuggestions={setShowSuggestions}
            handleSuggestionClick={handlers.handleSuggestionClick}
            dropdownRef={dropdownRef}
          />
        </form>

        {/* 지도 위치 선택 모달 */}
        <LocationSelectModal
          isOpen={isMapModalOpen}
          onClose={() => setIsMapModalOpen(false)}
          onSelect={(loc) => {
            handleChange({ target: { name: 'location', value: loc } } as any);
            setIsMapModalOpen(false);
          }}
          initialLocation={formData.location}
        />
      </>
    </PageLayout>
  );
};

export default AddSchedule;
