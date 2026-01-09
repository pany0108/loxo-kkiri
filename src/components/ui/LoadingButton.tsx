import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  children: React.ReactNode;
}

const LoadingButton: React.FC<LoadingButtonProps> = ({ isLoading, children, disabled, className = '', ...props }) => {
  return (
    <button disabled={disabled || isLoading} className={`${className} ${isLoading ? 'cursor-not-allowed opacity-80' : ''}`} {...props}>
      {isLoading ? <Loader2 className="animate-spin" /> : children}
    </button>
  );
};

export default LoadingButton;
