import { LawyerProfile } from '../../../types/models';
// import algoliasearch from 'algoliasearch/lite';

// TODO: In production, configure your Algolia index:
// const searchClient = algoliasearch('YOUR_APP_ID', 'YOUR_SEARCH_ONLY_API_KEY');
// const lawyersIndex = searchClient.initIndex('lawyers_index');

export interface SearchFilters {
  query: string;
  category?: string;
  city?: string;
  minExperience?: number;
}

// Dummy Indexed data that would natively sit on an Algolia cluster.
const algoliaMockIndex: LawyerProfile[] = [
  {
    id: 'lawyer-A1',
    role: 'lawyer',
    email: 'alpha@legal.com',
    displayName: 'Ayesha Khan',
    status: 'verified',
    createdAt: 1610000000,
    specialization: ['Family Law', 'Civil Litigation'],
    experienceYears: 12,
    city: 'Lahore',
    rating: 4.9,
    isPremium: true,
    biddingCredits: 50,
  },
  {
    id: 'lawyer-B2',
    role: 'lawyer',
    email: 'bravo@legal.com',
    displayName: 'Usman Tariq',
    status: 'verified',
    createdAt: 1620000000,
    specialization: ['Corporate Law', 'Property / Real Estate Law'],
    experienceYears: 5,
    city: 'Karachi',
    rating: 4.2,
    isPremium: false,
    biddingCredits: 10,
  },
  {
    id: 'lawyer-C3',
    role: 'lawyer',
    email: 'charlie@legal.com',
    displayName: 'Fatima Ali',
    status: 'verified',
    createdAt: 1630000000,
    specialization: ['Criminal Law'],
    experienceYears: 15,
    city: 'Islamabad',
    rating: 5.0,
    isPremium: true,
    biddingCredits: 200,
  }
];

/**
 * Searches the 'Algolia Index' simulating typos, ranking logic, 
 * and explicit filter parameters.
 */
export const executeAlgoliaSearch = async (filters: SearchFilters): Promise<LawyerProfile[]> => {
  // --- REAL ALGOLIA INTEGRATION (Uncomment when ready) ---
  /*
  const filterString = [];
  if (filters.category && filters.category !== 'All') {
    filterString.push(`specialization:"${filters.category}"`);
  }
  if (filters.city) {
    filterString.push(`city:"${filters.city}"`);
  }
  if (filters.minExperience) {
    filterString.push(`experienceYears >= ${filters.minExperience}`);
  }

  const { hits } = await lawyersIndex.search(filters.query, {
    filters: filterString.join(' AND ')
  });
  return hits as unknown as LawyerProfile[];
  */
  // --- END REAL ALGOLIA ---

  return new Promise((resolve) => {
    setTimeout(() => {
      let results = [...algoliaMockIndex];

      // 1. Text Search matching
      if (filters.query) {
        const q = filters.query.toLowerCase();
        results = results.filter(l => 
          l.displayName?.toLowerCase().includes(q) || 
          l.specialization.some(s => s.toLowerCase().includes(q))
        );
      }

      // 2. Facet filters
      if (filters.category && filters.category !== 'All') {
        results = results.filter(l => l.specialization.includes(filters.category!));
      }

      if (filters.city) {
        results = results.filter(l => l.city.toLowerCase() === filters.city!.toLowerCase());
      }

      if (filters.minExperience) {
        results = results.filter(l => l.experienceYears >= filters.minExperience!);
      }

      // 3. Algolia Ranking Simulation (Premium users surface first, then by rating)
      results.sort((a, b) => {
        if (a.isPremium && !b.isPremium) return -1;
        if (!a.isPremium && b.isPremium) return 1;
        return (b.rating || 0) - (a.rating || 0);
      });

      resolve(results);
    }, 600); // 600ms latency to simulate Algolia ping
  });
};
