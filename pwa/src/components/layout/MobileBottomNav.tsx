import React from 'react';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import {
  Search,
  Briefcase,
  PlusCircle,
  MessageSquare,
  User,
  Compass,
  Zap,
} from 'lucide-react';

export const MobileBottomNav: React.FC = () => {
  const { user } = useAuthStore();
  const { activeTab, setActiveTab } = useUiStore();

  const isLawyer = user?.role === 'lawyer';

  const clientNavItems = [
    { id: 'search', label: 'Advocates', icon: Search },
    { id: 'cases', label: 'My Cases', icon: Briefcase },
    { id: 'post', label: 'Post', icon: PlusCircle, isPrimary: true },
    { id: 'inbox', label: 'Messages', icon: MessageSquare },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const lawyerNavItems = [
    { id: 'feed', label: 'Market', icon: Compass },
    { id: 'my_cases', label: 'Retainers', icon: Briefcase },
    { id: 'pro', label: 'Credits', icon: Zap },
    { id: 'inbox', label: 'Messages', icon: MessageSquare },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const navItems = isLawyer ? lawyerNavItems : clientNavItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200/90 shadow-lg pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          if ((item as any).isPrimary) {
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className="flex flex-col items-center justify-center -mt-5 cursor-pointer"
              >
                <div className="w-12 h-12 rounded-full bg-[#1A365D] text-white flex items-center justify-center shadow-md active:scale-95 transition-transform">
                  <Icon size={22} />
                </div>
                <span className="text-[10px] font-bold text-[#1A365D] mt-1">
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-colors cursor-pointer ${
                isActive ? 'text-[#1A365D]' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icon size={20} className={isActive ? 'stroke-[2.5]' : 'stroke-2'} />
              <span
                className={`text-[10px] mt-0.5 tracking-tight ${
                  isActive ? 'font-bold text-[#1A365D]' : 'font-medium'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
