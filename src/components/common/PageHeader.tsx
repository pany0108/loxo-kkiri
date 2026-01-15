import React from 'react';

interface PageHeaderProps {
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({ icon, children, className = 'mb-8' }) => {
  return (
    <header className={className}>
      {icon && <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-xl mb-6">{icon}</div>}
      {children}
    </header>
  );
};

export default PageHeader;
