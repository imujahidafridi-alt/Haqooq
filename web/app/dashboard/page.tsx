"use client";

import { useQuery } from '@tanstack/react-query';
import { PageShell } from '@/components/layout/PageShell';
import { StatCard } from '@/components/ui/StatCard';
import { Card } from '@/components/ui/Card';
import { apiFetch } from '@/lib/api';
import { formatCurrency, formatDate } from '@/utils/format';
import { ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, Tooltip } from 'recharts';

interface DashboardSummary {
  userCount: number;
  lawyerCount: number;
  clientCount: number;
  openCases: number;
  activeCases: number;
  closedCases: number;
  revenueTotal: number;
  pendingReports: number;
  recentActivity: Array<{ id: string; title: string; timestamp: number }>;
  lawyerPerformance: Array<{ name: string; value: number }>;
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery<DashboardSummary>({
    queryKey: ['dashboard-summary'],
    queryFn: async () => apiFetch('/api/dashboard')
  });

  return (
    <PageShell title="Dashboard">
      <div className="space-y-8">
        <div className="grid gap-6 xl:grid-cols-4">
          <StatCard title="Total users" value={data ? String(data.userCount) : '…'} />
          <StatCard title="Active lawyers" value={data ? String(data.lawyerCount) : '…'} />
          <StatCard title="Open cases" value={data ? String(data.openCases) : '…'} />
          <StatCard title="Revenue" value={data ? formatCurrency(data.revenueTotal) : '…'} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card title="Case status distribution">
            {isLoading ? (
              <div className="h-72" />
            ) : (
              <ResponsiveContainer width="100%" height={360}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Open', value: data?.openCases ?? 0 },
                      { name: 'Active', value: data?.activeCases ?? 0 },
                      { name: 'Closed', value: data?.closedCases ?? 0 }
                    ]}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    innerRadius={60}
                    paddingAngle={3}
                  >
                    {['#2563eb', '#22c55e', '#f97316'].map((color, index) => (
                      <Cell key={index} fill={color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `${value}`} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card title="Top lawyer activity">
            <div className="space-y-4">
              {isLoading ? (
                <div className="h-72" />
              ) : (
                data?.lawyerPerformance.map((item) => (
                  <div key={item.name} className="flex items-center justify-between gap-4 rounded-3xl border border-slate-800 bg-slate-950/80 px-4 py-4">
                    <p className="text-sm text-slate-300">{item.name}</p>
                    <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">{item.value} cases</span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card title="Recent governance activity">
            <div className="space-y-3">
              {isLoading ? (
                <div className="h-72" />
              ) : (
                data?.recentActivity.map((item) => (
                  <div key={item.id} className="rounded-3xl border border-slate-800 bg-slate-950/85 px-5 py-4">
                    <p className="text-sm text-slate-300">{item.title}</p>
                    <p className="mt-2 text-xs text-slate-500">{formatDate(item.timestamp)}</p>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card title="Revenue trend">
            {isLoading ? (
              <div className="h-72" />
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data?.lawyerPerformance ?? []}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <Tooltip />
                    <Area type="monotone" dataKey="value" stroke="#60a5fa" fill="url(#revenueGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
