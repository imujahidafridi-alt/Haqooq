import React from 'react';

interface LoadingSpinnerProps {
  size?: number | 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
  label?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 32,
  color,
  label,
  className = '',
}) => {
  const numSize =
    typeof size === 'number'
      ? size
      : size === 'sm'
      ? 20
      : size === 'md'
      ? 32
      : size === 'xl'
      ? 64
      : 48;

  return (
    <div className={`inline-flex flex-col items-center justify-center gap-3 p-6 ${className}`}>
      <div
        className="rounded-full border-3 border-slate-200 border-t-[#1A365D] animate-spin"
        style={{
          width: `${numSize}px`,
          height: `${numSize}px`,
          borderTopColor: color || '#1A365D',
        }}
      />
      {label && <span className="text-xs text-slate-500 font-medium">{label}</span>}
    </div>
  );
};
