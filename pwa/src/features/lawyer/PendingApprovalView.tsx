import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { db, storage } from '../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { authService } from '../../services/authService';
import { SUPPORT_CONFIG } from '../../constants/supportConfig';
import {
  ShieldAlert,
  Clock,
  Upload,
  Phone,
  MessageSquare,
  Mail,
  LogOut,
  AlertTriangle,
  FileCheck,
} from 'lucide-react';

export const PendingApprovalView: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { addToast } = useUIStore();

  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const isSuspended = user?.status === 'suspended';
  const isRejected = user?.status === 'rejected';
  const isUnderReview =
    user?.status === 'under_review' ||
    (user?.credentialUrl && !isRejected && !isSuspended);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        addToast('Document must be under 10MB', 'error');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUploadCredential = async () => {
    if (!selectedFile || !user) return;

    try {
      setIsUploading(true);
      const ext = selectedFile.name.split('.').pop() || 'pdf';
      const storageRef = ref(storage, `credentials/${user.id}/${Date.now()}_credential.${ext}`);
      await uploadBytes(storageRef, selectedFile, { contentType: selectedFile.type });
      const downloadUrl = await getDownloadURL(storageRef);

      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        credentialUrl: downloadUrl,
        status: 'under_review',
        updatedAt: new Date().toISOString(),
      });

      setSelectedFile(null);
      addToast('Credentials uploaded successfully! Under review by compliance team.', 'success');
    } catch (err: any) {
      console.error('Credential upload error:', err);
      addToast(err.message || 'Failed to upload document. Please try again.', 'error');
    } finally {
      setIsUploading(false);
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 sm:p-6">
      <Card className="max-w-xl w-full p-6 sm:p-8 rounded-3xl shadow-lg border border-slate-200/90 text-center space-y-6">
        {/* Status Icon */}
        <div className="flex justify-center">
          {isSuspended ? (
            <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center text-rose-700">
              <AlertTriangle size={32} />
            </div>
          ) : isUnderReview ? (
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
              <Clock size={32} />
            </div>
          ) : isRejected ? (
            <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center text-rose-700">
              <ShieldAlert size={32} />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-[#1A365D]">
              <FileCheck size={32} />
            </div>
          )}
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Welcome, {user?.displayName || 'Counselor'}!
          </h1>
          <p className="text-xs text-slate-400 mt-1">Haqooq Bar Council Compliance Gateway</p>
        </div>

        {/* State Banners */}
        {isSuspended ? (
          <div className="bg-rose-50 border border-rose-200 text-rose-900 p-4 rounded-2xl text-left text-xs sm:text-sm space-y-1">
            <strong className="font-bold">Account Temporarily Suspended</strong>
            <p className="text-rose-700 leading-relaxed">
              Your account has been placed on hold following administrative review. If you believe this is an error, please reach out to Haqooq legal support immediately.
            </p>
          </div>
        ) : isRejected ? (
          <div className="bg-rose-50 border border-rose-200 text-rose-900 p-4 rounded-2xl text-left text-xs sm:text-sm space-y-1">
            <strong className="font-bold">Credentials Verification Declined</strong>
            <p className="text-rose-700 leading-relaxed">
              Your Bar Council license document was not accepted or could not be verified. Please re-upload a clear, valid license or enrollment certificate below.
            </p>
          </div>
        ) : isUnderReview ? (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-2xl text-left text-xs sm:text-sm space-y-1">
            <strong className="font-bold">License Verification In Progress</strong>
            <p className="text-amber-800 leading-relaxed">
              Our compliance team is verifying your Bar Council credentials against statutory databases. Most verifications are completed within 12 to 24 hours.
            </p>
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200 text-blue-900 p-4 rounded-2xl text-left text-xs sm:text-sm space-y-1">
            <strong className="font-bold">Action Required: Bar Council Verification</strong>
            <p className="text-blue-800 leading-relaxed">
              To ensure platform integrity and client trust, all legal practitioners must upload a valid Bar Council License or Enrollment Certificate before accessing client cases.
            </p>
          </div>
        )}

        {/* Upload Section (If not suspended, and either not under review or rejected) */}
        {!isSuspended && (!isUnderReview || isRejected) && (
          <div className="border-2 border-dashed border-slate-300 hover:border-[#1A365D] rounded-2xl p-6 bg-slate-50/50 hover:bg-slate-50 transition-all text-center">
            <input
              type="file"
              id="bar-credential-input"
              accept="image/*,application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor="bar-credential-input"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              <Upload size={32} className="text-[#1A365D]" />
              <span className="font-bold text-sm text-[#1A365D]">
                {selectedFile ? selectedFile.name : 'Select Bar Council License (PDF / Image)'}
              </span>
              <span className="text-xs text-slate-400">
                Up to 10MB. Must show Bar Council number and validity period clearly.
              </span>
            </label>

            {selectedFile && (
              <div className="mt-4">
                <Button
                  variant="primary"
                  fullWidth
                  loading={isUploading}
                  onClick={handleUploadCredential}
                >
                  Submit for Compliance Review
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Verified Support Channels */}
        <div className="border-t border-slate-200 pt-4 space-y-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Need Assistance or Expedited Review?
          </div>
          <div className="flex justify-center gap-2 sm:gap-3 flex-wrap">
            <a
              href={`tel:${SUPPORT_CONFIG.phone}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-all"
            >
              <Phone size={13} className="text-[#1A365D]" />
              <span>{SUPPORT_CONFIG.phone}</span>
            </a>
            <a
              href={`https://wa.me/${SUPPORT_CONFIG.whatsappNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-xs font-semibold text-emerald-800 transition-all"
            >
              <MessageSquare size={13} />
              <span>WhatsApp Support</span>
            </a>
            <a
              href={`mailto:${SUPPORT_CONFIG.email}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-all"
            >
              <Mail size={13} className="text-[#1A365D]" />
              <span>Email Support</span>
            </a>
          </div>
        </div>

        {/* Sign Out */}
        <div className="pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            icon={<LogOut size={15} />}
          >
            Sign Out of Haqooq
          </Button>
        </div>
      </Card>
    </div>
  );
};
