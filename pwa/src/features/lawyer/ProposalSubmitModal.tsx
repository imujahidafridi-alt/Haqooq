import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { submitProposal } from '../../services/marketplaceService';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { LegalCase } from '../../types/models';
import { Send, AlertCircle, Coins } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  caseItem: LegalCase;
  onSuccess: () => void;
}

export const ProposalSubmitModal: React.FC<Props> = ({
  isOpen,
  onClose,
  caseItem,
  onSuccess,
}) => {
  const { user, setUser } = useAuthStore();
  const { addToast, setActiveTab } = useUiStore();

  const [bidAmount, setBidAmount] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const credits = (user as any)?.credits ?? 10;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (credits < 1) {
      addToast('Insufficient bidding credits. Please top up in Pro Tools.', 'error');
      onClose();
      setActiveTab('pro');
      return;
    }

    const amount = parseFloat(bidAmount.replace(/,/g, ''));
    if (isNaN(amount) || amount <= 0) {
      addToast('Please enter a valid proposed fee in PKR.', 'error');
      return;
    }

    if (!message.trim() || message.trim().length < 15) {
      addToast('Please provide a brief proposal message (at least 15 characters).', 'error');
      return;
    }

    setLoading(true);
    try {
      await submitProposal(caseItem.id, user.id, amount, message);
      setUser({ ...user, credits: Math.max(0, credits - 1) } as any);
      addToast('Your proposal has been securely dispatched to the client! 1 Credit deducted.', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      addToast(err?.message || 'Could not submit proposal.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Submit Case Proposal" maxWidth="560px">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Case brief banner */}
        <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4">
          <div className="text-xs font-bold text-[#1A365D] uppercase tracking-wider">
            {caseItem.category} • {caseItem.jurisdictionCity || caseItem.city || 'Pakistan'}
          </div>
          <div className="font-bold text-base text-slate-900 mt-1">
            {caseItem.title}
          </div>
          <div className="text-xs text-slate-600 mt-1">
            Client Budget:{' '}
            <strong className="text-slate-900 font-semibold">
              {caseItem.budgetType === 'fixed' && caseItem.budgetAmount
                ? `PKR ${caseItem.budgetAmount.toLocaleString()}`
                : 'Open to Quotes'}
            </strong>
          </div>
        </div>

        {/* Credit cost notice */}
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200/90 text-amber-800 text-xs font-semibold">
          <Coins size={18} className="shrink-0 text-amber-600" />
          <span>
            Submitting this proposal will deduct <strong className="font-bold">1 Bidding Credit</strong> from your balance (Available: {credits} credits).
          </span>
        </div>

        {/* Fee Quote */}
        <Input
          label="Your Proposed Legal Fee (PKR)"
          type="number"
          placeholder="e.g. 25000"
          value={bidAmount}
          onChange={(e) => setBidAmount(e.target.value)}
          required
        />

        {/* Cover Note / Proposal */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 block">
            Proposal Message & Legal Approach
          </label>
          <textarea
            rows={4}
            placeholder="Outline your credentials, relevant legal experience, estimated court timeline, and retainer terms..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50/50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A365D]/20 focus:border-[#1A365D] placeholder:text-slate-400 resize-none transition-all leading-relaxed"
            required
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2 border-t border-slate-100">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="flex-1"
            loading={loading}
            icon={<Send size={16} />}
          >
            Submit Proposal (1 Credit)
          </Button>
        </div>
      </form>
    </Modal>
  );
};
