import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as logger from 'firebase-functions/logger';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import * as RRuleModule from 'rrule';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

admin.initializeApp();
dayjs.extend(utc);

/**
 * 이름과 휴대폰 번호로 사용자를 찾아 이메일을 반환하는 Callable Function
 */
export const findUserByInfo = onCall<RequestData>(
  { region: 'asia-northeast3' }, // 서울 리전
  async (request) => {
    const { name, phone } = request.data as { name: string; phone: string };

    // 1. 입력 데이터 유효성 검사
    if (!name || typeof name !== 'string' || !phone || typeof phone !== 'string') {
      throw new HttpsError('invalid-argument', '이름과 휴대폰 번호를 올바르게 입력해주세요.');
    }

    try {
      // 2. Firestore에서 사용자 검색 (관리자 권한)
      const usersRef = admin.firestore().collection('users');
      const q = usersRef.where('name', '==', name.trim()).where('phone', '==', phone.replace(/[^\d]/g, ''));

      const querySnapshot = await q.get();

      if (querySnapshot.empty) {
        // 사용자를 찾지 못해도 에러를 반환하지 않고, '찾지 못함' 상태를 반환하여 보안을 강화합니다.
        return { found: false };
      }

      const userDoc = querySnapshot.docs[0].data();
      const userEmail = userDoc.email;

      if (!userEmail) {
        return { found: false };
      }

      // 3. 이메일 마스킹 처리
      const [localPart, domain] = userEmail.split('@');
      const maskedLocal = localPart.length <= 3 ? `${localPart[0]}${'*'.repeat(localPart.length - 1)}` : `${localPart.substring(0, 3)}${'*'.repeat(localPart.length - 3)}`;

      // 4. 마스킹된 이메일과 전체 이메일을 함께 반환
      return {
        found: true,
        full: userEmail,
        masked: `${maskedLocal}@${domain}`,
      };
    } catch (error) {
      logger.error('Error finding user:', error);
      throw new HttpsError('internal', '사용자 정보를 찾는 중 서버에서 오류가 발생했습니다.');
    }
  },
);

/**
 * 푸시 알림 전송을 위한 데이터 인터페이스
 */
interface PushNotificationPayload {
  userId: string;
  title: string;
  body: string;
  data?: { [key: string]: string };
}

/**
 * [내부 함수] 특정 사용자에게 푸시 알림을 보내는 핵심 로직
 * @param {string} userId - 알림을 받을 사용자 ID
 * @param {string} title - 알림 제목
 * @param {string} body - 알림 내용
 * @param {object} data - 알림과 함께 보낼 추가 데이터
 * @returns {Promise<object>} 전송 결과
 */
async function _sendPushNotificationInternal(userId: string, title: string, body: string, data?: { [key: string]: string }) {
  try {
    const userRef = admin.firestore().doc(`users/${userId}`);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      logger.warn(`User document for ${userId} not found.`);
      return { success: false, reason: 'User not found' };
    }

    const fcmTokens = userDoc.data()?.fcmTokens;
    const validTokens = Array.isArray(fcmTokens) ? fcmTokens.filter((t) => t && typeof t === 'string' && t.trim() !== '') : [];

    if (validTokens.length === 0) {
      logger.info(`No valid FCM tokens found for user ${userId}.`);
      return { success: false, reason: 'No valid tokens' };
    }

    const message = {
      tokens: validTokens,
      notification: { title, body },
      data: data || {},
      android: {
        notification: {
          sound: 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
          },
        },
      },
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    const tokensToRemove: string[] = [];

    response.responses.forEach((res, index) => {
      if (!res.success) {
        const error = res.error;
        if (error && (error.code === 'messaging/invalid-registration-token' || error.code === 'messaging/registration-token-not-registered')) {
          tokensToRemove.push(validTokens[index]);
        }
      }
    });

    if (tokensToRemove.length > 0) {
      await userRef.update({ fcmTokens: FieldValue.arrayRemove(...tokensToRemove) });
    }

    return { success: true, successCount: response.successCount, failureCount: response.failureCount };
  } catch (error) {
    logger.error(`Error sending push notification to ${userId}:`, error);
    throw new HttpsError('internal', `알림 전송 중 서버 오류가 발생했습니다: ${error}`);
  }
}

