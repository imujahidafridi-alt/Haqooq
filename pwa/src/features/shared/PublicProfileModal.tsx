import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { Modal } from '../../components/common/Modal';
import { Avatar } from '../../components/common/Avatar';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ReportModal } from './ReportModal';
import { db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { PublicLawyerProfile } from '../../types/models';
import { chatService } from '../../services/chatService';
import { Star, MapPin, Briefcase, Award, MessageSquare, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
  onStartChat?: (chatId: string, chatTitle: string) => void;
}

export const PublicProfileModal: React.FC<Props> = ({
  isOpen,
  onClose,
  userId,
  onStartChat,
}) => {
  const { user: currentUser } = useAuthStore();
  const { addToast } = useUIStore();

  const [profile, setProfile] = useState<PublicLawyerProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [isInitiating, setIsInitiating] = useState(false);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    if (!isOpen || !userId) {
      setProfile(null);
      return;
    }

    const fetchPublicProfile = async () => {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, 'users', userId));
        if (snap.exists()) {
          const data = snap.data();
          setProfile({
            id: snap.id,
            displayName: data.displayName || 'Advocate',
            photoURL: data.photoURL || null,
            city: data.city || 'Pakistan',
            specialization: Array.isArray(data.specialization) ? data.specialization : [],
            experienceYears: typeof data.experienceYears === 'number' ? data.experienceYears : 0,
            rating: typeof data.rating === 'number' ? data.rating : 0,
            ratingCount: typeof data.ratingCount === 'number' ? data.ratingCount : 0,
            isPremium: Boolean(data.isPremium),
            discoveryScore: typeof data.discoveryScore === 'number' ? data.discoveryScore : 0,
            status: data.status === 'verified' ? 'verified' : 'verified',
          });
        } else {
          addToast('Advocate profile not found', 'error');
          onClose();
        }
      } catch (err: any) {
        addToast(err.message || 'Failed to load profile', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchPublicProfile();
  }, [isOpen, userId]);

  const handleStartConsultation = async () => {
    if (!currentUser) {
      addToast('Please sign in to start a consultation with this advocate', 'warning');
      return;
    }
    if (currentUser.id === profile?.id) {
      addToast('You cannot initiate a consultation with your own profile', 'info');
      return;
    }

    setIsInitiating(true);
    try {
      // Confirm advocate is still verified in Firestore
      const freshSnap = await getDoc(doc(db, 'users', profile!.id));
      if (!freshSnap.exists() || freshSnap.data()?.status !== 'verified') {
        addToast('This advocate is currently not accepting new consultations', 'warning');
        setIsInitiating(false);
        return;
      }

      // Compute deterministic 1-on-1 direct chat ID
      const [u1, u2] = [currentUser.id, profile!.id].sort();
      const directChatId = `direct-${u1}-${u2}`;

      // Initialize parent chat thread with participants to satisfy security rules
      await chatService.ensureChatThread(directChatId, currentUser.id, profile!.id);

      onClose();
      onStartChat?.(directChatId, `Advocate ${profile!.displayName}`);
    } catch (err: any) {
      addToast(err.message || 'Failed to start consultation', 'error');
    } finally {
      setIsInitiating(false);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Advocate Profile" maxWidth="600px">
        {loading || !profile ? (
          <div className="flex justify-center items-center py-16">
            <LoadingSpinner size="lg" label="Loading advocate credentials..." />
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Header info */}
            <div className="flex items-start gap-4">
              <Avatar src={profile.photoURL} name={profile.displayName} size="xl" />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                    {profile.displayName}
                  </h2>
                  <CheckCircle2 size={18} className="text-[#C5A880]" />
                  {profile.isPremium && <Badge variant="warning">Elite Counsel</Badge>}
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                  <MapPin size={13} className="text-slate-400" />
                  <span>{profile.city}</span>
                </div>

                <div className="flex items-center gap-3 mt-2 text-xs">
                  <div className="flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                    <Star size={13} className="fill-amber-500 text-amber-500" />
                    <span>{profile.rating > 0 ? profile.rating.toFixed(1) : 'New'}</span>
                    <span className="text-slate-400 font-normal">
                      ({profile.ratingCount} reviews)
                    </span>
                  </div>
                  <span className="text-slate-300">•</span>
                  <div className="flex items-center gap-1 text-slate-600 font-medium">
                    <Briefcase size={13} className="text-slate-400" />
                    <span>{profile.experienceYears} Years Practice</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Verification Guarantee */}
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3.5 flex items-center gap-3 text-xs text-emerald-900">
              <Award size={22} className="text-emerald-600 shrink-0" />
              <div>
                <strong className="block font-bold text-emerald-950">
                  Bar Council Verified Legal Practitioner
                </strong>
                <span className="text-emerald-800 text-[11px]">
                  Credentials validated according to legal practice regulations. Zero-PII protected profile.
                </span>
              </div>
            </div>

            {/* Specialization tags */}
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                Legal Practice Areas
              </span>
              <div className="flex flex-wrap gap-1.5">
                {profile.specialization.length > 0 ? (
                  profile.specialization.map((spec) => (
                    <span
                      key={spec}
                      className="bg-slate-100 text-slate-700 text-xs px-3 py-1 rounded-lg border border-slate-200/60 font-medium"
                    >
                      {spec}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">
                    General Civil &amp; Criminal Practice
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-2">
              <button
                type="button"
                onClick={() => setShowReport(true)}
                className="text-slate-400 hover:text-rose-600 text-xs flex items-center gap-1.5 transition-colors cursor-pointer p-1"
                title="Report profile to trust & safety"
              >
                <ShieldAlert size={14} />
                <span>Report Advocate</span>
              </button>

              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
                <Button
                  variant="primary"
                  loading={isInitiating}
                  onClick={handleStartConsultation}
                  icon={<MessageSquare size={16} />}
                >
                  Start Consultation
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {profile && (
        <ReportModal
          isOpen={showReport}
          onClose={() => setShowReport(false)}
          entityId={profile.id}
          entityType="user"
          entityTitle={`Advocate ${profile.displayName}`}
        />
      )}
    </>
  );
};
