import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

admin.initializeApp();
// [진단용] 함수가 실행되는 프로젝트 ID를 명확히 확인하기 위해 로그를 추가합니다.
logger.info(`[Function Startup] Initializing for project: ${process.env.GCLOUD_PROJECT}`);

// 요청 데이터의 타입을 정의합니다.
interface RequestData {
  name: string;
  phone: string;
}

/**
 * 이름과 휴대폰 번호로 사용자를 찾아 이메일을 반환하는 Callable Function
 */
export const findUserByInfo = onCall<RequestData>(
  { region: 'asia-northeast3' }, // 서울 리전
  async (request: CallableRequest<RequestData>) => {
    const { name, phone } = request.data;

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

  try {
    // 3. FCM 토큰 가져오기
    const userRef = admin.firestore().doc(`users/${userId}`);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      logger.warn(`User document for ${userId} not found.`);
      return { success: false, reason: 'User not found' };
    }

    const fcmTokens = userDoc.data()?.fcmTokens;

    // 토큰 유효성 검사 강화 (빈 문자열 필터링)
    if (!fcmTokens || !Array.isArray(fcmTokens) || fcmTokens.length === 0) {
      logger.info(`No FCM tokens found for user ${userId}.`);
      return { success: false, reason: 'No FCM tokens' };
    }

    // 유효한 토큰만 골라내기 (혹시 모를 빈 값 제거)
    const validTokens = fcmTokens.filter((t) => t && typeof t === 'string' && t.trim() !== '');
    if (validTokens.length === 0) {
      logger.info(`All tokens were invalid for user ${userId}.`);
      return { success: false, reason: 'No valid tokens' };
    }

    // 4. [변경됨] HTTP v1 API 사용을 위한 메시지 구성
    // sendEachForMulticast는 `tokens` 배열과 `notification` 객체를 받습니다.
    const message = {
      tokens: validTokens,
      notification: {
        title: title,
        body: body,
      },
      // data는 모든 값이 string이어야 함을 보장해야 합니다.
      data: data || {},
    };

    // 5. [변경됨] 최신 메서드 sendEachForMulticast 사용
    const response = await admin.messaging().sendEachForMulticast(message);

    // 6. [변경됨] 만료되거나 유효하지 않은 토큰 정리 로직 수정
    const tokensToRemove: string[] = [];

    response.responses.forEach((res, index) => {
      if (!res.success) {
        const error = res.error;
        // 에러 코드 확인 (신규 API 에러 코드 대응)
        if (error) {
          logger.error(`Failure sending to token ${validTokens[index]}:`, error); // 디버깅용 로그
          if (error.code === 'messaging/invalid-registration-token' || error.code === 'messaging/registration-token-not-registered') {
            tokensToRemove.push(validTokens[index]);
          }
        }
      }
    });

    if (tokensToRemove.length > 0) {
      await userRef.update({ fcmTokens: FieldValue.arrayRemove(...tokensToRemove) });
      logger.info(`Removed ${tokensToRemove.length} invalid FCM tokens for user ${userId}.`);
    }

    logger.info(`Successfully sent notification to user ${userId}. Success count: ${response.successCount}, Failure count: ${response.failureCount}`);

    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (error) {
    logger.error('Error sending push notification:', error);
    // 에러 상세 내용을 포함하여 반환 (디버깅용)
    throw new HttpsError('internal', `알림 전송 중 서버 오류가 발생했습니다: ${error}`);
  }
});
