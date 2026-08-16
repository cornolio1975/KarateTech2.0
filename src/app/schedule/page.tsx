'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/db/dbClient';
import { Bout, Category, Participant, isKataCategory, isKumiteCategory } from '@/db/types';
import { CalendarDays, Save, Sparkles, Clock, RefreshCw, Layers, X } from 'lucide-react';
import { useTournament } from '@/context/TournamentContext';

export default function SchedulePage() {
  const { canModify } = useTournament();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bouts, setBouts] = useState<Bout[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  
  // Selection/filters
  const [selectedCatId, setSelectedCatId] = useState<string>('ALL');
  const [disciplineFilter, setDisciplineFilter] = useState<'ALL' | 'KUMITE' | 'KATA'>('ALL');
  
  // Edit schedule form
  const [editBoutId, setEditBoutId] = useState<string | null>(null);
  const [tatami, setTatami] = useState<string>('Tatami 1');
  const [scheduleTime, setScheduleTime] = useState<string>('09:00');

  // Auto Schedule Wizard Configuration
  const [wizardTatami, setWizardTatami] = useState<string>('Tatami 1');
  const [wizardStartTime, setWizardStartTime] = useState<string>('09:00');
  const [wizardInterval, setWizardInterval] = useState<number>(5); // 5 mins
  const [wizardMessage, setWizardMessage] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [bList, cList, pList] = await Promise.all([
        db.bouts.list(),
        db.categories.list(),
        db.participants.list()
      ]);
      setBouts(bList);
      setCategories(cList);
      setParticipants(pList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSchedule = async (boutId: string) => {
    try {
      setLoading(true);
      
      // Load current local store lists
      const list = [...bouts];
      const idx = list.findIndex(b => b.id === boutId);
      if (idx !== -1) {
        list[idx] = {
          ...list[idx],
          tatami,
          scheduled_time: scheduleTime
        };
        setBouts(list);
        if (typeof window !== 'undefined') {
          localStorage.setItem('ts_bouts', JSON.stringify(list));
        }
      }
      setEditBoutId(null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Auto Sequence Wizard
  const handleAutoSchedule = () => {
    const targetBouts = bouts.filter(b => {
      if (b.status === 'Completed' || b.status === 'Walkover' || b.victory_method === 'Walkover' || b.round_no === 99) return false;
      const cat = categories.find(c => c.id === b.category_id);
      if (disciplineFilter === 'KUMITE' && !isKumiteCategory(cat)) return false;
      if (disciplineFilter === 'KATA' && !isKataCategory(cat)) return false;
      if (selectedCatId !== 'ALL' && b.category_id !== selectedCatId) return false;
      return true;
    });

    if (targetBouts.length === 0) {
      setWizardMessage('No editable scheduled bouts found matching filters.');
      return;
    }

    // Parse start time "HH:MM"
    const [hours, minutes] = wizardStartTime.split(':').map(Number);
    let currentMin = hours * 60 + minutes;

    const list = [...bouts];
    targetBouts.forEach((bout) => {
      const idx = list.findIndex(b => b.id === bout.id);
      if (idx !== -1) {
        const hh = Math.floor(currentMin / 60) % 24;
        const mm = currentMin % 60;
        const timeStr = `${hh < 10 ? '0' : ''}${hh}:${mm < 10 ? '0' : ''}${mm}`;
        
        list[idx] = {
          ...list[idx],
          tatami: wizardTatami,
          scheduled_time: timeStr
        };
        currentMin += wizardInterval;
      }
    });

    setBouts(list);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ts_bouts', JSON.stringify(list));
    }
    
    setWizardMessage(`Successfully scheduled ${targetBouts.length} bouts on ${wizardTatami} starting at ${wizardStartTime}!`);
    setTimeout(() => setWizardMessage(null), 4000);
  };

  if (!mounted) return null;

  // Filtered categories display list
  const displayCategories = categories.filter(c => {
    if (disciplineFilter === 'KUMITE') return isKumiteCategory(c);
    if (disciplineFilter === 'KATA') return isKataCategory(c);
    return true;
  });

  // Filtered Bouts (Excluding all Walkover and bye matches)
  const filteredBouts = bouts.filter(b => {
    if (b.status === 'Walkover' || b.victory_method === 'Walkover' || b.round_no === 99) return false;
    const cat = categories.find(c => c.id === b.category_id);
    if (disciplineFilter === 'KUMITE' && !isKumiteCategory(cat)) return false;
    if (disciplineFilter === 'KATA' && !isKataCategory(cat)) return false;
    if (selectedCatId !== 'ALL' && b.category_id !== selectedCatId) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-6 text-foreground w-full min-h-[calc(100vh-64px)] flex flex-col overflow-y-auto">
      
      {/* Title */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Match Scheduler</h1>
          <p className="text-sm text-muted-foreground">Assign tatami rings, configure timing orders, and bulk schedule category bouts.</p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="p-2 hover:bg-secondary border border-border text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
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
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 rounded-lg">
              {wizardMessage}
            </div>
          )}

          <div className="space-y-4">
            {/* Discipline Filter */}
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Discipline Filter</label>
              <select 
                value={disciplineFilter}
                onChange={(e) => {
                  const val = e.target.value as 'ALL' | 'KUMITE' | 'KATA';
                  setDisciplineFilter(val);
                  setSelectedCatId('ALL');
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
                value={selectedCatId}
                onChange={(e) => setSelectedCatId(e.target.value)}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs font-semibold text-foreground focus:outline-none"
              >
                <option value="ALL">All Categories in Filter ({displayCategories.length})</option>
                {displayCategories.map(c => (
                  <option key={c.id} value={c.id}>
                    {isKataCategory(c) ? '🏆 [KATA] ' : '🥋 [KUMITE] '}{c.name}
                  </option>
                ))}
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
                <option value="Tatami 1">Tatami 1</option>
                <option value="Tatami 2">Tatami 2</option>
                <option value="Tatami 3">Tatami 3</option>
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
          <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Matches Scheduled List</h2>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Discipline Tabs */}
              <div className="flex bg-secondary p-0.5 rounded-lg text-[10px] font-bold">
                <button
                  onClick={() => { setDisciplineFilter('ALL'); setSelectedCatId('ALL'); }}
                  className={`px-2 py-1 rounded transition ${disciplineFilter === 'ALL' ? 'bg-card text-foreground font-black shadow-xs' : 'text-muted-foreground'}`}
                >
                  ALL
                </button>
                <button
                  onClick={() => { setDisciplineFilter('KUMITE'); setSelectedCatId('ALL'); }}
                  className={`px-2 py-1 rounded transition ${disciplineFilter === 'KUMITE' ? 'bg-yellow-400 text-black font-black shadow-xs' : 'text-muted-foreground'}`}
                >
                  KUMITE
                </button>
                <button
                  onClick={() => { setDisciplineFilter('KATA'); setSelectedCatId('ALL'); }}
                  className={`px-2 py-1 rounded transition ${disciplineFilter === 'KATA' ? 'bg-yellow-400 text-black font-black shadow-xs' : 'text-muted-foreground'}`}
                >
                  KATA
                </button>
              </div>

              <span className="text-[10px] bg-secondary px-2.5 py-1 rounded-md font-mono font-bold text-muted-foreground">
                {filteredBouts.length} bouts total
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredBouts.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground text-xs space-y-2 h-full">
                <Clock className="h-8 w-8 text-primary/20" />
                <span className="font-bold text-foreground">No Matches Available</span>
                <span>Select active category or verify draws generated.</span>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredBouts.map((b) => {
                  const competitorA = participants.find(p => p.id === b.participant_a_id);
                  const competitorB = participants.find(p => p.id === b.participant_b_id);
                  const category = categories.find(c => c.id === b.category_id);
                  
                  const isEditing = editBoutId === b.id;

                  return (
                    <div key={b.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-secondary/15 transition-colors">
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold text-muted-foreground">BOUT {b.bout_no}</span>
                          <span className="text-[10px] text-primary bg-primary/5 px-2 py-0.5 rounded-full font-bold">{category?.name}</span>
                        </div>
                        
                        <div className="flex items-center gap-1.5 text-xs font-semibold">
                          <span className="text-red-500 truncate max-w-[120px] sm:max-w-none">{competitorA?.full_name || 'TBD'}</span>
                          <span className="text-muted-foreground font-normal">vs</span>
                          <span className="text-blue-500 truncate max-w-[120px] sm:max-w-none">{competitorB?.full_name || 'TBD'}</span>
                        </div>
                      </div>

                      {/* Scheduling controls */}
                      <div className="shrink-0 flex items-center gap-3">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            {/* Tatami select */}
                            <select
                              value={tatami}
                              onChange={(e) => setTatami(e.target.value)}
                              className="px-2 py-1 bg-secondary border border-border rounded text-[11px] font-semibold text-foreground focus:outline-none"
                            >
                              <option value="Tatami 1">Tatami 1</option>
                              <option value="Tatami 2">Tatami 2</option>
                              <option value="Tatami 3">Tatami 3</option>
                            </select>
                            
                            {/* Time input */}
                            <input
                              type="text"
                              value={scheduleTime}
                              onChange={(e) => setScheduleTime(e.target.value)}
                              className="w-14 px-2 py-1 bg-secondary border border-border rounded text-[11px] font-semibold text-center text-foreground focus:outline-none"
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
                              <span className="block font-bold text-foreground bg-secondary px-2 py-0.5 rounded-md border border-border">
                                {b.tatami || 'No Tatami Assigned'}
                              </span>
                              <span className="block font-mono text-muted-foreground font-semibold flex items-center justify-end gap-1">
                                <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span>{b.scheduled_time || 'Not Scheduled'}</span>
                              </span>
                            </div>

                            {canModify && (
                              <button
                                onClick={() => {
                                  setEditBoutId(b.id);
                                  setTatami(b.tatami || 'Tatami 1');
                                  setScheduleTime(b.scheduled_time || '09:00');
                                }}
                                disabled={b.status === 'Completed' || b.status === 'Walkover'}
                                className="p-1.5 hover:bg-secondary border border-border text-muted-foreground hover:text-foreground rounded-lg transition-all cursor-pointer disabled:opacity-40"
                                title="Edit schedule details"
                              >
                                <Clock className="h-3.5 w-3.5" />
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
