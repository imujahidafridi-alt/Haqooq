"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Eye, EyeOff } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function LoginPage() {
  const router = useRouter();
  const { user, firebaseUser, loading, isAuthenticated, isAuthorized, authError, signIn, signOutAdmin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && isAuthenticated && isAuthorized) {
      router.push('/dashboard');
    }
  }, [loading, isAuthenticated, isAuthorized, router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await signIn(email, password);
      if (result.authorized) {
        toast.success('Welcome back, admin!');
        router.push('/dashboard');
      } else {
        toast.error('Access Denied: Administrator privileges required.');
      }
    } catch (error: any) {
      toast.error(error.message || 'Unable to sign in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If user is authenticated with Firebase but not authorized as an admin
  if (!loading && isAuthenticated && !isAuthorized) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-slate-100">
        <Toaster position="top-center" />
        <div className="w-full max-w-md rounded-[32px] border border-amber-900/40 bg-slate-900/95 p-10 shadow-2xl shadow-slate-950/40 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400">
            <EyeOff className="h-8 w-8" />
          </div>
          <p className="text-xs uppercase tracking-[0.4em] text-amber-500 font-semibold">Access Denied</p>
          <h1 className="mt-3 text-2xl font-bold text-white">Administrator Access Required</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            You are signed in as <span className="font-semibold text-white">{firebaseUser?.email || user?.email}</span>. This account does not have administrative permissions for the governance portal.
          </p>
          <div className="mt-8 space-y-3">
            <Button
              type="button"
              onClick={async () => {
                await signOutAdmin();
              }}
              className="w-full"
            >
              Sign in with another account
            </Button>
            <a
              href="/"
              className="block rounded-2xl border border-slate-800 bg-slate-950/80 py-3 text-sm font-semibold text-slate-400 hover:text-white transition"
            >
              Return to Homepage
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-slate-100">
      <Toaster position="top-center" />
      <div className="w-full max-w-md rounded-[32px] border border-slate-800 bg-slate-900/95 p-10 shadow-2xl shadow-slate-950/40">
        <div className="mb-8">
          <img src="/logo.png" alt="Haqooq Logo" className="h-16 w-16 mb-4 rounded-2xl object-contain shadow-md" />
          <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Haqooq Admin</p>
          <h1 className="mt-4 text-3xl font-semibold text-white">Secure sign in</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">Only authorized admin accounts can access governance workflows.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="admin@haqooq.com"
            required
          />
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-350">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Your secure password"
                className="w-full rounded-2xl border border-slate-800 bg-slate-950/90 pl-4 pr-12 py-3 text-sm text-slate-100 shadow-input transition placeholder:text-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
              >
                {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
              </button>
            </div>
          </div>

          <Button type="submit" isLoading={isSubmitting} className="w-full">
            Sign in
          </Button>
        </form>
      </div>
    </main>
  );
}
