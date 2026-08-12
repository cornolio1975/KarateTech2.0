'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { db, supabase } from '@/db/dbClient';
import { Participant, Club, Country, TournamentPC, CategoryLock, Category } from '@/db/types';
import { useTournament } from '@/context/TournamentContext';
import { 
  Users, UserCheck, Flame, HeartPulse, CreditCard, ShieldAlert, 
  MapPin, Landmark, ArrowRight, ArrowUpRight, TrendingUp, RefreshCw,
  Monitor, Lock, Unlock, Server, Shield
} from 'lucide-react';

export default function AdminDashboard() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [pcs, setPcs] = useState<TournamentPC[]>([]);
  const [locks, setLocks] = useState<CategoryLock[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  const { userRole, activeTournamentId } = useTournament();

  const loadData = async () => {
    try {
      setLoading(true);
      const [pList, cList, cntList, pcList, lockList, catList] = await Promise.all([
        db.participants.list(),
        db.clubs.list(),
        db.countries.list(),
        activeTournamentId ? db.pcControl.getPcs(activeTournamentId) : Promise.resolve([]),
        activeTournamentId ? db.pcControl.getActiveLocks(activeTournamentId) : Promise.resolve([]),
        db.categories.list()
      ]);
      setParticipants(pList);
      setClubs(cList);
      setCountries(cntList);
      setPcs(pcList);
      setLocks(lockList);
      setCategories(catList);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminOverride = async (categoryId: string) => {
    if (userRole !== 'Admin') {
      alert("Only Admins can force release locks.");
      return;
    }
    if (!window.confirm("Are you sure you want to forcibly release this lock?")) return;
    if (!activeTournamentId) return;
    try {
      await db.pcControl.overrideLock(activeTournamentId, categoryId, 'admin');
      loadData();
    } catch (err: any) {
      alert("Error overriding lock: " + err.message);
    }
  };

  useEffect(() => {
    setMounted(true);
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTournamentId]);

  useEffect(() => {
    if (!activeTournamentId) return;
    
    const refreshData = async () => {
      try {
        const [pcList, lockList] = await Promise.all([
          db.pcControl.getPcs(activeTournamentId),
          db.pcControl.getActiveLocks(activeTournamentId)
        ]);
        setPcs(pcList);
        setLocks(lockList);
      } catch (err) {
        console.error("Failed to fetch PCs", err);
      }
    };

    // Initial fetch
    refreshData();

    // Poll for PC status and locks every 15 seconds as a fallback
    const interval = setInterval(refreshData, 15000);

    let channel: any = null;
    if (supabase) {
      // Use unique name to avoid "callbacks after subscribe" error in StrictMode
      channel = supabase.channel(`admin-pcs-${activeTournamentId}-${Date.now()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_pcs' }, () => {
          refreshData();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'category_locks' }, () => {
          refreshData();
        })
        .subscribe();
    }

    return () => {
      clearInterval(interval);
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [activeTournamentId]);

  if (!mounted) return null;

  // Compute Statistics
  const total = participants.length;
  const male = participants.filter(p => p.gender === 'Male').length;
  const female = participants.filter(p => p.gender === 'Female').length;
  
  const confirmed = participants.filter(p => p.status === 'Confirmed').length;
  const checkedIn = participants.filter(p => p.status === 'Checked In').length;
  const pending = participants.filter(p => p.status === 'Pending').length;
  
  const paid = participants.filter(p => p.payment_status === 'Paid').length;
  const unpaid = participants.filter(p => p.payment_status === 'Unpaid').length;
  const pendingPayment = participants.filter(p => p.payment_status === 'Pending').length;
  
  const medicalIssues = participants.filter(p => p.medical_status === 'Action Required').length;
  const reviewNeeded = participants.filter(p => p.medical_status === 'Review Needed').length;

  const uniqueClubsCount = Array.from(new Set(participants.map(p => p.club_id).filter(Boolean))).length;
  const uniqueCountriesCount = Array.from(new Set(participants.map(p => p.nationality_code).filter(Boolean))).length;

  // Recent 5 participants
  const recentParticipants = [...participants]
    .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())
    .slice(0, 5);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Confirmed': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'Checked In': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'Pending': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'Disqualified': return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20';
    }
  };

  const chartPoints = "10,120 75,90 140,110 205,60 270,80 335,40 400,20";

  return (
    <div className="p-6 space-y-6 text-foreground w-full">
      {/* Page Title & Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-sans">Tournament Dashboard</h1>
          <p className="text-sm text-muted-foreground font-sans">Real-time participation telemetry and registration insight metrics</p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="p-2 hover:bg-secondary border border-border text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold font-sans"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Sync Data</span>
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 font-sans">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-card border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Stats Cards Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 font-sans">
            {/* Total Competitors */}
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

            {/* Confirmed Checked In */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Confirmed Status</span>
                <h3 className="text-3xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">{confirmed + checkedIn}</h3>
                <div className="text-[10px] text-muted-foreground flex gap-1.5">
                  <span>{checkedIn} Checked-In</span>
                  <span>•</span>
                  <span>{pending} Pending</span>
                </div>
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <UserCheck className="h-5 w-5" />
              </div>
            </div>

            {/* Total Paid Receipts */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Payment Rate</span>
                <h3 className="text-3xl font-extrabold tracking-tight">{Math.round(total > 0 ? (paid / total) * 100 : 0)}%</h3>
                <div className="text-[10px] text-muted-foreground flex gap-1.5">
                  <span>{paid} Paid</span>
                  <span>•</span>
                  <span>{unpaid} Unpaid</span>
                </div>
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <CreditCard className="h-5 w-5" />
              </div>
            </div>

            {/* Medical / Review Required */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Medical Actions</span>
                <h3 className="text-3xl font-extrabold tracking-tight text-red-500">{medicalIssues}</h3>
                <div className="text-[10px] text-muted-foreground flex gap-1.5">
                  <span>{reviewNeeded} Review Needed</span>
                </div>
              </div>
              <div className="h-10 w-10 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center">
                <HeartPulse className="h-5 w-5" />
              </div>
            </div>
          </div>

          {/* PC Control & Active Locks Dashboard */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-sans">
            <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Server className="h-5 w-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-foreground">Registered Devices (PCs)</h3>
              </div>
              <div className="space-y-2">
                {pcs.length === 0 && <p className="text-xs text-muted-foreground">No PCs connected yet.</p>}
                {pcs.map(pc => {
                  const rawDate = pc.last_heartbeat || pc.updated_at;
                  const dateStr = (rawDate.endsWith('Z') || rawDate.includes('+')) ? rawDate : rawDate + 'Z';
                  const lastSeen = new Date(dateStr).getTime();
                  const secondsAgo = Math.floor((Date.now() - lastSeen) / 1000);
                  const isOnline = secondsAgo <= 120; // 120s timeout to survive background tab throttling
                  
                  let timeAgoStr = '';
                  if (secondsAgo < 60) timeAgoStr = `${secondsAgo} sec ago`;
                  else timeAgoStr = `${Math.floor(secondsAgo / 60)}m ${secondsAgo % 60}s ago`;

                  return (
                    <div key={pc.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                          <span className="font-bold text-sm">{pc.pc_name}</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-1">
                          ID: {pc.pc_identifier} | User: {pc.username || 'System'} | Seen: {timeAgoStr}
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${isOnline ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        {isOnline ? 'ONLINE' : 'OFFLINE'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-red-400" />
                  <h3 className="text-sm font-bold text-foreground">Active Category Locks</h3>
                </div>
              </div>
              <div className="space-y-2">
                {locks.length === 0 && <p className="text-xs text-muted-foreground">No categories currently locked.</p>}
                {locks.map(lock => {
                  const cat = categories.find(c => c.id === lock.category_id);
                  const pc = pcs.find(p => p.id === lock.pc_id);
                  
                  let lastSeen = 0;
                  if (pc) {
                    const rawDate = pc.last_heartbeat || pc.updated_at;
                    const dateStr = (rawDate.endsWith('Z') || rawDate.includes('+')) ? rawDate : rawDate + 'Z';
                    lastSeen = new Date(dateStr).getTime();
                  }
                  
                  const secondsAgo = Math.floor((Date.now() - lastSeen) / 1000);
                  const isOnline = pc ? secondsAgo <= 120 : false;
                  
                  let timeAgoStr = '';
                  if (!pc) timeAgoStr = 'Unknown';
                  else if (secondsAgo < 60) timeAgoStr = `${secondsAgo} sec ago`;
                  else timeAgoStr = `${Math.floor(secondsAgo / 60)} min ${secondsAgo % 60} sec ago`;

                  return (
                    <div key={lock.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border ${isOnline ? 'bg-secondary/20 border-border' : 'bg-red-500/10 border-red-500/20'}`}>
                      <div className="space-y-1.5 mb-3 sm:mb-0">
                        <span className="font-black text-sm block">{cat?.name || 'Unknown Category'}</span>
                        <div className="flex items-center gap-2">
                          <span className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider ${isOnline ? 'text-emerald-500' : 'text-red-500'}`}>
                            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                            {isOnline ? 'ONLINE' : 'OFFLINE'} — {pc?.tatami || pc?.pc_name || lock.pc_id}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground block font-medium">
                          Last heartbeat: {timeAgoStr}
                        </span>
                      </div>
                      <button
                        onClick={() => handleAdminOverride(lock.category_id)}
                        disabled={userRole !== 'Admin'}
                        className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-black uppercase tracking-wider transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-red-900/20 w-full sm:w-auto"
                        title={userRole === 'Admin' ? "Force release this lock" : "Only Admin can force release"}
                      >
                        <Shield className="w-3.5 h-3.5" />
                        Force Release
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Secondary Stats & Recent List */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
            {/* Quick Summary Panels */}
            <div className="lg:col-span-2 space-y-6">
              {/* Telemetry Charts Placeholder */}
              <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Registration Progress Timeline</h3>
                    <p className="text-xs text-muted-foreground">Competitor entries logged over active registration period</p>
                  </div>
                  <span className="text-xs font-semibold text-emerald-500 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    +12% vs last week
                  </span>
                </div>
                <div className="h-44 w-full flex items-end justify-between gap-1 pt-4 relative">
                  {/* Grid Lines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                    <div className="border-b border-border w-full h-0"></div>
                    <div className="border-b border-border w-full h-0"></div>
                    <div className="border-b border-border w-full h-0"></div>
                    <div className="border-b border-border w-full h-0"></div>
                  </div>
                  {/* Render simulated line chart */}
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 400 130">
                    <polyline
                      fill="none"
                      stroke="var(--primary)"
                      strokeWidth="3"
                      points={chartPoints}
                    />
                  </svg>
                </div>
              </div>

              {/* Tournament Meta Distribution */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Clubs Distribution */}
                <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Participating Dojos</span>
                    <Landmark className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-2xl font-extrabold tracking-tight">{uniqueClubsCount}</h4>
                    <p className="text-xs text-muted-foreground">Unique karate academies registered in divisions</p>
                  </div>
                  <Link
                    href="/clubs"
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1 pt-1.5"
                  >
                    <span>View Dojos directory</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>

                {/* Countries Distribution */}
                <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Active Regions</span>
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-2xl font-extrabold tracking-tight">{uniqueCountriesCount}</h4>
                    <p className="text-xs text-muted-foreground">Different states / national clubs represented</p>
                  </div>
                  <Link
                    href="/participants"
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1 pt-1.5"
                  >
                    <span>View athlete locations</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Recent Registrations Log */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">Recent Registrations</h3>
                <p className="text-xs text-muted-foreground mb-4">Latest competitors mapped to category entries</p>
                <div className="space-y-3.5">
                  {recentParticipants.map(p => {
                    const clubName = clubs.find(c => c.id === p.club_id)?.name || 'Independent';
                    return (
                      <div key={p.id} className="flex items-start justify-between text-xs gap-3">
                        <div className="min-w-0">
                          <span className="font-semibold block truncate text-foreground leading-tight">{p.full_name}</span>
                          <span className="text-[10px] text-muted-foreground truncate block mt-0.5">{clubName}</span>
                        </div>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-semibold border ${getStatusColor(p.status)}`}>
                          {p.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Link
                href="/participants"
                className="w-full flex items-center justify-center gap-1.5 py-2.5 border border-border hover:bg-secondary rounded-lg text-xs font-bold transition text-foreground mt-4"
              >
                <span>Manage all participants</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
