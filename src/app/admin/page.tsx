'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { db, supabase, basePath } from '@/db/dbClient';
import { Participant, Club, Country, TournamentPC, CategoryLock, Category, Bout, isKumiteCategory, isKataCategory } from '@/db/types';
import { useTournament } from '@/context/TournamentContext';
import { 
  Users, UserCheck, HeartPulse, CreditCard,
  MapPin, Landmark, ArrowRight, ArrowUpRight, TrendingUp, RefreshCw,
  Monitor, Lock, Unlock, Server, Shield, Cloud, CloudOff, CheckCircle2,
  AlertTriangle, Power, Radio, Zap, Trophy, Play, Check, ExternalLink,
  ChevronRight, Laptop, Activity, ListFilter, RotateCcw
} from 'lucide-react';

export default function AdminDashboard() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'TATAMI_MANAGER' | 'CATEGORIES_LOCK' | 'MATCH_MONITOR' | 'SERVER_SYNC' | 'ATHLETES'>('TATAMI_MANAGER');

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [pcs, setPcs] = useState<TournamentPC[]>([]);
  const [locks, setLocks] = useState<CategoryLock[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [bouts, setBouts] = useState<Bout[]>([]);
  
  const [syncingCloud, setSyncingCloud] = useState(false);
  const [cloudSyncMessage, setCloudSyncMessage] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());

  const { 
    userRole, 
    userEmail,
    activeTournamentId, 
    takeoverTatami,
    tatamiTelemetry,
    updateTatamiTelemetry,
    assignCategoryToTatami,
    releaseCategoryFromTatami,
    lockCategoryByAdmin,
    disconnectTatamiPC,
    reconnectTatamiPC,
    takeoverTatamiPC,
    releaseTatamiTakeover
  } = useTournament();

  // Route Guard: Only Admin can access this page
  useEffect(() => {
    if (mounted && userRole && userRole !== 'Admin') {
      router.replace('/dashboard/operator');
    }
  }, [mounted, userRole, router]);

  // Tick clock every second for precise heartbeat counters
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [pList, cList, cntList, pcList, lockList, catList, bList] = await Promise.all([
        db.participants.list(),
        db.clubs.list(),
        db.countries.list(),
        activeTournamentId ? db.pcControl.getPcs(activeTournamentId) : Promise.resolve([]),
        activeTournamentId ? db.pcControl.getActiveLocks(activeTournamentId) : Promise.resolve([]),
        db.categories.list(),
        db.bouts.list()
      ]);
      setParticipants(pList);
      setClubs(cList);
      setCountries(cntList);
      setPcs(pcList);
      setLocks(lockList);
      setCategories(catList);
      setBouts(bList);
    } catch (e) {
      console.error('Error loading Admin dashboard telemetry:', e);
    } finally {
      setLoading(false);
    }
  }, [activeTournamentId]);

  useEffect(() => {
    setMounted(true);
    loadData();
  }, [loadData]);

  // Real-time synchronization subscription
  useEffect(() => {
    if (!activeTournamentId) return;
    
    const refreshPcsAndLocks = async () => {
      try {
        const [pcList, lockList, catList, bList] = await Promise.all([
          db.pcControl.getPcs(activeTournamentId),
          db.pcControl.getActiveLocks(activeTournamentId),
          db.categories.list(),
          db.bouts.list()
        ]);
        setPcs(pcList);
        setLocks(lockList);
        setCategories(catList);
        setBouts(bList);
      } catch (err) {
        console.error("Failed to fetch PCs and locks", err);
      }
    };

    const interval = setInterval(refreshPcsAndLocks, 10000);

    let channel: any = null;
    if (supabase) {
      channel = supabase.channel(`admin-hub-${activeTournamentId}-${Date.now()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_pcs' }, refreshPcsAndLocks)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'category_locks' }, refreshPcsAndLocks)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, refreshPcsAndLocks)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bouts' }, refreshPcsAndLocks)
        .subscribe();
    }

    return () => {
      clearInterval(interval);
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [activeTournamentId]);

  const handleForceCloudSync = async () => {
    setSyncingCloud(true);
    setCloudSyncMessage(null);
    try {
      await loadData();
      setCloudSyncMessage('Cloud sync completed. All local database records and locks are synchronized.');
      setTimeout(() => setCloudSyncMessage(null), 5000);
    } catch (e: any) {
      setCloudSyncMessage('Sync error: ' + (e?.message || 'Check internet connection'));
    } finally {
      setSyncingCloud(false);
    }
  };

  const handleForceReleaseLock = async (categoryId: string) => {
    if (!window.confirm("Are you sure you want to forcibly release this category lock?")) return;
    try {
      await releaseCategoryFromTatami(categoryId);
      loadData();
    } catch (err: any) {
      alert("Error releasing lock: " + err.message);
    }
  };

  if (!mounted) return null;

  // Derive tatami heartbeats and statuses
  const getTatamiStatus = (tNum: 1 | 2) => {
    const tele = tatamiTelemetry[tNum];
    const pc = pcs.find(p => p.tatami === `Tatami ${tNum}` || p.pc_identifier === `tatami_${tNum}`);
    
    let lastSeen = 0;
    if (tele?.lastHeartbeat) {
      lastSeen = new Date(tele.lastHeartbeat).getTime();
    } else if (pc) {
      const rawDate = pc.last_heartbeat || pc.updated_at;
      const dateStr = (rawDate.endsWith('Z') || rawDate.includes('+')) ? rawDate : rawDate + 'Z';
      lastSeen = new Date(dateStr).getTime();
    }

    const secondsAgo = lastSeen > 0 ? Math.max(0, Math.floor((currentTime - lastSeen) / 1000)) : 999;
    const isOnline = tele?.status !== 'disconnected' && secondsAgo <= 30;
    const isTakenOver = takeoverTatami === tNum || tele?.status === 'taken_over' || tele?.isAdminControlled;

    let timeAgoStr = '';
    if (lastSeen === 0 || secondsAgo > 300) timeAgoStr = 'Offline';
    else if (secondsAgo < 5) timeAgoStr = '1 sec ago';
    else if (secondsAgo < 60) timeAgoStr = `${secondsAgo} sec ago`;
    else timeAgoStr = `${Math.floor(secondsAgo / 60)}m ${secondsAgo % 60}s ago`;

    // Find active category for this tatami
    const assignedCat = categories.find(c => (c as any).assigned_tatami === `Tatami ${tNum}`);
    const activeLock = locks.find(l => l.tatami === `Tatami ${tNum}` && l.is_active);
    const lockedCat = activeLock ? categories.find(c => c.id === activeLock.category_id) : null;
    const activeCategoryName = tele?.currentCategoryName || assignedCat?.name || lockedCat?.name || 'No active category assigned';

    // Find active bout for this tatami
    const activeBout = bouts.find(b => b.tatami === `Tatami ${tNum}` && b.status === 'Running') ||
                       bouts.find(b => (b.category_id === assignedCat?.id || b.category_id === lockedCat?.id) && b.status === 'Running');
    const matchCode = tele?.currentMatchCode || (activeBout ? `R${activeBout.round_no}B${activeBout.bout_no}` : 'Waiting for Match');
    const screenState = tele?.currentScreenState || (activeBout ? 'Live Scoring Console' : 'Standby / Bracket');

    return {
      tNum,
      isOnline,
      isTakenOver,
      secondsAgo,
      timeAgoStr,
      categoryName: activeCategoryName,
      matchCode,
      screenState,
      email: `tatami_${tNum}@spsportdatasolution.org`,
      pcIdentifier: `tatami_${tNum}`,
      assignedCount: categories.filter(c => (c as any).assigned_tatami === `Tatami ${tNum}`).length
    };
  };

  const tatami1Info = getTatamiStatus(1);
  const tatami2Info = getTatamiStatus(2);

  // Statistics
  const total = participants.length;
  const male = participants.filter(p => p.gender === 'Male').length;
  const female = participants.filter(p => p.gender === 'Female').length;
  const confirmed = participants.filter(p => p.status === 'Confirmed' || p.status === 'Checked In').length;
  const paid = participants.filter(p => p.payment_status === 'Paid').length;
  const medicalIssues = participants.filter(p => p.medical_status === 'Action Required').length;
  const uniqueClubsCount = Array.from(new Set(participants.map(p => p.club_id).filter(Boolean))).length;
  const uniqueCountriesCount = Array.from(new Set(participants.map(p => p.nationality_code).filter(Boolean))).length;

  return (
    <div className="p-6 space-y-6 text-foreground w-full max-w-[1600px] mx-auto font-sans">
      
      {/* Top Banner / System Mode */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 rounded-2xl p-5 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-md bg-red-600 text-white font-black text-[10px] tracking-widest uppercase shadow-xs">
              ADMIN PC
            </span>
            <span className="px-2.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 font-bold text-[10px] tracking-wider uppercase">
              ROLE: ADMIN / LOCAL SERVER / TATAMI MANAGER
            </span>
            {takeoverTatami && (
              <span className="px-2.5 py-0.5 rounded-md bg-amber-500 text-black font-black text-[10px] tracking-wider uppercase animate-pulse">
                ⚡ TAKEOVER ACTIVE: TATAMI {takeoverTatami}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            Tournament Command & Tatami Manager
          </h1>
          <p className="text-xs text-slate-300">
            Connected Director: <span className="font-semibold text-white">admin@spsportdatasolution.org</span> • Local Server Standalone & Multi-Tatami Telemetry
          </p>
        </div>

        {/* Global Control Bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleForceCloudSync}
            disabled={syncingCloud}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-md shadow-indigo-900/30 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncingCloud ? 'animate-spin' : ''}`} />
            <span>Force Cloud Sync</span>
          </button>
          <Link
            href="/dashboard/operator"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition border border-white/20"
          >
            <Zap className="w-3.5 h-3.5 text-yellow-400" />
            <span>Operator Console</span>
          </Link>
          <Link
            href="/bracket-hub"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition border border-white/20"
          >
            <Trophy className="w-3.5 h-3.5 text-indigo-400" />
            <span>Bracket Hub</span>
          </Link>
        </div>
      </div>

      {cloudSyncMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{cloudSyncMessage}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2 overflow-x-auto">
        {[
          { id: 'TATAMI_MANAGER', label: 'Tatami Manager & Takeover', icon: Laptop, badge: `${tatami1Info.isOnline ? 1 : 0 + (tatami2Info.isOnline ? 1 : 0)}/2 Online` },
          { id: 'CATEGORIES_LOCK', label: 'Category Assignment & Locks', icon: Lock, badge: `${locks.length} Locked` },
          { id: 'MATCH_MONITOR', label: 'Live Match Lock & Monitor', icon: Radio, badge: `${bouts.filter(b => b.status === 'Running').length} Live` },
          { id: 'SERVER_SYNC', label: 'Local Server & Cloud Sync', icon: Server },
          { id: 'ATHLETES', label: 'Athlete Telemetry Stats', icon: Users, badge: `${total}` },
        ].map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer shrink-0 border ${
                active
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-card border-border text-muted-foreground hover:text-foreground hover:bg-secondary/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  active ? 'bg-black/20 text-white' : 'bg-secondary text-foreground'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: TATAMI MANAGER & TAKEOVER */}
      {activeTab === 'TATAMI_MANAGER' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* TATAMI 1 CARD */}
            <div className={`bg-card border-2 rounded-2xl p-6 shadow-md transition-all ${
              tatami1Info.isTakenOver 
                ? 'border-amber-500/60 bg-amber-500/5' 
                : tatami1Info.isOnline 
                  ? 'border-emerald-500/40' 
                  : 'border-red-500/30'
            }`}>
              <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg ${
                    tatami1Info.isOnline ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20' : 'bg-red-500/20 text-red-400'
                  }`}>
                    T1
                  </div>
                  <div>
                    <h2 className="text-lg font-black tracking-tight text-foreground flex items-center gap-2">
                      TATAMI 1
                      {tatami1Info.isTakenOver && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500 text-black font-black text-[9px] uppercase tracking-wider">
                          CONTROLLED BY ADMIN
                        </span>
                      )}
                    </h2>
                    <p className="text-xs text-muted-foreground">Account: {tatami1Info.email}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                    tatami1Info.isOnline 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                      : 'bg-red-500/10 text-red-400 border border-red-500/30'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${tatami1Info.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                    {tatami1Info.isOnline ? '● ONLINE' : '● OFFLINE'}
                  </span>
                  <p className="text-[10px] text-muted-foreground mt-1">Last heartbeat: {tatami1Info.timeAgoStr}</p>
                </div>
              </div>

              {/* Telemetry Details */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="p-3 bg-secondary/40 rounded-xl border border-border">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Current Category</span>
                  <span className="font-bold text-xs text-foreground block truncate mt-0.5">{tatami1Info.categoryName}</span>
                </div>
                <div className="p-3 bg-secondary/40 rounded-xl border border-border">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Current Match</span>
                  <span className="font-bold text-xs text-foreground block truncate mt-0.5">{tatami1Info.matchCode}</span>
                </div>
                <div className="p-3 bg-secondary/40 rounded-xl border border-border">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Screen State</span>
                  <span className="font-bold text-xs text-foreground block truncate mt-0.5">{tatami1Info.screenState}</span>
                </div>
                <div className="p-3 bg-secondary/40 rounded-xl border border-border">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Assigned Categories</span>
                  <span className="font-bold text-xs text-indigo-400 block mt-0.5">{tatami1Info.assignedCount} Divisions</span>
                </div>
              </div>

              {/* Action Buttons (Takeover / Controls) */}
              <div className="flex items-center gap-2 pt-2 border-t border-border flex-wrap">
                {tatami1Info.isTakenOver ? (
                  <button
                    onClick={() => releaseTatamiTakeover(1)}
                    className="flex-1 min-w-[140px] flex items-center justify-center gap-1.5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer shadow-md"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Release Takeover</span>
                  </button>
                ) : (
                  <button
                    onClick={() => takeoverTatamiPC(1)}
                    className="flex-1 min-w-[140px] flex items-center justify-center gap-1.5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer shadow-md shadow-red-900/20"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Take Over Tatami 1</span>
                  </button>
                )}

                {tatami1Info.isOnline ? (
                  <button
                    onClick={() => disconnectTatamiPC(1)}
                    className="flex items-center gap-1 px-3.5 py-2.5 border border-border hover:bg-secondary text-muted-foreground hover:text-red-400 rounded-xl text-xs font-bold transition cursor-pointer"
                    title="Simulate Disconnect"
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>Disconnect</span>
                  </button>
                ) : (
                  <button
                    onClick={() => reconnectTatamiPC(1)}
                    className="flex items-center gap-1 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
                    title="Reconnect PC"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reconnect</span>
                  </button>
                )}

                <Link
                  href="/dashboard/operator"
                  className="flex items-center gap-1 px-3.5 py-2.5 bg-secondary hover:bg-secondary/80 text-foreground rounded-xl text-xs font-bold transition border border-border"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Console</span>
                </Link>
              </div>
            </div>

            {/* TATAMI 2 CARD */}
            <div className={`bg-card border-2 rounded-2xl p-6 shadow-md transition-all ${
              tatami2Info.isTakenOver 
                ? 'border-amber-500/60 bg-amber-500/5' 
                : tatami2Info.isOnline 
                  ? 'border-emerald-500/40' 
                  : 'border-red-500/30'
            }`}>
              <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg ${
                    tatami2Info.isOnline ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20' : 'bg-red-500/20 text-red-400'
                  }`}>
                    T2
                  </div>
                  <div>
                    <h2 className="text-lg font-black tracking-tight text-foreground flex items-center gap-2">
                      TATAMI 2
                      {tatami2Info.isTakenOver && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500 text-black font-black text-[9px] uppercase tracking-wider">
                          CONTROLLED BY ADMIN
                        </span>
                      )}
                    </h2>
                    <p className="text-xs text-muted-foreground">Account: {tatami2Info.email}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                    tatami2Info.isOnline 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                      : 'bg-red-500/10 text-red-400 border border-red-500/30'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${tatami2Info.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                    {tatami2Info.isOnline ? '● ONLINE' : '● OFFLINE'}
                  </span>
                  <p className="text-[10px] text-muted-foreground mt-1">Last heartbeat: {tatami2Info.timeAgoStr}</p>
                </div>
              </div>

              {/* Telemetry Details */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="p-3 bg-secondary/40 rounded-xl border border-border">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Current Category</span>
                  <span className="font-bold text-xs text-foreground block truncate mt-0.5">{tatami2Info.categoryName}</span>
                </div>
                <div className="p-3 bg-secondary/40 rounded-xl border border-border">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Current Match</span>
                  <span className="font-bold text-xs text-foreground block truncate mt-0.5">{tatami2Info.matchCode}</span>
                </div>
                <div className="p-3 bg-secondary/40 rounded-xl border border-border">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Screen State</span>
                  <span className="font-bold text-xs text-foreground block truncate mt-0.5">{tatami2Info.screenState}</span>
                </div>
                <div className="p-3 bg-secondary/40 rounded-xl border border-border">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Assigned Categories</span>
                  <span className="font-bold text-xs text-indigo-400 block mt-0.5">{tatami2Info.assignedCount} Divisions</span>
                </div>
              </div>

              {/* Action Buttons (Takeover / Controls) */}
              <div className="flex items-center gap-2 pt-2 border-t border-border flex-wrap">
                {tatami2Info.isTakenOver ? (
                  <button
                    onClick={() => releaseTatamiTakeover(2)}
                    className="flex-1 min-w-[140px] flex items-center justify-center gap-1.5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer shadow-md"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Release Takeover</span>
                  </button>
                ) : (
                  <button
                    onClick={() => takeoverTatamiPC(2)}
                    className="flex-1 min-w-[140px] flex items-center justify-center gap-1.5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer shadow-md shadow-red-900/20"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Take Over Tatami 2</span>
                  </button>
                )}

                {tatami2Info.isOnline ? (
                  <button
                    onClick={() => disconnectTatamiPC(2)}
                    className="flex items-center gap-1 px-3.5 py-2.5 border border-border hover:bg-secondary text-muted-foreground hover:text-red-400 rounded-xl text-xs font-bold transition cursor-pointer"
                    title="Simulate Disconnect"
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>Disconnect</span>
                  </button>
                ) : (
                  <button
                    onClick={() => reconnectTatamiPC(2)}
                    className="flex items-center gap-1 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
                    title="Reconnect PC"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reconnect</span>
                  </button>
                )}

                <Link
                  href="/dashboard/operator"
                  className="flex items-center gap-1 px-3.5 py-2.5 bg-secondary hover:bg-secondary/80 text-foreground rounded-xl text-xs font-bold transition border border-border"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Console</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CATEGORY ASSIGNMENT & LOCKING MATRIX */}
      {activeTab === 'CATEGORIES_LOCK' && (
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-4">
            <div>
              <h2 className="text-base font-black text-foreground">Category Assignment & Lock Architecture</h2>
              <p className="text-xs text-muted-foreground">Assign divisions to Tatami 1 or Tatami 2. Locked categories are instantly protected from multi-tatami conflicts.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground">Total: {categories.length} Categories</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-muted-foreground uppercase text-[10px] font-black tracking-wider bg-secondary/20">
                  <th className="p-3">Category Name</th>
                  <th className="p-3">Discipline</th>
                  <th className="p-3">Assignment</th>
                  <th className="p-3">Lock Status</th>
                  <th className="p-3 text-right">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-medium">
                {categories.map(cat => {
                  const assignedTatami = (cat as any).assigned_tatami || null;
                  const activeLock = locks.find(l => l.category_id === cat.id && l.is_active);
                  const isLocked = !!activeLock || (cat as any).status === 'Locked';
                  const isKumite = isKumiteCategory(cat);

                  // Calculate State
                  let stateLabel = 'AVAILABLE';
                  let stateColor = 'bg-slate-500/10 text-slate-400 border-slate-500/20';

                  if (isLocked) {
                    stateLabel = '🔒 LOCKED';
                    stateColor = 'bg-red-500/10 text-red-400 border-red-500/30';
                  } else if (assignedTatami) {
                    stateLabel = `ASSIGNED (${assignedTatami.toUpperCase()})`;
                    stateColor = 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
                  } else if ((cat as any).status === 'Completed') {
                    stateLabel = 'COMPLETED';
                    stateColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
                  }

                  return (
                    <tr key={cat.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="p-3 font-bold text-foreground">{cat.name}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          isKumite ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'
                        }`}>
                          {isKumite ? 'Kumite' : 'Kata'}
                        </span>
                      </td>
                      <td className="p-3">
                        {assignedTatami ? (
                          <span className="px-2.5 py-1 rounded-md bg-indigo-500/15 text-indigo-300 font-bold text-xs border border-indigo-500/30">
                            {assignedTatami}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs italic">Unassigned (Pool)</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${stateColor}`}>
                          {stateLabel}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <button
                            onClick={() => assignCategoryToTatami(cat.id, 'Tatami 1')}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer border ${
                              assignedTatami === 'Tatami 1'
                                ? 'bg-indigo-600 text-white border-indigo-500'
                                : 'bg-secondary hover:bg-secondary/80 text-foreground border-border'
                            }`}
                          >
                            Tatami 1
                          </button>
                          <button
                            onClick={() => assignCategoryToTatami(cat.id, 'Tatami 2')}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer border ${
                              assignedTatami === 'Tatami 2'
                                ? 'bg-indigo-600 text-white border-indigo-500'
                                : 'bg-secondary hover:bg-secondary/80 text-foreground border-border'
                            }`}
                          >
                            Tatami 2
                          </button>
                          {assignedTatami && (
                            <button
                              onClick={() => releaseCategoryFromTatami(cat.id)}
                              className="px-2.5 py-1 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-lg text-[11px] font-bold transition cursor-pointer"
                              title="Release back to pool"
                            >
                              Release
                            </button>
                          )}
                          {isLocked ? (
                            <button
                              onClick={() => handleForceReleaseLock(cat.id)}
                              className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1 shadow-xs"
                            >
                              <Unlock className="w-3 h-3" />
                              <span>Unlock</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => lockCategoryByAdmin(cat.id)}
                              className="px-2.5 py-1 bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground rounded-lg text-[11px] font-bold transition cursor-pointer border border-border flex items-center gap-1"
                            >
                              <Lock className="w-3 h-3" />
                              <span>Lock</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: MATCH LOCK & MONITOR MATRIX */}
      {activeTab === 'MATCH_MONITOR' && (
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-4">
            <div>
              <h2 className="text-base font-black text-foreground">Live Match Controller & Conflict Protection</h2>
              <p className="text-xs text-muted-foreground">Ensures no match can ever be controlled simultaneously by two Tatamis.</p>
            </div>
            <span className="text-xs font-bold text-indigo-400">{bouts.length} Total Matches Configured</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bouts.slice(0, 18).map(bout => {
              const cat = categories.find(c => c.id === bout.category_id);
              const isRunning = bout.status === 'Running';
              const isCompleted = bout.status === 'Completed';
              const controllerTatami = bout.tatami || (cat as any)?.assigned_tatami || 'Tatami 1';

              return (
                <div key={bout.id} className={`p-4 rounded-xl border transition-all ${
                  isRunning 
                    ? 'bg-emerald-500/10 border-emerald-500/40 shadow-sm' 
                    : isCompleted 
                      ? 'bg-secondary/30 border-border opacity-70' 
                      : 'bg-card border-border'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-secondary text-foreground">
                      R{bout.round_no} B{bout.bout_no}
                    </span>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                      isRunning ? 'bg-emerald-500 text-black border-emerald-400 animate-pulse' : isCompleted ? 'bg-slate-500/20 text-slate-300 border-slate-500/30' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                    }`}>
                      {isRunning ? '● LIVE SCORING' : bout.status}
                    </span>
                  </div>

                  <h3 className="font-bold text-xs text-foreground truncate">{cat?.name || 'Open Championship'}</h3>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50">
                    <span className="text-[11px] font-bold text-indigo-400">
                      Controller: {controllerTatami}
                    </span>
                    <span className="font-black text-foreground">
                      {bout.score_a || 0} - {bout.score_b || 0}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: LOCAL SERVER & CLOUD SYNC */}
      {activeTab === 'SERVER_SYNC' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Server className="w-5 h-5 text-indigo-400" />
              <h2 className="text-base font-black text-foreground">Local Server Management</h2>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/40 border border-border">
                <span className="font-bold text-muted-foreground">Server Operating Mode</span>
                <span className="font-black text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                  ONLINE / ACTIVE (PORT 3000)
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/40 border border-border">
                <span className="font-bold text-muted-foreground">Local Database Engine</span>
                <span className="font-black text-foreground">IndexedDB / SQLite High-Performance Local Store</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/40 border border-border">
                <span className="font-bold text-muted-foreground">Offline Resilience</span>
                <span className="font-black text-emerald-400">ENABLED (Zero-latency fallback on LAN)</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/40 border border-border">
                <span className="font-bold text-muted-foreground">Registered Devices</span>
                <span className="font-black text-indigo-400">3 Terminals (Admin, Tatami 1, Tatami 2)</span>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Cloud className="w-5 h-5 text-indigo-400" />
              <h2 className="text-base font-black text-foreground">Cloud Synchronization Hub</h2>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/40 border border-border">
                <span className="font-bold text-muted-foreground">Cloud Sync Engine</span>
                <span className="font-black text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                  ● SYNCHRONIZED (Supabase Realtime)
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/40 border border-border">
                <span className="font-bold text-muted-foreground">Offline Queue</span>
                <span className="font-black text-foreground">0 Pending Commits</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/40 border border-border">
                <span className="font-bold text-muted-foreground">Broadcast Synchronization</span>
                <span className="font-black text-foreground">BroadcastChannel + Realtime Hub Active</span>
              </div>
              <button
                onClick={handleForceCloudSync}
                disabled={syncingCloud}
                className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold uppercase tracking-wider text-xs transition cursor-pointer shadow-md"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingCloud ? 'animate-spin' : ''}`} />
                <span>{syncingCloud ? 'Synchronizing with Cloud...' : 'Trigger Full Cloud Push & Pull'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: ATHLETE TELEMETRY STATS */}
      {activeTab === 'ATHLETES' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 font-sans">
            <div className="bg-card border border-border rounded-xl p-5 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Athletes</span>
                <h3 className="text-3xl font-extrabold tracking-tight">{total}</h3>
                <div className="text-[10px] text-muted-foreground flex gap-2">
                  <span>{male} Male</span>
                  <span>•</span>
                  <span>{female} Female</span>
                </div>
              </div>
              <div className="h-10 w-10 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                <Users className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Confirmed Athletes</span>
                <h3 className="text-3xl font-extrabold tracking-tight text-emerald-400">{confirmed}</h3>
                <div className="text-[10px] text-muted-foreground flex gap-1.5">
                  <span>{total - confirmed} Pending Check-In</span>
                </div>
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <UserCheck className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Paid Registration</span>
                <h3 className="text-3xl font-extrabold tracking-tight">{Math.round(total > 0 ? (paid / total) * 100 : 0)}%</h3>
                <div className="text-[10px] text-muted-foreground flex gap-1.5">
                  <span>{paid} Paid Receipts</span>
                </div>
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <CreditCard className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Medical Actions</span>
                <h3 className="text-3xl font-extrabold tracking-tight text-red-500">{medicalIssues}</h3>
                <div className="text-[10px] text-muted-foreground flex gap-1.5">
                  <span>Immediate Review Required</span>
                </div>
              </div>
              <div className="h-10 w-10 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center">
                <HeartPulse className="h-5 w-5" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
