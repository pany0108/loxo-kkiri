import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

interface TopNavProps {
  title?: string;
  extra?: React.ReactNode;
  onBack?: () => void;
}

const TopNav: React.FC<TopNavProps> = ({ title, extra, onBack }) => {
  const navigate = useNavigate();

  const handleBack = onBack || (() => navigate(-1));

  return (
    <nav className="fixed top-0 left-0 right-0 h-[calc(60px+env(safe-area-inset-top))] px-4 flex items-center justify-between bg-white/80 dark:bg-gray-950/80 backdrop-blur-md z-40 border-b border-gray-100 dark:border-gray-800/50 pt-[env(safe-area-inset-top)]">
      <div className="w-1/5 flex justify-start">
        <button
          onClick={handleBack}
          className="p-2 -ml-2 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors active:scale-90"
          aria-label="뒤로 가기"
        >
          <ChevronLeft size={28} />
        </button>
      </div>
      <div className="w-3/5 text-center">
        <h1 className="text-base font-black text-gray-900 dark:text-white truncate">{title}</h1>
      </div>
      <div className="w-1/5 flex justify-end items-center">{extra}</div>
    </nav>
  );
};

export default TopNav;
