"use client";

import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { LogOut, Search, Menu } from 'lucide-react';

interface TopbarProps {
  title: string;
  onMenuClick?: () => void;
}

export const Topbar = ({ title, onMenuClick }: TopbarProps) => {
  const router = useRouter();
  const { signOutAdmin } = useAuth();

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 bg-slate-950/85 px-6 py-4 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            className="inline-flex lg:hidden items-center justify-center p-2.5 rounded-2xl border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white transition"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <div>
          <p className="text-xs uppercase tracking-[0.32em] text-slate-500">{title}</p>
          <h2 className="mt-1 text-2xl font-semibold text-white">Haqooq Governance</h2>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-350">
          <Search className="h-4 w-4 text-slate-400" />
          <span>Search directories, operations, and log indexes</span>
        </div>
        <button
          type="button"
          onClick={async () => {
            await signOutAdmin();
            router.push('/login');
          }}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </header>
  );
};
