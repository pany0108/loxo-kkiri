import React, { useState } from 'react';
import { CalendarPlus } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import toast from 'react-hot-toast';

import {
  FriendSelectorForMeeting,
  LoadingButton,
  LocationSelectModal,
  MeetingInfoForm,
  PageFooter,
  PageHeader,
  PageLayout,
  PageTitle,
  ProposalCalendar,
  SchedulePopup,
} from 'components';
import { useProposeMeetingCreate } from 'hooks';

dayjs.extend(isSameOrBefore);
dayjs.locale('ko');

/**
 * 약속 제안 생성 페이지 (Step 1) 컴포넌트
 * - 약속 기본 정보 입력, 친구 초대, 날짜 선택 기능을 제공합니다.
 */
const ProposeMeetingCreate = () => {
  const { state, handlers } = useProposeMeetingCreate();
  const {
    title,
    description,
    meetingLocation,
    user,
    friendsList,
    groupedFriends,
    invitedFriends,
    selectedDates,
    currentMonth,
    schedulesByDate,
    holidaysByDate,
    schedulePopup,
    isValid,
    votingItems,
    isSubmitting,
  } = state;
  const {
    setTitle,
    setDescription,
    setMeetingLocation,
    setCurrentMonth,
    setSchedulePopup,
    setSelectedDates,
    handleDateClick,
    toggleFriend,
    toggleGroup,
    handleNext,
    setVotingItems,
  } = handlers;

  // [추가] 연속 선택 모드 상태
  const [isRangeMode, setIsRangeMode] = useState(false);
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [isRangeRemoving, setIsRangeRemoving] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  /** 날짜 클릭 핸들러 래퍼 (연속 선택 로직 처리) */
  const handleDateClickWrapper = (date: string) => {
    if (!isRangeMode) {
      handleDateClick(date);
      setVotingItems((prev) => {
        if (prev.includes(date)) {
          return prev.filter((d) => d !== date);
        }
        return [...prev, date];
      });
      return;
    }

    if (!rangeStart) {
      setRangeStart(date);
      const isSelected = selectedDates.includes(date);
      setIsRangeRemoving(isSelected);

      if (isSelected) {
        setSelectedDates((prev) => prev.filter((d) => d !== date));
        // [추가] 선택 해제 시 votingItems에서도 제거 (해당 날짜를 포함하는 모든 아이템 제거)
        setVotingItems((prev) => prev.filter((item) => !item.includes(date)));
        toast('선택 해제할 종료일을 선택해주세요.', { icon: '🗑️' });
      } else {
        setSelectedDates((prev) => [...prev, date]);
        // [추가] 시작일만 선택된 상태에서는 votingItems에 추가하지 않음 (종료일 선택 시 처리)
        toast('종료일을 선택해주세요.', { icon: '🗓️' });
      }
    } else {
      const start = dayjs(rangeStart);
      const end = dayjs(date);

      const startDate = start.isBefore(end) ? start : end;
      const endDate = start.isBefore(end) ? end : start;

      const datesInRange: string[] = [];
      let curr = startDate;
      while (curr.isSameOrBefore(endDate, 'day')) {
        datesInRange.push(curr.format('YYYY-MM-DD'));
        curr = curr.add(1, 'day');
      }

      if (isRangeRemoving) {
        // 제거 모드: 범위 내 날짜들을 선택 목록에서 제거
        const newSelectedDates = selectedDates.filter((d) => !datesInRange.includes(d));
        setSelectedDates(newSelectedDates);
        // [추가] 범위 내 날짜가 포함된 votingItems 제거
        setVotingItems((prev) =>
          prev.filter((item) => {
            // 아이템이 범위 내의 날짜를 하나라도 포함하면 제거
            if (item.includes(':')) {
              const [s, e] = item.split(':');
              // 단순화를 위해 범위가 겹치면 제거하는 로직 (교집합 확인)
              const itemStart = dayjs(s);
              const itemEnd = dayjs(e);
              const removeStart = dayjs(datesInRange[0]);
              const removeEnd = dayjs(datesInRange[datesInRange.length - 1]);
              return itemEnd.isBefore(removeStart) || itemStart.isAfter(removeEnd);
            }
            return !datesInRange.includes(item);
          }),
        );
        toast.success(`${datesInRange.length}일이 선택 해제되었습니다.`);
      } else {
        // 추가 모드: 범위 내 날짜들을 선택 목록에 추가
        const newSelectedDates = Array.from(new Set([...selectedDates, ...datesInRange]));
        setSelectedDates(newSelectedDates);
        // [추가] 범위 아이템 추가
        const rangeString = `${datesInRange[0]}:${datesInRange[datesInRange.length - 1]}`;
        setVotingItems((prev) => [...prev, rangeString]);
        toast.success(`${datesInRange.length}일이 선택되었습니다.`);
      }

      setRangeStart(null);
      setIsRangeRemoving(false);
    }
  };

  const renderFooter = () => (
    <PageFooter>
      <LoadingButton onClick={handleNext} disabled={!isValid} isLoading={isSubmitting} className="btn-primary">
        {selectedDates.length > 0 ? `다음 단계로 (${selectedDates.length}일 선택)` : '날짜를 선택해주세요'}
      </LoadingButton>
    </PageFooter>
  );

  return (
    <PageLayout footer={renderFooter()}>
      <>
        <PageHeader icon={<CalendarPlus className="text-primary dark:text-blue-400 w-6 h-6" />}>
          <PageTitle>
            어떤 <span className="text-primary dark:text-blue-400">약속</span>을<br />
            만들어볼까요?
          </PageTitle>
        </PageHeader>

        <div className="space-y-8">
          <MeetingInfoForm
            title={title}
            description={description}
            location={meetingLocation}
            onTitleChange={setTitle}
            onDescriptionChange={setDescription}
            onLocationChange={setMeetingLocation}
            onMapClick={() => setIsMapModalOpen(true)}
          />
          <FriendSelectorForMeeting
            groupedFriends={groupedFriends}
            invitedFriends={invitedFriends}
            allFriends={friendsList}
            onToggleFriend={toggleFriend}
            onToggleGroup={toggleGroup}
            user={user}
          />
          <div className="space-y-3">
            <ProposalCalendar
              currentMonth={currentMonth}
              onMonthChange={setCurrentMonth}
              selectedDates={selectedDates}
              schedulesByDate={schedulesByDate}
              onDateClick={handleDateClickWrapper}
              isRangeMode={isRangeMode}
              onToggleRangeMode={() => {
                setIsRangeMode(!isRangeMode);
                setRangeStart(null);
                setIsRangeRemoving(false);
                setSelectedDates([]); // [추가] 모드 변경 시 선택 초기화
                setVotingItems([]); // [추가] 모드 변경 시 아이템 초기화
              }}
              votingItems={votingItems} // [추가] 범위 정보 전달
              holidaysByDate={holidaysByDate}
            />
            <div className="flex justify-end gap-3 px-1">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>
                <span className="text-[10px] font-bold text-sub dark:text-gray-500">내 일정</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                <span className="text-[10px] font-bold text-primary dark:text-blue-400">선택됨</span>
              </div>
            </div>
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
              setVotingItems((prev) => [...prev, date]);
              setSchedulePopup(null);
            }}
          />
        )}

        <LocationSelectModal
          isOpen={isMapModalOpen}
          onClose={() => setIsMapModalOpen(false)}
          onSelect={(loc) => {
            setMeetingLocation(loc);
            setIsMapModalOpen(false);
          }}
          initialLocation={meetingLocation}
        />
      </>
    </PageLayout>
  );
};

export default ProposeMeetingCreate;
