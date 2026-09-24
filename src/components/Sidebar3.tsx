'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Trophy, Tags, Users, UsersRound, ShieldCheck, CalendarDays,
  GitPullRequest, Swords, ClipboardList, CheckSquare, BarChart2,
  MonitorPlay, Zap, Award, MousePointer2, AlignJustify, UserCheck, Target, Timer, Video,
  Tv, Monitor, CalendarCheck, Globe,
  FileText, FolderOpen, BarChart, Users2, Building2, Download,
  UserCog, Lock, History, Database, ActivitySquare, Film, Cpu,
  ChevronDown, LogOut, Radio,
} from 'lucide-react';
import { useTournament } from '@/context/TournamentContext';
import { basePath } from '@/db/dbClient';
import {
  NAV_MODULES, filterNavByRole, CO_ADMIN_ALLOWED_PATHS, CLUB_ALLOWED_PATHS, OBSERVER_ALLOWED_PATHS,
  type NavRole, type NavModule, type NavItem,
} from '@/lib/navigation';

// ─── Icon registry ────────────────────────────────────────────────────────
// Maps iconName strings from navigation.ts to actual Lucide components.
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, Trophy, Tags, Users, UsersRound, ShieldCheck, CalendarDays,
  GitPullRequest, Swords, ClipboardList, CheckSquare, BarChart2,
  MonitorPlay, Zap, Award, MousePointer2, AlignJustify, UserCheck, Target, Timer, Video,
  Tv, Monitor, CalendarCheck, Globe,
  FileText, FolderOpen, BarChart, Users2, Building2, Download,
  UserCog, Lock, History, Database, ActivitySquare, Film, Cpu, Radio,
};

function NavIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name] ?? LayoutDashboard;
  return <Icon className={className} />;
}

// ─── Badge colors ─────────────────────────────────────────────────────────
function badgeClass(color?: string): string {
  switch (color) {
    case 'yellow': return 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/30';
    case 'green':  return 'bg-emerald-400/20 text-emerald-400 border border-emerald-400/30';
    case 'red':    return 'bg-red-400/20 text-red-400 border border-red-400/30 animate-pulse';
    case 'blue':   return 'bg-sky-400/20 text-sky-400 border border-sky-400/30';
    default:       return 'bg-secondary/80 text-muted-foreground border border-border/50';
  }
}

