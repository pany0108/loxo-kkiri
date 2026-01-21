import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { CalendarPlus } from 'lucide-react';

import { auth } from '../../firebase';
import { LoadingButton, LocationSelectModal, PageFooter, PageHeader, PageLayout, PageTitle, ScheduleForm } from 'components';
import { useAddSchedule } from 'hooks';

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
  const { formData, recurrence, isCalListOpen, isSubmitting, scheduleSearchResults, showSuggestions, myCalendars, selectedCalendar } = state;
  const { dropdownRef, titleInputRef } = refs;
  const { setRecurrence, setIsCalListOpen, setShowSuggestions, handleChange, handleToggle, handleSubmit } = handlers;

  const [isMapModalOpen, setIsMapModalOpen] = React.useState(false);

  // 초기 진입 시 시간 설정 (현재 시간 기준 정각/30분 단위)
  React.useEffect(() => {
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

      handleChange({ target: { name: 'start', value: newStart } } as any);
      setTimeout(() => {
        handleChange({ target: { name: 'end', value: newEnd } } as any);
        handleChange({ target: { name: 'isAllDay', value: false } } as any);
      }, 0);
    } else {
      const state = location.state as any;
      if (state.start && typeof state.start === 'string' && state.start.length === 10) {
        const targetDate = dayjs(state.start);
        const newStart = targetDate.hour(startObj.hour()).minute(startObj.minute()).format('YYYY-MM-DDTHH:mm');
        const newEnd = targetDate.hour(startObj.hour()).minute(startObj.minute()).add(1, 'hour').format('YYYY-MM-DDTHH:mm');

        handleChange({ target: { name: 'start', value: newStart } } as any);
        setTimeout(() => {
          handleChange({ target: { name: 'end', value: newEnd } } as any);
        }, 0);
      }
    }
  }, [handleChange, location.state]);

  // --- Handlers ---

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
    <PageLayout onBack={() => navigate(-1)} footer={renderFooter()}>
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
            selectedCalendar={selectedCalendar}
            isCalListOpen={isCalListOpen}
            setIsCalListOpen={setIsCalListOpen}
            handleCalendarSelect={handlers.handleCalendarSelect}
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
