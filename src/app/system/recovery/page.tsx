'use client';

import React, { useState, useEffect } from 'react';
import { Database, Save, RotateCcw, ShieldAlert, FileText, History, Trash2, Search, CheckCircle2 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { PageTabBar } from '@/components/ActionMenu';
import { useTournament } from '@/context/TournamentContext';
import { db } from '@/db/dbClient';
import { Category } from '@/db/types';
import RecoveryConsoleModal from '@/components/RecoveryConsoleModal';

export default function RecoveryConsolePage() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('snapshots');
  const { tournamentName, activeTournamentId } = useTournament();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (activeTournamentId) {
      db.categories.list().then(setCategories);
    }
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const tab = urlParams.get('tab');
      if (tab) {
        setActiveTab(tab);
      }
    }
  }, [activeTournamentId]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageHeader
        title="System Recovery & Flush Console"
        breadcrumbs={[
          { label: 'System', href: '/admin' },
          { label: 'Recovery Console' }
        ]}
        icon={<Database className="h-6 w-6" />}
      />

      <PageTabBar
        tabs={[
          { id: 'snapshots', label: 'Snapshots', icon: <Save className="h-4 w-4" /> },
          { id: 'recovery', label: 'Bracket & Bout Recovery', icon: <RotateCcw className="h-4 w-4" /> },
          { id: 'flush_history', label: 'Flush Loaded Bracket', icon: <Trash2 className="h-4 w-4" /> },
          { id: 'audit', label: 'Audit Log', icon: <FileText className="h-4 w-4" /> },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div className="p-6 max-w-6xl mx-auto">
        {activeTab === 'snapshots' ? (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-card border border-border p-6 rounded-xl shadow-sm">
              <div>
                <h3 className="text-lg font-bold">Manual System Snapshot</h3>
                <p className="text-sm text-muted-foreground mt-1">Create an atomic snapshot of all categories, brackets, and bouts.</p>
              </div>
              <button className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-bold rounded-lg hover:bg-primary/90 transition-colors">
                <Save className="h-5 w-5" />
                Create Snapshot
              </button>
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
              <div className="p-4 bg-secondary/50 border-b border-border flex justify-between items-center">
                <h3 className="font-bold">Recent Snapshots</h3>
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input type="text" placeholder="Search snapshots..." className="pl-9 pr-4 py-1.5 text-sm bg-background border border-border rounded-lg" />
                </div>
              </div>
              <table className="w-full text-left text-sm">
                <thead className="bg-secondary/20">
                  <tr>
                    <th className="p-4 font-semibold text-muted-foreground">ID</th>
                    <th className="p-4 font-semibold text-muted-foreground">Reason</th>
                    <th className="p-4 font-semibold text-muted-foreground">Created By</th>
                    <th className="p-4 font-semibold text-muted-foreground">Date</th>
                    <th className="p-4 font-semibold text-muted-foreground text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[1, 2, 3].map((i) => (
                    <tr key={i} className="hover:bg-secondary/30 transition-colors">
                      <td className="p-4 font-mono text-xs">SNAP-{Math.random().toString(36).substring(2, 8).toUpperCase()}</td>
                      <td className="p-4">Pre-flush backup</td>
                      <td className="p-4 text-muted-foreground">admin@karatetech.com</td>
                      <td className="p-4 text-muted-foreground">Today, 10:0{i} AM</td>
                      <td className="p-4 text-right">
                        <button className="text-sm font-semibold text-primary hover:underline">Restore</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === 'recovery' ? (
          <div className="flex-1 flex flex-col items-center justify-center border border-border bg-card/50 rounded-xl p-16 text-center shadow-sm">
            <RotateCcw className="h-12 w-12 text-primary mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">
              Bracket & Bout Recovery
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mb-6">
              Launch the Recovery Console to restore previous bracket versions, recover from accidental score deletions, fix corruptions, or import backups for specific categories.
            </p>
            <button
              onClick={() => setIsRecoveryModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-bold rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
            >
              <ShieldAlert className="h-5 w-5" />
              Launch Recovery Console
            </button>
          </div>
        ) : activeTab === 'flush_history' ? (
          <div className="space-y-6">
            <div className="flex flex-col items-center justify-center border border-border bg-card/50 rounded-xl p-16 text-center shadow-sm">
              <Trash2 className="h-12 w-12 text-destructive mb-4" />
              <h2 className="text-xl font-bold text-foreground mb-2">
                Flush Loaded Bracket
              </h2>
              <p className="text-sm text-muted-foreground max-w-md mb-8">
                Flushing a bracket will clear all match results and put all participants back to their beginning state (un-drawn pool). This action is destructive and cannot be easily undone without a snapshot.
              </p>
              
              <div className="w-full max-w-sm space-y-4 text-left">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                    Select Category to Flush
                  </label>
                  <select
                    id="flush-category-select"
                    className="w-full px-4 py-3 bg-card border border-border rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                    defaultValue=""
                  >
                    <option value="" disabled>-- Select a Category --</option>
                    <option value="ALL" className="text-destructive font-bold">⚠️ ALL CATEGORIES (DANGEROUS)</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                
                <button
                  onClick={async () => {
                    const selectEl = document.getElementById('flush-category-select') as HTMLSelectElement;
                    const catId = selectEl.value;
                    if (!catId) {
                      alert('Please select a category first.');
                      return;
                    }
                    
                    const isAll = catId === 'ALL';
                    const catName = isAll ? 'ALL CATEGORIES' : categories.find(c => c.id === catId)?.name;
                    
                    const confirmed = window.confirm(`Are you sure you want to flush ${catName}? This will CLEAR ALL RESULTS and put participants back to the beginning state.`);
                    if (confirmed) {
                      try {
                        if (isAll) {
                          await db.bouts.clearAllDraws();
                          const allCats = await db.categories.list();
                          for (const c of allCats) {
                             await db.categories.update(c.id, { draw_status: 'Draft' });
                          }
                        } else {
                          await db.bouts.clearDraw(catId);
                          await db.categories.update(catId, { draw_status: 'Draft' });
                        }
                        alert(`Successfully flushed ${catName}.`);
                      } catch (err: any) {
                        alert('Error flushing bracket: ' + err.message);
                      }
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-destructive/10 text-destructive font-bold rounded-lg hover:bg-destructive hover:text-white transition-colors shadow-sm"
                >
                  <Trash2 className="h-5 w-5" />
                  Flush Bracket
                </button>
              </div>
            </div>
          </div>
        ) : activeTab === 'audit' ? (
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
              <div className="p-4 bg-secondary/50 border-b border-border flex justify-between items-center">
                <h3 className="font-bold">System Audit Log</h3>
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input type="text" placeholder="Search audit logs..." className="pl-9 pr-4 py-1.5 text-sm bg-background border border-border rounded-lg" />
                </div>
              </div>
              <table className="w-full text-left text-sm">
                <thead className="bg-secondary/20">
                  <tr>
                    <th className="p-4 font-semibold text-muted-foreground">Timestamp</th>
                    <th className="p-4 font-semibold text-muted-foreground">User</th>
                    <th className="p-4 font-semibold text-muted-foreground">Action</th>
                    <th className="p-4 font-semibold text-muted-foreground">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <tr key={i} className="hover:bg-secondary/30 transition-colors">
                      <td className="p-4 text-muted-foreground font-mono text-xs">Today, {10 - i}:15 AM</td>
                      <td className="p-4 font-medium">admin@karatetech.com</td>
                      <td className="p-4"><span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-500">UPDATE</span></td>
                      <td className="p-4 text-muted-foreground truncate max-w-xs">Modified tournament settings for {tournamentName || 'Current Event'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>

      <RecoveryConsoleModal
        isOpen={isRecoveryModalOpen}
        onClose={() => setIsRecoveryModalOpen(false)}
        categories={categories}
      />
    </div>
  );
}
