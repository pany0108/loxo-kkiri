import React from 'react';

interface PageHeaderProps {
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * 페이지 상단 헤더 컴포넌트
 * - 아이콘과 제목, 설명을 포함하는 헤더 영역을 렌더링합니다.
 *
 * @param {PageHeaderProps} props
 * @returns {JSX.Element}
 */
const PageHeader: React.FC<PageHeaderProps> = ({ icon, children, className = 'mb-8' }) => {
  return (
    <header className={className}>
      {icon && <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-xl mb-6">{icon}</div>}
      {children}
    </header>
  );
};

export default PageHeader;
