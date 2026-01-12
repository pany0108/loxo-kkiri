import React, { createContext, useState, useContext, useMemo, ReactNode } from 'react';

interface UIContextType {
  isBottomNavVisible: boolean;
  setIsBottomNavVisible: (isVisible: boolean) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

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

export const useUI = () => {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};
