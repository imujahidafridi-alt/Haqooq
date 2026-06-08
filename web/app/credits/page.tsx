"use client";

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageShell } from '@/components/layout/PageShell';
import { apiFetch } from '@/lib/api';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/utils/format';
import { Search, Eye, CheckCircle2, XCircle, Clock, ShieldCheck, User, Sparkles, ExternalLink, Calendar, Copy, Check, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CreditsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [activeTab, setActiveTab] = useState<'requests' | 'audit_logs'>('requests');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch credit requests
  const { data: requests = [], isLoading: isLoadingRequests } = useQuery<any[]>({
    queryKey: ['credit_requests'],
    queryFn: async () => apiFetch('/api/credit_requests')
  });

  // Fetch governance audit logs
  const { data: auditLogs = [], isLoading: isLoadingLogs } = useQuery<any[]>({
    queryKey: ['audit_logs'],
    queryFn: async () => apiFetch('/api/audit-logs'),
    enabled: activeTab === 'audit_logs'
  });

  // Filter credit audit logs specifically
  const creditAuditLogs = useMemo(() => {
    return auditLogs.filter(log => log.module === 'credits' || log.action?.includes('CREDIT'));
  }, [auditLogs]);

  // Mutation to approve/reject
  const processMutation = useMutation({
    mutationFn: async ({ id, action, reason }: { id: string; action: 'approve' | 'reject'; reason?: string }) => {
      return apiFetch('/api/credit_requests', {
        method: 'POST',
        body: JSON.stringify({ requestId: id, action, rejectionReason: reason })
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['credit_requests'] });
      queryClient.invalidateQueries({ queryKey: ['audit_logs'] });
      toast.success(`Request ${variables.action === 'approve' ? 'approved' : 'rejected'} successfully`);
      setSelectedRequest(null);
      setShowRejectForm(false);
      setRejectionReason('');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to process request');
    }
  });

  // Derived counts for stat cards
  const stats = useMemo(() => {
    return {
      total: requests.length,
      pending: requests.filter((r) => r.status === 'pending').length,
      approved: requests.filter((r) => r.status === 'approved').length,
      rejected: requests.filter((r) => r.status === 'rejected').length,
    };
  }, [requests]);

  // Filter requests
  const filteredRequests = useMemo(() => {
    return requests.filter((item) => {
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchesSearch =
        [
          item.id,
          item.lawyerId,
          item.lawyerName,
          item.lawyerEmail,
          item.transactionId,
          item.senderTitle
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(search.toLowerCase());
      
      return matchesStatus && matchesSearch;
    });
  }, [requests, search, statusFilter]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const columns = [
    { header: 'Request ID', accessorKey: 'idShort' },
    { header: 'Lawyer Name', accessorKey: 'lawyerDetails' },
    { header: 'Reference ID', accessorKey: 'transactionIdBadge' },
    { header: 'Credits', accessorKey: 'creditsBadge' },
    { header: 'Amount', accessorKey: 'amount' },
    { header: 'Status', accessorKey: 'statusBadge' },
    { header: 'Actions', accessorKey: 'actions' }
  ];

  const auditColumns = [
    { header: 'Log ID', accessorKey: 'idShort' },
    { header: 'Admin User', accessorKey: 'adminDetails' },
    { header: 'Action Type', accessorKey: 'actionBadge' },
    { header: 'Target Request', accessorKey: 'targetId' },
    { header: 'IP Address', accessorKey: 'ipAddress' },
    { header: 'Timestamp', accessorKey: 'formattedTimestamp' }
  ];

  const handleReview = (req: any) => {
    setSelectedRequest(req);
    setShowRejectForm(false);
    setRejectionReason('');
  };

  const handleApprove = () => {
    if (!selectedRequest) return;
    if (confirm(`Are you sure you want to approve ${selectedRequest.credits} credits for ${selectedRequest.lawyerName || 'this lawyer'}?`)) {
      processMutation.mutate({ id: selectedRequest.id, action: 'approve' });
    }
  };

  const handleRejectSubmit = () => {
    if (!selectedRequest) return;
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    processMutation.mutate({ id: selectedRequest.id, action: 'reject', reason: rejectionReason.trim() });
  };

  return (
    <PageShell title="Credit & Subscription Management">
      <div className="space-y-6">
        {/* Stat Cards */}
        <div className="grid gap-6 md:grid-cols-4">
          <div className="rounded-3xl border border-slate-800 bg-slate-950/95 p-6 shadow-md">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Purchase Requests</p>
            <p className="mt-2 text-3xl font-bold text-white">{stats.total}</p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-950/95 p-6 shadow-md">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-500">Pending Actions</p>
            <p className="mt-2 text-3xl font-bold text-amber-400">{stats.pending}</p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-950/95 p-6 shadow-md">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-500">Approved Orders</p>
            <p className="mt-2 text-3xl font-bold text-emerald-400">{stats.approved}</p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-950/95 p-6 shadow-md">
            <p className="text-xs font-semibold uppercase tracking-wider text-rose-500">Rejected Orders</p>
            <p className="mt-2 text-3xl font-bold text-rose-400">{stats.rejected}</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800">
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-6 py-3 text-sm font-semibold border-b-2 transition ${
              activeTab === 'requests'
                ? 'border-brand-500 text-white'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Credit Requests ({filteredRequests.length})
          </button>
          <button
            onClick={() => setActiveTab('audit_logs')}
            className={`px-6 py-3 text-sm font-semibold border-b-2 transition ${
              activeTab === 'audit_logs'
                ? 'border-brand-500 text-white'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Governance Audit Log
          </button>
        </div>

        {activeTab === 'requests' ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-6 shadow-lg">
            {/* Search & Filters */}
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3 bg-slate-950/90 border border-slate-800 rounded-2xl px-4 py-2 w-full max-w-md">
                <Search className="h-4 w-4 text-slate-500" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by Lawyer Name, Ref ID, Request ID..."
                  className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
                />
              </div>

              {/* Status Toggles */}
              <div className="flex gap-2 bg-slate-950/90 p-1 border border-slate-800 rounded-2xl self-start">
                {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`rounded-xl px-4 py-2 text-xs font-semibold capitalize transition ${
                      statusFilter === status
                        ? 'bg-brand-500 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            {isLoadingRequests ? (
              <div className="h-80 animate-pulse rounded-3xl bg-slate-950/50" />
            ) : (
              <DataTable
                columns={columns as any}
                data={filteredRequests.map((req) => ({
                  ...req,
                  idShort: <span className="font-mono text-xs text-slate-500">{req.id.slice(0, 8)}…</span>,
                  lawyerDetails: (
                    <div className="flex flex-col">
                      <span className="font-semibold text-white">{req.lawyerName || 'Unknown Lawyer'}</span>
                      <span className="text-xs text-slate-400 font-mono">{req.lawyerId.slice(0, 8)}…</span>
                    </div>
                  ),
                  transactionIdBadge: (
                    <span className="font-mono bg-slate-950/60 border border-slate-800 text-slate-350 px-2 py-0.5 rounded text-xs">
                      {req.transactionId || 'N/A'}
                    </span>
                  ),
                  creditsBadge: (
                    <span className="font-bold text-emerald-450">+{req.credits} credits</span>
                  ),
                  amount: formatCurrency(req.amount),
                  statusBadge: (
                    <Badge
                      label={req.status}
                      variant={
                        req.status === 'pending'
                          ? 'warning'
                          : req.status === 'approved'
                          ? 'success'
                          : 'danger'
                      }
                    />
                  ),
                  actions: (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReview(req)}
                      className="flex items-center gap-1.5"
                    >
                      <Eye className="h-4 w-4" />
                      Review
                    </Button>
                  )
                }))}
              />
            )}
          </div>
        ) : (
          /* Governance Audit Logs Tab */
          <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-white mb-2">Subscription & Credits Audit Trail</h3>
            <p className="text-sm text-slate-400 mb-6">
              Append-only list tracking administrative credit allocations, approvals, and transaction approvals.
            </p>

            {isLoadingLogs ? (
              <div className="h-80 animate-pulse rounded-3xl bg-slate-950/50" />
            ) : (
              <DataTable
                columns={auditColumns as any}
                data={creditAuditLogs.map((log) => ({
                  ...log,
                  idShort: <span className="font-mono text-xs text-slate-500">{log.id.slice(0, 8)}…</span>,
                  adminDetails: (
                    <div className="flex flex-col">
                      <span className="font-semibold text-white">{log.adminName || 'Admin'}</span>
                      <span className="text-[10px] text-slate-500 capitalize">{log.adminRole || 'admin'}</span>
                    </div>
                  ),
                  actionBadge: (
                    <span
                      className={`inline-flex rounded-xl px-2.5 py-0.5 text-xs font-bold ${
                        log.action === 'APPROVE_CREDIT'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-rose-500/10 text-rose-450'
                      }`}
                    >
                      {log.action}
                    </span>
                  ),
                  targetId: (
                    <span className="font-mono text-xs text-slate-400">{log.entityId || log.targetId || 'N/A'}</span>
                  ),
                  ipAddress: (
                    <span className="font-mono text-xs text-slate-500">{log.ipAddress || '127.0.0.1'}</span>
                  ),
                  formattedTimestamp: new Date(log.timestamp).toLocaleString()
                }))}
              />
            )}
          </div>
        )}

        {/* Slide-out Review Drawer */}
        <div
          className={`fixed inset-0 z-50 overflow-hidden transition-opacity duration-300 ${
            selectedRequest ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
          }`}
        >
          <div onClick={() => setSelectedRequest(null)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />

          <div className="absolute inset-y-0 right-0 pl-10 max-w-full flex">
            <div
              className={`w-screen max-w-4xl bg-slate-900 border-l border-slate-800 shadow-2xl transition-transform duration-300 ease-in-out transform ${
                selectedRequest ? 'translate-x-0' : 'translate-x-full'
              }`}
            >
              {selectedRequest && (
                <div className="h-full flex flex-col justify-between p-6 overflow-y-auto">
                  <div className="space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                      <div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                          <Sparkles className="h-5 w-5 text-brand-400" />
                          Verify Credit Purchase Request
                        </h3>
                        <p className="text-xs text-slate-400 mt-1 font-mono">Request ID: {selectedRequest.id}</p>
                      </div>
                      <button
                        onClick={() => setSelectedRequest(null)}
                        className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
                      >
                        <XCircle className="h-6 w-6" />
                      </button>
                    </div>

                    {/* Split details & Receipt Screenshot layout */}
                    <div className="grid gap-6 md:grid-cols-2">
                      {/* Left: Info */}
                      <div className="space-y-5">
                        {/* Lawyer profile card */}
                        <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4 space-y-2">
                          <h4 className="text-[10px] font-bold uppercase tracking-wider text-brand-400 flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5" />
                            Lawyer Profile & UID
                          </h4>
                          <div className="text-sm">
                            <p className="font-semibold text-white">{selectedRequest.lawyerName || 'Unknown Lawyer'}</p>
                            <p className="text-xs text-slate-400">{selectedRequest.lawyerEmail || 'N/A'}</p>
                          </div>
                          <div className="flex items-center justify-between border-t border-slate-850 pt-2 text-[10px] text-slate-500 font-mono">
                            <span>UID: {selectedRequest.lawyerId}</span>
                            <button
                              onClick={() => copyToClipboard(selectedRequest.lawyerId, 'lawyerId')}
                              className="text-slate-400 hover:text-white flex items-center gap-1"
                            >
                              {copiedId === 'lawyerId' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                              Copy
                            </button>
                          </div>
                        </div>

                        {/* P2P Verification check */}
                        <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4 space-y-3">
                          <h4 className="text-[10px] font-bold uppercase tracking-wider text-brand-400 flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            P2P Verification Info
                          </h4>
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between border-b border-slate-850/40 pb-1.5">
                              <span className="text-slate-400">Account Title:</span>
                              <span className="font-semibold text-white">{selectedRequest.senderTitle || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-850/40 pb-1.5">
                              <span className="text-slate-400">Sender Number:</span>
                              <span className="font-mono text-slate-200">{selectedRequest.senderNumber || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-400">Transaction Date:</span>
                              <span className="font-semibold text-slate-350 flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5 text-slate-500" />
                                {selectedRequest.transactionDateTime || 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Reference Ledger details */}
                        <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4 space-y-3">
                          <h4 className="text-[10px] font-bold uppercase tracking-wider text-brand-400 flex items-center gap-1.5">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Reference Ledger
                          </h4>
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between items-center border-b border-slate-850/40 pb-1.5">
                              <span className="text-slate-400">Transaction ID:</span>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-amber-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-850">
                                  {selectedRequest.transactionId || 'N/A'}
                                </span>
                                <button
                                  onClick={() => copyToClipboard(selectedRequest.transactionId, 'txId')}
                                  className="text-slate-500 hover:text-white"
                                >
                                  {copiedId === 'txId' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                </button>
                              </div>
                            </div>
                            <div className="flex justify-between border-b border-slate-850/40 pb-1.5">
                              <span className="text-slate-400">Selected package:</span>
                              <span className="font-semibold text-slate-200">{selectedRequest.planName || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-850/40 pb-1.5">
                              <span className="text-slate-400">Credits to Allocate:</span>
                              <span className="font-bold text-emerald-450">+{selectedRequest.credits || 0} Credits</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400 font-medium">PKR Price (PKR):</span>
                              <span className="font-bold text-white">PKR {selectedRequest.amount}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Receipt Image */}
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2">Receipt Screenshot Proof</span>
                        {selectedRequest.proofUrl ? (
                          <div className="flex-1 flex flex-col justify-between border border-slate-800 rounded-2xl bg-slate-950/40 p-3 overflow-hidden">
                            <div className="relative aspect-[3/4] bg-slate-950 rounded-xl overflow-hidden mb-3 border border-slate-850 flex items-center justify-center">
                              <img
                                src={selectedRequest.proofUrl}
                                alt="Easypaisa Receipt Screenshot"
                                className="max-w-full max-h-full object-contain"
                              />
                            </div>
                            <a
                              href={selectedRequest.proofUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center justify-center gap-2 text-xs text-brand-400 hover:text-brand-300 font-semibold py-2.5 border border-slate-800 rounded-xl bg-slate-950 transition hover:bg-slate-900"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              Open Original Receipt
                            </a>
                          </div>
                        ) : (
                          <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-2xl bg-slate-950/20 p-6 min-h-[250px]">
                            <XCircle className="h-10 w-10 text-slate-700 mb-2" />
                            <p className="text-sm font-semibold text-slate-500">No Screenshot Uploaded</p>
                            <p className="text-xs text-slate-650 text-center mt-1">Lawyer did not upload a receipt image screenshot.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="border-t border-slate-800 mt-6 pt-4">
                    {selectedRequest.status === 'pending' ? (
                      <>
                        {!showRejectForm ? (
                          <div className="flex justify-end gap-3">
                            <Button
                              variant="danger"
                              onClick={() => setShowRejectForm(true)}
                              disabled={processMutation.isPending}
                            >
                              <XCircle className="h-4 w-4 mr-1.5" />
                              Reject Payment request
                            </Button>
                            <Button
                              variant="primary"
                              onClick={handleApprove}
                              isLoading={processMutation.isPending}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1.5" />
                              Approve Payment & Allocate Credits
                            </Button>
                          </div>
                        ) : (
                          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-4 animate-in fade-in">
                            <div className="space-y-1">
                              <label className="text-xs font-semibold text-slate-350">Reason for Rejecting Payment</label>
                              <textarea
                                placeholder="Provide description detailing why payment request is rejected (e.g. Transaction ID not found on bank account, etc.)."
                                rows={3}
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-850 rounded-xl px-4 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-rose-500"
                              />
                            </div>
                            <div className="flex justify-end gap-3">
                              <Button
                                variant="ghost"
                                onClick={() => setShowRejectForm(false)}
                                disabled={processMutation.isPending}
                              >
                                Cancel
                              </Button>
                              <Button
                                variant="danger"
                                onClick={handleRejectSubmit}
                                isLoading={processMutation.isPending}
                              >
                                Confirm Rejection
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="rounded-2xl border p-4 flex flex-col gap-2 bg-slate-950/20 border-slate-850">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-400 font-semibold">Processed Status:</span>
                          <span
                            className={`font-bold capitalize ${
                              selectedRequest.status === 'approved' ? 'text-emerald-450' : 'text-rose-450'
                            }`}
                          >
                            {selectedRequest.status}
                          </span>
                        </div>
                        {selectedRequest.processedAt && (
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>Processed Date:</span>
                            <span>{new Date(selectedRequest.processedAt).toLocaleString()}</span>
                          </div>
                        )}
                        {selectedRequest.status === 'rejected' && selectedRequest.rejectionReason && (
                          <div className="mt-2 text-xs border-t border-slate-850 pt-2 text-rose-350">
                            <span className="font-bold">Admin Rejection Reason:</span>
                            <p className="mt-1 text-slate-300 italic">{selectedRequest.rejectionReason}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}