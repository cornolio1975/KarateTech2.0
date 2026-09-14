'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/db/dbClient';
import LoginComponent from '@/components/LoginComponent';
import { useTournament } from '@/context/TournamentContext';
import { 
  CalendarDays, 
  MapPin, 
  User, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  XCircle,
  Trophy,
  FileDown
} from 'lucide-react';

// Date parser helper for cross-browser support
const parseDate = (dateString: string) => {
  if (!dateString) return null;
  const parsed = new Date(dateString);
  return isNaN(parsed.getTime()) ? null : parsed;
};

function RegistrationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tournamentId = searchParams?.get('tournament_id');
  const [loading, setLoading] = useState(true);
  const [tournament, setTournament] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const { setActiveTournamentId, setTournamentName } = useTournament();

  useEffect(() => {
    async function loadTournament() {
      if (!tournamentId) {
        setError('No tournament ID provided.');
        setLoading(false);
        return;
      }
      
      if (!supabase) {
        setError('Database connection not available.');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();
        
      if (error || !data) {
        setError('Invalid tournament ID or tournament not found.');
      } else {
        setTournament(data);
        setActiveTournamentId(data.id);
        setTournamentName(data.name);
      }
      setLoading(false);
    }
    
    loadTournament();
  }, [tournamentId, setActiveTournamentId, setTournamentName]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#030712] text-white">Loading...</div>;
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#030712] text-white space-y-4">
        <h1 className="text-2xl font-bold text-red-500">TOURNAMENT NOT FOUND</h1>
        <p className="text-slate-400">{error}</p>
      </div>
    );
  }

  // Calculate Registration Status
  let registrationStatus = "REGISTRATION NOT YET OPEN";
  let statusColor = "text-yellow-400";
  let statusBg = "bg-yellow-400/10 border-yellow-400/20";
  let StatusIcon = AlertCircle;
  let isRegistrationOpen = false;

  const now = new Date();
  
  // Use ISO dates if available, fallback to standard date strings
  const regCloseDate = parseDate(tournament.registration_close_iso || tournament.registration_close);
  const tournamentDate = parseDate(tournament.date_iso || tournament.date);

  // Determine actual status based on logic
  if (tournament.status === 'Completed' || (tournamentDate && now > new Date(tournamentDate.getTime() + 86400000))) {
    registrationStatus = "TOURNAMENT COMPLETED";
    statusColor = "text-slate-400";
    statusBg = "bg-slate-400/10 border-slate-400/20";
    StatusIcon = CheckCircle2;
  } else if (tournament.status === 'Closed' || (regCloseDate && now > regCloseDate)) {
    registrationStatus = "REGISTRATION CLOSED";
    statusColor = "text-red-400";
    statusBg = "bg-red-400/10 border-red-400/20";
    StatusIcon = XCircle;
  } else if (tournament.status === 'Open' || (regCloseDate && now <= regCloseDate)) {
    registrationStatus = "OPEN FOR REGISTRATION";
    statusColor = "text-emerald-400";
    statusBg = "bg-emerald-400/10 border-emerald-400/20";
    StatusIcon = CheckCircle2;
    isRegistrationOpen = true;
  }

  return (
    <div className="relative min-h-screen w-screen flex flex-col overflow-y-auto overflow-x-hidden bg-[#030712] font-sans text-slate-200">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#030712] via-[#0f172a] to-[#030712] z-0 fixed" />
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse z-0 fixed" style={{ animationDuration: '4s' }} />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/15 rounded-full blur-[150px] animate-pulse z-0 fixed" style={{ animationDuration: '5s' }} />
      
      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-4xl mx-auto px-4 py-12 space-y-8">
        
        {/* Header / Logo */}
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="h-24 w-24 rounded-full bg-slate-900 border-2 border-indigo-500/30 flex items-center justify-center shadow-2xl overflow-hidden shadow-indigo-900/20">
             <Trophy className="h-10 w-10 text-indigo-400" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white uppercase drop-shadow-md px-4">
              {tournament.name}
            </h1>
            <p className="text-sm md:text-base text-indigo-300 font-medium tracking-widest uppercase">
              Official Tournament Registration Portal
            </p>
          </div>
        </div>

        {/* Info Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          
          {/* Tournament Info */}
          <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-white border-b border-white/10 pb-2">Tournament Details</h3>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CalendarDays className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Tournament Date</p>
                  <p className="text-sm text-white font-medium">{tournament.date || 'TBA'}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Venue</p>
                  <p className="text-sm text-white font-medium">{tournament.venue || 'TBA'}</p>
                  {tournament.city && <p className="text-xs text-slate-300">{tournament.city}</p>}
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Organizer</p>
                  <p className="text-sm text-white font-medium">{tournament.organizer || 'KarateTech'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Registration Info */}
          <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-6 space-y-4 shadow-xl flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white border-b border-white/10 pb-2">Registration Status</h3>
              
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Registration Deadline</p>
                  <p className="text-sm text-white font-medium">{tournament.registration_close || 'Not specified'}</p>
                </div>
              </div>

              {/* Status Badge */}
              <div className={`mt-4 p-4 rounded-xl border flex items-center gap-3 ${statusBg}`}>
                <StatusIcon className={`h-6 w-6 ${statusColor}`} />
                <span className={`font-black tracking-wide ${statusColor}`}>
                  {registrationStatus}
                </span>
              </div>
            </div>

            {/* Register Action */}
            <div className="pt-4">
              <button
                disabled={!isRegistrationOpen}
                onClick={() => setIsPopupOpen(true)}
                className={`w-full py-4 rounded-xl font-black text-lg tracking-widest transition-all duration-300 shadow-lg flex items-center justify-center gap-2 ${
                  isRegistrationOpen 
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white hover:scale-[1.02] cursor-pointer shadow-indigo-600/30' 
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                }`}
              >
                {isRegistrationOpen ? 'REGISTER NOW' : 'REGISTRATION UNAVAILABLE'}
              </button>
            </div>
          </div>

        </div>

        {/* Optional Downloads/Information Section */}
        {tournament.pdf_url && (
          <div className="w-full bg-slate-900/40 backdrop-blur-sm border border-white/5 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/20 rounded-lg">
                <FileDown className="h-5 w-5 text-indigo-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Tournament Bulletin</p>
                <p className="text-xs text-slate-400">Download the official tournament rules and schedule.</p>
              </div>
            </div>
            <a 
              href={tournament.pdf_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white rounded-lg transition-colors border border-white/10"
            >
              Download PDF
            </a>
          </div>
        )}

      </div>

      {/* Login Popup Modal */}
      {isPopupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="relative animate-in zoom-in-95 duration-300">
            {/* Close Button */}
            <button 
              onClick={() => setIsPopupOpen(false)}
              className="absolute -top-4 -right-4 z-50 p-2 bg-slate-800 border border-white/10 rounded-full text-slate-300 hover:text-white hover:bg-slate-700 transition-all shadow-xl cursor-pointer"
            >
              <XCircle className="h-6 w-6" />
            </button>
            
            <LoginComponent 
              isRegistrationPopup={true} 
              targetTournamentId={tournamentId || undefined} 
              onSuccess={() => {
                router.push(`/registration/${tournamentId}/club`);
              }}
            />
          </div>
        </div>
      )}

    </div>
  );
}

export default function RegistrationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#030712]" />}>
      <RegistrationContent />
    </Suspense>
  );
}
