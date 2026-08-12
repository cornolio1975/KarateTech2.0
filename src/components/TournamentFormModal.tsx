'use client';

import React, { useState, useEffect } from 'react';
import { Tournament } from '@/db/types';
import { Trophy, Save, Sparkles, X, Loader2 } from 'lucide-react';

interface TournamentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: Partial<Tournament> | null;
  onSave: (t: Partial<Tournament>) => Promise<void>;
}

export default function TournamentFormModal({ isOpen, onClose, tournament, onSave }: TournamentFormModalProps) {
  const [name, setName] = useState('');
  const [organizer, setOrganizer] = useState('');
  const [date, setDate] = useState('');
  const [dateIso, setDateIso] = useState('');
  const [venue, setVenue] = useState('');
  const [city, setCity] = useState('');
  const [regClose, setRegClose] = useState('');
  const [regCloseIso, setRegCloseIso] = useState('');
  const [status, setStatus] = useState<Tournament['status']>('Open');
  const [featured, setFeatured] = useState(false);
  const [discipline, setDiscipline] = useState('Kata, Kumite');
  const [gold, setGold] = useState(0);
  const [silver, setSilver] = useState(0);
  const [bronze, setBronze] = useState(0);
  const [participants, setParticipants] = useState(0);
  const [clubs, setClubs] = useState(0);
  const [emoji, setEmoji] = useState('🏆');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && tournament) {
      setName(tournament.name || '');
      setOrganizer(tournament.organizer || '');
      setDate(tournament.date || '');
      setDateIso(tournament.date_iso || '');
      setVenue(tournament.venue || '');
      setCity(tournament.city || '');
      setRegClose(tournament.registration_close || '');
      setRegCloseIso(tournament.registration_close_iso || '');
      setStatus(tournament.status || 'Open');
      setFeatured(!!tournament.featured);
      setDiscipline(tournament.discipline || 'Kata, Kumite');
      setGold(tournament.medals_gold ?? 0);
      setSilver(tournament.medals_silver ?? 0);
      setBronze(tournament.medals_bronze ?? 0);
      setParticipants(tournament.total_participants ?? 0);
      setClubs(tournament.total_clubs ?? 0);
      setEmoji(tournament.poster_emoji || '🏆');
      setError(null);
    } else if (isOpen) {
      // Default new tournament
      setName('');
      setOrganizer('');
      setDate('');
      setDateIso('');
      setVenue('');
      setCity('');
      setRegClose('');
      setRegCloseIso('');
      setStatus('Open');
      setFeatured(false);
      setDiscipline('Kata, Kumite');
      setGold(0);
      setSilver(0);
      setBronze(0);
      setParticipants(0);
      setClubs(0);
      setEmoji('🏆');
      setError(null);
    }
  }, [isOpen, tournament]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const parseDisplayDate = () => {
      if (date && date.trim()) return date.trim();
      if (!dateIso) return '';
      const parsed = new Date(dateIso);
      return !isNaN(parsed.getTime()) 
        ? parsed.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) 
        : '';
    };

    const parseDisplayReg = () => {
      if (regClose && regClose.trim()) return regClose.trim();
      if (!regCloseIso) return '';
      const parsed = new Date(regCloseIso);
      return !isNaN(parsed.getTime()) 
        ? parsed.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) 
        : '';
    };

    const payload: Partial<Tournament> = {
      ...(tournament || {}),
      name,
      organizer,
      date: parseDisplayDate(),
      date_iso: dateIso,
      venue,
      city,
      registration_close: parseDisplayReg(),
      registration_close_iso: regCloseIso,
      status,
      featured,
      discipline,
      medals_gold: gold,
      medals_silver: silver,
      medals_bronze: bronze,
      total_participants: participants,
      total_clubs: clubs,
      poster_emoji: emoji,
      banner_gradient: status === 'Completed' 
        ? 'linear-gradient(135deg, #1e3a8a 0%, #1e1b4b 50%, #3b82f6 100%)' 
        : 'linear-gradient(135deg, #0b0f19 0%, #1a1035 40%, #2d1a00 100%)'
    };

    try {
      await onSave(payload);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save tournament');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="bg-[#0a1628] border border-cyan-500/20 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-cyan-500/10 flex items-center justify-between shrink-0 bg-[#070e1a]/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-xl">
              <Trophy className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white">{tournament?.id ? 'Edit Tournament' : 'Add New Tournament'}</h2>
              <p className="text-[10px] uppercase tracking-wider text-slate-400">Configure event details and settings</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 text-slate-200">
          <form id="tournament-form" onSubmit={handleSubmit} className="space-y-6 text-sm">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-xs font-semibold">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="font-bold text-slate-400 uppercase text-[10px] block">Tournament Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#0d1f3c]/50 border border-cyan-500/20 rounded-xl focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-white placeholder-slate-500"
                placeholder="e.g. SENSHI GOJU-RYU KARATE CHAMPIONSHIP 2026"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-400 uppercase text-[10px] block">Organizer *</label>
                <input
                  type="text"
                  required
                  value={organizer}
                  onChange={e => setOrganizer(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#0d1f3c]/50 border border-cyan-500/20 rounded-xl focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-white placeholder-slate-500"
                  placeholder="e.g. KELAB KARATE DO SENSHI GOJU-RYU"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-bold text-slate-400 uppercase text-[10px] block">Emoji Poster</label>
                <select
                  value={emoji}
                  onChange={e => setEmoji(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#0d1f3c]/50 border border-cyan-500/20 rounded-xl focus:outline-none focus:border-cyan-500 text-white"
                >
                  <option value="🏆">🏆 Trophy</option>
                  <option value="🥇">🥇 Gold Medal</option>
                  <option value="🥋">🥋 Karate Gi</option>
                  <option value="🔥">🔥 Flame</option>
                  <option value="🌟">🌟 Star</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-400 uppercase text-[10px] block">Start Date *</label>
                <input
                  type="date"
                  required
                  value={dateIso}
                  onChange={e => setDateIso(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#0d1f3c]/50 border border-cyan-500/20 rounded-xl focus:outline-none focus:border-cyan-500 text-white"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-bold text-slate-400 uppercase text-[10px] block flex items-center gap-1">
                  Date Display override <Sparkles className="h-3 w-3 text-cyan-400" />
                </label>
                <input
                  type="text"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  placeholder="e.g. 15–16 Aug 2026 (Optional)"
                  className="w-full px-3 py-2.5 bg-[#0d1f3c]/50 border border-cyan-500/20 rounded-xl focus:outline-none focus:border-cyan-500 text-white placeholder-slate-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-400 uppercase text-[10px] block">Venue *</label>
                <input
                  type="text"
                  required
                  value={venue}
                  onChange={e => setVenue(e.target.value)}
                  placeholder="e.g. Dewan Serbaguna MBSJ"
                  className="w-full px-3 py-2.5 bg-[#0d1f3c]/50 border border-cyan-500/20 rounded-xl focus:outline-none focus:border-cyan-500 text-white placeholder-slate-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-bold text-slate-400 uppercase text-[10px] block">City & State *</label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder="e.g. Bandar Kinrara 5, Selangor"
                  className="w-full px-3 py-2.5 bg-[#0d1f3c]/50 border border-cyan-500/20 rounded-xl focus:outline-none focus:border-cyan-500 text-white placeholder-slate-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-400 uppercase text-[10px] block">Reg Close Date *</label>
                <input
                  type="date"
                  required
                  value={regCloseIso}
                  onChange={e => setRegCloseIso(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#0d1f3c]/50 border border-cyan-500/20 rounded-xl focus:outline-none focus:border-cyan-500 text-white"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-bold text-slate-400 uppercase text-[10px] block flex items-center gap-1">
                  Reg Close Display override <Sparkles className="h-3 w-3 text-cyan-400" />
                </label>
                <input
                  type="text"
                  value={regClose}
                  onChange={e => setRegClose(e.target.value)}
                  placeholder="e.g. 31 July 2026 (Optional)"
                  className="w-full px-3 py-2.5 bg-[#0d1f3c]/50 border border-cyan-500/20 rounded-xl focus:outline-none focus:border-cyan-500 text-white placeholder-slate-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-400 uppercase text-[10px] block">Status *</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2.5 bg-[#0d1f3c]/50 border border-cyan-500/20 rounded-xl focus:outline-none focus:border-cyan-500 text-white"
                >
                  <option value="Draft">Draft</option>
                  <option value="Open">Open</option>
                  <option value="Active">Active</option>
                  <option value="Closing Soon">Closing Soon</option>
                  <option value="Full">Full</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label className="font-bold text-slate-400 uppercase text-[10px] block">Disciplines</label>
                <input
                  type="text"
                  value={discipline}
                  onChange={e => setDiscipline(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#0d1f3c]/50 border border-cyan-500/20 rounded-xl focus:outline-none focus:border-cyan-500 text-white"
                />
              </div>
            </div>

            <div className="border-t border-cyan-500/10 pt-6 space-y-4">
              <span className="font-bold text-slate-400 text-[10px] uppercase block">Historical Telemetry (For Past Archives)</span>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400">Total Participants</label>
                  <input
                    type="number"
                    value={participants}
                    onChange={e => setParticipants(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#0d1f3c]/50 border border-cyan-500/20 rounded-lg text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400">Total Clubs</label>
                  <input
                    type="number"
                    value={clubs}
                    onChange={e => setClubs(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#0d1f3c]/50 border border-cyan-500/20 rounded-lg text-white"
                  />
                </div>
                <div className="space-y-1.5 flex items-center md:pt-6 col-span-2 md:col-span-1">
                  <label className="flex items-center gap-2 font-bold cursor-pointer text-slate-400 select-none">
                    <input
                      type="checkbox"
                      checked={featured}
                      onChange={e => setFeatured(e.target.checked)}
                      className="rounded text-cyan-500 border-cyan-500/20 focus:ring-cyan-500 bg-[#0d1f3c]/50"
                    />
                    <span className="text-xs">Featured Event</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-yellow-500 font-bold">🥇 Gold</label>
                  <input
                    type="number"
                    value={gold}
                    onChange={e => setGold(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#0d1f3c]/50 border border-cyan-500/20 rounded-lg text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-300 font-bold">🥈 Silver</label>
                  <input
                    type="number"
                    value={silver}
                    onChange={e => setSilver(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#0d1f3c]/50 border border-cyan-500/20 rounded-lg text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-amber-600 font-bold">🥉 Bronze</label>
                  <input
                    type="number"
                    value={bronze}
                    onChange={e => setBronze(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#0d1f3c]/50 border border-cyan-500/20 rounded-lg text-white"
                  />
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-cyan-500/10 bg-[#070e1a]/80 flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:bg-white/5 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="tournament-form"
            disabled={saving}
            className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-black font-extrabold rounded-xl shadow-[0_0_15px_rgba(34,211,238,0.3)] transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving...' : 'Save Tournament'}
          </button>
        </div>

      </div>
    </div>
  );
}
