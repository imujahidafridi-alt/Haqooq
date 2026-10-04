import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { postCaseToMarketplace, classifyCaseWithAI } from '../../services/caseService';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { CANONICAL_PRACTICE_AREAS, CITIES } from '../../constants/legalDomains';
import { CourtLevel, UrgencyLevel, BudgetType } from '../../types/models';
import { 
  Sparkles, 
  Send, 
  CheckCircle2, 
  Clock, 
  Building2, 
  Scale, 
  Coins, 
  Briefcase 
} from 'lucide-react';

const COURT_LEVELS: { id: CourtLevel; label: string; sub: string }[] = [
  { id: 'district', label: 'District Court', sub: 'Civil & Sessions' },
  { id: 'high_court', label: 'High Court', sub: 'LHC / SHC / IHC / PHC / BHC' },
  { id: 'supreme_court', label: 'Supreme Court', sub: 'Apex Appellate' },
  { id: 'tribunal', label: 'Special Tribunal', sub: 'Banking / Labor / Service' },
];

const URGENCY_OPTIONS: { id: UrgencyLevel; label: string; turnaround: string; color: string }[] = [
  { id: 'urgent', label: 'Urgent', turnaround: 'Target response: 24–48 hours', color: 'var(--color-error)' },
  { id: 'standard', label: 'Standard', turnaround: 'Target response: 3–7 days', color: 'var(--color-primary)' },
  { id: 'flexible', label: 'Flexible / Advisory', turnaround: 'Open timeline / Legal opinion', color: 'var(--color-success)' },
];

const BUDGET_PRESETS = [15000, 30000, 50000, 100000];

interface Props {
  onSuccess?: () => void;
}

