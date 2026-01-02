import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { app, db } from '../firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import toast from 'react-hot-toast';
import React from 'react';
import { NavigateFunction } from 'react-router-dom';

export const setupPushNotifications = async (userId: string, navigate: NavigateFunction) => {
  // 브라우저가 알림을 지원하는지, 이미 권한을 요청했는지 확인합니다.
  if (!('Notification' in window) || (window as any).pushNotificationInitialized) {
    return;
  }
  (window as any).pushNotificationInitialized = true;

  const messaging = getMessaging(app);

  // 이미 권한이 부여된 경우, 토큰을 저장합니다.
  if (Notification.permission === 'granted') {
    saveToken(messaging, userId);
  }
  // 권한이 거부되지 않았다면, 권한을 요청합니다.
  else if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      saveToken(messaging, userId);
    }
  }

  // 앱이 활성화된 상태(Foreground)에서 메시지를 수신했을 때 처리합니다.
  onMessage(messaging, (payload) => {
    console.log('Foreground message received. ', payload);
    const url = payload.data?.url;

    toast.custom(
      (t) => (
        <div
          className={`${
            t.visible ? 'animate-enter' : 'animate-leave'
          } pointer-events-auto flex w-full max-w-md rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 dark:bg-gray-800 dark:ring-white/10`}
        >
          <div
            className="w-0 flex-1 p-4 cursor-pointer"
            onClick={() => {
              if (url) {
                // URL 객체를 사용하여 전체 URL에서 경로(pathname)만 추출합니다.
                // 이렇게 하면 앱 내에서 페이지 이동(SPA)이 가능합니다.
                navigate(new URL(url).pathname);
              }
              toast.dismiss(t.id);
            }}
          >
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                <img className="h-10 w-10 rounded-full" src="/logo192.png" alt="" />
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-bold text-gray-900 dark:text-white">{payload.notification?.title}</p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{payload.notification?.body}</p>
              </div>
            </div>
          </div>
          <div className="flex border-l border-gray-200 dark:border-gray-700">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="flex w-full items-center justify-center rounded-none rounded-r-lg border border-transparent p-4 text-sm font-medium text-blue-600 hover:text-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-blue-400"
            >
              닫기
            </button>
          </div>
        </div>
      ),
      { position: 'top-center' },
    );
  });
};

const saveToken = async (messaging: Messaging, userId: string) => {
  try {
    // ⚠️ 중요: 아래 vapidKey를 본인의 키로 교체해주세요.
    const currentToken = await getToken(messaging, {
      vapidKey: 'BCwIpE956SeWD41qfwTZyIjFofP6qfMDwl1DDS9xhYBargKzdPAxTO4C5uFX88gA7YugrJqswc2JJ0nyqJ-N97Q',
    });

    if (currentToken) {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { fcmTokens: arrayUnion(currentToken) });
    }
  } catch (err) {
    console.error('An error occurred while retrieving token. ', err);
  }
};
