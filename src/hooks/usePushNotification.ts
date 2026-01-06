import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, ActionPerformed, PushNotificationSchema } from '@capacitor/push-notifications';
import { doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import toast from 'react-hot-toast';
import { User } from 'firebase/auth';

/**
 * 푸시 알림 권한 요청, 토큰 관리, 알림 수신 리스너를 설정하는 커스텀 훅입니다.
 * @param {User | null} user - 현재 로그인된 Firebase 사용자 객체
 */
export const usePushNotification = (user: User | null) => {
  useEffect(() => {
    // 네이티브 환경이 아니거나, 사용자가 로그인하지 않은 경우 실행하지 않음
    if (!Capacitor.isNativePlatform() || !user) {
      return;
    }

    const setupPushNotifications = async () => {
      try {
        // 1. 푸시 알림 권한 상태 확인 및 요청
        let permStatus = await PushNotifications.checkPermissions();

        if (permStatus.receive === 'prompt') {
          permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== 'granted') {
          console.log('푸시 알림 권한이 거부되었습니다.');
          return () => {}; // No-op cleanup
        }

        // 2. FCM(Firebase Cloud Messaging)에 기기 등록
        await PushNotifications.register();

        // 3. 리스너 등록
        const registrationListener = await PushNotifications.addListener('registration', async (token: Token) => {
          console.log('내 기기 토큰:', token.value);
          try {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
              fcmTokens: arrayUnion(token.value),
            });
            console.log('FCM 토큰이 Firestore에 저장되었습니다.');
          } catch (error) {
            console.error('FCM 토큰 저장 중 오류 발생:', error);
          }
        });

        const receivedListener = await PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
          console.log('알림 도착 (포그라운드):', notification);
          toast.success(notification.body || '새로운 알림이 도착했습니다.', {
            icon: '🔔',
            duration: 4000,
          });
        });

        const actionPerformedListener = await PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
          console.log('알림 탭:', action);
          // TODO: 알림 데이터(action.notification.data)를 기반으로 특정 페이지로 이동하는 로직 구현
        });

        // 리스너 정리 함수 반환
        return () => {
          registrationListener.remove();
          receivedListener.remove();
          actionPerformedListener.remove();
        };
      } catch (error) {
        console.error('푸시 알림 설정 실패:', error);
        return () => {}; // No-op cleanup on error
      }
    };

    const cleanupPromise = setupPushNotifications();

    // 컴포넌트가 언마운트될 때 리스너 정리
    return () => {
      cleanupPromise.then((cleanup) => cleanup());
    };
  }, [user]); // user 객체가 변경될 때(로그인/로그아웃) 이펙트를 다시 실행
};
