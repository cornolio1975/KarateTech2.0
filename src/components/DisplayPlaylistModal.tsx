'use client';

import React, { useRef, useState, useEffect } from 'react';
import { db, basePath } from '@/db/dbClient';
import { DisplayPlaylist, DisplayPlaylistSlide } from '@/db/types';
import { 
  Tv, Plus, Trash2, Edit3, Save, X, Play, Clock,
  ChevronUp, ChevronDown, Layers, Monitor, Award, Calendar, Volume2, Image as ImageIcon, Film, Radio
} from 'lucide-react';

interface DisplayPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlaylist?: (playlist: DisplayPlaylist) => void;
  inline?: boolean;
  createTriggerKey?: number;
  createTriggerMode?: 'default' | 'empty';
  addMediaTriggerKey?: number;
  addMediaSlideType?: DisplayPlaylistSlide['type'];
}

const DEFAULT_SLIDE_TYPES = [
  { type: 'live_scoreboard', name: 'Live Kumite Scoreboard', shortLabel: 'Live-Kumite', icon: Tv, defaultDuration: 25 },
  { type: 'kata_scoreboard', name: 'Live Kata Scoreboard', shortLabel: 'Live-Kata', icon: Award, defaultDuration: 25 },
  { type: 'bracket', name: 'Category Brackets & Draws', shortLabel: 'Bracket', icon: Layers, defaultDuration: 20 },
  { type: 'medals', name: 'Club Medal Standings Leaderboard', shortLabel: 'Medals', icon: Award, defaultDuration: 15 },
  { type: 'schedule', name: 'Upcoming Tatami Match Schedule', shortLabel: 'Schedule', icon: Calendar, defaultDuration: 15 },
  { type: 'announcement', name: 'Custom Announcement / Sponsor Banner', shortLabel: 'Announcement', icon: Volume2, defaultDuration: 12 },
  { type: 'image', name: 'Image Media Slide', shortLabel: 'Image', icon: ImageIcon, defaultDuration: 15 },
  { type: 'video', name: 'Video Media Slide', shortLabel: 'Video', icon: Film, defaultDuration: 30 },
  { type: 'live_stream', name: 'Live Stream @ Arena', shortLabel: 'Stream', icon: Radio, defaultDuration: 60 },
] as const;

const MAX_IMAGE_UPLOAD_MB = 5;

