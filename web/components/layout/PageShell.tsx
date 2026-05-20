"use client";

import React from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';

export const PageShell = ({ title, children }: { title: string; children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/95 px-8 py-10 shadow-2xl shadow-slate-950/40">
          <p className="text-lg font-semibold">Loading Haqooq admin...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1">
          <Topbar title={title} />
          <div className="px-6 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
};
