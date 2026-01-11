import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TopNav } from 'components';
import { useScrollToTop } from 'hooks';

interface PageLayoutProps {
  children: React.ReactNode;
  title: string;
  onBack?: (() => void) | null; // 뒤로가기 버튼을 숨기려면 null을 전달
  extraNav?: React.ReactNode;
  footer?: React.ReactNode;
}

const PageLayout: React.FC<PageLayoutProps> = ({ children, title, onBack, extraNav, footer }) => {
  const navigate = useNavigate();
  const scrollContainerRef = useScrollToTop();

  const footerPadding = footer ? 'pb-[calc(8rem+env(safe-area-inset-bottom))]' : 'pb-[env(safe-area-inset-bottom)]';
  const finalOnBack = onBack === null ? undefined : onBack ?? (() => navigate(-1));

  return (
    <div className="flex flex-col min-h-dvh bg-[#FDFBF7] dark:bg-gray-950 font-['Pretendard']">
      <TopNav title={title} onBack={finalOnBack} extra={extraNav} />
      <div ref={scrollContainerRef} className={`flex-1 flex flex-col px-6 pt-[calc(76px+env(safe-area-inset-top))] ${footerPadding} overflow-y-auto w-full`}>
        {children}
      </div>
      {footer}
    </div>
  );
};

export default PageLayout;
