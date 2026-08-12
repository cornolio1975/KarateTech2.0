'use client';

import React, { useState, useEffect } from 'react';
import { dbManager, supabase } from '@/db/dbClient';
import { localStore } from '@/db/localStore';
import { useTournament } from '@/context/TournamentContext';
import { Tournament, TournamentDatabase } from '@/db/types';
import TournamentFormModal from '@/components/TournamentFormModal';
import DisplayPlaylistModal from '@/components/DisplayPlaylistModal';
import TournamentShareLink from '@/components/TournamentShareLink';
import { 
  Trophy, Plus, CheckCircle, Edit3, Trash2, Loader2, MapPin, Calendar,
  Layers, Shield, Film, List, Zap, MonitorPlay, Folder, RefreshCw, RotateCcw, ExternalLink, ChevronUp, ChevronDown
} from 'lucide-react';
import { basePath } from '@/db/dbClient';

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const compressImage = (file: File, callback: (base64: string) => void) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      const MAX_DIM = 800;
      if (width > height && width > MAX_DIM) {
        height *= MAX_DIM / width;
        width = MAX_DIM;
      } else if (height > MAX_DIM) {
        width *= MAX_DIM / height;
        height = MAX_DIM;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      callback(canvas.toDataURL('image/webp', 0.6));
    };
    img.src = e.target?.result as string;
  };
  reader.readAsDataURL(file);
};

interface SponsorItem {
  id: string;
  name: string;
  logo_url: string;
  website_url?: string;
  active: boolean;
  order: number;
}

interface SponsorDraft {
  id: string | null;
  name: string;
  logo_url: string;
  website_url: string;
}

const MAX_SPONSOR_LOGO_SIZE_MB = 2;

