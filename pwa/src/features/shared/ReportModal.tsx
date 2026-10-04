import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { reportService } from '../../services/reportService';
import { ReportCategory, ReportEntityType } from '../../types/models';
import { ShieldAlert, AlertTriangle, Trash2, Hand, XCircle, HelpCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  entityId: string;
  entityType: ReportEntityType;
  entityTitle?: string;
  onSuccess?: () => void;
}

const CATEGORIES: { label: string; value: ReportCategory; icon: React.ReactNode }[] = [
  { label: 'Scam or Fraud', value: 'scam', icon: <AlertTriangle size={18} color="#dc2626" /> },
  { label: 'Spam / Commercial Bot', value: 'spam', icon: <Trash2 size={18} color="#d97706" /> },
  { label: 'Harassment or Abuse', value: 'harassment', icon: <Hand size={18} color="#7c3aed" /> },
  { label: 'Inappropriate Content', value: 'inappropriate', icon: <XCircle size={18} color="#b91c1c" /> },
  { label: 'Other Violation', value: 'other', icon: <HelpCircle size={18} color="#64748b" /> },
];

export const ReportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  entityId,
  entityType,
  entityTitle,
  onSuccess,
}) => {
  const { user } = useAuthStore();
  const { addToast } = useUIStore();

  const [category, setCategory] = useState<ReportCategory | null>(null);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      addToast('You must be signed in to submit a report', 'error');
      return;
    }
    if (!category) {
      addToast('Please select a violation category', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      await reportService.submitReport({
        entityId,
        entityType,
        reporterId: user.id,
        category,
        reason: reason.trim(),
      });

      addToast('Report submitted safely. Our Trust & Safety team will review this shortly.', 'success');
      setCategory(null);
      setReason('');
      onSuccess?.();
      onClose();
    } catch (err: any) {
      addToast(err.message || 'Failed to submit report', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Report this ${entityType}`}
      maxWidth="500px"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {entityTitle && (
          <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
            Reporting target: <strong className="font-semibold text-slate-900">{entityTitle}</strong>
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-slate-800 mb-2">
            Why are you reporting this {entityType}?
          </label>
          <div className="flex flex-col gap-2">
            {CATEGORIES.map((cat) => {
              const isSelected = category === cat.value;
              return (
                <button
                  type="button"
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#1A365D] bg-blue-50/70 text-[#1A365D] shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="shrink-0">{cat.icon}</div>
                  <span className={`text-sm ${isSelected ? 'font-semibold text-[#1A365D]' : 'font-normal'}`}>
                    {cat.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-800 mb-1.5">
            Additional details (optional)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Please provide helpful context for our legal compliance team..."
            rows={3}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50/50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A365D]/20 focus:border-[#1A365D] placeholder:text-slate-400 resize-none transition-all"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="danger"
            loading={isSubmitting}
            icon={<ShieldAlert size={16} />}
          >
            Submit Report
          </Button>
        </div>
      </form>
    </Modal>
  );
};
