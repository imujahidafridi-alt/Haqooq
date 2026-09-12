"use client";

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';

export const PageShell = ({ title, children }: { title: string; children: React.ReactNode }) => {
  const { user, loading, isAuthenticated, isAuthorized, signOutAdmin } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  React.useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200" role="status">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/95 px-8 py-10 shadow-2xl shadow-slate-950/40">
          <p className="text-lg font-semibold">Loading Haqooq admin...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isAuthorized || !user || user.role !== 'admin') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
        <div className="w-full max-w-md rounded-[32px] border border-amber-900/40 bg-slate-900/95 p-8 text-center shadow-2xl">
          <p className="text-xs uppercase tracking-[0.4em] text-amber-500 font-semibold">Unauthorized</p>
          <h1 className="mt-3 text-2xl font-bold text-white">Administrator Access Required</h1>
          <p className="mt-3 text-sm text-slate-300">
            This governance workflow requires verified platform administrator credentials.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={async () => {
                await signOutAdmin();
                router.push('/login');
              }}
              className="w-full rounded-2xl bg-brand-500 py-3 text-sm font-semibold text-white hover:bg-brand-400 transition"
            >
              Sign in with admin account
            </button>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="w-full rounded-2xl border border-slate-800 py-3 text-sm font-semibold text-slate-400 hover:text-white transition"
            >
              Return to Homepage
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="flex min-h-screen">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 min-w-0">
          <Topbar title={title} onMenuClick={() => setSidebarOpen(true)} />
          <div className="px-4 py-6 sm:px-6 sm:py-8">{children}</div>
        </main>
      </div>
    </div>
  );
};
