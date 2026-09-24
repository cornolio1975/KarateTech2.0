'use client';

import React, { useState, useEffect } from 'react';
import { Video, List, Activity, CheckSquare, History, Settings, PlayCircle } from 'lucide-react';
import { useTournament } from '@/context/TournamentContext';
import PageHeader from '@/components/PageHeader';
import { PageTabBar } from '@/components/ActionMenu';

export default function VideoReviewPage() {
  const { tournamentName } = useTournament();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  const [tatamiId, setTatamiId] = useState<string>('1');

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageHeader
        title="Video Review Console"
        breadcrumbs={[
          { label: 'Scoring', href: '/dashboard/operator' },
          { label: 'Video Review' }
        ]}
        contextBadges={[
          { label: 'KT3.0 Event Engine', value: 'Active', color: 'blue' },
          { label: 'Tatami', value: tatamiId, color: 'purple' }
        ]}
        icon={<Video className="h-6 w-6" />}
      />

      <PageTabBar
        tabs={[
          { id: 'pending', label: 'Pending Requests', icon: <List className="h-4 w-4" />, badge: 2, badgeColor: 'red' },
          { id: 'current', label: 'Current Review', icon: <PlayCircle className="h-4 w-4" /> },
          { id: 'decisions', label: 'Decisions', icon: <CheckSquare className="h-4 w-4" /> },
          { id: 'history', label: 'History', icon: <History className="h-4 w-4" /> },
          { id: 'config', label: 'Configuration', icon: <Settings className="h-4 w-4" /> },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div className="p-6">
        {activeTab === 'pending' ? (
          <div className="max-w-4xl mx-auto space-y-4">
            <h2 className="text-lg font-bold mb-4">Pending VR Requests</h2>
            {[1, 2].map((req) => (
              <div key={req} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-500/20 text-red-500 rounded-lg flex items-center justify-center font-bold text-xl border border-red-500/30">
                    AKA
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Coach Request: YUKO</h3>
                    <p className="text-sm text-muted-foreground">Tatami {tatamiId} • Bout 12{req} • 1m 24s ago</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground font-semibold rounded-lg transition-colors border border-border">
                    Dismiss
                  </button>
                  <button className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg transition-colors shadow-sm">
                    Accept & Review
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center border border-border bg-card/50 rounded-xl p-16 text-center shadow-sm">
            <Video className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2 capitalize">
              {activeTab} View
            </h2>
            <p className="text-sm text-muted-foreground max-w-md">
              This specialized KT3.0 view is currently under development. Video streams will appear here when connected to the local media server.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
