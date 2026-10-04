import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { db, storage } from '../../lib/firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Copy, Check, Upload, Clock, AlertCircle } from 'lucide-react';
import { SUPPORT_CONFIG } from '../../constants/supportConfig';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  planName: string;
  credits: number;
  amount: number;
}

export const EasypaisaCheckoutModal: React.FC<Props> = ({
  isOpen,
  onClose,
  planName,
  credits,
  amount,
}) => {
  const { user } = useAuthStore();
  const { addToast } = useUIStore();

  const [senderTitle, setSenderTitle] = useState('');
  const [senderNumber, setSenderNumber] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [transactionAmount, setTransactionAmount] = useState(amount.toString());
  const [transactionDateTime, setTransactionDateTime] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const resetToCurrentTime = () => {
    const now = new Date();
    const formattedDate =
      now.getFullYear() +
      '-' +
      String(now.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(now.getDate()).padStart(2, '0') +
      ' ' +
      String(now.getHours()).padStart(2, '0') +
      ':' +
      String(now.getMinutes()).padStart(2, '0');
    setTransactionDateTime(formattedDate);
  };

  useEffect(() => {
    if (isOpen) {
      resetToCurrentTime();
      setTransactionAmount(amount.toString());
      setSenderTitle('');
      setSenderNumber('');
      setTransactionId('');
      setSelectedFile(null);
      setFilePreview(null);
      setErrorMsg('');
    }
  }, [isOpen, amount]);

  const copyAccountNumber = async () => {
    try {
      await navigator.clipboard.writeText(SUPPORT_CONFIG.phone);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      addToast('Easypaisa number copied to clipboard', 'info');
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg('Proof file must be under 5MB');
        return;
      }
      setSelectedFile(file);
      setErrorMsg('');
      const reader = new FileReader();
      reader.onload = () => setFilePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setErrorMsg('');

    if (!senderTitle.trim()) {
      setErrorMsg('Sender Account Title is required.');
      return;
    }
    if (!senderNumber.trim()) {
      setErrorMsg('Sender Easypaisa Phone Number is required.');
      return;
    }
    if (!transactionId.trim()) {
      setErrorMsg('Transaction ID / Reference Number is required.');
      return;
    }
    if (!transactionAmount.trim()) {
      setErrorMsg('Transaction Amount is required.');
      return;
    }
    if (!transactionDateTime.trim()) {
      setErrorMsg('Transaction Date & Time is required.');
      return;
    }

    const enteredAmount = parseFloat(transactionAmount);
    if (isNaN(enteredAmount) || enteredAmount <= 0) {
      setErrorMsg('Please enter a valid Transaction Amount.');
      return;
    }
    if (enteredAmount !== amount) {
      setErrorMsg(`Transaction Amount must match the plan price of PKR ${amount.toLocaleString()}.`);
      return;
    }

    setIsSubmitting(true);
    try {
      // Duplicate transaction check
      const duplicateQuery = query(
        collection(db, 'credit_purchases'),
        where('lawyerId', '==', user.id),
        where('transactionId', '==', transactionId.trim())
      );
      const duplicateSnap = await getDocs(duplicateQuery);
      if (!duplicateSnap.empty) {
        setErrorMsg('You have already submitted a request with this Transaction ID.');
        setIsSubmitting(false);
        return;
      }

      // Upload proof to Firebase Storage if provided
      let proofUrl = '';
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop() || 'jpg';
        const storageRef = ref(storage, `receipts/${user.id}/${Date.now()}.${fileExt}`);
        await uploadBytes(storageRef, selectedFile, { contentType: selectedFile.type });
        proofUrl = await getDownloadURL(storageRef);
      }

      const packageId = planName.toLowerCase().includes('starter')
        ? 'starter'
        : planName.toLowerCase().includes('pro')
        ? 'professional'
        : 'elite';

      // Write credit_purchase document
      await addDoc(collection(db, 'credit_purchases'), {
        lawyerId: user.id,
        packageId,
        planName,
        credits,
        amount,
        senderTitle: senderTitle.trim(),
        senderNumber: senderNumber.trim(),
        transactionId: transactionId.trim(),
        transactionAmount: enteredAmount,
        transactionDateTime: transactionDateTime.trim(),
        proofUrl: proofUrl || null,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });

      // Verification notification log
      await addDoc(collection(db, 'notifications'), {
        userId: user.id,
        title: 'Transaction Submitted',
        body: `Your request for ${planName} (PKR ${amount}) is pending admin verification.`,
        message: `Your request for ${planName} (PKR ${amount}) is pending admin verification.`,
        read: false,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });

      addToast('Payment submitted successfully! Admin will verify and credit your balance.', 'success');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Payment submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Secure Payment via Easypaisa"
      maxWidth="640px"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs sm:text-sm flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Selected Plan Summary */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 grid grid-cols-3 gap-3 text-center sm:text-left">
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Plan</div>
            <div className="font-bold text-sm text-[#1A365D] mt-0.5">{planName}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Credits</div>
            <div className="font-bold text-sm text-slate-800 mt-0.5">{credits} Bids</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Amount</div>
            <div className="font-extrabold text-base text-[#C5A880] mt-0.5">PKR {amount.toLocaleString()}</div>
          </div>
        </div>

        {/* Easypaisa Merchant Account Box */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-2">
          <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
            Official Easypaisa Payment Destination
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs text-emerald-900">
                Account Title: <strong className="font-semibold">Mujahid Khan / Haqooq Legal</strong>
              </div>
              <div className="text-xl font-mono font-black text-emerald-800 tracking-wider">
                {SUPPORT_CONFIG.phone}
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={copyAccountNumber}
              icon={copied ? <Check size={16} className="text-emerald-700" /> : <Copy size={16} />}
              className="bg-white border-emerald-300 text-emerald-800 hover:bg-emerald-100 self-start sm:self-auto"
            >
              {copied ? 'Copied!' : 'Copy Number'}
            </Button>
          </div>
          <p className="text-[11px] text-emerald-700 leading-relaxed pt-1">
            * Open Easypaisa &gt; Money Transfer &gt; Easypaisa Account &gt; send <strong>PKR {amount}</strong> to <strong>{SUPPORT_CONFIG.phone}</strong>, then enter the TID below.
          </p>
        </div>

        {/* Form Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Sender Account Title"
            placeholder="e.g. Muhammad Ali"
            value={senderTitle}
            onChange={(e) => setSenderTitle(e.target.value)}
            required
          />
          <Input
            label="Sender Easypaisa Number"
            placeholder="e.g. 03001234567"
            value={senderNumber}
            onChange={(e) => setSenderNumber(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Transaction ID / TRX ID"
            placeholder="e.g. 29384758192"
            value={transactionId}
            onChange={(e) => setTransactionId(e.target.value)}
            helperText="11-digit TID from Easypaisa SMS"
            required
          />
          <Input
            label="Amount Paid (PKR)"
            type="number"
            value={transactionAmount}
            onChange={(e) => setTransactionAmount(e.target.value)}
            required
          />
        </div>

        {/* Date Time Picker with Reset Button */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 block">
            Transaction Date &amp; Time
          </label>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                value={transactionDateTime}
                onChange={(e) => setTransactionDateTime(e.target.value)}
                placeholder="YYYY-MM-DD HH:mm"
                required
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={resetToCurrentTime}
              title="Reset to current time"
              icon={<Clock size={16} />}
              className="shrink-0 h-[42px]"
            >
              Now
            </Button>
          </div>
        </div>

        {/* Payment Proof Upload */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 block">
            Payment Screenshot / Proof (Optional, Recommended)
          </label>
          <div className="border-2 border-dashed border-slate-300 hover:border-[#1A365D] rounded-2xl p-5 text-center bg-slate-50/50 hover:bg-slate-50 transition-all cursor-pointer relative">
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            {filePreview ? (
              <div className="flex flex-col items-center gap-2">
                <img
                  src={filePreview}
                  alt="Receipt Preview"
                  className="max-h-32 max-w-full rounded-lg object-contain shadow-xs"
                />
                <span className="text-xs text-[#1A365D] font-medium">Click or drop to replace image</span>
              </div>
            ) : selectedFile ? (
              <div className="text-xs text-slate-800">
                Selected: <strong className="font-semibold">{selectedFile.name}</strong>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5 text-slate-400">
                <Upload size={24} className="text-[#1A365D]" />
                <span className="text-xs font-medium text-slate-700">Drop Easypaisa receipt here, or click to browse</span>
                <span className="text-[11px] text-slate-400">JPG, PNG or PDF up to 5MB</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={isSubmitting}>
            Submit Payment Proof
          </Button>
        </div>
      </form>
    </Modal>
  );
};
