import React from 'react';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import {
  PlusCircle,
  Search,
  Briefcase,
  MessageSquare,
  User,
  Compass,
  Zap,
  LogOut,
  HelpCircle,
  PhoneCall,
  Scale,
} from 'lucide-react';
import { logoutUser } from '../../services/authService';

export const DesktopSidebar: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { activeTab, setActiveTab, addToast } = useUiStore();

  const isLawyer = user?.role === 'lawyer';

  const clientNavItems = [
    { id: 'search', label: 'Find Advocate', icon: Search, badge: 'Verified' },
    { id: 'cases', label: 'My Cases', icon: Briefcase },
    { id: 'post', label: 'Post Legal Case', icon: PlusCircle },
    { id: 'inbox', label: 'Messages', icon: MessageSquare },
    { id: 'profile', label: 'Profile & Settings', icon: User },
  ];

  const lawyerNavItems = [
    { id: 'feed', label: 'Case Marketplace', icon: Compass, badge: 'Live' },
    { id: 'my_cases', label: 'Active Retainers', icon: Briefcase },
    { id: 'pro', label: 'Pro Credits', icon: Zap },
    { id: 'search', label: 'Advocate Directory', icon: Search },
    { id: 'inbox', label: 'Messages', icon: MessageSquare },
    { id: 'profile', label: 'Profile & Practice', icon: User },
  ];

  const navItems = isLawyer ? lawyerNavItems : clientNavItems;

  const handleLogout = async () => {
    try {
      await logoutUser();
      logout();
      addToast('Signed out successfully.', 'info');
    } catch {
      logout();
    }
  };

  return (
    <aside className="w-64 lg:w-72 bg-white border-r border-slate-200/90 flex flex-col justify-between shrink-0 h-[calc(100vh-64px)] sticky top-16 select-none p-4 shadow-xs">
      {/* Top Nav Section */}
      <div className="flex flex-col gap-5">
        {/* Role identifier badge */}
        <div className="px-3 pt-1 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Scale size={13} className="text-[#1A365D]" />
            <span>{isLawyer ? 'Advocate Counsel Workspace' : 'Client Citizen Workspace'}</span>
          </span>
        </div>

        {/* Navigation items list */}
        <nav className="flex flex-col gap-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-[#1A365D] text-white shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 font-medium'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} className={isActive ? 'text-white' : 'text-slate-400'} />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}


        </nav>
      </div>

      {/* Bottom section: Helpline Card & Logout */}
      <div className="flex flex-col gap-3 pt-3 border-t border-slate-100">
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <PhoneCall size={14} className="text-emerald-600" />
            <span>24/7 Legal Helpline</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Need urgent assistance? Connect with our support desk.
          </p>
          <a
            href="tel:03001234567"
            className="text-xs font-semibold text-[#1A365D] hover:underline mt-0.5"
          >
            +92 300 1234567
          </a>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
