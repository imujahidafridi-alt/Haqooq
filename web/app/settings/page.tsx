"use client";

import { useState } from 'react';
import { PageShell } from '@/components/layout/PageShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function SettingsPage() {
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  return (
    <PageShell title="App settings">
      <div className="space-y-6">
        <Card title="Deployment controls">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-3xl border border-slate-800 bg-slate-950/95 p-6">
              <p className="text-sm text-slate-400">Maintenance mode</p>
              <p className="mt-3 text-base text-slate-200">Round up the platform for essential updates or compliance operations.</p>
              <Button
                variant={maintenanceMode ? 'danger' : 'secondary'}
                onClick={() => setMaintenanceMode((current) => !current)}
                className="mt-6"
              >
                {maintenanceMode ? 'Disable maintenance' : 'Enable maintenance'}
              </Button>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-950/95 p-6">
              <p className="text-sm text-slate-400">Branding</p>
              <p className="mt-3 text-base text-slate-200">Centralize application labels, support contact, and legal notices.</p>
              <Button variant="ghost" className="mt-6">
                Review content policies
              </Button>
            </div>
          </div>
        </Card>

        <Card title="Governance & transparency">
          <div className="space-y-4 text-slate-300">
            <p className="text-sm">Feature toggles and audit visibility settings should be stored in a secure back-end configuration layer.</p>
            <p className="text-sm">Use environment management for API credentials, legal publication cycles, and moderation thresholds.</p>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
