import { useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { doc, updateDoc, arrayUnion, getFirestore } from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';

export const useFcmToken = (userId: string | null) => {
  // Firestore 인스턴스 가져오기
  const db = getFirestore();

  useEffect(() => {
    // 1. 웹이 아니거나 userId가 없으면 실행하지 않음
    if (Capacitor.getPlatform() === 'web' || !userId) return;

    // 리스너 핸들(Promise)을 저장할 변수
    const registrationListener = PushNotifications.addListener('registration', async (token) => {
      console.log('새로운 FCM 토큰 발급됨:', token.value);
      console.log('현재 토큰을 저장하려는 User ID:', userId);

      if (userId) {
        try {
          const userRef = doc(db, 'users', userId);
          // 기존 배열에 새 토큰 추가 (중복 방지)
          await updateDoc(userRef, {
            fcmTokens: arrayUnion(token.value),
          });
          console.log(`Firestore 경로: users/${userId} 에 저장 완료`);
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
        console.error('푸시 알림 권한이 거부되었습니다.');
        return;
      }

      // FCM 서버에 기기 등록 요청
      await PushNotifications.register();
    };

    // 실행
    registerPush();

    // 정리(Cleanup) 함수
    return () => {
      // [수정 포인트] addListener는 Promise를 반환하므로, .then()을 통해 핸들을 받아 제거해야 합니다.
      registrationListener.then((handle) => handle.remove());
      errorListener.then((handle) => handle.remove());
    };

    // [수정 포인트] 의존성 배열에 'db' 추가 (ESLint 경고 해결)
  }, [userId, db]);
};
