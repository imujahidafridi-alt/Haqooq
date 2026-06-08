"use client";

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageShell } from '@/components/layout/PageShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { apiFetch } from '@/lib/api';
import { Settings, ShieldAlert, Check, RefreshCw, LayoutTemplate } from 'lucide-react';
import toast from 'react-hot-toast';

interface AppConfig {
  maintenanceMode: boolean;
  brandingTitle: string;
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [brandingTitle, setBrandingTitle] = useState('');

  // Fetch settings config
  const { data: config, isLoading } = useQuery<AppConfig>({
    queryKey: ['app_config'],
    queryFn: async () => apiFetch('/api/settings')
  });

  // Sync server settings with local component state
  useEffect(() => {
    if (config) {
      setMaintenanceMode(config.maintenanceMode);
      setBrandingTitle(config.brandingTitle);
    }
  }, [config]);

  // Mutation to save settings
  const settingsMutation = useMutation({
    mutationFn: async (updated: AppConfig) => {
      return apiFetch('/api/settings', {
        method: 'POST',
        body: JSON.stringify(updated)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app_config'] });
      queryClient.invalidateQueries({ queryKey: ['audit_logs'] });
      toast.success('Governance config saved successfully');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update system config');
    }
  });

  const handleSave = () => {
    if (!brandingTitle.trim()) {
      toast.error('Branding Title is required');
      return;
    }
    settingsMutation.mutate({
      maintenanceMode,
      brandingTitle: brandingTitle.trim()
    });
  };

  return (
    <PageShell title="App settings">
      <div className="space-y-6">
        {isLoading ? (
          <div className="h-64 rounded-3xl bg-slate-900 animate-pulse border border-slate-800" />
        ) : (
          <div className="space-y-6">
            <Card title="Governance Platform Controls">
              <p className="text-sm text-slate-400 mb-6">
                Manage system-wide configuration, branding options, and security filters. All updates trigger append-only audit tracking.
              </p>
              
              <div className="grid gap-6 sm:grid-cols-2 mb-6">
                {/* Maintenance Toggle */}
                <div className="rounded-3xl border border-slate-800 bg-slate-950/95 p-6 space-y-4">
                  <h4 className="text-sm font-semibold text-slate-400 flex items-center gap-1.5">
                    <ShieldAlert className="h-4 w-4 text-amber-500" />
                    Maintenance Lockout
                  </h4>
                  <p className="text-sm text-slate-200">
                    Locks the platform client mobile interface for scheduled technical updates or system verification.
                  </p>
                  <div className="pt-2 flex items-center gap-3">
                    <Button
                      variant={maintenanceMode ? 'danger' : 'secondary'}
                      onClick={() => setMaintenanceMode((current) => !current)}
                    >
                      {maintenanceMode ? 'Disable Maintenance' : 'Activate Maintenance'}
                    </Button>
                    <span className="text-xs text-slate-500 font-mono">
                      Current: {maintenanceMode ? 'LOCKED' : 'ACTIVE'}
                    </span>
                  </div>
                </div>

                {/* Branding Input */}
                <div className="rounded-3xl border border-slate-800 bg-slate-950/95 p-6 space-y-4">
                  <h4 className="text-sm font-semibold text-slate-400 flex items-center gap-1.5">
                    <LayoutTemplate className="h-4 w-4 text-brand-400" />
                    Branding Label
                  </h4>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-400 block">Governance Title Name</label>
                    <input
                      type="text"
                      value={brandingTitle}
                      onChange={(e) => setBrandingTitle(e.target.value)}
                      placeholder="e.g. Haqooq Governance Portal"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex justify-end gap-3 border-t border-slate-800 pt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (config) {
                      setMaintenanceMode(config.maintenanceMode);
                      setBrandingTitle(config.brandingTitle);
                      toast.success('Form changes reset');
                    }
                  }}
                  disabled={settingsMutation.isPending}
                  className="flex items-center gap-1.5"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reset Form
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSave}
                  isLoading={settingsMutation.isPending}
                  className="flex items-center gap-1.5"
                >
                  <Check className="h-4 w-4" />
                  Save Configurations
                </Button>
              </div>
            </Card>

            <Card title="System Information">
              <div className="space-y-4 text-slate-350 text-sm">
                <p>
                  To secure API routing access, settings configuration and feature flags are checked server-side within the Next.js middle-tier authentication layer.
                </p>
                <p>
                  Updates to these configuration keys are logged under the **Governance & Configuration** segment of the audit logs trail.
                </p>
              </div>
            </Card>
          </div>
        )}
      </div>
    </PageShell>
  );
}

