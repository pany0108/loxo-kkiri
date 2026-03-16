import { Capacitor } from '@capacitor/core';
import { LocalNotifications, ScheduleOptions } from '@capacitor/local-notifications';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';

/**
 * 로컬 알림 스케줄링을 위한 일정 데이터 인터페이스
 * @property {string} id - 일정의 고유 ID
 * @property {string} title - 일정 제목
 * @property {string} start - 일정 시작 시간 (ISO 8601 형식)
 * @property {string} notification - 알림 시간 설정 ('none', '5', '10' 등 분 단위)
 */
interface AppSchedule {
  id: string;
  title: string;
  start: string;
  notification: string;
}

/**
 * 문자열 ID를 기반으로 고유한 정수 알림 ID를 생성합니다.
 * Android/iOS에서 알림 ID는 정수여야 하므로, 문자열인 Firestore 문서 ID를 일관된 정수 값으로 변환하기 위해 사용됩니다.
 * @param {string} scheduleId - 일정의 고유 ID 문자열
 * @returns {number} 32비트 정수형 알림 ID
 */
const getNotificationId = (scheduleId: string): number => {
  let hash = 0;
  for (let i = 0; i < scheduleId.length; i++) {
    const char = scheduleId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // 32비트 정수로 변환
  }
  return Math.abs(hash); // ID는 양수여야 합니다.
};

/**
 * 주어진 일정에 대해 로컬 알림을 예약합니다.
 * 단일 일정에 대해서만 동작하며, 반복 일정은 서버 푸시로 처리됩니다.
 * @param schedule - 알림을 예약할 일정 객체
 */
export const scheduleLocalNotification = async (schedule: AppSchedule): Promise<void> => {
  if (!Capacitor.isNativePlatform() || schedule.notification === 'none') {
    return;
  }

  try {
    // 1. 알림 권한 확인 및 요청
    const permissions = await LocalNotifications.checkPermissions();
    if (permissions.display !== 'granted') {
      const request = await LocalNotifications.requestPermissions();
      if (request.display !== 'granted') {
        toast.error('알림 권한이 없어, 일정 알림을 받을 수 없습니다.');
        return;
      }
    }

    // 2. 알림 시간 계산
    const notificationOffset = parseInt(schedule.notification, 10);
    if (isNaN(notificationOffset)) return;

    const notificationTime = dayjs(schedule.start).subtract(notificationOffset, 'minutes');

    // 이미 지난 시간에는 알림을 예약하지 않습니다.
    if (notificationTime.isBefore(dayjs())) return;

    // 3. 알림 옵션 구성 및 예약
    const options: ScheduleOptions = {
      notifications: [
        {
          id: getNotificationId(schedule.id),
          title: '다가오는 일정 🐘',
          body: `'${schedule.title}' 일정이 ${notificationOffset === 0 ? '곧 시작됩니다.' : `${notificationOffset}분 후에 시작됩니다.`}`,
          schedule: { at: notificationTime.toDate(), allowWhileIdle: true },
          extra: {
            type: 'SCHEDULE_REMINDER',
            relatedId: schedule.id,
            start: schedule.start,
          },
          smallIcon: 'ic_stat_name', // Android: res/drawable 폴더에 'ic_stat_name.png' 아이콘 파일이 필요합니다.
        },
      ],
    };

    await LocalNotifications.schedule(options);
  } catch (error) {
    console.error('로컬 알림 예약 중 오류 발생:', error);
  }
};

/**
 * 예약된 로컬 알림을 취소합니다.
 * @param scheduleId - 알림을 취소할 일정의 ID
 */
export const cancelLocalNotification = async (scheduleId: string): Promise<void> => {
  if (!Capacitor.isNativePlatform() || !scheduleId) return;

  try {
    await LocalNotifications.cancel({ notifications: [{ id: getNotificationId(scheduleId) }] });
  } catch (error) {
    console.error('로컬 알림 취소 중 오류 발생:', error);
  }
};