import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
import { doc, collection, query, where } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useFirestoreDoc, useFirestoreQuery } from '../common/useFirestore';

export interface Friend {
  uid: string;
  id: string;
  name: string;
  group?: string;
  email: string;
}

export interface FriendGroup {
  id: string;
  name: string;
}

export const useProposeMeetingCreate = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // 이전 페이지(재요청 등)에서 전달된 초기 데이터 확인
  const initialState = location.state as {
    title?: string;
    description?: string;
    location?: string;
    invitedFriends?: { id: string; name: string }[];
    selectedDates?: string[];
  } | null;

  // 약속 기본 정보
  const [title, setTitle] = useState(initialState?.title || '');
  const [description, setDescription] = useState(initialState?.description || '');
  const [meetingLocation, setMeetingLocation] = useState(initialState?.location || '');

  // 유저 및 친구 목록 관리
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
    return userData.friendsList.map((f: any) => ({
      uid: f.uid,
      id: f.uid,
      name: f.name,
      group: f.group,
      email: f.email || '',
    }));
  }, [userData]);

  const friendGroups: FriendGroup[] = useMemo(() => userData?.friendGroups || [], [userData]);

  const groupedFriends = useMemo(() => {
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

  // 초기 초대 친구 설정 (재요청 시 데이터 복원)
  const [invitedFriends, setInvitedFriends] = useState<Friend[]>(() => {
    if (initialState?.invitedFriends) {
      return initialState.invitedFriends.map((f) => ({
        uid: f.id,
        id: f.id,
        name: f.name,
        email: '',
        group: undefined,
      }));
    }
    return [];
  });

  // 캘린더 및 날짜 선택 상태
  const [selectedDates, setSelectedDates] = useState<string[]>(initialState?.selectedDates || []);
  const [currentMonth, setCurrentMonth] = useState(initialState?.selectedDates && initialState.selectedDates.length > 0 ? dayjs(initialState.selectedDates[0]) : dayjs());

  // 내 일정 불러오기
  const schedulesQuery = useMemo(() => {
    if (!user) return null;
    return query(collection(db, 'schedules'), where('attendees', 'array-contains', user.uid));
  }, [user]);
  const { data: mySchedulesData } = useFirestoreQuery<any>(schedulesQuery);

  // 날짜별로 일정 그룹화
  const schedulesByDate = useMemo(() => {
    const map = new Map<string, any[]>();
    if (!mySchedulesData) return map;

    mySchedulesData.forEach((schedule: any) => {
      const dateStr = dayjs(schedule.start).format('YYYY-MM-DD');
      if (!map.has(dateStr)) {
        map.set(dateStr, []);
      }
      map.get(dateStr)!.push(schedule);
    });
    return map;
  }, [mySchedulesData]);

  // 일정 팝업 상태
  const [schedulePopup, setSchedulePopup] = useState<{
    isOpen: boolean;
    date: string;
    schedules: any[];
  } | null>(null);

  // 핸들러
  const handleDateClick = useCallback(
    (dateStr: string) => {
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
    },
    [selectedDates, schedulesByDate],
  );

  const toggleFriend = useCallback(
    (friend: { id: string }) => {
      setInvitedFriends((prev) => {
        const isAlreadyInvited = prev.some((f) => f.id === friend.id);
        if (isAlreadyInvited) {
          return prev.filter((f) => f.id !== friend.id);
        } else {
          const friendToAdd = friendsList.find((f) => f.id === friend.id);
          return friendToAdd ? [...prev, friendToAdd] : prev;
        }
      });
    },
    [friendsList],
  );

  const toggleGroup = useCallback(
    (group: { friends: { id: string }[] }) => {
      setInvitedFriends((prev) => {
        const groupFriendIds = new Set(group.friends.map((f) => f.id));
        const invitedFriendIds = new Set(prev.map((f) => f.id));

        const allInGroupAreInvited = group.friends.length > 0 && group.friends.every((f) => invitedFriendIds.has(f.id));

        if (allInGroupAreInvited) {
          return prev.filter((f) => !groupFriendIds.has(f.id));
        } else {
          const friendsToAdd = friendsList.filter((friend) => groupFriendIds.has(friend.id) && !invitedFriendIds.has(friend.id));
          return [...prev, ...friendsToAdd];
        }
      });
    },
    [friendsList],
  );

  const handleNext = useCallback(() => {
    const calendarName = `나와 ${invitedFriends.map((f) => f.name).join(', ')}의 약속`;

    navigate('/propose/detail', {
      state: { title, description, location: meetingLocation, invitedFriends, selectedDates, calendarName },
    });
  }, [navigate, title, description, meetingLocation, invitedFriends, selectedDates]);

  const isValid = title.length > 0 && invitedFriends.length > 0 && selectedDates.length > 0;

  return {
    state: {
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
      schedulePopup,
      isValid,
    },
    handlers: {
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
    },
  };
};
