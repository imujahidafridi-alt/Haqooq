import { create } from 'zustand';

export interface LegalCase {
  id: string;
  clientId: string;
  title: string;
  description: string;
  category: string;
  budget?: string;
  status: 'open' | 'active' | 'closed';
  timeline: TimelineEvent[];
}

export interface TimelineEvent {
  id: string;
  title: string;
  date: string;
  description?: string;
}

interface CaseState {
  activeCases: LegalCase[];
  selectedCase: LegalCase | null;
  setCases: (cases: LegalCase[]) => void;
  setSelectedCase: (selected: LegalCase | null) => void;
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
}

export const useCaseStore = create<CaseState>((set) => ({
  activeCases: [],
  selectedCase: null,
  isLoading: false,
  setCases: (cases) => set({ activeCases: cases, isLoading: false }),
  setSelectedCase: (selected) => set({ selectedCase: selected }),
  setLoading: (loading) => set({ isLoading: loading }),
}));
