import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase';

export interface PushNotificationPayload {
  userId: string;
  title: string;
  body: string;
  data?: {
    type: string;
    relatedId?: string;
    [key: string]: any;
  };
}

// Cloud Functions 인스턴스 (서울 리전)
const functions = getFunctions(app, 'asia-northeast3');

// 실제 Cloud Function 호출 메서드
const sendPushCallable = httpsCallable<PushNotificationPayload, { success: boolean }>(functions, 'sendPushNotificationToUser');

/**
 * 사용자에게 푸시 알림을 전송합니다.
 * - Cloud Function 'sendPushNotificationToUser'를 호출합니다.
 *
 * @param {PushNotificationPayload} payload - 알림 전송에 필요한 데이터 (userId, title, body 등)
 * @returns {Promise<void>}
 */
export const sendPushNotificationToUser = async (payload: PushNotificationPayload) => {
  try {
    const result = await sendPushCallable(payload);

    if (!result.data.success) {
      console.warn(`⚠️ Failed to send push to ${payload.userId}:`, result.data);
    } else {
      console.log(`✅ Push sent to ${payload.userId}`);
    }
  } catch (error) {
    console.error('❌ Error calling sendPushNotification function:', error);
  }
};
