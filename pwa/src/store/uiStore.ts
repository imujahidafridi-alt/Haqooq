import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface UiState {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeChatId: string | null;
  activeChatTitle: string | null;
  openChat: (chatId: string, title?: string) => void;
  closeChat: () => void;
  publicProfileUserId: string | null;
  openPublicProfile: (userId: string) => void;
  closePublicProfile: () => void;
  toasts: ToastMessage[];
  addToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  removeToast: (id: string) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      activeTab: 'cases',
      setActiveTab: (tab) => set({ activeTab: tab }),
  activeChatId: null,
  activeChatTitle: null,
  openChat: (chatId, title = 'Active Chat') => set({ activeChatId: chatId, activeChatTitle: title }),
  closeChat: () => set({ activeChatId: null, activeChatTitle: null }),
  publicProfileUserId: null,
  openPublicProfile: (userId) => set({ publicProfileUserId: userId }),
  closePublicProfile: () => set({ publicProfileUserId: null }),
  toasts: [],
  addToast: (message, type = 'info') => {
    const id = Date.now().toString() + Math.random().toString().slice(2, 6);
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }]
    }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id)
      }));
    }, 4000);
  },
      removeToast: (id) => set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id)
      })),
    }),
    {
      name: 'haqooq_pwa_ui',
      partialize: (state) => ({ activeTab: state.activeTab }),
    }
  )
);

export const useUIStore = useUiStore;
