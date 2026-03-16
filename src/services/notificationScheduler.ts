import { Capacitor } from '@capacitor/core';
import { LocalNotifications, LocalNotificationSchema } from '@capacitor/local-notifications';
import dayjs, { ManipulateType } from 'dayjs';

/**
 * 문자열을 32비트 정수 해시 코드로 변환합니다.
 * Firestore의 문자열 ID를 로컬 알림의 숫자 ID로 사용하기 위함입니다.
 * @param {string} str - 해싱할 문자열
 * @returns {number} 32비트 정수 해시 값
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // 32비트 정수로 변환
  }
  // 항상 양수를 반환하도록 처리
  return Math.abs(hash);
}

interface RecurrenceSettings {
  frequency: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  daysOfWeek?: ('SU' | 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA')[];
  monthlyType?: 'date' | 'day';
  endType: 'none' | 'date' | 'count';
  endDate?: string;
  endCount?: number;
  exceptions?: string[];
}

export interface ScheduleData {
  id: string;
  title: string;
  start: string;
  notification: string; // 'none', '0', '5', '10' 등
  recurrence?: RecurrenceSettings;
}

/**
 * 특정 일정(반복 포함)에 대한 모든 예약된 로컬 알림을 취소합니다.
 * @param {string} scheduleId - 취소할 일정의 Firestore 문서 ID
 */
export const cancelAllNotificationsForSchedule = async (scheduleId: string) => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const pending = await LocalNotifications.getPending();
    const notificationsToCancel = pending.notifications.filter(
      (notification) => notification.extra?.relatedId === scheduleId,
    );

    if (notificationsToCancel.length > 0) {
      await LocalNotifications.cancel({
        notifications: notificationsToCancel.map((n) => ({ id: n.id })),
      });
    }
  } catch (error) {
    console.error('일정에 대한 알림 취소 실패:', scheduleId, error);
  }
};

/**
 * 반복 일정의 향후 발생 시점을 계산합니다.
 * @param schedule - 반복 규칙이 포함된 일정 데이터
 * @returns 미래 발생 시점의 Date 객체 배열
 */
const calculateOccurrences = (schedule: ScheduleData): Date[] => {
  const { start, recurrence } = schedule;
  if (!recurrence || recurrence.frequency === 'none') {
    const startDate = dayjs(start);
    // 단일 이벤트의 경우, 시작 시간이 미래인 경우에만 반환합니다.
    return startDate.isAfter(dayjs()) ? [startDate.toDate()] : [];
  }

  const occurrences: Date[] = [];
  let cursor = dayjs(start);
  const endDate = recurrence.endType === 'date' && recurrence.endDate ? dayjs(recurrence.endDate).endOf('day') : null;
  const exceptions = new Set(recurrence.exceptions?.map((d) => dayjs(d).format('YYYY-MM-DD')) || []);

  // iOS는 64개, Android는 500개 제한이 있으므로 안전하게 60개로 제한합니다.
  const maxOccurrences = 60;
  let count = 0;
  const endCount = recurrence.endType === 'count' ? recurrence.endCount || 1 : Infinity;

  while (count < endCount && (!endDate || cursor.isBefore(endDate)) && occurrences.length < maxOccurrences) {
    if (!exceptions.has(cursor.format('YYYY-MM-DD'))) {
      if (cursor.isAfter(dayjs())) {
        occurrences.push(cursor.toDate());
      }
    }

    count++;

    // 다음 발생 시점으로 커서를 이동합니다.
    // 참고: 현재 주별(요일 선택), 월별(n번째 주 m요일) 등 복잡한 규칙은 지원하지 않습니다.
    let unit: ManipulateType;
    switch (recurrence.frequency) {
      case 'daily':
        unit = 'day';
        break;
      case 'weekly':
        unit = 'week';
        break;
      case 'monthly':
        unit = 'month';
        break;
      case 'yearly':
        unit = 'year';
        break;
      default:
        return occurrences;
    }
    cursor = cursor.add(recurrence.interval, unit);
  }

  return occurrences;
};

/**
 * 특정 일정(반복 포함)에 대한 로컬 알림을 예약합니다.
 * @param {ScheduleData} schedule - 알림을 예약할 일정 데이터
 */
export const scheduleLocalNotification = async (schedule: ScheduleData) => {
  if (schedule.notification === 'none' || !Capacitor.isNativePlatform()) {
    return;
  }

  // 예약에 앞서, 해당 일정에 대한 기존의 모든 알림을 취소합니다.
  await cancelAllNotificationsForSchedule(schedule.id);

  const occurrences = calculateOccurrences(schedule);
  const notificationMinutes = parseInt(schedule.notification, 10);
  if (isNaN(notificationMinutes)) return;

  const notificationsToSchedule: LocalNotificationSchema[] = [];

  for (const occurrenceDate of occurrences) {
    const notificationTime = dayjs(occurrenceDate).subtract(notificationMinutes, 'minute');

    // 알림 시간이 과거인 경우는 건너뜁니다.
    if (notificationTime.isBefore(dayjs())) {
      continue;
    }

    // 각 발생 시점마다 고유한 ID를 생성합니다.
    const uniqueId = schedule.id + occurrenceDate.toISOString();
    const numericId = simpleHash(uniqueId);

    notificationsToSchedule.push({
      title: '끼리 - 일정 알림',
      body: `'${schedule.title}' 일정이 ${notificationMinutes === 0 ? '곧 시작됩니다.' : `${notificationMinutes}분 전입니다.`}`,
      id: numericId,
      schedule: {
        at: notificationTime.toDate(),
        allowWhileIdle: true, // 기기가 유휴 상태일 때도 알림 허용
      },
      extra: {
        type: 'SCHEDULE_REMINDER',
        relatedId: schedule.id, // 원래의 문자열 ID를 extra에 저장하여 나중에 사용
        start: occurrenceDate.toISOString(), // 이 알림에 해당하는 특정 발생 시점의 시작 시간
      },
    });
  }

  if (notificationsToSchedule.length > 0) {
    try {
      await LocalNotifications.schedule({
        notifications: notificationsToSchedule,
      });
    } catch (error) {
      console.error('로컬 알림 스케줄링 실패:', error);
    }
  }
};

/**
 * 예약된 로컬 알림을 취소합니다. (단일 ID 기반)
 * @param {string} scheduleId - 취소할 일정의 Firestore 문서 ID
 * @deprecated `cancelAllNotificationsForSchedule` 사용을 권장합니다.
 */
export const cancelLocalNotification = async (scheduleId: string) => {
  if (!scheduleId || !Capacitor.isNativePlatform()) return;

  // 문자열 ID를 숫자 ID로 변환하여 취소
  const numericId = simpleHash(scheduleId);

  try {
    // 이 함수는 이제 단일 알림만 취소하므로, 반복 일정의 모든 알림을 취소하지 못할 수 있습니다.
    await LocalNotifications.cancel({
      notifications: [{ id: numericId }],
    });
  } catch (error) {
    console.error('로컬 알림 취소 실패:', error);
  }
};
