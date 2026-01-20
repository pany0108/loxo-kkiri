import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * 앱 로고 이미지 컴포넌트
 * - 크기(sm, md, lg)를 조절할 수 있습니다.
 * @param {string} [className] - 추가 스타일 클래스
 * @param {'sm' | 'md' | 'lg'} [size] - 로고 크기 (기본값: 'md')
 */
const Logo: React.FC<LogoProps> = ({ className = '', size = 'md' }) => {
  // 크기별 스타일 정의
  const containerStyles = {
    sm: 'w-10 h-10 rounded-xl',
    md: 'w-14 h-14 rounded-xl',
    lg: 'w-20 h-20 rounded-2xl',
  };

  return (
    /* 로고 컨테이너 */
    <div className={`inline-flex items-center justify-center overflow-hidden bg-white  ${containerStyles[size]} ${className}`}>
      {/* 로고 이미지 */}
      <img src="/logo.svg" alt="Logo" className="w-full h-full object-contain" />
    </div>
  );
};

export default Logo;
