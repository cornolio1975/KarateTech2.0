'use client';

import React, { useState, useEffect } from 'react';
import { Film, Play, Edit3, Trash2, Plus, MonitorPlay, Save } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { PageTabBar } from '@/components/ActionMenu';
import { useTournament } from '@/context/TournamentContext';
import { triggerAnimation } from '@/lib/animationEngine';

interface AnimationMapping {
  id: string;
  scoreType: string;
  side: string;
  animationKey: string;
  assetUrl: string;
  durationMs: number;
}

const DEFAULT_MAPPINGS: AnimationMapping[] = [
  { id: '1', scoreType: 'YUKO', side: 'AKA', animationKey: 'yuko_aka', assetUrl: '/assets/animations/yuko_red.mp4', durationMs: 1500 },
  { id: '2', scoreType: 'YUKO', side: 'AO', animationKey: 'yuko_ao', assetUrl: '/assets/animations/yuko_blue.mp4', durationMs: 1500 },
  { id: '3', scoreType: 'WAZA-ARI', side: 'AKA', animationKey: 'wazaari_aka', assetUrl: '/assets/animations/wazaari_red.mp4', durationMs: 2000 },
  { id: '4', scoreType: 'WAZA-ARI', side: 'AO', animationKey: 'wazaari_ao', assetUrl: '/assets/animations/wazaari_blue.mp4', durationMs: 2000 },
  { id: '5', scoreType: 'IPPON', side: 'AKA', animationKey: 'ippon_aka', assetUrl: '/assets/animations/ippon_red.mp4', durationMs: 3000 },
  { id: '6', scoreType: 'IPPON', side: 'AO', animationKey: 'ippon_ao', assetUrl: '/assets/animations/ippon_blue.mp4', durationMs: 3000 },
];

export default function AnimationsPage() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('library');
  const [mappings, setMappings] = useState<AnimationMapping[]>(DEFAULT_MAPPINGS);
  const { tournamentName } = useTournament();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleTestTrigger = async (mapping: AnimationMapping) => {
    // Attempt to broadcast the trigger
    await triggerAnimation({
      tournamentId: 'demo-tournament',
      scoreType: mapping.scoreType as any,
      side: mapping.side as any,
      animationTrigger: mapping.animationKey,
    });
    alert(`Triggered ${mapping.animationKey} (check display connected to same tournament if implemented)`);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageHeader
        title="Animation Management"
        breadcrumbs={[
          { label: 'System', href: '/admin' },
          { label: 'Animations' }
        ]}
        icon={<Film className="h-6 w-6" />}
      />

      <PageTabBar
        tabs={[
          { id: 'library', label: 'Asset Library', icon: <Film className="h-4 w-4" /> },
          { id: 'triggers', label: 'Event Triggers', icon: <MonitorPlay className="h-4 w-4" /> },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold">Animation Triggers</h2>
            <p className="text-muted-foreground text-sm">Map scoring events to specific media assets for realtime display overlays.</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" />
            Add Mapping
          </button>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-secondary/50 border-b border-border">
              <tr>
                <th className="p-4 font-semibold text-muted-foreground">Event Type</th>
                <th className="p-4 font-semibold text-muted-foreground">Side</th>
                <th className="p-4 font-semibold text-muted-foreground">Animation Key</th>
                <th className="p-4 font-semibold text-muted-foreground">Asset URL</th>
                <th className="p-4 font-semibold text-muted-foreground">Duration</th>
                <th className="p-4 font-semibold text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {mappings.map((mapping) => (
                <tr key={mapping.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="p-4 font-bold">{mapping.scoreType}</td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black ${mapping.side === 'AKA' ? 'bg-red-500/20 text-red-500' : 'bg-blue-500/20 text-blue-500'}`}>
                      {mapping.side}
                    </span>
                  </td>
                  <td className="p-4 font-mono text-xs">{mapping.animationKey}</td>
                  <td className="p-4 font-mono text-xs text-muted-foreground truncate max-w-[200px]">
                    {mapping.assetUrl}
                  </td>
                  <td className="p-4 text-muted-foreground">{mapping.durationMs}ms</td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleTestTrigger(mapping)} className="p-2 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors" title="Test Trigger">
                        <Play className="h-4 w-4" />
                      </button>
                      <button className="p-2 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors" title="Edit">
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button className="p-2 hover:bg-red-500/10 rounded text-muted-foreground hover:text-red-500 transition-colors" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
