"use client";

import { ButtonHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  isLoading?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', isLoading = false, size = 'md', disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(
          'inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition focus:outline-none focus:ring-2 focus:ring-brand-500',
          {
            'px-3 py-2 text-sm': size === 'sm',
            'px-4 py-3 text-sm': size === 'md',
            'px-6 py-4 text-base': size === 'lg'
          },
          {
            'bg-brand-500 text-white hover:bg-brand-400': variant === 'primary',
            'bg-slate-800 text-slate-100 hover:bg-slate-700': variant === 'secondary',
            'bg-transparent text-slate-200 hover:bg-slate-800': variant === 'ghost',
            'bg-transparent border border-slate-600 text-slate-200 hover:bg-slate-800': variant === 'outline',
            'bg-rose-600 text-white hover:bg-rose-500': variant === 'danger'
          },
          disabled && 'cursor-not-allowed opacity-60',
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? 'Working...' : children}
      </button>
    );
  }
);
Button.displayName = 'Button';
