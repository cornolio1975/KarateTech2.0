'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTournament } from '@/context/TournamentContext';
import { db } from '@/db/dbClient';
import { Shield, Save, MapPin, Building2, Loader2, Check, User, Mail, Phone, Globe, Briefcase, Image as ImageIcon, Upload } from 'lucide-react';

export default function ClubManagementPage() {
  const { clubId, userRole } = useTournament();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [headCoach, setHeadCoach] = useState('');
  const [teamCoach, setTeamCoach] = useState('');
  const [clubManager, setClubManager] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [country, setCountry] = useState('');

  useEffect(() => {
    if (!clubId) return;
    const fetchClub = async () => {
      try {
        const clubs = await db.clubs.list();
        const myClub = clubs.find(c => c.id === clubId);
        if (myClub) {
          setName(myClub.name || '');
          setLogoUrl(myClub.logo_url || '');
          setCity(myClub.city || '');
          setState(myClub.state || '');
          setHeadCoach(myClub.head_coach || '');
          setTeamCoach(myClub.team_coach || '');
          setClubManager(myClub.club_manager || '');
          setContactEmail(myClub.contact_email || '');
          setContactPhone(myClub.contact_phone || '');
          setCountry(myClub.country || '');
        }
      } catch (err) {
        console.error('Error fetching club profile:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchClub();
  }, [clubId]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          setLogoUrl(dataUrl);
        }
      };
      if (event.target?.result) {
        img.src = event.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubId || !name) return;

    setSaving(true);
    setSuccess(false);
    try {
      await db.clubs.update(clubId, { 
        name, 
        logo_url: logoUrl,
        city, 
        state,
        head_coach: headCoach,
        team_coach: teamCoach,
        club_manager: clubManager,
        contact_email: contactEmail,
        contact_phone: contactPhone,
        country
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving club profile:', err);
      alert('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!clubId) return null;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0f172a] to-[#1e1b4b] rounded-2xl p-8 border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
        <div className="relative z-10 flex items-center gap-5">
          <div className="h-16 w-16 bg-indigo-600/20 rounded-2xl border border-indigo-500/30 flex items-center justify-center shadow-inner overflow-hidden">
            {logoUrl ? (
              <img src={logoUrl} alt="Club Logo" className="w-full h-full object-contain" />
            ) : (
              <Shield className="h-8 w-8 text-indigo-400" />
            )}
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white drop-shadow-md">Dojo Profile</h1>
            <p className="text-sm font-medium text-indigo-200/80 mt-1">Manage your academy information and registry details.</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSave} className="bg-[#0f172a]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-8 shadow-xl space-y-10">
        
        {/* Basic Info Section */}
        <div className="space-y-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-indigo-400 border-b border-white/10 pb-2">Location & Identity</h2>
          
          <div className="flex flex-col md:flex-row gap-8">
            {/* Left Column: Logo */}
            <div className="flex-shrink-0 flex flex-col items-center space-y-4 w-full md:w-48">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={fileInputRef}
                onChange={handleImageUpload}
                className="hidden"
              />
              <div 
                onClick={() => (userRole === 'Club' || userRole === 'Admin') && fileInputRef.current?.click()}
                className={`w-32 h-32 rounded-2xl bg-black/40 border-2 border-dashed border-white/20 flex flex-col items-center justify-center overflow-hidden relative group ${
                  (userRole === 'Club' || userRole === 'Admin') ? 'cursor-pointer hover:border-indigo-400/50' : 'cursor-not-allowed'
                }`}
              >
                {logoUrl ? (
                  <img src={logoUrl} alt="Club Logo" className="w-full h-full object-contain" />
                ) : (
                  <div className="flex flex-col items-center text-slate-500">
                    <Upload className="h-8 w-8 mb-2 opacity-50 group-hover:text-indigo-400 group-hover:opacity-100 transition-colors" />
                    <span className="text-[10px] font-bold uppercase tracking-wider group-hover:text-indigo-400 transition-colors">Upload</span>
                  </div>
                )}
                {(userRole === 'Club' || userRole === 'Admin') && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1">
                      <Upload className="w-3 h-3" /> Change
                    </span>
                  </div>
                )}
              </div>
              
              {/* Optional: We removed the ugly text input field because base64 strings are too long to display gracefully. */}
            </div>

            {/* Right Column: Details */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2 sm:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5" />
                  Dojo Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={userRole !== 'Club' && userRole !== 'Admin'}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner disabled:opacity-50"
                  placeholder="e.g. Senshi Goju-Ryu Karate"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5" />
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  disabled={userRole !== 'Club' && userRole !== 'Admin'}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner disabled:opacity-50"
                  placeholder="e.g. Tokyo"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5" />
                  State / Province
                </label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  disabled={userRole !== 'Club' && userRole !== 'Admin'}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner disabled:opacity-50"
                  placeholder="e.g. Kanto"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5" />
                  Country
                </label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  disabled={userRole !== 'Club' && userRole !== 'Admin'}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner disabled:opacity-50"
                  placeholder="e.g. Japan"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Coach & Contact Section */}
        <div className="space-y-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-indigo-400 border-b border-white/10 pb-2">Leadership & Contact</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <User className="h-3.5 w-3.5" />
                Head Coach / Sensei
              </label>
              <input
                type="text"
                value={headCoach}
                onChange={(e) => setHeadCoach(e.target.value)}
                disabled={userRole !== 'Club' && userRole !== 'Admin'}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner disabled:opacity-50"
                placeholder="e.g. Master Miyagi"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <User className="h-3.5 w-3.5" />
                Team Coach
              </label>
              <input
                type="text"
                value={teamCoach}
                onChange={(e) => setTeamCoach(e.target.value)}
                disabled={userRole !== 'Club' && userRole !== 'Admin'}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner disabled:opacity-50"
                placeholder="e.g. John Doe"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Briefcase className="h-3.5 w-3.5" />
                Club Manager
              </label>
              <input
                type="text"
                value={clubManager}
                onChange={(e) => setClubManager(e.target.value)}
                disabled={userRole !== 'Club' && userRole !== 'Admin'}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner disabled:opacity-50"
                placeholder="e.g. Jane Doe"
              />
            </div>

            <div className="space-y-2 md:col-span-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Mail className="h-3.5 w-3.5" />
                Club Contact Email
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                disabled={userRole !== 'Club' && userRole !== 'Admin'}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner disabled:opacity-50"
                placeholder="email@dojo.com"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Phone className="h-3.5 w-3.5" />
                Club Contact Phone
              </label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                disabled={userRole !== 'Club' && userRole !== 'Admin'}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner disabled:opacity-50"
                placeholder="+1 234 567 8900"
              />
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-white/5 flex items-center justify-end">
          <button
            type="submit"
            disabled={saving || !name || (userRole !== 'Club' && userRole !== 'Admin')}
            className={`px-8 py-3 rounded-xl font-bold text-sm tracking-wide uppercase transition-all duration-300 flex items-center gap-2 shadow-lg ${
              success
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-emerald-900/20'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/40 hover:shadow-indigo-500/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0'
            }`}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : success ? (
              <>
                <Check className="h-4 w-4" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Save Profile</span>
              </>
            )}
          </button>
        </div>
      </form>

    </div>
  );
}
