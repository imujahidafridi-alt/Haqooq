import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { submitLawyerRating } from '../../services/ratingService';
import { useUiStore } from '../../store/uiStore';
import { Star } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
  lawyerId: string;
  clientId: string;
  lawyerName?: string;
  onSuccess: () => void;
}

export const RateLawyerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  caseId,
  lawyerId,
  clientId,
  lawyerName = 'Advocate',
  onSuccess,
}) => {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [reviewText, setReviewText] = useState('');
  const [loading, setLoading] = useState(false);
  const { addToast } = useUiStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      addToast('Please select a star rating.', 'error');
      return;
    }

    setLoading(true);
    try {
      await submitLawyerRating(caseId, lawyerId, clientId, rating, reviewText);
      addToast('Thank you for rating your advocate!', 'success');
      onSuccess();
      onClose();
    } catch (e: any) {
      addToast(e?.message || 'Could not submit rating.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Rate Your Advocate" maxWidth="480px">
      <form onSubmit={handleSubmit} className="space-y-5 text-center">
        <p className="text-sm text-slate-600">
          How was your experience working with <strong className="font-semibold text-slate-900">{lawyerName}</strong>? Your verified feedback maintains trust on Haqooq.
        </p>

        {/* Interactive Star Rating */}
        <div className="flex justify-center gap-2 py-2">
          {[1, 2, 3, 4, 5].map((star) => {
            const isFilled = star <= (hoverRating || rating);
            return (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
                className={`p-1 transition-transform hover:scale-110 cursor-pointer ${
                  isFilled ? 'text-amber-500' : 'text-slate-200'
                }`}
              >
                <Star size={36} fill={isFilled ? '#f59e0b' : 'none'} />
              </button>
            );
          })}
        </div>

        <div className="text-left space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 block">
            Write a Review (Optional)
          </label>
          <textarea
            rows={4}
            placeholder="Share details regarding professional communication, timeliness, and legal guidance..."
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50/50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A365D]/20 focus:border-[#1A365D] placeholder:text-slate-400 resize-none transition-all"
          />
        </div>

        <div className="flex gap-3 pt-2 border-t border-slate-100">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" className="flex-1" loading={loading}>
            Submit Feedback
          </Button>
        </div>
      </form>
    </Modal>
  );
};
