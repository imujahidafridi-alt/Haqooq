"use client";

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageShell } from '@/components/layout/PageShell';
import { apiFetch } from '@/lib/api';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { LegalCase } from '@/types';

const columns = [
  { header: 'Title', accessorKey: 'title' },
  { header: 'Client', accessorKey: 'clientName' },
  { header: 'Category', accessorKey: 'category' },
  { header: 'Status', accessorKey: 'status' },
  { header: 'Budget', accessorKey: 'budget' }
];

export default function CasesPage() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useQuery<LegalCase[]>({
    queryKey: ['cases'],
    queryFn: async () => apiFetch('/api/cases')
  });

  const filteredCases = useMemo(() => {
    if (!data) return [] as LegalCase[];
    return data.filter((item) =>
      [item.title, item.clientName, item.category, item.status]
        .join(' ')
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [data, search]);

  return (
    <PageShell title="Case management">
      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-6">
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Legal case lifecycle</h2>
              <p className="mt-1 text-sm text-slate-400">Audit cases, assign lawyers, and track progress through the lifecycle.</p>
            </div>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search cases..."
              className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-950/90 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          {isLoading ? (
            <div className="h-80 rounded-3xl bg-slate-950/80" />
          ) : (
            <DataTable
              columns={columns as any}
              data={filteredCases.map((item) => ({
                ...item,
                status: <Badge label={item.status} variant={item.status === 'open' ? 'info' : item.status === 'active' ? 'success' : 'default'} />,
                budget: item.budget ? `$${item.budget}` : '—'
              }))}
            />
          )}
        </div>
      </div>
    </PageShell>
  );
}
