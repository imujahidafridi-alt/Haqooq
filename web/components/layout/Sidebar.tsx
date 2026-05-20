"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, FileSearch, ShieldCheck, BarChart3, Sparkles, Settings, Bell } from 'lucide-react';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: Home },
  { label: 'Users', href: '/users', icon: Users },
  { label: 'Cases', href: '/cases', icon: FileSearch },
  { label: 'Reports', href: '/reports', icon: ShieldCheck },
  { label: 'Finance', href: '/finance', icon: BarChart3 },
  { label: 'Notifications', href: '/notifications', icon: Bell },
  { label: 'Settings', href: '/settings', icon: Settings }
];

export const Sidebar = () => {
  const pathname = usePathname();

  return (
    <aside className="w-72 min-h-screen border-r border-slate-800 bg-slate-950/90 backdrop-blur-xl p-6">
      <div className="mb-10">
        <p className="text-xs uppercase tracking-[0.36em] text-slate-500">Haqooq Admin</p>
        <h1 className="mt-3 text-2xl font-semibold text-white">Governance Portal</h1>
        <p className="mt-2 text-sm text-slate-400">Legal transparency & operations control.</p>
      </div>
      <nav className="space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                active ? 'bg-slate-800 text-white shadow-lg shadow-slate-900/30' : 'text-slate-300 hover:bg-slate-900 hover:text-white'
              }`}>
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};
