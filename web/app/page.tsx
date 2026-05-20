import Link from 'next/link';
import { ArrowRight, ShieldCheck, ShieldAlert, SlidersHorizontal } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-16 sm:px-8 lg:px-12">
        <div className="rounded-[40px] border border-slate-800 bg-slate-900/90 p-10 shadow-2xl shadow-slate-950/40">
          <div className="grid gap-10 lg:grid-cols-[1.3fr_0.9fr] lg:items-center">
            <div>
              <p className="text-sm uppercase tracking-[0.4em] text-slate-500">Haqooq</p>
              <h1 className="mt-6 text-5xl font-semibold text-white sm:text-6xl">Enterprise Admin for Legal Governance</h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
                Centralize operations, manage lawyers and clients, audit every workflow, and maintain public trust for Haqooq with an integrated admin portal.
              </p>
              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <Link href="/login" className="inline-flex items-center justify-center gap-3 rounded-2xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-400">
                  Launch admin panel
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
            <div className="space-y-4 rounded-3xl border border-slate-800 bg-slate-950/80 p-6">
              <div className="rounded-3xl bg-slate-900/95 p-5">
                <div className="flex items-center gap-3 text-slate-200">
                  <ShieldCheck className="h-5 w-5 text-brand-400" />
                  <div>
                    <p className="text-sm font-semibold">Role-based security</p>
                    <p className="text-sm text-slate-400">Admins are verified through Firebase and Firestore role checks.</p>
                  </div>
                </div>
              </div>
              <div className="rounded-3xl bg-slate-900/95 p-5">
                <div className="flex items-center gap-3 text-slate-200">
                  <ShieldAlert className="h-5 w-5 text-rose-400" />
                  <div>
                    <p className="text-sm font-semibold">Transparent audit logs</p>
                    <p className="text-sm text-slate-400">Immutable event tracking and legal workflow history.</p>
                  </div>
                </div>
              </div>
              <div className="rounded-3xl bg-slate-900/95 p-5">
                <div className="flex items-center gap-3 text-slate-200">
                  <SlidersHorizontal className="h-5 w-5 text-sky-400" />
                  <div>
                    <p className="text-sm font-semibold">Governance controls</p>
                    <p className="text-sm text-slate-400">Maintain compliance with moderation, verification, and escalation workflows.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
