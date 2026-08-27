'use client';

import React, { useState, useEffect } from 'react';
import { useTournament, SystemUser, AccessibilitySettings } from '@/context/TournamentContext';
import { db, basePath, supabase } from '@/db/dbClient';
import { 
  Save, Trash2, ShieldAlert, UserPlus, Edit2, Check, X, 
  Shield, Users, Eye, Accessibility, Info, Trophy, Palette, Lock, Camera
} from 'lucide-react';

export default function SettingsPage() {
  const { 
    tournamentName, setTournamentName, 
    liveStreamUrl, setLiveStreamUrl, 
    userRole, 
    logoUrl, setLogoUrl,
    usersList, addUser, updateUser, deleteUser,
    globalAccessibility, setGlobalAccessibility,
    consoleTheme, setConsoleTheme,
    refereeTheme, setRefereeTheme,
    canModify
  } = useTournament();

  const [localName, setLocalName] = useState(tournamentName);
  const [localStream, setLocalStream] = useState(liveStreamUrl);
  const [localLogo, setLocalLogo] = useState(logoUrl);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [startingNew, setStartingNew] = useState(false);
  const [newTName, setNewTName] = useState('New Karate Championship 2026');
  const [newTDate, setNewTDate] = useState(new Date().toISOString().split('T')[0]);
  const [newTVenue, setNewTVenue] = useState('Dewan Serbaguna Puchong');
  const [newTCity, setNewTCity] = useState('Puchong, Selangor');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isCoAdmin = userRole === 'Co-Admin';

  // 1. Accessibility local state
  const [localAccessibility, setLocalAccessibility] = useState<AccessibilitySettings>(globalAccessibility);

  // 2. User creation state
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'Admin' | 'Co-Admin' | 'Viewer'>('Co-Admin');
  const [newUserStatus, setNewUserStatus] = useState<'Active' | 'Suspended'>('Active');
  const [newUserCanModify, setNewUserCanModify] = useState(false);
  
  // Custom accessibility overrides per user
  const [customizeUserAccessibility, setCustomizeUserAccessibility] = useState(false);
  const [newUserAccessibility, setNewUserAccessibility] = useState<AccessibilitySettings>({
    themeContrast: 'standard',
    textScale: 'standard',
    reducedMotion: false,
    legibilityFont: 'standard'
  });

  // 3. User editing state
  const [editingUserEmail, setEditingUserEmail] = useState<string | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserRole, setEditUserRole] = useState<'Admin' | 'Co-Admin' | 'Viewer'>('Co-Admin');
  const [editUserStatus, setEditUserStatus] = useState<'Active' | 'Suspended'>('Active');
  const [editUserCanModify, setEditUserCanModify] = useState(false);
  const [editUserAccessibility, setEditUserAccessibility] = useState<AccessibilitySettings>({
    themeContrast: 'standard',
    textScale: 'standard',
    reducedMotion: false,
    legibilityFont: 'standard'
  });



  const [showPointHistoryReferee, setShowPointHistoryReferee] = useState(false);
  const [showPointHistoryPublic, setShowPointHistoryPublic] = useState(false);
  const [showPointHistoryStream, setShowPointHistoryStream] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {


      setShowPointHistoryReferee(localStorage.getItem('ts_show_point_history_referee') === 'true');
      setShowPointHistoryPublic(localStorage.getItem('ts_show_point_history_public') === 'true');
      setShowPointHistoryStream(localStorage.getItem('ts_show_point_history_stream') === 'true');
    }
  }, []);

  useEffect(() => {
    setLocalName(tournamentName);
  }, [tournamentName]);

  useEffect(() => {
    setLocalStream(liveStreamUrl);
  }, [liveStreamUrl]);

  useEffect(() => {
    setLocalLogo(logoUrl);
  }, [logoUrl]);

  useEffect(() => {
    setLocalAccessibility(globalAccessibility);
  }, [globalAccessibility]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file (PNG/JPG/SVG/WebP).');
        return;
      }
      if (file.size > 800 * 1024) {
        alert('Image is too large. Please select a logo under 800KB to optimize performance.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setLocalLogo(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      setTournamentName(localName);
      setLiveStreamUrl(localStream);
      setLogoUrl(localLogo);
      setGlobalAccessibility(localAccessibility);

      // Save upcoming tournament configs
      if (typeof window !== 'undefined') {


        localStorage.setItem('ts_show_point_history_referee', String(showPointHistoryReferee));
        localStorage.setItem('ts_show_point_history_public', String(showPointHistoryPublic));
        localStorage.setItem('ts_show_point_history_stream', String(showPointHistoryStream));
      }

      // Sync active tournament name to Supabase (admin/co-admin only)
      if (supabase && canModify) {
        const { data: tList } = await supabase.from('tournaments').select('*');
        const featured = tList?.find((t: any) => t.featured && !t.deleted_at) || tList?.find((t: any) => !t.deleted_at);
        if (featured) {
          await supabase
            .from('tournaments')
            .update({ name: localName })
            .eq('id', featured.id);
        }
      }

      setMessage({ type: 'success', text: 'System settings saved successfully.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save settings.' });
    } finally {
      setSaving(false);
    }
  };



  const handleResetDatabase = async () => {
    const doubleConfirm = window.confirm(
      'WARNING: This will completely wipe all bouts, schedule data, and reset all participants to seed status. This action cannot be undone. Do you wish to proceed?'
    );
    if (!doubleConfirm) return;

    setResetting(true);
    setMessage(null);
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('ts_bouts');
        localStorage.removeItem('ts_participants');
        localStorage.removeItem('ts_participant_categories');
        localStorage.removeItem('ts_seed_version'); // force re-seeding
        
        setMessage({ type: 'success', text: 'Database reset successfully. Reloading...' });
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Reset failed.' });
      setResetting(false);
    }
  };

  const handleStartNewTournament = async () => {
    if (!newTName.trim()) {
      alert('Please specify a tournament name.');
      return;
    }
    const confirmStart = window.confirm(
      `Are you sure you want to archive the current tournament "${tournamentName}" and clear all active participant and bout records to start "${newTName}"?`
    );
    if (!confirmStart) return;

    setStartingNew(true);
    setMessage(null);

    try {
      if (typeof window !== 'undefined' && supabase) {
        // 1. Fetch current database states for archiving
        const { data: dbParticipants } = await supabase.from('participants').select('id, full_name, club_id').is('deleted_at', null);
        const { data: dbClubs } = await supabase.from('clubs').select('id, name');
        const { data: dbCats } = await supabase.from('categories').select('id, name');
        const { data: dbBouts } = await supabase.from('bouts').select('*');

        const participantsCount = dbParticipants?.length || 0;
        const clubsCount = dbClubs?.length || 0;

        const championsList: any[] = [];
        const finalBoutsMap: Record<string, any> = {};

        if (dbBouts && dbBouts.length > 0) {
          dbBouts.forEach((b) => {
            const catId = b.category_id;
            if (b.round_no !== 99) {
              const currentMax = finalBoutsMap[catId];
              if (!currentMax || b.round_no > currentMax.round_no) {
                finalBoutsMap[catId] = b;
              }
            }
          });

          // Fetch champion names and dojos
          for (const catId in finalBoutsMap) {
            const finalBout = finalBoutsMap[catId];
            if (finalBout.winner_id && finalBout.status === 'Completed') {
              const winnerPart = dbParticipants?.find(p => p.id === finalBout.winner_id);
              const winnerClub = dbClubs?.find(c => c.id === winnerPart?.club_id);
              const category = dbCats?.find(c => c.id === catId);

              if (winnerPart && category) {
                championsList.push({
                  name: winnerPart.full_name,
                  club: winnerClub ? winnerClub.name : 'Unknown Dojo',
                  category: category.name,
                  medal: '🥇'
                });
              }
            }
          }
        }

        // 2. Format custom PastTournament object
        const newArchiveProfile = {
          id: `custom-tournament-${Date.now()}`,
          name: tournamentName,
          year: new Date().getFullYear(),
          date: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }),
          venue: 'Pusat Komersial Anggun City, Rawang',
          city: 'Rawang, Selangor',
          discipline: ['Kata', 'Kumite'],
          medals: {
            gold: championsList.length,
            silver: championsList.length,
            bronze: Math.round(championsList.length * 1.5)
          },
          totalParticipants: participantsCount,
          totalClubs: clubsCount,
          posterGradient: 'linear-gradient(135deg, #1e3a8a 0%, #1e1b4b 50%, #3b82f6 100%)',
          posterEmoji: '🥇',
          photos: [
            { id: 'p26-1', caption: 'Opening Ceremony', gradient: 'linear-gradient(135deg,#1e1b4b,#312e81)' },
            { id: 'p26-2', caption: 'Tournament Pools', gradient: 'linear-gradient(135deg,#7f1d1d,#b91c1c)' }
          ],
          champions: championsList
        };

        // Prepend to localStorage custom past tournaments list
        const storedCustom = localStorage.getItem('ts_custom_past_tournaments');
        const customPastList = storedCustom ? JSON.parse(storedCustom) : [];
        customPastList.unshift(newArchiveProfile);
        localStorage.setItem('ts_custom_past_tournaments', JSON.stringify(customPastList));

        // 3. Clear database tables
        const tablesToClear = [
          'bouts',
          'participant_categories',
          'team_members',
          'payments',
          'medical_records',
          'documents',
          'activity_logs',
          'teams',
          'participants',
          'clubs'
        ];

        for (const table of tablesToClear) {
          const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
          if (error) {
            console.error(`Failed to clear table ${table}:`, error.message);
          }
        }

        // Re-seed Host Club so we always have the default club
        const TARGET_CLUB = {
          id: '9a5e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f',
          name: 'Kelab Senshi Goju-Ryu Karate Do',
          city: 'Kuala Lumpur',
          state: 'W.P. Kuala Lumpur'
        };
        await supabase.from('clubs').insert([TARGET_CLUB]);

        // 4. Update current tournament name
        setTournamentName(newTName);

        // Sync new tournament metadata to active/featured row in Supabase
        const { data: tList } = await supabase.from('tournaments').select('*');
        const featured = tList?.find((t: any) => t.featured && !t.deleted_at) || tList?.find((t: any) => !t.deleted_at);
        if (featured) {
          const parseIso = (dateStr: string) => {
            const parsed = new Date(dateStr);
            return !isNaN(parsed.getTime()) ? parsed.toISOString() : new Date().toISOString();
          };

          await supabase
            .from('tournaments')
            .update({
              name: newTName,
              date: newTDate,
              date_iso: parseIso(newTDate),
              venue: newTVenue,
              city: newTCity,
              registration_close: newTDate,
              registration_close_iso: parseIso(newTDate),
              status: 'Open'
            })
            .eq('id', featured.id);
        }

        setMessage({ type: 'success', text: 'New tournament initialized and current records archived successfully! Reloading...' });
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to start new tournament.' });
      setStartingNew(false);
    }
  };

  // Accessibility selection toggler
  const handleAccessibilityChange = (key: keyof AccessibilitySettings, value: any) => {
    const updated = { ...localAccessibility, [key]: value };
    setLocalAccessibility(updated);
    setGlobalAccessibility(updated); // instant preview application
  };

  // User list actions
  const handleAddUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail) {
      alert('Please fill in user details.');
      return;
    }
    
    // Check duplication
    if (usersList.some(u => u.email.toLowerCase() === newUserEmail.toLowerCase())) {
      alert('A user with this email address already exists.');
      return;
    }

    addUser({
      name: newUserName,
      email: newUserEmail.trim(),
      role: newUserRole,
      status: newUserStatus,
      canModify: newUserCanModify,
      accessibility: customizeUserAccessibility ? newUserAccessibility : {
        themeContrast: 'standard',
        textScale: 'standard',
        reducedMotion: false,
        legibilityFont: 'standard'
      }
    });

    setNewUserName('');
    setNewUserEmail('');
    setNewUserRole('Co-Admin');
    setNewUserStatus('Active');
    setNewUserCanModify(false);
    setCustomizeUserAccessibility(false);
    setIsAddingUser(false);
    
    setMessage({ type: 'success', text: 'User added successfully.' });
  };

  const handleEditUserClick = (user: SystemUser) => {
    setEditingUserEmail(user.email);
    setEditUserName(user.name);
    setEditUserRole(user.role);
    setEditUserStatus(user.status);
    setEditUserCanModify(user.canModify || false);
    setEditUserAccessibility(user.accessibility || {
      themeContrast: 'standard',
      textScale: 'standard',
      reducedMotion: false,
      legibilityFont: 'standard'
    });
  };

  const handleEditUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserEmail) return;

    updateUser(editingUserEmail, {
      name: editUserName,
      role: editUserRole,
      status: editUserStatus,
      canModify: editUserCanModify,
      accessibility: editUserAccessibility
    });

    setEditingUserEmail(null);
    setMessage({ type: 'success', text: 'User details updated successfully.' });
  };

  const handleDeleteUserClick = (email: string) => {
    if (email === 'admin@senshikarate.com') {
      alert('Cannot delete the master Tournament Director account.');
      return;
    }
    if (confirm(`Are you sure you want to completely remove user ${email}?`)) {
      deleteUser(email);
      setMessage({ type: 'success', text: 'User deleted successfully.' });
    }
  };

  return (
    <div className="p-6 space-y-6 text-foreground w-full">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">System Settings</h1>
        <p className="text-sm text-muted-foreground">Configure championship parameters, live broadcasting streams, and system accessibility/access controls.</p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl border text-xs font-semibold ${
            message.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
              : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Championship Config */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4 shadow-xs">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            General Configuration
          </h2>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground block">Active Tournament name</label>
            <input
              type="text"
              value={localName}
              onChange={(e) => setLocalName(e.target.value)}
              disabled={!canModify}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary disabled:opacity-50 font-sans"
              placeholder="e.g. 1st Kelab Senshi Goju-Ryu Championship"
              required
            />
          </div>
        </div>



        {/* Branding Config */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4 shadow-xs">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Branding Configuration</h2>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Logo Preview */}
            <div className="flex flex-col items-center space-y-2">
              <span className="text-xs font-semibold text-muted-foreground block text-center sm:text-left w-full">Current Logo</span>
              <div className="h-24 w-24 rounded-full flex items-center justify-center overflow-hidden border border-border shadow-md bg-neutral-50 dark:bg-neutral-900 shrink-0">
                <img src={localLogo || `${basePath}/karatetech-logo.png`} alt="Tournament Logo" className="h-full w-full object-cover" />
              </div>
            </div>
            {/* Upload fields */}
            <div className="flex-1 space-y-3 w-full">
              <label className="text-xs font-medium text-foreground block">Upload Custom Logo</label>
              <div className="flex flex-wrap items-center gap-3">
                <label className={`px-4 py-2 border border-border hover:bg-secondary rounded-lg text-xs font-bold transition shadow-sm cursor-pointer inline-flex items-center justify-center ${!canModify ? 'opacity-50 pointer-events-none' : ''}`}>
                  <span>Choose File</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    disabled={!canModify}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setLocalLogo(`${basePath}/karatetech-logo.png`)}
                  disabled={!canModify}
                  className="px-4 py-2 border border-red-500/20 hover:border-red-500/40 text-red-500 hover:bg-red-500/5 rounded-lg text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                >
                  Reset to Default
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Supported formats: PNG, JPG, JPEG, SVG or WebP. Max file size: 800KB.
              </p>
            </div>
          </div>
        </div>

        {/* Livestream Config */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4 shadow-xs">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            Media & Broadcasting
          </h2>
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground block">Live Stream Embed URL</label>
            <input
              type="url"
              value={localStream}
              onChange={(e) => setLocalStream(e.target.value)}
              disabled={!canModify}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary disabled:opacity-50"
              placeholder="e.g. https://www.youtube.com/embed/live_stream_id"
            />
            <p className="text-[10px] text-muted-foreground">
              Provide an iframe-friendly embed URL (e.g. <code>https://www.youtube.com/embed/dQw4w9WgXcQ</code>).
            </p>
          </div>
        </div>

        {/* VR Recording Settings */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Camera className="h-4 w-4 text-primary" />
              VR Recording
            </h2>
            <button
              type="button"
              onClick={async () => {
                if (typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
                  try {
                    const devices = await navigator.mediaDevices.enumerateDevices();
                    const cams = devices.filter(device => device.kind === 'videoinput');
                    const nextIds = cams.map(device => ({ deviceId: device.deviceId || 'camera', label: device.label || 'Camera' }));
                    setMessage({ type: 'success', text: nextIds.length ? `Detected ${nextIds.length} webcam device(s).` : 'No webcam detected. Please connect a webcam before starting VR.' });
                  } catch {
                    setMessage({ type: 'error', text: 'Unable to refresh webcam list.' });
                  }
                }
              }}
              className="px-3 py-1.5 border border-border rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-secondary transition cursor-pointer"
            >
              Refresh Camera List
            </button>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-medium text-foreground block">Camera Device</label>
            <select
              value={localStorage.getItem('kt_vr_settings') ? JSON.parse(localStorage.getItem('kt_vr_settings') || '{}')?.cameraDeviceId || '' : ''}
              onChange={(e) => {
                const current = JSON.parse(localStorage.getItem('kt_vr_settings') || '{}');
                localStorage.setItem('kt_vr_settings', JSON.stringify({ ...current, cameraDeviceId: e.target.value }));
                window.location.reload();
              }}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            >
              <option value="">Default camera</option>
              <option value="camera-default">System default</option>
            </select>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground block">Video Resolution</label>
                <select
                  value={'1280x720'}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  onChange={() => undefined}
                >
                  <option value="640x480">640×480</option>
                  <option value="1280x720">1280×720</option>
                  <option value="1920x1080">1920×1080</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground block">Frame Rate</label>
                <select
                  value={30}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  onChange={() => undefined}
                >
                  <option value={30}>30 FPS</option>
                  <option value={60}>60 FPS</option>
                </select>
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground">
              No webcam detected. Please connect a webcam before starting VR.
            </p>
          </div>
        </div>

        {/* Scoreboard Settings */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4 shadow-xs">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            Scoreboard Settings
          </h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="showPointHistoryReferee"
                checked={showPointHistoryReferee}
                onChange={(e) => setShowPointHistoryReferee(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
              />
              <div>
                <label htmlFor="showPointHistoryReferee" className="text-xs font-semibold text-foreground block cursor-pointer select-none">
                  Show Point History on Referee Screen
                </label>
                <p className="text-[10px] text-muted-foreground">
                  Displays fighter scoring history below the total points on the match official scoring console (/dashboard/scoreboard).
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="showPointHistoryPublic"
                checked={showPointHistoryPublic}
                onChange={(e) => setShowPointHistoryPublic(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
              />
              <div>
                <label htmlFor="showPointHistoryPublic" className="text-xs font-semibold text-foreground block cursor-pointer select-none">
                  Show Point History on Public Scoreboard
                </label>
                <p className="text-[10px] text-muted-foreground">
                  Displays fighter scoring history below the total points on the public spectator screen (/display).
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="showPointHistoryStream"
                checked={showPointHistoryStream}
                onChange={(e) => setShowPointHistoryStream(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
              />
              <div>
                <label htmlFor="showPointHistoryStream" className="text-xs font-semibold text-foreground block cursor-pointer select-none">
                  Show Point History on Live Streaming Display
                </label>
                <p className="text-[10px] text-muted-foreground">
                  Hides/shows the scoring history layout specifically on stream overlay setups.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Console Theme Selection (4 Themes) */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">KarateTech Console Themes (Operating Console & Admin)</h2>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 rounded-lg text-[11px] font-bold text-amber-400">
              <Lock className="h-3 w-3" />
              <span>Scoreboard Red/Blue Locked</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Select the active operating theme for the KarateTech console UI. The competition scoreboard retains official 🔴 <strong>AKA (RED)</strong> and 🔵 <strong>AO (BLUE)</strong> independently in all themes.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
            {/* 1. WKF Dark */}
            <label
              className={`relative flex flex-col justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                consoleTheme === 'wkf-dark'
                  ? 'border-yellow-500 bg-[#0d121f] text-white shadow-lg ring-2 ring-yellow-500/30'
                  : 'border-border bg-card/60 hover:bg-secondary/40 text-foreground'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="consoleTheme"
                    value="wkf-dark"
                    checked={consoleTheme === 'wkf-dark'}
                    onChange={() => setConsoleTheme('wkf-dark')}
                    className="h-4 w-4 text-yellow-500 focus:ring-yellow-500 border-border cursor-pointer"
                  />
                  <span className="text-xs font-black uppercase tracking-wide">1. WKF Dark</span>
                </div>
                <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-yellow-400/20 text-yellow-300 border border-yellow-400/30">
                  Default
                </span>
              </div>

              {/* Theme Preview Card */}
              <div className="h-16 rounded-lg bg-[#090d16] border border-white/10 p-2 flex flex-col justify-between mb-3">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono text-yellow-400 font-bold">Obsidian & Gold</span>
                  <span className="w-2 h-2 rounded-full bg-yellow-400" />
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-4 flex-1 rounded bg-[#111827] border border-white/5" />
                  <div className="h-4 w-6 rounded bg-yellow-500/30 border border-yellow-500/50" />
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground">
                Classic tournament dark theme with deep obsidian slate and gold highlights.
              </p>
            </label>

            {/* 2. Arena Blue */}
            <label
              className={`relative flex flex-col justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                consoleTheme === 'arena-blue'
                  ? 'border-sky-400 bg-[#0f2248] text-white shadow-lg ring-2 ring-sky-400/30'
                  : 'border-border bg-card/60 hover:bg-secondary/40 text-foreground'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="consoleTheme"
                    value="arena-blue"
                    checked={consoleTheme === 'arena-blue'}
                    onChange={() => setConsoleTheme('arena-blue')}
                    className="h-4 w-4 text-sky-400 focus:ring-sky-400 border-border cursor-pointer"
                  />
                  <span className="text-xs font-black uppercase tracking-wide">2. Arena Blue</span>
                </div>
                <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-sky-400/20 text-sky-300 border border-sky-400/30">
                  Stadium
                </span>
              </div>

              {/* Theme Preview Card */}
              <div className="h-16 rounded-lg bg-[#0a1630] border border-sky-500/30 p-2 flex flex-col justify-between mb-3">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono text-sky-400 font-bold">Midnight Navy</span>
                  <span className="w-2 h-2 rounded-full bg-sky-400" />
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-4 flex-1 rounded bg-[#0f2248] border border-sky-500/20" />
                  <div className="h-4 w-6 rounded bg-sky-500/30 border border-sky-400/50" />
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground">
                Electric stadium atmosphere with royal midnight navy and cyan accents.
              </p>
            </label>

            {/* 3. Tatami Green */}
            <label
              className={`relative flex flex-col justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                consoleTheme === 'tatami-green'
                  ? 'border-emerald-400 bg-[#0e2d1d] text-white shadow-lg ring-2 ring-emerald-400/30'
                  : 'border-border bg-card/60 hover:bg-secondary/40 text-foreground'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="consoleTheme"
                    value="tatami-green"
                    checked={consoleTheme === 'tatami-green'}
                    onChange={() => setConsoleTheme('tatami-green')}
                    className="h-4 w-4 text-emerald-400 focus:ring-emerald-400 border-border cursor-pointer"
                  />
                  <span className="text-xs font-black uppercase tracking-wide">3. Tatami Green</span>
                </div>
                <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                  Championship
                </span>
              </div>

              {/* Theme Preview Card */}
              <div className="h-16 rounded-lg bg-[#091f14] border border-emerald-500/30 p-2 flex flex-col justify-between mb-3">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono text-emerald-400 font-bold">Forest Emerald Jade</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-4 flex-1 rounded bg-[#0e2d1d] border border-emerald-500/20" />
                  <div className="h-4 w-6 rounded bg-emerald-500/30 border border-emerald-400/50" />
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground">
                Championship tatami mat aesthetic with rich emerald jade panels.
              </p>
            </label>

            {/* 4. Dojo Gold */}
            <label
              className={`relative flex flex-col justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                consoleTheme === 'dojo-gold'
                  ? 'border-amber-400 bg-[#291b05] text-white shadow-lg ring-2 ring-amber-400/30'
                  : 'border-border bg-card/60 hover:bg-secondary/40 text-foreground'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="consoleTheme"
                    value="dojo-gold"
                    checked={consoleTheme === 'dojo-gold'}
                    onChange={() => setConsoleTheme('dojo-gold')}
                    className="h-4 w-4 text-amber-400 focus:ring-amber-400 border-border cursor-pointer"
                  />
                  <span className="text-xs font-black uppercase tracking-wide">4. Dojo Gold</span>
                </div>
                <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Bright Solar
                </span>
              </div>

              {/* Theme Preview Card */}
              <div className="h-16 rounded-lg bg-[#1c1303] border border-amber-500/40 p-2 flex flex-col justify-between mb-3 shadow-inner">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono text-amber-400 font-bold">Championship Solar Gold</span>
                  <span className="w-2 h-2 rounded-full bg-amber-400 shadow-xs shadow-amber-400" />
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-4 flex-1 rounded bg-[#3d2907] border border-amber-500/30" />
                  <div className="h-4 w-6 rounded bg-amber-500/40 border border-amber-400" />
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground">
                High-energy bright tournament theme with radiant solar amber and championship gold atmosphere.
              </p>
            </label>
          </div>

          {/* SEPARATE REFEREE VIEW THEME SELECTOR */}
          <div className="border-t border-border pt-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-sky-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Referee View Display Screen Theme (Independent Color Tone)</h3>
              </div>
              <span className="text-[10px] text-muted-foreground">
                Custom tone for secondary display / projector
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Sync with Console */}
              <label
                className={`p-3 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                  refereeTheme === 'sync'
                    ? 'border-sky-400 bg-sky-500/10 text-foreground font-bold ring-2 ring-sky-400/30'
                    : 'border-border bg-card/60 hover:bg-secondary/40 text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <input
                    type="radio"
                    name="refereeTheme"
                    value="sync"
                    checked={refereeTheme === 'sync'}
                    onChange={() => setRefereeTheme('sync')}
                    className="h-3.5 w-3.5 text-sky-400 focus:ring-sky-400 cursor-pointer"
                  />
                  <span className="text-xs font-bold">🔗 Match Console</span>
                </div>
                <p className="text-[10px] text-muted-foreground">Automatically mirrors the Operating Console theme.</p>
              </label>

              {/* WKF Dark */}
              <label
                className={`p-3 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                  refereeTheme === 'wkf-dark'
                    ? 'border-yellow-500 bg-yellow-500/10 text-foreground font-bold ring-2 ring-yellow-500/30'
                    : 'border-border bg-card/60 hover:bg-secondary/40 text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <input
                    type="radio"
                    name="refereeTheme"
                    value="wkf-dark"
                    checked={refereeTheme === 'wkf-dark'}
                    onChange={() => setRefereeTheme('wkf-dark')}
                    className="h-3.5 w-3.5 text-yellow-500 focus:ring-yellow-500 cursor-pointer"
                  />
                  <span className="text-xs font-bold">1. WKF Dark</span>
                </div>
                <p className="text-[10px] text-muted-foreground">Obsidian Slate & Gold.</p>
              </label>

              {/* Arena Blue */}
              <label
                className={`p-3 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                  refereeTheme === 'arena-blue'
                    ? 'border-sky-400 bg-sky-500/10 text-foreground font-bold ring-2 ring-sky-400/30'
                    : 'border-border bg-card/60 hover:bg-secondary/40 text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <input
                    type="radio"
                    name="refereeTheme"
                    value="arena-blue"
                    checked={refereeTheme === 'arena-blue'}
                    onChange={() => setRefereeTheme('arena-blue')}
                    className="h-3.5 w-3.5 text-sky-400 focus:ring-sky-400 cursor-pointer"
                  />
                  <span className="text-xs font-bold">2. Arena Blue</span>
                </div>
                <p className="text-[10px] text-muted-foreground">Midnight Navy & Cyan.</p>
              </label>

              {/* Tatami Green */}
              <label
                className={`p-3 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                  refereeTheme === 'tatami-green'
                    ? 'border-emerald-400 bg-emerald-500/10 text-foreground font-bold ring-2 ring-emerald-400/30'
                    : 'border-border bg-card/60 hover:bg-secondary/40 text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <input
                    type="radio"
                    name="refereeTheme"
                    value="tatami-green"
                    checked={refereeTheme === 'tatami-green'}
                    onChange={() => setRefereeTheme('tatami-green')}
                    className="h-3.5 w-3.5 text-emerald-400 focus:ring-emerald-400 cursor-pointer"
                  />
                  <span className="text-xs font-bold">3. Tatami Green</span>
                </div>
                <p className="text-[10px] text-muted-foreground">Emerald Forest Jade.</p>
              </label>

              {/* Dojo Gold */}
              <label
                className={`p-3 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                  refereeTheme === 'dojo-gold'
                    ? 'border-amber-400 bg-amber-500/10 text-foreground font-bold ring-2 ring-amber-400/30'
                    : 'border-border bg-card/60 hover:bg-secondary/40 text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <input
                    type="radio"
                    name="refereeTheme"
                    value="dojo-gold"
                    checked={refereeTheme === 'dojo-gold'}
                    onChange={() => setRefereeTheme('dojo-gold')}
                    className="h-3.5 w-3.5 text-amber-400 focus:ring-amber-400 cursor-pointer"
                  />
                  <span className="text-xs font-bold">4. Dojo Gold</span>
                </div>
                <p className="text-[10px] text-muted-foreground">Bright Solar Amber & Gold.</p>
              </label>
            </div>
          </div>
        </div>

        {/* System Accessibility Config Panel */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-6 shadow-xs">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Accessibility className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Global Accessibility Config</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contrast */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground block">Theme Contrast</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'standard', label: 'Standard' },
                  { id: 'high-contrast', label: 'High Contrast' }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleAccessibilityChange('themeContrast', opt.id)}
                    disabled={!canModify}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition border cursor-pointer disabled:opacity-50 ${
                      localAccessibility.themeContrast === opt.id
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-secondary hover:bg-secondary/80 text-muted-foreground border-border'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">Adjust system foreground and background colors for high-contrast accessibility.</p>
            </div>

            {/* Font Scale */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground block">Text Scaling</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'standard', label: '100% (Standard)' },
                  { id: 'large', label: '115% (Large)' },
                  { id: 'extra-large', label: '130% (XL)' }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleAccessibilityChange('textScale', opt.id)}
                    disabled={!canModify}
                    className={`py-2 px-2 rounded-lg text-xs font-bold transition border cursor-pointer disabled:opacity-50 ${
                      localAccessibility.textScale === opt.id
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-secondary hover:bg-secondary/80 text-muted-foreground border-border'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">Enlarges UI fonts and paddings scale-proportionally across screens.</p>
            </div>

            {/* Motion */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground block">UI Transitions & Motion</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: false, label: 'Standard Motion' },
                  { id: true, label: 'Reduced Motion' }
                ].map((opt) => (
                  <button
                    key={opt.label as string}
                    type="button"
                    onClick={() => handleAccessibilityChange('reducedMotion', opt.id)}
                    disabled={!canModify}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition border cursor-pointer disabled:opacity-50 ${
                      localAccessibility.reducedMotion === opt.id
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-secondary hover:bg-secondary/80 text-muted-foreground border-border'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">Disables sliding panels and scoreboard animations to reduce visual motion.</p>
            </div>

            {/* Dyslexic-Friendly Font */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground block">Legibility Typeface</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'standard', label: 'Standard Font' },
                  { id: 'dyslexic', label: 'Dyslexic-Friendly' }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleAccessibilityChange('legibilityFont', opt.id)}
                    disabled={!canModify}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition border cursor-pointer disabled:opacity-50 ${
                      localAccessibility.legibilityFont === opt.id
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-secondary hover:bg-secondary/80 text-muted-foreground border-border'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">Switches standard fonts to highly distinct open-dyslexic typeface structures.</p>
            </div>
          </div>
        </div>

        {/* Global Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/95 disabled:opacity-50 rounded-lg text-xs font-bold transition shadow-sm cursor-pointer flex items-center gap-1.5"
          >
            <Save className="h-4 w-4 text-white" />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>

      {/* User Management Section */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">User Management</h2>
          </div>
          
          {!isCoAdmin && !isAddingUser && (
            <button
              onClick={() => setIsAddingUser(true)}
              className="px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Add System User</span>
            </button>
          )}
        </div>

        {isCoAdmin && (
          <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-4 flex gap-3 items-start">
            <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="text-xs font-bold text-amber-500 block">System Access Restricted</span>
              <p className="text-[10px] text-muted-foreground">
                Only the primary Tournament Director (Admin role) can create, modify, suspend, or delete system user credentials and privileges.
              </p>
            </div>
          </div>
        )}

        {/* Inline user edit dialog */}
        {editingUserEmail && (
          <form onSubmit={handleEditUserSubmit} className="bg-secondary/40 border border-border p-4 rounded-xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-border">
              <span className="text-xs font-bold text-foreground">Modify User: {editingUserEmail}</span>
              <button type="button" onClick={() => setEditingUserEmail(null)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground block">Name</label>
                <input
                  type="text"
                  value={editUserName}
                  onChange={(e) => setEditUserName(e.target.value)}
                  className="w-full px-3 py-2 bg-card border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-foreground"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground block">Access Role</label>
                <select
                  value={editUserRole}
                  onChange={(e) => setEditUserRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-card border border-border rounded-lg text-xs focus:outline-none text-foreground dark:bg-neutral-800"
                >
                  <option value="Admin">Admin</option>
                  <option value="Co-Admin">Co-Admin</option>
                  <option value="Viewer">Viewer</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground block">Status</label>
                <select
                  value={editUserStatus}
                  onChange={(e) => setEditUserStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-card border border-border rounded-lg text-xs focus:outline-none text-foreground dark:bg-neutral-800"
                >
                  <option value="Active">Active</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground block">Write Permission</label>
                <select
                  value={String(editUserCanModify)}
                  onChange={(e) => setEditUserCanModify(e.target.value === 'true')}
                  disabled={editingUserEmail === 'admin@senshikarate.com'}
                  className="w-full px-3 py-2 bg-card border border-border rounded-lg text-xs focus:outline-none text-foreground dark:bg-neutral-800 disabled:opacity-50"
                >
                  <option value="false">Read-Only (Spectator)</option>
                  <option value="true">Allowed (Modify)</option>
                </select>
              </div>
            </div>

            {/* Accessibility override per user */}
            <div className="space-y-3 border-t border-border pt-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-muted-foreground">Accessibility Overrides</span>
                <span className="text-[9px] text-muted-foreground italic">Custom settings apply upon user sign-in</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* User Contrast */}
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground block">Contrast</span>
                  <select
                    value={editUserAccessibility.themeContrast}
                    onChange={(e) => setEditUserAccessibility(prev => ({ ...prev, themeContrast: e.target.value as any }))}
                    className="w-full p-1.5 bg-card border border-border rounded-md text-[10px] focus:outline-none dark:bg-neutral-800 text-foreground"
                  >
                    <option value="standard">Standard</option>
                    <option value="high-contrast">High Contrast</option>
                  </select>
                </div>
                {/* User Font Size */}
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground block">Text Scale</span>
                  <select
                    value={editUserAccessibility.textScale}
                    onChange={(e) => setEditUserAccessibility(prev => ({ ...prev, textScale: e.target.value as any }))}
                    className="w-full p-1.5 bg-card border border-border rounded-md text-[10px] focus:outline-none dark:bg-neutral-800 text-foreground"
                  >
                    <option value="standard">100%</option>
                    <option value="large">115%</option>
                    <option value="extra-large">130%</option>
                  </select>
                </div>
                {/* User Motion */}
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground block">Motion</span>
                  <select
                    value={String(editUserAccessibility.reducedMotion)}
                    onChange={(e) => setEditUserAccessibility(prev => ({ ...prev, reducedMotion: e.target.value === 'true' }))}
                    className="w-full p-1.5 bg-card border border-border rounded-md text-[10px] focus:outline-none dark:bg-neutral-800 text-foreground"
                  >
                    <option value="false">Standard</option>
                    <option value="true">Reduced</option>
                  </select>
                </div>
                {/* User Font style */}
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground block">Font Legibility</span>
                  <select
                    value={editUserAccessibility.legibilityFont}
                    onChange={(e) => setEditUserAccessibility(prev => ({ ...prev, legibilityFont: e.target.value as any }))}
                    className="w-full p-1.5 bg-card border border-border rounded-md text-[10px] focus:outline-none dark:bg-neutral-800 text-foreground"
                  >
                    <option value="standard">Standard</option>
                    <option value="dyslexic">Dyslexic</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-border pt-3">
              <button
                type="button"
                onClick={() => setEditingUserEmail(null)}
                className="px-3 py-1.5 border border-border rounded-lg text-xs font-semibold text-muted-foreground hover:bg-secondary cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer font-semibold"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Save User</span>
              </button>
            </div>
          </form>
        )}

        {/* Inline Add User form */}
        {isAddingUser && !isCoAdmin && (
          <form onSubmit={handleAddUserSubmit} className="bg-secondary/40 border border-border p-4 rounded-xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-border">
              <span className="text-xs font-bold text-foreground">Add New System User</span>
              <button type="button" onClick={() => setIsAddingUser(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground block">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Coach Lee"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-3 py-2 bg-card border border-border rounded-lg text-xs focus:outline-none text-foreground focus:ring-1 focus:ring-primary focus:border-primary"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground block">Email Address</label>
                <input
                  type="email"
                  placeholder="lee@senshikarate.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-card border border-border rounded-lg text-xs focus:outline-none text-foreground focus:ring-1 focus:ring-primary focus:border-primary"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground block">Role</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-card border border-border rounded-lg text-xs focus:outline-none text-foreground dark:bg-neutral-800"
                >
                  <option value="Admin">Admin</option>
                  <option value="Co-Admin">Co-Admin</option>
                  <option value="Viewer">Viewer</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground block">Status</label>
                <select
                  value={newUserStatus}
                  onChange={(e) => setNewUserStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-card border border-border rounded-lg text-xs focus:outline-none text-foreground dark:bg-neutral-800"
                >
                  <option value="Active">Active</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground block">Write Permission</label>
                <select
                  value={String(newUserCanModify)}
                  onChange={(e) => setNewUserCanModify(e.target.value === 'true')}
                  className="w-full px-3 py-2 bg-card border border-border rounded-lg text-xs focus:outline-none text-foreground dark:bg-neutral-800"
                >
                  <option value="false">Read-Only (Spectator)</option>
                  <option value="true">Allowed (Modify)</option>
                </select>
              </div>
            </div>

            {/* Accessibility override config toggle */}
            <div className="pt-2 border-t border-border mt-2 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={customizeUserAccessibility}
                  onChange={(e) => setCustomizeUserAccessibility(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-[10px] font-bold text-muted-foreground">Customize User Accessibility Settings</span>
              </label>

              {customizeUserAccessibility && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-card p-3 rounded-lg border border-border">
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground block">Contrast</span>
                    <select
                      value={newUserAccessibility.themeContrast}
                      onChange={(e) => setNewUserAccessibility(prev => ({ ...prev, themeContrast: e.target.value as any }))}
                      className="w-full p-1.5 bg-secondary border border-border rounded-md text-[10px] focus:outline-none dark:bg-neutral-800 text-foreground"
                    >
                      <option value="standard">Standard</option>
                      <option value="high-contrast">High Contrast</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground block">Text Scale</span>
                    <select
                      value={newUserAccessibility.textScale}
                      onChange={(e) => setNewUserAccessibility(prev => ({ ...prev, textScale: e.target.value as any }))}
                      className="w-full p-1.5 bg-secondary border border-border rounded-md text-[10px] focus:outline-none dark:bg-neutral-800 text-foreground"
                    >
                      <option value="standard">100%</option>
                      <option value="large">115%</option>
                      <option value="extra-large">130%</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground block">Motion</span>
                    <select
                      value={String(newUserAccessibility.reducedMotion)}
                      onChange={(e) => setNewUserAccessibility(prev => ({ ...prev, reducedMotion: e.target.value === 'true' }))}
                      className="w-full p-1.5 bg-secondary border border-border rounded-md text-[10px] focus:outline-none dark:bg-neutral-800 text-foreground"
                    >
                      <option value="false">Standard</option>
                      <option value="true">Reduced</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground block">Font style</span>
                    <select
                      value={newUserAccessibility.legibilityFont}
                      onChange={(e) => setNewUserAccessibility(prev => ({ ...prev, legibilityFont: e.target.value as any }))}
                      className="w-full p-1.5 bg-secondary border border-border rounded-md text-[10px] focus:outline-none dark:bg-neutral-800 text-foreground"
                    >
                      <option value="standard">Standard</option>
                      <option value="dyslexic">Dyslexic</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-border pt-3">
              <button
                type="button"
                onClick={() => setIsAddingUser(false)}
                className="px-3 py-1.5 border border-border rounded-lg text-xs font-semibold text-muted-foreground hover:bg-secondary cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer font-semibold"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Save User</span>
              </button>
            </div>
          </form>
        )}

        {/* User table list */}
        <div className="overflow-x-auto border border-border rounded-xl bg-card">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-secondary/40 border-b border-border text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                <th className="py-3 px-4">User Details</th>
                <th className="py-3 px-4">System Role</th>
                <th className="py-3 px-4">Access Status</th>
                <th className="py-3 px-4">Write Access</th>
                <th className="py-3 px-4">Accessibility Preferences</th>
                {!isCoAdmin && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs">
              {usersList.map((user) => {
                const initials = user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                
                const customAccessibility = user.accessibility && (
                  user.accessibility.themeContrast !== 'standard' || 
                  user.accessibility.textScale !== 'standard' || 
                  user.accessibility.reducedMotion || 
                  user.accessibility.legibilityFont !== 'standard'
                );

                return (
                  <tr key={user.email} className="hover:bg-secondary/15 transition-colors">
                    <td className="py-3 px-4 flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs border border-border shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <span className="font-semibold block text-foreground leading-snug">{user.name}</span>
                        <span className="text-[10px] text-muted-foreground block truncate">{user.email}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                        user.role === 'Admin' 
                          ? 'bg-blue-500/5 text-blue-500 border-blue-500/20'
                          : user.role === 'Co-Admin'
                            ? 'bg-purple-500/5 text-purple-500 border-purple-500/20'
                            : 'bg-neutral-500/5 text-muted-foreground border-border'
                      }`}>
                        {user.role === 'Admin' ? <Shield className="h-3 w-3" /> : user.role === 'Co-Admin' ? <Users className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        {user.role}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        user.status === 'Active'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-red-500/10 text-red-600 dark:text-red-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'Active' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        {user.status}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        user.canModify || user.role === 'Admin'
                          ? 'bg-emerald-500/5 text-emerald-500 border-emerald-500/20'
                          : 'bg-neutral-500/5 text-muted-foreground border-border'
                      }`}>
                        {user.canModify || user.role === 'Admin' ? 'Read & Write' : 'Read-Only'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-muted-foreground text-[10px] font-semibold">
                      {customAccessibility ? (
                        <div className="flex flex-wrap gap-1.5">
                          {user.accessibility.themeContrast !== 'standard' && (
                            <span className="bg-secondary px-1.5 py-0.5 rounded border border-border text-[9px]">High Contrast</span>
                          )}
                          {user.accessibility.textScale !== 'standard' && (
                            <span className="bg-secondary px-1.5 py-0.5 rounded border border-border text-[9px]">Scale: {user.accessibility.textScale}</span>
                          )}
                          {user.accessibility.reducedMotion && (
                            <span className="bg-secondary px-1.5 py-0.5 rounded border border-border text-[9px]">No Motion</span>
                          )}
                          {user.accessibility.legibilityFont !== 'standard' && (
                            <span className="bg-secondary px-1.5 py-0.5 rounded border border-border text-[9px]">Dyslexic Font</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground/60 italic text-[10px] font-normal">Using system defaults</span>
                      )}
                    </td>

                    {!isCoAdmin && (
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditUserClick(user)}
                            className="p-1.5 hover:bg-secondary text-muted-foreground hover:text-foreground rounded-md transition cursor-pointer"
                            title="Edit User"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteUserClick(user.email)}
                            disabled={user.email === 'admin@senshikarate.com'}
                            className="p-1.5 hover:bg-red-500/10 text-muted-foreground hover:text-red-500 rounded-md transition disabled:opacity-30 cursor-pointer"
                            title="Delete User"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Start New Tournament Profile Section */}
      {!isCoAdmin && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 text-primary">
            <Trophy className="h-5 w-5" />
            <h2 className="text-sm font-extrabold uppercase tracking-wider">Start New Tournament</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Archive the current tournament records (participants count, dojo count, gold/silver/bronze medal count, and champions lists) into the Past Tournaments log. This then resets the database (participants, bouts, teams, and clubs) so you can start setting up a fresh profile.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                New Tournament Name
              </label>
              <input
                type="text"
                value={newTName}
                onChange={(e) => setNewTName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-foreground font-sans"
                placeholder="e.g. 2nd Kelab Senshi Tournament 2026"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                Tournament Date
              </label>
              <input
                type="date"
                value={newTDate}
                onChange={(e) => setNewTDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-foreground font-sans"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                Venue
              </label>
              <input
                type="text"
                value={newTVenue}
                onChange={(e) => setNewTVenue(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-foreground font-sans"
                placeholder="e.g. Pusat Komersial Anggun City, Rawang"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                City / State
              </label>
              <input
                type="text"
                value={newTCity}
                onChange={(e) => setNewTCity(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-foreground font-sans"
                placeholder="e.g. Rawang, Selangor"
              />
            </div>
          </div>
          <div>
            <button
              onClick={handleStartNewTournament}
              disabled={startingNew}
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 rounded-lg text-xs font-bold transition shadow-sm cursor-pointer flex items-center gap-1.5"
            >
              <Trophy className="h-4 w-4" />
              <span>{startingNew ? 'Initializing New Tournament...' : 'Archive & Start New Tournament'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Dangerous Zone */}
      {isCoAdmin ? (
        <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-6 space-y-2 shadow-xs">
          <div className="flex items-center gap-2 text-amber-500">
            <ShieldAlert className="h-5 w-5" />
            <h2 className="text-sm font-extrabold uppercase tracking-wider">Access Restricted</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Co-Admins are not permitted to perform database resets. Please contact the primary Tournament Director for full system updates.
          </p>
        </div>
      ) : (
        <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 text-red-500">
            <ShieldAlert className="h-5 w-5" />
            <h2 className="text-sm font-extrabold uppercase tracking-wider">Danger Zone</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Perform administrative database resets. This clears the cache and refreshes state telemetry back to initial parameters.
          </p>
          <div>
            <button
              onClick={handleResetDatabase}
              disabled={resetting}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 className="h-4 w-4" />
              <span>{resetting ? 'Resetting...' : 'Reset Database Cache'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
