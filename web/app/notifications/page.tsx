"use client";

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageShell } from '@/components/layout/PageShell';
import { apiFetch } from '@/lib/api';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { NotificationItem } from '@/types';

const columns = [
  { header: 'ID', accessorKey: 'id' },
  { header: 'User', accessorKey: 'userId' },
  { header: 'Title', accessorKey: 'title' },
  { header: 'Status', accessorKey: 'status' },
  { header: 'Created', accessorKey: 'createdAt' }
];

export default function NotificationsPage() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useQuery<NotificationItem[]>({
    queryKey: ['notifications'],
    queryFn: async () => apiFetch('/api/notifications')
  });

  const filteredNotifications = useMemo(() => {
    if (!data) return [] as NotificationItem[];
    return data.filter((item) =>
      [item.id, item.userId, item.title, item.body, item.status, JSON.stringify(item.data)]
        .join(' ')
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [data, search]);

  return (
    <PageShell title="Notifications">
      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-6">
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Notification queue</h2>
              <p className="mt-1 text-sm text-slate-400">Monitor push notification events and message dispatch status.</p>
            </div>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search notifications..."
              className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-950/90 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          {isLoading ? (
            <div className="h-80 rounded-3xl bg-slate-950/80" />
          ) : (
            <DataTable
              columns={columns as any}
              data={filteredNotifications.map((item) => ({
                ...item,
                status: <Badge label={item.status} variant={item.status === 'pending' ? 'warning' : item.status === 'sent' ? 'success' : 'danger'} />,
                createdAt: new Date(item.createdAt).toLocaleDateString()
              }))}
            />
          )}
        </div>
      </div>
    </PageShell>
  );
}
