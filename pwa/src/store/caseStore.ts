import { create } from 'zustand';
import { LegalCase } from '../types/models';

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
