import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '../common/Button';

export const PwaInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    // Check if dismissed before
    const isDismissed = localStorage.getItem('haqooq_pwa_banner_dismissed');
    if (isDismissed) return;

    // Detect iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isStandalone = (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches;

    if (isIosDevice && !isStandalone) {
      setIsIos(true);
      setShowBanner(true);
      return;
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('haqooq_pwa_banner_dismissed', 'true');
  };

  if (!showBanner) return null;

  return (
    <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between gap-3 border-b border-slate-800 text-xs sm:text-sm z-50">
      <div className="flex items-center gap-3">
        <img
          src="/icon.png"
          alt="App Icon"
          className="w-8 h-8 rounded-lg shrink-0 object-contain shadow-xs"
        />
        <div>
          <div className="font-bold tracking-tight text-slate-100">Install Haqooq PWA</div>
          <div className="text-slate-400 text-xs hidden sm:block">
            {isIos
              ? 'Tap the Share icon & select "Add to Home Screen"'
              : 'Install on your desktop or home screen for fast, offline legal consultation access.'}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {!isIos && deferredPrompt && (
          <Button
            size="sm"
            variant="secondary"
            onClick={handleInstallClick}
            leftIcon={<Download size={14} />}
          >
            Install
          </Button>
        )}
        <button
          onClick={handleDismiss}
          className="text-slate-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
          aria-label="Dismiss banner"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};
