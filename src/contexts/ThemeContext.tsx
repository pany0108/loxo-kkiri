import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';

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
    // 로컬 스토리지에 저장된 테마가 있으면 사용하고, 없으면 'light'를 기본값으로 합니다.
    return (localStorage.getItem('app-theme-mode') as ThemeMode) || 'light';
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
