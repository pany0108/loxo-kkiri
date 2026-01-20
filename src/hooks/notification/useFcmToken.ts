import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { arrayUnion, doc, getFirestore, updateDoc } from 'firebase/firestore';

/**
 * FCM 토큰 발급 및 저장을 처리하는 커스텀 훅
 * - 모바일 환경에서만 동작하며, 발급된 토큰을 Firestore 사용자 문서에 저장합니다.
 * @param {string | null} userId - 현재 사용자 ID
 */
export const useFcmToken = (userId: string | null) => {
  // Firestore 인스턴스 가져오기
  const db = getFirestore();

  useEffect(() => {
    // 1. 웹이 아니거나 userId가 없으면 실행하지 않음
    if (Capacitor.getPlatform() === 'web' || !userId) return;

    // 리스너 핸들(Promise)을 저장할 변수
    const registrationListener = PushNotifications.addListener('registration', async (token) => {
      if (userId) {
        try {
          const userRef = doc(db, 'users', userId);
          // 기존 배열에 새 토큰 추가 (중복 방지)
          await updateDoc(userRef, {
            fcmTokens: arrayUnion(token.value),
          });
        } catch (error) {
          console.error('토큰 저장 실패:', error);
        }
      }
    });

    const errorListener = PushNotifications.addListener('registrationError', (error) => {
      console.error('FCM 등록 에러:', error);
    });

    const registerPush = async () => {
      // 권한 요청
      let permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        return;
      }

      // FCM 서버에 기기 등록 요청
      await PushNotifications.register();
    };

    // 실행
    registerPush();

    // 정리(Cleanup) 함수
    return () => {
      registrationListener.then((handle) => handle.remove());
      errorListener.then((handle) => handle.remove());
    };
  }, [userId, db]);
};
