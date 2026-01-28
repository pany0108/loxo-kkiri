import { User, deleteUser } from 'firebase/auth';
import { collection, doc, addDoc, query, where, getDocs, writeBatch, arrayRemove } from 'firebase/firestore';
import dayjs from 'dayjs';
import { db } from '../firebase';

interface BirthdayInfo {
  birthDate: string;
  isLunar: boolean;
  isLeapMonth: boolean;
}

/**
 * 신규 사용자를 위한 기본 캘린더와 생일 일정을 생성합니다.
 *
 * @param {User} user - 신규 사용자 객체
 * @param {BirthdayInfo} [birthdayInfo] - 생일 정보 (선택 사항)
 * @returns {Promise<void>}
 */
export const setupInitialCalendars = async (user: User, birthdayInfo?: BirthdayInfo) => {
  // 1. 기본 캘린더 생성
  const calendarDocRef = await addDoc(collection(db, 'calendars'), {
    name: '내 캘린더',
    ownerId: user.uid,
    members: [user.uid],
    isDefault: true,
    color: '#3b82f6', // 기본 파란색
    createdAt: new Date().toISOString(),
  });

  // 2. 생일 정보가 있는 경우 생일 일정 생성
  if (birthdayInfo?.birthDate) {
    const { birthDate, isLunar, isLeapMonth } = birthdayInfo;
    const formattedBirthDate = dayjs(birthDate, 'YYYY/MM/DD').format('YYYY-MM-DD');

    await addDoc(collection(db, 'schedules'), {
      title: '내 생일',
      calendarId: calendarDocRef.id,
      isAllDay: true,
      start: formattedBirthDate,
      isLeapMonth: isLunar && isLeapMonth,
      isLunar: isLunar,
      color: '#ec4899', // 생일용 분홍색
      attendees: [user.uid],
      userId: user.uid,
      recurrence: {
        frequency: 'yearly',
        interval: 1,
      },
      createdAt: new Date().toISOString(),
    });
  }
};

/**
 * 사용자의 생일 일정을 업데이트하거나 생성합니다.
 * - 생일 정보가 없으면 기존 생일 일정을 삭제합니다.
 *
 * @param {User} user - 사용자 객체
 * @param {BirthdayInfo} birthdayInfo - 새로운 생일 정보
 * @returns {Promise<void>}
 */
export const updateUserBirthdaySchedule = async (user: User, birthdayInfo: BirthdayInfo) => {
  const { birthDate, isLunar, isLeapMonth } = birthdayInfo;

  const birthdayScheduleQuery = query(collection(db, 'schedules'), where('userId', '==', user.uid), where('title', '==', '내 생일'));
  const birthdayScheduleSnapshot = await getDocs(birthdayScheduleQuery);

  if (birthDate) {
    const formattedBirthDate = dayjs(birthDate, 'YYYY/MM/DD').format('YYYY-MM-DD');
    const birthdayData = {
      title: '내 생일',
      isAllDay: true,
      start: formattedBirthDate,
      isLeapMonth: isLunar && isLeapMonth,
      isLunar: isLunar,
      color: '#ec4899',
      attendees: [user.uid],
      userId: user.uid,
      recurrence: {
        frequency: 'yearly',
        interval: 1,
      },
    };

    if (birthdayScheduleSnapshot.empty) {
      // 기본 캘린더에 새로운 생일 일정 생성
      const defaultCalendarQuery = query(collection(db, 'calendars'), where('ownerId', '==', user.uid), where('isDefault', '==', true));
      const defaultCalendarSnapshot = await getDocs(defaultCalendarQuery);
      if (!defaultCalendarSnapshot.empty) {
        const calendarId = defaultCalendarSnapshot.docs[0].id;
        await addDoc(collection(db, 'schedules'), { ...birthdayData, calendarId, createdAt: new Date().toISOString() });
      }
    } else {
      // 기존 생일 일정 업데이트
      const batch = writeBatch(db);
      birthdayScheduleSnapshot.forEach((doc) => {
        batch.update(doc.ref, birthdayData);
      });
      await batch.commit();
    }
  } else {
    // 생일 정보가 삭제된 경우 기존 생일 일정 삭제
    if (!birthdayScheduleSnapshot.empty) {
      const batch = writeBatch(db);
      birthdayScheduleSnapshot.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }
  }
};

/**
 * 사용자의 계정과 Firestore에 저장된 모든 관련 데이터를 삭제합니다.
 * - 여러 읽기 작업을 통해 관련 문서를 수집한 후, Batch Write를 사용하여 대부분의 삭제/수정 작업을 원자적으로 처리합니다.
 * - 클라이언트 측에서 구현하기 복잡한 '다른 유저의 친구 목록에서 삭제' 기능은 제외되었습니다. (Cloud Function 사용 권장)
 *
 * @param user 삭제할 Firebase Auth 유저 객체
 */
