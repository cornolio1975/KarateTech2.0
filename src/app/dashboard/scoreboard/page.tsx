'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { db } from '@/db/dbClient';
import { Bout, Participant, Category, Club, isKumiteCategory, isKataCategory } from '@/db/types';
import { Zap, Play, Check, ShieldAlert, Award, ArrowRight, RefreshCw, Calendar, MapPin, Tv, RotateCcw } from 'lucide-react';
import { useTournament } from '@/context/TournamentContext';

export default function ScoreboardDashboardPage() {
  const { tournamentName } = useTournament();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bouts, setBouts] = useState<Bout[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);

  // Filters
  const [selectedCatId, setSelectedCatId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedBoutIdFilter, setSelectedBoutIdFilter] = useState<string>('ALL');

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

      // Auto-load chosen category from URL parameter
      const urlParams = new URLSearchParams(window.location.search);
      const boutId = urlParams.get('boutId');
      if (boutId) {
        const selectedBout = bList.find(b => b.id === boutId);
        if (selectedBout) {
          setSelectedCatId(selectedBout.category_id);
          // Do not filter by specific boutId so we display the entire category sequentially
        }
      }
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
      await db.bouts.resetBoutResult(bout.id, bout.timer_seconds || 180);
      await loadData();
    } catch (err) {
      console.error('Failed to rematch bout', err);
      alert('Failed to reset match');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  // Kumite-only categories
  const kumiteCategories = categories.filter(isKumiteCategory);
  const kumiteCatIds = new Set(kumiteCategories.map(c => c.id));

  // Available bouts for 2nd filter (Match / Bout)
  const availableBoutOptions = bouts.filter(b => {
    if (b.status === 'Walkover') return false;
    if (!kumiteCatIds.has(b.category_id)) return false;
    if (selectedCatId !== 'ALL' && b.category_id !== selectedCatId) return false;
    return true;
  });

  // Filter bouts for Kumite categories strictly and sort sequentially
  const filteredBouts = bouts.filter(b => {
    if (b.status === 'Walkover') return false;
    if (!kumiteCatIds.has(b.category_id)) return false;
    const matchesCat = selectedCatId === 'ALL' || b.category_id === selectedCatId;
    const matchesStatus = selectedStatus === 'ALL' || b.status === selectedStatus;
    const matchesBout = selectedBoutIdFilter === 'ALL' || b.id === selectedBoutIdFilter;
    return matchesCat && matchesStatus && matchesBout;
  }).sort((a, b) => {
    if (a.round_no !== b.round_no) return a.round_no - b.round_no;
    return a.bout_no - b.bout_no;
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
                WKF KUMITE SCOREBOARD MODULE
              </span>
            </div>
            <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
              Match Console Hub (Kumite)
            </h1>
            <p className="text-gray-400 text-sm mt-1">{tournamentName || 'Kelab Karate Do Senshi Goju-Ryu Championship'}</p>
          </div>
          
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/20 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Sync Matches
          </button>
          <button
            onClick={() => window.open('/display', '_blank', 'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no,scrollbars=no,resizable=yes')}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-400/10 hover:bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 hover:border-yellow-400/50 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            <Tv className="h-4 w-4" />
            Open Spectator View
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Panel */}
        <div className="lg:col-span-1 bg-white/[0.02] border border-white/5 rounded-2xl p-6 backdrop-blur-md h-fit">
          <h2 className="text-base font-black tracking-wider uppercase mb-6 text-gray-300">
            Kumite Filters
          </h2>

          <div className="space-y-4">
            {/* 1st Filter: Kumite Category */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1.5">Kumite Category</label>
              <select
                value={selectedCatId}
                onChange={e => {
                  setSelectedCatId(e.target.value);
                  setSelectedBoutIdFilter('ALL');
                  if (window.innerWidth < 1024) {
                    setTimeout(() => {
                      document.getElementById('kumite-bouts-list-panel')?.scrollIntoView({ behavior: 'smooth' });
                    }, 50);
                  }
                }}
                className="w-full bg-[#101015] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-yellow-400 transition cursor-pointer"
              >
                <option value="ALL">All Kumite Categories ({kumiteCategories.length})</option>
                {kumiteCategories.map(cat => (
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
                <option value="Walkover">Walkover</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bouts List */}
        <div id="kumite-bouts-list-panel" className="lg:col-span-3">
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
                    case 'Walkover': return 'bg-purple-400/10 text-purple-400 border-purple-400/20';
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
                        {category?.name || 'Kumite Open division'}
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
                            {bout.score_a} pts
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
                            {bout.score_b} pts
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-auto pt-2 border-t border-white/5">
                      <Link
                        href={isKataCategory(category) ? `/dashboard/kata-control?boutId=${bout.id}` : `/dashboard/control?boutId=${bout.id}`}
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

                      <Link
                        href={`/display?boutId=${bout.id}`}
                        target="_blank"
                        className="flex items-center justify-center p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white rounded-xl transition cursor-pointer"
                        title="Open spectator display in new window"
                      >
                        <Tv className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
