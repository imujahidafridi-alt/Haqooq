import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { registerUser, signInWithGoogle } from '../../services/authService';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { UserRole, PracticeArea } from '../../types/models';
import { CANONICAL_PRACTICE_AREAS, CITIES } from '../../constants/legalDomains';
import { User, Briefcase, Mail, Lock, CheckCircle2, Scale, MapPin, ChevronDown } from 'lucide-react';

interface Props {
  onSwitchToLogin: () => void;
}

export const RegisterView: React.FC<Props> = ({ onSwitchToLogin }) => {
  const [role, setRole] = useState<UserRole>('client');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [city, setCity] = useState<string>('Lahore');
  const [selectedSpecs, setSelectedSpecs] = useState<PracticeArea[]>(['Property / Real Estate Law']);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const { setUser } = useAuthStore();
  const { addToast } = useUiStore();

  const toggleSpec = (spec: PracticeArea) => {
    if (selectedSpecs.includes(spec)) {
      if (selectedSpecs.length > 1) {
        setSelectedSpecs(selectedSpecs.filter(s => s !== spec));
      } else {
        addToast('You must select at least 1 legal practice area.', 'info');
      }
    } else {
      if (selectedSpecs.length < 5) {
        setSelectedSpecs([...selectedSpecs, spec]);
      } else {
        addToast('You can select up to 5 legal practice areas.', 'info');
      }
    }
  };

  const validatePassword = (pass: string) => {
    if (pass.length < 8) return 'Password must be at least 8 characters long.';
    if (!/[A-Z]/.test(pass)) return 'Password must contain at least one uppercase letter.';
    if (!/[a-z]/.test(pass)) return 'Password must contain at least one lowercase letter.';
    if (!/[0-9]/.test(pass)) return 'Password must contain at least one number.';
    return null;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      addToast('Please provide your full legal name.', 'error');
      return;
    }
    if (!email.trim()) {
      addToast('Please provide a valid email address.', 'error');
      return;
    }

    const passError = validatePassword(password);
    if (passError) {
      addToast(passError, 'error');
      return;
    }

    setLoading(true);
    try {
      const profile = await registerUser(
        email,
        password,
        role,
        displayName,
        city,
        role === 'lawyer' ? selectedSpecs : undefined
      );
      setUser(profile);
      addToast(`Account created! Welcome to Haqooq, ${displayName}.`, 'success');
    } catch (err: any) {
      addToast(err?.message || 'Registration could not be completed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    try {
      const profile = await signInWithGoogle(
        role,
        true,
        role === 'lawyer' ? { city, specialization: selectedSpecs } : { city }
      );
      setUser(profile);
      addToast(`Account registered with Google as ${profile.displayName}!`, 'success');
    } catch (err: any) {
      addToast(err?.message || 'Google registration was interrupted.', 'error');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full py-8 sm:py-12 px-4 sm:px-6 flex flex-col items-center justify-start sm:justify-center bg-slate-950 bg-[radial-gradient(ellipse_at_50%_0%,#1A365D_0%,#020617_80%)] overflow-y-auto">
      <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 my-auto flex flex-col gap-6">
        {/* Brand header */}
        <div className="text-center flex flex-col items-center gap-2">
          <div className="w-14 h-14 rounded-2xl bg-[#1A365D] inline-flex items-center justify-center text-[#C5A880] shadow-md ring-4 ring-blue-50/50">
            <Scale size={30} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#1A365D] tracking-tight">
              Create Your Account
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Join Pakistan's premier Bar-verified legal network
            </p>
          </div>
        </div>

        {/* Role Selector */}
        <div className="flex flex-col gap-2 w-full">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 select-none">
            I am joining as:
          </label>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full">
            <button
              type="button"
              onClick={() => setRole('client')}
              className={`flex flex-col items-center justify-center gap-1.5 px-2.5 py-3 sm:px-4 sm:py-4 rounded-2xl border-2 transition-all cursor-pointer text-center min-h-[96px] min-w-0 ${
                role === 'client'
                  ? 'border-[#1A365D] bg-blue-50/70 shadow-xs'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <User size={22} className={`shrink-0 ${role === 'client' ? 'text-[#1A365D]' : 'text-slate-400'}`} />
              <div className={`font-bold text-xs sm:text-sm leading-tight break-words ${role === 'client' ? 'text-[#1A365D]' : 'text-slate-800'}`}>
                Citizen / Client
              </div>
              <div className="text-[10px] sm:text-[11px] text-slate-500 leading-tight">
                Need legal counsel
              </div>
            </button>

            <button
              type="button"
              onClick={() => setRole('lawyer')}
              className={`flex flex-col items-center justify-center gap-1.5 px-2.5 py-3 sm:px-4 sm:py-4 rounded-2xl border-2 transition-all cursor-pointer text-center min-h-[96px] min-w-0 ${
                role === 'lawyer'
                  ? 'border-[#C5A880] bg-amber-50/50 shadow-xs'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <Briefcase size={22} className={`shrink-0 ${role === 'lawyer' ? 'text-[#8C6D3B]' : 'text-slate-400'}`} />
              <div className={`font-bold text-xs sm:text-sm leading-tight break-words ${role === 'lawyer' ? 'text-[#8C6D3B]' : 'text-slate-800'}`}>
                Advocate / Lawyer
              </div>
              <div className="text-[10px] sm:text-[11px] text-slate-500 leading-tight">
                Bar Council verified
              </div>
            </button>
          </div>
        </div>

        {/* Google Signup Button */}
        <button
          type="button"
          onClick={handleGoogleSignUp}
          disabled={googleLoading || loading}
          className="w-full h-11 flex items-center justify-center gap-3 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-sm font-semibold transition-all cursor-pointer shadow-xs disabled:opacity-50 shrink-0"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" className="shrink-0">
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
            <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
          </svg>
          <span className="truncate">Sign up with Google</span>
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 text-slate-400 text-xs font-semibold select-none">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="shrink-0 tracking-wider text-[11px] sm:text-xs">OR REGISTER WITH EMAIL</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        {/* Registration Form */}
        <form onSubmit={handleRegister} className="flex flex-col gap-4 w-full">
          <Input
            label="Full Legal Name"
            type="text"
            placeholder={role === 'lawyer' ? 'Advocate Ali Khan' : 'Ahmed Hassan'}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            icon={<User size={16} />}
            required
          />

          <Input
            label="Email Address"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<Mail size={16} />}
            required
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<Lock size={16} />}
            helperText="Minimum 8 characters with at least 1 uppercase letter and 1 number."
            required
          />

          {/* City Selection */}
          <div className="flex flex-col gap-1.5 w-full">
            <label htmlFor="register-city" className="text-xs font-semibold uppercase tracking-wider text-slate-700 select-none">
              Primary Jurisdiction City
            </label>
            <div className="relative flex items-center w-full">
              <div className="absolute inset-y-0 left-0 w-11 flex items-center justify-center pointer-events-none text-slate-400 z-10">
                <MapPin size={16} />
              </div>
              <select
                id="register-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full h-11 pl-11 pr-10 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-slate-900 text-sm font-medium focus:bg-white focus:border-[#1A365D] focus:ring-3 focus:ring-[#1A365D]/10 transition-all outline-none shadow-xs appearance-none cursor-pointer"
              >
                {CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 w-10 flex items-center justify-center pointer-events-none text-slate-400 z-10">
                <ChevronDown size={16} />
              </div>
            </div>
          </div>

          {/* Lawyer Practice Areas Multi-Select */}
          {role === 'lawyer' && (
            <div className="flex flex-col gap-2 pt-1 w-full">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 select-none">
                  Practice Areas (Select 1 to 5)
                </label>
                <span className="text-[11px] text-slate-400 font-medium">
                  {selectedSpecs.length}/5 selected
                </span>
              </div>
              <div className="flex flex-wrap gap-2 w-full">
                {CANONICAL_PRACTICE_AREAS.map((spec) => {
                  const isSelected = selectedSpecs.includes(spec);
                  return (
                    <button
                      key={spec}
                      type="button"
                      onClick={() => toggleSpec(spec)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 border max-w-full ${
                        isSelected
                          ? 'bg-[#1A365D] text-white border-[#1A365D] shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {isSelected ? (
                        <CheckCircle2 size={13} className="shrink-0 text-[#C5A880]" />
                      ) : (
                        <div className="w-3 h-3 rounded-full border border-slate-300 shrink-0" />
                      )}
                      <span className="truncate">{spec}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              fullWidth
            >
              Complete Registration
            </Button>
          </div>
        </form>

        <div className="text-center text-xs sm:text-sm text-slate-500 pt-2 border-t border-slate-100">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="font-bold text-[#1A365D] hover:underline cursor-pointer ml-1"
          >
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
};
