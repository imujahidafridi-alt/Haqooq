import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { resetPassword } from '../../services/authService';
import { useUiStore } from '../../store/uiStore';
import { Mail, KeyRound } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialEmail?: string;
}

export const ForgotPasswordModal: React.FC<Props> = ({ isOpen, onClose, initialEmail = '' }) => {
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { addToast } = useUiStore();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      addToast('Please enter your email address.', 'error');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email);
      setSent(true);
      addToast('Password reset email sent. Check your inbox.', 'success');
    } catch (err: any) {
      addToast(err?.message || 'Failed to send reset email. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Reset Password" maxWidth="460px">
      {sent ? (
        <div className="text-center py-4 space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 inline-flex items-center justify-center">
            <Mail size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Check Your Email</h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
              We have dispatched a secure password reset link to <strong className="text-slate-800">{email}</strong>. Follow the instructions to create a new password.
            </p>
          </div>
          <div className="pt-2">
            <Button variant="primary" fullWidth onClick={onClose}>
              Back to Sign In
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleReset} className="space-y-4">
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            Enter your registered email address and we'll send you a secure link to reset your account password.
          </p>

          <Input
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="counselor@example.com"
            icon={<Mail size={16} />}
            required
          />

          <div className="flex gap-3 pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="flex-1" loading={loading} icon={<KeyRound size={16} />}>
              Send Reset Link
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
