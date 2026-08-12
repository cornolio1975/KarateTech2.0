'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { supabase, basePath } from '@/db/dbClient';
import { localStore } from '@/db/localStore';
import { setActiveTournamentDb } from '@/db/mockStore';
import { ChevronDown, Loader2, AlertTriangle, WifiOff, Trophy } from 'lucide-react';

// Statuses to EXCLUDE from the public selector (show everything else)
const EXCLUDED_STATUSES = ['Archived', 'Deleted'];

interface TournamentOption {
  id: string;
  name: string;
  venue?: string;
  city?: string;
  date?: string;
  status: string;
}

interface GateProps {
  children: React.ReactNode;
}

function TournamentSelectorGateInner({ children }: GateProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const urlTournamentId = searchParams.get('tournament');

  const [selectedId, setSelectedId] = useState<string | null>(urlTournamentId);
  const [confirmed, setConfirmed] = useState<boolean>(!!urlTournamentId);
  const [tournaments, setTournaments] = useState<TournamentOption[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingTournament, setLoadingTournament] = useState(false);
  const [gateError, setGateError] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Load list of selectable tournaments
  useEffect(() => {
    const fetchTournaments = async () => {
      setLoadingList(true);
      try {
        if (supabase) {
          const { data, error } = await supabase
            .from('tournaments')
            .select('id, name, venue, city, date, status')
            .not('status', 'in', `(${EXCLUDED_STATUSES.join(',')})`)
            .is('deleted_at', null)
            .order('date_iso', { ascending: false });

          if (error) throw error;
          setTournaments((data || []) as TournamentOption[]);
        } else {
          setTournaments([
            { id: 'demo-001', name: 'Demo Tournament 2026', venue: 'Sports Hall', city: 'Kuala Lumpur', status: 'Active' }
          ]);
        }
      } catch (err) {
        console.error('[TournamentSelectorGate] failed to load tournaments:', err);
        setTournaments([]);
      } finally {
        setLoadingList(false);
      }
    };
    fetchTournaments();
  }, []);

  // Auto-load from URL param
  useEffect(() => {
    if (urlTournamentId && !confirmed) {
      validateAndConfirm(urlTournamentId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlTournamentId]);

  const validateAndConfirm = async (id: string) => {
    setLoadingTournament(true);
    setGateError(null);

    // Basic UUID format check
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(id)) {
      setGateError('not_found');
      setLoadingTournament(false);
      return;
    }

    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('tournaments')
          .select('id, status, deleted_at')
          .eq('id', id)
          .maybeSingle();

        if (error) throw error;
        if (!data) { setGateError('not_found'); setLoadingTournament(false); return; }
        if (data.status === 'Archived' || data.status === 'Deleted' || data.deleted_at) {
          setGateError('archived'); setLoadingTournament(false); return;
        }
      }

      // Ensure the tournament data is loaded into memory so that the display components use it
      const activeDb = await localStore.loadTournament(id);
      if (activeDb) {
        setActiveTournamentDb(activeDb);
        // Do not update ts_active_tournament_id in local storage because that's for the Admin panel's active selection.
        // Spectator display is decoupled from the admin's active event.
      } else {
        throw new Error('Tournament data could not be loaded');
      }

      setSelectedId(id);
      setConfirmed(true);

      const params = new URLSearchParams(searchParams.toString());
      params.set('tournament', id);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    } catch (err) {
      setGateError('load_error');
    } finally {
      setLoadingTournament(false);
    }
  };

  const handleSelect = (id: string) => {
    setDropdownOpen(false);
    setGateError(null);
    validateAndConfirm(id);
  };

  const handleBack = () => {
    setConfirmed(false);
    setSelectedId(null);
    setGateError(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('tournament');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Pass through to scoreboard if tournament confirmed
  if (confirmed && selectedId && !loadingTournament) {
    return <>{children}</>;
  }

  // Loading state while validating URL param
  if (loadingTournament) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-4" style={{ background: 'radial-gradient(ellipse at 50% 30%, #0d1f3c 0%, #070e1a 70%)' }}>
        <Loader2 className="h-10 w-10 animate-spin" style={{ color: '#22d3ee' }} />
        <span className="text-sm font-black uppercase tracking-[0.25em]" style={{ color: '#94a3b8' }}>Connecting to Tournament...</span>
      </div>
    );
  }

  // Error states
  if (gateError === 'not_found' || gateError === 'archived' || gateError === 'load_error') {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-6 p-8" style={{ background: 'radial-gradient(ellipse at 50% 30%, #0d1f3c 0%, #070e1a 70%)' }}>
        <AlertTriangle className="h-14 w-14" style={{ color: '#f59e0b' }} />
        <div className="text-center space-y-2 max-w-md">
          <h1 className="text-xl font-black text-white uppercase tracking-widest">
            {gateError === 'not_found' && 'Tournament Not Found'}
            {gateError === 'archived' && 'Tournament Archived'}
            {gateError === 'load_error' && 'Connection Failed'}
          </h1>
          <p className="text-sm font-medium" style={{ color: '#64748b' }}>
            {gateError === 'not_found' && 'The tournament ID does not exist or has been removed.'}
            {gateError === 'archived' && 'This tournament is no longer available for live display.'}
            {gateError === 'load_error' && 'Please check your connection and try again.'}
          </p>
        </div>
        <button
          onClick={handleBack}
          className="mt-2 px-6 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition cursor-pointer"
          style={{ background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.3)', color: '#22d3ee' }}
        >
          ← Back to Selector
        </button>
      </div>
    );
  }

  // No tournaments available
  if (!loadingList && tournaments.length === 0) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-6 p-8" style={{ background: 'radial-gradient(ellipse at 50% 30%, #0d1f3c 0%, #070e1a 70%)' }}>
        <WifiOff className="h-12 w-12" style={{ color: '#1e3a5f' }} />
        <div className="text-center space-y-2">
          <h1 className="text-xl font-black uppercase tracking-widest" style={{ color: '#334155' }}>No Tournaments Available</h1>
          <p className="text-sm font-medium" style={{ color: '#1e3a5f' }}>There are currently no active or upcoming tournaments configured.</p>
        </div>
      </div>
    );
  }

  const selectedTournament = tournaments.find(t => t.id === selectedId);

  return (
    <div
      className="min-h-[100dvh] flex flex-col select-none"
      style={{ background: 'radial-gradient(ellipse at 50% 20%, #0d1f3c 0%, #070e1a 60%)' }}
      onClick={() => dropdownOpen && setDropdownOpen(false)}
    >
      {/* Top Header Bar — matching production style */}
      <div
        className="flex items-center justify-between px-6 py-4 shrink-0"
        style={{ borderBottom: '1px solid rgba(34,211,238,0.12)', background: 'rgba(7,14,26,0.8)', backdropFilter: 'blur(12px)' }}
      >
        {/* Left: Live indicator + title */}
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl"
            style={{ background: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.2)' }}
          >
            <Trophy className="h-4 w-4" style={{ color: '#22d3ee' }} />
            <div
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ background: '#22d3ee', boxShadow: '0 0 8px rgba(34,211,238,0.8)' }}
            />
            <span className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: '#22d3ee' }}>
              Live Tournament Display
            </span>
          </div>
        </div>

        {/* Right: SP SportData Solution branding */}
        <div
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl"
          style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <img
            src={`${basePath}/karatetech-logo.png`}
            alt="KarateTech"
            className="h-6 object-contain"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <span className="text-xs font-bold" style={{ color: '#475569' }}>SP SportData Solution</span>
        </div>
      </div>

      {/* Main Selector Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {/* Centered glow orb behind content */}
        <div
          className="absolute pointer-events-none"
          style={{
            width: 500, height: 500,
            background: 'radial-gradient(circle, rgba(34,211,238,0.06) 0%, transparent 70%)',
            transform: 'translate(-50%, -50%)',
            left: '50%', top: '45%',
          }}
        />

        <div className="relative z-10 w-full max-w-md flex flex-col items-center gap-8">
          {/* Trophy Icon */}
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{
              background: 'rgba(34,211,238,0.06)',
              border: '1px solid rgba(34,211,238,0.2)',
              boxShadow: '0 0 40px rgba(34,211,238,0.1)',
            }}
          >
            <Trophy className="h-9 w-9" style={{ color: '#22d3ee' }} />
          </div>

          {/* Title */}
          <div className="text-center">
            <h1 className="text-3xl font-black text-white tracking-tight">KarateTech Display Screen</h1>
            <p className="mt-2 text-sm font-medium" style={{ color: '#475569' }}>
              Select a tournament to load the live display
            </p>
          </div>

          {/* Selector Card */}
          <div
            className="w-full rounded-2xl p-6 space-y-4"
            style={{
              background: 'rgba(13,31,60,0.6)',
              border: '1px solid rgba(34,211,238,0.15)',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 0 40px rgba(34,211,238,0.05)',
            }}
          >
            <h2 className="text-xs font-black uppercase tracking-[0.25em] text-center" style={{ color: '#64748b' }}>
              Choose Tournament
            </h2>

            {/* Dropdown */}
            <div className="relative" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setDropdownOpen(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-left font-bold transition-all duration-200 cursor-pointer focus:outline-none"
                style={{
                  background: 'rgba(7,14,26,0.8)',
                  border: `1px solid ${dropdownOpen ? 'rgba(34,211,238,0.4)' : 'rgba(34,211,238,0.15)'}`,
                  color: selectedTournament ? '#f1f5f9' : '#334155',
                  boxShadow: dropdownOpen ? '0 0 0 3px rgba(34,211,238,0.1)' : 'none',
                }}
                id="tournament-selector"
                aria-haspopup="listbox"
                aria-expanded={dropdownOpen}
              >
                <span className="text-sm truncate">
                  {loadingList
                    ? 'Loading tournaments...'
                    : selectedTournament
                      ? selectedTournament.name
                      : 'Select Tournament...'}
                </span>
                {loadingList
                  ? <Loader2 className="h-4 w-4 animate-spin shrink-0" style={{ color: '#22d3ee' }} />
                  : <ChevronDown
                      className={`h-4 w-4 shrink-0 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
                      style={{ color: '#22d3ee' }}
                    />
                }
              </button>

              {/* Dropdown list */}
              {dropdownOpen && !loadingList && (
                <div
                  className="absolute z-50 top-full mt-2 w-full rounded-xl overflow-hidden shadow-2xl"
                  style={{
                    background: '#0a1628',
                    border: '1px solid rgba(34,211,238,0.2)',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
                  }}
                >
                  <ul role="listbox" className="py-1 max-h-64 overflow-y-auto">
                    {tournaments.map(t => (
                      <li
                        key={t.id}
                        role="option"
                        aria-selected={t.id === selectedId}
                        onClick={() => handleSelect(t.id)}
                        className="flex items-center justify-between px-4 py-3.5 cursor-pointer transition-all"
                        style={{
                          background: t.id === selectedId ? 'rgba(34,211,238,0.08)' : 'transparent',
                          borderLeft: t.id === selectedId ? '2px solid #22d3ee' : '2px solid transparent',
                          color: t.id === selectedId ? '#22d3ee' : '#94a3b8',
                        }}
                        onMouseEnter={e => {
                          if (t.id !== selectedId) {
                            (e.currentTarget as HTMLElement).style.background = 'rgba(34,211,238,0.05)';
                            (e.currentTarget as HTMLElement).style.color = '#e2e8f0';
                          }
                        }}
                        onMouseLeave={e => {
                          if (t.id !== selectedId) {
                            (e.currentTarget as HTMLElement).style.background = 'transparent';
                            (e.currentTarget as HTMLElement).style.color = '#94a3b8';
                          }
                        }}
                      >
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="font-bold text-sm truncate">{t.name}</span>
                          {(t.venue || t.city) && (
                            <span className="text-xs truncate" style={{ color: '#334155' }}>
                              {[t.venue, t.city].filter(Boolean).join(' · ')}
                            </span>
                          )}
                        </div>
                        <span
                          className="ml-3 shrink-0 text-[10px] font-black uppercase px-2 py-0.5 rounded-md"
                          style={{
                            background: t.status === 'Active' || t.status === 'Open'
                              ? 'rgba(34,211,238,0.1)'
                              : t.status === 'Completed'
                                ? 'rgba(255,255,255,0.05)'
                                : 'rgba(251,191,36,0.1)',
                            border: `1px solid ${t.status === 'Active' || t.status === 'Open'
                              ? 'rgba(34,211,238,0.3)'
                              : t.status === 'Completed'
                                ? 'rgba(255,255,255,0.1)'
                                : 'rgba(251,191,36,0.3)'}`,
                            color: t.status === 'Active' || t.status === 'Open'
                              ? '#22d3ee'
                              : t.status === 'Completed'
                                ? '#475569'
                                : '#fbbf24',
                          }}
                        >
                          {t.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Load button */}
            <button
              onClick={() => selectedId && handleSelect(selectedId)}
              disabled={!selectedId || loadingTournament}
              className="w-full py-4 rounded-xl text-sm font-black uppercase tracking-[0.15em] transition-all duration-200 cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                background: selectedId
                  ? 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)'
                  : 'rgba(13,31,60,0.5)',
                border: selectedId
                  ? '1px solid rgba(34,211,238,0.4)'
                  : '1px solid rgba(34,211,238,0.1)',
                color: selectedId ? '#000' : '#1e3a5f',
                boxShadow: selectedId ? '0 4px 20px rgba(6,182,212,0.3)' : 'none',
              }}
              id="load-tournament-btn"
            >
              {loadingTournament
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Connecting...</>
                : <><Trophy className="h-4 w-4" /> Load Tournament</>
              }
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Bar — matching production control bar style */}
      <div
        className="shrink-0 flex items-center justify-center py-3 px-6"
        style={{
          borderTop: '1px solid rgba(34,211,238,0.08)',
          background: 'rgba(7,14,26,0.9)',
        }}
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.25em]" style={{ color: '#1e3a5f' }}>
          Powered by KarateTech &nbsp;·&nbsp; SP SportData Solution
        </p>
      </div>
    </div>
  );
}

export default function TournamentSelectorGate({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: '#070e1a' }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#22d3ee' }} />
      </div>
    }>
      <TournamentSelectorGateInner>{children}</TournamentSelectorGateInner>
    </Suspense>
  );
}
