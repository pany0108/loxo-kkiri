import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const Logo: React.FC<LogoProps> = ({ className = '', size = 'md' }) => {
  const containerStyles = {
    sm: 'w-10 h-10 rounded-xl ring-2',
    md: 'w-14 h-14 rounded-2xl ring-4',
    lg: 'w-20 h-20 rounded-3xl ring-4',
  };

  return (
    <div
      className={`inline-flex items-center justify-center bg-[#F8EFD3] shadow-xl shadow-orange-100 dark:shadow-orange-900/20 ring-orange-50 dark:ring-orange-500/10 ${containerStyles[size]} ${className}`}
    >
      {/* public 폴더에 logo.png 파일을 넣어주세요. */}
      <img src="/logo.svg" alt="Logo" className="w-full h-full object-contain" />
    </div>
  );
};

export default Logo;
