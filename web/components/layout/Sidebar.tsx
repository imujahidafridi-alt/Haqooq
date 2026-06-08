"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, FileSearch, ShieldCheck, BarChart3, Sparkles, Settings, Bell, History, X } from 'lucide-react';

const navGroups = [
  {
    group: 'Core Governance',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: Home },
      { label: 'Users Directory', href: '/users', icon: Users },
      { label: 'Case Management', href: '/cases', icon: FileSearch }
    ]
  },
  {
    group: 'Surveillance & Reports',
    items: [
      { label: 'Surveillance Stream', href: '/surveillance', icon: ShieldCheck },
      { label: 'User Complaints', href: '/reports', icon: ShieldCheck },
      { label: 'System Notifications', href: '/notifications', icon: Bell }
    ]
  },
  {
    group: 'Financial Ledger',
    items: [
      { label: 'Credit Packages', href: '/credits', icon: Sparkles },
      { label: 'Transaction Ledger', href: '/finance', icon: BarChart3 }
    ]
  },
  {
    group: 'Settings & Trail',
    items: [
      { label: 'Audit Logs Trail', href: '/audit', icon: History },
      { label: 'App Settings', href: '/settings', icon: Settings }
    ]
  }
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const pathname = usePathname();

  const SidebarContent = () => (
    <div className="flex h-full flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.36em] text-slate-500">Haqooq Admin</p>
            <h1 className="mt-2.5 text-2xl font-bold text-white tracking-tight">Governance</h1>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-800 p-2 text-slate-400 hover:bg-slate-900 hover:text-white lg:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <nav className="space-y-6">
          {navGroups.map((group) => (
            <div key={group.group} className="space-y-2">
              <h3 className="px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-550">
                {group.group}
              </h3>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const active = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                        active
                          ? 'bg-brand-500/10 text-brand-400 border-l-2 border-brand-500 shadow-md shadow-brand-500/5'
                          : 'text-slate-350 hover:bg-slate-900 hover:text-white'
                      }`}
                    >
                      <Icon className="h-4.5 w-4.5" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      <div className="mt-auto border-t border-slate-850 pt-4 text-[10px] text-slate-500 font-medium tracking-wider text-center uppercase">
        v1.0.0 Stable
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (persistent) */}
      <aside className="hidden w-72 min-h-screen border-r border-slate-800 bg-slate-950/85 p-6 lg:block backdrop-blur-xl shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Drawer (conditional sliding panel) */}
      <div
        className={`fixed inset-0 z-50 flex lg:hidden transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Backdrop overlay */}
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
        />

        {/* Sidebar container */}
        <aside
          className={`relative flex w-72 max-w-xs flex-col border-r border-slate-800 bg-slate-950 p-6 transition-transform duration-300 ease-in-out h-full ${
            isOpen ? 'translate-x-0' : '-translate-x-0'
          }`}
        >
          <SidebarContent />
        </aside>
      </div>
    </>
  );
};
