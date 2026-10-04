import React from 'react';
import { Header } from './Header';
import { DesktopSidebar } from './DesktopSidebar';
import { MobileBottomNav } from './MobileBottomNav';
import { PwaInstallBanner } from './PwaInstallBanner';
import { ToastContainer } from '../common/ToastContainer';

interface ResponsiveLayoutProps {
  children: React.ReactNode;
}

export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-900 antialiased">
      <PwaInstallBanner />
      <Header />

      <div className="flex flex-1 relative w-full overflow-hidden">
        {/* Desktop Sidebar (visible on md+, hidden on mobile) */}
        <div className="hidden md:block shrink-0">
          <DesktopSidebar />
        </div>

        {/* Main Workspace Area */}
        <main className="flex-1 min-w-0 overflow-y-auto pb-24 md:pb-10 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation (visible on mobile, hidden on md+) */}
      <MobileBottomNav />
      <ToastContainer />
    </div>
  );
};
