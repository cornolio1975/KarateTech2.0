'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/db/dbClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bout, Participant, Category, isKataCategory, isKumiteCategory } from '@/db/types';
import { 
  MonitorPlay, Sword, Play, CheckCircle2, ChevronRight, RefreshCw, Trophy, LayoutGrid, Monitor
} from 'lucide-react';

import { useTournament } from '@/context/TournamentContext';

export default function BracketHubPage() {
  const { canModify, tatamiId, takeoverTatami, userEmail } = useTournament();
  const effectiveTatami = takeoverTatami || tatamiId || (userEmail === 'tatami_2@spsportdatasolution.org' ? 2 : userEmail === 'tatami_1@spsportdatasolution.org' ? 1 : null);
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bouts, setBouts] = useState<Bout[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  const [selectedCatId, setSelectedCatId] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'All' | 'Kata' | 'Kumite'>('All');
  const [tatamiFilter, setTatamiFilter] = useState<'All' | 'Tatami 1' | 'Tatami 2' | 'Tatami 3'>(
    effectiveTatami === 2 ? 'Tatami 2' : effectiveTatami === 1 ? 'Tatami 1' : 'All'
  );

  useEffect(() => {
    setMounted(true);
    loadData();
  }, []);

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

  return (
    <div className="p-6 space-y-6 text-foreground w-full min-h-[calc(100vh-64px)] flex flex-col overflow-y-auto">
      
      {/* Title */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bracket Management Console Hub</h1>
          <p className="text-sm text-muted-foreground">Tournament control center for bracket execution and display broadcasting.</p>
        </div>
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
            <button
              onClick={() => window.open(`/display/brackets?categoryId=${selectedCategory.id}`, '_blank')}
              className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold rounded-lg shadow-md cursor-pointer transition flex items-center gap-2"
            >
              <Monitor className="h-4 w-4" />
              <span>Display Current Bracket</span>
            </button>
          </div>

          {/* Bout Navigation List */}
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
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center border border-border bg-card rounded-xl p-12 text-center">
          <MonitorPlay className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
          <h2 className="text-lg font-bold">No Brackets Found</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-md">
            Please ensure you have generated a draw for this category first. If you haven't done so, head to the Draws section to generate brackets.
          </p>
        </div>
      )}
    </div>
  );
}
