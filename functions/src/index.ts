import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from 'firebase-admin';

admin.initializeApp();

// 요청 데이터의 타입을 정의합니다.
interface RequestData {
  name: string;
  phone: string;
}

/**
 * 이름과 휴대폰 번호로 사용자를 찾아 이메일을 반환하는 Callable Function
 */
export const findUserByInfo = onCall<RequestData>(
  { region: "asia-northeast3" }, // 서울 리전
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
      const maskedLocal =
        localPart.length <= 3 ? `${localPart[0]}${'*'.repeat(localPart.length - 1)}` : `${localPart.substring(0, 3)}${'*'.repeat(localPart.length - 3)}`;

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
