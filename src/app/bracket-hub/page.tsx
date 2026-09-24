'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/db/dbClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bout, Participant, Category, isKataCategory, isKumiteCategory } from '@/db/types';
import { 
  MonitorPlay, Sword, Play, CheckCircle2, ChevronRight, RefreshCw, Trophy, LayoutGrid, Monitor,
  GitPullRequest, ClipboardList, BarChart2, History, Settings, Trash2, Shield, RotateCcw
} from 'lucide-react';
import { listVersions, getBracketId, BracketVersion, markCorrupted } from '@/db/bracketVersions';
import { getActiveTournamentIdSync } from '@/db/dbClient';

import { useTournament } from '@/context/TournamentContext';
import RecoveryConsoleModal from '@/components/RecoveryConsoleModal';

export default function BracketHubPage() {
  const { canModify, tatamiId, takeoverTatami, userEmail } = useTournament();
  const effectiveTatami = takeoverTatami || tatamiId || (userEmail === 'tatami_2@spsportdatasolution.org' ? 2 : userEmail === 'tatami_1@spsportdatasolution.org' ? 1 : null);
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  // KT3.0 — tab navigation (no logic change to existing operations)
  const [bracketActiveTab, setBracketActiveTab] = useState<'overview' | 'matches' | 'results' | 'history' | 'administration'>('overview');
  const [loading, setLoading] = useState(true);
  const [bouts, setBouts] = useState<Bout[]>([]);
  const [versions, setVersions] = useState<BracketVersion[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  const [selectedCatId, setSelectedCatId] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'All' | 'Kata' | 'Kumite'>('All');
  const [tatamiFilter, setTatamiFilter] = useState<'All' | 'Tatami 1' | 'Tatami 2' | 'Tatami 3'>(
    effectiveTatami === 2 ? 'Tatami 2' : effectiveTatami === 1 ? 'Tatami 1' : 'All'
  );
  
  const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);
  const [recoveryCatId, setRecoveryCatId] = useState<string>('');

  useEffect(() => {
    setMounted(true);
    loadData();
  }, []);

  useEffect(() => {
    if (selectedCatId && mounted) {
      const tId = getActiveTournamentIdSync() || 'default';
      const bId = getBracketId(tId, selectedCatId);
      setVersions(listVersions(tId, bId));
    } else {
      setVersions([]);
    }
  }, [selectedCatId, bracketActiveTab, mounted]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [bList, pList, catList] = await Promise.all([
        db.bouts.list(),
        db.participants.list(),
        db.categories.list()
      ]);
      setBouts(bList);
      setParticipants(pList);
      setCategories(catList);
      
      if (catList.length > 0 && !selectedCatId) {
        // Automatically select the first category that has bouts, or just the first category
        const catsWithBouts = catList.filter(c => bList.some(b => b.category_id === c.id));
        if (catsWithBouts.length > 0) {
          setSelectedCatId(catsWithBouts[0].id);
        } else {
          setSelectedCatId(catList[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markCompleted = async (bout: Bout) => {
    if (!canModify) return;
    if (confirm('Are you sure you want to mark this match as completed without a winner?')) {
      try {
        await db.bouts.updateBoutState(bout.id, { status: 'Completed' });
        loadData();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const startMatch = async (bout: Bout) => {
    if (!canModify) return;
    try {
      await db.bouts.updateBoutState(bout.id, { status: 'Running' });
      const currentCategory = categories.find(c => c.id === selectedCatId);
      if (currentCategory) {
        const targetUrl = isKataCategory(currentCategory) 
          ? `/dashboard/kata-control?boutId=${bout.id}` 
          : `/dashboard/scoreboard?boutId=${bout.id}`;
        router.push(targetUrl);
      } else {
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!mounted) return null;

  const selectedCategory = categories.find(c => c.id === selectedCatId);
  const catBouts = bouts.filter(b => b.category_id === selectedCatId).sort((a, b) => a.bout_no - b.bout_no);
  
  // Calculate Stats
  const totalMatches = catBouts.length;
  const completedMatches = catBouts.filter(b => b.status === 'Completed' || b.status === 'Walkover').length;
  const remainingMatches = totalMatches - completedMatches;
  
  const uniqueTatamis = Array.from(new Set(catBouts.map(b => b.tatami).filter(Boolean)));
  const tatamiDisplay = uniqueTatamis.length > 0 ? uniqueTatamis.join(', ') : 'Not Assigned';
  
  const competitionType = selectedCategory 
    ? (isKataCategory(selectedCategory) ? 'Kata' : 'Kumite') 
    : 'Unknown';

  const currentRunningBouts = catBouts.filter(b => b.status === 'Running');
  const currentRound = currentRunningBouts.length > 0 
    ? `Round ${Math.min(...currentRunningBouts.map(b => b.round_no))}` 
    : (remainingMatches > 0 
        ? `Round ${Math.min(...catBouts.filter(b => b.status !== 'Completed' && b.status !== 'Walkover').map(b => b.round_no))}` 
        : 'Completed');

  // Group bouts by round for navigation
  const boutsByRound: Record<number, Bout[]> = {};
  catBouts.forEach(b => {
    if (!boutsByRound[b.round_no]) boutsByRound[b.round_no] = [];
    boutsByRound[b.round_no].push(b);
  });

  const getRoundName = (roundNo: number, totalRounds: number) => {
    if (totalRounds > 1 && roundNo === totalRounds) return 'Final';
    if (totalRounds > 2 && roundNo === totalRounds - 1) return 'Semi Final';
    if (totalRounds > 3 && roundNo === totalRounds - 2) return 'Quarter Final';
    return `Round ${roundNo}`;
  };

  const totalRounds = Math.max(...catBouts.map(b => b.round_no), 0);

  // KT3.0 Bracket Hub tabs definition
  const bracketTabs = [
    { id: 'overview',       label: 'Overview',        icon: <LayoutGrid className="h-3.5 w-3.5" /> },
    { id: 'matches',        label: 'Matches',         icon: <Sword className="h-3.5 w-3.5" /> },
    { id: 'results',        label: 'Results',         icon: <BarChart2 className="h-3.5 w-3.5" /> },
    { id: 'history',        label: 'History',         icon: <History className="h-3.5 w-3.5" /> },
    { id: 'administration', label: 'Administration',  icon: <Settings className="h-3.5 w-3.5" />, separator: true },
  ] as const;

  return (
    <div className="flex flex-col text-foreground w-full h-full overflow-hidden">

      {/* ── KT3.0 Page Header ─────────────────────────────────────────────── */}
      <div className="no-print border-b border-border bg-card/50 px-6 py-3 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <GitPullRequest className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-bold tracking-tight">Bracket Management Console Hub</h1>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Tournament control center for bracket execution and display broadcasting.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={loadData}
              className="px-3 py-1.5 bg-card hover:bg-secondary border border-border text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer text-foreground transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
              Refresh
            </button>
            <button
              onClick={() => setBracketActiveTab('administration')}
              className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-500 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Settings className="h-3.5 w-3.5" />
              Administration
            </button>
          </div>
        </div>
      </div>

      {/* ── KT3.0 Tab Bar ─────────────────────────────────────────────────── */}
      <div className="no-print border-b border-border bg-card/30 px-6 shrink-0">
        <div className="flex items-center gap-0 overflow-x-auto scrollbar-none -mb-px">
          {bracketTabs.map((tab, idx) => {
            const isActive = bracketActiveTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setBracketActiveTab(tab.id as any)}
                className={`
                  flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold
                  whitespace-nowrap shrink-0 border-b-2 transition-all duration-150
                  cursor-pointer select-none
                  ${'separator' in tab && tab.separator && idx > 0 ? 'ml-4 border-l border-border pl-4' : ''}
                  ${isActive
                    ? 'border-primary text-foreground'
                    : tab.id === 'administration'
                      ? 'border-transparent text-amber-500/70 hover:text-amber-500 hover:border-amber-500/50'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }
                `}
                aria-selected={isActive}
                role="tab"
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab Content ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">

      {/* ADMINISTRATION TAB */}
      {bracketActiveTab === 'administration' && (
        <div className="p-6 space-y-6">
          <div className="border border-amber-500/20 bg-amber-500/5 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Settings className="h-4 w-4 text-amber-400" />
              <span className="text-sm font-bold text-amber-400">Bracket Administration</span>
            </div>
            <p className="text-xs text-muted-foreground">Advanced bracket management. These operations may affect live competition data.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-card border border-border rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-blue-400" />
                <span className="font-bold text-sm">Bracket History</span>
              </div>
              <p className="text-xs text-muted-foreground">View bracket version history and restore previous states from snapshots.</p>
              <button
                onClick={() => setBracketActiveTab('history')}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20 text-blue-400 rounded-lg text-xs font-bold cursor-pointer transition-colors"
              >
                <History className="h-3.5 w-3.5" />
                Open Bracket History
              </button>
            </div>
            <div className="bg-card border border-border rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-purple-400" />
                <span className="font-bold text-sm">Recovery Console</span>
              </div>
              <p className="text-xs text-muted-foreground">Restore bracket snapshots or repair corrupt bracket states from the recovery console.</p>
              <div className="space-y-2 mt-4 pt-4 border-t border-border">
                <select 
                   id="recover-bracket-hub-select"
                   className="w-full bg-card border border-border rounded text-xs p-2 focus:outline-none"
                   defaultValue={selectedCatId || ''}
                >
                  <option value="" disabled>-- Select a Category --</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button
                  onClick={() => {
                    const selectEl = document.getElementById('recover-bracket-hub-select') as HTMLSelectElement;
                    const catId = selectEl.value;
                    if (!catId) return alert('Select a category');
                    setRecoveryCatId(catId);
                    setIsRecoveryOpen(true);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 text-purple-400 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Open Recovery Console
                </button>
              </div>
            </div>
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Trash2 className="h-4 w-4 text-red-400" />
                <span className="font-bold text-sm text-red-400">Flush Loaded Bracket</span>
              </div>
              <p className="text-xs text-muted-foreground">Clear all bouts for the selected category. A snapshot is automatically saved before flushing.</p>
              {canModify && (
                <div className="space-y-2 mt-4 pt-4 border-t border-red-500/20">
                  <select 
                     id="flush-bracket-hub-select"
                     className="w-full bg-card border border-border rounded text-xs p-2 focus:outline-none"
                     defaultValue={selectedCatId || ''}
                  >
                    <option value="" disabled>-- Select a Category to Flush --</option>
                    <option value="ALL" className="text-red-500 font-bold">⚠️ ALL CATEGORIES</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <button
                    onClick={async () => {
                      const selectEl = document.getElementById('flush-bracket-hub-select') as HTMLSelectElement;
                      const catId = selectEl.value;
                      if (!catId) return alert('Select a category first.');
                      
                      const isAll = catId === 'ALL';
                      const cName = isAll ? 'ALL CATEGORIES' : categories.find(c => c.id === catId)?.name;
                      
                      if (confirm(`Are you sure you want to flush ${cName}? This will CLEAR ALL RESULTS and put participants back to the beginning state.`)) {
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
                            alert(`Successfully flushed ${cName}`);
                            
                            // Re-fetch categories and bouts to force UI update
                            const newCats = await db.categories.list();
                            setCategories(newCats);
                            window.location.reload();
                         } catch (e: any) {
                            alert('Error flushing: ' + e.message);
                         }
                      }
                    }}
                    className="w-full px-3 py-2 bg-red-500/15 border border-red-500/30 hover:bg-red-500/25 text-red-400 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Flush Bracket
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Shared Filters for tournament tabs */}
      {['overview', 'matches', 'results', 'history'].includes(bracketActiveTab) && (
        <div className="px-6 pt-6 pb-2">
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={tatamiFilter}
              onChange={(e) => {
                const val = e.target.value as 'All' | 'Tatami 1' | 'Tatami 2' | 'Tatami 3';
                setTatamiFilter(val);
                const matchingCats = categories.filter(c => {
                  if (typeFilter === 'Kata' && !isKataCategory(c)) return false;
                  if (typeFilter === 'Kumite' && !isKumiteCategory(c)) return false;
                  if (val !== 'All') {
                    const hasTatamiBouts = bouts.some(b => b.category_id === c.id && b.tatami === val);
                    const isAssigned = (c as any).assigned_tatami === val;
                    if (!hasTatamiBouts && !isAssigned) return false;
                  }
                  return true;
                });
                if (matchingCats.length > 0) {
                  setSelectedCatId(matchingCats[0].id);
                }
              }}
              className="px-3 py-2 bg-secondary border border-border rounded-lg text-xs font-semibold text-foreground focus:outline-none"
            >
              <option value="All">All Rings</option>
              <option value="Tatami 1">Tatami 1</option>
              <option value="Tatami 2">Tatami 2</option>
              <option value="Tatami 3">Tatami 3</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => {
                const newFilter = e.target.value as 'All' | 'Kata' | 'Kumite';
                setTypeFilter(newFilter);
                
                const newFilteredCats = categories.filter(c => {
                  if (newFilter === 'Kata') return isKataCategory(c);
                  if (newFilter === 'Kumite') return isKumiteCategory(c);
                  if (tatamiFilter !== 'All') {
                    const hasTatamiBouts = bouts.some(b => b.category_id === c.id && b.tatami === tatamiFilter);
                    const isAssigned = (c as any).assigned_tatami === tatamiFilter;
                    if (!hasTatamiBouts && !isAssigned) return false;
                  }
                  return true;
                });
                if (newFilteredCats.length > 0 && !newFilteredCats.find(c => c.id === selectedCatId)) {
                  setSelectedCatId(newFilteredCats[0].id);
                }
              }}
              className="px-3 py-2 bg-secondary border border-border rounded-lg text-xs font-semibold text-foreground focus:outline-none"
            >
              <option value="All">All Disciplines</option>
              <option value="Kata">Kata</option>
              <option value="Kumite">Kumite</option>
            </select>
            <select 
              value={selectedCatId}
              onChange={(e) => setSelectedCatId(e.target.value)}
              className="px-3 py-2 bg-secondary border border-border rounded-lg text-xs font-semibold text-foreground focus:outline-none max-w-[280px] truncate"
            >
              {categories.filter(c => {
                if (typeFilter === 'Kata' && !isKataCategory(c)) return false;
                if (typeFilter === 'Kumite' && !isKumiteCategory(c)) return false;
                if (tatamiFilter !== 'All') {
                  const hasTatamiBouts = bouts.some(b => b.category_id === c.id && b.tatami === tatamiFilter);
                  const isAssigned = (c as any).assigned_tatami === tatamiFilter;
                  if (!hasTatamiBouts && !isAssigned) return false;
                }
                return true;
              }).map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              onClick={loadData}
              disabled={loading}
              className="p-2 hover:bg-secondary border border-border text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer flex items-center justify-center"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      )}

      {/* RESULTS — placeholder tab */}
      {bracketActiveTab === 'results' && (
        <div className="p-6">
          <div className="text-center py-16 border border-dashed border-border rounded-xl bg-card">
            <ClipboardList className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-semibold text-foreground mb-1 capitalize">{bracketActiveTab}</p>
            <p className="text-xs text-muted-foreground mb-4">This view is coming in a future KT3.0 phase.</p>
          </div>
        </div>
      )}

      {/* HISTORY TAB */}
      {bracketActiveTab === 'history' && (
        <div className="p-6 space-y-6 flex flex-col">
          {selectedCategory ? (
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <History className="h-5 w-5 text-blue-400" />
                <h3 className="font-bold">Bracket Recovery History</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Whenever a bracket is locked or generated, a snapshot is saved here. You can restore previous versions if needed.
              </p>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-secondary/30">
                    <tr>
                      <th className="p-3 font-semibold text-muted-foreground">Version</th>
                      <th className="p-3 font-semibold text-muted-foreground">Date</th>
                      <th className="p-3 font-semibold text-muted-foreground">Reason</th>
                      <th className="p-3 font-semibold text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {versions.length > 0 ? (
                      versions.map(version => (
                        <tr key={version.versionId} className="hover:bg-secondary/10">
                          <td className="p-3 font-mono">v{version.versionNumber}</td>
                          <td className="p-3">{new Date(version.createdAt).toLocaleString()}</td>
                          <td className="p-3">
                            <span className="font-medium">{version.reason}</span>
                            {version.changeSummary && <div className="text-xs text-muted-foreground mt-0.5">{version.changeSummary}</div>}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${version.status === 'VALID' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                              {version.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-muted-foreground italic">
                          No history found for this category. Lock and save the bracket to create a recovery point.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center border border-border bg-card rounded-xl p-12 text-center mt-6">
              <History className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <h2 className="text-lg font-bold">No Category Selected</h2>
            </div>
          )}
        </div>
      )}

      {/* OVERVIEW TAB */}
      {bracketActiveTab === 'overview' && (
        <div className="p-6 space-y-6 flex flex-col">
          {selectedCategory && catBouts.length > 0 ? (
            <>
              {/* Dashboard Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 shrink-0">
                <div className="col-span-2 bg-card border border-border p-4 rounded-xl flex flex-col justify-center">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Tournament Name</span>
                  <span className="text-sm font-bold truncate">KarateTech Event</span>
                </div>
                <div className="col-span-2 bg-card border border-border p-4 rounded-xl flex flex-col justify-center">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Category</span>
                  <span className="text-sm font-bold truncate text-primary">{selectedCategory.name}</span>
                </div>
                <div className="bg-card border border-border p-4 rounded-xl flex flex-col justify-center items-center">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Tatami</span>
                  <span className="text-sm font-bold">{tatamiDisplay}</span>
                </div>
                <div className="bg-card border border-border p-4 rounded-xl flex flex-col justify-center items-center">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Type</span>
                  <span className="text-sm font-bold">{competitionType}</span>
                </div>
                <div className="bg-card border border-border p-4 rounded-xl flex flex-col justify-center items-center">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Current Round</span>
                  <span className="text-sm font-bold">{currentRound}</span>
                </div>
                <div className="bg-card border border-border p-4 rounded-xl flex flex-col justify-center items-center">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Matches</span>
                  <div className="flex gap-2 text-xs font-bold">
                    <span className="text-emerald-500" title="Completed">{completedMatches}</span>
                    <span className="text-muted-foreground">/</span>
                    <span className="text-amber-500" title="Remaining">{remainingMatches}</span>
                    <span className="text-muted-foreground">/</span>
                    <span className="text-foreground" title="Total">{totalMatches}</span>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="bg-secondary/30 border border-border p-4 rounded-xl flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <MonitorPlay className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-sm">Live Broadcast Controls</span>
                </div>
                <Link
                  href={`/display/brackets?categoryId=${selectedCategory.id}`}
                  target="_blank"
                  className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold rounded-lg shadow-md cursor-pointer transition flex items-center gap-2"
                >
                  <Monitor className="h-4 w-4" />
                  <span>Display Current Bracket</span>
                </Link>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center border border-border bg-card rounded-xl p-12 text-center mt-6">
              <MonitorPlay className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <h2 className="text-lg font-bold">No Brackets Found</h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-md">
                Please ensure you have generated a draw for this category first. If you have not done so, head to the Draws section to generate brackets.
              </p>
            </div>
          )}
        </div>
      )}

      {/* MATCHES TAB */}
      {bracketActiveTab === 'matches' && (
        <div className="p-6 space-y-6 flex flex-col">
          {selectedCategory && catBouts.length > 0 ? (
            <div className="flex-1 overflow-y-auto space-y-8 pb-10">
              {Object.keys(boutsByRound).map(Number).sort((a, b) => a - b).map(roundNo => {
                const roundBouts = boutsByRound[roundNo];
                
                // Filter out all bye matches
                const visibleBouts = roundBouts.filter(b => b.participant_a_id && b.participant_b_id);

                if (visibleBouts.length === 0) return null;

                return (
                  <div key={roundNo} className="space-y-3">
                    <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2 text-muted-foreground">
                      <Trophy className="h-4 w-4" />
                      {getRoundName(roundNo, totalRounds)}
                    </h3>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                      {visibleBouts.map(b => {
                        const compA = participants.find(p => p.id === b.participant_a_id);
                        const compB = participants.find(p => p.id === b.participant_b_id);
                        const isBye = !b.participant_a_id || !b.participant_b_id;
                        const winner = b.winner_id ? participants.find(p => p.id === b.winner_id) : null;
                        
                        return (
                          <div key={b.id} className={`bg-card border ${b.status === 'Running' ? 'border-primary ring-1 ring-primary' : 'border-border'} rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-4 shadow-sm hover:border-primary/50 transition-colors`}>
                            
                            {/* Bout Identity */}
                            <div className="flex items-center gap-3 md:w-32 shrink-0">
                              <div className="h-10 w-10 bg-secondary rounded-lg flex flex-col items-center justify-center font-mono font-bold text-xs shrink-0">
                                <span className="text-[9px] text-muted-foreground uppercase leading-none mb-0.5">Bout</span>
                                <span className="leading-none">{b.bout_no}</span>
                              </div>
                              <div className="flex flex-col text-xs font-semibold text-muted-foreground">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] w-fit ${
                                  b.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500' :
                                  b.status === 'Running' ? 'bg-primary/20 text-primary animate-pulse' :
                                  'bg-secondary text-muted-foreground'
                                }`}>
                                  {b.status}
                                </span>
                                <span className="mt-1 ml-1">{b.tatami || 'No Tatami'}</span>
                              </div>
                            </div>

                            {/* Competitors vs Score */}
                            <div className="flex-1 flex flex-col gap-1 min-w-0">
                              {/* AKA */}
                              <div className={`flex justify-between items-center px-3 py-1.5 rounded-md ${b.winner_id === b.participant_a_id ? 'bg-red-500/10 font-bold text-red-500' : ''}`}>
                                <div className="flex items-center gap-2 truncate">
                                  <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
                                  <span className={`truncate text-sm ${!compA ? 'italic text-muted-foreground' : ''}`}>
                                    {compA ? compA.full_name : 'TBD'}
                                  </span>
                                </div>
                                <span className="font-mono font-bold ml-2">{b.score_a}</span>
                              </div>
                              {/* AO */}
                              <div className={`flex justify-between items-center px-3 py-1.5 rounded-md ${b.winner_id === b.participant_b_id ? 'bg-blue-500/10 font-bold text-blue-500' : ''}`}>
                                <div className="flex items-center gap-2 truncate">
                                  <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
                                  <span className={`truncate text-sm ${!compB ? 'italic text-muted-foreground' : ''}`}>
                                    {compB ? compB.full_name : 'TBD'}
                                  </span>
                                </div>
                                <span className="font-mono font-bold ml-2">{b.score_b}</span>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex md:flex-col gap-2 shrink-0 border-t md:border-t-0 md:border-l border-border pt-3 md:pt-0 md:pl-4">
                              {b.status === 'Scheduled' && !isBye && (
                                <button 
                                  onClick={() => startMatch(b)}
                                  className="flex-1 md:w-full py-1.5 px-3 bg-primary/10 hover:bg-primary/20 text-primary rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition"
                                >
                                  <Play className="h-3 w-3" /> Start
                                </button>
                              )}
                              {b.status === 'Running' && (
                                <button 
                                  onClick={() => markCompleted(b)}
                                  className="flex-1 md:w-full py-1.5 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition"
                                >
                                  <CheckCircle2 className="h-3 w-3" /> Complete
                                </button>
                              )}
                              {!isBye && canModify && (
                                <Link
                                  href={isKataCategory(selectedCategory) ? `/dashboard/kata-control?boutId=${b.id}` : `/dashboard/scoreboard?boutId=${b.id}`}
                                  className="flex-1 md:w-full py-1.5 px-3 bg-secondary hover:bg-secondary/80 text-foreground border border-border rounded-md text-[10px] font-bold flex items-center justify-center gap-1.5 transition whitespace-nowrap"
                                >
                                  <LayoutGrid className="h-3 w-3" /> Console
                                </Link>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center border border-border bg-card rounded-xl p-12 text-center mt-6">
              <MonitorPlay className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <h2 className="text-lg font-bold">No Brackets Found</h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-md">
                Please ensure you have generated a draw for this category first. If you have not done so, head to the Draws section to generate brackets.
              </p>
            </div>
          )}
        </div>
      )}

      </div>

      <RecoveryConsoleModal
        isOpen={isRecoveryOpen}
        onClose={() => {
           setIsRecoveryOpen(false);
           setRecoveryCatId('');
        }}
        categories={categories}
        initialCategoryId={recoveryCatId}
      />

    </div>
  );
}
