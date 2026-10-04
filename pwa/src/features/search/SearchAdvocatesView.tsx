import React, { useState, useEffect, useCallback } from 'react';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Avatar } from '../../components/common/Avatar';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { PublicProfileModal } from '../shared/PublicProfileModal';
import { searchService, SearchFilters } from '../../services/searchService';
import { PublicLawyerProfile } from '../../types/models';
import { CITIES } from '../../constants/legalDomains';
import {
  Search,
  Star,
  MapPin,
  Briefcase,
  ChevronRight,
  ShieldCheck,
  Award,
  Sparkles,
  SlidersHorizontal,
} from 'lucide-react';

const CATEGORIES = [
  'All',
  'Corporate Law',
  'Criminal Law',
  'Family Law',
  'Property / Real Estate Law',
  'Civil Litigation',
  'Labor & Employment',
];

interface Props {
  onStartChat?: (chatId: string, chatTitle: string) => void;
}

export const SearchAdvocatesView: React.FC<Props> = ({ onStartChat }) => {
  const [searchInput, setSearchInput] = useState('');
  const [category, setCategory] = useState('All');
  const [city, setCity] = useState('All Cities');
  const [sortBy, setSortBy] = useState<'recommended' | 'rating' | 'experience'>('recommended');

  const [advocates, setAdvocates] = useState<PublicLawyerProfile[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [selectedLawyerId, setSelectedLawyerId] = useState<string | null>(null);

  // Debounced search trigger
  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchInput.trim());
    }, 350);
    return () => clearTimeout(handler);
  }, [searchInput]);

  const fetchAdvocates = useCallback(
    async (currentPage: number, append = false) => {
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }

      try {
        const filters: SearchFilters = {
          query: debouncedQuery,
          city: city === 'All Cities' ? undefined : city,
          specialization: category === 'All' ? undefined : category,
          sortBy,
          page: currentPage,
          pageSize: 12,
        };

        const result = await searchService.searchAdvocatesPaginated(filters);

        if (append) {
          setAdvocates((prev) => {
            const existingIds = new Set(prev.map((a) => a.id));
            const fresh = result.advocates.filter((a: PublicLawyerProfile) => !existingIds.has(a.id));
            return [...prev, ...fresh];
          });
        } else {
          setAdvocates(result.advocates);
        }

        setTotalCount(result.totalCount);
        setHasMore(result.hasMore);
        setPage(currentPage);
      } catch (err) {
        console.error('Failed to search advocates:', err);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [debouncedQuery, category, city, sortBy]
  );

  useEffect(() => {
    fetchAdvocates(0, false);
  }, [fetchAdvocates]);

  const handleLoadMore = () => {
    if (!isLoading && !isLoadingMore && hasMore) {
      fetchAdvocates(page + 1, true);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto">
      {/* Top Search Hero Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1A365D] uppercase tracking-wider bg-blue-50 px-3 py-1 rounded-full mb-2">
              <Award size={14} className="text-[#1A365D]" />
              <span>Official Advocate Directory</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1A365D] tracking-tight">
              Find Bar-Verified Advocates
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Connect directly with verified High Court &amp; District Court advocates across Pakistan.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-4 py-2 rounded-full text-xs font-bold shrink-0 self-start sm:self-auto shadow-2xs">
            <ShieldCheck size={18} className="text-emerald-600" />
            <span>100% Bar Council Verified</span>
          </div>
        </div>

        {/* Search controls */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-6">
            <Input
              label="Search Advocate or Specialty"
              placeholder="Search by advocate name, legal issue, or keyword..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              icon={<Search size={18} />}
            />
          </div>

          <div className="md:col-span-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 select-none block mb-1.5 flex items-center gap-1.5">
              <MapPin size={13} className="text-slate-400" />
              <span>City / Bar Jurisdiction</span>
            </label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full h-11 bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 text-slate-900 text-sm font-medium focus:bg-white focus:border-[#1A365D] focus:ring-3 focus:ring-[#1A365D]/10 transition-all outline-none shadow-xs"
            >
              <option value="All Cities">All Pakistan Cities</option>
              {CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 select-none block mb-1.5 flex items-center gap-1.5">
              <SlidersHorizontal size={13} className="text-slate-400" />
              <span>Sort By</span>
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full h-11 bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 text-slate-900 text-sm font-medium focus:bg-white focus:border-[#1A365D] focus:ring-3 focus:ring-[#1A365D]/10 transition-all outline-none shadow-xs"
            >
              <option value="recommended">Recommended &amp; Elite</option>
              <option value="rating">Top Rated (Client Reviews)</option>
              <option value="experience">Most Experienced (Years)</option>
            </select>
          </div>
        </div>

        {/* Practice Area Filter Pills */}
        <div className="flex flex-col gap-2 pt-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Filter by Practice Area
          </span>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none flex-wrap sm:flex-nowrap">
            {CATEGORIES.map((cat) => {
              const isSelected = category === cat;
              return (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer ${isSelected
                      ? 'bg-[#1A365D] text-white shadow-sm ring-1 ring-[#1A365D]'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 hover:border-slate-300 shadow-2xs'
                    }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Results Header Count */}
      <div className="flex items-center justify-between px-1">
        <div className="text-sm font-medium text-slate-600">
          Showing <span className="font-bold text-slate-900">{totalCount}</span> verified advocates
        </div>
        <div className="text-xs text-slate-500 flex items-center gap-1.5">
          <Sparkles size={14} className="text-[#C5A880]" />
          <span>Verified against Provincial Bar Council records</span>
        </div>
      </div>

      {/* Advocates Grid */}
      {isLoading ? (
        <div className="flex justify-center items-center py-24 bg-white rounded-2xl border border-slate-200/90 shadow-sm">
          <LoadingSpinner size="lg" label="Searching verified advocate roster..." />
        </div>
      ) : advocates.length === 0 ? (
        <EmptyState
          title="No Advocates Found"
          description="Try broadening your search query, switching to 'All Cities', or clearing the practice area filter."
          icon={<Search size={36} />}
          action={{
            label: 'Reset All Filters',
            onClick: () => {
              setSearchInput('');
              setCategory('All');
              setCity('All Cities');
              setSortBy('recommended');
            },
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {advocates.map((advocate) => (
            <div
              key={advocate.id}
              onClick={() => setSelectedLawyerId(advocate.id)}
              className="bg-white rounded-2xl border border-slate-200/90 hover:border-slate-300 shadow-sm hover:shadow-md transition-all duration-200 p-6 flex flex-col justify-between cursor-pointer group relative overflow-hidden"
            >
              {/* Card top banner line */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#1A365D] via-[#2A4365] to-[#C5A880] opacity-80" />

              {advocate.isPremium && (
                <div className="absolute top-4 right-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs flex items-center gap-1">
                  <Star size={10} className="fill-white" />
                  <span>Elite Counsel</span>
                </div>
              )}

              <div className="flex flex-col gap-4">
                {/* Header info */}
                <div className="flex items-start gap-4">
                  <div className="relative shrink-0">
                    <Avatar
                      src={advocate.photoURL}
                      name={advocate.displayName}
                      size="lg"
                    />
                    <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-0.5 rounded-full border-2 border-white">
                      <ShieldCheck size={12} />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 pr-6">
                    <h3 className="font-bold text-lg text-slate-900 truncate group-hover:text-[#1A365D] transition-colors">
                      {advocate.displayName}
                    </h3>

                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                      <MapPin size={13} className="text-slate-400 shrink-0" />
                      <span className="font-medium text-slate-700">{advocate.city}</span>
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md">
                        <Star size={12} className="fill-amber-500 text-amber-500" />
                        <span>{advocate.rating > 0 ? advocate.rating.toFixed(1) : 'New'}</span>
                        <span className="text-amber-700/60 font-normal">
                          ({advocate.ratingCount})
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Briefcase size={11} className="text-slate-500" />
                        <span>{advocate.experienceYears || 0}y Practice</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Advocate Credentials Summary */}
                <div className="text-xs text-slate-500 leading-relaxed bg-slate-50/80 p-3 rounded-xl border border-slate-100 min-h-[48px] flex items-center">
                  <p className="line-clamp-2">
                    {advocate.bio || `High Court advocate offering legal consultation and representation across ${advocate.city}.`}
                  </p>
                </div>

                {/* Specialization Tags */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {advocate.specialization.slice(0, 3).map((spec) => (
                    <span
                      key={spec}
                      className="bg-blue-50/80 text-[#1A365D] text-xs px-2.5 py-1 rounded-lg border border-blue-200/60 font-medium"
                    >
                      {spec}
                    </span>
                  ))}
                  {advocate.specialization.length > 3 && (
                    <span className="text-xs text-slate-400 self-center pl-1 font-medium">
                      +{advocate.specialization.length - 3} more
                    </span>
                  )}
                </div>
              </div>

              {/* Bottom footer button */}
              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-full">
                  <ShieldCheck size={13} />
                  <span>Bar Verified</span>
                </span>

                <Button
                  variant="primary"
                  size="sm"
                  className="group-hover:bg-[#234574] transition-all"
                >
                  <span>View Profile &amp; Consult</span>
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Load More */}
      {hasMore && !isLoading && (
        <div className="flex justify-center py-6">
          <Button
            variant="outline"
            onClick={handleLoadMore}
            loading={isLoadingMore}
          >
            Load More Advocates
          </Button>
        </div>
      )}

      {/* Public Profile Modal */}
      {selectedLawyerId && (
        <PublicProfileModal
          isOpen={!!selectedLawyerId}
          onClose={() => setSelectedLawyerId(null)}
          userId={selectedLawyerId}
          onStartChat={onStartChat}
        />
      )}
    </div>
  );
};
