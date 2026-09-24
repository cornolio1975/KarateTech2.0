// Central KarateTech 3.0 Navigation Configuration
// ─────────────────────────────────────────────────
// SINGLE SOURCE OF TRUTH for all sidebar modules, sections, items, routes,
// permissions, and badges. Never duplicate this logic inside individual pages.
//
// All existing KT 2.0 routes are preserved exactly.
// New KT 3.0 routes are added for genuinely new features (Phases 9-11+).

export type NavRole = 'Admin' | 'Co-Admin' | 'Superadmin' | 'Observer' | 'Club' | 'Viewer';

export interface NavItem {
  id: string;
  label: string;
  iconName: string;
  path: string;
  badge?: string;
  badgeColor?: 'yellow' | 'red' | 'green' | 'blue' | 'default';
  /** Roles allowed to see this item. Undefined = all roles. */
  roles?: NavRole[];
  /** If true, item is only shown in development / when feature flag is active */
  devOnly?: boolean;
}

export interface NavSection {
  id: string;
  label: string;
  items: NavItem[];
}

export interface NavModule {
  id: string;
  label: string;
  sections: NavSection[];
  defaultOpen?: boolean;
}

// ─── Route Constants ────────────────────────────────────────────────────────
export const ROUTES = {
  // MAIN
  dashboard:          '/admin',
  tournamentOverview: '/admin',
  liveTournament:     '/admin',

  // TOURNAMENT
  tournaments:        '/admin/tournaments',
  categories:         '/categories',
  participants:       '/participants',
  clubs:              '/clubs',
  teams:              '/teams',
  officials:          '/officials',
  tatami:             '/schedule',

  // COMPETITION
  brackets:           '/bracket-hub',
  bouts:              '/bracket-hub',
  matchQueue:         '/bracket-hub',
  draws:              '/draws',
  results:            '/reports',
  rankings:           '/reports',

  // SCORING MANAGEMENT
  // Operator Console — existing KT 2.0 hub (preserved exactly)
  operatorConsole:    '/dashboard/operator',
  // Scoreboards — existing KT 2.0 (preserved exactly, protected)
  kumiteBoard:        '/dashboard/scoreboard',
  kataBoard:          '/dashboard/kata-scoreboard',
  // New KT 3.0 dedicated scoring pages (Phases 9-11)
  judgeClickers:      '/scoring/judge-clickers',
  judgePanel:         '/scoring/judge-panel',
  refereeConsole:     '/scoring/referee',
  scoreSupervisor:    '/scoring/supervisor',
  timer:              '/scoring/timer',
  videoReview:        '/scoring/video-review',

  // DISPLAY — existing routes preserved
  liveDisplay:        '/display',
  tatamiDisplay:      '/display',
  upcomingBouts:      '/public/tournaments',
  publicResults:      '/public',

  // REPORTS
  reports:            '/reports',

  // SYSTEM — dedicated routes (Phase 17+), fallback to /settings for now
  users:              '/settings',
  rolesPermissions:   '/settings',
  auditLog:           '/system/audit',
  recovery:           '/system/recovery',
  dataIntegrity:      '/system/data-integrity',
  animations:         '/system/animations',
  systemHealth:       '/system/health',
} as const;

