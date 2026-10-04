import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ProposalsModal } from './ProposalsModal';
import { RateLawyerModal } from './RateLawyerModal';
import { closeCase } from '../../services/caseService';
import { LegalCase } from '../../types/models';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { 
  Briefcase, 
  MessageSquare, 
  CheckCircle, 
  Star, 
  Clock, 
  PlusCircle, 
  Calendar,
  AlertTriangle 
} from 'lucide-react';

interface Props {
  onPostNewCase?: () => void;
}

export const ActiveCasesView: React.FC<Props> = ({ onPostNewCase }) => {
  const { user } = useAuthStore();
  const { setActiveTab, openChat, addToast } = useUiStore();

  const [cases, setCases] = useState<LegalCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'active' | 'closed'>('all');

  // Modal states
  const [selectedCaseForProposals, setSelectedCaseForProposals] = useState<LegalCase | null>(null);
  const [selectedCaseForRating, setSelectedCaseForRating] = useState<LegalCase | null>(null);

  useEffect(() => {
    if (!user) return;
    if (user.role === 'lawyer') {
      setActiveTab('feed');
      return;
    }

    const q = query(collection(db, 'cases'), where('clientId', '==', user.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as LegalCase[];

      data.sort((a, b) => b.createdAt - a.createdAt);
      setCases(data);
      setLoading(false);
    }, (error) => {
      console.warn('Real-time cases sync error:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleCloseCase = async (caseId: string) => {
    if (!window.confirm('Are you sure you want to mark this legal matter as resolved and closed?')) {
      return;
    }

    try {
      await closeCase(caseId, 'Client');
      addToast('Case has been officially marked as resolved.', 'success');
    } catch (e: any) {
      addToast(e?.message || 'Failed to close case.', 'error');
    }
  };

  const filteredCases = cases.filter((c) => {
    if (filter === 'all') return true;
    return c.status === filter;
  });

  if (user?.role === 'lawyer') {
    return (
      <div className="p-8 text-center max-w-lg mx-auto space-y-4 my-12 bg-white rounded-3xl border border-slate-200 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-[#1A365D]/10 text-[#1A365D] flex items-center justify-center mx-auto">
          <Briefcase size={28} />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Advocate Counsel Workspace</h2>
        <p className="text-sm text-slate-500 leading-relaxed">
          Client matter management is reserved for citizen clients. To discover open cases and submit bids, please visit your Case Marketplace.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            type="button"
            onClick={() => setActiveTab('feed')}
            className="bg-[#1A365D] hover:bg-[#234574] text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer shadow-xs"
          >
            Case Marketplace
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('my_cases')}
            className="border border-slate-300 hover:bg-slate-50 text-slate-800 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer shadow-xs"
          >
            Active Retainers
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 sm:py-8 space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1A365D] tracking-tight">
            My Legal Matters
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitor matter progress, evaluate advocate proposals, and collaborate under privilege.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => (onPostNewCase ? onPostNewCase() : setActiveTab('post'))}
          icon={<PlusCircle size={18} />}
          className="self-start sm:self-auto"
        >
          Post New Legal Case
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {[
          { id: 'all', label: 'All Matters', count: cases.length },
          { id: 'open', label: 'Receiving Proposals', count: cases.filter((c) => c.status === 'open').length },
          { id: 'active', label: 'In Progress', count: cases.filter((c) => c.status === 'active').length },
          { id: 'closed', label: 'Resolved / Closed', count: cases.filter((c) => c.status === 'closed').length },
        ].map((tab) => {
          const isActive = filter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-[#1A365D] text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Cases List */}
      {loading ? (
        <div className="py-16 text-center">
          <LoadingSpinner label="Synchronizing legal matters..." />
        </div>
      ) : filteredCases.length === 0 ? (
        <EmptyState
          icon={<Briefcase size={36} />}
          title={filter === 'all' ? 'No Cases Posted Yet' : `No ${filter} cases found`}
          description={
            filter === 'all'
              ? 'Post your first legal matter to receive competitive proposals from verified advocates.'
              : undefined
          }
          action={
            filter === 'all' ? (
              <Button
                variant="primary"
                onClick={() => (onPostNewCase ? onPostNewCase() : setActiveTab('post'))}
                icon={<PlusCircle size={16} />}
              >
                Post Legal Case Now
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCases.map((item) => {
            const isOpen = item.status === 'open';
            const isActive = item.status === 'active';
            const isClosed = item.status === 'closed';

            return (
              <Card
                key={item.id}
                hoverable
                className="flex flex-col justify-between h-full border border-slate-200 shadow-xs hover:shadow-md transition-all"
              >
                <div className="space-y-3">
                  {/* Status header */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#1A365D] uppercase tracking-wider bg-blue-50/80 px-2.5 py-1 rounded-md">
                      {item.category}
                    </span>
                    <Badge
                      variant={isOpen ? 'warning' : isActive ? 'success' : 'neutral'}
                      size="sm"
                    >
                      {isOpen ? 'Proposals Open' : isActive ? 'Advocate Engaged' : 'Resolved'}
                    </Badge>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-slate-900 leading-snug line-clamp-1 hover:text-[#1A365D]">
                      {item.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 line-clamp-3 mt-1.5 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  {/* Metadata tags */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                      <Calendar size={13} className="text-slate-400" />
                      <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                      <span>Jurisdiction: {item.jurisdictionCity || item.city || 'Pakistan'}</span>
                    </div>

                    {item.urgency === 'urgent' && (
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-lg">
                        <Clock size={13} />
                        <span>Urgent Hearing</span>
                      </div>
                    )}
                  </div>

                  {/* Timeline preview */}
                  {item.timeline && item.timeline.length > 0 && (
                    <div className="border-t border-slate-100 pt-3 mt-2">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Latest Progress
                      </div>
                      <div className="text-xs font-semibold text-slate-800">
                        • {item.timeline[item.timeline.length - 1].title}
                      </div>
                      {item.timeline[item.timeline.length - 1].description && (
                        <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                          {item.timeline[item.timeline.length - 1].description}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Card actions */}
                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center gap-2">
                  {isOpen && (
                    <Button
                      variant="primary"
                      fullWidth
                      onClick={() => setSelectedCaseForProposals(item)}
                      icon={<MessageSquare size={16} />}
                    >
                      Review Proposals
                    </Button>
                  )}

                  {isActive && (
                    <div className="flex items-center gap-2 w-full">
                      <Button
                        variant="primary"
                        className="flex-1"
                        onClick={() => openChat(item.id, `Case: ${item.title}`)}
                        icon={<MessageSquare size={16} />}
                      >
                        Message
                      </Button>
                      <Button
                        variant="outline"
                        className="text-rose-600 border-rose-200 hover:bg-rose-50"
                        onClick={() => handleCloseCase(item.id)}
                      >
                        Resolve
                      </Button>
                    </div>
                  )}

                  {isClosed && (
                    <div className="w-full">
                      {!item.hasBeenRated ? (
                        <Button
                          variant="secondary"
                          fullWidth
                          onClick={() => setSelectedCaseForRating(item)}
                          icon={<Star size={16} />}
                        >
                          Rate Advocate
                        </Button>
                      ) : (
                        <div className="w-full text-center text-xs font-semibold text-emerald-600 bg-emerald-50 py-2 rounded-xl">
                          ✓ Advocate Rated & Matter Resolved
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Proposals Modal */}
      {selectedCaseForProposals && (
        <ProposalsModal
          isOpen={!!selectedCaseForProposals}
          onClose={() => setSelectedCaseForProposals(null)}
          caseId={selectedCaseForProposals.id}
          caseTitle={selectedCaseForProposals.title}
        />
      )}

      {/* Rate Lawyer Modal */}
      {selectedCaseForRating && (
        <RateLawyerModal
          isOpen={!!selectedCaseForRating}
          onClose={() => setSelectedCaseForRating(null)}
          caseId={selectedCaseForRating.id}
          lawyerId={selectedCaseForRating.assignedLawyerId || ''}
          clientId={user?.id || ''}
          onSuccess={() => setSelectedCaseForRating(null)}
        />
      )}
    </div>
  );
};
