import { PublicLawyerProfile } from '../types/models';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { searchFiltersSchema } from '../types/schemas';

export interface SearchFilters {
  query?: string;
  category?: string;
  specialization?: string;
  city?: string;
  sortBy?: 'recommended' | 'rating' | 'experience';
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

export const calculateDiscoveryScore = (
  rating: number = 0,
  ratingCount: number = 0,
  experienceYears: number = 0
): number => {
  return Number(((rating * Math.log10(ratingCount + 2)) + (experienceYears * 0.1)).toFixed(2));
};

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

export const searchAdvocatesPaginated = async (
  rawFilters: Partial<SearchFilters> = {}
): Promise<SearchResultPage> => {
  const filters = searchFiltersSchema.parse({
    ...DEFAULT_SEARCH_FILTERS,
    ...rawFilters,
  });

  const pageSize = filters.pageSize || 15;
  const page = filters.page || 0;

  // Query strictly verified lawyers
  const q = query(
    collection(db, 'users'),
    where('role', '==', 'lawyer'),
    where('status', '==', 'verified')
  );

  const snapshot = await getDocs(q);
  let allMatches: PublicLawyerProfile[] = [];

  snapshot.forEach((document) => {
    const data = document.data();
    const rawSpecializations = Array.isArray(data.specialization) ? data.specialization : [];
    const experienceYears = typeof data.experienceYears === 'number' ? data.experienceYears : 0;
    const rating = typeof data.rating === 'number' ? data.rating : 0;
    const ratingCount = typeof data.ratingCount === 'number' ? data.ratingCount : 0;
    const isPremium = Boolean(data.isPremium);

    const calculatedScore = calculateDiscoveryScore(rating, ratingCount, experienceYears);

    // Sanitized Public Projection (Zero PII)
    const profile: PublicLawyerProfile = {
      id: document.id,
      displayName: data.displayName || 'Advocate',
      photoURL: data.photoURL || null,
      city: data.city || 'Pakistan',
      specialization: rawSpecializations,
      experienceYears,
      rating,
      ratingCount,
      isPremium,
      discoveryScore: calculatedScore,
      status: 'verified',
    };

    allMatches.push(profile);
  });

  // Client-side filtering
  const targetCategory = (rawFilters.specialization || filters.category || '').toLowerCase().trim();
  if (targetCategory && targetCategory !== 'all') {
    allMatches = allMatches.filter((adv) =>
      adv.specialization.some((s) => s.toLowerCase().includes(targetCategory))
    );
  }

  if (filters.city && filters.city !== 'All Cities' && filters.city.trim() !== '') {
    const targetCity = filters.city.toLowerCase().trim();
    allMatches = allMatches.filter(
      (adv) => adv.city.toLowerCase().trim() === targetCity
    );
  }

  if (filters.query && filters.query.trim().length > 0) {
    const qLower = filters.query.toLowerCase().trim();
    allMatches = allMatches.filter((adv) => {
      const nameMatch = adv.displayName.toLowerCase().includes(qLower);
      const specMatch = adv.specialization.some((s) =>
        s.toLowerCase().includes(qLower)
      );
      const cityMatch = adv.city.toLowerCase().includes(qLower);
      return nameMatch || specMatch || cityMatch;
    });
  }

  allMatches.sort((a, b) => compareAdvocates(a, b, filters.sortBy));

  const totalCount = allMatches.length;
  const startIndex = page * pageSize;
  const endIndex = startIndex + pageSize;
  const pageAdvocates = allMatches.slice(startIndex, endIndex);
  const hasMore = endIndex < totalCount;

  return {
    advocates: pageAdvocates,
    totalCount,
    page,
    hasMore,
  };
};

export const searchService = {
  searchAdvocatesPaginated,
};
