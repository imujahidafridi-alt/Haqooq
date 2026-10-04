import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Avatar } from '../../components/common/Avatar';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { closeCase } from '../../services/caseService';
import { LegalCase } from '../../types/models';
import { collection, query, where, onSnapshot, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Users, MessageSquare, Plus, CheckCircle, Calendar, Flag } from 'lucide-react';

export const LawyerCasesView: React.FC = () => {
  const { user } = useAuthStore();
  const { openChat, addToast, setActiveTab } = useUiStore();

  const [cases, setCases] = useState<LegalCase[]>([]);
  const [loading, setLoading] = useState(true);

  // New Milestone Event Modal
  const [selectedCaseForMilestone, setSelectedCaseForMilestone] = useState<LegalCase | null>(null);
  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [milestoneDesc, setMilestoneDesc] = useState('');
  const [isPostingMilestone, setIsPostingMilestone] = useState(false);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'cases'), where('assignedLawyerId', '==', user.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as LegalCase[];

      data.sort((a, b) => b.createdAt - a.createdAt);
      setCases(data);
      setLoading(false);
    }, (error) => {
      console.warn('Lawyer cases snapshot error:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handlePostMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseForMilestone || !milestoneTitle.trim()) return;

    setIsPostingMilestone(true);
    try {
      const caseRef = doc(db, 'cases', selectedCaseForMilestone.id);
      const newEvent = {
        id: Date.now().toString(),
        title: milestoneTitle.trim(),
        description: milestoneDesc.trim(),
        date: Date.now(),
      };

      await updateDoc(caseRef, {
        timeline: arrayUnion(newEvent),
        updatedAt: Date.now(),
      });

      addToast(`Milestone "${milestoneTitle}" updated on client timeline!`, 'success');
      setSelectedCaseForMilestone(null);
      setMilestoneTitle('');
      setMilestoneDesc('');
    } catch (e: any) {
      addToast(e?.message || 'Failed to update case milestone.', 'error');
    } finally {
      setIsPostingMilestone(false);
    }
  };

  const handleCloseCase = async (caseId: string) => {
    if (!window.confirm('Are you sure you want to mark this client matter as fully resolved and closed?')) {
      return;
    }

    try {
      await closeCase(caseId, 'Lawyer');
      addToast('Case marked as resolved successfully.', 'success');
    } catch (e: any) {
      addToast(e?.message || 'Could not close case.', 'error');
    }
  };

  return (
    <div className="py-6 sm:py-8 space-y-6">
      <div className="pb-2 border-b border-slate-200">
        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1A365D] uppercase tracking-wider bg-blue-50 px-3 py-1 rounded-full">
          <Users size={14} />
          <span>Case Portfolio</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1A365D] tracking-tight mt-1">
          Active Client Matters
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Track retained matters, publish official court hearing milestones, and communicate with clients under privilege.
        </p>
      </div>

      {loading ? (
        <div className="py-16 text-center">
          <LoadingSpinner label="Loading your active clients..." />
        </div>
      ) : cases.length === 0 ? (
        <EmptyState
          icon={<Users size={36} />}
          title="No Active Retained Matters"
          description="Submit proposals to client listings on the Case Feed to secure engagements."
          action={
            <Button variant="primary" onClick={() => setActiveTab('feed')}>
              Browse Case Feed
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cases.map((item) => {
            const isActive = item.status === 'active';
            const isClosed = item.status === 'closed';

            return (
              <Card
                key={item.id}
                hoverable
                className="flex flex-col justify-between h-full border border-slate-200 shadow-xs hover:shadow-md transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#1A365D] uppercase tracking-wider bg-blue-50/80 px-2.5 py-1 rounded-md">
                      {item.category}
                    </span>
                    <Badge variant={isActive ? 'success' : 'neutral'} size="sm">
                      {isActive ? 'Engaged' : 'Closed'}
                    </Badge>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 leading-snug line-clamp-1 hover:text-[#1A365D]">
                    {item.title}
                  </h3>

                  <div className="flex items-center gap-2.5">
                    <Avatar name={item.clientName} size="sm" />
                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        {item.clientName || 'Client'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Jurisdiction: {item.jurisdictionCity || item.city}
                      </div>
                    </div>
                  </div>

                  {/* Timeline list */}
                  <div className="border-t border-slate-100 pt-3 mt-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Timeline Milestones ({item.timeline?.length || 0})
                      </span>
                      {isActive && (
                        <button
                          type="button"
                          onClick={() => setSelectedCaseForMilestone(item)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-[#1A365D] hover:underline cursor-pointer"
                        >
                          <Plus size={13} />
                          <span>Add Event</span>
                        </button>
                      )}
                    </div>

                    <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                      {item.timeline?.map((ev) => (
                        <div key={ev.id} className="text-xs text-slate-600 pl-2.5 border-l-2 border-[#1A365D]/30 py-0.5">
                          <span className="font-semibold text-slate-900">{ev.title}</span>
                          <span className="text-[10px] text-slate-400 ml-1.5">
                            ({new Date(ev.date).toLocaleDateString()})
                          </span>
                          {ev.description && (
                            <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{ev.description}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center gap-2">
                  <Button
                    variant="primary"
                    className="flex-1"
                    onClick={() => openChat(item.id, `Client: ${item.clientName || 'Matter'}`)}
                    icon={<MessageSquare size={16} />}
                  >
                    Message Client
                  </Button>

                  {isActive && (
                    <Button
                      variant="outline"
                      className="text-rose-600 border-rose-200 hover:bg-rose-50"
                      onClick={() => handleCloseCase(item.id)}
                    >
                      Resolve
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Milestone Modal */}
      {selectedCaseForMilestone && (
        <Modal
          isOpen={!!selectedCaseForMilestone}
          onClose={() => setSelectedCaseForMilestone(null)}
          title="Add Timeline Milestone"
          maxWidth="500px"
        >
          <form onSubmit={handlePostMilestone} className="space-y-4">
            <p className="text-sm text-slate-600">
              Add a new official court milestone to <strong className="font-semibold text-slate-900">{selectedCaseForMilestone.title}</strong>.
            </p>

            <Input
              label="Milestone Title"
              placeholder="e.g. Formal Defense Written Statement Filed"
              value={milestoneTitle}
              onChange={(e) => setMilestoneTitle(e.target.value)}
              required
            />

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Description / Next Steps (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Next hearing fixed before Additional District Judge on Nov 12th for arguments..."
                value={milestoneDesc}
                onChange={(e) => setMilestoneDesc(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50/50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A365D]/20 focus:border-[#1A365D] placeholder:text-slate-400 resize-none transition-all"
              />
            </div>

            <div className="flex gap-3 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setSelectedCaseForMilestone(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" className="flex-1" loading={isPostingMilestone}>
                Publish Milestone
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
