import React from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode | { label: string; onClick: () => void };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border-2 border-dashed border-slate-200 bg-white/80 my-4 ${className}`}
    >
      {icon && (
        <div className="text-[#C5A880] mb-4 p-4 rounded-2xl bg-[#F7F4EF] inline-flex items-center justify-center ring-8 ring-[#F7F4EF]/50">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-bold text-slate-900 mb-1.5">{title}</h3>
      {description && (
        <p className="text-sm text-slate-500 max-w-md mb-6 leading-relaxed">
          {description}
        </p>
      )}
      {action && (
        <div>
          {React.isValidElement(action) ? (
            action
          ) : typeof action === 'object' && 'label' in action ? (
            <Button variant="primary" onClick={(action as any).onClick}>
              {(action as any).label}
            </Button>
          ) : (
            (action as any)
          )}
        </div>
      )}
    </div>
  );
};
