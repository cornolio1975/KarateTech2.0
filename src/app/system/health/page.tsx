'use client';

import React, { useState, useEffect } from 'react';
import { Cpu, Activity, Database, Server, Wifi, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { useTournament } from '@/context/TournamentContext';

export default function SystemHealthPage() {
  const [mounted, setMounted] = useState(false);
  const { tournamentName } = useTournament();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageHeader
        title="System Health"
        breadcrumbs={[
          { label: 'System', href: '/admin' },
          { label: 'Health' }
        ]}
        icon={<Cpu className="h-6 w-6" />}
      />

      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-green-500/20 p-3 rounded-lg text-green-500">
                <Database className="h-6 w-6" />
              </div>
              <span className="px-2 py-1 text-xs font-bold bg-green-500/20 text-green-500 rounded-full border border-green-500/30">ONLINE</span>
            </div>
            <h3 className="text-2xl font-black">Supabase DB</h3>
            <p className="text-muted-foreground text-sm">Postgres Connection</p>
          </div>

          <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-blue-500/20 p-3 rounded-lg text-blue-500">
                <Activity className="h-6 w-6" />
              </div>
              <span className="px-2 py-1 text-xs font-bold bg-green-500/20 text-green-500 rounded-full border border-green-500/30">ONLINE</span>
            </div>
            <h3 className="text-2xl font-black">Realtime Sync</h3>
            <p className="text-muted-foreground text-sm">KT3.0 Event Engine</p>
          </div>

          <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-purple-500/20 p-3 rounded-lg text-purple-500">
                <Server className="h-6 w-6" />
              </div>
              <span className="px-2 py-1 text-xs font-bold bg-yellow-500/20 text-yellow-500 rounded-full border border-yellow-500/30">DEGRADED</span>
            </div>
            <h3 className="text-2xl font-black">Local Cache</h3>
            <p className="text-muted-foreground text-sm">Offline Store</p>
          </div>

          <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-orange-500/20 p-3 rounded-lg text-orange-500">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <span className="px-2 py-1 text-xs font-bold bg-green-500/20 text-green-500 rounded-full border border-green-500/30">SECURE</span>
            </div>
            <h3 className="text-2xl font-black">RLS Policies</h3>
            <p className="text-muted-foreground text-sm">Access Control</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border bg-secondary/50 flex justify-between items-center">
              <h3 className="font-bold">Recent System Logs</h3>
              <button className="text-muted-foreground hover:text-foreground">
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex gap-4 text-sm">
                  <span className="text-muted-foreground whitespace-nowrap font-mono text-xs mt-0.5">10:0{i} AM</span>
                  <p><span className="font-bold text-primary">INFO</span> Successfully synchronized tournament state with primary database.</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border bg-secondary/50 flex justify-between items-center">
              <h3 className="font-bold">Active Tatami Connections</h3>
            </div>
            <div className="divide-y divide-border">
              {[1, 2].map((i) => (
                <div key={i} className="p-4 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Wifi className="h-5 w-5 text-green-500" />
                    <div>
                      <h4 className="font-bold">Tatami {i} Client</h4>
                      <p className="text-xs text-muted-foreground">Ping: 24ms • Last seen: 2s ago</p>
                    </div>
                  </div>
                  <button className="px-3 py-1.5 bg-secondary hover:bg-secondary/80 rounded border border-border text-xs font-semibold transition-colors">
                    Disconnect
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
