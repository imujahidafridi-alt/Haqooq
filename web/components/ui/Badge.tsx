import clsx from 'clsx';

export const Badge = ({ label, variant = 'default' }: { label: string; variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' }) => {
  return (
    <span className={clsx('inline-flex rounded-full px-3 py-1 text-xs font-semibold', {
      'bg-emerald-500/15 text-emerald-300': variant === 'success',
      'bg-amber-500/15 text-amber-300': variant === 'warning',
      'bg-rose-500/15 text-rose-300': variant === 'danger',
      'bg-sky-500/15 text-sky-300': variant === 'info',
      'bg-slate-800 text-slate-300': variant === 'default'
    })}>{label}</span>
  );
};
