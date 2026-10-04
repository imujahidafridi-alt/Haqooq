import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { EasypaisaCheckoutModal } from './EasypaisaCheckoutModal';
import { db } from '../../lib/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { Star, ShieldCheck, Zap, Briefcase, CheckCircle, Receipt, Clock, ExternalLink } from 'lucide-react';
import { CreditPurchase } from '../../types/models';

export const ProServicesView: React.FC = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'plans' | 'history'>('plans');
  const [selectedPlan, setSelectedPlan] = useState<{
    name: string;
    credits: number;
    amount: number;
  } | null>(null);

  const [history, setHistory] = useState<CreditPurchase[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    const q = query(
      collection(db, 'credit_purchases'),
      where('lawyerId', '==', user.id),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as CreditPurchase[];
        setHistory(docs);
        setLoadingHistory(false);
      },
      (err) => {
        console.error('Error listening to credit purchases:', err);
        setLoadingHistory(false);
      }
    );

    return () => unsubscribe();
  }, [user?.id]);

  const handleBuy = (name: string, credits: number, amount: number) => {
    setSelectedPlan({ name, credits, amount });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="success">Approved</Badge>;
      case 'rejected':
        return <Badge variant="danger">Rejected</Badge>;
      default:
        return <Badge variant="warning">Under Review</Badge>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-6 sm:py-8 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-[#1A365D] via-[#152a48] to-[#0d1b2e] rounded-3xl p-6 sm:p-8 text-white shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-2">
            <Star size={24} className="text-[#C5A880]" />
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Advocate Pro Credits
            </h1>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            Acquire bidding credits manually via Easypaisa to pitch to high-value client cases, connect directly with clients, and grow your practice.
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-6 py-4 text-center shrink-0 w-full sm:w-auto">
          <div className="text-xs uppercase tracking-widest text-slate-300 font-semibold">
            Available Balance
          </div>
          <div className="text-3xl font-black text-[#C5A880] mt-0.5">
            {(user as any)?.credits || 0} <span className="text-sm font-semibold text-white/80">Credits</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('plans')}
          className={`pb-3 px-2 text-sm sm:text-base font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'plans'
              ? 'border-[#1A365D] text-[#1A365D]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Available Plans
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 px-2 text-sm sm:text-base font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'history'
              ? 'border-[#1A365D] text-[#1A365D]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Purchase History</span>
          {history.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700">
              {history.length}
            </span>
          )}
        </button>
      </div>

      {/* Plans View */}
      {activeTab === 'plans' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {/* Starter Pack */}
          <Card className="flex flex-col justify-between border border-slate-200 rounded-3xl p-6 shadow-xs hover:shadow-md transition-all">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Briefcase size={22} className="text-[#1A365D]" />
                  <h3 className="text-lg font-bold text-[#1A365D]">
                    Starter Pack
                  </h3>
                </div>
                <Badge variant="info" size="sm">12 Mo. Validity</Badge>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 min-h-[36px]">
                Ideal for trying out the platform and submitting initial proposals.
              </p>

              <div className="py-2">
                <div className="text-3xl font-extrabold text-[#1A365D]">
                  PKR 100
                </div>
                <div className="text-xs text-slate-400 font-medium">
                  for 10 Bidding Credits
                </div>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-700">
                  <CheckCircle size={16} className="text-emerald-500 shrink-0" />
                  <span>10 Bidding Credits</span>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-700">
                  <CheckCircle size={16} className="text-emerald-500 shrink-0" />
                  <span>Standard Client Application</span>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-700">
                  <CheckCircle size={16} className="text-emerald-500 shrink-0" />
                  <span>Manual P2P Verification</span>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <Button
                variant="outline"
                fullWidth
                onClick={() => handleBuy('Starter Pack', 10, 100)}
              >
                Buy Starter Pack
              </Button>
            </div>
          </Card>

          {/* Professional Pack (Featured) */}
          <div className="relative flex flex-col justify-between border-2 border-[#C5A880] bg-slate-900 text-white rounded-3xl p-6 shadow-xl md:-translate-y-2 transition-all">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#C5A880] text-slate-950 px-3.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider shadow-sm">
              Recommended
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center pt-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={22} className="text-[#C5A880]" />
                  <h3 className="text-lg font-bold text-white">
                    Professional
                  </h3>
                </div>
                <span className="bg-[#C5A880]/20 text-[#C5A880] px-2.5 py-0.5 rounded-md text-xs font-bold">
                  Lifetime
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 min-h-[36px]">
                Recommended for active advocates looking for maximum client visibility and value.
              </p>

              <div className="py-2">
                <div className="text-3xl font-extrabold text-[#C5A880]">
                  PKR 1,000
                </div>
                <div className="text-xs text-slate-400 font-medium">
                  for 100 Bidding Credits
                </div>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-slate-800">
                <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-200">
                  <CheckCircle size={16} className="text-[#C5A880] shrink-0" />
                  <span>100 Bidding Credits</span>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-200">
                  <CheckCircle size={16} className="text-[#C5A880] shrink-0" />
                  <span>Featured Placement in Search</span>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-200">
                  <CheckCircle size={16} className="text-[#C5A880] shrink-0" />
                  <span>Priority Client Visibility</span>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => handleBuy('Professional Pack', 100, 1000)}
              >
                Buy Professional Pack
              </Button>
            </div>
          </div>

          {/* Elite Pack */}
          <Card className="flex flex-col justify-between border border-slate-200 rounded-3xl p-6 shadow-xs hover:shadow-md transition-all">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Zap size={22} className="text-[#1A365D]" />
                  <h3 className="text-lg font-bold text-[#1A365D]">
                    Elite Pack
                  </h3>
                </div>
                <Badge variant="info" size="sm">Lifetime</Badge>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 min-h-[36px]">
                Massive value for law firm owners bidding on high-budget enterprise cases.
              </p>

              <div className="py-2">
                <div className="text-3xl font-extrabold text-[#1A365D]">
                  PKR 1,800
                </div>
                <div className="text-xs text-slate-400 font-medium">
                  for 200 Bidding Credits
                </div>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-700">
                  <CheckCircle size={16} className="text-emerald-500 shrink-0" />
                  <span>200 Bidding Credits</span>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-700">
                  <CheckCircle size={16} className="text-emerald-500 shrink-0" />
                  <span>Verified Advocate Badge</span>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-700">
                  <CheckCircle size={16} className="text-emerald-500 shrink-0" />
                  <span>Top Highlight Profile Tag</span>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-700">
                  <CheckCircle size={16} className="text-emerald-500 shrink-0" />
                  <span>Fast-Track Admin Approval</span>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-700">
                  <CheckCircle size={16} className="text-emerald-500 shrink-0" />
                  <span>Dedicated WhatsApp Support</span>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <Button
                variant="outline"
                fullWidth
                onClick={() => handleBuy('Elite Pack', 200, 1800)}
              >
                Buy Elite Pack
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* History View */}
      {activeTab === 'history' && (
        <div>
          {loadingHistory ? (
            <div className="py-16 text-center">
              <LoadingSpinner label="Loading purchase history..." />
            </div>
          ) : history.length === 0 ? (
            <EmptyState
              title="No Purchase History Yet"
              description="When you buy bidding credits via Easypaisa, your submission status and receipts will show up here."
              icon={<Receipt size={40} />}
              action={
                <Button variant="primary" onClick={() => setActiveTab('plans')}>
                  View Credit Plans
                </Button>
              }
            />
          ) : (
            <div className="space-y-4">
              {history.map((tx) => (
                <Card key={tx.id} className="border border-slate-200 rounded-2xl p-5 space-y-3">
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base text-slate-900">{tx.planName}</span>
                        <span className="text-xs text-slate-500">
                          ({tx.credits} credits)
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <Clock size={12} />
                        <span>Submitted on {new Date(tx.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                    <div>{getStatusBadge(tx.status)}</div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 border border-slate-100 p-3 rounded-xl text-xs">
                    <div>
                      <span className="text-slate-400 font-semibold block">TRX ID:</span>
                      <div className="font-bold text-slate-800">{tx.transactionId}</div>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block">Sender Title:</span>
                      <div className="font-bold text-slate-800">{tx.senderTitle}</div>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block">Sender Number:</span>
                      <div className="font-bold text-slate-800">{tx.senderNumber}</div>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block">Amount:</span>
                      <div className="font-bold text-[#1A365D]">PKR {tx.amount.toLocaleString()}</div>
                    </div>
                  </div>

                  {tx.proofUrl && (
                    <div className="pt-1">
                      <a
                        href={tx.proofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[#1A365D] hover:underline inline-flex items-center gap-1 font-semibold"
                      >
                        <ExternalLink size={12} />
                        <span>View Uploaded Receipt</span>
                      </a>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Checkout Modal */}
      {selectedPlan && (
        <EasypaisaCheckoutModal
          isOpen={!!selectedPlan}
          onClose={() => setSelectedPlan(null)}
          planName={selectedPlan.name}
          credits={selectedPlan.credits}
          amount={selectedPlan.amount}
        />
      )}
    </div>
  );
};
