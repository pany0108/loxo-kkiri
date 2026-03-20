import React from 'react';

interface PageFooterProps {
  children: React.ReactNode;
  className?: string;
  zIndex?: number;
}

/**
 * 페이지 하단 고정 푸터 컴포넌트
 * - 화면 하단에 고정되어 버튼 등의 액션을 제공합니다.
 * @param {React.ReactNode} children - 푸터 내부 콘텐츠
 * @param {string} [className] - 추가 스타일 클래스
 * @param {number} [zIndex] - z-index 값 (기본값: 20)
 */
const PageFooter: React.FC<PageFooterProps> = ({ children, className = '', zIndex = 20 }) => {
  return (
    /* 하단 고정 컨테이너 */
    <footer
      className={`fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-t border-gray-100 dark:border-gray-800 px-6 pt-6 pb-[calc(1.5rem+max(env(safe-area-inset-bottom),12px))] ${className}`}
      style={{ zIndex }}
    >
      {children}
    </footer>
  );
};

export default PageFooter;