// ─── Props ────────────────────────────────────────────────────────────────
interface Sidebar3Props {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Module group component ───────────────────────────────────────────────
function ModuleGroup({
  module,
  pathname,
  onClose,
  defaultOpen,
}: {
  module: NavModule;
  pathname: string | null;
  onClose: () => void;
  defaultOpen: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // Keep group open if any child is active
  const allItems = module.sections.flatMap(s => s.items);
  const hasActive = allItems.some(item => pathname === item.path || pathname?.startsWith(item.path + '/'));

  const effectiveOpen = isOpen || hasActive;

  return (
    <div className="mb-0.5">
      {/* Module header button */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className={`
          w-full flex items-center justify-between px-3 py-1.5 rounded-md
          text-[10px] font-black uppercase tracking-widest transition-colors
          select-none cursor-pointer
          ${effectiveOpen ? 'text-primary/90' : 'text-muted-foreground/60 hover:text-muted-foreground'}
        `}
      >
        <span>{module.label}</span>
        <ChevronDown
          className={`h-3 w-3 transition-transform duration-200 ${effectiveOpen ? 'rotate-0' : '-rotate-90'}`}
        />
      </button>

      {/* Items */}
      {effectiveOpen && (
        <div className="space-y-0.5 pb-1">
          {module.sections.flatMap(section =>
            section.items.map(item => (
              <NavLink key={item.id} item={item} pathname={pathname} onClose={onClose} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Individual nav link ───────────────────────────────────────────────────
function NavLink({
  item,
  pathname,
  onClose,
}: {
  item: NavItem;
  pathname: string | null;
  onClose: () => void;
}) {
  const isActive = pathname === item.path || (item.path !== '/admin' && pathname?.startsWith(item.path + '/'));
  const isScoring = item.badgeColor === 'yellow';

  return (
    <Link
      href={item.path}
      prefetch={false}
      onClick={onClose}
      className={`
        flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium
        transition-all duration-150 group relative
        ${isActive
          ? isScoring
            ? 'bg-yellow-400/15 text-yellow-300 font-bold border-l-2 border-yellow-400 pl-[10px]'
            : 'bg-primary/10 text-foreground font-semibold border-l-2 border-primary pl-[10px]'
          : isScoring
            ? 'text-yellow-400/80 hover:bg-yellow-400/8 hover:text-yellow-300'
            : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
        }
      `}
    >
      <NavIcon
        name={item.iconName}
        className={`h-4 w-4 shrink-0 transition-transform group-hover:scale-105 ${
          isActive
            ? isScoring ? 'text-yellow-400' : 'text-primary'
            : isScoring ? 'text-yellow-400/70' : 'text-muted-foreground group-hover:text-foreground'
        }`}
      />
      <span className="truncate flex-1">{item.label}</span>
      {item.badge && (
        <span className={`ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${badgeClass(item.badgeColor)}`}>
          {item.badge}
        </span>
      )}
    </Link>
  );
}

// ─── Role badge for footer ─────────────────────────────────────────────────
function roleBadgeStyle(role: string): string {
  switch (role) {
    case 'Superadmin': return 'bg-purple-500/20 text-purple-400 border border-purple-500/30';
    case 'Admin':      return 'bg-primary/20 text-primary border border-primary/30';
    case 'Co-Admin':   return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
    case 'Club':       return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
    case 'Observer':   return 'bg-slate-500/20 text-slate-400 border border-slate-500/30';
    default:           return 'bg-secondary/20 text-muted-foreground border border-border';
  }
}

// ─── Main Sidebar3 component ───────────────────────────────────────────────
export default function Sidebar3({ isOpen, onClose }: Sidebar3Props) {
  const pathname = usePathname();
  const { userRole, userEmail, tatamiId, takeoverTatami, logout, logoUrl } = useTournament();

  const isTatamiAccount  = userRole === 'Co-Admin';
  const isClubAccount    = userRole === 'Club';
  const isObserver       = userRole === 'Viewer';
  const isSuperadmin     = userRole === 'Superadmin';

  // Build nav modules filtered by role
  const role: NavRole | null = (userRole as NavRole) ?? null;
  let navModules = filterNavByRole(NAV_MODULES, role);

  // Co-Admin (tatami operator) without takeover — restrict to allowed paths
  if (isTatamiAccount && !takeoverTatami) {
    navModules = navModules.map(mod => ({
      ...mod,
      sections: mod.sections.map(sec => ({
        ...sec,
        items: sec.items.filter(item => CO_ADMIN_ALLOWED_PATHS.some(p => item.path.startsWith(p))),
      })).filter(sec => sec.items.length > 0),
    })).filter(mod => mod.sections.length > 0);
  }

  // Club Manager — restrict to club-relevant paths
  if (isClubAccount) {
    navModules = navModules.map(mod => ({
      ...mod,
      sections: mod.sections.map(sec => ({
        ...sec,
        items: sec.items.filter(item => CLUB_ALLOWED_PATHS.some(p => item.path.startsWith(p))),
      })).filter(sec => sec.items.length > 0),
    })).filter(mod => mod.sections.length > 0);
  }

  // Observer — read-only view
  if (isObserver) {
    navModules = navModules.map(mod => ({
      ...mod,
      sections: mod.sections.map(sec => ({
        ...sec,
        items: sec.items.filter(item => OBSERVER_ALLOWED_PATHS.some(p => item.path.startsWith(p))),
      })).filter(sec => sec.items.length > 0),
    })).filter(mod => mod.sections.length > 0);
  }

  // User display helpers
  const getInitials = (): string => {
    if (takeoverTatami) return `T${takeoverTatami}`;
    if (isSuperadmin) return 'SA';
    if (userRole === 'Co-Admin') return `T${tatamiId || 1}`;
    if (userRole === 'Club') return 'CM';
    return 'AD';
  };

  const getRoleLabel = (): string => {
    if (takeoverTatami) return `Tatami ${takeoverTatami} (Takeover)`;
    if (isSuperadmin) return 'Super Administrator';
    if (userRole === 'Admin') return 'Admin Director';
    if (userRole === 'Co-Admin') return `Tatami ${tatamiId || 1} Operator`;
    if (userRole === 'Club') return 'Club Manager';
    if (userRole === 'Viewer') return 'Observer';
    return 'Viewer';
  };

  const getDisplayRole = (): string => {
    if (isSuperadmin) return 'Superadmin';
    return userRole ?? 'Viewer';
  };

  return (
    <aside
      className={`
        no-print
        bg-card border-r border-border h-screen flex flex-col shrink-0
        transition-all duration-300 ease-in-out overflow-hidden
        fixed top-0 left-0 z-40
        md:static md:z-auto
        ${isOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full border-none'}
      `}
    >
      {/* ── Logo / Branding ───────────────────────────────────────────── */}
      <div className="flex flex-col px-4 py-3 border-b border-border select-none bg-card/60 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full overflow-hidden border border-white/20 bg-slate-900 shrink-0">
            <img
              src={logoUrl || `${basePath}/karatetech-logo.png`}
              alt="KarateTech"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex flex-col leading-none flex-1 min-w-0">
            <div style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 900, fontSize: '0.95rem', lineHeight: 1, letterSpacing: '0.01em' }}>
              <span style={{ color: '#b91c2e' }}>Karate</span>
              <span style={{ color: '#38bdf8' }}>Tech</span>
              <span style={{ color: '#ffffff', marginLeft: '3px', fontSize: '0.85rem' }}>3.0</span>
              <span style={{ color: '#94a3b8', fontSize: '0.62rem', marginLeft: '2px', verticalAlign: 'super' }}>©</span>
            </div>
            <div style={{ height: '1.5px', background: 'linear-gradient(90deg, #b91c2e 40%, #38bdf8 70%, transparent 100%)', marginTop: '3px', marginBottom: '3px', borderRadius: '1px' }} />
            <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: '0.42rem', letterSpacing: '0.1em', color: '#64748b', lineHeight: 1.2 }}>
              • PRECISION. • SPEED. • RESULTS. •
            </span>
          </div>
        </div>

        {/* SP SportData logo */}
        <div className="mt-2 w-full flex items-center justify-center overflow-hidden">
          <img
            src={`${basePath}/spsportdata-logo.jpg`}
            alt="SP SportData Solution"
            className="w-full max-h-[28px] object-contain mix-blend-screen"
          />
        </div>

        {/* Superadmin indicator */}
        {isSuperadmin && (
          <div className="mt-2 flex items-center justify-center">
            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
              ⚡ SUPERADMIN — ALL TOURNAMENTS
            </span>
          </div>
        )}
      </div>

      {/* ── Navigation ────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5 scrollbar-thin">
        {navModules.map(module => (
          <ModuleGroup
            key={module.id}
            module={module}
            pathname={pathname}
            onClose={onClose}
            defaultOpen={module.defaultOpen ?? false}
          />
        ))}
      </nav>

      {/* ── User footer ───────────────────────────────────────────────── */}
      <div className="p-3 border-t border-border bg-secondary/10 shrink-0 space-y-2.5">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs border border-border shrink-0">
            {getInitials()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="font-semibold text-xs text-foreground truncate">{getRoleLabel()}</span>
              <span className={`text-[8px] font-black uppercase tracking-wider px-1 py-0.5 rounded shrink-0 ${roleBadgeStyle(getDisplayRole())}`}>
                {getDisplayRole()}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground truncate block">{userEmail || 'admin@spsportdatasolution.org'}</span>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-3 py-1.5 border border-border text-red-500 hover:bg-red-500/10 rounded-lg text-xs font-bold transition cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
