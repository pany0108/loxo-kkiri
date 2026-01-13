import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TopNav } from 'components';
import { useScrollToTop } from 'hooks';

interface PageLayoutProps {
  children: React.ReactNode;
  title?: string;
  headerContent?: React.ReactNode;
  onBack?: (() => void) | null; // 뒤로가기 버튼을 숨기려면 null을 전달
  extraNav?: React.ReactNode;
  footer?: React.ReactNode;
  contentRef?: React.RefObject<HTMLDivElement>;
  className?: string;
}

const PageLayout: React.FC<PageLayoutProps> = ({ children, title, headerContent, onBack, extraNav, footer, contentRef, className }) => {
  const navigate = useNavigate();
  const defaultScrollRef = useScrollToTop();
  const scrollRef = contentRef || defaultScrollRef;

  const footerPadding = footer ? 'pb-[calc(8rem+env(safe-area-inset-bottom))]' : 'pb-[env(safe-area-inset-bottom)]';
  const finalOnBack = onBack === null ? null : onBack ?? (() => navigate(-1));

  return (
    <div className="flex flex-col min-h-dvh bg-white dark:bg-gray-950 font-['Pretendard']">
      <TopNav title={title} onBack={finalOnBack} extra={extraNav}>
        {headerContent}
      </TopNav>
      <div ref={scrollRef} className={`flex-1 flex flex-col pt-[calc(76px+env(safe-area-inset-top))] ${footerPadding} overflow-y-auto w-full ${className || 'px-6'}`}>
        {children}
      </div>
      {footer}
    </div>
  );
};

export default PageLayout;
