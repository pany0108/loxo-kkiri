import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

interface TopNavProps {
  title?: string;
  extra?: React.ReactNode;
  onBack?: () => void;
  rightContent?: React.ReactNode; // Renamed from 'extra'
  children?: React.ReactNode; // For custom title/content area
  className?: string; // Optional prop to override default styles
}

const TopNav: React.FC<TopNavProps> = ({ title, onBack, rightContent, children, className }) => {
  const navigate = useNavigate();
  const handleBack = onBack || (() => navigate(-1));

  // TopNav의 높이를 Safe Area를 포함하여 60px + safe-area-inset-top으로 설정합니다.
  // 내부 콘텐츠는 이 높이 내에서 중앙 정렬됩니다.
  const defaultClassName =
    'px-6 h-[calc(60px+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] flex items-center justify-between sticky top-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md z-40 border-b border-gray-100 dark:border-gray-800';

  return (
    <nav className={`${defaultClassName} ${className || ''}`}>
      <button
        onClick={handleBack}
        className="p-2 -ml-2 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors active:scale-90"
        aria-label="뒤로 가기"
      >
        <ChevronLeft size={28} />
      </button>
      {children ? (
        <div className="flex-1 flex items-center gap-3">{children}</div>
      ) : (
        title && <h1 className="flex-1 text-[17px] font-black text-gray-900 dark:text-white truncate">{title}</h1>
      )}
      {rightContent && <div className="flex items-center gap-1">{rightContent}</div>}
    </nav>
  );
};

export default TopNav;
