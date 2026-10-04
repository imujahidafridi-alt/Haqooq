import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Avatar } from '../../components/common/Avatar';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { getProposalsForCase, acceptProposal } from '../../services/caseService';
import { CaseProposal, LawyerProfile } from '../../types/models';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Check, Star, MessageSquare } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
  caseTitle: string;
}

interface EnrichedProposal {
  proposal: CaseProposal;
  lawyer: LawyerProfile | null;
}

export const ProposalsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  caseId,
  caseTitle,
}) => {
  const { user } = useAuthStore();
  const { openChat, addToast } = useUiStore();
  const [proposals, setProposals] = useState<EnrichedProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !caseId) return;

    let isMounted = true;
    const loadProposals = async () => {
      setLoading(true);
      try {
        const raw = await getProposalsForCase(caseId);
        const enriched = await Promise.all(
          raw.map(async (p) => {
            try {
              const d = await getDoc(doc(db, 'users', p.lawyerId));
              return {
                proposal: p,
                lawyer: d.exists() ? ({ id: d.id, ...d.data() } as LawyerProfile) : null,
              };
            } catch (e) {
              return { proposal: p, lawyer: null };
            }
          })
        );

        if (isMounted) {
          setProposals(enriched.filter((item) => item.proposal.status === 'pending'));
        }
      } catch (e) {
        if (isMounted) addToast('Could not load proposals for this case.', 'error');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadProposals();
    return () => { isMounted = false; };
  }, [isOpen, caseId]);

  const handleAccept = async (item: EnrichedProposal) => {
    if (!user) return;
    setAcceptingId(item.proposal.id);

    try {
      await acceptProposal(
        item.proposal.id,
        caseId,
        item.proposal.lawyerId,
        user.id,
        item.proposal.bidAmount
      );

      addToast(`Proposal accepted! Advocate ${item.lawyer?.displayName || ''} has been assigned.`, 'success');
      onClose();
      // Instantly open the real-time chat room
      openChat(caseId, `Case: ${caseTitle}`);
    } catch (e: any) {
      addToast(e?.message || 'Failed to accept proposal.', 'error');
      setAcceptingId(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Proposals for: ${caseTitle}`} maxWidth="720px">
      {loading ? (
        <div className="py-12 text-center">
          <LoadingSpinner label="Evaluating advocate bids..." />
        </div>
      ) : proposals.length === 0 ? (
        <EmptyState
          icon={<MessageSquare size={36} />}
          title="No Proposals Yet"
          description="Verified advocates are reviewing your case listing. Bids and cover letters will appear here in real time."
        />
      ) : (
        <div className="space-y-4">
          {proposals.map((item) => {
            const isAccepting = acceptingId === item.proposal.id;
            return (
              <div
                key={item.proposal.id}
                className="border border-slate-200 rounded-2xl p-5 bg-white shadow-xs hover:border-slate-300 transition-all space-y-3.5"
              >
                {/* Lawyer summary */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={item.lawyer?.displayName}
                      imageUrl={item.lawyer?.photoURL}
                      size="md"
                    />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-base text-slate-900">
                          {item.lawyer?.displayName || 'Licensed Advocate'}
                        </span>
                        {item.lawyer?.status === 'verified' && (
                          <Badge variant="success" size="sm">Verified</Badge>
                        )}
                        {item.lawyer?.isPremium && (
                          <Badge variant="secondary" size="sm">PRO</Badge>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>{item.lawyer?.city || 'Pakistan'}</span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1 text-amber-600 font-semibold">
                          <Star size={12} fill="#D97706" />
                          {item.lawyer?.rating ? item.lawyer.rating.toFixed(1) : 'New'}
                        </span>
                        <span>•</span>
                        <span>{item.lawyer?.experienceYears || 0} yrs practice</span>
                      </div>
                    </div>
                  </div>

                  {/* Fee quote */}
                  <div className="sm:text-right">
                    <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                      Proposed Fee
                    </div>
                    <div className="text-xl font-extrabold text-[#1A365D]">
                      PKR {item.proposal.bidAmount.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Pitch cover note */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-sm text-slate-700 leading-relaxed italic">
                  "{item.proposal.message}"
                </div>

                {/* Action button */}
                <div className="flex justify-end pt-1">
                  <Button
                    variant="primary"
                    loading={isAccepting}
                    disabled={acceptingId !== null}
                    onClick={() => handleAccept(item)}
                    icon={<Check size={16} />}
                  >
                    Accept Proposal & Start Consultation
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
};
