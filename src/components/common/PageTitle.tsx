import React from 'react';

interface PageTitleProps {
  children: React.ReactNode;
  className?: string;
}

const PageTitle: React.FC<PageTitleProps> = ({ children, className = '' }) => {
  return <h2 className={`text-h2 ${className}`}>{children}</h2>;
};

export default PageTitle;
