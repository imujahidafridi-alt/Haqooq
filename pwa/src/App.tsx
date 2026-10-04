import React, { useEffect, useState } from 'react';
import { useAuthStore } from './store/authStore';
import { useUIStore } from './store/uiStore';
import { ResponsiveLayout } from './components/layout/ResponsiveLayout';
import { ToastContainer } from './components/common/ToastContainer';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { Scale } from 'lucide-react';

// Auth Views
import { LoginView } from './features/auth/LoginView';
import { RegisterView } from './features/auth/RegisterView';

// Client Views
import { ActiveCasesView } from './features/client/ActiveCasesView';
import { PostCaseView } from './features/client/PostCaseView';

// Lawyer Views
import { CaseFeedView } from './features/lawyer/CaseFeedView';
import { LawyerCasesView } from './features/lawyer/LawyerCasesView';
import { ProServicesView } from './features/lawyer/ProServicesView';
import { PendingApprovalView } from './features/lawyer/PendingApprovalView';

// Search & Chat Views
import { SearchAdvocatesView } from './features/search/SearchAdvocatesView';
import { InboxView } from './features/chat/InboxView';

// Shared Views
import { ProfileView } from './features/shared/ProfileView';

// Firebase Auth & Firestore Listener
import { auth, db } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { UserProfile, LawyerProfile } from './types/models';

export const App: React.FC = () => {
  const { user, setUser, isLoading, setLoading } = useAuthStore();
  const { activeTab, setActiveTab } = useUIStore();

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [activeChatContext, setActiveChatContext] = useState<{ id: string; title: string } | null>(null);

  // Synchronize Firebase Auth state
  useEffect(() => {
    // Safety fallback timer: Ensure spinner never hangs longer than 2s on network/refresh
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 2000);

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Real-time listener for user profile in Firestore
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const unsubscribeProfile = onSnapshot(
          userDocRef,
          (docSnap) => {
            clearTimeout(safetyTimer);
            if (docSnap.exists()) {
              const profileData = docSnap.data() as UserProfile | LawyerProfile;
              setUser(profileData);
            } else {
              // Minimal fallback
              setUser({
                id: firebaseUser.uid,
                email: firebaseUser.email || '',
                displayName: firebaseUser.displayName || 'User',
                photoURL: firebaseUser.photoURL || null,
                role: 'client',
                status: 'pending',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
            }
            setLoading(false);
          },
          (err) => {
            clearTimeout(safetyTimer);
            console.error('Firestore user profile listener error:', err);
            setLoading(false);
          }
        );

        return () => {
          clearTimeout(safetyTimer);
          unsubscribeProfile();
        };
      } else {
        clearTimeout(safetyTimer);
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(safetyTimer);
      unsubscribeAuth();
    };
  }, [setUser, setLoading]);

  // Handle starting a chat from advocate directory or proposals
  const handleStartChat = (chatId: string, chatTitle: string) => {
    setActiveChatContext({ id: chatId, title: chatTitle });
    setActiveTab('inbox');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-950 bg-[radial-gradient(ellipse_at_50%_0%,#1A365D_0%,#020617_80%)] text-white p-6">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="relative">
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-[#C5A880] to-blue-500 opacity-30 blur-md animate-pulse" />
            
            <div className="relative w-16 h-16 rounded-2xl bg-[#1A365D] border border-white/10 flex items-center justify-center shadow-2xl">
              <img
                src="/logo.png"
                alt="Haqooq Legal Portal"
                className="w-12 h-12 rounded-xl object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.parentElement?.querySelector('.fallback-icon');
                  if (fallback) (fallback as HTMLElement).style.display = 'flex';
                }}
              />
              <div className="fallback-icon hidden items-center justify-center text-[#C5A880]">
                <Scale size={32} />
              </div>
            </div>
          </div>

          <div className="text-center space-y-1">
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
              <span>Haqooq</span>
              <span className="text-xs font-bold text-[#C5A880] bg-white/10 border border-[#C5A880]/30 px-1.5 py-0.5 rounded tracking-widest uppercase">
                Legal
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Empowering Your Legal Rights Across Pakistan
            </p>
          </div>

          <div className="flex flex-col items-center gap-2 mt-3">
            <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-[#C5A880] animate-spin" />
            <span className="text-[11px] font-medium tracking-wide text-slate-400">
              Synchronizing workspace...
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    if (authMode === 'login') {
      return (
        <>
          <LoginView onSwitchToRegister={() => setAuthMode('register')} />
          <ToastContainer />
        </>
      );
    }
    return (
      <>
        <RegisterView onSwitchToLogin={() => setAuthMode('login')} />
        <ToastContainer />
      </>
    );
  }

  // Lawyer Gate: If lawyer is not verified yet or suspended, show compliance gate
  if (user.role === 'lawyer' && user.status !== 'verified') {
    return (
      <>
        <PendingApprovalView />
        <ToastContainer />
      </>
    );
  }

  // Path Protection & Role Guard: Ensure activeTab is strictly authorized for the current user role
  useEffect(() => {
    if (!user) return;

    if (user.role === 'lawyer') {
      const lawyerAllowedTabs = ['feed', 'my_cases', 'pro', 'search', 'inbox', 'profile'];
      if (!lawyerAllowedTabs.includes(activeTab)) {
        setActiveTab('feed');
      }
    } else if (user.role === 'client') {
      const clientAllowedTabs = ['cases', 'post', 'search', 'inbox', 'profile'];
      if (!clientAllowedTabs.includes(activeTab)) {
        setActiveTab('cases');
      }
    }
  }, [user?.role, activeTab, setActiveTab]);

  // Main Authenticated Application with Strict Role Route Protection
  const renderCurrentView = () => {
    // 1. Advocate Counsel Workspace Paths
    if (user.role === 'lawyer') {
      switch (activeTab) {
        case 'feed':
          return <CaseFeedView />;
        case 'my_cases':
          return <LawyerCasesView />;
        case 'pro':
          return <ProServicesView />;
        case 'search':
          return <SearchAdvocatesView onStartChat={handleStartChat} />;
        case 'inbox':
          return (
            <InboxView
              initialChatId={activeChatContext?.id}
              initialChatTitle={activeChatContext?.title}
            />
          );
        case 'profile':
          return <ProfileView />;
        default:
          // Strictly protect lawyer workspace: client tabs like 'cases' or 'post' immediately resolve to lawyer marketplace
          return <CaseFeedView />;
      }
    }

    // 2. Client Citizen Workspace Paths
    if (user.role === 'client') {
      switch (activeTab) {
        case 'cases':
          return <ActiveCasesView onPostNewCase={() => setActiveTab('post')} />;
        case 'post':
          return <PostCaseView onSuccess={() => setActiveTab('cases')} />;
        case 'search':
          return <SearchAdvocatesView onStartChat={handleStartChat} />;
        case 'inbox':
          return (
            <InboxView
              initialChatId={activeChatContext?.id}
              initialChatTitle={activeChatContext?.title}
            />
          );
        case 'profile':
          return <ProfileView />;
        default:
          // Strictly protect client workspace: lawyer tabs like 'feed' or 'my_cases' resolve to client cases
          return <ActiveCasesView onPostNewCase={() => setActiveTab('post')} />;
      }
    }

    // Fallback for any other session
    return <ActiveCasesView onPostNewCase={() => setActiveTab('post')} />;
  };

  return (
    <ResponsiveLayout>
      {renderCurrentView()}
      <ToastContainer />
    </ResponsiveLayout>
  );
};
