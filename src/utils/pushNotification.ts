import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase';

// 인터페이스 정의 통합
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
 * 실제 환경에서는 Cloud Function을 호출하고, 개발 설정에 따라 콘솔 로그로 대체할 수도 있습니다.
 */
export const sendPushNotificationToUser = async (payload: PushNotificationPayload) => {
  // 개발 모드이거나 로컬 테스트인 경우 콘솔로만 확인하고 싶다면 아래 주석을 해제하세요.
  // if (process.env.NODE_ENV === 'development') {
  //   console.log('📢 [DEV: Push Simulated]', payload);
  //   return;
  // }

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
