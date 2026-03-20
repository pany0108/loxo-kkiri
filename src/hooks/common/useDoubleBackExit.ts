import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import toast from 'react-hot-toast';

/**
 * 안드로이드 하드웨어 뒤로가기 버튼을 두 번 눌러 앱을 종료하는 기능을 제공하는 커스텀 훅입니다.
 * - 첫 번째 클릭 시: "한 번 더 누르면 종료됩니다" 토스트 메시지 표시
 * - 두 번째 클릭 시 (2초 이내): 앱 종료
 * - Capacitor의 App 플러그인을 사용하여 네이티브 이벤트를 처리합니다.
 */
export const useDoubleBackExit = () => {
  useEffect(() => {
    // 네이티브 플랫폼(Android/iOS)이 아닌 경우(웹 등) 실행하지 않음
    if (!Capacitor.isNativePlatform()) return;

    let lastBackPress = 0;
    let listener: any;
    let isMounted = true;

    /**
     * 뒤로가기 버튼 클릭 핸들러
     * - 현재 시간과 마지막 클릭 시간을 비교하여 2초 이내 재클릭 여부를 판단합니다.
     */
    const handleBackButton = async () => {
      const now = Date.now();
      // 2초(2000ms) 이내에 다시 눌렀을 경우 앱 종료
      if (now - lastBackPress < 2000) {
        App.exitApp();
      } else {
        // 첫 번째 클릭이거나 2초가 지났을 경우
        lastBackPress = now;
        toast('한 번 더 뒤로가기를 누르면 종료됩니다.', {
          id: 'back-press-exit',
          duration: 2000,
          style: {
            borderRadius: '24px',
            background: 'rgba(0, 0, 0, 0.8)',
            color: '#fff',
          },
        });
      }
    };

    // 리스너 등록
    const setupListener = async () => {
      listener = await App.addListener('backButton', handleBackButton);
      if (!isMounted && listener) {
        listener.remove();
      }
    };
    setupListener();

    // 컴포넌트 언마운트 시 리스너 제거
    return () => {
      isMounted = false;
      if (listener) listener.remove();
    };
  }, []);
};
