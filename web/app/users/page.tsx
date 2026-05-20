"use client";

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageShell } from '@/components/layout/PageShell';
import { apiFetch } from '@/lib/api';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { UserProfile } from '@/types';

const columns = [
  { header: 'Name', accessorKey: 'displayName' },
  { header: 'Role', accessorKey: 'role' },
  { header: 'Status', accessorKey: 'status' },
  { header: 'Email', accessorKey: 'email' },
  { header: 'Joined', accessorKey: 'createdAt' }
];

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useQuery<UserProfile[]>({
    queryKey: ['users'],
    queryFn: async () => apiFetch('/api/users')
  });

  const filteredUsers = useMemo(() => {
    if (!data) return [] as UserProfile[];
    return data.filter((user) =>
      [user.displayName, user.email, user.role, user.status]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [data, search]);

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
            <div className="h-80 rounded-3xl bg-slate-950/80" />
          ) : (
            <DataTable
              columns={columns as any}
              data={filteredUsers.map((item) => ({
                ...item,
                createdAt: new Date(item.createdAt).toLocaleDateString(),
                status: <Badge label={item.status} variant={item.status === 'verified' ? 'success' : item.status === 'pending' ? 'warning' : 'danger'} />
              }))}
            />
          )}
        </div>
      </div>
    </PageShell>
  );
}