// ─── Navigation Tree ────────────────────────────────────────────────────────
export const NAV_MODULES: NavModule[] = [
  // ── MAIN ─────────────────────────────────────────────────────────────────
  {
    id: 'main',
    label: 'MAIN',
    defaultOpen: true,
    sections: [
      {
        id: 'main-nav',
        label: '',
        items: [
          {
            id: 'dashboard',
            label: 'Dashboard',
            iconName: 'LayoutDashboard',
            path: ROUTES.dashboard,
          },
          {
            id: 'tournament-overview',
            label: 'Tournament Overview',
            iconName: 'Trophy',
            path: ROUTES.tournamentOverview,
          },
          {
            id: 'live-tournament',
            label: 'Live Tournament',
            iconName: 'Radio',
            path: ROUTES.liveTournament,
            badge: 'LIVE',
            badgeColor: 'red',
          },
        ],
      },
    ],
  },

  // ── TOURNAMENT ────────────────────────────────────────────────────────────
  {
    id: 'tournament',
    label: 'TOURNAMENT',
    defaultOpen: true,
    sections: [
      {
        id: 'tournament-nav',
        label: '',
        items: [
          {
            id: 'tournaments',
            label: 'Tournaments',
            iconName: 'Trophy',
            path: ROUTES.tournaments,
            badge: 'Active',
            badgeColor: 'green',
          },
          {
            id: 'categories',
            label: 'Categories',
            iconName: 'Tags',
            path: ROUTES.categories,
          },
          {
            id: 'participants',
            label: 'Participants',
            iconName: 'Users',
            path: ROUTES.participants,
          },
          {
            id: 'clubs-teams',
            label: 'Clubs / Teams',
            iconName: 'UsersRound',
            path: ROUTES.clubs,
          },
          {
            id: 'officials',
            label: 'Officials',
            iconName: 'ShieldCheck',
            path: ROUTES.officials,
          },
          {
            id: 'draws',
            label: 'Draws',
            iconName: 'GitPullRequest',
            path: ROUTES.draws,
          },
          {
            id: 'schedule',
            label: 'Schedule',
            iconName: 'CalendarDays',
            path: ROUTES.tatami,
          },
        ],
      },
    ],
  },

  // ── COMPETITION ───────────────────────────────────────────────────────────
  {
    id: 'competition',
    label: 'COMPETITION',
    defaultOpen: true,
    sections: [
      {
        id: 'competition-nav',
        label: '',
        items: [
          {
            id: 'brackets',
            label: 'Brackets',
            iconName: 'GitPullRequest',
            path: ROUTES.brackets,
            badge: 'Live',
            badgeColor: 'green',
          },
          {
            id: 'bouts-matches',
            label: 'Bouts / Matches',
            iconName: 'Swords',
            path: ROUTES.bouts,
          },
          {
            id: 'match-queue',
            label: 'Match Queue',
            iconName: 'ClipboardList',
            path: ROUTES.matchQueue,
          },
          {
            id: 'results',
            label: 'Results',
            iconName: 'CheckSquare',
            path: ROUTES.results,
          },
          {
            id: 'rankings',
            label: 'Rankings',
            iconName: 'BarChart2',
            path: ROUTES.rankings,
          },
        ],
      },
    ],
  },

  // ── SCORING MANAGEMENT ────────────────────────────────────────────────────
  {
    id: 'scoring',
    label: 'SCORING MANAGEMENT',
    defaultOpen: false,
    sections: [
      {
        id: 'scoring-nav',
        label: '',
        items: [
          {
            id: 'operator-console',
            label: 'Main Operator Console',
            iconName: 'MonitorPlay',
            path: ROUTES.operatorConsole,
            badge: 'Live',
            badgeColor: 'yellow',
          },
          {
            id: 'kumite-board',
            label: 'Kumite S-Board',
            iconName: 'Zap',
            path: ROUTES.kumiteBoard,
            badge: 'WKF',
            badgeColor: 'yellow',
          },
          {
            id: 'kata-board',
            label: 'Kata S-Board',
            iconName: 'Award',
            path: ROUTES.kataBoard,
            badge: 'WKF',
            badgeColor: 'yellow',
          },
          {
            id: 'judge-clickers',
            label: 'Judge Clickers',
            iconName: 'MousePointer2',
            path: ROUTES.judgeClickers,
          },
          {
            id: 'judge-panel',
            label: 'Judge Panel',
            iconName: 'AlignJustify',
            path: ROUTES.judgePanel,
          },
          {
            id: 'referee-console',
            label: 'Referee Console',
            iconName: 'UserCheck',
            path: ROUTES.refereeConsole,
          },
          {
            id: 'score-supervisor',
            label: 'Score Supervisor',
            iconName: 'Target',
            path: ROUTES.scoreSupervisor,
          },
          {
            id: 'timer',
            label: 'Timer / Timekeeper',
            iconName: 'Timer',
            path: ROUTES.timer,
          },
          {
            id: 'video-review',
            label: 'Video Review',
            iconName: 'Video',
            path: ROUTES.videoReview,
          },
        ],
      },
    ],
  },

  // ── DISPLAY ───────────────────────────────────────────────────────────────
  {
    id: 'display',
    label: 'DISPLAY',
    defaultOpen: false,
    sections: [
      {
        id: 'display-nav',
        label: '',
        items: [
          {
            id: 'live-display',
            label: 'Live Tournament Display',
            iconName: 'Tv',
            path: ROUTES.liveDisplay,
            badge: 'Live',
            badgeColor: 'green',
          },
          {
            id: 'tatami-display',
            label: 'Tatami Display',
            iconName: 'Monitor',
            path: ROUTES.tatamiDisplay,
          },
          {
            id: 'upcoming-bouts',
            label: 'Upcoming Bouts',
            iconName: 'CalendarCheck',
            path: ROUTES.upcomingBouts,
            badge: 'New',
            badgeColor: 'blue',
          },
          {
            id: 'public-results',
            label: 'Public Results',
            iconName: 'Globe',
            path: ROUTES.publicResults,
          },
        ],
      },
    ],
  },

  // ── REPORTS ───────────────────────────────────────────────────────────────
  {
    id: 'reports',
    label: 'REPORTS',
    defaultOpen: false,
    sections: [
      {
        id: 'reports-nav',
        label: '',
        items: [
          {
            id: 'tournament-reports',
            label: 'Tournament Reports',
            iconName: 'FileText',
            path: ROUTES.reports,
          },
          {
            id: 'category-reports',
            label: 'Category Reports',
            iconName: 'FolderOpen',
            path: ROUTES.reports,
          },
          {
            id: 'bout-reports',
            label: 'Bout Reports',
            iconName: 'BarChart',
            path: ROUTES.reports,
          },
          {
            id: 'participant-reports',
            label: 'Participant Reports',
            iconName: 'Users2',
            path: ROUTES.reports,
          },
          {
            id: 'club-reports',
            label: 'Club Reports',
            iconName: 'Building2',
            path: ROUTES.reports,
          },
          {
            id: 'export-print',
            label: 'Export / Print',
            iconName: 'Download',
            path: ROUTES.reports,
          },
        ],
      },
    ],
  },

  // ── SYSTEM ────────────────────────────────────────────────────────────────
  {
    id: 'system',
    label: 'SYSTEM',
    defaultOpen: false,
    sections: [
      {
        id: 'system-nav',
        label: '',
        items: [
          {
            id: 'users',
            label: 'Users',
            iconName: 'UserCog',
            path: ROUTES.users,
            roles: ['Admin', 'Superadmin'],
          },
          {
            id: 'roles-permissions',
            label: 'Roles & Permissions',
            iconName: 'Lock',
            path: ROUTES.rolesPermissions,
            roles: ['Admin', 'Superadmin'],
          },
          {
            id: 'audit-log',
            label: 'Audit Log',
            iconName: 'History',
            path: ROUTES.auditLog,
            roles: ['Admin', 'Superadmin'],
          },
          {
            id: 'recovery',
            label: 'Recovery / Snapshots',
            iconName: 'Database',
            path: ROUTES.recovery,
            roles: ['Admin', 'Superadmin'],
          },
          {
            id: 'data-integrity',
            label: 'Data Integrity',
            iconName: 'ActivitySquare',
            path: ROUTES.dataIntegrity,
            roles: ['Admin', 'Superadmin'],
          },
          {
            id: 'animations',
            label: 'Animation Management',
            iconName: 'Film',
            path: ROUTES.animations,
            roles: ['Admin', 'Superadmin'],
          },
          {
            id: 'system-health',
            label: 'System Health',
            iconName: 'Cpu',
            path: ROUTES.systemHealth,
            roles: ['Admin', 'Superadmin'],
          },
        ],
      },
    ],
  },
];

