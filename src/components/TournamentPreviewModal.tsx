'use client';

import React from 'react';
import { Tournament } from '@/db/types';
import { X, Calendar, MapPin, Building, Info, FileText } from 'lucide-react';

interface TournamentPreviewModalProps {
  tournament: Partial<Tournament>;
  onClose: () => void;
}

export default function TournamentPreviewModal({ tournament, onClose }: TournamentPreviewModalProps) {
  const isDraft = tournament.status === 'Draft';
  
  return (
    <div className="fixed inset-0 z-[400] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="bg-[#0a1628] border border-cyan-500/20 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-cyan-500/10 flex items-center justify-between shrink-0 bg-[#070e1a]/80">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white">Preview: Public Listing</h2>
              <p className="text-[10px] uppercase tracking-wider text-slate-400">
                This is how the tournament will appear on SP SportData Solution
              </p>
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
        <div className="flex-1 overflow-y-auto bg-[#070e1a] text-slate-200">
          
          {/* Banner */}
          <div className="w-full h-48 bg-gradient-to-r from-cyan-900 to-blue-900 flex items-center justify-center relative overflow-hidden">
             <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
             <h1 className="text-4xl md:text-5xl font-black text-white z-10 text-center drop-shadow-lg px-4">
               {tournament.poster_emoji} {tournament.name || 'Tournament Name'}
             </h1>
          </div>

          <div className="p-6 md:p-10 max-w-3xl mx-auto space-y-8">
            
            {/* Status Warning */}
            {isDraft && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 p-4 rounded-xl text-center font-semibold">
                This tournament is currently in DRAFT status and will not appear publicly until published.
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Left Column (Main Info) */}
              <div className="md:col-span-2 space-y-6">
                <section>
                  <h3 className="text-2xl font-bold text-white mb-2">{tournament.name || 'Unnamed Tournament'}</h3>
                  <p className="text-cyan-400 font-medium text-lg">{tournament.discipline}</p>
                  <p className="text-slate-400 mt-4 leading-relaxed">{tournament.description || 'No description provided.'}</p>
                </section>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-[#0d1f3c]/50 p-4 rounded-xl border border-cyan-500/10">
                    <div className="flex items-center gap-3 text-cyan-400 mb-2">
                      <Calendar className="w-5 h-5" />
                      <span className="font-bold">Schedule</span>
                    </div>
                    <div className="text-slate-300 text-sm space-y-1">
                      <p><span className="text-slate-500">Starts:</span> {tournament.date || tournament.date_iso}</p>
                      <p><span className="text-slate-500">Ends:</span> {tournament.end_date_iso}</p>
                    </div>
                  </div>
                  <div className="bg-[#0d1f3c]/50 p-4 rounded-xl border border-cyan-500/10">
                    <div className="flex items-center gap-3 text-cyan-400 mb-2">
                      <MapPin className="w-5 h-5" />
                      <span className="font-bold">Location</span>
                    </div>
                    <div className="text-slate-300 text-sm space-y-1">
                      <p className="font-medium text-white">{tournament.venue}</p>
                      <p>{tournament.city}{tournament.state ? `, ${tournament.state}` : ''}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column (Sidebar) */}
              <div className="space-y-6">
                <div className="bg-[#0d1f3c]/80 p-5 rounded-2xl border border-cyan-500/20 text-center shadow-[0_0_20px_rgba(6,182,212,0.1)]">
                  <h4 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Registration Status</h4>
                  <div className="text-xl font-black text-cyan-400 mb-4">{tournament.registration_status || 'Not Yet Open'}</div>
                  <div className="text-xs text-slate-500 mb-6">
                    Closes: {tournament.registration_close || tournament.registration_close_iso}
                  </div>
                  <button className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)] transition cursor-not-allowed opacity-90">
                    REGISTER NOW
                  </button>
                  <p className="text-[10px] text-slate-500 mt-3 text-center">Redirects to Hybrid Registration System</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Building className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase">Organizer</p>
                      <p className="text-sm text-slate-200">{tournament.organizer}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase">Contact</p>
                      <p className="text-sm text-slate-200">{tournament.organizer_email}</p>
                      <p className="text-sm text-slate-200">{tournament.organizer_phone}</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
