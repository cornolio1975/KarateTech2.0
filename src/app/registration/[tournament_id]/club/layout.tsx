'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useParams } from 'next/navigation';
import { useTournament } from '@/context/TournamentContext';
import { Shield, Users, Flag, UserCheck, LogOut, Home, Menu, X } from 'lucide-react';
import { basePath } from '@/db/dbClient';

export default function ClubConsoleLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const tournamentId = params?.tournament_id as string;
  const { userRole, clubId, isLoggedIn, logout, tournamentName, isAuthInitialized, filters, setFilters } = useTournament();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    // Wait until auth state is loaded from localStorage before making redirect decisions
    if (!isAuthInitialized) return;

    // If not logged in as a club, or missing club ID, kick them out
    if (!isLoggedIn || userRole !== 'Club' || !clubId) {
      router.replace(`/registration?tournament_id=${tournamentId}`);
    }
  }, [isAuthInitialized, isLoggedIn, userRole, clubId, router, tournamentId]);

  if (!isAuthInitialized || !isLoggedIn || userRole !== 'Club' || !clubId) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#030712]">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    ); // Show a loading spinner while redirecting or initializing
  }

  const menuItems = [
    { id: 'club', label: 'CLUB', path: `/registration/${tournamentId}/club`, icon: Shield },
    { id: 'participants', label: 'PARTICIPANTS', path: `/registration/${tournamentId}/club/participants`, icon: Users },
    { id: 'team', label: 'TEAM', path: `/registration/${tournamentId}/club/teams`, icon: Flag },
  ];

  return (
    <div className="flex h-screen bg-[#030712] text-slate-200 overflow-hidden font-sans">
      
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40
        w-64 bg-[#0f172a] border-r border-slate-800 flex flex-col
        transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col px-5 py-3 border-b border-slate-800 select-none relative">
          
          {/* Mobile Close Button */}
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="absolute top-4 right-4 p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full overflow-hidden border border-white/20 bg-slate-900 shrink-0">
              <img src={`${basePath}/karatetech-logo.png`} alt="Logo" className="h-full w-full object-cover" />
            </div>
            <div className="flex flex-col leading-none flex-1 min-w-0">
              <div style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 900, fontSize: '0.95rem', lineHeight: 1, letterSpacing: '0.01em' }}>
                <span style={{ color: '#b91c2e' }}>Karate</span>
                <span style={{ color: '#38bdf8' }}>Tech</span>
                <span style={{ color: '#ffffff', marginLeft: '3px', fontSize: '0.85rem' }}>2.0</span>
                <span style={{ color: '#94a3b8', fontSize: '0.62rem', marginLeft: '2px', verticalAlign: 'super' }}>©</span>
              </div>
              <div style={{ height: '1.5px', background: 'linear-gradient(90deg, #b91c2e 40%, #38bdf8 70%, transparent 100%)', marginTop: '3px', marginBottom: '3px', borderRadius: '1px' }} />
              <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: '0.46rem', letterSpacing: '0.08em', color: '#94a3b8', lineHeight: 1.2 }}>
                • PRECISION. • SPEED. • RESULTS. •
              </span>
            </div>
          </div>

          {/* SP SportData Solution Logo Image Fitted Below (Seamless transparent blend) */}
          <div className="mt-2 w-full flex items-center justify-center overflow-hidden">
            <img 
              src={`${basePath}/spsportdata-logo.jpg`} 
              alt="SP SportData Solution" 
              className="w-full max-h-[30px] object-contain mix-blend-screen"
            />
          </div>
          
          <div className="mt-4 pt-4 border-t border-slate-800/50 flex flex-col gap-1 text-indigo-400">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <h1 className="font-bold text-lg">Club Console</h1>
            </div>
            <div className="text-xs text-slate-400 font-medium truncate" title={tournamentName || ''}>
              {tournamentName || 'Tournament Registration'}
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            const Icon = item.icon;
            return (
              <div key={item.id} className="group relative">
                <Link
                  href={item.path}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`flex items-center justify-between p-4 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-md shadow-indigo-900/20'
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <Icon className={`h-6 w-6 ${isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                    <span className="font-bold text-sm tracking-wide">{item.label}</span>
                  </div>
                  <span className={`text-[11px] uppercase font-bold px-2.5 py-1 rounded-md bg-black/30 border border-white/5 ${
                    isActive ? 'text-indigo-300 border-indigo-500/20' : 'text-slate-500'
                  }`}>
                    OPEN
                  </span>
                </Link>
              </div>
            );
          })}
        </nav>

        {/* Discipline Filter */}
        <div className="px-4 py-3 border-t border-slate-800 shrink-0">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Discipline Filter</label>
          <select 
            value={filters.discipline}
            onChange={(e) => setFilters(prev => ({ ...prev, discipline: e.target.value as any }))}
            className="w-full px-3 py-2 bg-[#030712] border border-slate-700 rounded-lg text-xs font-semibold text-slate-200 focus:outline-none focus:border-indigo-500 transition-all hover:bg-slate-900 cursor-pointer"
          >
            <option value="ALL">All Disciplines (Kumite & Kata)</option>
            <option value="KUMITE">Kumite Only</option>
            <option value="KATA">Kata Only</option>
          </select>
        </div>

        <div className="p-4 border-t border-slate-800 flex flex-col gap-3 shrink-0">
          <Link
            href={`/registration?tournament_id=${tournamentId}`}
            className="flex items-center gap-4 p-4 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-all text-sm font-bold tracking-wide"
          >
            <Home className="h-5 w-5" />
            PORTAL HOME
          </Link>
          <button
            onClick={() => {
              logout();
              router.push(`/registration?tournament_id=${tournamentId}`);
            }}
            className="flex items-center gap-4 p-4 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all text-sm font-bold tracking-wide text-left w-full cursor-pointer"
          >
            <LogOut className="h-5 w-5" />
            LOG OUT
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-slate-900/50">
        <div className="absolute inset-0 bg-gradient-to-br from-[#030712] via-[#0f172a] to-[#030712] z-0" />
        
        {/* Mobile Header Bar */}
        <div className="lg:hidden relative z-20 bg-[#0f172a]/80 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center gap-4">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="font-bold text-slate-200 truncate flex-1">
            Club Console
          </div>
        </div>

        <div className="relative z-10 flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
