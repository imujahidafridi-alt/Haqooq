import { ReactNode } from 'react';

export const StatCard = ({ title, value, subtitle, children }: { title: string; value: string; subtitle?: string; children?: ReactNode }) => {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-6 shadow-card">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{title}</p>
      <p className="mt-4 text-3xl font-semibold text-white">{value}</p>
      {subtitle && <p className="mt-2 text-sm text-slate-400">{subtitle}</p>}
      {children}
    </div>
  );
};
