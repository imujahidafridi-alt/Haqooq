import { ReactNode } from 'react';

export const Card = ({ title, children, className }: { title?: string; children: ReactNode; className?: string }) => {
  return (
    <section className={`rounded-3xl border border-slate-800 bg-slate-900/95 p-6 shadow-card ${className ?? ''}`}>
      {title && <h3 className="mb-4 text-lg font-semibold text-white">{title}</h3>}
      {children}
    </section>
  );
};
