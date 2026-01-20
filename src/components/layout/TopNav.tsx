import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TopNavProps {
  title?: string;
  onBack?: (() => void) | null;
  extra?: React.ReactNode; // For right-aligned content
  children?: React.ReactNode; // For custom title/content area
  className?: string; // Optional prop to override default styles
}

/**
 * 상단 네비게이션 바 컴포넌트
 * - 페이지 제목, 뒤로가기 버튼, 추가 액션 버튼을 포함합니다.
 * @param {string} [title] - 네비게이션 제목
 * @param {function|null} [onBack] - 뒤로가기 핸들러 (null이면 버튼 숨김)
 * @param {React.ReactNode} [extra] - 우측 추가 콘텐츠 영역
 * @param {React.ReactNode} [children] - 중앙 커스텀 콘텐츠 영역 (title 대신 사용)
 * @param {string} [className] - 추가 스타일 클래스
 */
const TopNav: React.FC<TopNavProps> = ({ title, onBack, extra, children, className }) => {
  const navigate = useNavigate();
  const showBackButton = onBack !== null;
  const handleBack = onBack || (() => navigate(-1));

  // TopNav의 높이를 Safe Area를 포함하여 60px + safe-area-inset-top으로 설정합니다.
  // 내부 콘텐츠는 이 높이 내에서 중앙 정렬됩니다.
  const defaultClassName =
    'fixed top-0 right-0 left-0 h-[calc(60px+env(safe-area-inset-top))] px-page pt-[env(safe-area-inset-top)] flex items-center justify-between bg-white/80 dark:bg-gray-950/80 backdrop-blur-md z-nav border-b border-gray-100 dark:border-gray-800';

  return (
    /* 상단 고정 네비게이션 컨테이너 */
    <nav className={`${defaultClassName} ${className || ''}`}>
      {/* 뒤로가기 버튼 영역 */}
      {showBackButton ? (
        <button
          onClick={handleBack}
          className="p-2 -ml-2 text-[#8B95A1] dark:text-gray-500 hover:text-[#191F28] dark:hover:text-white transition-colors active:scale-90"
          aria-label="뒤로 가기"
        >
          <ChevronLeft size={28} />
        </button>
      ) : (
        ''
      )}

      {/* 중앙 콘텐츠 영역 */}
      {children ? (
        <div className="flex-1 flex items-center gap-3">{children}</div>
      ) : (
        title && <h1 className="flex-1 text-[17px] font-black text-[#191F28] dark:text-white truncate">{title}</h1>
      )}

      {/* 우측 추가 콘텐츠 영역 */}
      {extra && <div className="flex items-center gap-1">{extra}</div>}
    </nav>
  );
};

export default TopNav;
