import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Avatar } from '../../components/common/Avatar';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { db, storage, auth } from '../../lib/firebase';
import { doc, getDoc, updateDoc, collection, query, where, getCountFromServer, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { deleteUser, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { authService } from '../../services/authService';
import { CANONICAL_PRACTICE_AREAS, PracticeArea, CITIES, normalizeSpecialization } from '../../constants/legalDomains';
import { SUPPORT_CONFIG } from '../../constants/supportConfig';
import { LawyerProfile, UserProfile } from '../../types/models';
import {
  Phone,
  Mail,
  Camera,
  ShieldCheck,
  HelpCircle,
  LogOut,
  Trash2,
  Star,
  Briefcase,
  MapPin,
  MessageSquare,
  AlertTriangle,
} from 'lucide-react';

export const ProfileView: React.FC = () => {
  const { user, setUser, logout } = useAuthStore();
  const { addToast } = useUIStore();

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [city, setCity] = useState(user?.city || 'Lahore');
  const [experienceYears, setExperienceYears] = useState<number>(
    (user as any)?.experienceYears || 1
  );

  const initialSpecs =
    user?.role === 'lawyer' && (user as LawyerProfile).specialization
      ? (user as LawyerProfile).specialization.map((s) => normalizeSpecialization(s))
      : ['Property / Real Estate Law' as PracticeArea];
  const [selectedSpecs, setSelectedSpecs] = useState<PracticeArea[]>(
    Array.from(new Set(initialSpecs)).slice(0, 5)
  );

  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Client case counts
  const [openCasesCount, setOpenCasesCount] = useState<number | null>(null);
  const [activeCasesCount, setActiveCasesCount] = useState<number | null>(null);

  // Modals
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const isLawyer = user?.role === 'lawyer';

  // Load fresh profile & stats
  useEffect(() => {
    if (!user?.id) return;

    const loadStats = async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.id));
        if (snap.exists()) {
          const fresh = snap.data() as UserProfile | LawyerProfile;
          setUser(fresh);
        }

        if (user.role === 'client') {
          const openQ = query(
            collection(db, 'cases'),
            where('clientId', '==', user.id),
            where('status', '==', 'open')
          );
          const activeQ = query(
            collection(db, 'cases'),
            where('clientId', '==', user.id),
            where('status', 'in', ['active', 'under_review'])
          );
          const [openRes, activeRes] = await Promise.all([
            getCountFromServer(openQ),
            getCountFromServer(activeQ),
          ]);
          setOpenCasesCount(openRes.data().count);
          setActiveCasesCount(activeRes.data().count);
        }
      } catch (err) {
        console.warn('Profile stats fetch error:', err);
      }
    };

    loadStats();
  }, [user?.id]);

  const toggleSpecialization = (spec: PracticeArea) => {
    if (selectedSpecs.includes(spec)) {
      if (selectedSpecs.length === 1) {
        addToast('You must select at least 1 legal practice area', 'warning');
        return;
      }
      setSelectedSpecs(selectedSpecs.filter((s) => s !== spec));
    } else {
      if (selectedSpecs.length >= 5) {
        addToast('Maximum 5 practice areas allowed', 'warning');
        return;
      }
      setSelectedSpecs([...selectedSpecs, spec]);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && user) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        addToast('Avatar must be under 5MB', 'error');
        return;
      }

      setIsUploadingAvatar(true);
      try {
        const ext = file.name.split('.').pop() || 'jpg';
        const avatarRef = ref(storage, `avatars/${user.id}/${Date.now()}.${ext}`);
        await uploadBytes(avatarRef, file, { contentType: file.type });
        const photoURL = await getDownloadURL(avatarRef);

        await updateDoc(doc(db, 'users', user.id), { photoURL, updatedAt: new Date().toISOString() });
        setUser({ ...user, photoURL });
        addToast('Profile picture updated successfully', 'success');
      } catch (err: any) {
        addToast(err.message || 'Failed to upload profile picture', 'error');
      } finally {
        setIsUploadingAvatar(false);
      }
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!displayName.trim()) {
      addToast('Full name is required', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      const updateData: any = {
        displayName: displayName.trim(),
        phone: phone.trim(),
        city,
        updatedAt: new Date().toISOString(),
      };

      if (isLawyer) {
        updateData.specialization = selectedSpecs;
        updateData.experienceYears = Number(experienceYears) || 0;
      }

      await updateDoc(doc(db, 'users', user.id), updateData);
      setUser({ ...user, ...updateData });
      addToast('Profile changes saved successfully', 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to save changes', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (e) {
      console.warn('Logout error:', e);
    }
    logout();
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    if (deleteConfirmation.trim().toUpperCase() !== 'DELETE') {
      addToast('Please type DELETE to confirm', 'warning');
      return;
    }

    setIsDeleting(true);
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        if (deletePassword && currentUser.email) {
          const cred = EmailAuthProvider.credential(currentUser.email, deletePassword);
          await reauthenticateWithCredential(currentUser, cred);
        }
        await deleteUser(currentUser);
      }

      await deleteDoc(doc(db, 'users', user.id));
      addToast('Account and personal data removed successfully', 'info');
      logout();
    } catch (err: any) {
      addToast(err.message || 'Failed to delete account. Please re-authenticate.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Top Hero Profile Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          {/* Avatar with Camera badge */}
          <div className="relative self-start shrink-0">
            <Avatar
              src={user?.photoURL}
              name={user?.displayName || 'User'}
              size="xl"
            />
            <label
              htmlFor="avatar-upload-input"
              className="absolute -bottom-1 -right-1 w-8 h-8 bg-[#1A365D] hover:bg-[#234574] text-white rounded-full flex items-center justify-center shadow-md cursor-pointer border-2 border-white transition-all active:scale-95"
              title="Upload new photo"
            >
              <Camera size={15} />
            </label>
            <input
              id="avatar-upload-input"
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
              disabled={isUploadingAvatar}
            />
          </div>

          {/* User details */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {user?.displayName || 'Account Member'}
              </h1>
              <Badge variant={user?.role === 'lawyer' ? 'lawyer' : 'client'}>
                {user?.role === 'lawyer' ? 'Advocate Counsel' : 'Citizen Client'}
              </Badge>
              {isLawyer && user?.status === 'verified' && (
                <Badge variant="success">
                  <span className="flex items-center gap-1">
                    <ShieldCheck size={12} />
                    Verified Practitioner
                  </span>
                </Badge>
              )}
            </div>

            <p className="text-sm text-slate-500 mt-1">{user?.email}</p>

            <div className="flex items-center gap-1 text-xs text-slate-400 mt-1 font-medium">
              <MapPin size={13} />
              <span>{user?.city || 'Pakistan'}</span>
            </div>
          </div>
        </div>

        {/* Quick Stats Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 border border-slate-200/70 rounded-xl p-4">
          {isLawyer ? (
            <>
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Bidding Credits
                </span>
                <span className="text-2xl font-extrabold text-[#C5A880]">
                  {(user as any)?.credits ?? 0}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Client Rating
                </span>
                <div className="flex items-center gap-1 text-2xl font-extrabold text-amber-700">
                  <Star size={20} className="fill-amber-500 text-amber-500" />
                  <span>{(user as any)?.rating ? (user as any).rating.toFixed(1) : 'New'}</span>
                </div>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Experience
                </span>
                <span className="text-2xl font-extrabold text-slate-800">
                  {(user as any)?.experienceYears ?? 0} yrs
                </span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Bar Jurisdiction
                </span>
                <span className="text-lg font-bold text-slate-800 truncate block mt-1">
                  {user?.city || 'Lahore'}
                </span>
              </div>
            </>
          ) : (
            <>
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Active Legal Cases
                </span>
                <span className="text-2xl font-extrabold text-[#1A365D]">
                  {activeCasesCount ?? 0}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Open Consultations
                </span>
                <span className="text-2xl font-extrabold text-[#C5A880]">
                  {openCasesCount ?? 0}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Member Status
                </span>
                <span className="text-lg font-bold text-emerald-600 block mt-1">
                  Active
                </span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Location
                </span>
                <span className="text-lg font-bold text-slate-800 truncate block mt-1">
                  {user?.city || 'Lahore'}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Content 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form Column (2 cols) */}
        <div className="lg:col-span-2">
          <Card className="flex flex-col gap-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Personal &amp; Professional Information
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Update your contact details and legal profile attributes visible on Haqooq.
              </p>
            </div>

            <form onSubmit={handleSaveProfile} className="flex flex-col gap-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Full Name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
                <Input
                  label="Phone Number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="03001234567"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5 block select-none">
                    Primary City / Jurisdiction
                  </label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full h-11 px-3.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-slate-900 text-sm font-medium focus:bg-white focus:border-[#1A365D] focus:ring-3 focus:ring-[#1A365D]/10 transition-all outline-none shadow-xs"
                  >
                    {CITIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {isLawyer && (
                  <Input
                    label="Years of Legal Practice"
                    type="number"
                    value={experienceYears.toString()}
                    onChange={(e) => setExperienceYears(parseInt(e.target.value) || 0)}
                  />
                )}
              </div>

              {/* Specializations selector for lawyer */}
              {isLawyer && (
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2 block select-none">
                    Practice Areas (Select 1 to 5)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {CANONICAL_PRACTICE_AREAS.map((spec) => {
                      const isSelected = selectedSpecs.includes(spec);
                      return (
                        <button
                          type="button"
                          key={spec}
                          onClick={() => toggleSpecialization(spec)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#1A365D] text-white border-[#1A365D] shadow-xs'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {isSelected ? '✓ ' : '+ '}
                          {spec}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button type="submit" variant="primary" loading={isSaving}>
                  Save Changes
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Right Help & Security Column (1 col) */}
        <div className="flex flex-col gap-6">
          {/* Help & Support Card */}
          <Card className="flex flex-col gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <HelpCircle size={18} className="text-[#1A365D]" />
                <span>Legal Support &amp; Helpline</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Need help with payments, verification, or case proceedings? Our team is available 9 AM – 6 PM PKT.
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              <a
                href={`tel:${SUPPORT_CONFIG.phone}`}
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-200/80 bg-slate-50 hover:bg-slate-100 transition-colors text-slate-800 text-xs font-semibold"
              >
                <Phone size={16} className="text-[#1A365D] shrink-0" />
                <div>
                  <div className="text-[11px] text-slate-400 font-medium uppercase">Official Helpline</div>
                  <div>{SUPPORT_CONFIG.phone}</div>
                </div>
              </a>

              <a
                href={`https://wa.me/${SUPPORT_CONFIG.whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100/70 transition-colors text-emerald-900 text-xs font-semibold"
              >
                <MessageSquare size={16} className="text-emerald-600 shrink-0" />
                <div>
                  <div className="text-[11px] text-emerald-600 font-medium uppercase">WhatsApp Direct Support</div>
                  <div>Instant consultation assistance</div>
                </div>
              </a>

              <a
                href={`mailto:${SUPPORT_CONFIG.email}`}
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-200/80 bg-slate-50 hover:bg-slate-100 transition-colors text-slate-800 text-xs font-semibold"
              >
                <Mail size={16} className="text-[#1A365D] shrink-0" />
                <div>
                  <div className="text-[11px] text-slate-400 font-medium uppercase">Email Inquiries</div>
                  <div className="truncate">{SUPPORT_CONFIG.email}</div>
                </div>
              </a>
            </div>
          </Card>

          {/* Account Security & Danger Zone Card */}
          <Card className="flex flex-col gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Account Actions
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Manage your session or permanently request account deletion.
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              <Button
                variant="outline"
                onClick={handleLogout}
                icon={<LogOut size={15} />}
                fullWidth
              >
                Sign Out
              </Button>

              <Button
                variant="danger"
                onClick={() => setShowDeleteModal(true)}
                icon={<Trash2 size={15} />}
                fullWidth
              >
                Delete Account &amp; Data
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Delete Account Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Permanently Delete Account"
        maxWidth="480px"
      >
        <div className="flex flex-col gap-4">
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs text-rose-800 leading-relaxed">
            <strong className="block font-bold text-rose-900 mb-1">
              Warning: Permanent Data Wipe
            </strong>
            All your cases, proposals, active chats, and profile data will be permanently wiped according to our Privacy Policy and Google Play data deletion compliance.
          </div>

          <p className="text-xs text-slate-700">
            To confirm deletion, please type <strong className="font-bold text-slate-900">DELETE</strong> in the box below:
          </p>

          <Input
            value={deleteConfirmation}
            onChange={(e) => setDeleteConfirmation(e.target.value)}
            placeholder="Type DELETE to confirm"
          />

          <Input
            label="Current Password (if password account)"
            type="password"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            placeholder="Enter password to reauthenticate"
          />

          <div className="flex justify-end gap-2.5 pt-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteAccount}
              loading={isDeleting}
              disabled={deleteConfirmation.trim().toUpperCase() !== 'DELETE'}
            >
              Confirm Account Deletion
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
