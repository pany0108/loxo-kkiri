import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CalendarPlus } from 'lucide-react';
import dayjs from 'dayjs';
import { PageLayout, PageHeader, PageFooter, PageTitle, LoadingButton, LocationSelectModal, ScheduleForm } from 'components';
import { useAddSchedule } from 'hooks';
import { auth } from '../../firebase';

const AddSchedule = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, refs, handlers } = useAddSchedule();
  const { formData, recurrence, isCalListOpen, isSubmitting, scheduleSearchResults, showSuggestions, myCalendars, selectedCalendar } = state;
  const { dropdownRef, titleInputRef } = refs;

  const { setRecurrence, setIsCalListOpen, setShowSuggestions, handleChange, handleCalendarSelect, handleSuggestionClick, handleToggle, handleSubmit } = handlers;
  const currentUser = auth.currentUser;

  const [isMapModalOpen, setIsMapModalOpen] = React.useState(false);

  // [추가] 초기 진입 시 현재 시간으로 설정
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
      // [수정] 상태 업데이트 충돌 방지를 위해 지연 처리
      setTimeout(() => {
        handleChange({ target: { name: 'end', value: newEnd } } as any);
        handleChange({ target: { name: 'isAllDay', value: false } } as any);
      }, 0);
    } else {
      const state = location.state as any;
      // 캘린더에서 날짜만 선택해서 들어온 경우 (YYYY-MM-DD), 시간은 현재 시간으로 설정
      if (state.start && typeof state.start === 'string' && state.start.length === 10) {
        const targetDate = dayjs(state.start);
        const newStart = targetDate.hour(startObj.hour()).minute(startObj.minute()).format('YYYY-MM-DDTHH:mm');
        const newEnd = targetDate.hour(startObj.hour()).minute(startObj.minute()).add(1, 'hour').format('YYYY-MM-DDTHH:mm');

        handleChange({ target: { name: 'start', value: newStart } } as any);
        // [수정] 상태 업데이트 충돌 방지를 위해 지연 처리
        setTimeout(() => {
          handleChange({ target: { name: 'end', value: newEnd } } as any);
        }, 0);
      }
    }
  }, []);

  const handleAnniversaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    handleChange({ target: { name: 'isAnniversary', value: checked } } as any);

    if (checked) {
      // 기념일 선택 시 무조건 종일 일정으로 설정
      if (!formData.isAllDay) {
        handleToggle();
      }
      // 초기값 설정
      handleChange({ target: { name: 'isLunar', value: false } } as any);
      handleChange({ target: { name: 'isLeapMonth', value: false } } as any);
    }
  };

  const handleLunarChange = (isLunarValue: boolean) => {
    handleChange({ target: { name: 'isLunar', value: isLunarValue } } as any);
  };

  // [추가] 시간 설정 토글 핸들러 (현재 시간 기준 자동 설정)
  const handleTimeToggle = () => {
    const nextIsAllDay = !formData.isAllDay;

    // 시간 설정으로 변경되는 경우에만 현재 시간 기준으로 시간값 업데이트
    if (!nextIsAllDay) {
      const now = dayjs();
      const minute = now.minute();
      let startObj = now;

      if (minute >= 30) {
        // 30분 이상이면 다음 시간 정각 (예: 6:30 -> 7:00)
        startObj = now.add(1, 'hour').startOf('hour');
      } else {
        // 30분 미만이면 현재 시간 정각 (예: 6:10 -> 6:00)
        startObj = now.startOf('hour');
      }

      // 현재 선택된 날짜 유지
      const currentDate = dayjs(formData.start);
      const newStart = currentDate.hour(startObj.hour()).minute(startObj.minute()).second(0);
      const newEnd = newStart.add(1, 'hour');

      // [수정] handleToggle() 대신 직접 isAllDay를 false로 설정하여 9시 초기화 방지
      handleChange({ target: { name: 'isAllDay', value: false } } as any);

      // [수정] 상태 업데이트 충돌 방지를 위해 시간 설정은 지연 처리
      setTimeout(() => {
        handleChange({ target: { name: 'start', value: newStart.format('YYYY-MM-DDTHH:mm') } } as any);
        handleChange({ target: { name: 'end', value: newEnd.format('YYYY-MM-DDTHH:mm') } } as any);
      }, 0);
    } else {
      // 종일로 변경 시에는 기존 핸들러 사용
      handleToggle();
    }
  };

  const renderFooter = () => (
    <PageFooter>
      <LoadingButton
        type="submit"
        form="add-schedule-form" // [추가] form 속성으로 외부 form과 연결
        disabled={!formData.title}
        isLoading={isSubmitting}
        className="btn-primary"
      >
        <span>일정 등록하기</span>
      </LoadingButton>
    </PageFooter>
  );

  return (
    // [수정] PageLayout으로 전체 구조 변경
    <PageLayout title="새 일정 등록" onBack={() => navigate(-1)} footer={renderFooter()}>
      <>
        <PageHeader icon={<CalendarPlus className="text-primary w-6 h-6" />}>
          <PageTitle>
            새로운 <span className="text-primary">일정</span>을<br />
            등록해볼까요?
          </PageTitle>
        </PageHeader>

        {/* [수정] form에 id 추가 */}
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
