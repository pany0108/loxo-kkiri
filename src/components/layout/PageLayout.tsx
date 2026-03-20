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
 * - 상단 네비게이션(TopNav), 콘텐츠 영역, 하단 푸터(Footer)를 포함하는 공통 레이아웃 컨테이너입니다.
 * @param {React.ReactNode} children - 페이지 본문 콘텐츠
 * @param {string} [title] - 상단 네비게이션 제목
 * @param {React.ReactNode} [headerContent] - 상단 네비게이션 커스텀 콘텐츠
 * @param {function|null} [onBack] - 뒤로가기 핸들러 (null일 경우 버튼 숨김)
 * @param {React.ReactNode} [extraNav] - 상단 네비게이션 우측 추가 콘텐츠
 * @param {React.ReactNode} [footer] - 하단 고정 푸터 컴포넌트
 * @param {React.RefObject} [contentRef] - 콘텐츠 영역 ref (스크롤 제어 등)
 * @param {string} [className] - 콘텐츠 영역 추가 스타일 클래스
 * @param {boolean} [hideTopNav] - 상단 네비게이션 숨김 여부
 */
const PageLayout: React.FC<PageLayoutProps> = ({ children, title, headerContent, onBack, extraNav, footer, contentRef, className, hideTopNav = false }) => {
  const navigate = useNavigate();
  const defaultScrollRef = useScrollToTop();
  const scrollRef = contentRef || defaultScrollRef;

  const footerPadding = footer ? 'pb-[calc(8rem+max(env(safe-area-inset-bottom),20px))]' : 'pb-[max(env(safe-area-inset-bottom),20px)]';
  const finalOnBack = onBack === null ? null : onBack ?? (() => navigate(-1));

  const paddingTop = hideTopNav ? 'pt-[calc(24px+env(safe-area-inset-top))]' : 'pt-[calc(76px+env(safe-area-inset-top))]';

  return (
    /* 전체 페이지 컨테이너 */
    <div className="flex flex-col min-h-dvh bg-white dark:bg-gray-950 font-['Pretendard']">
      {/* 상단 네비게이션 영역 */}
      {!hideTopNav && (
        <TopNav title={title} onBack={finalOnBack} extra={extraNav}>
          {headerContent}
        </TopNav>
      )}
      {/* 메인 콘텐츠 영역 (스크롤 가능) */}
      <div ref={scrollRef} className={`flex-1 flex flex-col ${paddingTop} ${footerPadding} overflow-y-auto w-full ${className || 'px-6'}`}>
        {children}
      </div>
      {/* 하단 푸터 영역 */}
      {footer}
    </div>
  );
};

export default PageLayout;
