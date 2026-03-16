import React, { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  ActionPerformed as PushActionPerformed,
  PushNotificationSchema,
  PushNotifications,
  Token,
} from '@capacitor/push-notifications';
import { ActionPerformed as LocalActionPerformed, LocalNotifications } from '@capacitor/local-notifications';
import { User } from 'firebase/auth';
import { arrayUnion, doc, setDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

import { Notification } from './useNotificationNavigation';
import { db } from '../../firebase';

/**
 * 푸시 알림 권한 요청, 토큰 관리, 알림 수신 리스너를 설정하는 커스텀 훅
 * - 네이티브 환경(iOS, Android)에서만 동작합니다.
 * - 서버 푸시(FCM)와 로컬 알림을 모두 처리합니다.
 * - 앱 실행 시 권한을 확인하고, 토큰을 Firestore에 저장하며, 알림 수신/클릭 리스너를 등록합니다.
 * @param {User | null} user - 현재 로그인된 Firebase 사용자 객체. null일 경우 훅은 동작하지 않습니다.
 * @param {function} handleNavigation - 알림 클릭 시 네비게이션을 처리하는 함수
 */
export const usePushNotification = (user: User | null, handleNavigation: (notification: Notification) => Promise<void>) => {
  useEffect(() => {
    // 네이티브 환경이 아니거나, 사용자가 로그인하지 않은 경우 실행하지 않음
    if (!Capacitor.isNativePlatform() || !user) {
      return;
    }

    const setupPushNotifications = async () => {
      try {
        // 1. FCM 토큰 등록 리스너: 토큰이 발급/갱신되면 Firestore에 저장합니다.
        const registrationListener = await PushNotifications.addListener('registration', async (token: Token) => {
          localStorage.setItem('fcm_token', token.value);
          try {
            const userRef = doc(db, 'users', user.uid);
            await setDoc(
              userRef,
              {
                fcmTokens: arrayUnion(token.value),
              },
              { merge: true },
            );
          } catch (error) {
            console.error('FCM 토큰 저장 중 오류 발생:', error);
          }
        });

        // 2. 서버 푸시 수신 리스너 (앱이 포그라운드 상태일 때)
        const receivedListener = await PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
          const notiObj: Notification = {
            id: notification.id,
            userId: user.uid,
            type: notification.data?.type || '',
            message: notification.body || '',
            relatedId: notification.data?.relatedId,
            isRead: true,
            createdAt: new Date().toISOString(),
            extraData: notification.data?.start ? { start: notification.data.start } : undefined,
          };

          toast(
            (t) =>
              React.createElement(
                'div',
                {
                  onClick: () => {
                    toast.dismiss(t.id);
                    handleNavigation(notiObj);
                  },
                  style: { cursor: 'pointer', display: 'flex', alignItems: 'center', width: '100%' },
                },
                React.createElement('span', { style: { marginRight: '8px' } }, '🔔'),
                React.createElement('span', null, notification.body || '새로운 알림이 도착했습니다.'),
              ),
            {
              duration: 4000,
              style: {
                background: '#333',
                color: '#fff',
                borderRadius: '8px',
                padding: '12px 16px',
              },
            },
          );
        });

        // 3. 서버 푸시 탭(클릭) 리스너
        const actionPerformedListener = await PushNotifications.addListener('pushNotificationActionPerformed', async (action: PushActionPerformed) => {
          const { data } = action.notification;
          if (data) {
            const notiObj: Notification = {
              id: action.notification.id,
              userId: user.uid,
              type: data.type,
              message: action.notification.body || '',
              relatedId: data.relatedId,
              isRead: true,
              createdAt: new Date().toISOString(),
              extraData: data.start ? { start: data.start } : undefined,
            };
            handleNavigation(notiObj);
          }
        });

        // 4. 로컬 알림 탭(클릭) 리스너
        const localActionPerformedListener = await LocalNotifications.addListener('localNotificationActionPerformed', async (action: LocalActionPerformed) => {
          const { notification } = action;
          const { relatedId, start, type } = notification.extra;

          if (type === 'SCHEDULE_REMINDER' && relatedId && user) {
            const notiObj: Notification = {
              id: notification.id.toString(),
              userId: user.uid,
              type: 'SCHEDULE_REMINDER',
              message: notification.body || '',
              relatedId: relatedId,
              isRead: true,
              createdAt: new Date().toISOString(),
              extraData: { start },
            };
            handleNavigation(notiObj);
          }
        });

        // 5. 권한 확인 및 등록 요청
        const permStatus = await PushNotifications.checkPermissions();
        if (permStatus.receive === 'granted') {
          // 이미 권한이 있으면 바로 등록
          await PushNotifications.register();
        }
        // 로컬 알림 권한도 요청 (푸시 권한과 별개일 수 있음)
        await LocalNotifications.requestPermissions();

        return () => {
          registrationListener.remove();
          receivedListener.remove();
          actionPerformedListener.remove();
          localActionPerformedListener.remove();
        };
      } catch (error) {
        console.error('푸시 알림 설정 실패:', error);
        return () => {}; // No-op cleanup on error
      }
    };

    const cleanupPromise = setupPushNotifications();

    // 컴포넌트가 언마운트될 때 리스너 정리
    return () => {
      cleanupPromise.then((cleanup) => cleanup && cleanup());
    };
  }, [user, handleNavigation]);
};
