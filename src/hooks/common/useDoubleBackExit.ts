import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import toast from 'react-hot-toast';

export const useDoubleBackExit = () => {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let lastBackPress = 0;
    let listener: any;

    const handleBackButton = async () => {
      const now = Date.now();
      if (now - lastBackPress < 2000) {
        await App.exitApp();
      } else {
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

    const setupListener = async () => {
      listener = await App.addListener('backButton', handleBackButton);
    };
    setupListener();

    return () => {
      if (listener) listener.remove();
    };
  }, []);
};
