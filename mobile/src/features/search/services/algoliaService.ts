import { PublicLawyerProfile } from '../../../types/models';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../services/firebaseConfig';
import { searchFiltersSchema, publicLawyerProfileSchema } from '../../../types/schemas';

export interface SearchFilters {
  query: string;
  category: string;
  city: string;
  sortBy: 'recommended' | 'rating' | 'experience';
  page?: number;
  pageSize?: number;
}

export const DEFAULT_SEARCH_FILTERS: SearchFilters = {
  query: '',
  category: 'All',
  city: '',
  sortBy: 'recommended',
  page: 0,
  pageSize: 15,
};

export interface SearchResultPage {
  advocates: PublicLawyerProfile[];
  totalCount: number;
  page: number;
  hasMore: boolean;
}

/**
 * Precomputes discovery quality score based on verified customer rating, review volume, and experience.
 * Note: isPremium is strictly reserved for presentation (PRO badge) and does NOT distort organic scores.
 */
export const calculateDiscoveryScore = (
  rating: number = 0,
  ratingCount: number = 0,
  experienceYears: number = 0
): number => {
  return Number(((rating * Math.log10(ratingCount + 2)) + (experienceYears * 0.1)).toFixed(2));
};

/**
 * Deterministic comparison helper applying strict tie-breaking across all sorting modes.
 */
const compareAdvocates = (
  a: PublicLawyerProfile, 
  b: PublicLawyerProfile, 
  sortBy: 'recommended' | 'rating' | 'experience'
): number => {
  if (sortBy === 'rating') {
    if (b.rating !== a.rating) return b.rating - a.rating;
    if (b.ratingCount !== a.ratingCount) return b.ratingCount - a.ratingCount;
    if (b.experienceYears !== a.experienceYears) return b.experienceYears - a.experienceYears;
    return a.id.localeCompare(b.id);
  }

  if (sortBy === 'experience') {
    if (b.experienceYears !== a.experienceYears) return b.experienceYears - a.experienceYears;
    if (b.rating !== a.rating) return b.rating - a.rating;
    if (b.ratingCount !== a.ratingCount) return b.ratingCount - a.ratingCount;
    return a.id.localeCompare(b.id);
  }

  // 'recommended' default:
  if (b.discoveryScore !== a.discoveryScore) return b.discoveryScore - a.discoveryScore;
  if (b.rating !== a.rating) return b.rating - a.rating;
  if (b.ratingCount !== a.ratingCount) return b.ratingCount - a.ratingCount;
  if (b.experienceYears !== a.experienceYears) return b.experienceYears - a.experienceYears;
  return a.id.localeCompare(b.id);
};

/**
 * Executes paginated advocate discovery against verified records.
 * Enforces verified-only security invariant, sanitizes PII, applies deterministic ranking,
 * and paginates with exact boundaries.
 */
export const searchAdvocatesPaginated = async (
  rawFilters: Partial<SearchFilters> = {}
): Promise<SearchResultPage> => {
  try {
    const filters = searchFiltersSchema.parse({
      ...DEFAULT_SEARCH_FILTERS,
      ...rawFilters,
    });

    const pageSize = filters.pageSize || 15;
    const page = filters.page || 0;

    // Strict verified-only server query:
    const q = query(
      collection(db, 'users'),
      where('role', '==', 'lawyer'),
      where('status', '==', 'verified')
    );

    const snapshot = await getDocs(q);
    let allMatches: PublicLawyerProfile[] = [];

    snapshot.forEach((document) => {
      const data = document.data();
      const raw = {
        id: document.id,
        displayName: data.displayName || 'Advocate',
        photoURL: data.photoURL || null,
        city: data.city || 'Pakistan',
        specialization: Array.isArray(data.specialization) ? data.specialization : [],
        experienceYears: typeof data.experienceYears === 'number' ? data.experienceYears : 0,
        rating: typeof data.rating === 'number' ? data.rating : 0,
        ratingCount: typeof data.ratingCount === 'number' ? data.ratingCount : 0,
        isPremium: Boolean(data.isPremium),
        discoveryScore: typeof data.discoveryScore === 'number' 
          ? data.discoveryScore 
          : calculateDiscoveryScore(data.rating, data.ratingCount, data.experienceYears),
        status: 'verified' as const,
      };

      const parsed = publicLawyerProfileSchema.safeParse(raw);
      if (parsed.success) {
        allMatches.push(parsed.data as PublicLawyerProfile);
      }
    });

    // Client-side text matching & facet filtering
    if (filters.query.trim()) {
      const qLower = filters.query.toLowerCase().trim();
      allMatches = allMatches.filter((advocate) => {
        const nameMatch = advocate.displayName.toLowerCase().includes(qLower);
        const cityMatch = advocate.city.toLowerCase().includes(qLower);
        const specMatch = advocate.specialization.some((s) => s.toLowerCase().includes(qLower));
        return nameMatch || cityMatch || specMatch;
      });
    }

    if (filters.category && filters.category !== 'All') {
      const catLower = filters.category.toLowerCase().trim();
      allMatches = allMatches.filter((advocate) =>
        advocate.specialization.some((s) => s.toLowerCase().includes(catLower))
      );
    }

    if (filters.city && filters.city.trim()) {
      const cityLower = filters.city.toLowerCase().trim();
      allMatches = allMatches.filter((advocate) =>
        advocate.city.toLowerCase() === cityLower
      );
    }

    // Apply strict deterministic sorting with tie-breakers:
    allMatches.sort((a, b) => compareAdvocates(a, b, filters.sortBy));

    const totalCount = allMatches.length;
    const startIndex = page * pageSize;
    const paginatedItems = allMatches.slice(startIndex, startIndex + pageSize);
    const hasMore = startIndex + pageSize < totalCount;

    return {
      advocates: paginatedItems,
      totalCount,
      page,
      hasMore,
    };
  } catch (error) {
    console.error('[DiscoveryService Error] Failed to search advocates:', error);
    return {
      advocates: [],
      totalCount: 0,
      page: 0,
      hasMore: false,
    };
  }
};

/**
 * Backwards compatibility wrapper for simple query execution.
 */
export const executeAlgoliaSearch = async (rawFilters: any): Promise<PublicLawyerProfile[]> => {
  const result = await searchAdvocatesPaginated({
    query: rawFilters?.query || '',
    category: rawFilters?.category || 'All',
    city: rawFilters?.city || '',
    sortBy: rawFilters?.sortBy || 'recommended',
    page: 0,
    pageSize: 50,
  });
  return result.advocates;
};
