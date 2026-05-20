"use client";

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageShell } from '@/components/layout/PageShell';
import { apiFetch } from '@/lib/api';
import { DataTable } from '@/components/ui/DataTable';
import { Card } from '@/components/ui/Card';
import { formatCurrency } from '@/utils/format';
import { Transaction } from '@/types';

const columns = [
  { header: 'Transaction ID', accessorKey: 'id' },
  { header: 'User', accessorKey: 'userId' },
  { header: 'Type', accessorKey: 'type' },
  { header: 'Amount', accessorKey: 'amount' },
  { header: 'Status', accessorKey: 'status' }
];

export default function FinancePage() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useQuery<Transaction[]>({
    queryKey: ['transactions'],
    queryFn: async () => apiFetch('/api/transactions')
  });

  const filteredTransactions = useMemo(() => {
    if (!data) return [] as Transaction[];
    return data.filter((item) =>
      [item.id, item.userId, item.type, item.status, item.metadata ? JSON.stringify(item.metadata) : '']
        .join(' ')
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [data, search]);

  return (
    <PageShell title="Financial operations">
      <div className="space-y-6">
        <Card title="Revenue analytics">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-3xl border border-slate-800 bg-slate-950/95 p-6">
              <p className="text-sm text-slate-400">Total transactions</p>
              <p className="mt-4 text-3xl font-semibold text-white">{data ? data.length : '—'}</p>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-950/95 p-6">
              <p className="text-sm text-slate-400">Completed revenue</p>
              <p className="mt-4 text-3xl font-semibold text-white">{data ? formatCurrency(data.filter((item) => item.status === 'completed').reduce((sum, item) => sum + item.amount, 0)) : '—'}</p>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-950/95 p-6">
              <p className="text-sm text-slate-400">Pending captures</p>
              <p className="mt-4 text-3xl font-semibold text-white">{data ? data.filter((item) => item.status === 'pending').length : '—'}</p>
            </div>
          </div>
        </Card>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-6">
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Transaction ledger</h2>
              <p className="mt-1 text-sm text-slate-400">Track purchases, subscriptions, and billing activity.</p>
            </div>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search transactions..."
              className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-950/90 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          {isLoading ? (
            <div className="h-80 rounded-3xl bg-slate-950/80" />
          ) : (
            <DataTable
              columns={columns as any}
              data={filteredTransactions.map((item) => ({
                ...item,
                amount: formatCurrency(item.amount)
              }))}
            />
          )}
        </div>
      </div>
    </PageShell>
  );
}
