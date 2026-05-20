"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import toast, { Toaster } from 'react-hot-toast';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!loading && user) {
    router.push('/dashboard');
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await signIn(email, password);
      toast.success('Welcome back, admin!');
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Unable to sign in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-slate-100">
      <Toaster position="top-center" />
      <div className="w-full max-w-md rounded-[32px] border border-slate-800 bg-slate-900/95 p-10 shadow-2xl shadow-slate-950/40">
        <div className="mb-8">
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
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Your secure password"
            required
          />
          <Button type="submit" isLoading={isSubmitting} className="w-full">
            Sign in
          </Button>
        </form>
      </div>
    </main>
  );
}
