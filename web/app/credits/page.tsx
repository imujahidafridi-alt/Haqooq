"use client";

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageShell } from '@/components/layout/PageShell';
import { apiFetch } from '@/lib/api';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/utils/format';
import toast from 'react-hot-toast';

export default function CreditsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery<any[]>({
    queryKey: ['credit_requests'],
    queryFn: async () => apiFetch('/api/credit_requests')
  });

  const processMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'approve' | 'reject' }) => {
      return apiFetch('/api/credit_requests', {
        method: 'POST',
        body: JSON.stringify({ requestId: id, action })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit_requests'] });
      toast.success('Request processed successfully');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to process request');
    }
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter((item) =>
      [item.id, item.lawyerId, item.status]
        .join(' ')
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [data, search]);

  const columns = [
    { header: 'Request ID', accessorKey: 'id' },
    { header: 'Lawyer ID', accessorKey: 'lawyerId' },
    { header: 'Credits', accessorKey: 'credits' },
    { header: 'Amount', accessorKey: 'amount' },
    { header: 'Status', accessorKey: 'statusBadge' },
    { header: 'Proof', accessorKey: 'proof' },
    { header: 'Actions', accessorKey: 'actions' }
  ];

  return (
    <PageShell title="Credit Management">
      <div className="space-y-6">
        <Card title="Lawyer Purchase Requests">
          <p className="mb-4 text-sm text-slate-400">
            Review and approve Easypaisa payment screenshots mapped to credit packages.
          </p>
          <div className="mb-4">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ID..."
              className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-950/90 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand-500 focus:outline-none"
            />
          </div>
          {isLoading ? (
            <div className="h-64 rounded-2xl bg-slate-950/80" />
          ) : (
            <DataTable
              columns={columns as any}
              data={filtered.map((req) => ({
                ...req,
                amount: formatCurrency(req.amount),
                statusBadge: <Badge label={req.status} variant={req.status === 'pending' ? 'info' : req.status === 'approved' ? 'success' : 'default'} />,
                proof: req.proofUrl ? (
                  <a href={req.proofUrl} target="_blank" rel="noreferrer" className="text-brand-400 underline">View</a>
                ) : 'N/A',
                actions: req.status === 'pending' ? (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => processMutation.mutate({ id: req.id, action: 'approve' })} isLoading={processMutation.isPending}>
                      Approve
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => processMutation.mutate({ id: req.id, action: 'reject' })} isLoading={processMutation.isPending}>
                      Reject
                    </Button>
                  </div>
                ) : 'Processed'
              }))}
            />
          )}
        </Card>
      </div>
    </PageShell>
  );
}