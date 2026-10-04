import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Avatar } from '../../components/common/Avatar';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ProposalSubmitModal } from './ProposalSubmitModal';
import { getOpenCases, getLawyerBiddedCaseIds } from '../../services/marketplaceService';
import { LegalCase } from '../../types/models';
import { CANONICAL_PRACTICE_AREAS, CITIES } from '../../constants/legalDomains';
import { 
  Compass, 
  Send, 
  Clock, 
  Coins, 
  Building2, 
  Calendar, 
  AlertCircle, 
  Check, 
  Flag,
  FileText 
} from 'lucide-react';

export const CaseFeedView: React.FC = () => {
  const { user } = useAuthStore();
  const { setActiveTab, addToast } = useUiStore();

  const [cases, setCases] = useState<LegalCase[]>([]);
  const [biddedIds, setBiddedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedCity, setSelectedCity] = useState<string>('All');

  // Modals
  const [proposalCase, setProposalCase] = useState<LegalCase | null>(null);
  const [briefCase, setBriefCase] = useState<LegalCase | null>(null);

  const credits = (user as any)?.credits ?? 10;
  const isVerified = user?.status === 'verified';

  const loadFeed = async () => {
    setLoading(true);
    try {
      const [openCases, bids] = await Promise.all([
        getOpenCases(50),
        user ? getLawyerBiddedCaseIds(user.id) : Promise.resolve([])
      ]);
      setCases(openCases);
      setBiddedIds(new Set(bids));
    } catch (e) {
      addToast('Could not load marketplace feed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeed();
  }, [user]);

  const filteredCases = cases.filter((c) => {
    if (selectedCategory !== 'All' && !c.category.toLowerCase().includes(selectedCategory.toLowerCase())) {
      return false;
    }
    if (selectedCity !== 'All') {
      const target = selectedCity.toLowerCase();
      const inCity = (c.jurisdictionCity || c.city || '').toLowerCase();
      if (!inCity.includes(target)) return false;
    }
    return true;
  });

  return (
    <div className="py-6 sm:py-8 space-y-6">
      {/* Verification Warning Banner */}
      {!isVerified && (
        <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <AlertCircle size={22} />
            </div>
            <div>
              <div className="font-bold text-amber-900 text-sm sm:text-base">
                Advocate Bar Council Verification Pending
              </div>
              <div className="text-xs sm:text-sm text-amber-700 mt-0.5">
                Your legal license is being authenticated against Bar Council records. You can explore briefs; bidding unlocks once verified.
              </div>
            </div>
          </div>
          <Button size="sm" variant="secondary" onClick={() => setActiveTab('profile')} className="self-start sm:self-auto shrink-0">
            Check Verification Status
          </Button>
        </div>
      )}

      {/* Feed Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1A365D] uppercase tracking-wider bg-blue-50 px-3 py-1 rounded-full">
            <Compass size={14} />
            <span>Advocate Marketplace</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1A365D] tracking-tight mt-1">
            Open Legal Marketplace
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Browse real-time client matters, analyze jurisdiction specifics, and submit competitive retainer bids.
          </p>
        </div>

        {/* Bidding Credits Balance Banner */}
        <div className="flex items-center gap-4 bg-white border border-slate-200 px-4 py-2.5 rounded-2xl shadow-xs self-start sm:self-auto">
          <div>
            <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
              Bidding Balance
            </div>
            <div className="text-lg font-extrabold text-[#1A365D]">
              {credits} Credits
            </div>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setActiveTab('pro')}
            icon={<Coins size={14} />}
          >
            Get Credits
          </Button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <select
          value={selectedCity}
          onChange={(e) => setSelectedCity(e.target.value)}
          className="h-10 px-3.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-slate-800 text-xs sm:text-sm font-semibold focus:bg-white focus:border-[#1A365D] focus:ring-3 focus:ring-[#1A365D]/10 transition-all outline-none shadow-xs shrink-0"
        >
          <option value="All">All Cities</option>
          {CITIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {['All', ...CANONICAL_PRACTICE_AREAS].map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-[#1A365D] text-white shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Feed Cards */}
      {loading ? (
        <div className="py-16 text-center">
          <LoadingSpinner label="Loading open case feed..." />
        </div>
      ) : filteredCases.length === 0 ? (
        <EmptyState
          icon={<Compass size={36} />}
          title="No Open Cases Match Filters"
          description="Try broadening your category or city filters to view listings across other jurisdictions."
          action={
            <Button
              variant="outline"
              onClick={() => {
                setSelectedCategory('All');
                setSelectedCity('All');
              }}
            >
              Reset Filters
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCases.map((item) => {
            const hasBidded = biddedIds.has(item.id);
            const isUrgent = item.urgency === 'urgent';

            return (
              <Card
                key={item.id}
                hoverable
                className="flex flex-col justify-between h-full border border-slate-200 shadow-xs hover:shadow-md transition-all"
              >
                <div className="space-y-3">
                  {/* Category & Urgency */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#1A365D] uppercase tracking-wider bg-blue-50/80 px-2.5 py-1 rounded-md">
                      {item.category}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {isUrgent && (
                        <Badge variant="error" size="sm">
                          <Clock size={11} className="mr-1" /> Urgent 48h
                        </Badge>
                      )}
                      <Badge variant="neutral" size="sm">
                        {item.courtLevel === 'high_court' ? 'High Court' : item.courtLevel === 'supreme_court' ? 'Supreme Court' : 'District'}
                      </Badge>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-bold text-slate-900 leading-snug line-clamp-1 hover:text-[#1A365D]">
                    {item.title}
                  </h3>

                  {/* Client info & Jurisdiction */}
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Avatar name={item.clientName} size="sm" />
                    <span className="font-semibold text-slate-800">
                      {item.clientName || 'Client'}
                    </span>
                    <span>•</span>
                    <span>{item.jurisdictionCity || item.city || 'Pakistan'}</span>
                  </div>

                  {/* Description snippet */}
                  <p className="text-xs sm:text-sm text-slate-600 line-clamp-3 leading-relaxed">
                    {item.description}
                  </p>

                  {/* Turnaround / Budget Bar */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        Budget
                      </div>
                      <div className="text-sm font-bold text-slate-900">
                        {item.budgetType === 'fixed' && item.budgetAmount
                          ? `PKR ${item.budgetAmount.toLocaleString()}`
                          : 'Open to Quotes'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setBriefCase(item)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#1A365D] hover:underline cursor-pointer"
                    >
                      <FileText size={14} />
                      <span>Full Brief</span>
                    </button>
                  </div>
                </div>

                {/* Proposal Submission Button */}
                <div className="pt-4 mt-4 border-t border-slate-100">
                  {hasBidded ? (
                    <div className="text-center text-xs font-semibold text-emerald-600 bg-emerald-50 py-2.5 rounded-xl flex items-center justify-center gap-1.5">
                      <Check size={16} />
                      <span>Proposal Submitted</span>
                    </div>
                  ) : (
                    <Button
                      variant="primary"
                      fullWidth
                      disabled={!isVerified}
                      onClick={() => setProposalCase(item)}
                      icon={<Send size={16} />}
                    >
                      {isVerified ? 'Submit Proposal (1 Credit)' : 'Verification Required'}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Proposal Submit Modal */}
      {proposalCase && (
        <ProposalSubmitModal
          isOpen={!!proposalCase}
          onClose={() => setProposalCase(null)}
          caseItem={proposalCase}
          onSuccess={loadFeed}
        />
      )}

      {/* Case Full Brief Modal */}
      {briefCase && (
        <Modal isOpen={!!briefCase} onClose={() => setBriefCase(null)} title={briefCase.title} maxWidth="640px">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="primary">{briefCase.category}</Badge>
              <Badge variant="neutral">{briefCase.jurisdictionCity || briefCase.city}</Badge>
              <Badge variant="secondary">
                Budget: {briefCase.budgetType === 'fixed' && briefCase.budgetAmount ? `PKR ${briefCase.budgetAmount.toLocaleString()}` : 'Open to Quotes'}
              </Badge>
            </div>

            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Full Statement of Facts
              </h4>
              <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50 border border-slate-200/80 p-4 rounded-xl">
                {briefCase.description}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button
                variant="primary"
                disabled={!isVerified || biddedIds.has(briefCase.id)}
                onClick={() => {
                  const c = briefCase;
                  setBriefCase(null);
                  setProposalCase(c);
                }}
              >
                {biddedIds.has(briefCase.id) ? 'Proposal Already Submitted' : 'Submit Proposal'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