export const deleteUserAccountAndData = async (user: User) => {
  const userId = user.uid;
  const batch = writeBatch(db);

  // 사용자 문서 참조 (삭제를 위해 필요)
  const userDocRef = doc(db, 'users', userId);

  // 1. 사용자가 참여중인 캘린더 정리
  const calendarsQuery = query(collection(db, 'calendars'), where('members', 'array-contains', userId));
  const calendarsSnapshot = await getDocs(calendarsQuery);

  const ownedCalendarIds: string[] = [];
  calendarsSnapshot.forEach((calDoc) => {
    const calendar = calDoc.data();
    if (calendar.ownerId === userId) {
      // 사용자가 소유한 캘린더는 삭제 목록에 추가
      ownedCalendarIds.push(calDoc.id);
    } else {
      // 다른 사람이 소유한 캘린더에서는 멤버에서만 제외
      batch.update(calDoc.ref, { members: arrayRemove(userId) });
    }
  });

  // 2. 소유한 캘린더에 속한 모든 일정 삭제
  if (ownedCalendarIds.length > 0) {
    // Firestore 'in' 쿼리는 한 번에 30개까지만 처리 가능하므로, 30개 단위로 분할하여 처리합니다.
    const chunks: string[][] = [];
    for (let i = 0; i < ownedCalendarIds.length; i += 30) {
      chunks.push(ownedCalendarIds.slice(i, i + 30));
    }
    for (const chunk of chunks) {
      const schedulesToDeleteQuery = query(collection(db, 'schedules'), where('calendarId', 'in', chunk));
      const schedulesToDeleteSnapshot = await getDocs(schedulesToDeleteQuery);
      schedulesToDeleteSnapshot.forEach((scheduleDoc) => {
        batch.delete(scheduleDoc.ref);
      });
    }
    // 소유한 캘린더 문서 자체도 삭제
    ownedCalendarIds.forEach((calId) => {
      batch.delete(doc(db, 'calendars', calId));
    });
  }

  // 3. 참석자로 포함된 다른 모든 일정에서 제외
  const attendedSchedulesQuery = query(collection(db, 'schedules'), where('attendees', 'array-contains', userId));
  const attendedSchedulesSnapshot = await getDocs(attendedSchedulesQuery);
  attendedSchedulesSnapshot.forEach((scheduleDoc) => {
    // 이미 삭제될 캘린더에 속한 일정은 제외
    if (!ownedCalendarIds.includes(scheduleDoc.data().calendarId)) {
      batch.update(scheduleDoc.ref, { attendees: arrayRemove(userId) });
    }
  });

  // 4. 참여중인 약속(Meeting) 정리
  const meetingsQuery = query(collection(db, 'meetings'), where('participants', 'array-contains', userId));
  const meetingSnapshots = await getDocs(meetingsQuery);
  meetingSnapshots.forEach((meetingDoc) => {
    const meeting = meetingDoc.data();
    if (meeting.hostId === userId) {
      // 주최자인 경우, 약속을 'CANCELED' 상태로 변경
      batch.update(meetingDoc.ref, { status: 'CANCELED' });
    } else {
      // 참여자인 경우, 참여자 목록에서만 제거
      batch.update(meetingDoc.ref, { participants: arrayRemove(userId) });
    }
  });

  // 5. 사용자의 모든 알림 삭제
  const notificationsQuery = query(collection(db, 'notifications'), where('userId', '==', userId));
  const notificationsSnapshot = await getDocs(notificationsQuery);
  notificationsSnapshot.forEach((notificationDoc) => {
    batch.delete(notificationDoc.ref);
  });

  // 6. 다른 모든 사용자의 친구 목록에서 나를 '탈퇴한 회원'으로 변경
  // 경고: 이 로직은 모든 사용자 문서를 스캔하므로 사용자 수가 많아질수록 비효율적이며 비용이 많이 발생합니다.
  // 대규모 애플리케이션에서는 Firebase Cloud Function의 `onUserDelete` 트리거를 사용하는 것이 훨씬 효율적이고 권장됩니다.
  // 현재는 클라이언트 측에서 요청된 기능을 구현하기 위해 모든 사용자 문서를 조회합니다.
  const allUsersQuery = query(collection(db, 'users'));
  const allUsersSnapshot = await getDocs(allUsersQuery);

  allUsersSnapshot.forEach((otherUserDoc) => {
    // 자기 자신 문서는 건너뛰기 (어차피 삭제될 예정)
    if (otherUserDoc.id === userId) return;

    const otherUserData = otherUserDoc.data();
    const otherUserFriendsList: any[] = otherUserData.friendsList || [];
    const myIndexInOtherUserList = otherUserFriendsList.findIndex((f: any) => f.uid === userId);

    if (myIndexInOtherUserList !== -1) {
      const updatedFriendsList = [...otherUserFriendsList];
      updatedFriendsList[myIndexInOtherUserList] = {
        ...updatedFriendsList[myIndexInOtherUserList],
        name: `${updatedFriendsList[myIndexInOtherUserList].name}(탈퇴한 회원)`,
        photoURL: null,
        statusMessage: null,
      };
      batch.update(otherUserDoc.ref, { friendsList: updatedFriendsList });
    }
  });

  // 7. 사용자 문서 삭제
  batch.delete(userDocRef);

  // 8. 모든 Firestore 변경사항을 일괄 적용
  await batch.commit();

  // 9. 마지막으로 Firebase Authentication에서 사용자 삭제
  await deleteUser(user);
};
