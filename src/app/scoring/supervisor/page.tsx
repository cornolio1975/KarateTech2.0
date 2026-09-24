'use client';

import React, { useState, useEffect } from 'react';
import { ShieldAlert, Activity, CheckCircle, Clock, FileWarning, HelpCircle, History, List } from 'lucide-react';
import { useTournament } from '@/context/TournamentContext';
import PageHeader from '@/components/PageHeader';
import { PageTabBar } from '@/components/ActionMenu';

export default function ScoreSupervisorPage() {
  const { tournamentName } = useTournament();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('monitor');
  const [tatamiId, setTatamiId] = useState<string>('1');

  // Dummy values for demonstration
  const activeBoutId = 'live-bout-123';
  const activeTournamentId = 'demo-tournament';

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageHeader
        title="Score Supervisor Console"
        breadcrumbs={[
          { label: 'Scoring', href: '/dashboard/operator' },
          { label: 'Score Supervisor' }
        ]}
        contextBadges={[
          { label: 'KT3.0 Event Engine', value: 'Active', color: 'blue' },
          { label: 'Tatami', value: tatamiId, color: 'purple' }
        ]}
        icon={<ShieldAlert className="h-6 w-6" />}
      />

      <PageTabBar
        tabs={[
          { id: 'monitor', label: 'Live Monitor', icon: <Activity className="h-4 w-4" /> },
          { id: 'signals', label: 'Judge Signals', icon: <HelpCircle className="h-4 w-4" /> },
          { id: 'scores', label: 'Official Scores', icon: <CheckCircle className="h-4 w-4" /> },
          { id: 'timer', label: 'Timer Events', icon: <Clock className="h-4 w-4" /> },
          { id: 'corrections', label: 'Corrections', icon: <FileWarning className="h-4 w-4" /> },
          { id: 'discrepancies', label: 'Discrepancies', icon: <History className="h-4 w-4" /> },
          { id: 'timeline', label: 'Event Timeline', icon: <List className="h-4 w-4" /> },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div className="p-6">
        {activeTab === 'monitor' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-lg">Live Monitoring</h3>
              </div>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  This console provides a read-only live view of all active bout data for auditing purposes.
                </p>
                <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg border border-border">
                  <span className="text-sm font-semibold">Tatami Connection Status</span>
                  <span className="px-2 py-1 text-xs font-bold bg-green-500/20 text-green-500 rounded-full border border-green-500/30">ONLINE</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg border border-border">
                  <span className="text-sm font-semibold">Event Engine Sync</span>
                  <span className="px-2 py-1 text-xs font-bold bg-green-500/20 text-green-500 rounded-full border border-green-500/30">SYNCED</span>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <FileWarning className="h-5 w-5 text-amber-500" />
                <h3 className="font-bold text-lg">Score Corrections</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Correction workflow requires a reason and creates an immutable audit trail.
              </p>
              <button className="w-full py-3 bg-secondary hover:bg-secondary/80 border border-border text-foreground font-semibold rounded-lg transition-colors">
                Initiate Correction
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center border border-border bg-card/50 rounded-xl p-16 text-center shadow-sm">
            <Activity className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2 capitalize">
              {activeTab} Console
            </h2>
            <p className="text-sm text-muted-foreground max-w-md">
              This specialized KT3.0 view is currently under development. Data will populate from the new event engine tables once connected.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
