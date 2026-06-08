"use client";

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageShell } from '@/components/layout/PageShell';
import { apiFetch } from '@/lib/api';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Search, History, Eye, Download, Printer, Filter, ShieldAlert, X, Users, Terminal, Globe, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AuditLogsPage() {
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  // Fetch governance audit logs
  const { data: auditLogs = [], isLoading } = useQuery<any[]>({
    queryKey: ['audit_logs'],
    queryFn: async () => apiFetch('/api/audit-logs')
  });

  // Calculate dashboard statistics from logs
  const stats = useMemo(() => {
    const total = auditLogs.length;
    const highRiskActions = ['COMMUNICATION_SPY', 'USER_SUSPEND', 'SETTINGS_CHANGE', 'REJECT_CREDIT'];
    const highRisk = auditLogs.filter(log => highRiskActions.includes(log.action)).length;
    
    const uniqueAdmins = new Set(auditLogs.map(log => log.adminId).filter(Boolean));
    const activeAdmins = uniqueAdmins.size;

    const lastLog = auditLogs.length > 0 ? auditLogs[0].timestamp : null;

    return { total, highRisk, activeAdmins, lastLog };
  }, [auditLogs]);

  // Filter logs
  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      // 1. Module Filter
      if (moduleFilter !== 'all' && log.module !== moduleFilter) return false;

      // 2. Date Range Filter
      if (dateRange !== 'all') {
        const logDate = new Date(log.timestamp).getTime();
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        if (dateRange === 'today' && now - logDate > oneDay) return false;
        if (dateRange === 'week' && now - logDate > oneDay * 7) return false;
        if (dateRange === 'month' && now - logDate > oneDay * 30) return false;
      }

      // 3. Search Filter
      const matchesSearch = [
        log.id,
        log.adminName,
        log.action,
        log.module,
        log.entityId,
        log.ipAddress
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(search.toLowerCase());

      return matchesSearch;
    });
  }, [auditLogs, search, moduleFilter, dateRange]);

  const columns = [
    { header: 'ID', accessorKey: 'idShort' },
    { header: 'Admin User', accessorKey: 'adminName' },
    { header: 'Action', accessorKey: 'actionBadge' },
    { header: 'Module', accessorKey: 'moduleBadge' },
    { header: 'IP Address', accessorKey: 'ipAddress' },
    { header: 'Timestamp', accessorKey: 'formattedTimestamp' },
    { header: 'Details', accessorKey: 'actions' }
  ];

  const handleInspect = (log: any) => {
    setSelectedLog(log);
  };

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      toast.error('No logs to export');
      return;
    }

    const headers = ['Log ID', 'Admin ID', 'Admin Name', 'Admin Role', 'Action', 'Module', 'Target ID', 'Timestamp', 'IP Address', 'User Agent'];
    const rows = filteredLogs.map(log => [
      log.id,
      log.adminId || 'N/A',
      log.adminName || 'Admin',
      log.adminRole || 'N/A',
      log.action,
      log.module,
      log.entityId || 'N/A',
      log.timestamp,
      log.ipAddress || '127.0.0.1',
      `"${(log.userAgent || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `haqooq_governance_audits_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Audit logs exported successfully');
  };

  const handlePrint = () => {
    window.print();
  };

  const renderDiffTable = (prev: any, next: any) => {
    if (!prev && !next) return <p className="text-xs text-slate-500 italic">No state values logged.</p>;
    
    // Primitives diff
    if (typeof prev !== 'object' || typeof next !== 'object') {
      return (
        <div className="space-y-2 text-xs">
          {prev !== undefined && (
            <div className="flex justify-between items-center rounded-xl bg-rose-500/10 p-3 text-rose-400 border border-rose-500/10">
              <span className="font-semibold text-slate-400">Previous:</span>
              <span className="font-mono">{String(prev)}</span>
            </div>
          )}
          {next !== undefined && (
            <div className="flex justify-between items-center rounded-xl bg-emerald-500/10 p-3 text-emerald-400 border border-emerald-500/10">
              <span className="font-semibold text-slate-400">Current:</span>
              <span className="font-mono">{String(next)}</span>
            </div>
          )}
        </div>
      );
    }

    const allKeys = Array.from(new Set([...Object.keys(prev || {}), ...Object.keys(next || {})]));

    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-950/40 overflow-hidden text-xs">
        <table className="min-w-full divide-y divide-slate-800 border-collapse">
          <thead className="bg-slate-950/80">
            <tr>
              <th className="px-4 py-2.5 text-left font-bold text-slate-400">Field Key</th>
              <th className="px-4 py-2.5 text-left font-bold text-slate-400">Before Change</th>
              <th className="px-4 py-2.5 text-left font-bold text-slate-400">After Change</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {allKeys.map((key) => {
              const pVal = prev?.[key];
              const nVal = next?.[key];
              const isChanged = JSON.stringify(pVal) !== JSON.stringify(nVal);
              
              if (!isChanged) return null; // Display only differences

              return (
                <tr key={key} className="hover:bg-slate-900/40">
                  <td className="px-4 py-3 font-semibold text-slate-350 font-mono">{key}</td>
                  <td className="px-4 py-3 text-rose-450 font-mono">
                    {pVal === undefined ? <span className="text-slate-600 italic">N/A</span> : typeof pVal === 'object' ? JSON.stringify(pVal) : String(pVal)}
                  </td>
                  <td className="px-4 py-3 text-emerald-450 font-mono font-semibold">
                    {nVal === undefined ? <span className="text-slate-600 italic">Removed</span> : typeof nVal === 'object' ? JSON.stringify(nVal) : String(nVal)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <PageShell title="Governance Auditing Trail">
      <div className="space-y-6 print:space-y-4 print:p-0">
        
        {/* Statistics Banner */}
        <div className="grid gap-6 md:grid-cols-4 print:hidden">
          <div className="rounded-3xl border border-slate-800 bg-slate-950/95 p-6 shadow-md">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Audited Events</p>
              <History className="h-4 w-4 text-slate-500" />
            </div>
            <p className="text-3xl font-bold text-white">{stats.total}</p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-950/95 p-6 shadow-md">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold uppercase tracking-wider text-rose-500">High-Risk Operations</p>
              <ShieldAlert className="h-4 w-4 text-rose-500" />
            </div>
            <p className="text-3xl font-bold text-rose-450">{stats.highRisk}</p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-950/95 p-6 shadow-md">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold uppercase tracking-wider text-brand-500">Active Governance Roles</p>
              <Users className="h-4 w-4 text-brand-400" />
            </div>
            <p className="text-3xl font-bold text-brand-400">{stats.activeAdmins}</p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-950/95 p-6 shadow-md">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Latest Event Triggered</p>
              <Terminal className="h-4 w-4 text-slate-500" />
            </div>
            <p className="text-xs font-semibold text-slate-200 mt-2 truncate">
              {stats.lastLog ? new Date(stats.lastLog).toLocaleString() : 'No entries'}
            </p>
          </div>
        </div>

        {/* Master Log Panel */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-6 shadow-lg print:border-none print:bg-transparent">
          {/* Header toolbar */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
            <div>
              <h2 className="text-xl font-semibold text-white">Administrative Activity Records</h2>
              <p className="mt-1 text-sm text-slate-400">Review system actions, config changes, and user status audit logs.</p>
            </div>
            
            {/* Export options */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint} className="flex items-center gap-1.5">
                <Printer className="h-4 w-4" />
                Print / PDF
              </Button>
              <Button variant="secondary" size="sm" onClick={handleExportCSV} className="flex items-center gap-1.5">
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Filtering controllers */}
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-t border-slate-800/60 pt-4 print:hidden">
            <div className="flex items-center gap-3 bg-slate-950/90 border border-slate-800 rounded-2xl px-4 py-2 w-full max-w-sm">
              <Search className="h-4 w-4 text-slate-500" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search logs by admin, IP, actions..."
                className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
              />
            </div>

            {/* Dropdown filters */}
            <div className="flex gap-3 flex-wrap">
              {/* Module Filter */}
              <div className="flex items-center gap-2 bg-slate-950/90 border border-slate-800 rounded-2xl px-3 py-1.5 text-xs text-slate-300">
                <Filter className="h-3 w-3 text-slate-500" />
                <span className="text-slate-500">Module:</span>
                <select
                  value={moduleFilter}
                  onChange={(e) => setModuleFilter(e.target.value)}
                  className="bg-transparent font-semibold focus:outline-none text-white cursor-pointer"
                >
                  <option value="all">All Modules</option>
                  <option value="users">User Verification</option>
                  <option value="credits">Credits & Subscriptions</option>
                  <option value="surveillance">Chat Surveillance</option>
                  <option value="settings">Deployment Settings</option>
                  <option value="reports">Moderation Reports</option>
                </select>
              </div>

              {/* Time Period Filter */}
              <div className="flex items-center gap-2 bg-slate-950/90 border border-slate-800 rounded-2xl px-3 py-1.5 text-xs text-slate-300">
                <span className="text-slate-500">Period:</span>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value as any)}
                  className="bg-transparent font-semibold focus:outline-none text-white cursor-pointer"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="h-80 animate-pulse rounded-3xl bg-slate-950/50" />
          ) : (
            <DataTable
              columns={columns as any}
              data={filteredLogs.map((log) => ({
                ...log,
                idShort: <span className="font-mono text-xs text-slate-500">{log.id.slice(0, 8)}…</span>,
                adminName: (
                  <div className="flex flex-col">
                    <span className="font-semibold text-white">{log.adminName || 'Admin'}</span>
                    <span className="text-xs text-slate-550 capitalize">{log.adminRole || 'admin'}</span>
                  </div>
                ),
                actionBadge: (
                  <span className={`inline-flex rounded-xl px-2.5 py-0.5 text-xs font-bold ${
                    log.action === 'COMMUNICATION_SPY' ? 'bg-amber-500/10 text-amber-450 border border-amber-500/10' :
                    log.action === 'USER_VERIFY' ? 'bg-emerald-500/10 text-emerald-450' :
                    log.action === 'USER_SUSPEND' ? 'bg-rose-500/15 text-rose-450' :
                    'bg-indigo-500/10 text-indigo-400'
                  }`}>
                    {log.action}
                  </span>
                ),
                moduleBadge: (
                  <span className="inline-flex rounded-xl bg-slate-950/80 px-2 py-0.5 text-xs text-slate-400 capitalize">
                    {log.module}
                  </span>
                ),
                formattedTimestamp: new Date(log.timestamp).toLocaleString(),
                actions: (
                  <Button variant="outline" size="sm" onClick={() => handleInspect(log)} className="flex items-center gap-1.5">
                    Inspect
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                )
              }))}
            />
          )}
        </div>
      </div>

      {/* Side Slide-out Drawer */}
      <div
        className={`fixed inset-0 z-50 overflow-hidden print:hidden transition-opacity duration-300 ${
          selectedLog ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <div onClick={() => setSelectedLog(null)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />

        <div className="absolute inset-y-0 right-0 pl-10 max-w-full flex">
          <div
            className={`w-screen max-w-2xl bg-slate-900 border-l border-slate-800 shadow-2xl transition-transform duration-300 ease-in-out transform ${
              selectedLog ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            {selectedLog && (
              <div className="h-full flex flex-col justify-between p-6 overflow-y-auto">
                <div className="space-y-6">
                  {/* Title & Close */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Terminal className="h-5 w-5 text-brand-400" />
                        Audit Trace Details
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 font-mono">Trace ID: {selectedLog.id}</p>
                    </div>
                    <button
                      onClick={() => setSelectedLog(null)}
                      className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>

                  {/* Metadata Cards */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Operation Actor</span>
                      <p className="text-sm font-semibold text-white">{selectedLog.adminName || 'Admin'}</p>
                      <p className="text-xs text-slate-400 font-mono">UID: {selectedLog.adminId || 'N/A'}</p>
                      <span className="inline-flex rounded-lg bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold text-indigo-400 capitalize">
                        {selectedLog.adminRole || 'admin'}
                      </span>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Target Entity</span>
                      <p className="text-sm font-semibold text-white capitalize">{selectedLog.entityType || 'N/A'}</p>
                      <p className="text-xs text-slate-450 font-mono">ID: {selectedLog.entityId || 'N/A'}</p>
                      <p className="text-xs text-slate-450 flex items-center gap-1 font-semibold text-amber-500">
                        <Globe className="h-3.5 w-3.5" />
                        IP: {selectedLog.ipAddress || '127.0.0.1'}
                      </p>
                    </div>
                  </div>

                  {/* User Agent */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">User-Agent Device Info</span>
                    <p className="text-xs font-mono text-slate-400 break-words leading-relaxed">
                      {selectedLog.userAgent || 'Unknown'}
                    </p>
                  </div>

                  {/* Reasons if any */}
                  {selectedLog.reason && (
                    <div className="rounded-2xl border border-rose-900/30 bg-rose-950/10 p-4">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 block mb-1">Administrative Remarks / Reason</span>
                      <p className="text-xs text-rose-350 italic">
                        &ldquo;{selectedLog.reason}&rdquo;
                      </p>
                    </div>
                  )}

                  {/* Payload Differences */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">State Differences (Payload Audit)</span>
                    {renderDiffTable(selectedLog.previousValue, selectedLog.newValue)}
                  </div>

                  {/* Raw JSON Accordion */}
                  <details className="group rounded-2xl border border-slate-800 bg-slate-950/30 overflow-hidden text-xs">
                    <summary className="px-4 py-3 font-semibold text-slate-400 cursor-pointer hover:bg-slate-900/40 select-none flex items-center justify-between">
                      <span>View Raw Audit JSON Payload</span>
                      <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90 text-slate-500" />
                    </summary>
                    <pre className="p-4 bg-slate-950 text-slate-350 overflow-x-auto font-mono text-[10px] leading-relaxed border-t border-slate-850">
                      {JSON.stringify(selectedLog, null, 2)}
                    </pre>
                  </details>
                </div>

                <div className="border-t border-slate-800 pt-4 flex justify-end">
                  <Button variant="outline" size="sm" onClick={() => setSelectedLog(null)}>
                    Dismiss Details
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
