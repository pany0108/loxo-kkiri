import React, { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { ActionPerformed, PushNotificationSchema, PushNotifications, Token } from '@capacitor/push-notifications';
import { User } from 'firebase/auth';
import { arrayUnion, doc, setDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { App } from '@capacitor/app'; // Import App for openSettings
import { Dialog, ConfirmResult } from '@capacitor/dialog';
import { LocalNotifications, ActionPerformed as LocalActionPerformed } from '@capacitor/local-notifications';
import { Notification } from './useNotificationNavigation';
import { db } from '../../firebase';

/**
 * 푸시 알림 권한 요청, 토큰 관리, 알림 수신 리스너를 설정하는 커스텀 훅
 * - 앱 실행 시 푸시 알림 설정을 초기화하고 리스너를 등록합니다.
 * @param {User | null} user - 현재 로그인된 Firebase 사용자 객체
 * @param {function} handleNavigation - 알림 클릭 시 네비게이션 처리 함수
 */
export const usePushNotification = (user: User | null, handleNavigation: (notification: Notification) => Promise<void>) => {
  useEffect(() => {
    // 네이티브 환경이 아니거나, 사용자가 로그인하지 않은 경우 실행하지 않음
    if (!Capacitor.isNativePlatform() || !user) {
      return;
    }

    const setupPushNotifications = async () => {
      try {
        // 1. 기기 등록 성공 시 토큰을 받아오는 리스너
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

        // 2. 앱이 포그라운드 상태일 때 알림을 수신하는 리스너
        const receivedListener = await PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
          const notiObj: Notification = {
            id: notification.id,
            userId: user.uid,
            type: notification.data?.type || '',
            message: notification.body || '',
            relatedId: notification.data?.relatedId,
            isRead: true,
            createdAt: new Date().toISOString(),
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

        // 3. 사용자가 알림을 탭했을 때 실행되는 리스너
        const actionPerformedListener = await PushNotifications.addListener('pushNotificationActionPerformed', async (action: ActionPerformed) => {
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
            };
            handleNavigation(notiObj);
          }
        });

        // 4. 로컬 알림 탭(클릭) 리스너
        const localActionPerformedListener = await LocalNotifications.addListener('localNotificationActionPerformed', async (action: LocalActionPerformed) => {
          const { notification } = action;
          const { relatedId, start, type } = notification.extra;

          if (type === 'SCHEDULE_REMINDER' && relatedId && user) {
            const notiObj: any = {
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

        // 5. 앱이 완전히 종료된 상태에서 '푸시 알림'을 탭하여 실행된 경우 처리
        const handleLaunchNotification = async () => {
          const launchNotif = await (PushNotifications as any)
            .getLaunchNotification()
            .catch((err: any) => console.log('getLaunchNotification ERROR: ', err));
          if (launchNotif && launchNotif.notification?.data) {
            const { data } = launchNotif.notification;
            const notiObj: any = {
              id: launchNotif.notification.id,
              userId: user.uid,
              type: data.type,
              message: launchNotif.notification.body || '',
              relatedId: data.relatedId,
              isRead: true,
              createdAt: new Date().toISOString(),
              extraData: data.start ? { start: data.start } : undefined,
            };
            // 앱이 막 시작되었을 때 네비게이션이 준비될 시간을 주기 위해 약간의 지연을 줍니다.
            setTimeout(() => handleNavigation(notiObj), 500);
          }
        };

        handleLaunchNotification();

        // 6. 푸시 알림 권한 확인 및 등록 요청
        let permStatus = await PushNotifications.checkPermissions();

        if (permStatus.receive === 'prompt') {
          // 권한이 없는 경우, 사용자에게 요청합니다.
          permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive === 'denied') {
          // 사용자가 명시적으로 권한을 거부한 경우
          await Dialog.confirm({
            title: '알림 권한 필요',
            message: '일정 알림을 받으려면 앱 설정에서 알림 권한을 허용해야 합니다. 지금 설정으로 이동하시겠습니까?',
            okButtonTitle: '이동',
            cancelButtonTitle: '취소',
          }).then(async (result: ConfirmResult) => {
            if (result.value) {
              await (App as any).openSettings();
            } else {
              toast('알림 권한이 없어 일부 기능을 사용하지 못할 수 있습니다.', { icon: '⚠️' });
            }
          });
        } else if (permStatus.receive === 'granted') {
          // 권한이 있거나 사용자가 허용한 경우에만 FCM에 기기를 등록합니다.
          await PushNotifications.register();
        }

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
