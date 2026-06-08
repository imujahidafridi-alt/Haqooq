"use client";

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageShell } from '@/components/layout/PageShell';
import { apiFetch } from '@/lib/api';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Report } from '@/types';
import { Eye, ShieldAlert, CheckCircle, Clock, X, FileText, User, HelpCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ReportsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [actionTaken, setActionTaken] = useState('');
  const [resolutionStatus, setResolutionStatus] = useState<'reviewed' | 'resolved' | null>(null);

  const { data: reports = [], isLoading } = useQuery<Report[]>({
    queryKey: ['reports'],
    queryFn: async () => apiFetch('/api/reports')
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ reportId, status, actionTaken }: { reportId: string; status: 'reviewed' | 'resolved'; actionTaken?: string }) => {
      return apiFetch('/api/reports/resolve', {
        method: 'POST',
        body: JSON.stringify({ reportId, status, actionTaken })
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success(`Complaint marked as ${variables.status} successfully`);
      setSelectedReport(null);
      setResolutionStatus(null);
      setActionTaken('');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to resolve complaint');
    }
  });

  const filteredReports = useMemo(() => {
    return reports.filter((item) =>
      [item.entityType, item.category, item.reporterId, item.entityId, item.reason, item.status]
        .join(' ')
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [reports, search]);

  const columns = [
    { header: 'ID', accessorKey: 'id' },
    { header: 'Entity Type', accessorKey: 'entityTypeBadge' },
    { header: 'Category', accessorKey: 'categoryBadge' },
    { header: 'Reporter ID', accessorKey: 'reporterId' },
    { header: 'Status', accessorKey: 'statusBadge' },
    { header: 'Actions', accessorKey: 'actions' }
  ];

  const handleReview = (report: Report) => {
    setSelectedReport(report);
    setResolutionStatus(null);
    setActionTaken('');
  };

  const handleResolveSubmit = () => {
    if (!selectedReport || !resolutionStatus) return;
    if (!actionTaken.trim()) {
      toast.error('Please input the action taken description');
      return;
    }

    resolveMutation.mutate({
      reportId: selectedReport.id,
      status: resolutionStatus,
      actionTaken: actionTaken.trim()
    });
  };

  return (
    <PageShell title="Complaints & reports">
      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-6">
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">User reports and escalations</h2>
              <p className="mt-1 text-sm text-slate-400">Review pending complaints, flag abuse, and resolve fraud investigations.</p>
            </div>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search reports..."
              className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-950/90 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          {isLoading ? (
            <div className="h-80 rounded-3xl bg-slate-950/80 animate-pulse" />
          ) : (
            <DataTable
              columns={columns as any}
              data={filteredReports.map((item) => ({
                ...item,
                entityTypeBadge: (
                  <span className="inline-flex rounded-xl bg-slate-800 px-2 py-0.5 text-xs text-slate-300 capitalize font-medium">
                    {item.entityType}
                  </span>
                ),
                categoryBadge: (
                  <span className="inline-flex rounded-xl bg-rose-500/10 text-rose-450 px-2.5 py-0.5 text-xs font-bold capitalize">
                    {item.category}
                  </span>
                ),
                statusBadge: (
                  <Badge 
                    label={item.status} 
                    variant={
                      item.status === 'pending' ? 'warning' : 
                      item.status === 'resolved' ? 'success' : 
                      'default'
                    } 
                  />
                ),
                actions: (
                  <Button variant="outline" size="sm" onClick={() => handleReview(item)} className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    Inspect
                  </Button>
                )
              }))}
            />
          )}
        </div>
      </div>

      {/* Report Resolution Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-900 p-6 text-left shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-rose-500" />
                  Moderate Abuse Complaint
                </h3>
                <p className="text-xs text-slate-400 mt-1 font-mono">Report ID: {selectedReport.id}</p>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Overview Details */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400 flex items-center gap-1">
                    <HelpCircle className="h-4 w-4" /> Reported Item:
                  </span>
                  <span className="font-bold text-white uppercase">{selectedReport.entityType} ({selectedReport.entityId})</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400 flex items-center gap-1">
                    <User className="h-4 w-4" /> Reporter ID:
                  </span>
                  <span className="font-semibold text-slate-200">{selectedReport.reporterId}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Clock className="h-4 w-4" /> Status:
                  </span>
                  <Badge label={selectedReport.status} variant={selectedReport.status === 'pending' ? 'warning' : selectedReport.status === 'resolved' ? 'success' : 'default'} />
                </div>
              </div>

              {/* Description */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 mb-2">
                  <FileText className="h-4 w-4 text-slate-555" />
                  Explanation & Reason
                </h4>
                <p className="text-sm text-slate-200 leading-relaxed italic">
                  &ldquo;{selectedReport.reason || 'No specific explanation provided.'}&rdquo;
                </p>
              </div>

              {/* Resolution Form */}
              {selectedReport.status === 'pending' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 block">Resolution Action Type</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setResolutionStatus('reviewed')}
                        className={`rounded-xl px-4 py-2.5 text-xs font-bold border transition ${
                          resolutionStatus === 'reviewed'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : 'border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        Mark as Reviewed
                      </button>
                      <button
                        onClick={() => setResolutionStatus('resolved')}
                        className={`rounded-xl px-4 py-2.5 text-xs font-bold border transition ${
                          resolutionStatus === 'resolved'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        Mark as Resolved
                      </button>
                    </div>
                  </div>

                  {resolutionStatus && (
                    <div className="space-y-2 animate-in slide-in-from-top-1.5 duration-200">
                      <label className="text-xs font-bold text-slate-400 block">Moderator Remarks / Action Taken</label>
                      <textarea
                        placeholder="Detail the actions taken (e.g. Warning sent to lawyer, content removed, suspended target user...)"
                        rows={3}
                        value={actionTaken}
                        onChange={(e) => setActionTaken(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-100 placeholder:text-slate-650 focus:outline-none focus:border-brand-500"
                      />
                      <Button
                        variant="primary"
                        onClick={handleResolveSubmit}
                        isLoading={resolveMutation.isPending}
                        className="w-full mt-2"
                      >
                        Confirm Moderation Action
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {selectedReport.status !== 'pending' && (
                <div className="rounded-2xl border p-4 bg-slate-950/30 border-slate-855 text-sm flex flex-col gap-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">Moderation Remarks:</span>
                    <span className="text-slate-200 font-medium">{selectedReport.actionTaken || 'Marked as processed.'}</span>
                  </div>
                  {selectedReport.resolvedAt && (
                    <div className="flex justify-between text-xs text-slate-550">
                      <span>Resolution Timestamp:</span>
                      <span>{new Date(selectedReport.resolvedAt).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
