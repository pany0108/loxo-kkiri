import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { NavigationBar } from '@hugotomazi/capacitor-navigation-bar';

export const useSystemUI = () => {
  useEffect(() => {
    const setSystemUI = async (isDark: boolean) => {
      if (!Capacitor.isNativePlatform()) return;
      try {
        if (isDark) {
          const darkBgColor = '#030712';
          await StatusBar.setStyle({ style: Style.Dark });
          await StatusBar.setBackgroundColor({ color: darkBgColor });
          if (Capacitor.getPlatform() === 'android') {
            await NavigationBar.setColor({ color: darkBgColor, darkButtons: false });
          }
        } else {
          const lightBgColor = '#f9fafb';
          await StatusBar.setStyle({ style: Style.Light });
          await StatusBar.setBackgroundColor({ color: lightBgColor });
          if (Capacitor.getPlatform() === 'android') {
            await NavigationBar.setColor({ color: lightBgColor, darkButtons: true });
          }
        }
      } catch (error) {
        console.error('Failed to set system UI', error);
      }
    };

    const observer = new MutationObserver(() => {
      const isDarkMode = document.documentElement.classList.contains('dark');
      setSystemUI(isDarkMode);
    });

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    setSystemUI(document.documentElement.classList.contains('dark'));

    return () => observer.disconnect();
  }, []);
};