/**
 * 특정 사용자에게 푸시 알림을 보내는 Callable Function
 */
export const sendPushNotificationToUser = onCall<PushNotificationPayload>({ region: 'asia-northeast3' }, async (request: CallableRequest<PushNotificationPayload>) => {
  // 1. 함수 호출자가 인증되었는지 확인합니다.
  if (!request.auth) {
    throw new HttpsError('unauthenticated', '인증된 사용자만 함수를 호출할 수 있습니다.');
  }

  const { userId, title, body, data } = request.data;

  // 2. 필수 데이터 확인
  if (!userId || !title || !body) {
    throw new HttpsError('invalid-argument', 'userId, title, body는 필수입니다.');
  }

  // 내부 핵심 로직 호출
  return await _sendPushNotificationInternal(userId, title, body, data);
});

/**
 * Firestore에 저장된 반복 설정 데이터 구조
 */
interface RecurrenceSettings {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'none';
  interval?: number;
  endType?: 'date' | 'count';
  endDate?: string;
  endCount?: number;
  daysOfWeek?: string[];
  exceptions?: string[];
}

/**
 * Firestore의 `schedules` 컬렉션 문서 데이터 구조
 */
interface ScheduleDocument {
  id: string;
  title: string;
  start: string;
  notification: string;
  attendees: string[];
  recurrence: RecurrenceSettings;
}

/**
 * [스케줄링 함수] 5분마다 실행되어 반복 일정에 대한 알림을 보냅니다.
 * - Cloud Scheduler에 의해 트리거됩니다.
 * - 'none'이 아닌 반복 설정과 알림 설정이 있는 일정을 조회합니다.
 * - `rrule`을 사용해 다음 5분 내에 알림을 보내야 할 인스턴스를 계산합니다.
 * - 중복 전송을 방지하기 위해 `sentRecurringNotifications` 컬렉션에 발송 기록을 남깁니다.
 * @param {ScheduledEvent} event - 스케줄러 이벤트 객체
 */