// ─── Utilities ──────────────────────────────────────────────────────────────

/** Filter nav modules by user role */
export function filterNavByRole(modules: NavModule[], role: NavRole | null): NavModule[] {
  if (!role) return modules;
  // Superadmin sees everything
  if (role === 'Superadmin') return modules;
  return modules
    .map(mod => ({
      ...mod,
      sections: mod.sections
        .map(sec => ({
          ...sec,
          items: sec.items.filter(item => !item.roles || item.roles.includes(role)),
        }))
        .filter(sec => sec.items.length > 0),
    }))
    .filter(mod => mod.sections.length > 0);
}

/** Get all nav items flattened (for active-path detection) */
export function flattenNavItems(modules: NavModule[]): NavItem[] {
  return modules.flatMap(mod => mod.sections.flatMap(sec => sec.items));
}

/** Co-Admin restricted paths (tatami operator) */
export const CO_ADMIN_ALLOWED_PATHS = [
  '/dashboard/operator',
  '/bracket-hub',
  '/dashboard/scoreboard',
  '/dashboard/kata-scoreboard',
  '/scoring/judge-clickers',
  '/scoring/referee',
  '/scoring/timer',
  '/categories',
  '/draws',
  '/schedule',
  '/public',
];

/** Club Manager restricted paths */
export const CLUB_ALLOWED_PATHS = [
  '/admin',
  '/admin/tournaments',
  '/categories',
  '/participants',
  '/clubs',
  '/teams',
  '/officials',
  '/reports',
  '/public',
  '/public/tournaments',
];

/** Observer restricted paths (read-only) */
export const OBSERVER_ALLOWED_PATHS = [
  '/admin',
  '/categories',
  '/participants',
  '/clubs',
  '/reports',
  '/public',
  '/public/tournaments',
];
