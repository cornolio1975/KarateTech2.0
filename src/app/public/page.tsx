'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTournament } from '@/context/TournamentContext';
import { db, basePath } from '@/db/dbClient';
import { Bout, Participant, Category, Club, Country } from '@/db/types';
import { 
  Trophy, Tv, Calendar, Flame, RefreshCw, X, ShieldAlert, Award, 
  MapPin, Clock, Search, ExternalLink, ChevronRight, Play, Check, Home
} from 'lucide-react';
import { SportdataBracket } from '@/components/SportdataBracket';


export default function PublicSpectatorHub() {
  const { tournamentName, liveStreamUrl, logoUrl } = useTournament();
  
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [bouts, setBouts] = useState<Bout[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  
  // Tabs: 'STREAM' | 'BRACKETS' | 'SCHEDULE' | 'STANDINGS'
  const [activeTab, setActiveTab] = useState<'STREAM' | 'BRACKETS' | 'SCHEDULE' | 'STANDINGS'>('STREAM');
  
  // Brackets selection
  const [selectedCatId, setSelectedCatId] = useState<string>('');
  const [isRoundRobinDraw, setIsRoundRobinDraw] = useState<boolean>(false);

  // Detailed Match Modal
  const [selectedBoutDetails, setSelectedBoutDetails] = useState<Bout | null>(null);

  // Polling indicator
  const [lastSyncTime, setLastSyncTime] = useState<string>('');

  useEffect(() => {
    setMounted(true);
    loadData();
    
    // Polling every 3 seconds for live scoring updates
    const pollInterval = setInterval(() => {
      syncLatestBouts();
    }, 3000);

    return () => clearInterval(pollInterval);
  }, []);

  useEffect(() => {
    if (categories.length > 0 && !selectedCatId) {
      setSelectedCatId(categories[0].id);
    }
  }, [categories]);

  // Sync isRoundRobinDraw when changing category (detect from existing bouts)
  useEffect(() => {
    const catBouts = bouts.filter(b => b.category_id === selectedCatId);
    if (catBouts.length > 0) {
      const allRound1 = catBouts.every(b => b.round_no === 1);
      const hasMultiRound = catBouts.some(b => b.round_no > 1);
      setIsRoundRobinDraw(allRound1 && !hasMultiRound && catBouts.length > 1);
    } else {
      setIsRoundRobinDraw(false);
    }
  }, [selectedCatId, bouts]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [pList, catList, bList, clList, coList] = await Promise.all([
        db.participants.list(),
        db.categories.list(),
        db.bouts.list(),
        db.clubs.list(),
        db.countries.list()
      ]);
      setParticipants(pList);
      setCategories(catList);
      setBouts(bList);
      setClubs(clList);
      setCountries(coList);
      
      const now = new Date();
      setLastSyncTime(now.toLocaleTimeString());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const syncLatestBouts = async () => {
    try {
      const [bList, pList] = await Promise.all([
        db.bouts.list(),
        db.participants.list()
      ]);
      setBouts(bList);
      setParticipants(pList);
      const now = new Date();
      setLastSyncTime(now.toLocaleTimeString());
    } catch (e) {
      console.error('Polling failed:', e);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Running': return 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse';
      case 'Completed': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Walkover': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  // Medal Standings Computation
  const getMedalStandings = () => {
    const tally: { [clubId: string]: { name: string; gold: number; silver: number; bronze: number } } = {};
    clubs.forEach(c => { tally[c.id] = { name: c.name, gold: 0, silver: 0, bronze: 0 }; });
    tally['Independent'] = { name: 'Independent Athletes', gold: 0, silver: 0, bronze: 0 };

    categories.forEach(cat => {
      const catBouts = bouts.filter(b => b.category_id === cat.id);
      if (catBouts.length === 0) return;

      const allRound1 = catBouts.every(b => b.round_no === 1);
      const isRR = allRound1 && catBouts.length > 1;

      if (isRR) {
        const winsMap: { [id: string]: number } = {};
        const scoreMap: { [id: string]: number } = {};
        catBouts.forEach(b => {
          if (b.winner_id) winsMap[b.winner_id] = (winsMap[b.winner_id] || 0) + 1;
          if (b.participant_a_id) scoreMap[b.participant_a_id] = (scoreMap[b.participant_a_id] || 0) + b.score_a;
          if (b.participant_b_id) scoreMap[b.participant_b_id] = (scoreMap[b.participant_b_id] || 0) + b.score_b;
        });

        const sorted = (Array.from(new Set(catBouts.flatMap(b => [b.participant_a_id, b.participant_b_id]).filter(Boolean))) as string[])
          .sort((a, b) => ((winsMap[b] || 0) - (winsMap[a] || 0)) || ((scoreMap[b] || 0) - (scoreMap[a] || 0)));

        if (sorted[0]) {
          const p = participants.find(part => part.id === sorted[0]);
          const key = p?.club_id || 'Independent';
          if (tally[key]) tally[key].gold++;
        }
        if (sorted[1]) {
          const p = participants.find(part => part.id === sorted[1]);
          const key = p?.club_id || 'Independent';
          if (tally[key]) tally[key].silver++;
        }
        if (sorted[2]) {
          const p = participants.find(part => part.id === sorted[2]);
          const key = p?.club_id || 'Independent';
          if (tally[key]) tally[key].bronze++;
        }
      } else {
        const rounds = catBouts.map(b => b.round_no).filter(r => r !== 99);
        const maxRound = Math.max(...rounds, 0);
        const finalBout = catBouts.find(b => b.round_no === maxRound);

        if (finalBout && finalBout.status === 'Completed' && finalBout.winner_id) {
          const goldWinner = participants.find(p => p.id === finalBout.winner_id);
          const goldKey = goldWinner?.club_id || 'Independent';
          if (tally[goldKey]) tally[goldKey].gold++;

          const silverId = finalBout.winner_id === finalBout.participant_a_id ? finalBout.participant_b_id : finalBout.participant_a_id;
          if (silverId) {
            const silverWinner = participants.find(p => p.id === silverId);
            const silverKey = silverWinner?.club_id || 'Independent';
            if (tally[silverKey]) tally[silverKey].silver++;
          }
        }

        const bronzeBout = catBouts.find(b => b.round_no === 99);
        if (bronzeBout && bronzeBout.status === 'Completed' && bronzeBout.winner_id) {
          const bronzeWinner = participants.find(p => p.id === bronzeBout.winner_id);
          const bronzeKey = bronzeWinner?.club_id || 'Independent';
          if (tally[bronzeKey]) tally[bronzeKey].bronze++;
        }

        // WKF Repechage: two bronze pools (round_no === 98). The final bout of each
        // pool has no successor bout (bout_no + 1 does not exist in the pool).
        const repechageBouts = catBouts.filter(b => b.round_no === 98);
        const repechageBoutNos = new Set(repechageBouts.map(b => b.bout_no));
        repechageBouts
          .filter(b => !repechageBoutNos.has(b.bout_no + 1))
          .forEach(b => {
            if ((b.status === 'Completed' || b.status === 'Walkover') && b.winner_id) {
              const bronzeWinner = participants.find(p => p.id === b.winner_id);
              const bronzeKey = bronzeWinner?.club_id || 'Independent';
              if (tally[bronzeKey]) tally[bronzeKey].bronze++;
            }
          });

        // No dedicated bronze bout/repechage was drawn for this bracket: both
        // semifinal losers are awarded bronze (same rule the bracket view uses).
        if (!bronzeBout && repechageBouts.length === 0) {
          const semiRound = maxRound - 1;
          const semiBouts = catBouts.filter(b => b.round_no === semiRound);
          const bronzeLoserIds = new Set<string>();
          semiBouts.forEach(sb => {
            if ((sb.status === 'Completed' || sb.status === 'Walkover') && sb.winner_id) {
              const loserId = sb.winner_id === sb.participant_a_id ? sb.participant_b_id : sb.participant_a_id;
              if (loserId) bronzeLoserIds.add(loserId);
            }
          });
          bronzeLoserIds.forEach(loserId => {
            const bronzeWinner = participants.find(p => p.id === loserId);
            const bronzeKey = bronzeWinner?.club_id || 'Independent';
            if (tally[bronzeKey]) tally[bronzeKey].bronze++;
          });
        }
      }
    });

    return Object.keys(tally)
      .map(k => ({ id: k, ...tally[k], total: tally[k].gold + tally[k].silver + tally[k].bronze }))
      .filter(t => t.total > 0)
      .sort((a, b) => b.gold - a.gold || b.silver - a.silver || b.bronze - a.bronze);
  };

  if (!mounted) return null;

  // Active bouts running
  const runningBouts = bouts.filter(b => b.status === 'Running');

  // Group bouts into rounds for single elimination tree
  const activeCategory = categories.find(c => c.id === selectedCatId);
  const currentCatBouts = bouts.filter(b => b.category_id === selectedCatId);
  const groupBoutsByRounds = () => {
    const rounds: { [key: number]: Bout[] } = {};
    currentCatBouts.forEach(b => {
      if (b.round_no === 99) return;
      if (!rounds[b.round_no]) rounds[b.round_no] = [];
      rounds[b.round_no].push(b);
    });
    Object.keys(rounds).forEach(r => rounds[Number(r)].sort((a,b) => a.bout_no - b.bout_no));
    return rounds;
  };
  const roundsData = groupBoutsByRounds();
  const bronzeMatch = currentCatBouts.find(b => b.round_no === 99);

  // Competitor row helper
  const renderCompetitorRow = (partId: string | null, score: number, isWinner: boolean, tagColor: string) => {
    if (!partId) {
      return (
        <div className="flex items-center justify-between p-2 text-xs text-gray-500 italic bg-gray-900/10">
          <span>TBD</span>
          <span>-</span>
        </div>
      );
    }
    const comp = participants.find(p => p.id === partId);
    const club = clubs.find(c => c.id === comp?.club_id);
    return (
      <div className={`flex items-center justify-between p-2 text-xs transition-colors ${
        isWinner ? 'bg-indigo-500/10 text-white font-bold' : 'text-gray-400'
      }`}>
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-1.5 h-6 rounded-full shrink-0 ${tagColor}`} />
          <span className="truncate">{comp?.full_name}</span>
        </div>
        <span className="font-mono font-bold text-sm text-white">{score}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-[#e2e8f0] flex flex-col font-sans">
      
      {/* HEADER SECTION (GLASSMORPHIC STADIUM STYLE) */}
      <header className="border-b border-gray-800 bg-[#0c1322]/80 backdrop-blur-md px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full overflow-hidden border border-white/20 bg-slate-900 shrink-0">
            <img src={logoUrl || `${basePath}/karatetech-logo.png`} alt="Logo" className="h-full w-full object-cover" />
          </div>
          <div className="flex flex-col leading-none">
            <div style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 900, fontSize: '0.95rem', lineHeight: 1, letterSpacing: '0.01em' }}>
              <span style={{ color: '#b91c2e' }}>Karate</span>
              <span style={{ color: '#38bdf8' }}>Tech</span>
            </div>
            <div style={{ height: '1.5px', background: 'linear-gradient(90deg, #b91c2e 60%, transparent 100%)', marginTop: '1.5px', marginBottom: '1.5px', borderRadius: '1px' }} />
            <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: '0.62rem', letterSpacing: '0.01em', color: '#818cf8', lineHeight: 1.15 }}>
              SP SportData Solution
            </span>
            <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 600, fontSize: '0.45rem', letterSpacing: '0.08em', color: '#64748b', lineHeight: 1.2, marginTop: '1.5px' }}>
              • Precision. • Speed. • Results. •
            </span>
          </div>
          <div className="border-l border-gray-800 pl-3 ml-1">
            <h1 className="font-black text-xs tracking-widest text-white leading-none uppercase">LIVE HUB</h1>
            <span className="text-[9px] text-gray-400 font-semibold block mt-1 uppercase max-w-sm sm:max-w-none truncate">{tournamentName}</span>
          </div>
        </div>

        {/* Sync telemetry info & Home button */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span className="text-[10px] text-red-400 uppercase tracking-widest font-bold">LIVE TELEMETRY</span>
            </div>
            
            <div className="text-gray-500 text-[10px] font-semibold flex items-center gap-1">
              <RefreshCw className="h-3 w-3 animate-spin text-gray-500" />
              <span>Sync: {lastSyncTime || 'Pending'}</span>
            </div>
          </div>

          <Link
            href="/"
            prefetch={false}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-800 hover:border-gray-700 bg-gray-900/40 hover:bg-gray-900/80 rounded-lg text-xs font-bold transition text-gray-300 hover:text-white cursor-pointer"
          >
            <Home className="h-3.5 w-3.5" />
            <span>Go to Admin</span>
          </Link>
        </div>
      </header>

      {/* SUB MENU TABS */}
      <div className="border-b border-gray-900 bg-[#0a0f1c]/50 flex shrink-0 sticky top-[72px] z-30">
        <div className="w-full px-6 flex">
          {[
            { id: 'STREAM', label: 'Live Stream & Arena', icon: Tv },
            { id: 'BRACKETS', label: 'Draws & Brackets', icon: Award },
            { id: 'SCHEDULE', label: 'Upcoming Bouts', icon: Calendar },
            { id: 'STANDINGS', label: 'Medal Leaderboard', icon: Trophy }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3.5 px-5 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                  isActive 
                    ? 'border-indigo-500 text-white bg-indigo-500/5' 
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-indigo-400' : 'text-gray-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* CORE BODY CONTAINER */}
      <main className="flex-1 w-full p-6 min-h-0 overflow-y-auto">
        
        {/* T1: LIVE STREAM PLAYER & ACTIVE ARENA */}
        {activeTab === 'STREAM' && (
          <div className="space-y-6">
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Stream Screen (2 cols) */}
              <div className="lg:col-span-2 bg-[#0d1322] border border-gray-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col justify-between">
                <div className="bg-gray-900/60 p-4 border-b border-gray-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Play className="h-4 w-4 text-indigo-500 fill-indigo-500" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Broadcasting Feed</span>
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono">Arena 1</span>
                </div>

                <div className="flex-1 bg-black min-h-[350px] flex items-center justify-center relative">
                  {liveStreamUrl ? (
                    <iframe
                      src={liveStreamUrl}
                      className="absolute inset-0 w-full h-full border-none"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title="Live Stream Broadcast"
                    />
                  ) : (
                    /* SIMULATED HIGH-CONTRAST MOCK SCOREBOARD CARD */
                    <div className="p-8 text-center max-w-lg space-y-6 w-full">
                      <Tv className="h-12 w-12 text-indigo-500/20 mx-auto" />
                      <div className="space-y-2">
                        <h3 className="font-extrabold text-white text-md">Simulated Scoreboard Active</h3>
                        <p className="text-xs text-gray-400">
                          Stream URL has not been configured. Active match points from the referee scoring panel will render live in real-time below.
                        </p>
                      </div>

                      {/* Display live running bouts or show scheduled */}
                      {runningBouts.length > 0 ? (
                        <div className="bg-[#0b101d] border border-gray-800 rounded-xl p-6 text-center space-y-4">
                          <span className="bg-amber-500 text-black px-2 py-0.5 rounded text-[9px] font-black uppercase">LIVE SCORE</span>
                          
                          {runningBouts.slice(0, 1).map((rb) => {
                            const competitorA = participants.find(p => p.id === rb.participant_a_id);
                            const competitorB = participants.find(p => p.id === rb.participant_b_id);

                            return (
                              <div key={rb.id} className="space-y-4">
                                <span className="block text-[10px] text-indigo-400 font-bold uppercase">
                                  {categories.find(c => c.id === rb.category_id)?.name}
                                </span>
                                <div className="grid grid-cols-3 items-center">
                                  <span className="text-sm font-extrabold text-red-500 truncate">{competitorA?.full_name || 'Aka'}</span>
                                  <span className="text-4xl font-black font-mono text-white">{rb.score_a} - {rb.score_b}</span>
                                  <span className="text-sm font-extrabold text-blue-500 truncate">{competitorB?.full_name || 'Ao'}</span>
                                </div>
                                <span className="block text-[10px] text-gray-500 font-semibold uppercase">TATAMI: {rb.tatami}</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="border border-dashed border-gray-800 rounded-xl p-6 text-center text-xs text-gray-500 italic">
                          No active match is currently running. Awaiting next session.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Active Arena Scores (1 col) */}
              <div className="space-y-4">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                  <Flame className="h-4 w-4 text-amber-500" />
                  <span>Active Tatami Matches</span>
                </h3>

                {runningBouts.length === 0 ? (
                  <div className="bg-[#0d1322] border border-gray-800 rounded-xl p-8 text-center text-xs text-gray-500 italic">
                    All tatami arenas are currently clear.
                  </div>
                ) : (
                  runningBouts.map((rb) => {
                    const competitorA = participants.find(p => p.id === rb.participant_a_id);
                    const competitorB = participants.find(p => p.id === rb.participant_b_id);
                    const category = categories.find(c => c.id === rb.category_id);

                    return (
                      <div 
                        key={rb.id}
                        onClick={() => setSelectedBoutDetails(rb)}
                        className="bg-[#0d1322] border border-amber-500/30 hover:border-amber-500 transition-all rounded-xl p-4 shadow-md space-y-3 cursor-pointer"
                      >
                        <div className="flex justify-between items-center text-[10px] font-bold">
                          <span className="text-amber-500 uppercase flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping" />
                            <span>MATCH RUNNING</span>
                          </span>
                          <span className="text-gray-400">{rb.tatami}</span>
                        </div>

                        <span className="text-[10px] font-bold block text-gray-300 truncate">{category?.name}</span>

                        <div className="flex items-center justify-between text-xs font-semibold gap-4">
                          <span className="text-red-500 truncate flex-1">{competitorA?.full_name}</span>
                          <span className="font-mono text-sm text-white px-2 py-0.5 bg-gray-950 rounded border border-gray-800">{rb.score_a} - {rb.score_b}</span>
                          <span className="text-blue-500 truncate flex-1 text-right">{competitorB?.full_name}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

            </div>

            {/* Finished Bouts Carousel */}
            <div className="space-y-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-400">Recently Completed Matches</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {bouts.filter(b => b.status === 'Completed' || b.status === 'Walkover').slice(-4).map((b) => {
                  const competitorA = participants.find(p => p.id === b.participant_a_id);
                  const competitorB = participants.find(p => p.id === b.participant_b_id);
                  const winner = participants.find(p => p.id === b.winner_id);
                  const category = categories.find(c => c.id === b.category_id);

                  return (
                    <div 
                      key={b.id}
                      onClick={() => setSelectedBoutDetails(b)}
                      className="bg-[#0d1322] border border-gray-800 hover:border-gray-700 transition rounded-xl p-4 shadow-sm space-y-2.5 cursor-pointer"
                    >
                      <div className="flex justify-between items-center text-[9px] text-gray-500 font-bold">
                        <span>BOUT {b.bout_no}</span>
                        <span>{b.tatami}</span>
                      </div>
                      
                      <span className="text-[9px] font-bold block text-gray-300 truncate">{category?.name}</span>

                      <div className="flex justify-between items-center text-xs font-semibold gap-2">
                        <span className={`truncate flex-1 ${winner?.id === competitorA?.id ? 'text-emerald-500' : 'text-gray-400'}`}>{competitorA?.full_name}</span>
                        <span className="font-mono text-xs text-white">{b.score_a} - {b.score_b}</span>
                        <span className={`truncate flex-1 text-right ${winner?.id === competitorB?.id ? 'text-emerald-500' : 'text-gray-400'}`}>{competitorB?.full_name}</span>
                      </div>
                    </div>
                  );
                })}
                {bouts.filter(b => b.status === 'Completed' || b.status === 'Walkover').length === 0 && (
                  <div className="col-span-full bg-[#0d1322] border border-gray-800 rounded-xl p-8 text-center text-xs text-gray-500 italic">
                    No matches completed yet in this session.
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* T2: DRAWS & BRACKETS */}
        {activeTab === 'BRACKETS' && (
          <div className="space-y-6">
            
            {/* Category dropdown controller */}
            <div className="bg-[#0d1322] border border-gray-800 p-4 rounded-xl flex items-center justify-between gap-4 shrink-0 flex-wrap">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Select Weight Division</span>
                <select
                  value={selectedCatId}
                  onChange={(e) => setSelectedCatId(e.target.value)}
                  className="px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {activeCategory && (
                <div className="text-right text-[11px] text-gray-400 font-semibold">
                  <span>Gender: {activeCategory.gender} | Age: {activeCategory.min_age}-{activeCategory.max_age} yrs</span>
                </div>
              )}
            </div>

            {/* Brackets Draw Grid */}
            <div className="bg-[#0d1322] border border-gray-800 rounded-2xl p-6 min-h-[400px] flex flex-col justify-center overflow-x-auto">
              
              {currentCatBouts.length === 0 ? (
                <div className="text-center text-xs text-gray-500 italic p-12">
                  No draws generated for this category. Awaiting brackets layout seeding.
                </div>
              ) : isRoundRobinDraw ? (
                /* Round Robin Grid for public */
                <div className="border border-gray-800 rounded-xl overflow-hidden w-full">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#0c1322] font-bold border-b border-gray-800 text-gray-300">
                      <tr>
                        <th className="p-3 w-16 text-center">Bout</th>
                        <th className="p-3">Aka (Red)</th>
                        <th className="p-3 w-16 text-center">Score</th>
                        <th className="p-3">Ao (Blue)</th>
                        <th className="p-3 w-24 text-center">Status</th>
                        <th className="p-3 w-32 text-center">Winner</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-900">
                      {currentCatBouts.map((b) => {
                        const competitorA = participants.find(p => p.id === b.participant_a_id);
                        const competitorB = participants.find(p => p.id === b.participant_b_id);
                        const winner = participants.find(p => p.id === b.winner_id);

                        return (
                          <tr 
                            key={b.id} 
                            onClick={() => setSelectedBoutDetails(b)}
                            className="hover:bg-gray-900/35 transition cursor-pointer"
                          >
                            <td className="p-3 text-center font-mono font-semibold text-gray-500">{b.bout_no}</td>
                            <td className="p-3 font-semibold text-white">{competitorA?.full_name || 'TBD'}</td>
                            <td className="p-3 text-center font-mono font-bold text-sm bg-gray-900/50 text-indigo-400">{b.score_a} - {b.score_b}</td>
                            <td className="p-3 font-semibold text-white">{competitorB?.full_name || 'TBD'}</td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${getStatusBadge(b.status)}`}>
                                {b.status}
                              </span>
                            </td>
                            <td className="p-3 text-center font-bold text-indigo-400">{winner?.full_name || '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Elimination Tree for public */
                <div className="p-4 overflow-auto bg-[#0a0f1d]/20 rounded-xl">
                  <SportdataBracket
                    bouts={currentCatBouts}
                    participants={participants}
                    clubs={clubs}
                    categories={categories}
                    selectedCatId={selectedCatId}
                    canModify={false}
                    onBoutClick={setSelectedBoutDetails}
                    theme="dark"
                  />
                </div>
              )}

            </div>

          </div>
        )}

        {/* T3: UPCOMING BOUTS SCHEDULE */}
        {activeTab === 'SCHEDULE' && (
          <div className="space-y-4">
            <h2 className="text-sm font-extrabold uppercase tracking-widest text-gray-400 flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>Session Timeline Queue</span>
            </h2>

            {bouts.filter(b => b.status === 'Scheduled' && b.victory_method !== 'Walkover' && b.round_no !== 99).length === 0 ? (
              <div className="bg-[#0d1322] border border-gray-800 rounded-xl p-12 text-center text-xs text-gray-500 italic">
                All scheduled bouts for this session have been completed or run.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* Group by Tatami */}
                {['Tatami 1', 'Tatami 2', 'Tatami 3'].map((ring) => {
                  const ringBouts = bouts.filter(b => b.tatami === ring && b.status === 'Scheduled' && b.victory_method !== 'Walkover' && b.round_no !== 99);
                  if (ringBouts.length === 0) return null;

                  return (
                    <div key={ring} className="bg-[#0d1322] border border-gray-800 rounded-2xl p-5 space-y-4">
                      <div className="border-b border-gray-800 pb-3 flex items-center justify-between">
                        <span className="font-extrabold text-sm text-white uppercase tracking-wider">{ring}</span>
                        <span className="text-[10px] text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded-full">
                          {ringBouts.length} Pending
                        </span>
                      </div>

                      <div className="space-y-3.5 max-h-[450px] overflow-y-auto pr-1">
                        {ringBouts.map((rb) => {
                          const competitorA = participants.find(p => p.id === rb.participant_a_id);
                          const competitorB = participants.find(p => p.id === rb.participant_b_id);
                          const category = categories.find(c => c.id === rb.category_id);

                          return (
                            <div
                              key={rb.id}
                              onClick={() => setSelectedBoutDetails(rb)}
                              className="p-3 bg-[#0a0f1d] hover:bg-gray-900/40 border border-gray-800/60 rounded-xl transition cursor-pointer flex items-center justify-between gap-4"
                            >
                              <div className="space-y-1.5 min-w-0">
                                <span className="block text-[9px] font-bold text-gray-500 uppercase">BOUT {rb.bout_no}</span>
                                <div className="text-xs font-semibold text-gray-300 truncate">
                                  <span className="text-red-400">{competitorA?.full_name || 'TBD'}</span>
                                  <span className="text-gray-500 font-normal px-1">vs</span>
                                  <span className="text-blue-400">{competitorB?.full_name || 'TBD'}</span>
                                </div>
                                <span className="block text-[9px] text-gray-400 truncate">{category?.name}</span>
                              </div>

                              <span className="shrink-0 font-mono text-[10px] font-bold text-gray-400 flex items-center gap-0.5">
                                <Clock className="h-3.5 w-3.5" />
                                <span>{rb.scheduled_time || 'TBD'}</span>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

        {/* T4: MEDAL LEADERBOARD STANDINGS */}
        {activeTab === 'STANDINGS' && (
          <div className="space-y-6">
            
            <div className="bg-[#0d1322] border border-gray-800 rounded-2xl shadow-xl flex flex-col overflow-hidden w-full">
              <div className="p-5 border-b border-gray-800 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500 animate-pulse" />
                <h2 className="text-sm font-bold uppercase tracking-widest text-white">Championship Standings Tally</h2>
              </div>

              <div className="overflow-x-auto">
                {getMedalStandings().length === 0 ? (
                  <div className="p-12 text-center text-xs text-gray-500 italic">
                    Standings will automatically compute once final matches conclude.
                  </div>
                ) : (
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-900/60 font-bold border-b border-gray-800 text-gray-400 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="p-4 w-16 text-center">Rank</th>
                        <th className="p-4">Dojo Club Academy</th>
                        <th className="p-4 w-20 text-center">🥇 Gold</th>
                        <th className="p-4 w-20 text-center">🥈 Silver</th>
                        <th className="p-4 w-20 text-center">🥉 Bronze</th>
                        <th className="p-4 w-20 text-center">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-900 text-gray-300">
                      {getMedalStandings().map((t, idx) => (
                        <tr key={t.id} className="hover:bg-gray-900/35 transition-colors">
                          <td className="p-4 text-center font-bold text-gray-400">{idx + 1}</td>
                          <td className="p-4 font-bold text-white text-sm">{t.name}</td>
                          <td className="p-4 text-center font-mono font-bold text-amber-500 bg-amber-500/5">{t.gold}</td>
                          <td className="p-4 text-center font-mono font-bold text-gray-400 bg-gray-400/5">{t.silver}</td>
                          <td className="p-4 text-center font-mono font-bold text-amber-600 bg-amber-700/5">{t.bronze}</td>
                          <td className="p-4 text-center font-mono font-bold bg-gray-950 text-white">{t.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

          </div>
        )}

      </main>

      {/* BOUT DETAILS MODAL */}
      {selectedBoutDetails && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#0d1322] border border-gray-800 max-w-md w-full rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            
            <div className="p-5 border-b border-gray-800 flex items-center justify-between">
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-white">Match Overview Details</h3>
              <button
                onClick={() => setSelectedBoutDetails(null)}
                className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="text-center space-y-1">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block">BOUT NO {selectedBoutDetails.bout_no}</span>
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider block">
                  {categories.find(c => c.id === selectedBoutDetails.category_id)?.name}
                </span>
                <span className="text-[10px] text-gray-400 font-bold block">{selectedBoutDetails.tatami} | Round {selectedBoutDetails.round_no === 99 ? '3rd' : selectedBoutDetails.round_no}</span>
              </div>

              {/* Side by side stats */}
              <div className="grid grid-cols-5 items-center gap-2 border border-gray-800/80 bg-gray-950/45 p-4 rounded-xl">
                
                {/* Red side */}
                <div className="col-span-2 text-center space-y-1 min-w-0">
                  <div className="w-2.5 h-2.5 bg-red-600 rounded-full mx-auto" />
                  <span className="block text-xs font-extrabold text-white truncate">
                    {participants.find(p => p.id === selectedBoutDetails.participant_a_id)?.full_name || 'TBD'}
                  </span>
                  <span className="block text-[9px] text-gray-500 truncate">
                    {clubs.find(c => c.id === participants.find(p => p.id === selectedBoutDetails.participant_a_id)?.club_id)?.name || 'Independent'}
                  </span>
                </div>

                {/* Score */}
                <div className="col-span-1 text-center">
                  <span className="text-2xl font-black font-mono text-indigo-400">
                    {selectedBoutDetails.score_a} - {selectedBoutDetails.score_b}
                  </span>
                </div>

                {/* Blue side */}
                <div className="col-span-2 text-center space-y-1 min-w-0">
                  <div className="w-2.5 h-2.5 bg-blue-600 rounded-full mx-auto" />
                  <span className="block text-xs font-extrabold text-white truncate">
                    {participants.find(p => p.id === selectedBoutDetails.participant_b_id)?.full_name || 'TBD'}
                  </span>
                  <span className="block text-[9px] text-gray-500 truncate">
                    {clubs.find(c => c.id === participants.find(p => p.id === selectedBoutDetails.participant_b_id)?.club_id)?.name || 'Independent'}
                  </span>
                </div>

              </div>

              {/* Final outcome status banner */}
              <div className="text-center space-y-2">
                <span className="text-[10px] text-gray-500 font-bold block uppercase tracking-widest">Match Outcome Status</span>
                
                {selectedBoutDetails.status === 'Completed' ? (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-semibold">
                    Winner: <span className="font-extrabold text-white">{participants.find(p => p.id === selectedBoutDetails.winner_id)?.full_name}</span>
                  </div>
                ) : selectedBoutDetails.status === 'Walkover' ? (
                  <div className="p-3 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl text-xs font-semibold">
                    Winner by Walkover: <span className="font-extrabold text-white">{participants.find(p => p.id === selectedBoutDetails.winner_id)?.full_name}</span>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl text-xs font-semibold flex items-center justify-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>Match is currently {selectedBoutDetails.status}</span>
                  </div>
                )}
              </div>

            </div>

            <div className="p-4 border-t border-gray-800 bg-gray-900/20 flex justify-end">
              <button
                onClick={() => setSelectedBoutDetails(null)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Close View
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
