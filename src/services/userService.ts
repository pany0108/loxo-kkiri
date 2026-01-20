import { User } from 'firebase/auth';
import { collection, addDoc, query, where, getDocs, writeBatch } from 'firebase/firestore';
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
  // 1. Create default calendar
  const calendarDocRef = await addDoc(collection(db, 'calendars'), {
    name: '내 캘린더',
    ownerId: user.uid,
    members: [user.uid],
    isDefault: true,
    color: '#3b82f6', // Default blue
    createdAt: new Date().toISOString(),
  });

  // 2. Create birthday schedule if birthDate is provided
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
      color: '#ec4899', // Pink color for birthdays
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
      // Create new birthday schedule in the default calendar
      const defaultCalendarQuery = query(collection(db, 'calendars'), where('ownerId', '==', user.uid), where('isDefault', '==', true));
      const defaultCalendarSnapshot = await getDocs(defaultCalendarQuery);
      if (!defaultCalendarSnapshot.empty) {
        const calendarId = defaultCalendarSnapshot.docs[0].id;
        await addDoc(collection(db, 'schedules'), { ...birthdayData, calendarId, createdAt: new Date().toISOString() });
      }
    } else {
      // Update existing birthday schedule(s)
      const batch = writeBatch(db);
      birthdayScheduleSnapshot.forEach((doc) => {
        batch.update(doc.ref, birthdayData);
      });
      await batch.commit();
    }
  } else {
    // Delete existing birthday schedule if birthDate is cleared
    if (!birthdayScheduleSnapshot.empty) {
      const batch = writeBatch(db);
      birthdayScheduleSnapshot.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }
  }
};
