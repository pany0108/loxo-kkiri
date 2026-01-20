import { User } from 'firebase/auth';
import { collection, query, where, doc, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase';
import { getDocuments, addDocument, createBatch } from './firestoreService';
import { notifyCalendarInvite, notifyCalendarLeave } from './notificationService';
import { CalendarType } from 'types';

export interface CreateCalendarData {
  name: string;
  color: string;
  memberUids: string[];
}

/**
 * 새로운 캘린더를 생성합니다.
 * - 동일한 멤버 구성의 캘린더가 이미 존재하는지 확인합니다.
 * - 캘린더 생성 후 초대된 멤버들에게 알림을 전송합니다.
 *
 * @param {User} user - 캘린더를 생성하는 현재 사용자
 * @param {CreateCalendarData} data - 캘린더 생성 데이터 (이름, 색상, 멤버 등)
 * @returns {Promise<{ calendarId: string }>} 생성된 캘린더 ID
 * @throws {Error} 동일한 멤버 구성의 캘린더가 이미 존재할 경우 에러 발생
 */
export const createCalendar = async (user: User, data: CreateCalendarData): Promise<{ calendarId: string }> => {
  const { name, color, memberUids } = data;
  const newMembers = [user.uid, ...memberUids].sort();

  // 1. Check for duplicate calendar
  const existingCalendars = await getDocuments<CalendarType>('calendars', where('members', '==', newMembers));

  if (existingCalendars.length > 0) {
    const existingCalendarName = existingCalendars[0].name;
    throw new Error(`'${existingCalendarName}' 캘린더가 이미 같은 멤버로 생성되어 있습니다.`);
  }

  // 2. Create new calendar
  const calendarData = {
    name,
    ownerId: user.uid,
    members: newMembers,
    color,
    isDefault: false,
  };
  // firestoreService의 addDocument가 타임스탬프를 추가함
  const docRef = await addDocument('calendars', calendarData);

  // 3. Send notifications to invited friends
  if (memberUids.length > 0 && user.displayName) {
    const batch = createBatch();
    for (const friendUid of memberUids) {
      await notifyCalendarInvite(batch, {
        friendUid: friendUid,
        inviterName: user.displayName,
        inviterId: user.uid,
        calendarName: name,
        calendarId: docRef.id,
      });
    }
    await batch.commit();
  }

  return { calendarId: docRef.id };
};

/**
 * 캘린더와 해당 캘린더에 속한 모든 일정을 삭제합니다.
 *
 * @param {string} calendarId - 삭제할 캘린더 ID
 * @returns {Promise<void>}
 */
export const deleteCalendar = async (calendarId: string): Promise<void> => {
  const batch = createBatch();

  // 1. 캘린더에 속한 일정들 조회
  const schedules = await getDocuments<{ id: string }>('schedules', where('calendarId', '==', calendarId));

  // 2. 일정들 삭제 (Batch)
  schedules.forEach((schedule) => {
    const scheduleRef = doc(db, 'schedules', schedule.id);
    batch.delete(scheduleRef);
  });

  // 3. 캘린더 문서 삭제 (Batch)
  const calendarRef = doc(db, 'calendars', calendarId);
  batch.delete(calendarRef);

  // 4. 커밋
  await batch.commit();
};

/**
 * 공유 캘린더에서 나갑니다.
 * - 마지막 멤버인 경우 캘린더를 삭제합니다.
 * - 남은 멤버들에게 퇴장 알림을 전송합니다.
 *
 * @param {CalendarType} calendar - 나갈 캘린더 객체
 * @param {User} user - 나가는 사용자 객체
 * @returns {Promise<void>}
 */
export const leaveCalendar = async (calendar: CalendarType, user: User): Promise<void> => {
  if (calendar.members.length <= 1) {
    await deleteCalendar(calendar.id);
  } else {
    const batch = createBatch();
    const calendarRef = doc(db, 'calendars', calendar.id);

    batch.update(calendarRef, {
      members: arrayRemove(user.uid),
    });

    const remainingMembers = calendar.members.filter((uid) => uid !== user.uid);
    for (const memberId of remainingMembers) {
      await notifyCalendarLeave(batch, {
        memberId: memberId,
        leaverName: user.displayName || '누군가',
        calendarName: calendar.name,
        calendarId: calendar.id,
      });
    }

    await batch.commit();
  }
};

/**
 * 주어진 멤버 구성에 맞는 캘린더를 찾습니다.
 * 1. 멤버 구성이 정확히 일치하는 공유 캘린더를 찾습니다.
 * 2. 없다면 사용자의 기본 캘린더를 반환합니다.
 *
 * @param {string[]} members - 멤버 UID 배열
 * @param {string} userId - 현재 사용자 ID
 * @returns {Promise<CalendarType | null>} 찾은 캘린더 객체 또는 null
 */
export const findTargetCalendarForMembers = async (members: string[], userId: string): Promise<CalendarType | null> => {
  const sortedMembers = [...members].sort();

  const sharedCalendars = await getDocuments<CalendarType>('calendars', where('members', '==', sortedMembers));
  if (sharedCalendars.length > 0) {
    return sharedCalendars[0];
  }

  const defaultCalendars = await getDocuments<CalendarType>('calendars', where('ownerId', '==', userId), where('isDefault', '==', true));
  if (defaultCalendars.length > 0) {
    return defaultCalendars[0];
  }

  return null;
};

/**
 * 사용자가 멤버로 포함된 캘린더 목록을 조회하는 쿼리를 반환합니다.
 *
 * @param {string} userId - 사용자 ID
 * @returns {Query} Firestore 쿼리 객체
 */
export const getCalendarsForUserQuery = (userId: string) => {
  return query(collection(db, 'calendars'), where('members', 'array-contains', userId));
};
