import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

export type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  themeMode: ThemeMode;
  toggleThemeMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * 앱의 테마(Light/Dark)를 관리하는 Context Provider
 * - 로컬 스토리지에 테마 설정을 저장하고 불러옵니다.
 * - HTML root 요소에 'dark' 클래스를 토글하여 Tailwind CSS 다크 모드를 제어합니다.
 *
 * @param {{ children: React.ReactNode }} props
 * @returns {JSX.Element}
 */
export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const savedTheme = localStorage.getItem('app-theme-mode') as ThemeMode;
    if (savedTheme) return savedTheme;
    
    // 저장된 테마가 없다면 기기(시스템) 테마를 감지하여 기본값으로 설정
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    return 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    // 'color-scheme'을 설정하여 브라우저 네이티브 UI(스크롤바, 입력창 등)의 테마를 변경합니다.
    root.style.colorScheme = themeMode;
    // 'dark' 클래스를 추가하거나 제거하여 Tailwind CSS 다크 모드를 제어합니다.
    if (themeMode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('app-theme-mode', themeMode);

    // 1. 웹 및 일부 안드로이드 기기를 위한 메타 태그 업데이트
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }
    const bgColor = themeMode === 'dark' ? '#030712' : '#ffffff'; // Tailwind gray-950 or white
    metaThemeColor.setAttribute('content', bgColor);

    // 2. 안드로이드 상단바 및 하단 네비게이션바 네이티브 UI 동기화
    if (Capacitor.isNativePlatform()) {
      const updateNativeSystemUI = async () => {
        try {
          // 상단 상태바: 라이트 모드면 검은 텍스트(Style.Light), 다크 모드면 흰 텍스트(Style.Dark)
          await StatusBar.setStyle({ style: themeMode === 'dark' ? Style.Dark : Style.Light });
          await StatusBar.setBackgroundColor({ color: bgColor });
        } catch (e) {
          console.warn('StatusBar plugin error:', e);
        }

        try {
          // 하단 네비게이션바 (플러그인이 설치된 경우에만 동작하도록 동적 임포트)
          // @ts-ignore
          const { NavigationBar } = await import('@capgo/capacitor-navigation-bar');
          const navBar = NavigationBar as any;
          const options = {
            color: bgColor,
            darkButtons: themeMode === 'light', // 라이트 모드일 때 버튼을 어둡게
          };

          // 버전에 따라 지원하는 메서드가 다를 수 있으므로 안전하게 호출합니다.
          if (navBar.setColor) {
            await navBar.setColor(options);
          } else if (navBar.setNavigationBarColor) {
            await navBar.setNavigationBarColor(options);
          }
        } catch (e) {
          console.warn('NavigationBar plugin not installed or error:', e);
        }
      };
      updateNativeSystemUI();
    }
  }, [themeMode]);

  const toggleThemeMode = () => {
    setThemeMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const value = useMemo(() => ({ themeMode, toggleThemeMode }), [themeMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

/**
 * 테마 Context를 사용하기 위한 커스텀 훅
 *
 * @returns {ThemeContextType} themeMode, toggleThemeMode
 * @throws {Error} ThemeProvider 외부에서 사용 시 에러 발생
 */
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
