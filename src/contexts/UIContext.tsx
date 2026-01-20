import React, { createContext, useState, useContext, useMemo, ReactNode } from 'react';

interface UIContextType {
  isBottomNavVisible: boolean;
  setIsBottomNavVisible: (isVisible: boolean) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

/**
 * UI 상태(예: 하단 네비게이션 바 표시 여부)를 관리하는 Context Provider
 *
 * @param {{ children: ReactNode }} props
 * @returns {JSX.Element}
 */
export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isBottomNavVisible, setIsBottomNavVisible] = useState(true);

  const value = useMemo(
    () => ({
      isBottomNavVisible,
      setIsBottomNavVisible,
    }),
    [isBottomNavVisible],
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};

/**
 * UI Context를 사용하기 위한 커스텀 훅
 *
 * @returns {UIContextType} isBottomNavVisible, setIsBottomNavVisible
 * @throws {Error} UIProvider 외부에서 사용 시 에러 발생
 */
export const useUI = () => {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};
