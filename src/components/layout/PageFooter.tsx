import React from 'react';

interface PageFooterProps {
  children: React.ReactNode;
  className?: string;
  zIndex?: number;
}

const PageFooter: React.FC<PageFooterProps> = ({ children, className = '', zIndex = 20 }) => {
  return (
    <footer
      className={`fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-t border-gray-50 dark:border-gray-800 px-6 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] ${className}`}
      style={{ zIndex }}
    >
      {children}
    </footer>
  );
};

export default PageFooter;
