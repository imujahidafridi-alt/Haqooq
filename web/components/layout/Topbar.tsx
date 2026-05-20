"use client";

import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { LogOut, Search } from 'lucide-react';

export const Topbar = ({ title }: { title: string }) => {
  const router = useRouter();
  const { user, signOutAdmin } = useAuth();

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 bg-slate-950/85 px-6 py-4 backdrop-blur-xl">
      <div>
        <p className="text-xs uppercase tracking-[0.32em] text-slate-500">{title}</p>
        <h2 className="mt-1 text-2xl font-semibold text-white">Haqooq Governance</h2>
      </div>
      <div className="flex items-center gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-300 flex items-center gap-2">
          <Search className="h-4 w-4 text-slate-400" />
          <span>Search by name, case, or report</span>
        </div>
        <button
          type="button"
          onClick={async () => {
            await signOutAdmin();
            router.push('/login');
          }}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800">
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </header>
  );
};
