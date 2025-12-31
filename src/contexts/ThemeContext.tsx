import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';

export type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  themeMode: ThemeMode;
  toggleThemeMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const savedThemeMode = localStorage.getItem('app-theme-mode') as ThemeMode;
    if (savedThemeMode) {
      return savedThemeMode;
    }
    // 시스템 설정 확인
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
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
  }, [themeMode]);

  const toggleThemeMode = () => {
    setThemeMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const value = useMemo(() => ({ themeMode, toggleThemeMode }), [themeMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
