import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Sparkles } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import { auth, db } from '../firebase';
import { doc, collection, query, where } from 'firebase/firestore';
import { useFirestoreDoc, useFirestoreQuery } from 'hooks';
import { onAuthStateChanged } from 'firebase/auth';
import { MeetingInfoForm, FriendSelectorForMeeting, ProposalCalendar, SchedulePopup } from 'components';

dayjs.locale('ko');

/**
 * 친구 데이터 인터페이스
 */
interface Friend {
  id: string;
  name: string;
  group?: string;
}

interface FriendGroup {
  id: string;
  name: string;
}

/**
 * 약속 제안 생성 페이지 (Step 1) 컴포넌트입니다.
 * - 약속의 기본 정보(제목, 메모)를 입력합니다.
 * - 초대할 친구를 선택하고, 후보 날짜를 캘린더에서 다중 선택합니다.
 * * @returns {JSX.Element} 약속 생성 초기 화면
 */
const ProposeMeetingCreate = () => {
  const navigate = useNavigate();

  // --- 상태 관리 ---

  // 약속 기본 정보
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');

  // [수정] 친구 목록 DB 연동
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const userDocRef = useMemo(() => (user ? doc(db, 'users', user.uid) : null), [user]);
  const { data: userData } = useFirestoreDoc<any>(userDocRef);

  const friendsList: Friend[] = useMemo(() => {
    if (!userData?.friendsList) return [];
    return userData.friendsList.map((f: any) => ({ id: f.uid, name: f.name, group: f.group }));
  }, [userData]);

  const friendGroups: FriendGroup[] = useMemo(() => userData?.friendGroups || [], [userData]);

  const groupedFriends = useMemo(() => {
    // ... (CreateCalendar.tsx와 동일한 그룹화 로직)
    const groupMap = new Map<string, { name: string; friends: Friend[] }>();
    friendGroups.forEach((g) => groupMap.set(g.id, { name: g.name, friends: [] }));
    groupMap.set('uncategorized', { name: '미분류', friends: [] });

    friendsList.forEach((friend) => {
      const groupId = friend.group || 'uncategorized';
      if (groupMap.has(groupId)) {
        groupMap.get(groupId)!.friends.push(friend);
      } else {
        groupMap.get('uncategorized')!.friends.push(friend);
      }
    });

    groupMap.forEach((groupData) => groupData.friends.sort((a, b) => a.name.localeCompare(b.name, 'ko')));

    return Array.from(groupMap.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => {
        if (a.id === 'uncategorized') return 1;
        if (b.id === 'uncategorized') return -1;
        return a.name.localeCompare(b.name, 'ko');
      });
  }, [friendsList, friendGroups]);

  const [invitedFriends, setInvitedFriends] = useState<Friend[]>([]);

  // 캘린더 및 날짜 선택 상태
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const [selectedDates, setSelectedDates] = useState<string[]>([]);

  // [추가] 내 일정 불러오기
  const schedulesQuery = useMemo(() => {
    if (!user) return null;
    return query(collection(db, 'schedules'), where('attendees', 'array-contains', user.uid));
  }, [user]);
  const { data: mySchedulesData } = useFirestoreQuery<any>(schedulesQuery);

  // [추가] 날짜별로 일정 그룹화 (반복일정 미확장)
  const schedulesByDate = useMemo(() => {
    const map = new Map<string, any[]>();
    if (!mySchedulesData) return map;

    mySchedulesData.forEach((schedule) => {
      // 참고: 이 로직은 반복일정을 확장하지 않고, 시작일 기준으로만 표시합니다.
      const dateStr = dayjs(schedule.start).format('YYYY-MM-DD');
      if (!map.has(dateStr)) {
        map.set(dateStr, []);
      }
      map.get(dateStr)!.push(schedule);
    });
    return map;
  }, [mySchedulesData]);

  // [추가] 일정 팝업 상태
  const [schedulePopup, setSchedulePopup] = useState<{
    isOpen: boolean;
    date: string;
    schedules: any[];
  } | null>(null);

  /**
   * 날짜 클릭 핸들러
   * - 이미 선택된 날짜는 팝업 없이 바로 선택 해제
   * - 선택되지 않았고, 내 일정이 있는 경우 팝업 열기
   * - 선택되지 않았고, 일정이 없는 경우 바로 날짜 선택
   * @param {string} dateStr - YYYY-MM-DD 형식의 날짜 문자열
   */
  const handleDateClick = (dateStr: string) => {
    const isSelected = selectedDates.includes(dateStr);
    const dailySchedules = schedulesByDate.get(dateStr) || [];
    const hasMySchedule = dailySchedules.length > 0;

    if (isSelected) {
      setSelectedDates((prev) => prev.filter((d) => d !== dateStr));
    } else if (hasMySchedule) {
      setSchedulePopup({ isOpen: true, date: dateStr, schedules: dailySchedules });
    } else {
      setSelectedDates((prev) => [...prev, dateStr]);
    }
  };

  /**
   * 친구 초대 토글 핸들러
   * @param {Friend} friend - 선택한 친구 객체
   */
  const toggleFriend = (friend: Friend) => {
    setInvitedFriends((prev) => (prev.find((f) => f.id === friend.id) ? prev.filter((f) => f.id !== friend.id) : [...prev, friend]));
  };

  /**
   * 다음 단계 이동 핸들러
   * 입력된 데이터를 state로 전달하며 상세 설정 페이지로 이동합니다.
   */
  const handleNext = () => {
    // 버튼의 disabled 속성으로 유효성을 제어하므로 별도 alert 불필요
    const calendarName = `나와 ${invitedFriends.map((f) => f.name).join(', ')}의 약속`;

    navigate('/propose/detail', {
      state: { title, description, location, invitedFriends, selectedDates, calendarName },
    });
  };

  /**
   * 폼 유효성 검사 (제목, 친구 1명 이상, 날짜 1개 이상 선택 필수)
   */
  const isValid = title.length > 0 && invitedFriends.length > 0 && selectedDates.length > 0;

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-950 font-['Pretendard']">
      {/* 상단 네비게이션 */}
      <nav className="px-6 pt-6 flex items-center sticky top-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md z-40">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors active:scale-90"
          aria-label="뒤로 가기"
        >
          <ChevronLeft size={28} />
        </button>
      </nav>

      <div className="flex-1 px-6 pt-4 pb-32 overflow-y-auto w-full">
        {/* 헤더 섹션 */}
        <header className="mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-50 rounded-xl mb-6">
            <Sparkles className="text-blue-600 w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 leading-[1.3] tracking-tight">
            어떤 <span className="text-blue-600">약속</span>을<br />
            만들어볼까요?
          </h2>
        </header>

        <div className="space-y-8">
          <MeetingInfoForm
            title={title}
            description={description}
            location={location}
            onTitleChange={setTitle}
            onDescriptionChange={setDescription}
            onLocationChange={setLocation}
          />
          <FriendSelectorForMeeting groupedFriends={groupedFriends} invitedFriends={invitedFriends} onToggleFriend={toggleFriend} />
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
          onConfirm={(date) => {
            setSelectedDates((prev) => [...prev, date]);
            setSchedulePopup(null);
          }}
        />
      )}

      {/* 하단 고정 버튼 */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-gray-50 z-20 px-6 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <button
          onClick={handleNext}
          disabled={!isValid}
          className={`
            w-full h-[62px] rounded-[24px] font-black text-[17px] shadow-lg transition-all flex items-center justify-center
            ${isValid ? 'bg-blue-600 text-white shadow-blue-100 active:scale-[0.98]' : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'}
          `}
        >
          {selectedDates.length > 0 ? `다음 단계로 (${selectedDates.length}일 선택)` : '날짜를 선택해주세요'}
        </button>
      </footer>
    </div>
  );
};

export default ProposeMeetingCreate;