const compressImage = (file: File, callback: (base64: string) => void) => {
  const reader = new FileReader();
  reader.onerror = () => alert('Failed to read the image file.');
  reader.onload = (e) => {
    const img = new Image();
    img.onerror = () => alert('Invalid or unsupported image file.');
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

export default function DisplayPlaylistModal({ isOpen, onClose, onSelectPlaylist, inline = false, createTriggerKey, createTriggerMode = 'default', addMediaTriggerKey, addMediaSlideType = 'announcement' }: DisplayPlaylistModalProps) {
  const [playlists, setPlaylists] = useState<DisplayPlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  const slideIdCounterRef = useRef(1);

  // Edit / New state
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tatami, setTatami] = useState('ALL');
  const [slides, setSlides] = useState<DisplayPlaylistSlide[]>([]);

  const nextSlideId = () => {
    return `slide-local-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  };

  useEffect(() => {
    if (isOpen || inline) {
      loadPlaylists();
    }
  }, [isOpen, inline]);

  useEffect(() => {
    if (typeof createTriggerKey === 'number' && createTriggerKey > 0) {
      handleCreateNew(createTriggerMode === 'empty');
    }
  }, [createTriggerKey, createTriggerMode]);

  useEffect(() => {
    if (typeof addMediaTriggerKey !== 'number' || addMediaTriggerKey <= 0) return;

    const meta = DEFAULT_SLIDE_TYPES.find(slideType => slideType.type === addMediaSlideType);
    const nextSlide: DisplayPlaylistSlide = {
      id: nextSlideId(),
      type: addMediaSlideType,
      title: meta?.name || 'Custom Presentation Slide',
      duration_seconds: meta?.defaultDuration || 20,
      tatami_filter: isEditing ? tatami : 'ALL',
      announcement_text: addMediaSlideType === 'announcement' ? 'Welcome to KarateTech Championship 2026!' : undefined,
      media_url: addMediaSlideType === 'image' || addMediaSlideType === 'video' || addMediaSlideType === 'live_stream' ? '' : undefined
    };

    if (!isEditing) {
      setEditingId(null);
      setName('New Display Presentation');
      setDescription('Custom presentation sequence for spectator screen.');
      setTatami('ALL');
      setSlides([nextSlide]);
      setIsEditing(true);
      return;
    }

    setSlides(prev => [...prev, nextSlide]);
  }, [addMediaTriggerKey, addMediaSlideType, isEditing, tatami]);

  const loadPlaylists = async () => {
    try {
      setLoading(true);
      const list = await db.displayPlaylists.list();
      setPlaylists(list);
    } catch (e) {
      console.error('Failed to load display playlists:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = (startEmpty = false) => {
    setEditingId(null);
    setName('New Display Presentation');
    setDescription('Custom presentation sequence for spectator screen.');
    setTatami('ALL');
    setSlides(startEmpty
      ? []
      : [
          { id: 'slide-1', type: 'live_scoreboard', title: 'Live Kumite Scoreboard', duration_seconds: 25, tatami_filter: 'ALL' },
          { id: 'slide-2', type: 'kata_scoreboard', title: 'Live Kata Scoreboard', duration_seconds: 25, tatami_filter: 'ALL' },
          { id: 'slide-3', type: 'medals', title: 'Club Medal Standings', duration_seconds: 15 }
        ]
    );
    setIsEditing(true);
  };

  const handleEdit = (pl: DisplayPlaylist) => {
    setEditingId(pl.id);
    setName(pl.name);
    setDescription(pl.description || '');
    setTatami(pl.tatami || 'ALL');
    setSlides([...pl.slides]);
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this playlist?')) return;
    try {
      setLoading(true);
      await db.displayPlaylists.delete(id);
      await loadPlaylists();
      if (editingId === id) setIsEditing(false);
    } catch (e) {
      console.error('Error deleting playlist:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSlide = (type: DisplayPlaylistSlide['type']) => {
    const meta = DEFAULT_SLIDE_TYPES.find(t => t.type === type);
    const newSlide: DisplayPlaylistSlide = {
      id: nextSlideId(),
      type,
      title: meta?.name || 'Custom Presentation Slide',
      duration_seconds: meta?.defaultDuration || 20,
      tatami_filter: tatami,
      announcement_text: type === 'announcement' ? 'Welcome to KarateTech Championship 2026!' : undefined,
      media_url: type === 'image' || type === 'video' || type === 'live_stream' ? '' : undefined
    };
    setSlides(prev => [...prev, newSlide]);
  };

  const handleRemoveSlide = (idx: number) => {
    setSlides(slides.filter((_, i) => i !== idx));
  };

  const handleMoveSlide = (idx: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? idx - 1 : idx + 1;
    if (newIndex < 0 || newIndex >= slides.length) return;
    const copy = [...slides];
    const temp = copy[idx];
    copy[idx] = copy[newIndex];
    copy[newIndex] = temp;
    setSlides(copy);
  };

  const handleSavePlaylist = async () => {
    if (!name.trim()) {
      alert('Please enter a playlist name.');
      return;
    }
    if (slides.length === 0) {
      alert('Playlist must contain at least one slide.');
      return;
    }

    const invalidMediaSlide = slides.find(slide => (
      (slide.type === 'image' || slide.type === 'video' || slide.type === 'live_stream') && !slide.media_url?.trim()
    ));
    if (invalidMediaSlide) {
      alert(`Please provide a media URL for "${invalidMediaSlide.title}".`);
      return;
    }

    try {
      setLoading(true);
      if (editingId) {
        await db.displayPlaylists.update(editingId, {
          name,
          description,
          tatami,
          slides
        });
      } else {
        await db.displayPlaylists.add({
          name,
          description,
          tatami,
          is_active: true,
          slides
        });
      }
      await loadPlaylists();
      setIsEditing(false);
    } catch (e) {
      console.error('Error saving display playlist:', e);
      alert('Failed to save playlist to database.');
    } finally {
      setLoading(false);
    }
  };

  const handleMediaFileChange = (idx: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const slide = slides[idx];
    if (!slide || slide.type === 'live_stream') {
      event.target.value = '';
      return;
    }

    // Relaxed MIME validation since HTML input `accept` already handles it
    // and some OS/browser combos return empty types for valid videos

    const maxBytes = (slide.type === 'video' ? 15 : MAX_IMAGE_UPLOAD_MB) * 1024 * 1024;
    if (file.size > maxBytes) {
      alert(`${slide.type === 'video' ? 'Video' : 'Image'} file is too large. Maximum size is ${slide.type === 'video' ? 15 : MAX_IMAGE_UPLOAD_MB}MB.`);
      event.target.value = '';
      return;
    }

    if (slide.type === 'video') {
      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === 'string' ? reader.result : '';
        if (!result) {
          alert('Failed to read selected video file. Please try again.');
          return;
        }
        setSlides(prev => prev.map((entry, entryIdx) => (
          entryIdx === idx ? { ...entry, media_url: result } : entry
        )));
        event.target.value = '';
      };
      reader.readAsDataURL(file);
      return;
    }

    compressImage(file, (result) => {
      setSlides(prev => prev.map((entry, entryIdx) => (
        entryIdx === idx ? { ...entry, media_url: result } : entry
      )));
      event.target.value = '';
    });
  };

  const handleLaunchDisplay = (pl: DisplayPlaylist) => {
    let targetUrl = `${basePath}/display?playlistId=${pl.id}`;
    if (typeof window !== 'undefined') {
      const activeTournamentId = localStorage.getItem('ts_active_tournament_id');
      if (activeTournamentId) {
        targetUrl += `&tournament=${activeTournamentId}`;
      }
    }
    
    if (onSelectPlaylist) {
      onSelectPlaylist(pl);
    }
    if (typeof window !== 'undefined') {
      window.open(targetUrl, '_blank');
    }
  };

  if (!isOpen && !inline) return null;

  const content = (
    <div className={`bg-card border border-border w-full flex flex-col overflow-hidden text-foreground ${inline ? 'rounded-xl shadow-sm h-[800px]' : 'rounded-2xl max-w-4xl max-h-[90vh] shadow-2xl animate-in fade-in zoom-in-95 duration-200'}`}>
        
        {/* Header */}
        {!inline && (
          <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0 bg-secondary/20">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 border border-primary/20 text-primary rounded-xl">
                <Tv className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight">Display Playlists & Presentation Manager</h2>
                <p className="text-xs text-muted-foreground">Configure live display playlists saved in the database for any device/platform.</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!isEditing ? (
            /* LIST VIEW */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Saved Database Playlists</h3>
                  <p className="text-xs text-muted-foreground">Select a playlist to edit, modify, or launch on the live display screen.</p>
                </div>
                <button
                  onClick={() => handleCreateNew()}
                  className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/95 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create New Playlist</span>
                </button>
              </div>

              {loading ? (
                <div className="p-12 text-center text-xs font-semibold text-muted-foreground animate-pulse">
                  Loading saved database playlists...
                </div>
              ) : playlists.length === 0 ? (
                <div className="p-12 border border-dashed border-border rounded-xl text-center space-y-3">
                  <Monitor className="h-10 w-10 text-muted-foreground/30 mx-auto" />
                  <div className="text-xs text-muted-foreground font-semibold">No custom playlists created yet.</div>
                  <button
                    onClick={() => handleCreateNew()}
                    className="px-3.5 py-1.5 bg-secondary hover:bg-secondary/80 border border-border text-foreground rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Create Default Presentation</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {playlists.map((pl) => (
                    <div
                      key={pl.id}
                      className="bg-secondary/10 border border-border hover:border-primary/40 rounded-xl p-5 flex flex-col justify-between space-y-4 transition-all duration-200 shadow-xs"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                            <span>{pl.name}</span>
                            {pl.is_active && (
                              <span className="text-[10px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                                Active
                              </span>
                            )}
                          </h4>
                          <span className="text-[10px] bg-secondary px-2.5 py-1 rounded-md font-bold text-muted-foreground border border-border shrink-0">
                            {pl.tatami || 'ALL TATAMIS'}
                          </span>
                        </div>

                        {pl.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {pl.description}
                          </p>
                        )}

                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-[11px] font-semibold text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-md">
                            {pl.slides.length} Slides ({pl.slides.reduce((acc, s) => acc + (s.duration_seconds || 15), 0)}s loop)
                          </span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleEdit(pl)}
                            className="px-2.5 py-1.5 hover:bg-secondary border border-border rounded-lg text-xs font-semibold text-foreground transition flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>Modify</span>
                          </button>
                          <button
                            onClick={() => handleDelete(pl.id)}
                            className="p-1.5 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 rounded-lg text-xs font-semibold text-red-400 transition cursor-pointer"
                            title="Delete Playlist"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* PLAYLIST LAUNCH DISPLAY SCREEN BUTTON */}
                        <button
                          onClick={() => handleLaunchDisplay(pl)}
                          className="px-3.5 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-black font-extrabold rounded-lg text-xs transition cursor-pointer shadow-md flex items-center gap-1.5 uppercase tracking-wide border border-yellow-400/50"
                        >
                          <Play className="h-3.5 w-3.5 fill-current" />
                          <span>Playlist Launch Display Screen</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* EDIT / CREATE FORM */
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                    {editingId ? 'Modify Display Playlist' : 'Create New Display Playlist'}
                  </h3>
                  <p className="text-xs text-muted-foreground">Configure playlist details, sequence slides, and set rotation timers.</p>
                </div>

                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 bg-secondary border border-border rounded-lg text-xs font-semibold hover:bg-secondary/80 text-foreground transition cursor-pointer"
                >
                  Back to List
                </button>
              </div>

              {/* Form fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Playlist Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Main Stage Spectator Loop"
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs font-semibold text-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Target Tatami Filter</label>
                  <select
                    value={tatami}
                    onChange={e => setTatami(e.target.value)}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs font-semibold text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value="ALL">All Tatamis (ALL)</option>
                    <option value="Tatami 1">Tatami 1</option>
                    <option value="Tatami 2">Tatami 2</option>
                    <option value="Tatami 3">Tatami 3</option>
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Description</label>
                  <input
                    type="text"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Optional playlist summary or venue details..."
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs font-semibold text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Add Slides Bar */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    Presentation Slides ({slides.length})
                  </label>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-muted-foreground font-semibold mr-1">+ Add Slide:</span>
                    {DEFAULT_SLIDE_TYPES.map(st => (
                      <button
                        key={st.type}
                        onClick={() => handleAddSlide(st.type as any)}
                        className="px-2.5 py-1 bg-secondary hover:bg-primary/20 hover:border-primary/40 border border-border rounded-lg text-[10px] font-bold text-foreground transition flex items-center gap-1 cursor-pointer"
                      >
                        <st.icon className="h-3 w-3 text-primary" />
                        <span>{st.shortLabel}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Slides List */}
                <div className="space-y-2.5">
                  {slides.map((s, idx) => (
                    <div
                      key={s.id || idx}
                      className="bg-card border border-border rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="flex flex-col gap-0.5">
                          <button
                            onClick={() => handleMoveSlide(idx, 'up')}
                            disabled={idx === 0}
                            className="p-1 hover:bg-secondary rounded text-muted-foreground disabled:opacity-20 cursor-pointer"
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleMoveSlide(idx, 'down')}
                            disabled={idx === slides.length - 1}
                            className="p-1 hover:bg-secondary rounded text-muted-foreground disabled:opacity-20 cursor-pointer"
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <span className="font-mono text-xs font-bold text-muted-foreground w-6 text-center">
                          #{idx + 1}
                        </span>

                        <div className="min-w-0 flex-1 space-y-1">
                          <input
                            type="text"
                            value={s.title}
                            onChange={e => {
                              const copy = [...slides];
                              copy[idx].title = e.target.value;
                              setSlides(copy);
                            }}
                            className="w-full px-2 py-1 bg-secondary border border-border rounded text-xs font-bold text-foreground focus:outline-none"
                          />
                          {s.type === 'announcement' && (
                            <input
                              type="text"
                              value={s.announcement_text || ''}
                              onChange={e => {
                                const copy = [...slides];
                                copy[idx].announcement_text = e.target.value;
                                setSlides(copy);
                              }}
                              placeholder="Enter custom announcement banner message..."
                              className="w-full px-2 py-1 bg-secondary/80 border border-border rounded text-[11px] font-medium text-foreground focus:outline-none"
                            />
                          )}
                          {(s.type === 'image' || s.type === 'video' || s.type === 'live_stream') && (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={s.media_url || ''}
                                onChange={e => {
                                  const copy = [...slides];
                                  copy[idx].media_url = e.target.value;
                                  setSlides(copy);
                                }}
                                placeholder={s.type === 'video' ? 'Paste MP4/WebM video URL...' : s.type === 'live_stream' ? 'Paste YouTube stream URL (e.g. https://youtube.com/watch?v=...)' : 'Paste JPG/PNG/WebP image URL...'}
                                className="w-full px-2 py-1 bg-secondary/80 border border-border rounded text-[11px] font-medium text-foreground focus:outline-none"
                              />
                              {s.type !== 'live_stream' && (
                                <div className="flex flex-col gap-1">
                                  <label className="text-[10px] font-semibold text-muted-foreground">
                                    or upload {s.type} from local drive
                                  </label>
                                  <input
                                    type="file"
                                    accept={s.type === 'video' ? 'video/*' : 'image/*'}
                                    onChange={e => handleMediaFileChange(idx, e)}
                                    className="block w-full text-[10px] text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary/15 file:px-2.5 file:py-1.5 file:text-[10px] file:font-bold file:text-primary hover:file:bg-primary/25"
                                  />
                                  <p className="text-[10px] text-muted-foreground/80">
                                    {s.type === 'video'
                                      ? `MP4/WebM recommended. Max 15MB for embedded upload.`
                                      : `PNG/JPG/WebP recommended. Max ${MAX_IMAGE_UPLOAD_MB}MB.`}
                                  </p>
                                </div>
                              )}
                              {s.media_url && s.type !== 'live_stream' ? (
                                <div className="rounded-lg border border-border bg-secondary/30 p-2">
                                  {s.type === 'image' ? (
                                    <img
                                      src={s.media_url}
                                      alt={s.title || 'Image preview'}
                                      className="max-h-36 w-full rounded-md object-contain bg-black/40"
                                    />
                                  ) : (
                                    <video
                                      src={s.media_url}
                                      className="max-h-36 w-full rounded-md bg-black/60"
                                      controls
                                      muted
                                      playsInline
                                    />
                                  )}
                                </div>
                              ) : null}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {/* Slide Type Tag */}
                        <span className="text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 px-2 py-1 rounded-md uppercase">
                          {s.type.replace('_', ' ')}
                        </span>

                        {/* Duration Selector */}
                        <div className="flex items-center gap-1 bg-secondary px-2 py-1 border border-border rounded-lg">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <select
                            value={s.duration_seconds}
                            onChange={e => {
                              const copy = [...slides];
                              copy[idx].duration_seconds = Number(e.target.value);
                              setSlides(copy);
                            }}
                            className="bg-transparent text-xs font-bold text-foreground focus:outline-none"
                          >
                            <option value={10}>10s</option>
                            <option value={15}>15s</option>
                            <option value={20}>20s</option>
                            <option value={25}>25s</option>
                            <option value={30}>30s</option>
                            <option value={45}>45s</option>
                            <option value={60}>60s</option>
                          </select>
                        </div>

                        <button
                          onClick={() => handleRemoveSlide(idx)}
                          className="p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Form Buttons */}
              <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 bg-secondary border border-border hover:bg-secondary/80 text-foreground rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePlaylist}
                  disabled={loading}
                  className="px-5 py-2 bg-primary text-primary-foreground hover:bg-primary/95 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Save className="h-4 w-4" />
                  <span>Save Playlist to Database</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
  );

  if (inline) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {content}
    </div>
  );
}
