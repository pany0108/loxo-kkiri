/* eslint-env serviceworker */
/* globals firebase */

// 이 파일은 앱이 백그라운드에 있을 때 푸시 알림을 수신하는 역할을 합니다.

// Firebase 스크립트를 가져옵니다.
importScripts('https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.6.1/firebase-messaging-compat.js');

// ⚠️ 중요: 아래 설정값을 본인의 Firebase 프로젝트 설정으로 교체해주세요.
// (src/firebase.ts 파일에 있는 firebaseConfig 객체를 복사해오세요)
const firebaseConfig = {
  apiKey: 'AIzaSyCatGVUjIC50vXsAuaCr9Qdmj-nOgN8Ei0',
  authDomain: 'super-scheduler-c99f7.web.app',
  projectId: 'super-scheduler-c99f7',
  storageBucket: 'super-scheduler-c99f7.appspot.com',
  messagingSenderId: '260376909396',
  appId: '1:260376909396:web:c423df6dcf26b60dd13fc1',
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo192.png', // 앱 아이콘 경로
    data: payload.data, // [추가] 클릭 시 이동할 URL 정보를 알림에 포함
  };

  // eslint-disable-next-line no-restricted-globals
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// [추가] 사용자가 알림을 클릭했을 때의 동작을 정의합니다.
// eslint-disable-next-line no-restricted-globals
self.addEventListener('notificationclick', (event) => {
  // 기본 알림창을 닫습니다.
  event.notification.close();

  // 알림 데이터에 포함된 URL을 엽니다. 없으면 기본 URL('/')로 이동합니다.
  const urlToOpen = event.notification.data.url || '/';

  // 이미 열려있는 앱 창이 있는지 확인하고, 있으면 해당 창으로 이동 후 포커스합니다.
  // 그렇지 않으면 새 창을 엽니다.
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        const client = clientList[0];
        client.navigate(urlToOpen);
        return client.focus();
      }
      return clients.openWindow(urlToOpen);
    }),
  );
});
