import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  icon,
  type = 'text',
  className = '',
  style,
  id,
  ...props
}) => {
  const activeIcon = icon !== undefined ? icon : leftIcon;
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputId = id || (label ? label.toLowerCase().replace(/[^a-z0-9]/g, '-') : undefined);

  const plClass = activeIcon ? 'pl-11' : 'pl-3.5';
  const prClass = isPassword ? 'pr-11' : 'pr-3.5';

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-semibold uppercase tracking-wider text-slate-700 select-none flex items-center justify-between"
        >
          <span>{label}</span>
        </label>
      )}

      <div className="relative flex items-center w-full">
        {activeIcon && (
          <div className="absolute inset-y-0 left-0 w-11 flex items-center justify-center pointer-events-none text-slate-400 z-10">
            {activeIcon}
          </div>
        )}

        <input
          id={inputId}
          type={isPassword ? (showPassword ? 'text' : 'password') : type}
          className={`w-full h-11 bg-white border rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#1A365D] focus:ring-3 focus:ring-[#1A365D]/10 transition-all text-sm outline-none shadow-xs ${plClass} ${prClass} ${
            error ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500 focus:ring-rose-500/10' : 'border-slate-200 hover:border-slate-300'
          } ${className}`}
          style={style}
          {...props}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute inset-y-0 right-0 w-11 h-11 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors z-10 cursor-pointer"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>

      {error ? (
        <p className="text-xs text-rose-600 font-medium flex items-center gap-1">
          {error}
        </p>
      ) : helperText ? (
        <p className="text-xs text-slate-500">{helperText}</p>
      ) : null}
    </div>
  );
};
