import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  hoverable = false,
  className = '',
  style,
  ...props
}) => {
  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 sm:p-6 transition-all duration-200 ${
        hoverable ? 'hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5' : ''
      } ${className}`}
      style={style}
      {...props}
    >
      {children}
    </div>
  );
};
