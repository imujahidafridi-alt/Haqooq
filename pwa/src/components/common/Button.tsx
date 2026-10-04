import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  loading,
  leftIcon,
  icon,
  rightIcon,
  fullWidth = false,
  disabled,
  className = '',
  style,
  ...props
}) => {
  const activeLoading = loading !== undefined ? loading : isLoading;
  const activeLeftIcon = icon !== undefined ? icon : leftIcon;

  const baseClasses =
    'inline-flex items-center justify-center font-semibold transition-all duration-150 select-none disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99] gap-2 cursor-pointer';

  const sizeClasses: Record<string, string> = {
    sm: 'px-3.5 py-2 text-xs rounded-xl',
    md: 'px-4.5 py-2.5 text-sm rounded-xl',
    lg: 'px-6 py-3.5 text-base rounded-xl',
  };

  const variantClasses: Record<string, string> = {
    primary: 'bg-[#1A365D] hover:bg-[#234574] text-white shadow-sm hover:shadow',
    secondary: 'bg-[#C5A880] hover:bg-[#b5956a] text-slate-900 shadow-sm hover:shadow',
    outline: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-xs hover:border-slate-400',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm hover:shadow',
    ghost: 'bg-transparent hover:bg-slate-100 text-slate-700',
  };

  const widthClass = fullWidth ? 'w-full flex' : '';

  return (
    <button
      disabled={disabled || activeLoading}
      className={`${baseClasses} ${sizeClasses[size] || sizeClasses.md} ${
        variantClasses[variant] || variantClasses.primary
      } ${widthClass} ${className}`}
      style={style}
      {...props}
    >
      {activeLoading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />
      ) : (
        <>
          {activeLeftIcon && <span className="inline-flex shrink-0">{activeLeftIcon}</span>}
          {children}
          {rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
};
