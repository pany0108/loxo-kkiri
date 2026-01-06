import { User } from 'firebase/auth';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

interface PushNotificationData {
  userId: string;
  title?: string;
  body: string;
  // Custom data for deep linking or other purposes
  data?: {
    type: string;
    relatedId?: string;
    [key: string]: any;
  };
}

/**
 * 사용자에게 푸시 알림을 전송하는 함수 (백엔드 호출 시뮬레이션).
 * 실제 구현에서는 이 함수가 Firebase Cloud Function 또는 다른 백엔드 API를 호출하여
 * 해당 사용자의 FCM 토큰을 조회하고 알림을 전송합니다.
 *
 * @param {PushNotificationData} notification - 알림 데이터 (수신자 ID, 제목, 본문, 추가 데이터)
 */
export const sendPushNotificationToUser = async (notification: PushNotificationData) => {
  console.log(`[PushNotificationService] Attempting to send push notification to user: ${notification.userId}`);
  console.log(`  Title: ${notification.title || 'Super Scheduler'}`);
  console.log(`  Body: ${notification.body}`);
  console.log(`  Data: ${JSON.stringify(notification.data)}`);

  console.log('[PushNotificationService] Push notification simulated. In a real app, this would trigger a backend service.');
};
