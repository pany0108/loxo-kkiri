import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase';

interface PushNotificationPayload {
  userId: string;
  title: string;
  body: string;
  data?: { [key: string]: any };
}

// 함수가 배포된 'asia-northeast3'(서울) 리전을 명시적으로 지정합니다.
const functions = getFunctions(app, 'asia-northeast3');

// [FIX] Cloud Function을 호출하는 함수를 생성합니다.
// Firebase 콘솔에 배포된 함수 이름('sendPushNotificationToUser')과
// 여기서 호출하는 함수 이름이 일치해야 합니다.
const sendPush = httpsCallable<PushNotificationPayload, { success: boolean }>(functions, 'sendPushNotificationToUser');

/**
 * 특정 사용자에게 푸시 알림을 보내는 유틸리티 함수입니다.
 * @param payload - 푸시 알림에 필요한 데이터 (userId, title, body, data)
 */
export const sendPushNotificationToUser = async (payload: PushNotificationPayload) => {
  try {
    const result = await sendPush(payload);
    if (!result.data.success) {
      console.warn(`Failed to send push notification to user ${payload.userId}.`, result.data);
    }
  } catch (error) {
    console.error('Error calling sendPushNotification function:', error);
  }
};