export default function TournamentDetailsModule() {
  const { setTournamentName, triggerRefresh } = useTournament();
  const [mounted, setMounted] = useState(false);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTournamentId, setActiveTournamentId] = useState<string | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTournament, setEditingTournament] = useState<Partial<Tournament> | null>(null);

  const [activeTab, setActiveTab] = useState('Dashboard Overview');
  const [sponsors, setSponsors] = useState<SponsorItem[]>([]);
  const [savingSponsors, setSavingSponsors] = useState(false);
  const [isSponsorModalOpen, setIsSponsorModalOpen] = useState(false);
  const [addMediaTriggerKey, setAddMediaTriggerKey] = useState(0);
  const [tickerSpeed, setTickerSpeed] = useState(20); // seconds for one full loop
  const [savingSpeed, setSavingSpeed] = useState(false);
  const [sponsorDraft, setSponsorDraft] = useState<SponsorDraft>({
    id: null,
    name: '',
    logo_url: '',
    website_url: ''
  });

  const displayUrl = activeTournamentId
    ? `${basePath}/display?tournament=${encodeURIComponent(activeTournamentId)}`
    : `${basePath}/display`;

  // Tabs
  const tabs = [
    { name: 'Dashboard Overview', icon: <Layers className="h-4 w-4" /> },
    { name: 'Sponsor Management', icon: <Shield className="h-4 w-4" /> },
    { name: 'Tournament Details', icon: <Trophy className="h-4 w-4" /> },
    { name: 'Media Playlist', icon: <Film className="h-4 w-4" /> },
  ];

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      setActiveTournamentId(localStorage.getItem('ts_active_tournament_id'));
    }
    loadTournaments();
  }, []);

  const loadTournaments = async () => {
    setLoading(true);
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('tournaments')
          .select('id, name, organizer, date, date_iso, venue, city, registration_close, registration_close_iso, status, banner_gradient, featured, deleted_at, discipline, medals_gold, medals_silver, medals_bronze, total_participants, total_clubs, settings, last_modified')
          .neq('status', 'Deleted')
          .order('date_iso', { ascending: false });
        
        if (error) throw error;
        setTournaments(data || []);
      } else {
        // Fallback for local testing if Supabase is offline
        const localT = await localStore.listTournaments();
        setTournaments(localT);
      }
    } catch (err) {
      console.error('Failed to load tournaments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const activeTournament = tournaments.find(t => t.id === activeTournamentId);
    const rawSettings = (
      (activeTournament?.settings as Record<string, unknown> | undefined)
      ?? ((activeTournament as unknown as { data?: { tournament?: { settings?: Record<string, unknown> }; settings?: Record<string, unknown> } } | undefined)?.data?.tournament?.settings)
      ?? ((activeTournament as unknown as { data?: { settings?: Record<string, unknown> } } | undefined)?.data?.settings)
      ?? {}
    ) as Record<string, unknown>;
    const rawSponsors = rawSettings.sponsors;
    const rawSpeed = rawSettings.ticker_speed;
    if (typeof rawSpeed === 'number' && rawSpeed > 0) {
      setTickerSpeed(rawSpeed);
    } else {
      setTickerSpeed(20);
    }
    if (Array.isArray(rawSponsors)) {
      const normalized = rawSponsors
        .map((item, idx) => {
          const sponsor = item as Partial<SponsorItem>;
          return {
            id: sponsor.id || `sponsor-${idx}`,
            name: sponsor.name || 'Unnamed Sponsor',
            logo_url: sponsor.logo_url || '',
            website_url: sponsor.website_url || '',
            active: sponsor.active !== false,
            order: typeof sponsor.order === 'number' ? sponsor.order : idx
          } satisfies SponsorItem;
        })
        .sort((a, b) => a.order - b.order);
      setSponsors(normalized);
    } else {
      setSponsors([]);
    }
  }, [tournaments, activeTournamentId]);

  const persistSponsors = async (nextSponsors: SponsorItem[]) => {
    if (!activeTournamentId) {
      alert('Please set an active tournament first.');
      return false;
    }

    const activeTournament = tournaments.find(t => t.id === activeTournamentId)
      || dbManager.getActiveTournament()?.tournament
      || null;
    if (!activeTournament) {
      alert('Active tournament not found. Please refresh and try again.');
      return false;
    }

    try {
      setSavingSponsors(true);
      const updatedSettings = {
        ...(activeTournament.settings || {}),
        sponsors: nextSponsors
      };

      let cloudSaved = false;

      if (supabase) {
        try {
          const { error } = await supabase
            .from('tournaments')
            .update({ settings: updatedSettings })
            .eq('id', activeTournamentId);
          if (error) {
            // Some deployed schemas do not have a top-level `settings` column.
            // In that case, persist sponsors into tournaments.data JSON as fallback.
            // PostgREST can return either SQL code 42703 or API code PGRST204.
            const saveError = error as { code?: string; message?: string };
            const missingSettingsColumn = saveError.code === '42703'
              || saveError.code === 'PGRST204'
              || (saveError.message || '').includes("'settings' column");

            if (missingSettingsColumn) {
              const { data: row, error: fetchErr } = await supabase
                .from('tournaments')
                .select('data')
                .eq('id', activeTournamentId)
                .maybeSingle();

              if (fetchErr) throw fetchErr;

              const currentData = ((row as { data?: Record<string, unknown> } | null)?.data || {}) as Record<string, unknown>;
              const nextData: Record<string, unknown> = { ...currentData };

              if (typeof nextData.tournament === 'object' && nextData.tournament !== null) {
                const currentTournament = nextData.tournament as Record<string, unknown>;
                const currentTournamentSettings = (currentTournament.settings as Record<string, unknown> | undefined) || {};
                nextData.tournament = {
                  ...currentTournament,
                  settings: {
                    ...currentTournamentSettings,
                    sponsors: nextSponsors
                  }
                };
              } else {
                const currentSettings = (nextData.settings as Record<string, unknown> | undefined) || {};
                nextData.settings = {
                  ...currentSettings,
                  sponsors: nextSponsors
                };
              }

              const { error: updateDataErr } = await supabase
                .from('tournaments')
                .update({ data: nextData })
                .eq('id', activeTournamentId);

              if (updateDataErr) throw updateDataErr;
              cloudSaved = true;
            } else {
              throw error;
            }
          } else {
            cloudSaved = true;
          }
        } catch (cloudErr) {
          console.warn('Supabase sponsor save failed, using local fallback:', cloudErr);
        }
      }

      const activeDb = dbManager.getActiveTournament();
      if (activeDb && activeDb.tournament.id === activeTournamentId) {
        activeDb.tournament = { ...activeDb.tournament, settings: updatedSettings };
        await localStore.saveTournament(activeDb);
      }

      setTournaments(prev => prev.map(t => (
        t.id === activeTournamentId ? { ...t, settings: updatedSettings } : t
      )));
      setSponsors(nextSponsors);

      if (!cloudSaved && supabase) {
        alert('Sponsor saved locally. Cloud sync is temporarily unavailable.');
      }
      return true;
    } catch (err) {
      console.error('Failed to save sponsors:', err);
      alert('Failed to save sponsor data. Please try again.');
      return false;
    } finally {
      setSavingSponsors(false);
    }
  };

  const persistTickerSpeed = async (speed: number) => {
    if (!activeTournamentId) return;
    const activeTournament = tournaments.find(t => t.id === activeTournamentId)
      || dbManager.getActiveTournament()?.tournament
      || null;
    if (!activeTournament) return;
    try {
      setSavingSpeed(true);
      const updatedSettings = {
        ...(activeTournament.settings || {}),
        ticker_speed: speed
      };
      if (supabase) {
        try {
          await supabase
            .from('tournaments')
            .update({ settings: updatedSettings })
            .eq('id', activeTournamentId);
        } catch { /* ignore cloud error, fall through to local */ }
      }
      (dbManager as any).updateTournamentSettings?.(activeTournamentId, updatedSettings);
      setTournaments(prev => prev.map(t => (
        t.id === activeTournamentId ? { ...t, settings: updatedSettings } : t
      )));
      setTickerSpeed(speed);
    } finally {
      setSavingSpeed(false);
    }
  };

  const openAddSponsorModal = () => {
    if (!activeTournamentId) {
      alert('Please set an active tournament first.');
      return;
    }
    setSponsorDraft({ id: null, name: '', logo_url: '', website_url: '' });
    setIsSponsorModalOpen(true);
  };

  const openEditSponsorModal = (id: string) => {
    const current = sponsors.find(s => s.id === id);
    if (!current) return;
    setSponsorDraft({
      id: current.id,
      name: current.name,
      logo_url: current.logo_url,
      website_url: current.website_url || ''
    });
    setIsSponsorModalOpen(true);
  };

  const handleSaveSponsorModal = async () => {
    if (!sponsorDraft.name.trim()) {
      alert('Sponsor name is required.');
      return;
    }
    if (!sponsorDraft.logo_url.trim()) {
      alert('Logo URL is required.');
      return;
    }

    let nextSponsors: SponsorItem[];
    if (sponsorDraft.id) {
      nextSponsors = sponsors.map(s => (
        s.id === sponsorDraft.id
          ? {
              ...s,
              name: sponsorDraft.name.trim(),
              logo_url: sponsorDraft.logo_url.trim(),
              website_url: sponsorDraft.website_url.trim()
            }
          : s
      ));
    } else {
      nextSponsors = [
        ...sponsors,
        {
          id: generateUUID(),
          name: sponsorDraft.name.trim(),
          logo_url: sponsorDraft.logo_url.trim(),
          website_url: sponsorDraft.website_url.trim(),
          active: true,
          order: sponsors.length
        }
      ];
    }

    const ok = await persistSponsors(nextSponsors);
    if (ok) {
      setIsSponsorModalOpen(false);
    }
  };

  const handleSponsorLogoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please choose an image file for the sponsor logo.');
      event.target.value = '';
      return;
    }

    const maxBytes = MAX_SPONSOR_LOGO_SIZE_MB * 1024 * 1024;
    if (file.size > maxBytes) {
      alert(`Logo image is too large. Maximum size is ${MAX_SPONSOR_LOGO_SIZE_MB}MB.`);
      event.target.value = '';
      return;
    }

    compressImage(file, (result) => {
      setSponsorDraft(prev => ({ ...prev, logo_url: result }));
      event.target.value = '';
    });
  };

  const handleDeleteSponsor = async (id: string) => {
    const current = sponsors.find(s => s.id === id);
    if (!current) return;
    if (!window.confirm(`Delete sponsor "${current.name}"?`)) return;

    const nextSponsors = sponsors
      .filter(s => s.id !== id)
      .map((s, idx) => ({ ...s, order: idx }));

    await persistSponsors(nextSponsors);
  };

  const handleToggleSponsorActive = async (id: string) => {
    const nextSponsors = sponsors.map((sponsor) => (
      sponsor.id === id
        ? { ...sponsor, active: !sponsor.active }
        : sponsor
    ));

    await persistSponsors(nextSponsors);
  };

  const handleMoveSponsor = async (id: string, direction: 'up' | 'down') => {
    const currentIndex = sponsors.findIndex((sponsor) => sponsor.id === id);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= sponsors.length) return;

    const nextSponsors = [...sponsors];
    const currentSponsor = nextSponsors[currentIndex];
    nextSponsors[currentIndex] = nextSponsors[targetIndex];
    nextSponsors[targetIndex] = currentSponsor;

    await persistSponsors(nextSponsors.map((sponsor, index) => ({
      ...sponsor,
      order: index
    })));
  };

  const handleSetAsActive = async (id: string, name: string) => {
    try {
      const success = await dbManager.setActiveTournament(id);
      if (success) {
        setActiveTournamentId(id);
        setTournamentName(name);
        triggerRefresh();
        alert(`Successfully set "${name}" as the active tournament.`);
      } else {
        // If it doesn't exist locally yet, we must initialize the local DB for it.
        // Assuming supabase has it, fetch it and save to local.
        if (supabase) {
           const { data } = await supabase.from('tournaments').select('*').eq('id', id).single();
           if (data) {
             const newDb: TournamentDatabase = {
               tournament: data,
               participants: [],
               categories: [],
               clubs: [],
               coaches: [],
               bouts: [],
               payments: [],
               medical: [],
               documents: [],
               teams: [],
               team_members: [],
               participant_categories: [],
               activity_logs: [],
               audit_logs: [],
               officials: [],
               display_playlists: []
             };
             await localStore.saveTournament(newDb);
             await dbManager.setActiveTournament(id);
             setActiveTournamentId(id);
             setTournamentName(name);
             triggerRefresh();
             alert(`Successfully initialized and set "${name}" as the active tournament.`);
           }
        } else {
          alert('Failed to set active tournament. Database not found.');
        }
      }
    } catch (err) {
      console.error(err);
      alert('Error setting active tournament.');
    }
  };

  const handleDelete = async (t: Tournament) => {
    if (!confirm(`Are you sure you want to delete "${t.name}"?`)) return;
    
    try {
      if (supabase) {
        await supabase.from('tournaments').update({ status: 'Deleted' }).eq('id', t.id);
      }
      // Re-load list
      await loadTournaments();
      
      // If deleted was active, clear it
      if (activeTournamentId === t.id) {
        localStorage.removeItem('ts_active_tournament_id');
        setActiveTournamentId(null);
        setTournamentName('Select Tournament');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to delete tournament.');
    }
  };

  const handleSaveTournament = async (payload: Partial<Tournament>) => {
    if (supabase) {
      if (payload.id) {
        // Update
        const { error } = await supabase.from('tournaments').update(payload).eq('id', payload.id);
        if (error) throw error;
        
        // Also update localStore if it's the active one
        if (payload.id === activeTournamentId) {
          const activeDb = dbManager.getActiveTournament();
          if (activeDb) {
            activeDb.tournament = { ...activeDb.tournament, ...payload } as Tournament;
            await localStore.saveTournament(activeDb);
            if (payload.name) setTournamentName(payload.name);
          }
        }
      } else {
        // Insert
        const newId = generateUUID();
        const { error } = await supabase.from('tournaments').insert([{ ...payload, id: newId }]);
        if (error) throw error;
      }
    } else {
      throw new Error('Supabase is not connected. Cannot save tournament globally.');
    }
    
    await loadTournaments();
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen" style={{ background: '#0a101f' }}>
      
      {/* Top Action Bar (from Screenshot 1) */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-white/5 bg-[#0a101f]">
        <div className="flex items-center gap-4">
          <div className="h-8 flex items-center">
            {/* SP SPORTDATA SOLUTION Logo Mock */}
            <div className="flex items-center text-white font-black italic tracking-tighter text-xl cursor-default">
              <span className="text-red-600 mr-1">SP</span> SPORTDATA
              <span className="text-[10px] text-red-600 font-normal tracking-widest ml-2 block mt-1.5">-SOLUTION-</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setActiveTab('Media Playlist')} className="flex items-center gap-2 px-5 py-2 bg-[#1e293b] hover:bg-[#334155] border border-white/10 rounded-full text-sm font-bold text-white transition cursor-pointer shadow-sm">
            <List className="h-4 w-4 text-cyan-400" /> Manage Playlists
          </button>
          <a href={displayUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-5 py-2 bg-cyan-900/20 hover:bg-cyan-900/40 border border-cyan-500/30 rounded-full text-sm font-bold text-cyan-400 transition cursor-pointer shadow-sm">
            <MonitorPlay className="h-4 w-4" /> Open Tournament Display <ExternalLink className="h-3.5 w-3.5 ml-1 opacity-70" />
          </a>
          <button onClick={() => window.open(displayUrl, '_blank')} className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black rounded-full text-sm font-black tracking-wide shadow-[0_0_15px_rgba(34,211,238,0.4)] transition cursor-pointer">
            <MonitorPlay className="h-4 w-4" /> Launch Display Screen
          </button>
        </div>
      </div>

      {/* Top Tabs */}
      <div className="px-6 py-3 border-b border-white/5 flex items-center gap-3 overflow-x-auto bg-[#0a101f]">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.name;
          return (
            <button
              key={tab.name}
              onClick={() => setActiveTab(tab.name)}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold transition whitespace-nowrap cursor-pointer rounded-full border ${
                isActive 
                  ? 'text-cyan-400 border-cyan-500/30 bg-cyan-950/30 shadow-[inset_0_0_20px_rgba(34,211,238,0.1)]' 
                  : 'text-slate-400 hover:text-white border-transparent hover:bg-white/5'
              }`}
            >
              <span className={isActive ? 'text-cyan-400' : 'text-slate-500'}>{tab.icon}</span>
              {tab.name}
            </button>
          );
        })}
      </div>

      <div className="p-6 max-w-7xl mx-auto space-y-6 text-white pb-20">
        
        {activeTab === 'Dashboard Overview' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* 3 Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1 */}
              <div className="rounded-2xl p-6 border border-white/10 bg-[#0f172a] shadow-xl flex flex-col justify-between hover:border-cyan-500/30 transition-colors">
                <div className="flex items-center justify-between mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-950/50 flex items-center justify-center border border-cyan-500/20 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.15)]">
                    <Trophy className="h-6 w-6" />
                  </div>
                  <span className="text-xs font-black text-slate-500 tracking-wider">ACTIVE TOURNAMENT</span>
                </div>
                <div>
                  <h2 className="text-xl font-black text-white mb-2 truncate" title={activeTournamentId ? (tournaments.find(t => t.id === activeTournamentId)?.name || 'No Active Event') : 'No Active Event'}>
                    {activeTournamentId ? (tournaments.find(t => t.id === activeTournamentId)?.name || 'No Active Event') : 'No Active Event'}
                  </h2>
                  <p className="text-sm text-slate-400 mb-6 font-medium">Configure active championship event</p>
                  <button onClick={() => setActiveTab('Tournament Details')} className="text-sm font-bold text-cyan-400 hover:text-cyan-300 transition flex items-center gap-1 cursor-pointer">
                    Manage Details <span className="text-lg leading-none">&rsaquo;</span>
                  </button>
                </div>
              </div>

              {/* Card 2 */}
              <div className="rounded-2xl p-6 border border-white/10 bg-[#0f172a] shadow-xl flex flex-col justify-between hover:border-cyan-500/30 transition-colors">
                <div className="flex items-center justify-between mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-950/50 flex items-center justify-center border border-cyan-500/20 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.15)]">
                    <Shield className="h-6 w-6" />
                  </div>
                  <span className="text-xs font-black text-slate-500 tracking-wider">ACTIVE SPONSORS</span>
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white mb-2 flex items-baseline gap-2">
                    <span className="text-4xl">{sponsors.length}</span> 
                    <span className="text-lg text-slate-300 font-bold tracking-tight">Logos Displaying</span>
                  </h2>
                  <p className="text-sm text-slate-400 mb-6 font-medium">Sponsor wall ticker overlay on broadcast</p>
                  <button onClick={() => setActiveTab('Sponsor Management')} className="text-sm font-bold text-cyan-400 hover:text-cyan-300 transition flex items-center gap-1 cursor-pointer">
                    Manage Sponsors <span className="text-lg leading-none">&rsaquo;</span>
                  </button>
                </div>
              </div>

              {/* Card 3 */}
              <div className="rounded-2xl p-6 border border-white/10 bg-[#0f172a] shadow-xl flex flex-col justify-between hover:border-cyan-500/30 transition-colors">
                <div className="flex items-center justify-between mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-950/50 flex items-center justify-center border border-cyan-500/20 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.15)]">
                    <List className="h-6 w-6" />
                  </div>
                  <span className="text-xs font-black text-slate-500 tracking-wider">DATABASE PLAYLISTS</span>
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white mb-2 flex items-baseline gap-2">
                    <span className="text-3xl">Multi-Slide</span> 
                    <span className="text-sm text-cyan-400 font-bold tracking-tight">Rotation Player</span>
                  </h2>
                  <p className="text-sm text-slate-400 mb-6 font-medium">Scoreboards, Brackets, Medals, Kata & Schedule</p>
                  <button onClick={() => setActiveTab('Media Playlist')} className="text-sm font-bold text-cyan-400 hover:text-cyan-300 transition flex items-center gap-1 cursor-pointer">
                    Open Playlist Manager <span className="text-lg leading-none">&rsaquo;</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Banner */}
            <div className="rounded-3xl p-8 border border-white/10 bg-gradient-to-br from-[#0f172a] to-[#020617] shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
              {/* Abstract background glow */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />
              
              <div className="relative z-10 flex-1">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="h-4 w-4 text-cyan-400" />
                  <span className="text-xs font-black text-cyan-400 tracking-[0.2em] uppercase">KARATETECH PRESENTATION ENGINE V2.5</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-2">Ready to stream live tournament results?</h2>
                <p className="text-slate-400 max-w-2xl font-medium leading-relaxed">Launch full-screen broadcast mode to project real-time scoreboards, WKF Kata scores, brackets, and sponsor logos onto spectator displays.</p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4 relative z-10 shrink-0 mt-4 md:mt-0">
                <button onClick={() => setActiveTab('Media Playlist')} className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-[#1e293b] hover:bg-[#334155] border border-white/10 rounded-full text-sm font-bold text-white transition cursor-pointer shadow-lg">
                  <List className="h-4 w-4 text-cyan-400" /> Manage Playlists
                </button>
                <button onClick={() => window.open(displayUrl, '_blank')} className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black rounded-full text-sm font-black tracking-wide shadow-[0_0_20px_rgba(34,211,238,0.4)] transition cursor-pointer">
                  <MonitorPlay className="h-4 w-4" /> Launch Display Screen
                </button>
              </div>
            </div>

            {/* Public Share Link Component */}
            <div className="mt-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
              <TournamentShareLink 
                tournamentId={activeTournamentId || undefined} 
                tournamentName={activeTournamentId ? tournaments.find(t => t.id === activeTournamentId)?.name : undefined}
              />
            </div>
          </div>
        )}

        {activeTab === 'Sponsor Management' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Module */}
            <div className="rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-white/5 bg-[#0f172a] shadow-xl">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/20 text-cyan-400 shadow-[inset_0_0_15px_rgba(34,211,238,0.1)]">
                  <Shield className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-extrabold tracking-tight">Sponsor Management</h1>
                  <p className="text-sm text-slate-400 mt-1">Configure partner logos, websites, order priorities, and active display visibility.</p>
                </div>
              </div>
              <button
                onClick={openAddSponsorModal}
                disabled={savingSponsors}
                className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:opacity-50 text-black font-extrabold rounded-full shadow-[0_0_15px_rgba(34,211,238,0.3)] transition cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <Plus className="h-4 w-4" /> Add Sponsor
              </button>
            </div>

            {/* Ticker Speed Control */}
            <div className="rounded-2xl p-5 border border-white/10 bg-[#0f172a] shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">Ticker Scroll Speed</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Controls how fast the sponsor banner scrolls across the display screen.</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-500/20 px-3 py-1 rounded-lg">
                    {tickerSpeed}s / loop
                  </span>
                  <button
                    onClick={() => persistTickerSpeed(tickerSpeed)}
                    disabled={savingSpeed}
                    className="px-4 py-1.5 text-xs font-extrabold bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:opacity-50 text-black rounded-full transition cursor-pointer"
                  >
                    {savingSpeed ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 w-12 text-right font-mono">Fast</span>
                <input
                  type="range"
                  min={5}
                  max={60}
                  step={1}
                  value={tickerSpeed}
                  onChange={(e) => setTickerSpeed(Number(e.target.value))}
                  className="flex-1 h-2 rounded-full appearance-none cursor-pointer accent-cyan-400"
                />
                <span className="text-xs text-slate-500 w-12 font-mono">Slow</span>
              </div>
              <div className="flex justify-between mt-1 px-[3.5rem]">
                <span className="text-[10px] text-slate-600">5s</span>
                <span className="text-[10px] text-slate-600">30s</span>
                <span className="text-[10px] text-slate-600">60s</span>
              </div>
            </div>

            {/* Sponsor Content */}
            {sponsors.length === 0 ? (
              <div className="rounded-3xl border border-white/5 bg-[#0f172a] flex flex-col items-center justify-center py-24 px-6 text-center shadow-xl">
                <div className="w-20 h-20 rounded-3xl bg-[#1e293b] border border-white/5 flex items-center justify-center mb-6 shadow-inner">
                  <Folder className="h-8 w-8 text-cyan-400" />
                </div>
                <h2 className="text-2xl font-black text-white mb-3 tracking-tight">No Sponsors Found</h2>
                <p className="text-slate-400 max-w-md font-medium mb-8">You currently have no active sponsors in the system. Add your first sponsor logo to display on public screen rotation.</p>
                <button
                  onClick={openAddSponsorModal}
                  disabled={savingSponsors}
                  className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:opacity-50 text-black font-extrabold rounded-full shadow-[0_0_15px_rgba(34,211,238,0.3)] transition cursor-pointer flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" /> Add Sponsor
                </button>
              </div>
            ) : (
              <div className="rounded-3xl border border-white/5 bg-[#0f172a] shadow-xl p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {sponsors.map((sponsor, index) => (
                    <div key={sponsor.id} className="rounded-2xl border border-white/10 bg-black/20 p-4 flex flex-col gap-3">
                      <div className="h-24 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                        {sponsor.logo_url ? (
                          <img
                            src={sponsor.logo_url}
                            alt={sponsor.name}
                            className="max-h-full max-w-full object-contain"
                            onError={(e) => {
                              const target = e.currentTarget;
                              target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <span className="text-xs text-slate-500">No Logo</span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-sm font-black text-white truncate">{sponsor.name}</h3>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${sponsor.active ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-white/5 text-slate-400 border border-white/10'}`}>
                            {sponsor.active ? 'Loop On' : 'Loop Off'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">{sponsor.website_url || 'No website set'}</p>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => handleToggleSponsorActive(sponsor.id)}
                          disabled={savingSponsors}
                          className={`px-3 py-2 rounded-lg disabled:opacity-50 border text-[11px] font-black cursor-pointer ${sponsor.active ? 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20 text-emerald-300' : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'}`}
                        >
                          {sponsor.active ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          onClick={() => handleMoveSponsor(sponsor.id, 'up')}
                          disabled={savingSponsors || index === 0}
                          className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 border border-white/10 text-[11px] font-black text-white cursor-pointer flex items-center justify-center gap-1"
                        >
                          <ChevronUp className="h-3.5 w-3.5" /> Up
                        </button>
                        <button
                          onClick={() => handleMoveSponsor(sponsor.id, 'down')}
                          disabled={savingSponsors || index === sponsors.length - 1}
                          className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 border border-white/10 text-[11px] font-black text-white cursor-pointer flex items-center justify-center gap-1"
                        >
                          <ChevronDown className="h-3.5 w-3.5" /> Down
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditSponsorModal(sponsor.id)}
                          disabled={savingSponsors}
                          className="flex-1 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50 border border-white/10 text-xs font-bold text-white cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteSponsor(sponsor.id)}
                          disabled={savingSponsors}
                          className="flex-1 px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 disabled:opacity-50 border border-red-500/20 text-xs font-bold text-red-400 cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'Media Playlist' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Module */}
            <div className="rounded-3xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border border-white/5 bg-[#0f172a] shadow-xl">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/20 text-cyan-400 shadow-[inset_0_0_15px_rgba(34,211,238,0.1)]">
                  <Film className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-extrabold tracking-tight">Display Playlist Module</h1>
                  <p className="text-sm text-slate-400 mt-1 max-w-lg">Manage videos (MP4 / WebM) and image slides (JPG / PNG), set display timers, and reorder rotation sequence.</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button 
                  onClick={() => {
                    const activeT = typeof window !== 'undefined' ? localStorage.getItem('ts_active_tournament_id') : null;
                    const target = activeT ? `${basePath}/display?tournament=${encodeURIComponent(activeT)}` : `${basePath}/display`;
                    window.open(target, '_blank', 'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no,scrollbars=no,resizable=yes');
                  }}
                  className="px-5 py-2.5 border border-cyan-500/30 bg-cyan-950/20 hover:bg-cyan-950/40 text-cyan-400 font-bold rounded-full transition cursor-pointer flex items-center gap-2 whitespace-nowrap text-sm shadow-sm"
                >
                  <RefreshCw className="h-4 w-4" /> Loop All Display
                </button>

                <button
                  onClick={() => setAddMediaTriggerKey(prev => prev + 1)}
                  className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black font-extrabold rounded-full shadow-[0_0_15px_rgba(34,211,238,0.3)] transition cursor-pointer flex items-center gap-2 whitespace-nowrap text-sm"
                >
                  <Plus className="h-4 w-4" /> Add Media
                </button>
              </div>
            </div>

            {/* Reusing our inline playlist logic inside the mock empty state for now */}
            <div className="rounded-3xl border border-white/5 bg-[#0f172a] shadow-xl overflow-hidden p-6">
              <DisplayPlaylistModal
                isOpen={true}
                inline={true}
                addMediaTriggerKey={addMediaTriggerKey}
                addMediaSlideType="video"
                onClose={() => {}}
              />
            </div>
          </div>
        )}

        {activeTab === 'Tournament Details' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Module Container */}
            <div className="rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-white/5 bg-[#0f172a] shadow-xl">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/20 text-cyan-400 shadow-[inset_0_0_15px_rgba(34,211,238,0.1)]">
                  <Trophy className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-extrabold tracking-tight">Tournament Details Module</h1>
                  <p className="text-sm text-slate-400 mt-1">Manage tournament events, venues, schedules, and active broadcast display target.</p>
                </div>
              </div>
              <button
                onClick={() => { setEditingTournament(null); setIsModalOpen(true); }}
                className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black font-extrabold rounded-full shadow-[0_0_15px_rgba(34,211,238,0.3)] transition cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <Plus className="h-4 w-4" />
                Add Tournament
              </button>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
              </div>
            )}

            {/* Tournament Cards Grid */}
            {!loading && tournaments.length === 0 && (
              <div className="text-center py-20 bg-[#0f172a] rounded-3xl border border-white/5 shadow-xl">
                <p className="text-slate-400 font-medium">No tournaments found. Click &quot;Add Tournament&quot; to get started.</p>
              </div>
            )}

            {!loading && tournaments.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {tournaments.map((t) => {
                  const isActive = activeTournamentId === t.id;
                  
                  return (
                    <div 
                      key={t.id}
                      className="rounded-3xl flex flex-col overflow-hidden transition-all duration-300"
                      style={{ 
                        background: '#0f172a', 
                        border: `1px solid ${isActive ? 'rgba(34,211,238,0.5)' : 'rgba(255,255,255,0.05)'}`,
                        boxShadow: isActive ? '0 0 30px rgba(34,211,238,0.1)' : '0 10px 30px -10px rgba(0,0,0,0.5)'
                      }}
                    >
                      <div className="p-6 flex-1 space-y-4">
                        {/* Header: Logo + Title */}
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-xl bg-[#1e293b] border border-white/5 flex items-center justify-center shrink-0 font-black text-sm text-center leading-tight tracking-tighter" style={{ color: '#94a3b8' }}>
                            {t.name.substring(0, 6).toUpperCase()}...
                          </div>
                          <div className="flex-1 min-w-0">
                            <h2 className="text-lg font-black tracking-tight leading-tight uppercase truncate">{t.name}</h2>
                            <p className="text-xs font-bold text-cyan-400 uppercase tracking-widest mt-1 truncate">{t.organizer}</p>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="space-y-2 pt-2">
                          <div className="flex items-center gap-2 text-sm text-slate-300">
                            <Calendar className="h-4 w-4 text-slate-500" />
                            <span>{t.date || new Date(t.date_iso).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-start gap-2 text-sm text-slate-300">
                            <MapPin className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
                            <span className="truncate">{t.venue}{t.city ? `, ${t.city}` : ''}</span>
                          </div>
                        </div>

                        {/* Description Mock */}
                        <div className="pt-2">
                           <div className="w-full bg-black/20 border border-white/5 rounded-xl p-3 text-xs text-slate-500">
                             No additional description provided.
                           </div>
                        </div>

                        {/* Status badges Mock (matching screenshot UI) */}
                        <div className="flex items-center gap-6 pt-2">
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                            N/A
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                            N/A
                          </div>
                        </div>
                      </div>

                      {/* Actions Footer */}
                      <div className="px-6 py-4 border-t border-white/5 bg-black/20 flex items-center justify-between">
                        <button
                          onClick={() => handleSetAsActive(t.id, t.name)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition cursor-pointer ${
                            isActive 
                              ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 cursor-default' 
                              : 'bg-white/5 hover:bg-white/10 border border-white/5 text-slate-300 hover:text-white'
                          }`}
                          disabled={isActive}
                        >
                          <CheckCircle className={`h-4 w-4 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                          {isActive ? 'Active Target' : 'Set as Active'}
                        </button>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => { setEditingTournament(t); setIsModalOpen(true); }}
                            className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/5 text-slate-300 hover:text-white rounded-full transition cursor-pointer"
                            title="Edit Tournament"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(t)}
                            className="p-2.5 bg-white/5 hover:bg-red-500/10 border border-white/5 text-slate-300 hover:text-red-400 rounded-full transition cursor-pointer"
                            title="Delete Tournament"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <TournamentFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        tournament={editingTournament}
        onSave={handleSaveTournament}
      />

      {isSponsorModalOpen && (
        <div className="fixed inset-0 z-[350] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl border border-cyan-500/20 bg-[#0f172a] shadow-2xl p-6 space-y-4">
            <h3 className="text-lg font-black text-white tracking-tight">
              {sponsorDraft.id ? 'Edit Sponsor' : 'Add Sponsor'}
            </h3>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Sponsor Name</label>
              <input
                value={sponsorDraft.name}
                onChange={(e) => setSponsorDraft(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/15 text-white focus:outline-none focus:border-cyan-400"
                placeholder="e.g. ABC Sports"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Logo URL</label>
              <input
                value={sponsorDraft.logo_url}
                onChange={(e) => setSponsorDraft(prev => ({ ...prev, logo_url: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/15 text-white focus:outline-none focus:border-cyan-400"
                placeholder="https://..."
              />
              <div className="pt-1">
                <label className="text-[11px] font-semibold text-slate-400">or upload from local drive</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleSponsorLogoFileChange}
                  className="mt-1 block w-full text-xs text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-cyan-500/20 file:px-3 file:py-2 file:text-xs file:font-bold file:text-cyan-300 hover:file:bg-cyan-500/30"
                />
                <p className="mt-1 text-[11px] text-slate-500">PNG, JPG, SVG, WebP. Max {MAX_SPONSOR_LOGO_SIZE_MB}MB.</p>
              </div>
              {sponsorDraft.logo_url ? (
                <div className="mt-2 rounded-lg border border-white/10 bg-black/20 p-3">
                  <div className="h-20 rounded-md bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                    <img
                      src={sponsorDraft.logo_url}
                      alt="Sponsor logo preview"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setSponsorDraft(prev => ({ ...prev, logo_url: '' }))}
                      className="px-2.5 py-1.5 rounded-md bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-[11px] font-bold text-red-300"
                    >
                      Remove Logo
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Website URL (Optional)</label>
              <input
                value={sponsorDraft.website_url}
                onChange={(e) => setSponsorDraft(prev => ({ ...prev, website_url: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/15 text-white focus:outline-none focus:border-cyan-400"
                placeholder="https://..."
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsSponsorModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-bold text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSponsorModal}
                disabled={savingSponsors}
                className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-sm font-black text-black"
              >
                {savingSponsors ? 'Saving...' : 'Save Sponsor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
