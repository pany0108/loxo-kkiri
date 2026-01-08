import React, { useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { TopNav } from 'components';

interface PageLayoutProps {
  children: React.ReactNode;
  title: string;
  onBack?: (() => void) | null; // 뒤로가기 버튼을 숨기려면 null을 전달
  extraNav?: React.ReactNode;
  footer?: React.ReactNode;
}

const PageLayout: React.FC<PageLayoutProps> = ({ children, title, onBack, extraNav, footer }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  /**
   * 페이지가 로드될 때 스크롤을 최상단으로 이동시킵니다.
   */
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  const footerPadding = footer ? 'pb-[calc(8rem+env(safe-area-inset-bottom))]' : 'pb-8';
  const finalOnBack = onBack === null ? undefined : onBack ?? (() => navigate(-1));

  return (
    <div className="flex flex-col min-h-dvh bg-white dark:bg-gray-950 font-['Pretendard']">
      <TopNav title={title} onBack={finalOnBack} extra={extraNav} />
      <div ref={scrollContainerRef} className={`flex-1 px-6 pt-[calc(76px+env(safe-area-inset-top))] ${footerPadding} overflow-y-auto w-full`}>
        {children}
      </div>
      {footer}
    </div>
  );
};

export default PageLayout;
