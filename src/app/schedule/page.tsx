'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '@/db/dbClient';
import { Bout, Category, Participant, isKataCategory, isKumiteCategory } from '@/db/types';
import { CalendarDays, Save, Sparkles, Clock, RefreshCw, Layers, X, Search, CheckCircle2, AlertCircle, Trash2, RotateCcw } from 'lucide-react';
import { useTournament } from '@/context/TournamentContext';

export default function SchedulePage() {
  const { canModify, tatamiId, takeoverTatami, userEmail } = useTournament();
  const effectiveTatami = takeoverTatami || tatamiId || (userEmail === 'tatami_2@spsportdatasolution.org' ? 2 : userEmail === 'tatami_1@spsportdatasolution.org' ? 1 : null);

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bouts, setBouts] = useState<Bout[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  
  // Right Column (Matches Scheduled List) Filters
  const [tatamiFilter, setTatamiFilter] = useState<'ALL' | 'Tatami 1' | 'Tatami 2' | 'Tatami 3' | 'UNASSIGNED'>(
    effectiveTatami === 2 ? 'Tatami 2' : effectiveTatami === 1 ? 'Tatami 1' : 'ALL'
  );
  const [disciplineFilter, setDisciplineFilter] = useState<'ALL' | 'KUMITE' | 'KATA'>('ALL');
  const [listCategoryFilter, setListCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Edit schedule form
  const [editBoutId, setEditBoutId] = useState<string | null>(null);
  const [editTatami, setEditTatami] = useState<string>(effectiveTatami === 2 ? 'Tatami 2' : 'Tatami 1');
  const [editScheduleTime, setEditScheduleTime] = useState<string>('09:00');

  // Left Column (Auto Schedule Planner Wizard) State
  const [wizardDiscipline, setWizardDiscipline] = useState<'ALL' | 'KUMITE' | 'KATA'>('ALL');
  const [wizardCatId, setWizardCatId] = useState<string>('ALL');
  const [wizardTatami, setWizardTatami] = useState<string>(
    effectiveTatami === 2 ? 'Tatami 2' : effectiveTatami === 1 ? 'Tatami 1' : 'AUTO_CATEGORY'
  );
  const [wizardStartTime, setWizardStartTime] = useState<string>('09:00');
  const [wizardInterval, setWizardInterval] = useState<number>(5); // 5 mins
  const [wizardMessage, setWizardMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setMounted(true);
    loadData();
  }, []);

  // Real-time synchronization for schedule updates across tabs & Tatamis
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const channel = new BroadcastChannel('kt-schedule-sync');
    channel.onmessage = (event) => {
      if (event.data?.type === 'SCHEDULE_UPDATED' || event.data?.type === 'BULK_SCHEDULE_UPDATED') {
        db.bouts.list().then(setBouts).catch(console.error);
      }
    };
    return () => channel.close();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [bList, cList, pList] = await Promise.all([
        db.bouts.list(),
        db.categories.list(),
        db.participants.list()
      ]);
      setBouts(bList || []);
      setCategories(cList || []);
      setParticipants(pList || []);
    } catch (err) {
      console.error('Failed to load schedule data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper to match Tatami ring names flexibly (e.g. 'Tatami 2', 'tatami_2', '2', 'Ring 2')
  const matchTatami = (boutTatami: string | null | undefined, filter: string): boolean => {
    if (!filter || filter === 'ALL') return true;
    const b = String(boutTatami || '').trim().toLowerCase();
    if (filter === 'UNASSIGNED') {
      return !b || b === 'no tatami assigned' || b === 'unassigned' || b === 'null' || b === 'undefined' || b === '';
    }
    const f = filter.trim().toLowerCase();
    if (b === f) return true;
    const bDigit = b.replace(/[^0-9]/g, '');
    const fDigit = f.replace(/[^0-9]/g, '');
    if (bDigit && fDigit && bDigit === fDigit) return true;
    return b.replace(/[\s_-]/g, '') === f.replace(/[\s_-]/g, '');
  };

  // Save individual bout schedule
  const handleSaveSchedule = async (boutId: string) => {
    try {
      setLoading(true);
      const timeVal = editScheduleTime.trim() || '09:00';
      const tatamiVal = editTatami.trim() || 'Tatami 1';

      // 1. Update in local state immediately
      setBouts(prev => {
        const updated = prev.map(b => b.id === boutId ? { ...b, tatami: tatamiVal, scheduled_time: timeVal } : b);
        if (typeof window !== 'undefined') {
          localStorage.setItem('ts_bouts', JSON.stringify(updated));
        }
        return updated;
      });
      setEditBoutId(null);

      // 2. Persist to database
      await db.bouts.update(boutId, {
        tatami: tatamiVal,
        scheduled_time: timeVal
      });

      // 3. Broadcast sync event
      if (typeof window !== 'undefined') {
        const channel = new BroadcastChannel('kt-schedule-sync');
        channel.postMessage({ type: 'SCHEDULE_UPDATED', boutId, tatami: tatamiVal, scheduled_time: timeVal });
        channel.close();
      }
    } catch (err: any) {
      console.error('Error saving schedule:', err);
      alert('Error saving schedule: ' + (err?.message || 'Database error'));
    } finally {
      setLoading(false);
    }
  };

  const handleResetAllSchedules = async () => {
    if (!confirm('Are you sure you want to reset all schedules? All match times and tatami assignments will be cleared.')) return;
    try {
      setLoading(true);
      await (db.bouts as any).resetAllSchedules();
      await loadData();
      if (typeof window !== 'undefined') {
        const channel = new BroadcastChannel('kt-schedule-sync');
        channel.postMessage({ type: 'SCHEDULE_RESET' });
        channel.close();
      }
      setWizardMessage({
        type: 'success',
        text: 'All match schedules and tatami assignments have been reset successfully!'
      });
      setTimeout(() => setWizardMessage(null), 5000);
    } catch (e: any) {
      alert('Error resetting schedules: ' + (e?.message || 'Database error'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAllMatches = async () => {
    if (!confirm('Are you sure you want to DELETE ALL matches and bracket draws? This cannot be undone and will give you a clean slate.')) return;
    try {
      setLoading(true);
      await (db.bouts as any).clearAllBouts();
      await loadData();
      if (typeof window !== 'undefined') {
        const channel = new BroadcastChannel('kt-schedule-sync');
        channel.postMessage({ type: 'ALL_BOUTS_DELETED' });
        channel.close();
      }
      setWizardMessage({
        type: 'success',
        text: 'All match records deleted successfully. Ready to start fresh!'
      });
      setTimeout(() => setWizardMessage(null), 5000);
    } catch (e: any) {
      alert('Error deleting matches: ' + (e?.message || 'Database error'));
    } finally {
      setLoading(false);
    }
  };

  // Auto Sequence Wizard
  const handleAutoSchedule = async () => {
    // Filter target bouts specifically based on the WIZARD selections
    const rawTargetBouts = bouts.filter(b => {
      if (b.status === 'Completed' || b.status === 'Walkover' || b.victory_method === 'Walkover' || b.round_no === 99) return false;
      const cat = categories.find(c => String(c.id) === String(b.category_id));
      if (wizardDiscipline === 'KUMITE' && !isKumiteCategory(cat)) return false;
      if (wizardDiscipline === 'KATA' && !isKataCategory(cat)) return false;
      if (wizardCatId !== 'ALL' && String(b.category_id) !== String(wizardCatId)) return false;
      return true;
    });

    if (rawTargetBouts.length === 0) {
      setWizardMessage({
        type: 'error',
        text: 'No uncompleted bouts found matching wizard filters. Please verify draws/brackets are generated.'
      });
      return;
    }

    // Sort bouts chronologically: earlier rounds first, then by bout number
    const targetBouts = [...rawTargetBouts].sort((a, b) => {
      if (String(a.category_id) !== String(b.category_id)) return String(a.category_id).localeCompare(String(b.category_id));
      if (a.round_no !== b.round_no) return a.round_no - b.round_no;
      return a.bout_no - b.bout_no;
    });

    setLoading(true);
    try {
      // Parse start time "HH:MM"
      const [hours, minutes] = (wizardStartTime || '09:00').split(':').map(Number);
      const startMin = (isNaN(hours) ? 9 : hours) * 60 + (isNaN(minutes) ? 0 : minutes);

      // Track timeline independently per Tatami ring so parallel scheduling works accurately
      const ringMinutes: Record<string, number> = {
        'Tatami 1': startMin,
        'Tatami 2': startMin,
        'Tatami 3': startMin,
      };

      const updates: { id: string; tatami: string; scheduled_time: string }[] = [];
      targetBouts.forEach((bout) => {
        const cat = categories.find(c => String(c.id) === String(bout.category_id));
        let ring = wizardTatami;
        if (wizardTatami === 'AUTO_CATEGORY') {
          ring = (cat as any)?.assigned_tatami || 'Tatami 1';
        }

        const curMin = ringMinutes[ring] !== undefined ? ringMinutes[ring] : startMin;
        const hh = Math.floor(curMin / 60) % 24;
        const mm = curMin % 60;
        const timeStr = `${hh < 10 ? '0' : ''}${hh}:${mm < 10 ? '0' : ''}${mm}`;

        updates.push({ id: bout.id, tatami: ring, scheduled_time: timeStr });
        ringMinutes[ring] = curMin + (wizardInterval || 5);
      });

      // 1. Immediately update state and localStorage
      const updatedBouts = bouts.map(b => {
        const found = updates.find(u => u.id === b.id);
        return found ? { ...b, tatami: found.tatami, scheduled_time: found.scheduled_time } : b;
      });

      setBouts(updatedBouts);
      if (typeof window !== 'undefined') {
        localStorage.setItem('ts_bouts', JSON.stringify(updatedBouts));
      }

      // Automatically align right-hand list tab to target tatami and category so user immediately sees results
      if (wizardTatami === 'Tatami 1' || wizardTatami === 'Tatami 2' || wizardTatami === 'Tatami 3') {
        setTatamiFilter(wizardTatami);
      } else {
        setTatamiFilter('ALL');
      }
      if (wizardDiscipline !== 'ALL') {
        setDisciplineFilter(wizardDiscipline);
      }
      if (wizardCatId !== 'ALL') {
        setListCategoryFilter(wizardCatId);
      } else {
        setListCategoryFilter('ALL');
      }

      // 2. Persist to database in background
      await Promise.all(updates.map(u => 
        db.bouts.update(u.id, { tatami: u.tatami, scheduled_time: u.scheduled_time }).catch(e => {
          console.warn(`Failed to update bout ${u.id}:`, e);
        })
      ));

      // 3. Broadcast sync event
      if (typeof window !== 'undefined') {
        const channel = new BroadcastChannel('kt-schedule-sync');
        channel.postMessage({ type: 'BULK_SCHEDULE_UPDATED', count: updates.length, tatami: wizardTatami });
        channel.close();
      }
      
      setWizardMessage({
        type: 'success',
        text: `Successfully scheduled ${targetBouts.length} bouts starting at ${wizardStartTime} with ${wizardInterval}m intervals!`
      });
      setTimeout(() => setWizardMessage(null), 5000);
    } catch (err: any) {
      console.error('Error in bulk auto schedule:', err);
      setWizardMessage({
        type: 'error',
        text: 'Error scheduling matches: ' + (err?.message || 'Unknown error')
      });
    } finally {
      setLoading(false);
    }
  };

  // Categories list for the Wizard (Left side)
  const wizardCategories = useMemo(() => {
    return categories.filter(c => {
      if (wizardDiscipline === 'KUMITE') return isKumiteCategory(c);
      if (wizardDiscipline === 'KATA') return isKataCategory(c);
      return true;
    });
  }, [categories, wizardDiscipline]);

  // Categories list for the Right List Filter
  const listCategories = useMemo(() => {
    return categories.filter(c => {
      if (disciplineFilter === 'KUMITE') return isKumiteCategory(c);
      if (disciplineFilter === 'KATA') return isKataCategory(c);
      return true;
    });
  }, [categories, disciplineFilter]);

  // Filtered Bouts for the Right List
  const filteredBouts = useMemo(() => {
    return bouts.filter(b => {
      // Exclude walkover and bye matches
      if (b.status === 'Walkover' || b.victory_method === 'Walkover' || b.round_no === 99) return false;

      const cat = categories.find(c => String(c.id) === String(b.category_id));

      // Discipline Filter
      if (disciplineFilter === 'KUMITE' && !isKumiteCategory(cat)) return false;
      if (disciplineFilter === 'KATA' && !isKataCategory(cat)) return false;

      // Category Filter
      if (listCategoryFilter !== 'ALL' && String(b.category_id) !== String(listCategoryFilter)) return false;

      // Tatami Ring Filter
      if (!matchTatami(b.tatami, tatamiFilter)) return false;

      // Text Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const pA = participants.find(p => p.id === b.participant_a_id);
        const pB = participants.find(p => p.id === b.participant_b_id);
        const boutStr = `bout ${b.bout_no} r${b.round_no}b${b.bout_no}`.toLowerCase();
        const catName = (cat?.name || '').toLowerCase();
        const aName = (pA?.full_name || '').toLowerCase();
        const bName = (pB?.full_name || '').toLowerCase();
        if (!boutStr.includes(q) && !catName.includes(q) && !aName.includes(q) && !bName.includes(q)) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      // Sort by scheduled time if available, then by category and bout number
      if (a.scheduled_time && b.scheduled_time && a.scheduled_time !== b.scheduled_time) {
        return a.scheduled_time.localeCompare(b.scheduled_time);
      }
      if (String(a.category_id) !== String(b.category_id)) return String(a.category_id).localeCompare(String(b.category_id));
      if (a.round_no !== b.round_no) return a.round_no - b.round_no;
      return a.bout_no - b.bout_no;
    });
  }, [bouts, categories, participants, disciplineFilter, listCategoryFilter, tatamiFilter, searchQuery]);

  if (!mounted) return null;

  return (
    <div className="p-6 space-y-6 text-foreground w-full min-h-[calc(100vh-64px)] flex flex-col overflow-y-auto">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Match Scheduler</h1>
          <p className="text-sm text-muted-foreground">Assign tatami rings, configure timing orders, and bulk schedule category bouts.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {canModify && (
            <>
              <button
                onClick={handleResetAllSchedules}
                disabled={loading || bouts.length === 0}
                className="px-2.5 py-1.5 bg-secondary hover:bg-yellow-500/15 text-muted-foreground hover:text-yellow-400 border border-border rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold disabled:opacity-50"
                title="Reset all match times and tatami assignments"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset Schedules</span>
              </button>

              <button
                onClick={handleDeleteAllMatches}
                disabled={loading || bouts.length === 0}
                className="px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold disabled:opacity-50"
                title="Delete all match and bracket records"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete All Matches</span>
              </button>
            </>
          )}

          <button
            onClick={loadData}
            disabled={loading}
            className="px-2.5 py-1.5 hover:bg-secondary border border-border text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className={`grid grid-cols-1 ${canModify ? 'lg:grid-cols-3' : 'lg:grid-cols-1'} gap-6 min-h-0 flex-1`}>
        
        {/* LEFT COLUMN: AUTO SCHEDULER WIZARD */}
        {canModify && (
          <div className="bg-card border border-border rounded-xl p-5 shadow-xs flex flex-col space-y-4 h-fit">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Auto-Schedule Planner</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Quickly sequence and schedule remaining category matches across specific rings with fixed timing gaps.
            </p>

            {wizardMessage && (
              <div className={`p-3 border text-[11px] font-semibold rounded-lg flex items-center gap-2 ${
                wizardMessage.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
              }`}>
                {wizardMessage.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                <span>{wizardMessage.text}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* Discipline Filter */}
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Discipline Filter</label>
                <select 
                  value={wizardDiscipline}
                  onChange={(e) => {
                    const val = e.target.value as 'ALL' | 'KUMITE' | 'KATA';
                    setWizardDiscipline(val);
                    setWizardCatId('ALL');
                  }}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs font-semibold text-foreground focus:outline-none"
                >
                  <option value="ALL">All Disciplines (Kumite & Kata)</option>
                  <option value="KUMITE">Kumite Categories ({categories.filter(isKumiteCategory).length})</option>
                  <option value="KATA">Kata Categories ({categories.filter(isKataCategory).length})</option>
                </select>
              </div>

              {/* Target Category Selection */}
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Target Category Selection</label>
                <select 
                  value={wizardCatId}
                  onChange={(e) => {
                    const newCatId = e.target.value;
                    setWizardCatId(newCatId);
                    if (newCatId !== 'ALL') {
                      const matchedCat = categories.find(c => String(c.id) === String(newCatId));
                      const catAssignedTatami = (matchedCat as any)?.assigned_tatami;
                      if (catAssignedTatami === 'Tatami 1' || catAssignedTatami === 'Tatami 2' || catAssignedTatami === 'Tatami 3') {
                        setWizardTatami(catAssignedTatami);
                      }
                    }
                  }}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs font-semibold text-foreground focus:outline-none"
                >
                  <option value="ALL">All Categories in Discipline ({wizardCategories.length})</option>
                  {wizardCategories.map(c => {
                    const catBoutsCount = bouts.filter(b => String(b.category_id) === String(c.id) && b.status !== 'Walkover' && b.status !== 'Completed').length;
                    const ringTag = (c as any)?.assigned_tatami ? ` · [${(c as any).assigned_tatami}]` : '';
                    return (
                      <option key={c.id} value={c.id}>
                        {isKataCategory(c) ? '🏆 [KATA] ' : '🥋 [KUMITE] '}{c.name}{ringTag} ({catBoutsCount} bouts)
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Target Tatami */}
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Target Tatami Ring</label>
                <select 
                  value={wizardTatami}
                  onChange={(e) => setWizardTatami(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs font-semibold text-foreground focus:outline-none"
                >
                  <option value="AUTO_CATEGORY">🎯 Auto-Assign by Category's Tatami Ring</option>
                  <option value="Tatami 1">Tatami 1 (Force to Ring 1)</option>
                  <option value="Tatami 2">Tatami 2 (Force to Ring 2)</option>
                  <option value="Tatami 3">Tatami 3 (Force to Ring 3)</option>
                </select>
              </div>

              {/* Start time */}
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Session Start Time (HH:MM)</label>
                <input
                  type="text"
                  value={wizardStartTime}
                  onChange={(e) => setWizardStartTime(e.target.value)}
                  placeholder="e.g. 09:00"
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>

              {/* Interval gap */}
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Minutes Per Match</label>
                <select 
                  value={wizardInterval}
                  onChange={(e) => setWizardInterval(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs font-semibold text-foreground focus:outline-none"
                >
                  <option value={3}>3 Minutes</option>
                  <option value={5}>5 Minutes</option>
                  <option value={8}>8 Minutes</option>
                  <option value={10}>10 Minutes</option>
                </select>
              </div>

              {/* Live Preview Summary Box */}
              {(() => {
                const targetMatchesCount = bouts.filter(b => {
                  if (b.status === 'Completed' || b.status === 'Walkover' || b.victory_method === 'Walkover' || b.round_no === 99) return false;
                  const cat = categories.find(c => String(c.id) === String(b.category_id));
                  if (wizardDiscipline === 'KUMITE' && !isKumiteCategory(cat)) return false;
                  if (wizardDiscipline === 'KATA' && !isKataCategory(cat)) return false;
                  if (wizardCatId !== 'ALL' && String(b.category_id) !== String(wizardCatId)) return false;
                  return true;
                }).length;
                const catObj = categories.find(c => String(c.id) === String(wizardCatId));

                return (
                  <div className="p-3 bg-secondary/60 border border-border rounded-xl text-xs space-y-1.5">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-muted-foreground uppercase text-[9.5px]">Matches to Schedule:</span>
                      <span className="text-yellow-400 font-mono font-black">{targetMatchesCount} Matches</span>
                    </div>
                    <div className="text-[11px] text-foreground font-bold truncate">
                      {wizardCatId === 'ALL' ? `All ${wizardDiscipline} Categories` : (catObj?.name || 'Selected Category')}
                    </div>
                    <div className="text-[10px] text-muted-foreground flex items-center justify-between pt-1 border-t border-border/50">
                      <span>Target: <strong className="text-primary font-bold">{wizardTatami}</strong></span>
                      <span>Starts: <strong className="font-mono text-foreground font-bold">{wizardStartTime || '09:00'}</strong> (+{wizardInterval}m)</span>
                    </div>
                  </div>
                );
              })()}

              {/* Submit Auto scheduler */}
              <button
                onClick={handleAutoSchedule}
                disabled={loading}
                className="w-full py-2.5 bg-primary text-primary-foreground hover:bg-primary/95 disabled:opacity-50 rounded-lg text-xs font-bold transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Layers className="h-4 w-4 text-white" />
                <span>Bulk Auto-Schedule Sequence</span>
              </button>
            </div>
          </div>
        )}

        {/* RIGHT COLUMN: BOUTS SCHEDULE GRID */}
        <div className={`bg-card border border-border rounded-xl shadow-xs ${canModify ? 'lg:col-span-2' : ''} flex flex-col min-h-[400px]`}>
          
          {/* Header with Rings, Disciplines, and Category Filter */}
          <div className="p-4 border-b border-border flex flex-col gap-3 shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Matches Scheduled List</h2>
                <span className="text-[10px] bg-secondary px-2.5 py-0.5 rounded-md font-mono font-bold text-muted-foreground">
                  {filteredBouts.length} bouts
                </span>
              </div>
              
              {/* Tatami Ring Tabs */}
              <div className="flex bg-secondary p-0.5 rounded-lg text-[10px] font-bold flex-wrap">
                {(['ALL', 'Tatami 1', 'Tatami 2', 'Tatami 3', 'UNASSIGNED'] as const).map(tRing => (
                  <button
                    key={tRing}
                    onClick={() => setTatamiFilter(tRing)}
                    className={`px-2.5 py-1 rounded transition cursor-pointer ${
                      tatamiFilter === tRing
                        ? tRing === 'Tatami 2'
                          ? 'bg-blue-600 text-white font-black shadow-xs'
                          : tRing === 'Tatami 1'
                          ? 'bg-red-600 text-white font-black shadow-xs'
                          : 'bg-card text-foreground font-black shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tRing === 'ALL' ? 'ALL RINGS' : tRing}
                  </button>
                ))}
              </div>
            </div>

            {/* Sub-header Filter Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1 border-t border-border/50">
              <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                {/* Discipline Tabs */}
                <div className="flex bg-secondary p-0.5 rounded-lg text-[10px] font-bold shrink-0">
                  <button
                    onClick={() => { setDisciplineFilter('ALL'); setListCategoryFilter('ALL'); }}
                    className={`px-2 py-1 rounded transition cursor-pointer ${disciplineFilter === 'ALL' ? 'bg-card text-foreground font-black shadow-xs' : 'text-muted-foreground'}`}
                  >
                    ALL
                  </button>
                  <button
                    onClick={() => { setDisciplineFilter('KUMITE'); setListCategoryFilter('ALL'); }}
                    className={`px-2 py-1 rounded transition cursor-pointer ${disciplineFilter === 'KUMITE' ? 'bg-red-600 text-white font-black shadow-xs' : 'text-muted-foreground'}`}
                  >
                    KUMITE
                  </button>
                  <button
                    onClick={() => { setDisciplineFilter('KATA'); setListCategoryFilter('ALL'); }}
                    className={`px-2 py-1 rounded transition cursor-pointer ${disciplineFilter === 'KATA' ? 'bg-blue-600 text-white font-black shadow-xs' : 'text-muted-foreground'}`}
                  >
                    KATA
                  </button>
                </div>

                {/* Category Dropdown */}
                <select
                  value={listCategoryFilter}
                  onChange={(e) => setListCategoryFilter(e.target.value)}
                  className="px-2.5 py-1 bg-secondary border border-border rounded-lg text-[11px] font-semibold text-foreground focus:outline-none max-w-[220px] truncate"
                >
                  <option value="ALL">All Categories ({listCategories.length})</option>
                  {listCategories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search Box */}
              <div className="flex items-center gap-1.5 bg-secondary border border-border rounded-lg px-2.5 py-1 w-full sm:w-48">
                <Search className="h-3 w-3 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search competitor/bout..."
                  className="bg-transparent text-[11px] text-foreground placeholder-muted-foreground outline-none flex-1 font-sans"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="text-muted-foreground hover:text-foreground">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredBouts.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground text-xs space-y-3 h-full">
                <Clock className="h-10 w-10 text-primary/30" />
                <div>
                  <span className="font-bold text-foreground block text-sm">No Matches Available</span>
                  <span className="text-muted-foreground block text-xs mt-0.5">
                    {tatamiFilter !== 'ALL' ? `No scheduled bouts found for ${tatamiFilter} in this category.` : 'No bouts found matching the selected filters.'}
                  </span>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  {tatamiFilter !== 'ALL' && (
                    <button
                      onClick={() => { setTatamiFilter('ALL'); setListCategoryFilter('ALL'); }}
                      className="px-3 py-1.5 bg-secondary hover:bg-card border border-border text-foreground font-semibold rounded-lg text-xs transition cursor-pointer"
                    >
                      Show All Rings
                    </button>
                  )}
                  <a
                    href="/draws"
                    className="px-3 py-1.5 bg-primary text-primary-foreground font-semibold rounded-lg text-xs transition cursor-pointer shadow-sm"
                  >
                    Generate Bracket Draws
                  </a>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredBouts.map((b) => {
                  const competitorA = participants.find(p => p.id === b.participant_a_id);
                  const competitorB = participants.find(p => p.id === b.participant_b_id);
                  const category = categories.find(c => String(c.id) === String(b.category_id));
                  
                  const isEditing = editBoutId === b.id;

                  return (
                    <div key={b.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-secondary/15 transition-colors">
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[10px] font-black text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20">
                            BOUT #{b.bout_no}
                          </span>
                          <span className="text-[10px] text-primary bg-primary/5 px-2 py-0.5 rounded-full font-bold truncate max-w-[280px]">
                            {category?.name || 'Category'}
                          </span>
                          <span className="text-[9.5px] text-muted-foreground font-mono">
                            Round {b.round_no}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1.5 text-xs font-semibold">
                          <span className="text-red-500 truncate max-w-[140px] sm:max-w-none">{competitorA?.full_name || 'TBD (AKA)'}</span>
                          <span className="text-muted-foreground font-normal">vs</span>
                          <span className="text-blue-500 truncate max-w-[140px] sm:max-w-none">{competitorB?.full_name || 'TBD (AO)'}</span>
                        </div>
                      </div>

                      {/* Scheduling controls */}
                      <div className="shrink-0 flex items-center gap-3">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            {/* Tatami select */}
                            <select
                              value={editTatami}
                              onChange={(e) => setEditTatami(e.target.value)}
                              className="px-2 py-1 bg-secondary border border-border rounded text-[11px] font-semibold text-foreground focus:outline-none"
                            >
                              <option value="Tatami 1">Tatami 1</option>
                              <option value="Tatami 2">Tatami 2</option>
                              <option value="Tatami 3">Tatami 3</option>
                            </select>
                            
                            {/* Time input */}
                            <input
                              type="text"
                              value={editScheduleTime}
                              onChange={(e) => setEditScheduleTime(e.target.value)}
                              className="w-16 px-2 py-1 bg-secondary border border-border rounded text-[11px] font-semibold text-center text-foreground focus:outline-none font-mono"
                              placeholder="09:00"
                            />

                            <button
                              onClick={() => handleSaveSchedule(b.id)}
                              className="p-1.5 bg-primary text-primary-foreground hover:bg-primary/95 rounded cursor-pointer"
                              title="Save Changes"
                            >
                              <Save className="h-3.5 w-3.5 text-white" />
                            </button>
                            <button
                              onClick={() => setEditBoutId(null)}
                              className="p-1.5 bg-secondary text-muted-foreground hover:text-foreground rounded cursor-pointer"
                              title="Cancel"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <div className="text-right text-[10px] space-y-0.5">
                              <span className={`block font-bold px-2 py-0.5 rounded-md border ${
                                matchTatami(b.tatami, 'Tatami 2')
                                  ? 'bg-blue-950/80 border-blue-700 text-blue-300'
                                  : matchTatami(b.tatami, 'Tatami 1')
                                  ? 'bg-red-950/80 border-red-700 text-red-300'
                                  : 'bg-secondary border-border text-foreground'
                              }`}>
                                {b.tatami || 'No Tatami Assigned'}
                              </span>
                              <span className="block font-mono text-muted-foreground font-semibold flex items-center justify-end gap-1">
                                <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span>{b.scheduled_time || 'Unscheduled'}</span>
                              </span>
                            </div>

                            {canModify && (
                              <button
                                onClick={() => {
                                  setEditBoutId(b.id);
                                  setEditTatami(b.tatami || 'Tatami 1');
                                  setEditScheduleTime(b.scheduled_time || '09:00');
                                }}
                                className="px-2.5 py-1.5 bg-secondary hover:bg-primary hover:text-primary-foreground text-foreground rounded text-[10px] font-bold transition cursor-pointer border border-border"
                              >
                                Edit
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
