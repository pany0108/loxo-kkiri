import React, { useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import { MeetingInfoForm, FriendSelectorForMeeting, ProposalCalendar, SchedulePopup, TopNav, PageHeader, PageFooter } from 'components';
import { useProposeMeetingCreate } from 'hooks';

dayjs.locale('ko');

const ProposeMeetingCreate = () => {
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

  const { state, handlers } = useProposeMeetingCreate();
  const { title, description, meetingLocation, user, friendsList, groupedFriends, invitedFriends, selectedDates, currentMonth, schedulesByDate, schedulePopup, isValid } = state;
  const { setTitle, setDescription, setMeetingLocation, setCurrentMonth, setSchedulePopup, setSelectedDates, handleDateClick, toggleFriend, toggleGroup, handleNext } = handlers;

  return (
    <div className="flex flex-col min-h-dvh bg-white dark:bg-gray-950 font-['Pretendard']">
      <TopNav title="약속 제안하기" />

      <div ref={scrollContainerRef} className="flex-1 px-6 pt-[calc(76px+env(safe-area-inset-top))] overflow-y-auto w-full pb-[calc(10rem+env(safe-area-inset-bottom))]">
        {/* 헤더 섹션 */}
        <PageHeader icon={<Sparkles className="text-blue-600 dark:text-blue-400 w-6 h-6" />}>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white leading-[1.3] tracking-tight">
            어떤 <span className="text-blue-600 dark:text-blue-400">약속</span>을<br />
            만들어볼까요?
          </h2>
        </PageHeader>

        <div className="space-y-8">
          <MeetingInfoForm
            title={title}
            description={description}
            location={meetingLocation}
            onTitleChange={setTitle}
            onDescriptionChange={setDescription}
            onLocationChange={setMeetingLocation}
          />
          <FriendSelectorForMeeting
            groupedFriends={groupedFriends}
            invitedFriends={invitedFriends}
            allFriends={friendsList}
            onToggleFriend={toggleFriend}
            onToggleGroup={toggleGroup}
            user={user}
          />
          <ProposalCalendar
            currentMonth={currentMonth}
            onMonthChange={setCurrentMonth}
            selectedDates={selectedDates}
            schedulesByDate={schedulesByDate}
            onDateClick={handleDateClick}
          />
        </div>
      </div>

      {/* [추가] 내 일정 확인 팝업 */}
      {schedulePopup?.isOpen && (
        <SchedulePopup
          isOpen={schedulePopup.isOpen}
          date={schedulePopup.date}
          schedules={schedulePopup.schedules}
          onClose={() => setSchedulePopup(null)}
          onConfirm={(date: string) => {
            setSelectedDates((prev) => [...prev, date]);
            setSchedulePopup(null);
          }}
        />
      )}

      {/* 하단 고정 버튼 */}
      <PageFooter>
        <button
          onClick={handleNext}
          disabled={!isValid}
          className={`
            w-full h-[62px] rounded-[24px] font-black text-[17px] shadow-lg transition-all flex items-center justify-center
            ${
              isValid
                ? 'bg-blue-600 text-white shadow-blue-100 dark:shadow-blue-900/50 active:scale-[0.98]'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed shadow-none'
            }
          `}
        >
          {selectedDates.length > 0 ? `다음 단계로 (${selectedDates.length}일 선택)` : '날짜를 선택해주세요'}
        </button>
      </PageFooter>
    </div>
  );
};

export default ProposeMeetingCreate;
