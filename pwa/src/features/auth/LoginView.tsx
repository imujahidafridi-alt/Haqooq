import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { loginUser, signInWithGoogle } from '../../services/authService';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import { Mail, Lock, LogIn, Scale } from 'lucide-react';

interface Props {
  onSwitchToRegister: () => void;
}

export const LoginView: React.FC<Props> = ({ onSwitchToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const { setUser } = useAuthStore();
  const { addToast } = useUiStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      addToast('Please enter both email and password.', 'error');
      return;
    }

    setLoading(true);
    try {
      const profile = await loginUser(email, password);
      setUser(profile);
      addToast(`Welcome back, ${profile.displayName || 'Member'}!`, 'success');
    } catch (err: any) {
      addToast(err?.message || 'Login failed. Please check your credentials.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const profile = await signInWithGoogle(undefined, false);
      setUser(profile);
      addToast(`Signed in as ${profile.displayName || 'Member'}`, 'success');
    } catch (err: any) {
      addToast(err?.message || 'Google sign in could not be completed.', 'error');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full py-8 sm:py-12 px-4 sm:px-6 flex flex-col items-center justify-start sm:justify-center bg-slate-950 bg-[radial-gradient(ellipse_at_50%_0%,#1A365D_0%,#020617_80%)] overflow-y-auto">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 my-auto space-y-6">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-[#1A365D] inline-flex items-center justify-center text-[#C5A880] shadow-md">
            <Scale size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#1A365D] tracking-tight">
              Haqooq Legal Portal
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Empowering Your Legal Rights Across Pakistan
            </p>
          </div>
        </div>

        {/* Google Sign-in */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading || loading}
          className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-sm font-semibold transition-all cursor-pointer shadow-xs disabled:opacity-50 shrink-0"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" className="shrink-0">
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
            <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
          </svg>
          <span className="truncate">Continue with Google</span>
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 text-slate-400 text-xs font-semibold select-none">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="shrink-0 tracking-wider text-[11px] sm:text-xs">OR SIGN IN WITH EMAIL</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            placeholder="advocate@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<Mail size={16} />}
            required
          />

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-xs font-bold text-[#1A365D] hover:underline cursor-pointer"
              >
                Forgot password?
              </button>
            </div>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock size={16} />}
              required
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              fullWidth
              icon={<LogIn size={18} />}
            >
              Sign In
            </Button>
          </div>
        </form>

        {/* Switch to registration */}
        <div className="text-center text-xs sm:text-sm text-slate-500 pt-2 border-t border-slate-100">
          Don't have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="font-bold text-[#1A365D] hover:underline cursor-pointer ml-1"
          >
            Register Now
          </button>
        </div>
      </div>

      <ForgotPasswordModal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        initialEmail={email}
      />
    </div>
  );
};
