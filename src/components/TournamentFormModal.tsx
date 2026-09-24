'use client';

import React, { useState, useEffect } from 'react';
import { Tournament } from '@/db/types';
import { Trophy, Save, Sparkles, X, Loader2, Eye, CheckCircle } from 'lucide-react';
import TournamentPreviewModal from './TournamentPreviewModal';

interface TournamentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: Partial<Tournament> | null;
  onSave: (t: Partial<Tournament>, isPublishing: boolean) => Promise<void>;
}

export default function TournamentFormModal({ isOpen, onClose, tournament, onSave }: TournamentFormModalProps) {
  // Basic Info
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [description, setDescription] = useState('');
  const [discipline, setDiscipline] = useState('Kata, Kumite');
  const [emoji, setEmoji] = useState('🏆');

  // Organizer Info
  const [organizer, setOrganizer] = useState('');
  const [organizerClub, setOrganizerClub] = useState('');
  const [organizerContact, setOrganizerContact] = useState('');
  const [organizerPhone, setOrganizerPhone] = useState('');
  const [organizerEmail, setOrganizerEmail] = useState('');
  const [organizerWebsite, setOrganizerWebsite] = useState('');

  // Schedule
  const [dateIso, setDateIso] = useState(''); // Start date
  const [endDateIso, setEndDateIso] = useState('');
  const [regOpenIso, setRegOpenIso] = useState('');
  const [regCloseIso, setRegCloseIso] = useState('');
  const [regCloseTime, setRegCloseTime] = useState('');

  // Venue
  const [venue, setVenue] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setStateName] = useState('');
  const [country, setCountry] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [locationLink, setLocationLink] = useState('');

  // Config & Registration
  const [regStatus, setRegStatus] = useState<'Not Yet Open' | 'Open' | 'Closed'>('Not Yet Open');
  const [tournamentStatus, setTournamentStatus] = useState<Tournament['status']>('Published');
  const [regFee, setRegFee] = useState('');
  const [paymentInfo, setPaymentInfo] = useState('');
  const [terms, setTerms] = useState('');
  const [notes, setNotes] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    if (isOpen && tournament) {
      setName(tournament.name || '');
      setShortName(tournament.short_name || '');
      setDescription(tournament.description || '');
      setDiscipline(tournament.discipline || 'Kata, Kumite');
      setEmoji(tournament.poster_emoji || '🏆');
      
      setOrganizer(tournament.organizer || '');
      setOrganizerClub(tournament.organizer_club || '');
      setOrganizerContact(tournament.organizer_contact || '');
      setOrganizerPhone(tournament.organizer_phone || '');
      setOrganizerEmail(tournament.organizer_email || '');
      setOrganizerWebsite(tournament.organizer_website || '');

      setDateIso(tournament.date_iso || '');
      setEndDateIso(tournament.end_date_iso || '');
      setRegOpenIso(tournament.registration_open_iso || '');
      setRegCloseIso(tournament.registration_close_iso || '');
      setRegCloseTime(tournament.registration_close_time || '');

      setVenue(tournament.venue || '');
      setAddress(tournament.address || '');
      setCity(tournament.city || '');
      setStateName(tournament.state || '');
      setCountry(tournament.country || '');
      setPostalCode(tournament.postal_code || '');
      setLocationLink(tournament.location || '');

      setRegStatus(tournament.registration_status || 'Not Yet Open');
      setTournamentStatus(tournament.status || 'Published');
      setRegFee(tournament.registration_fee || '');
      setPaymentInfo(tournament.payment_info || '');
      setTerms(tournament.terms_conditions || '');
      setNotes(tournament.important_notes || '');
      
      setError(null);
    } else if (isOpen) {
      // Defaults
      setName('');
      setShortName('');
      setDescription('');
      setDiscipline('Kata, Kumite');
      setEmoji('🏆');
      setOrganizer('');
      setOrganizerClub('');
      setOrganizerContact('');
      setOrganizerPhone('');
      setOrganizerEmail('');
      setOrganizerWebsite('');
      setDateIso('');
      setEndDateIso('');
      setRegOpenIso('');
      setRegCloseIso('');
      setRegCloseTime('');
      setVenue('');
      setAddress('');
      setCity('');
      setStateName('');
      setCountry('');
      setPostalCode('');
      setLocationLink('');
      setRegStatus('Not Yet Open');
      setTournamentStatus('Published');
      setRegFee('');
      setPaymentInfo('');
      setTerms('');
      setNotes('');
      setError(null);
    }
  }, [isOpen, tournament]);

  const generatePayload = (): Partial<Tournament> => {
    const parseDisplayDate = (isoString: string) => {
      if (!isoString) return '';
      const parsed = new Date(isoString);
      return !isNaN(parsed.getTime()) 
        ? parsed.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) 
        : '';
    };

    return {
      ...(tournament || {}),
      name,
      short_name: shortName,
      description,
      discipline,
      poster_emoji: emoji,
      organizer,
      organizer_club: organizerClub,
      organizer_contact: organizerContact,
      organizer_phone: organizerPhone,
      organizer_email: organizerEmail,
      organizer_website: organizerWebsite,
      date: parseDisplayDate(dateIso), // Legacy fallback
      date_iso: dateIso,
      end_date_iso: endDateIso,
      registration_open_iso: regOpenIso,
      registration_close: parseDisplayDate(regCloseIso), // Legacy fallback
      registration_close_iso: regCloseIso,
      registration_close_time: regCloseTime,
      venue,
      address,
      city,
      state,
      country,
      postal_code: postalCode,
      location: locationLink,
      registration_status: regStatus,
      registration_fee: regFee,
      payment_info: paymentInfo,
      terms_conditions: terms,
      important_notes: notes,
      status: tournamentStatus,
    };
  };

  const validateForPublishing = () => {
    const missing = [];
    if (!name.trim()) missing.push('Tournament Name');
    if (!organizer.trim()) missing.push('Organizer Name');
    if (!dateIso) missing.push('Start Date');
    if (!endDateIso) missing.push('End Date');
    if (!venue.trim()) missing.push('Venue Name');
    if (!city.trim()) missing.push('City');
    if (!regCloseIso) missing.push('Registration Closing Date');
    if (!regCloseTime) missing.push('Registration Closing Time');
    
    if (missing.length > 0) {
      setError(`Cannot publish. Missing required fields: ${missing.join(', ')}`);
      return false;
    }
    return true;
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = generatePayload();
      payload.status = 'Draft';
      payload.is_published = false;
      await onSave(payload, false);
    } catch (err: any) {
      setError(err.message || 'Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!validateForPublishing()) return;
    
    setSaving(true);
    setError(null);
    try {
      const payload = generatePayload();
      payload.status = tournamentStatus === 'Draft' ? 'Published' : tournamentStatus;
      payload.is_published = true;
      await onSave(payload, true);
    } catch (err: any) {
      setError(err.message || 'Failed to publish tournament');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const currentPayload = generatePayload();

  return (
    <>
      <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        <div className="bg-[#0a1628] border border-cyan-500/20 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          
          {/* Header */}
          <div className="px-6 py-4 border-b border-cyan-500/10 flex items-center justify-between shrink-0 bg-[#070e1a]/80">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-xl">
                <Trophy className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight text-white">{tournament?.id ? 'Edit Tournament' : 'Create New Tournament'}</h2>
                <p className="text-[10px] uppercase tracking-wider text-slate-400">Configure event details and publishing settings</p>
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
            <div className="space-y-8 text-sm">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-xs font-semibold">
                  {error}
                </div>
              )}

              {/* Basic Info */}
              <section className="space-y-4">
                <h3 className="text-cyan-400 font-semibold border-b border-cyan-500/20 pb-2">1. Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="font-bold text-slate-400 uppercase text-[10px] block mb-1">Tournament Name *</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 bg-[#0d1f3c]/50 border border-cyan-500/20 rounded focus:border-cyan-500 text-white" />
                  </div>
                  <div>
                    <label className="font-bold text-slate-400 uppercase text-[10px] block mb-1">Short Name / Abbreviation</label>
                    <input type="text" value={shortName} onChange={e => setShortName(e.target.value)} className="w-full px-3 py-2 bg-[#0d1f3c]/50 border border-cyan-500/20 rounded focus:border-cyan-500 text-white" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="font-bold text-slate-400 uppercase text-[10px] block mb-1">Description</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full px-3 py-2 bg-[#0d1f3c]/50 border border-cyan-500/20 rounded focus:border-cyan-500 text-white" />
                  </div>
                </div>
              </section>

              {/* Organizer Info */}
              <section className="space-y-4">
                <h3 className="text-cyan-400 font-semibold border-b border-cyan-500/20 pb-2">2. Organizer Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="font-bold text-slate-400 uppercase text-[10px] block mb-1">Organizer Name *</label>
                    <input type="text" value={organizer} onChange={e => setOrganizer(e.target.value)} className="w-full px-3 py-2 bg-[#0d1f3c]/50 border border-cyan-500/20 rounded focus:border-cyan-500 text-white" />
                  </div>
                  <div>
                    <label className="font-bold text-slate-400 uppercase text-[10px] block mb-1">Contact Email</label>
                    <input type="email" value={organizerEmail} onChange={e => setOrganizerEmail(e.target.value)} className="w-full px-3 py-2 bg-[#0d1f3c]/50 border border-cyan-500/20 rounded focus:border-cyan-500 text-white" />
                  </div>
                </div>
              </section>

              {/* Schedule */}
              <section className="space-y-4">
                <h3 className="text-cyan-400 font-semibold border-b border-cyan-500/20 pb-2">3. Tournament Schedule</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="font-bold text-slate-400 uppercase text-[10px] block mb-1">Start Date *</label>
                    <input type="date" value={dateIso} onChange={e => setDateIso(e.target.value)} className="w-full px-3 py-2 bg-[#0d1f3c]/50 border border-cyan-500/20 rounded focus:border-cyan-500 text-white" />
                  </div>
                  <div>
                    <label className="font-bold text-slate-400 uppercase text-[10px] block mb-1">End Date *</label>
                    <input type="date" value={endDateIso} onChange={e => setEndDateIso(e.target.value)} className="w-full px-3 py-2 bg-[#0d1f3c]/50 border border-cyan-500/20 rounded focus:border-cyan-500 text-white" />
                  </div>
                  <div>
                    <label className="font-bold text-slate-400 uppercase text-[10px] block mb-1">Registration Close Date *</label>
                    <input type="date" value={regCloseIso} onChange={e => setRegCloseIso(e.target.value)} className="w-full px-3 py-2 bg-[#0d1f3c]/50 border border-cyan-500/20 rounded focus:border-cyan-500 text-white" />
                  </div>
                  <div>
                    <label className="font-bold text-slate-400 uppercase text-[10px] block mb-1">Registration Close Time *</label>
                    <input type="time" value={regCloseTime} onChange={e => setRegCloseTime(e.target.value)} className="w-full px-3 py-2 bg-[#0d1f3c]/50 border border-cyan-500/20 rounded focus:border-cyan-500 text-white" />
                  </div>
                </div>
              </section>

              {/* Venue */}
              <section className="space-y-4">
                <h3 className="text-cyan-400 font-semibold border-b border-cyan-500/20 pb-2">4. Venue Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="font-bold text-slate-400 uppercase text-[10px] block mb-1">Venue / Place Name *</label>
                    <input type="text" value={venue} onChange={e => setVenue(e.target.value)} className="w-full px-3 py-2 bg-[#0d1f3c]/50 border border-cyan-500/20 rounded focus:border-cyan-500 text-white" />
                  </div>
                  <div>
                    <label className="font-bold text-slate-400 uppercase text-[10px] block mb-1">City *</label>
                    <input type="text" value={city} onChange={e => setCity(e.target.value)} className="w-full px-3 py-2 bg-[#0d1f3c]/50 border border-cyan-500/20 rounded focus:border-cyan-500 text-white" />
                  </div>
                </div>
              </section>

              {/* Config & Status */}
              <section className="space-y-4">
                <h3 className="text-cyan-400 font-semibold border-b border-cyan-500/20 pb-2">5. Configuration & Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="font-bold text-slate-400 uppercase text-[10px] block mb-1">Registration Status *</label>
                    <select value={regStatus} onChange={e => setRegStatus(e.target.value as any)} className="w-full px-3 py-2 bg-[#0d1f3c]/50 border border-cyan-500/20 rounded focus:border-cyan-500 text-white">
                      <option value="Not Yet Open">Not Yet Open</option>
                      <option value="Open">Open</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-400 uppercase text-[10px] block mb-1">Tournament Status *</label>
                    <select value={tournamentStatus} onChange={e => setTournamentStatus(e.target.value as any)} className="w-full px-3 py-2 bg-[#0d1f3c]/50 border border-cyan-500/20 rounded focus:border-cyan-500 text-white">
                      <option value="Draft">Draft</option>
                      <option value="Published">Published</option>
                      <option value="Active">Active</option>
                      <option value="Completed">Completed</option>
                      <option value="Archived">Archived</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
              </section>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-cyan-500/10 flex items-center justify-between bg-[#070e1a]/80">
            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              className="px-4 py-2 border border-slate-600 text-slate-300 rounded hover:bg-slate-800 transition flex items-center gap-2"
            >
              <Eye className="w-4 h-4" /> PREVIEW
            </button>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={saving}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition flex items-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {tournament?.id ? 'REVERT TO DRAFT' : 'SAVE DRAFT'}
              </button>
              <button
                type="button"
                onClick={handlePublish}
                disabled={saving}
                className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded transition flex items-center gap-2 font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)]"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {tournament?.id ? 'SAVE CHANGES' : 'PUBLISH TOURNAMENT'}
              </button>
            </div>
          </div>

        </div>
      </div>

      {isPreviewOpen && (
        <TournamentPreviewModal 
          tournament={currentPayload} 
          onClose={() => setIsPreviewOpen(false)} 
        />
      )}
    </>
  );
}
