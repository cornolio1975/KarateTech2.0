'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { db } from '@/db/dbClient';
import { Bout, Participant, Category, Club, isKataCategory } from '@/db/types';
import { Zap, Play, ShieldAlert, RefreshCw, MapPin, Tv, RotateCcw, Maximize2, Minimize2 } from 'lucide-react';
import { useTournament } from '@/context/TournamentContext';

export default function KataScoreboardHubPage() {
  const { tournamentName } = useTournament();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bouts, setBouts] = useState<Bout[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Filters
  const [selectedCatId, setSelectedCatId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedBoutIdFilter, setSelectedBoutIdFilter] = useState<string>('ALL');

  // Spectator Modal State
  const [showSpectatorModal, setShowSpectatorModal] = useState(false);
  const [spectatorBoutId, setSpectatorBoutId] = useState<string | null>(null);
  const spectatorWindowRef = React.useRef<Window | null>(null);
  const broadcastChannelRef = React.useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      broadcastChannelRef.current = new BroadcastChannel('wkf-scoreboard-sync');
    }
    return () => {
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
      }
    };
  }, []);

  const handleOpenSpectator = (boutId?: string) => {
    setSpectatorBoutId(boutId || null);
    setShowSpectatorModal(true);
  };

  useEffect(() => {
    setMounted(true);
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [bList, pList, catList, clList] = await Promise.all([
        db.bouts.list(),
        db.participants.list(),
        db.categories.list(),
        db.clubs.list(),
      ]);
      setBouts(bList);
      setParticipants(pList);
      setCategories(catList);
      setClubs(clList);
    } catch (err) {
      console.error('Error loading bouts data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRematch = async (bout: Bout) => {
    const confirmRematch = window.confirm(
      'Are you sure you want to reset this match and start a rematch? This will clear all scores, penalties, and history, and remove the winner placement in the bracket.'
    );
    if (!confirmRematch) return;
    
    try {
      setLoading(true);
      await db.bouts.updateBoutState(bout.id, {
        kata_a: undefined,
        kata_b: undefined,
        judge_scores_a: [],
        judge_scores_b: [],
        total_score_a: 0,
        total_score_b: 0,
        score_a: 0,
        score_b: 0,
        winner_id: null as any,
        status: 'Running',
      });
      await loadData();
    } catch (err) {
      console.error('Failed to rematch bout', err);
      alert('Failed to reset match');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  // Kata-only categories
  const kataCategories = categories.filter(isKataCategory);
  const kataCatIds = new Set(kataCategories.map(c => c.id));

  // Available bouts for 2nd filter (Match / Bout)
  const availableBoutOptions = bouts.filter(b => {
    if (b.status === 'Walkover') return false;
    if (!kataCatIds.has(b.category_id)) return false;
    if (selectedCatId !== 'ALL' && b.category_id !== selectedCatId) return false;
    return true;
  });

  // Filter bouts for Kata categories strictly
  const filteredBouts = bouts.filter(b => {
    if (b.status === 'Walkover') return false;
    if (!kataCatIds.has(b.category_id)) return false;
    const matchesCat = selectedCatId === 'ALL' || b.category_id === selectedCatId;
    const matchesStatus = selectedStatus === 'ALL' || b.status === selectedStatus;
    const matchesBout = selectedBoutIdFilter === 'ALL' || b.id === selectedBoutIdFilter;
    return matchesCat && matchesStatus && matchesBout;
  });

  return (
    <div className="min-h-screen bg-[#07070a] text-white p-6 pb-12">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Zap className="h-5 w-5 text-yellow-400 animate-pulse" />
              <span className="text-xs font-black uppercase tracking-widest text-yellow-400">
                WKF KATA SCOREBOARD MODULE
              </span>
            </div>
            <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
              Match Console Hub (Kata)
            </h1>
            <p className="text-gray-400 text-sm mt-1">{tournamentName || 'Kelab Karate Do Senshi Goju-Ryu Championship'}</p>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={loadData}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/20 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Sync Matches
            </button>
            <button
              onClick={toggleFullscreen}
              className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-xs font-bold transition cursor-pointer ${
                isFullscreen
                  ? 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                  : 'bg-white/5 text-white/80 border-white/10 hover:bg-white/10'
              }`}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
            </button>
            <button
              onClick={() => handleOpenSpectator()}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-400/10 hover:bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 hover:border-yellow-400/50 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <Tv className="h-4 w-4" />
              Open Spectator View
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Panel */}
        <div className="lg:col-span-1 bg-white/[0.02] border border-white/5 rounded-2xl p-6 backdrop-blur-md h-fit">
          <h2 className="text-base font-black tracking-wider uppercase mb-6 text-gray-300">
            Kata Filters
          </h2>

          <div className="space-y-4">
            {/* 1st Filter: Kata Category */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1.5">Kata Category</label>
              <select
                value={selectedCatId}
                onChange={e => {
                  setSelectedCatId(e.target.value);
                  setSelectedBoutIdFilter('ALL');
                  if (window.innerWidth < 1024) {
                    setTimeout(() => {
                      document.getElementById('bouts-list-panel')?.scrollIntoView({ behavior: 'smooth' });
                    }, 50);
                  }
                }}
                className="w-full bg-[#101015] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-yellow-400 transition cursor-pointer"
              >
                <option value="ALL">All Kata Categories ({kataCategories.length})</option>
                {kataCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* 2nd Filter: Match / Bout */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1.5">Match / Bout</label>
              <select
                value={selectedBoutIdFilter}
                onChange={e => setSelectedBoutIdFilter(e.target.value)}
                className="w-full bg-[#101015] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-yellow-400 transition cursor-pointer"
              >
                <option value="ALL">All Matches / Bouts ({availableBoutOptions.length})</option>
                {availableBoutOptions.map(b => {
                  const pA = participants.find(p => p.id === b.participant_a_id);
                  const pB = participants.find(p => p.id === b.participant_b_id);
                  const akaName = pA ? pA.full_name : 'TBD';
                  const aoName = pB ? pB.full_name : 'TBD';
                  return (
                    <option key={b.id} value={b.id}>
                      Bout #{b.bout_no || b.id.slice(0, 4)}: {akaName} vs {aoName}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* 3rd Filter: Status */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1.5">Status</label>
              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                className="w-full bg-[#101015] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-yellow-400 transition cursor-pointer"
              >
                <option value="ALL">All States</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Running">Running / Live</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bouts List */}
        <div id="bouts-list-panel" className="lg:col-span-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 bg-white/[0.01] border border-white/5 rounded-2xl">
              <RefreshCw className="h-8 w-8 text-yellow-400 animate-spin mb-4" />
              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Loading brackets...</p>
            </div>
          ) : filteredBouts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 bg-white/[0.01] border border-white/5 rounded-2xl">
              <ShieldAlert className="h-8 w-8 text-gray-500 mb-4" />
              <p className="text-gray-400 text-sm">No matches found matching the filter criteria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredBouts.map(bout => {
                const competitorA = participants.find(p => p.id === bout.participant_a_id);
                const competitorB = participants.find(p => p.id === bout.participant_b_id);
                const category = categories.find(c => c.id === bout.category_id);

                const getStatusColor = (status: string) => {
                  switch (status) {
                    case 'Running': return 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20';
                    case 'Completed': return 'bg-green-400/10 text-green-400 border-green-400/20';
                    default: return 'bg-gray-400/10 text-gray-400 border-white/5';
                  }
                };

                return (
                  <div
                    key={bout.id}
                    className="relative bg-white/[0.02] border border-white/5 hover:border-white/10 rounded-2xl p-5 backdrop-blur-sm transition flex flex-col justify-between"
                  >
                    <div>
                      {/* Badge / Info */}
                      <div className="flex items-center justify-between mb-3">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${getStatusColor(bout.status)}`}>
                          {bout.status}
                        </span>
                        <div className="flex items-center gap-3 text-white/40 text-[10px] font-bold">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {bout.tatami || 'Tatami 1'}
                          </span>
                          <span>Bout #{bout.bout_no}</span>
                          <span>Round {bout.round_no}</span>
                        </div>
                      </div>

                      {/* Division Name */}
                      <p className="text-white/60 text-xs font-bold mb-4 line-clamp-1">
                        {category?.name || 'Kata Division'}
                      </p>

                      {/* Competitor Matchup */}
                      <div className="space-y-3 bg-[#0d0d12]/80 border border-white/5 rounded-xl p-3 mb-5">
                        {/* Competitor A - AKA (Red) */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-600 block shrink-0" />
                            <span className="text-xs font-black truncate max-w-[150px]">
                              {competitorA?.full_name || 'TBD (Winner of previous)'}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-red-500 font-mono pr-1">
                            {bout.score_a || 0} pts
                          </span>
                        </div>

                        {/* Competitor B - AO (Blue) */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 block shrink-0" />
                            <span className="text-xs font-black truncate max-w-[150px]">
                              {competitorB?.full_name || 'TBD (Winner of previous)'}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-blue-400 font-mono pr-1">
                            {bout.score_b || 0} pts
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-auto pt-2 border-t border-white/5">
                      <Link
                        href={`/dashboard/kata-control?boutId=${bout.id}`}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
                      >
                        <Play className="h-3.5 w-3.5 fill-black" />
                        {bout.status === 'Completed' ? 'View Results' : 'Control Panel'}
                      </Link>
                      
                      {bout.status === 'Completed' && (
                        <button
                          onClick={() => handleRematch(bout)}
                          className="flex items-center justify-center p-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-500 hover:text-white rounded-xl transition cursor-pointer"
                          title="Rematch / Reset Bout"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      )}

                      <button
                        onClick={() => handleOpenSpectator(bout.id)}
                        className="flex items-center justify-center p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white rounded-xl transition cursor-pointer"
                        title="Open spectator display in new window"
                      >
                        <Tv className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showSpectatorModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#101015] border border-white/10 rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-black text-white mb-2">Open Spectator Display</h3>
            <p className="text-gray-400 text-sm mb-6">How would you like to open the spectator view?</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  const url = spectatorBoutId ? `/display?boutId=${spectatorBoutId}` : '/display';
                  spectatorWindowRef.current = window.open(url, '_blank');
                  setShowSpectatorModal(false);
                }}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition"
              >
                Open in New Tab
              </button>
              <button
                onClick={() => {
                  const url = spectatorBoutId ? `/display?boutId=${spectatorBoutId}` : '/display';
                  spectatorWindowRef.current = window.open(url, '_blank', 'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no,scrollbars=no,resizable=yes');
                  setShowSpectatorModal(false);
                }}
                className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition"
              >
                Open in New Window
              </button>
              <button
                onClick={() => {
                  if (spectatorWindowRef.current) {
                    spectatorWindowRef.current.close();
                    spectatorWindowRef.current = null;
                  }
                  if (broadcastChannelRef.current) {
                    broadcastChannelRef.current.postMessage({ type: 'CLOSE_DISPLAY' });
                  }
                  setShowSpectatorModal(false);
                }}
                className="w-full py-3 bg-red-600/20 hover:bg-red-600/40 text-red-400 font-bold rounded-xl border border-red-500/30 transition"
              >
                Close Existing Display
              </button>
              <button
                onClick={() => setShowSpectatorModal(false)}
                className="w-full py-3 bg-white/5 hover:bg-white/10 text-gray-300 font-bold rounded-xl transition mt-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
