import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?:
    | 'primary'
    | 'secondary'
    | 'success'
    | 'warning'
    | 'error'
    | 'danger'
    | 'info'
    | 'lawyer'
    | 'client'
    | 'neutral';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
}) => {
  const variantClasses: Record<string, string> = {
    primary: 'bg-blue-50 text-blue-800 border-blue-200/80',
    secondary: 'bg-[#F7F4EF] text-[#8C6D3B] border-[#C5A880]/30',
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    error: 'bg-rose-50 text-rose-800 border-rose-200',
    danger: 'bg-rose-50 text-rose-800 border-rose-200',
    info: 'bg-sky-50 text-sky-800 border-sky-200',
    lawyer: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    client: 'bg-teal-50 text-teal-800 border-teal-200',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[11px]',
    md: 'px-2.5 py-1 text-xs',
  };

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border leading-none tracking-wide select-none ${
        sizeClasses[size]
      } ${variantClasses[variant] || variantClasses.primary} ${className}`}
    >
      {children}
    </span>
  );
};