export const PostCaseView: React.FC<Props> = ({ onSuccess }) => {
  const { user } = useAuthStore();
  const { setActiveTab, addToast } = useUiStore();
  const draftKey = user ? `@haqooq_case_draft_${user.id}` : '@haqooq_case_draft_guest';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('Property / Real Estate Law');
  const [city, setCity] = useState<string>('Lahore');
  const [jurisdictionCity, setJurisdictionCity] = useState<string>('Lahore');
  const [courtLevel, setCourtLevel] = useState<CourtLevel>('district');
  const [urgency, setUrgency] = useState<UrgencyLevel>('standard');
  const [budgetType, setBudgetType] = useState<BudgetType>('open_to_quotes');
  const [budgetAmount, setBudgetAmount] = useState<string>('');

  const [isClassifying, setIsClassifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [publishedCaseId, setPublishedCaseId] = useState<string | null>(null);

  // Restore draft on mount
  useEffect(() => {
    if (user?.role === 'lawyer') {
      setActiveTab('feed');
      return;
    }
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const d = JSON.parse(raw);
        if (d.title) setTitle(d.title);
        if (d.description) setDescription(d.description);
        if (d.category) setCategory(d.category);
        if (d.city) setCity(d.city);
        if (d.jurisdictionCity) setJurisdictionCity(d.jurisdictionCity);
        if (d.courtLevel) setCourtLevel(d.courtLevel);
        if (d.urgency) setUrgency(d.urgency);
        if (d.budgetType) setBudgetType(d.budgetType);
        if (d.budgetAmount) setBudgetAmount(d.budgetAmount.toString());
      }
    } catch (e) {}
  }, [draftKey]);

  // Debounced auto-save draft
  useEffect(() => {
    const timer = setTimeout(() => {
      if (title || description) {
        localStorage.setItem(
          draftKey,
          JSON.stringify({
            title,
            description,
            category,
            city,
            jurisdictionCity,
            courtLevel,
            urgency,
            budgetType,
            budgetAmount: budgetAmount ? parseFloat(budgetAmount) : undefined,
          })
        );
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [title, description, category, city, jurisdictionCity, courtLevel, urgency, budgetType, budgetAmount, draftKey]);

  const handleAiClassification = async () => {
    if (!description.trim() || description.trim().length < 15) {
      addToast('Please write at least a few sentences describing your legal matter first.', 'info');
      return;
    }

    setIsClassifying(true);
    try {
      const suggestedCategory = await classifyCaseWithAI(description);
      setCategory(suggestedCategory);
      addToast(`AI Classified case under "${suggestedCategory}".`, 'success');
    } catch (e) {
      addToast('AI classification fallback applied.', 'info');
    } finally {
      setIsClassifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || title.trim().length < 10) {
      addToast('Case title must be at least 10 characters.', 'error');
      return;
    }
    if (title.trim().length > 100) {
      addToast('Case title cannot exceed 100 characters.', 'error');
      return;
    }
    if (!description.trim() || description.trim().length < 25) {
      addToast('Statement of facts must be at least 25 characters.', 'error');
      return;
    }
    if (description.trim().length > 2500) {
      addToast('Description cannot exceed 2,500 characters.', 'error');
      return;
    }

    let parsedBudget: number | undefined;
    if (budgetType === 'fixed') {
      parsedBudget = parseFloat(budgetAmount.replace(/,/g, ''));
      if (isNaN(parsedBudget) || parsedBudget < 5000) {
        addToast('Fixed budget must be at least PKR 5,000.', 'error');
        return;
      }
      if (parsedBudget > 50000000) {
        addToast('Budget cannot exceed PKR 50,000,000.', 'error');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const id = await postCaseToMarketplace({
        title,
        description,
        category,
        city,
        jurisdictionCity,
        courtLevel,
        urgency,
        budgetType,
        budgetAmount: parsedBudget,
      });

      setPublishedCaseId(id);
      localStorage.removeItem(draftKey);
      setSuccessModalOpen(true);
    } catch (err: any) {
      addToast(err?.message || 'Could not post case to marketplace.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinish = () => {
    setSuccessModalOpen(false);
    setTitle('');
    setDescription('');
    setBudgetAmount('');
    setActiveTab('cases');
  };

  if (user?.role === 'lawyer') {
    return (
      <div className="p-8 text-center max-w-lg mx-auto space-y-4 my-12 bg-white rounded-3xl border border-slate-200 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
          <Briefcase size={28} />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Advocate Workspace Restricted</h2>
        <p className="text-sm text-slate-500 leading-relaxed">
          Posting legal matters is reserved for citizens and clients. As a verified advocate, you can discover client cases and submit proposals in the Case Marketplace.
        </p>
        <button
          type="button"
          onClick={() => setActiveTab('feed')}
          className="bg-[#1A365D] hover:bg-[#234574] text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer shadow-xs inline-flex items-center gap-2"
        >
          <span>Go to Case Marketplace</span>
        </button>
      </div>
    );
  }

  return (
    <div className="py-6 sm:py-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-1.5 pb-3 border-b border-slate-200">
        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1A365D] uppercase tracking-wider bg-blue-50 px-3 py-1 rounded-full">
          <Scale size={14} />
          <span>Bar-Verified Marketplace</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1A365D] tracking-tight">
          Post a Legal Matter
        </h1>
        <p className="text-sm text-slate-500">
          Describe your legal issue. High Court and District Court advocates across Pakistan will review and submit transparent bids.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Card 1: Core Details */}
        <Card className="border border-slate-200 shadow-xs p-6 space-y-5">
          <h3 className="text-base sm:text-lg font-bold text-[#1A365D] flex items-center gap-2">
            <Briefcase size={20} className="text-[#C5A880]" />
            <span>1. Matter Description</span>
          </h3>

          <div className="space-y-4">
            <Input
              label="Matter Title / Subject (10–100 characters)"
              placeholder="e.g. Property boundary encroachment & title transfer dispute"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              helperText={`Min 10 characters (${title.trim().length}/100)`}
              required
            />

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">
                  Detailed Statement of Facts (Min 25 characters)
                </label>
                <button
                  type="button"
                  onClick={handleAiClassification}
                  disabled={isClassifying}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8C6D3B] bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1 rounded-full transition-all cursor-pointer"
                >
                  <Sparkles size={13} className="text-amber-600" />
                  <span>{isClassifying ? 'Analyzing...' : 'Auto-Classify with AI'}</span>
                </button>
              </div>

              <textarea
                rows={5}
                placeholder="Provide essential details: timeline of events, opposing parties, previous court filings (if any), and your desired relief..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50/50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A365D]/20 focus:border-[#1A365D] placeholder:text-slate-400 resize-y transition-all leading-relaxed"
                required
              />
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Draft is auto-saved to your browser storage as you type.</span>
                <span className={description.trim().length < 25 ? 'text-amber-600 font-medium' : 'text-emerald-600 font-medium'}>
                  {description.trim().length}/2500 characters (min 25)
                </span>
              </div>
            </div>

            {/* Category Chips */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 block">
                Legal Practice Area
              </label>
              <div className="flex flex-wrap gap-2">
                {CANONICAL_PRACTICE_AREAS.map((cat) => {
                  const isSelected = category === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#1A365D] text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>

        {/* Card 2: Jurisdiction & Forum */}
        <Card className="border border-slate-200 shadow-xs p-6 space-y-5">
          <h3 className="text-base sm:text-lg font-bold text-[#1A365D] flex items-center gap-2">
            <Building2 size={20} className="text-[#C5A880]" />
            <span>2. Jurisdiction & Forum</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Your Client City
              </label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full h-11 px-3.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-slate-900 text-sm font-medium focus:bg-white focus:border-[#1A365D] focus:ring-3 focus:ring-[#1A365D]/10 transition-all outline-none shadow-xs"
              >
                {CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Court Jurisdiction City
              </label>
              <select
                value={jurisdictionCity}
                onChange={(e) => setJurisdictionCity(e.target.value)}
                className="w-full h-11 px-3.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-slate-900 text-sm font-medium focus:bg-white focus:border-[#1A365D] focus:ring-3 focus:ring-[#1A365D]/10 transition-all outline-none shadow-xs"
              >
                {CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 block">
              Target Court Level
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {COURT_LEVELS.map((cl) => {
                const isSelected = courtLevel === cl.id;
                return (
                  <button
                    key={cl.id}
                    type="button"
                    onClick={() => setCourtLevel(cl.id)}
                    className={`p-3.5 rounded-xl text-left border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#1A365D] bg-blue-50/60 ring-2 ring-[#1A365D]/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className={`font-semibold text-sm ${isSelected ? 'text-[#1A365D]' : 'text-slate-800'}`}>
                      {cl.label}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {cl.sub}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Card 3: Urgency & Budget */}
        <Card className="border border-slate-200 shadow-xs p-6 space-y-5">
          <h3 className="text-base sm:text-lg font-bold text-[#1A365D] flex items-center gap-2">
            <Coins size={20} className="text-[#C5A880]" />
            <span>3. Urgency & Budget</span>
          </h3>

          {/* Urgency */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 block">
              Urgency & Expected Response Time
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {URGENCY_OPTIONS.map((u) => {
                const isSelected = urgency === u.id;
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setUrgency(u.id)}
                    className={`p-3.5 rounded-xl text-left border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#1A365D] bg-blue-50/60 ring-2 ring-[#1A365D]/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-sm text-slate-900">
                      <Clock size={15} className={u.id === 'urgent' ? 'text-rose-600' : 'text-[#1A365D]'} />
                      <span>{u.label}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {u.turnaround}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Budget Type */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <label className="text-xs font-semibold text-slate-700 block">
              Budget Preference
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setBudgetType('open_to_quotes')}
                className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold border transition-all cursor-pointer ${
                  budgetType === 'open_to_quotes'
                    ? 'border-[#1A365D] bg-[#1A365D] text-white shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                Open to Lawyer Quotes
              </button>
              <button
                type="button"
                onClick={() => setBudgetType('fixed')}
                className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold border transition-all cursor-pointer ${
                  budgetType === 'fixed'
                    ? 'border-[#1A365D] bg-[#1A365D] text-white shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                Fixed Budget (PKR)
              </button>
            </div>

            {budgetType === 'fixed' && (
              <div className="space-y-3 pt-2">
                <Input
                  label="Target Advocate Fee (PKR)"
                  type="number"
                  placeholder="e.g. 50000"
                  value={budgetAmount}
                  onChange={(e) => setBudgetAmount(e.target.value)}
                  required
                />
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-slate-400">Quick Presets:</span>
                  {BUDGET_PRESETS.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setBudgetAmount(amt.toString())}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 cursor-pointer transition-all"
                    >
                      PKR {amt.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Submission Bar */}
        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={isSubmitting}
            icon={<Send size={18} />}
            className="w-full sm:w-auto px-8"
          >
            Publish Case to Marketplace
          </Button>
        </div>
      </form>

      {/* Success Modal */}
      <Modal isOpen={successModalOpen} onClose={handleFinish} title="Matter Successfully Published">
        <div className="text-center py-4 space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 inline-flex items-center justify-center">
            <CheckCircle2 size={32} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              Your Legal Case is Live!
            </h3>
            <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto leading-relaxed">
              Verified advocates in <strong className="text-slate-900">{jurisdictionCity}</strong> specializing in <strong className="text-slate-900">{category}</strong> have been notified. You can review incoming proposals under "My Cases".
            </p>
          </div>

          <div className="pt-2">
            <Button variant="primary" size="lg" fullWidth onClick={handleFinish}>
              View in My Cases
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