export const checkUpcomingSchedules = onSchedule(
  { schedule: 'every 5 minutes', timeZone: 'UTC', region: 'asia-northeast3' },
  async (event) => {
    logger.info('Running checkUpcomingSchedules job.', { scheduleTime: event.scheduleTime });

    const now = dayjs.utc();
    const windowStart = now;
    const windowEnd = now.add(5, 'minutes');

    // 1. 알림이 필요한 반복 일정 조회
    const schedulesRef = admin.firestore().collection('schedules');
    const q = schedulesRef.where('recurrence.frequency', '!=', 'none').where('notification', '!=', 'none');

    const querySnapshot = await q.get();

    if (querySnapshot.empty) {
      logger.info('No recurring schedules with notifications found.');
      return;
    }

    // 2. rrule 계산을 위한 상수 및 맵 정의
    const freqMap: { [key: string]: RRuleModule.Frequency } = { daily: RRuleModule.RRule.DAILY, weekly: RRuleModule.RRule.WEEKLY, monthly: RRuleModule.RRule.MONTHLY, yearly: RRuleModule.RRule.YEARLY };
    const dayMap: { [key: string]: RRuleModule.Weekday } = { SU: RRuleModule.RRule.SU, MO: RRuleModule.RRule.MO, TU: RRuleModule.RRule.TU, WE: RRuleModule.RRule.WE, TH: RRuleModule.RRule.TH, FR: RRuleModule.RRule.FR, SA: RRuleModule.RRule.SA };

    const promises: Promise<any>[] = [];

    for (const doc of querySnapshot.docs) {
      const schedule = { id: doc.id, ...doc.data() } as ScheduleDocument;
      const notificationOffset = parseInt(schedule.notification, 10);
      if (isNaN(notificationOffset)) continue;

      try {
        // 3. rruleSet을 사용하여 반복 규칙 정의
        const rruleSet = new RRuleModule.RRuleSet();
        const ruleOptions: Partial<RRuleModule.Options> = { // Corrected: RRuleModule.Options
          freq: freqMap[schedule.recurrence.frequency as keyof typeof freqMap],
          interval: schedule.recurrence.interval || 1,
          dtstart: dayjs.utc(schedule.start).toDate(),
        };

        if (schedule.recurrence.endType === 'date' && schedule.recurrence.endDate) {
          ruleOptions.until = dayjs.utc(schedule.recurrence.endDate).endOf('day').toDate(); // dayjs is fine
        }
        if (schedule.recurrence.endType === 'count' && schedule.recurrence.endCount) {
          ruleOptions.count = schedule.recurrence.endCount;
        }
        if (schedule.recurrence.frequency === 'weekly' && schedule.recurrence.daysOfWeek && schedule.recurrence.daysOfWeek.length > 0) {
          ruleOptions.byweekday = schedule.recurrence.daysOfWeek.map((d: string) => dayMap[d as keyof typeof dayMap]);
        }

        rruleSet.rrule(new RRuleModule.RRule(ruleOptions)); // Use RRuleModule.RRule for constructor

        if (schedule.recurrence.exceptions && schedule.recurrence.exceptions.length > 0) {
          schedule.recurrence.exceptions.forEach((ex: string) => rruleSet.exdate(dayjs.utc(ex).toDate()));
        }

        // 4. 다음 5분(+알림 오프셋) 내에 발생할 일정 인스턴스 계산
        const searchWindowStart = windowStart.subtract(notificationOffset, 'minutes').subtract(1, 'minute').toDate();
        const searchWindowEnd = windowEnd.add(notificationOffset, 'minutes').add(1, 'minute').toDate();

        const occurrences = rruleSet.between(searchWindowStart, searchWindowEnd);

        for (const occurrence of occurrences) {
          const occurrenceTime = dayjs.utc(occurrence);
          const notificationTime = occurrenceTime.subtract(notificationOffset, 'minutes');

          // 5. 계산된 알림 시간이 현재 작업 창(다음 5분) 내에 있는지 확인
          if (notificationTime.isAfter(windowStart) && notificationTime.isBefore(windowEnd)) {
            // 중복 발송 방지를 위한 고유 ID 생성 (일정ID + 발생시간)
            const notificationId = `${schedule.id}_${occurrenceTime.toISOString()}`;
            const sentNotifRef = admin.firestore().collection('sentRecurringNotifications').doc(notificationId);

            const promise = sentNotifRef.get().then(async (sentDoc) => {
              // 6. 이미 알림을 보냈는지 확인
              if (sentDoc.exists) return; // 이미 보냈으면 건너뛰기

              logger.info(`Sending notification for schedule '${schedule.title}' at ${notificationTime.toISOString()}`);
              const body = `'${schedule.title}' 일정이 ${notificationOffset === 0 ? '곧 시작됩니다.' : `${notificationOffset}분 후에 시작됩니다.`}`;

              const sendPromises = (schedule.attendees || []).map((userId: string) =>
                _sendPushNotificationInternal(userId, '다가오는 일정 🐘', body, {
                  type: 'SCHEDULE_REMINDER',
                  relatedId: schedule.id,
                  start: occurrenceTime.toISOString(), // 반복 인스턴스의 특정 시작 시간 전달
                }),
              );

              await Promise.all(sendPromises);
              // 7. 알림 발송 기록 저장
              await sentNotifRef.set({ sentAt: FieldValue.serverTimestamp() });
            });
            promises.push(promise);
          }
        }
      } catch (error) {
        logger.error(`Error processing schedule ${schedule.id}:`, error);
      }
    }

    await Promise.all(promises);
    logger.info(`Finished checkUpcomingSchedules job. Processed ${promises.length} notifications.`);
    return;
  },
);
