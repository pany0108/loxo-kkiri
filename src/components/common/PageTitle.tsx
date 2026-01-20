import React from 'react';

interface PageTitleProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * 페이지 제목 컴포넌트
 * - 일관된 스타일의 H2 태그를 렌더링합니다.
 *
 * @param {PageTitleProps} props
 * @returns {JSX.Element}
 */
const PageTitle: React.FC<PageTitleProps> = ({ children, className = '' }) => {
  return <h2 className={`text-h2 ${className}`}>{children}</h2>;
};

export default PageTitle;
