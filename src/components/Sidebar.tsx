'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, Users, UsersRound, Tags, GitPullRequest, 
  CalendarDays, Sword, ShieldCheck, Award, FileText, Settings, Trophy, Tv, LogOut, Zap,
  CalendarCheck, History, Globe, ExternalLink, MonitorPlay
} from 'lucide-react';
import { useTournament } from '@/context/TournamentContext';
import { basePath } from '@/db/dbClient';

const MENU_ITEMS = [
  { name: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
  { name: 'Participants', icon: Users, path: '/participants' },
  { name: 'Teams', icon: UsersRound, path: '/teams' },
  { name: 'Dojos', icon: Award, path: '/clubs' },
  { name: 'Categories', icon: Tags, path: '/categories' },
  { name: 'Draws', icon: GitPullRequest, path: '/draws', badge: 'WKF Standard' },
  { name: 'Schedule', icon: CalendarDays, path: '/schedule' },

  { name: 'Bracket Console Hub', icon: MonitorPlay, path: '/bracket-hub', badge: 'Live' },
  { name: 'Operator Console 2.0', icon: Zap, path: '/dashboard/operator', badge: 'NEW', isYellow: true },
  { name: 'Kumite S-Board', icon: Zap, path: '/dashboard/scoreboard', badge: 'WKF', isYellow: true },
  { name: 'Kata S-Board', icon: Award, path: '/dashboard/kata-scoreboard', badge: 'WKF', isYellow: true },
  { name: 'Officials', icon: ShieldCheck, path: '/officials' },
  { name: 'Public Scoreboard', icon: Tv, path: '/public', badge: 'Live' },
  { name: 'Upcoming Tournaments', icon: CalendarCheck, path: '/public/tournaments', badge: 'New' },
  { name: 'Past Tournaments', icon: History, path: '/public/past-tournaments' },
  { name: 'Project Config', icon: Trophy, path: '/admin/tournaments', badge: 'Active' },
  { name: 'Reports', icon: FileText, path: '/reports' },
  { name: 'Settings', icon: Settings, path: '/settings' },
];


interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { userRole, userEmail, tatamiId, takeoverTatami, releaseTatamiTakeover, logout, logoUrl } = useTournament();

  const isTatamiAccount = userRole === 'Co-Admin';
  const effectiveTatami = takeoverTatami || tatamiId;

  const filteredMenuItems = MENU_ITEMS.filter(item => {
    if (isTatamiAccount && !takeoverTatami) {
      // Tatami 1 / 2 restricted view
      const allowedPaths = [
        '/dashboard/operator',
        '/bracket-hub',
        '/dashboard/scoreboard',
        '/dashboard/kata-scoreboard',
        '/categories',
        '/draws',
        '/schedule',
        '/public'
      ];
      return allowedPaths.includes(item.path);
    }
    return true;
  });

  const getInitials = () => {
    if (takeoverTatami) return `T${takeoverTatami}`;
    if (!userRole) return 'AD';
    if (userRole === 'Co-Admin') return `T${tatamiId || 1}`;
    return 'AD';
  };

  const getRoleLabel = () => {
    if (takeoverTatami) return `Tatami ${takeoverTatami} (Takeover)`;
    if (userRole === 'Admin') return 'Admin Director';
    if (userRole === 'Co-Admin') return `Tatami ${tatamiId || 1} Controller`;
    return 'Viewer';
  };

  return (
    <aside
      className={`
        no-print
        bg-card border-r border-border h-screen flex flex-col shrink-0
        transition-all duration-300 ease-in-out overflow-hidden
        fixed top-0 left-0 z-40
        md:static md:z-auto
        ${isOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full border-none px-0'}
      `}
    >
      <div 
        className="flex flex-col px-5 py-3 border-b border-border select-none bg-card/50"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full overflow-hidden border border-white/20 bg-slate-900 shrink-0">
            <img src={logoUrl || `${basePath}/karatetech-logo.png`} alt="Logo" className="h-full w-full object-cover" />
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
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {filteredMenuItems.map((item) => {
          const isActive = pathname === item.path;
          const Icon = item.icon;
          const isYellow = item.isYellow;

          return (
            <Link
              key={item.name}
              href={item.path}
              prefetch={false}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                isYellow
                  ? isActive
                    ? 'bg-yellow-400/20 text-yellow-400 font-bold border-l-2 border-yellow-400 pl-2.5 shadow-sm'
                    : 'text-yellow-400 hover:bg-yellow-400/10 hover:text-yellow-300 font-semibold'
                  : isActive
                  ? 'bg-secondary text-foreground shadow-sm border-l-2 border-primary pl-2.5'
                  : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
              }`}
            >
              <Icon className={`h-4.5 w-4.5 shrink-0 transition-transform group-hover:scale-105 ${
                isYellow
                  ? 'text-yellow-400'
                  : isActive
                  ? 'text-foreground'
                  : 'text-muted-foreground group-hover:text-foreground'
              }`} />
              <span className="truncate">{item.name}</span>
              
              {item.badge && (
                <span className={`ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                  isYellow
                    ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/30'
                    : 'bg-primary/10 text-primary'
                }`}>
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-border bg-secondary/20 space-y-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">
            {getInitials()}
          </div>
          <div className="min-w-0 flex-1">
            <span className="font-semibold text-xs block text-foreground truncate">{getRoleLabel()}</span>
            <span className="text-[10px] text-muted-foreground truncate block">{userEmail || 'admin@spsportdatasolution.org'}</span>
          </div>
        </div>
        
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-border text-red-500 hover:bg-red-500/10 rounded-lg text-xs font-bold transition cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
