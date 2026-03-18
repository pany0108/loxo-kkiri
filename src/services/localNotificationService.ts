import { LocalNotifications } from '@capacitor/local-notifications';
import dayjs from 'dayjs';

// 반복 일정 처리를 위해 고유 ID 생성 (문자열 + 인덱스 조합)
const generateNumericId = (strId: string, index: number = 0): number => {
  let hash = 0;
  const str = `${strId}_${index}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash = hash & hash; // 32-bit integer
  }
  return Math.abs(hash);
};

export interface ScheduleLocalNotiParams {
  id: string;
  title: string;
  start: string;
  notification?: string; // 'none', '5', '10', '30' 등
  recurrence?: any; // 반복 설정 객체
  [key: string]: any; // 기타 여분 데이터 허용
}

/** 특정 일정의 모든 로컬 알림(반복 포함)을 일괄 취소합니다. */
export const cancelAllNotificationsForSchedule = async (scheduleId: string) => {
  try {
    const pending = await LocalNotifications.getPending();
    // extra 데이터에 저장된 scheduleId를 비교하여 이 일정에 속한 모든 알림을 찾습니다.
    const toCancel = pending.notifications.filter(n => n.extra?.scheduleId === scheduleId);
    
    if (toCancel.length > 0) {
      await LocalNotifications.cancel({ notifications: toCancel });
    }
  } catch (e) {
    console.error('로컬 알림 취소 중 에러 발생:', e);
  }
};

/** 일정을 등록하거나 수정할 때 알림을 스케줄링합니다. */
export const scheduleLocalNotification = async (params: ScheduleLocalNotiParams) => {
  const { id, title, start, notification, recurrence } = params;

  // 1. 일정 수정이나 '알림 끄기'를 대비해 기존에 예약된 이 일정의 알림을 모두 초기화합니다.
  await cancelAllNotificationsForSchedule(id);

  // 2. 알림 설정이 없거나 'none'(사용안함)으로 변경된 경우 여기서 종료합니다.
  if (!notification || notification === 'none') return;

  // 3. 권한 체크 및 요청
  let permStatus = await LocalNotifications.checkPermissions();
  if (permStatus.display !== 'granted') {
    permStatus = await LocalNotifications.requestPermissions();
    if (permStatus.display !== 'granted') return;
  }

  const offsetMins = parseInt(notification, 10);
  if (isNaN(offsetMins)) return;

  const bodyText = offsetMins === 0 
    ? '일정이 시작되었습니다.' 
    : `일정 시작 ${offsetMins >= 60 ? offsetMins / 60 + '시간' : offsetMins + '분'} 전입니다.`;

  const notificationsToSchedule = [];

  // 4. 반복 일정인 경우 (가장 확실한 방법인 다수의 미래 날짜를 계산해 개별 예약)
  if (recurrence && recurrence.frequency !== 'none') {
    let currentDate = dayjs(start);
    const maxInstances = 20; // 향후 최대 20개의 알림을 미리 예약해둡니다.
    let count = 0;

    while (count < maxInstances) {
      const notifyTime = currentDate.subtract(offsetMins, 'minute').toDate();
      
      // 지나간 시간이 아니라면 예약 목록에 추가
      if (notifyTime.getTime() > Date.now()) {
        notificationsToSchedule.push({
          id: generateNumericId(id, count),
          title: title,
          body: bodyText,
          schedule: { at: notifyTime },
          smallIcon: 'ic_stat_logo', // 1단계에서 저장한 아이콘 파일명 (확장자 제외)
          iconColor: '#007AFF', // 알림 아이콘에 입힐 테마 컬러 (선택 사항)
          extra: { scheduleId: id, type: 'SCHEDULE_ALARM', start: currentDate.toISOString() },
        });
      }

      // 다음 반복 날짜 계산
      if (recurrence.frequency === 'daily') {
        currentDate = currentDate.add(recurrence.interval || 1, 'day');
      } else if (recurrence.frequency === 'weekly') {
        currentDate = currentDate.add(recurrence.interval || 1, 'week');
      } else if (recurrence.frequency === 'monthly') {
        currentDate = currentDate.add(recurrence.interval || 1, 'month');
      } else if (recurrence.frequency === 'yearly') {
        currentDate = currentDate.add(recurrence.interval || 1, 'year');
      } else {
        break;
      }
      count++;

      // 반복 종료 조건 처리
      if (recurrence.endType === 'date' && recurrence.endDate && currentDate.isAfter(dayjs(recurrence.endDate))) {
        break;
      }
      if (recurrence.endType === 'count' && recurrence.endCount && count >= recurrence.endCount) {
        break;
      }
    }
  } else {
    // 5. 단일 일정인 경우
    const notifyTime = dayjs(start).subtract(offsetMins, 'minute').toDate();
    if (notifyTime.getTime() > Date.now()) {
      notificationsToSchedule.push({
        id: generateNumericId(id, 0),
        title: title,
        body: bodyText,
        schedule: { at: notifyTime },
        smallIcon: 'ic_stat_logo',
        iconColor: '#007AFF',
        extra: { scheduleId: id, type: 'SCHEDULE_ALARM', start: start },
      });
    }
  }

  // 계산된 알림들을 기기에 등록합니다.
  if (notificationsToSchedule.length > 0) {
    await LocalNotifications.schedule({ notifications: notificationsToSchedule });
  }
};