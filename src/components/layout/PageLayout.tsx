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
  hideTopNav?: boolean;
}

/**
 * 페이지 레이아웃 컴포넌트
 * - 상단 네비게이션(TopNav), 콘텐츠 영역, 하단 푸터(Footer)를 포함하는 공통 레이아웃입니다.
 */
const PageLayout: React.FC<PageLayoutProps> = ({ children, title, headerContent, onBack, extraNav, footer, contentRef, className, hideTopNav = false }) => {
  const navigate = useNavigate();
  const defaultScrollRef = useScrollToTop();
  const scrollRef = contentRef || defaultScrollRef;

  const footerPadding = footer ? 'pb-[calc(8rem+env(safe-area-inset-bottom))]' : 'pb-[env(safe-area-inset-bottom)]';
  const finalOnBack = onBack === null ? null : onBack ?? (() => navigate(-1));

  const paddingTop = hideTopNav ? 'pt-[calc(24px+env(safe-area-inset-top))]' : 'pt-[calc(76px+env(safe-area-inset-top))]';

  return (
    <div className="flex flex-col min-h-dvh bg-white dark:bg-gray-950 font-['Pretendard']">
      {!hideTopNav && (
        <TopNav title={title} onBack={finalOnBack} extra={extraNav}>
          {headerContent}
        </TopNav>
      )}
      <div ref={scrollRef} className={`flex-1 flex flex-col ${paddingTop} ${footerPadding} overflow-y-auto w-full ${className || 'px-6'}`}>
        {children}
      </div>
      {footer}
    </div>
  );
};

export default PageLayout;
