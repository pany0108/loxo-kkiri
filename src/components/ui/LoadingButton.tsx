import { Loader2 } from 'lucide-react';
import React from 'react';

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  children: React.ReactNode;
}

/**
 * 로딩 상태를 표시할 수 있는 버튼 컴포넌트
 * - isLoading prop이 true일 때 로딩 스피너를 보여주고 버튼을 비활성화합니다.
 * @param {boolean} [isLoading] - 로딩 상태 여부
 * @param {React.ReactNode} children - 버튼 내부 콘텐츠
 * @param {boolean} [disabled] - 버튼 비활성화 여부
 * @param {string} [className] - 추가 스타일 클래스
 * @param {object} [props] - 기타 HTML 버튼 속성
 */
const LoadingButton: React.FC<LoadingButtonProps> = ({ isLoading, children, disabled, className = '', ...props }) => {
  return (
    /* 버튼 요소 */
    <button disabled={disabled || isLoading} className={`${className} ${isLoading ? 'cursor-not-allowed opacity-80' : ''}`} {...props}>
      {/* 로딩 중일 때 스피너 표시, 아닐 때 children 표시 */}
      {isLoading ? <Loader2 className="animate-spin" /> : children}
    </button>
  );
};

export default LoadingButton;
