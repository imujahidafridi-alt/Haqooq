import React from 'react';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { Avatar } from '../common/Avatar';
import { Badge } from '../common/Badge';
import { PlusCircle, Zap, Scale } from 'lucide-react';

export const Header: React.FC = () => {
  const { user } = useAuthStore();
  const { setActiveTab } = useUiStore();

  const isLawyer = user?.role === 'lawyer';

  return (
    <header className="sticky top-0 z-40 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between transition-colors shadow-2xs">
      {/* Brand logo & tagline */}
      <div
        className="flex items-center gap-3 cursor-pointer group"
        onClick={() => setActiveTab(isLawyer ? 'feed' : 'cases')}
      >
        <div className="relative w-9 h-9 shrink-0">
          <img
            src="/logo.png"
            alt="Haqooq Logo"
            className="w-9 h-9 rounded-xl object-contain shadow-xs group-hover:scale-105 transition-transform"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const fallback = e.currentTarget.parentElement?.querySelector('.header-fallback-icon');
              if (fallback) (fallback as HTMLElement).style.display = 'flex';
            }}
          />
          <div className="header-fallback-icon hidden w-9 h-9 rounded-xl bg-[#1A365D] items-center justify-center text-[#C5A880] shadow-xs">
            <Scale size={20} />
          </div>
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-xl text-[#1A365D] tracking-tight">
              Haqooq
            </span>
            <span className="text-[11px] font-bold text-[#8C6D3B] bg-[#F7F4EF] border border-[#C5A880]/30 px-1.5 py-0.5 rounded tracking-wider uppercase">
              Legal
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium hidden sm:block">
            Empowering Your Legal Rights
          </span>
        </div>
      </div>

      {/* Header action items */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Quick action for client: Post Matter */}
        {user?.role === 'client' && (
          <button
            type="button"
            onClick={() => setActiveTab('post')}
            className="hidden sm:inline-flex items-center gap-2 bg-[#1A365D] hover:bg-[#234574] text-white text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl shadow-xs transition-all active:scale-[0.98] cursor-pointer"
          >
            <PlusCircle size={16} />
            <span>Post Legal Case</span>
          </button>
        )}

        {/* Lawyer Pro Credits shortcut */}
        {isLawyer && (
          <button
            type="button"
            onClick={() => setActiveTab('pro')}
            className="flex items-center gap-2 bg-amber-50 hover:bg-amber-100/80 border border-amber-200 text-amber-900 text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-xl transition-all cursor-pointer"
          >
            <Zap size={15} className="text-amber-600 fill-amber-500" />
            <span>{(user as any)?.credits ?? 0}</span>
            <span className="text-amber-700/80 font-normal hidden md:inline">Credits</span>
          </button>
        )}


        {/* User profile capsule */}
        {user && (
          <div
            onClick={() => setActiveTab('profile')}
            className="flex items-center gap-2.5 pl-2 pr-1.5 py-1 rounded-full hover:bg-slate-100/80 border border-transparent hover:border-slate-200 transition-all cursor-pointer"
          >
            <div className="hidden lg:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-800 leading-tight">
                {user.displayName || 'Member'}
              </span>
              <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">
                {user.status === 'verified' ? 'Verified' : user.role}
              </span>
            </div>
            <Avatar
              name={user.displayName || 'Member'}
              src={user.photoURL}
              size="sm"
            />
          </div>
        )}
      </div>
    </header>
  );
};
