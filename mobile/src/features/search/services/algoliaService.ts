import { LawyerProfile } from '../../../types/models';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../services/firebaseConfig';

export interface SearchFilters {
  query: string;
  category?: string;
  city?: string;
  minExperience?: number;
}

/**
 * Searches the Firestore for lawyers using explicitly provided query filters.
 * Replaces the mock Algolia integration.
 */
export const executeAlgoliaSearch = async (filters: SearchFilters): Promise<LawyerProfile[]> => {
  try {
    let q = query(
      collection(db, 'users'),
      where('role', '==', 'lawyer'),
      where('status', '==', 'verified')
    );

    const snapshot = await getDocs(q);
    let results: LawyerProfile[] = [];

    snapshot.forEach((doc) => {
      results.push(doc.data() as LawyerProfile);
    });

    // Client-side filtering due to Firestore compound query limitations
    // 1. Text Search matching
    if (filters.query) {
      const qs = filters.query.toLowerCase();
      results = results.filter(l => 
        l.displayName?.toLowerCase().includes(qs) || 
        l.specialization?.some(s => s.toLowerCase().includes(qs))
      );
    }

    // 2. Facet filters
    if (filters.category && filters.category !== 'All') {
      results = results.filter(l => l.specialization?.includes(filters.category!));
    }

    if (filters.city) {
      results = results.filter(l => l.city?.toLowerCase() === filters.city!.toLowerCase());
    }

    if (filters.minExperience) {
      results = results.filter(l => (l.experienceYears || 0) >= filters.minExperience!);
    }

    // 3. Ranking Optimization (Premium users surface first, then by rating)
    results.sort((a, b) => {
      if (a.isPremium && !b.isPremium) return -1;
      if (!a.isPremium && b.isPremium) return 1;
      return (b.rating || 0) - (a.rating || 0);
    });

    return results;
  } catch (error) {
    console.error('Error fetching lawyers from Firestore:', error);
    return [];
  }
};
