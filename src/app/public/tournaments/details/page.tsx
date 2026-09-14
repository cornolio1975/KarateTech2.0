'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Calendar, MapPin, Clock, Users, ArrowLeft, ExternalLink,
  Trophy, Info, FileText, Share2, AlertCircle
} from 'lucide-react';
import { formatLocalDate } from '@/lib/dateUtils';
import { createClient } from '@/utils/supabase/client';

interface EventCategory {
  name: string;
  color: string;
}

export default function PublicTournamentDetails() {
  const [id, setId] = useState<string | null>(null);
  const [tournament, setTournament] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Read from window.location directly to avoid Next.js static export Suspense boundaries
    const searchParams = new URLSearchParams(window.location.search);
    const tournamentId = searchParams.get('id');
    setId(tournamentId);

    const fetchTournament = async () => {
      if (!tournamentId) {
        setError('No tournament ID provided.');
        setLoading(false);
        return;
      }

      try {
        const supabase = createClient();
        const { data: dbData, error } = await supabase
          .from('tournaments')
          .select('id, name, organizer, date, date_iso, venue, city, registration_close, registration_close_iso, status, banner_gradient, data')
          .eq('id', tournamentId)
          .single();

        if (error || !dbData) {
          throw new Error('Tournament not found');
        }

        let dataObj = {};
        if (dbData.data) {
          try {
            dataObj = typeof dbData.data === 'string' ? JSON.parse(dbData.data) : dbData.data;
          } catch (e) {}
        }

        setTournament({ ...dbData, ...dataObj });
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to load tournament details');
      } finally {
        setLoading(false);
      }
    };

    fetchTournament();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070e1a] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Loading Tournament...</p>
        </div>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="min-h-screen bg-[#070e1a] text-white flex flex-col items-center justify-center p-6">
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Tournament Not Found</h1>
        <p className="text-slate-400 mb-8 max-w-md text-center">{error}</p>
        <Link href="/public/tournaments" className="px-6 py-3 bg-sky-600 hover:bg-sky-500 rounded-lg font-bold flex items-center gap-2 transition">
          <ArrowLeft size={16} /> Back to Tournaments
        </Link>
      </div>
    );
  }

  const isRegistrationOpen = tournament.registration_status === 'Open';

  return (
    <div className="min-h-screen bg-[#070e1a] text-white font-sans selection:bg-sky-500/30">
      
      {/* Banner / Header */}
      <div 
        className="relative w-full h-[300px] md:h-[400px] overflow-hidden flex items-end justify-center"
        style={{ background: tournament.banner_gradient || 'linear-gradient(135deg, #0b0f19 0%, #1a1035 40%, #2d1a00 100%)' }}
      >
        {tournament.banner_url && (
          <div 
            className="absolute inset-0 opacity-40 mix-blend-overlay"
            style={{ backgroundImage: `url(${tournament.banner_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#070e1a] via-[#070e1a]/60 to-transparent" />
        
        <div className="relative z-10 w-full max-w-5xl px-6 pb-10 flex flex-col md:flex-row items-end justify-between gap-6">
          <div>
            <Link href="/public/tournaments" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition text-sm font-semibold bg-white/5 px-3 py-1.5 rounded-full border border-white/10 hover:border-white/20 backdrop-blur-sm">
              <ArrowLeft size={14} /> Back to Tournaments
            </Link>
            <div className="flex flex-wrap gap-3 mb-4">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                tournament.status === 'Completed' ? 'bg-green-900/40 text-green-400 border-green-500/30' :
                tournament.status === 'Draft' ? 'bg-amber-900/40 text-amber-400 border-amber-500/30' :
                'bg-sky-900/40 text-sky-400 border-sky-500/30'
              }`}>
                {tournament.status}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                isRegistrationOpen ? 'bg-emerald-900/40 text-emerald-400 border-emerald-500/30' : 'bg-rose-900/40 text-rose-400 border-rose-500/30'
              }`}>
                Registration {tournament.registration_status || 'Closed'}
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 drop-shadow-sm leading-tight">
              {tournament.name}
            </h1>
            <p className="text-lg md:text-xl text-sky-400 font-bold flex items-center gap-2 drop-shadow-sm">
              <Trophy size={18} /> {tournament.organizer || 'KarateTech Organizer'}
            </p>
          </div>
          
          {isRegistrationOpen && tournament.status !== 'Draft' && (
            <Link 
              href={`/public/register?tournament=${tournament.id}`}
              className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-black text-lg rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transition flex items-center justify-center gap-2 transform hover:-translate-y-1"
            >
              REGISTER NOW <ExternalLink size={18} />
            </Link>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full max-w-5xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Details */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Important Info Card */}
          <div className="bg-[#0b162c] border border-cyan-500/10 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-10">
              <span className="text-8xl">{tournament.poster_emoji || '🏆'}</span>
            </div>
            
            <h3 className="text-lg font-bold text-cyan-400 mb-6 flex items-center gap-2">
              <Info size={18} /> Tournament Details
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative z-10">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-sky-500/10 rounded-lg text-sky-400 mt-0.5"><Calendar size={18} /></div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-0.5">Event Date</div>
                  <div className="font-semibold text-slate-200">{tournament.date}</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-rose-500/10 rounded-lg text-rose-400 mt-0.5"><Clock size={18} /></div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-0.5">Registration Closes</div>
                  <div className="font-semibold text-slate-200">{tournament.registration_close}</div>
                  {tournament.registration_close_time && (
                     <div className="text-sm text-slate-400">{tournament.registration_close_time}</div>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3 sm:col-span-2">
                <div className="p-2.5 bg-indigo-500/10 rounded-lg text-indigo-400 mt-0.5"><MapPin size={18} /></div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-0.5">Venue Location</div>
                  <div className="font-semibold text-slate-200">{tournament.venue}</div>
                  <div className="text-sm text-slate-400">{tournament.city}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Description & Rules */}
          {(tournament.description || tournament.rules_version) && (
            <div className="space-y-6">
              {tournament.description && (
                <div>
                  <h3 className="text-xl font-bold mb-4 border-b border-white/10 pb-2">About This Event</h3>
                  <div className="prose prose-invert prose-slate max-w-none text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {tournament.description}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Terms & Instructions */}
          {(tournament.registration_instructions || tournament.terms_conditions || tournament.important_notes) && (
            <div className="bg-[#10192e] border border-amber-500/10 rounded-2xl p-6 shadow-xl">
              <h3 className="text-lg font-bold text-amber-500 mb-6 flex items-center gap-2 border-b border-amber-500/10 pb-4">
                <AlertCircle size={18} /> Important Information
              </h3>
              
              <div className="space-y-6 text-sm text-slate-300">
                {tournament.registration_instructions && (
                  <div>
                    <strong className="block text-slate-200 mb-1">Registration Instructions:</strong>
                    <div className="whitespace-pre-wrap">{tournament.registration_instructions}</div>
                  </div>
                )}
                {tournament.terms_conditions && (
                  <div>
                    <strong className="block text-slate-200 mb-1">Terms & Conditions:</strong>
                    <div className="whitespace-pre-wrap">{tournament.terms_conditions}</div>
                  </div>
                )}
                {tournament.important_notes && (
                  <div>
                    <strong className="block text-slate-200 mb-1">Important Notes:</strong>
                    <div className="whitespace-pre-wrap text-amber-200/80">{tournament.important_notes}</div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Right Column: Sidebar */}
        <div className="space-y-6">
          
          {/* Quick Actions */}
          <div className="bg-[#0b162c] border border-cyan-500/10 rounded-2xl p-6 shadow-xl">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Resources</h3>
            <div className="space-y-3">
              {tournament.pdf_url ? (
                <a 
                  href={tournament.pdf_url} 
                  target="_blank" 
                  rel="noreferrer"
                  className="w-full px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl flex items-center gap-3 transition group"
                >
                  <div className="p-2 bg-red-500/20 text-red-400 rounded-lg group-hover:bg-red-500 group-hover:text-white transition"><FileText size={16} /></div>
                  <span className="font-semibold text-slate-200 group-hover:text-white">Download Bulletin</span>
                </a>
              ) : (
                <div className="w-full px-4 py-3 bg-white/5 border border-white/5 rounded-xl flex items-center gap-3 opacity-50 cursor-not-allowed">
                  <div className="p-2 bg-slate-500/20 text-slate-400 rounded-lg"><FileText size={16} /></div>
                  <span className="font-semibold text-slate-400">Bulletin Not Available</span>
                </div>
              )}
              
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  alert('Tournament link copied to clipboard!');
                }}
                className="w-full px-4 py-3 bg-white/5 hover:bg-sky-500/20 hover:border-sky-500/30 border border-white/5 rounded-xl flex items-center gap-3 transition group text-left cursor-pointer"
              >
                <div className="p-2 bg-sky-500/20 text-sky-400 rounded-lg group-hover:bg-sky-500 group-hover:text-white transition"><Share2 size={16} /></div>
                <span className="font-semibold text-slate-200 group-hover:text-white">Share Tournament</span>
              </button>
            </div>
          </div>

          {/* Organizer Info */}
          <div className="bg-[#0b162c] border border-cyan-500/10 rounded-2xl p-6 shadow-xl">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Organizer</h3>
            
            <div className="space-y-4 text-sm">
              <div>
                <div className="text-slate-500 mb-0.5">Name</div>
                <div className="font-semibold text-slate-200">{tournament.organizer}</div>
              </div>
              
              {tournament.organizer_club && (
                <div>
                  <div className="text-slate-500 mb-0.5">Club / Organization</div>
                  <div className="font-semibold text-slate-200">{tournament.organizer_club}</div>
                </div>
              )}

              {tournament.organizer_email && (
                <div>
                  <div className="text-slate-500 mb-0.5">Email</div>
                  <a href={`mailto:${tournament.organizer_email}`} className="font-semibold text-sky-400 hover:underline">{tournament.organizer_email}</a>
                </div>
              )}
              
              {tournament.organizer_phone && (
                <div>
                  <div className="text-slate-500 mb-0.5">Phone</div>
                  <div className="font-semibold text-slate-200">{tournament.organizer_phone}</div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
