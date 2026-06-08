"use client";

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageShell } from '@/components/layout/PageShell';
import { apiFetch } from '@/lib/api';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { UserProfile } from '@/types';
import { Eye, ShieldCheck, UserCheck, UserMinus, FileText, X, ExternalLink, ShieldAlert, Award, Phone, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [showReasonInput, setShowReasonInput] = useState<'reject' | 'suspend' | null>(null);

  const { data: users = [], isLoading } = useQuery<UserProfile[]>({
    queryKey: ['users'],
    queryFn: async () => apiFetch('/api/users')
  });

  const actionMutation = useMutation({
    mutationFn: async ({ userId, action, reason }: { userId: string; action: string; reason?: string }) => {
      return apiFetch('/api/users/actions', {
        method: 'POST',
        body: JSON.stringify({ userId, action, reason })
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(`User status updated successfully`);
      setSelectedUser(null);
      setShowReasonInput(null);
      setActionReason('');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update user status');
    }
  });

  const filteredUsers = useMemo(() => {
    return users.filter((user) =>
      [user.displayName, user.email, user.role, user.status]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [users, search]);

  const columns = [
    { header: 'Name', accessorKey: 'displayName' },
    { header: 'Role', accessorKey: 'roleBadge' },
    { header: 'Status', accessorKey: 'statusBadge' },
    { header: 'Email', accessorKey: 'email' },
    { header: 'Joined', accessorKey: 'createdAt' },
    { header: 'Actions', accessorKey: 'actions' }
  ];

  const handleActionClick = (user: UserProfile) => {
    setSelectedUser(user);
    setShowReasonInput(null);
    setActionReason('');
  };

  const handleActionSubmit = (action: 'verify' | 'reject' | 'suspend' | 'unsuspend') => {
    if (!selectedUser) return;
    
    if ((action === 'reject' || action === 'suspend') && !actionReason.trim()) {
      toast.error('Please enter a reason for this governance action');
      return;
    }

    actionMutation.mutate({
      userId: selectedUser.id,
      action,
      reason: actionReason.trim() || undefined
    });
  };

  return (
    <PageShell title="User management">
      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-6">
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Client, lawyer, and admin directory</h2>
              <p className="mt-1 text-sm text-slate-400">Search users, review verification status, and audit access roles.</p>
            </div>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search users..."
              className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-950/90 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          {isLoading ? (
            <div className="h-80 rounded-3xl bg-slate-950/80 animate-pulse" />
          ) : (
            <DataTable
              columns={columns as any}
              data={filteredUsers.map((item) => ({
                ...item,
                displayName: item.displayName || 'Unnamed User',
                roleBadge: (
                  <span className={`inline-flex rounded-xl px-2.5 py-0.5 text-xs font-bold capitalize ${
                    item.role === 'admin' ? 'bg-indigo-500/10 text-indigo-400' :
                    item.role === 'lawyer' ? 'bg-amber-500/10 text-amber-400' :
                    'bg-slate-800 text-slate-300'
                  }`}>
                    {item.role}
                  </span>
                ),
                createdAt: new Date(item.createdAt).toLocaleDateString(),
                statusBadge: (
                  <Badge 
                    label={item.status} 
                    variant={
                      item.status === 'verified' ? 'success' : 
                      item.status === 'pending' ? 'warning' : 
                      'danger'
                    } 
                  />
                ),
                actions: (
                  <Button variant="outline" size="sm" onClick={() => handleActionClick(item)} className="flex items-center gap-1.5">
                    <Eye className="h-4 w-4" />
                    Inspect
                  </Button>
                )
              }))}
            />
          )}
        </div>
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900 p-6 text-left shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-brand-400" />
                  Governance Review
                </h3>
                <p className="text-xs text-slate-400 mt-1">UID: {selectedUser.id}</p>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Profile Overview */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-brand-400 flex items-center gap-1 mb-2">
                    <UserCheck className="h-3.5 w-3.5" />
                    Account Info
                  </h4>
                  <p className="text-sm font-semibold text-white">{selectedUser.displayName || 'Unnamed User'}</p>
                  <p className="text-xs text-slate-400">{selectedUser.email || 'N/A'}</p>
                  {selectedUser.phone && (
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                      <Phone className="h-3 w-3" />
                      {selectedUser.phone}
                    </p>
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-brand-400 flex items-center gap-1 mb-2">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    Security Details
                  </h4>
                  <p className="text-sm font-semibold text-white capitalize">Role: {selectedUser.role}</p>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                    Status: <Badge label={selectedUser.status} variant={selectedUser.status === 'verified' ? 'success' : selectedUser.status === 'pending' ? 'warning' : 'danger'} />
                  </p>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-2">
                    <Calendar className="h-3 w-3" />
                    Joined: {new Date(selectedUser.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Specializations & Lawyer Data (if lawyer) */}
              {selectedUser.role === 'lawyer' && (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-brand-400 flex items-center gap-1">
                    <Award className="h-3.5 w-3.5" />
                    Professional Credentials
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-400 block text-xs">Specializations</span>
                      <span className="text-white font-semibold">{selectedUser.specialization?.join(', ') || 'None Listed'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-xs">Experience</span>
                      <span className="text-white font-semibold">{selectedUser.experienceYears || 0} Years ({selectedUser.city || 'N/A'})</span>
                    </div>
                  </div>

                  <div className="border-t border-slate-850 pt-4">
                    <span className="text-slate-400 block text-xs mb-2">Verification Attachment</span>
                    {selectedUser.credentialUrl ? (
                      <a
                        href={selectedUser.credentialUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl bg-brand-500/10 border border-brand-500/20 px-4 py-2.5 text-xs text-brand-400 hover:bg-brand-500/20 transition font-bold"
                      >
                        <FileText className="h-4 w-4" />
                        View Certificate of Practice
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <p className="text-xs text-slate-500 italic">No practice certificate uploaded yet.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Reason Forms */}
              {showReasonInput && (
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <label className="text-xs font-bold text-slate-300 block capitalize">
                    Reason for {showReasonInput === 'reject' ? 'Credentials Rejection' : 'Account Suspension'}
                  </label>
                  <textarea
                    placeholder={`Provide a clear reason for the lawyer explaining this decision...`}
                    rows={3}
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-850 rounded-xl px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setShowReasonInput(null)}>
                      Cancel
                    </Button>
                    <Button 
                      variant="danger" 
                      size="sm" 
                      onClick={() => handleActionSubmit(showReasonInput === 'reject' ? 'reject' : 'suspend')}
                      isLoading={actionMutation.isPending}
                    >
                      Confirm
                    </Button>
                  </div>
                </div>
              )}

              {/* Action Toolbar */}
              {!showReasonInput && (
                <div className="border-t border-slate-800 pt-5 flex justify-end gap-3">
                  {selectedUser.status === 'pending' && (
                    <>
                      <Button variant="danger" onClick={() => setShowReasonInput('reject')} disabled={actionMutation.isPending}>
                        <UserMinus className="h-4 w-4 mr-1.5" />
                        Reject Credentials
                      </Button>
                      <Button variant="primary" onClick={() => handleActionSubmit('verify')} isLoading={actionMutation.isPending}>
                        <UserCheck className="h-4 w-4 mr-1.5" />
                        Verify Lawyer
                      </Button>
                    </>
                  )}

                  {selectedUser.status === 'verified' && (
                    <Button variant="danger" onClick={() => setShowReasonInput('suspend')} disabled={actionMutation.isPending}>
                      <ShieldAlert className="h-4 w-4 mr-1.5" />
                      Suspend Account
                    </Button>
                  )}

                  {selectedUser.status === 'suspended' && (
                    <Button variant="primary" onClick={() => handleActionSubmit('unsuspend')} isLoading={actionMutation.isPending}>
                      <UserCheck className="h-4 w-4 mr-1.5" />
                      Lift Suspension
                    </Button>
                  )}

                  {selectedUser.status === 'rejected' && (
                    <Button variant="primary" onClick={() => handleActionSubmit('verify')} isLoading={actionMutation.isPending}>
                      <UserCheck className="h-4 w-4 mr-1.5" />
                      Approve Profile
                    </Button>
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
