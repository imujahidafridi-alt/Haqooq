"use client";

import { InputHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, label, error, ...props }, ref) => {
  return (
    <label className="block text-sm text-slate-200">
      {label && <span className="mb-2 block font-medium text-slate-300">{label}</span>}
      <input
        ref={ref}
        className={clsx(
          'w-full rounded-2xl border border-slate-800 bg-slate-950/90 px-4 py-3 text-sm text-slate-100 shadow-input transition placeholder:text-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20',
          className
        )}
        {...props}
      />
      {error && <span className="mt-2 block text-xs text-rose-400">{error}</span>}
    </label>
  );
});
Input.displayName = 'Input';
