'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { supabase, basePath, db } from '@/db/dbClient';
import { CategoryLock } from '@/db/types';

export interface FilterState {
  gender: string[];
  payment_status: string[];
  medical_status: string[];
  status: string[];
  club_id: string[];
  coach_id: string[];
  nationality_code: string[];
}

export const INITIAL_ACCOUNT_RULES = {
  'admin@spsportdatasolution.org': {
    role: 'Admin',
    pcId: 'admin',
    tatami: null,
  },
  'tatami_1@spsportdatasolution.org': {
    role: 'Co-Admin',
    pcId: 'tatami_1',
    tatami: 1,
  },
  'tatami_2@spsportdatasolution.org': {
    role: 'Co-Admin',
    pcId: 'tatami_2',
    tatami: 2,
  },
} as const;

export type PCIdentity = {
  pcId: string;
  tatamiId: number | null;
};

export interface TatamiTelemetry {
  tatamiId: 1 | 2;
  pcId: string;
  username: string;
  status: 'online' | 'offline' | 'taken_over' | 'disconnected';
  lastHeartbeat: string;
  currentCategoryId: string | null;
  currentCategoryName: string | null;
  currentMatchId: string | null;
  currentMatchCode: string | null; // e.g. "R2B3"
  currentBoutNo: number | null;
  currentScreenState: string | null; // e.g. "Kumite Scoreboard", "Kata Scoreboard", "Bracket Console", "Idle"
  isAdminControlled: boolean;
}

interface TournamentContextType {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  resetFilters: () => void;
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
  isAddOpen: boolean;
  setIsAddOpen: (open: boolean) => void;
  isFilterOpen: boolean;
  setIsFilterOpen: (open: boolean) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  refreshKey: number;
  triggerRefresh: () => void;
  tournamentName: string;
  setTournamentName: (name: string) => void;
  liveStreamUrl: string;
  setLiveStreamUrl: (url: string) => void;
  userRole: 'Admin' | 'Co-Admin' | 'Viewer' | null;
  isLoggedIn: boolean;
  login: (role: 'Admin' | 'Co-Admin' | 'Viewer', email?: string, pcId?: string | null, tatamiId?: number | null) => void;
  logout: () => void;
  userEmail: string;
  pcId: string | null;
  tatamiId: number | null;
  takeoverTatami: 1 | 2 | null;
  setTakeoverTatami: (tatami: 1 | 2 | null) => void;
  tatamiTelemetry: Record<number, TatamiTelemetry>;
  updateTatamiTelemetry: (data: Partial<TatamiTelemetry>) => void;
  assignCategoryToTatami: (categoryId: string, tatami: 'Tatami 1' | 'Tatami 2') => Promise<void>;
  releaseCategoryFromTatami: (categoryId: string) => Promise<void>;
  lockCategoryByAdmin: (categoryId: string) => Promise<void>;
  disconnectTatamiPC: (tatamiId: 1 | 2) => Promise<void>;
  reconnectTatamiPC: (tatamiId: 1 | 2) => Promise<void>;
  takeoverTatamiPC: (tatamiId: 1 | 2) => Promise<void>;
  releaseTatamiTakeover: (tatamiId: 1 | 2) => Promise<void>;
  logoUrl: string;
  setLogoUrl: (url: string) => void;
  usersList: SystemUser[];
  addUser: (user: SystemUser) => void;
  updateUser: (email: string, updates: Partial<SystemUser>) => void;
  deleteUser: (email: string) => void;
  globalAccessibility: AccessibilitySettings;
  setGlobalAccessibility: (settings: AccessibilitySettings) => void;
  canModify: boolean;
  activeLocks: CategoryLock[];
  refreshLocks: () => Promise<void>;
  activeTournamentId: string | null;
  acquireLock: (categoryId: string) => Promise<{ success: boolean }>;
  releaseLock: (categoryId: string) => Promise<void>;
}

export interface AccessibilitySettings {
  themeContrast: 'standard' | 'high-contrast';
  textScale: 'standard' | 'large' | 'extra-large';
  reducedMotion: boolean;
  legibilityFont: 'standard' | 'dyslexic';
}

export interface SystemUser {
  name: string;
  email: string;
  role: 'Admin' | 'Co-Admin' | 'Viewer';
  status: 'Active' | 'Suspended';
  canModify: boolean;
  accessibility: AccessibilitySettings;
}

const defaultAccessibility: AccessibilitySettings = {
  themeContrast: 'standard',
  textScale: 'standard',
  reducedMotion: false,
  legibilityFont: 'standard'
};

const defaultUsers: SystemUser[] = [
  {
    name: 'Tournament Director',
    email: 'admin@senshikarate.com',
    role: 'Admin',
    status: 'Active',
    canModify: true,
    accessibility: {
      themeContrast: 'standard',
      textScale: 'standard',
      reducedMotion: false,
      legibilityFont: 'standard'
    }
  },
  {
    name: 'Assistant Coach',
    email: 'coadmin@senshikarate.com',
    role: 'Co-Admin',
    status: 'Active',
    canModify: false,
    accessibility: {
      themeContrast: 'standard',
      textScale: 'standard',
      reducedMotion: false,
      legibilityFont: 'standard'
    }
  },
  {
    name: 'Spectator Account',
    email: 'spectator@senshikarate.com',
    role: 'Viewer',
    status: 'Active',
    canModify: false,
    accessibility: {
      themeContrast: 'standard',
      textScale: 'standard',
      reducedMotion: false,
      legibilityFont: 'standard'
    }
  }
];

const initialFilters: FilterState = {
  gender: [],
  payment_status: [],
  medical_status: [],
  status: [],
  club_id: [],
  coach_id: [],
  nationality_code: [],
};

const TournamentContext = createContext<TournamentContextType | undefined>(undefined);

export function TournamentProvider({ children }: { children: React.ReactNode }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [refreshKey, setRefreshKey] = useState(0);
  const [tournamentName, setTournamentNameState] = useState('Kelab Senshi Goju-Ryu Open Karate Championship 2026');
  const [liveStreamUrl, setLiveStreamUrlState] = useState('');
  const [logoUrl, setLogoUrlState] = useState(`${basePath}/karatetech-logo.png`);

  // Auth state
  const [userRole, setUserRole] = useState<'Admin' | 'Co-Admin' | 'Viewer' | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [pcId, setPcId] = useState<string | null>(null);
  const [tatamiId, setTatamiId] = useState<number | null>(null);

  // User & Accessibility states
  const [usersList, setUsersListState] = useState<SystemUser[]>([]);
  const [globalAccessibility, setGlobalAccessibilityState] = useState<AccessibilitySettings>(defaultAccessibility);
  const [canModify, setCanModify] = useState<boolean>(false);
  
  // PC Control & Locks
  const [activeLocks, setActiveLocks] = useState<CategoryLock[]>([]);
  const [activeTournamentId, setActiveTournamentId] = useState<string | null>(null);
  const [takeoverTatami, setTakeoverTatamiState] = useState<1 | 2 | null>(null);

  const setTakeoverTatami = useCallback((tatami: 1 | 2 | null) => {
    setTakeoverTatamiState(tatami);
    if (typeof window !== 'undefined') {
      if (tatami) localStorage.setItem('ts_takeover_tatami', String(tatami));
      else localStorage.removeItem('ts_takeover_tatami');
    }
  }, []);

  const pathname = usePathname();

  const getScreenLabel = useCallback((path: string) => {
    if (!path) return 'Standby';
    if (path.includes('/dashboard/operator')) return 'Operator Console 2.0';
    if (path.includes('/dashboard/scoreboard')) return 'Kumite Scoreboard (Live Scoring)';
    if (path.includes('/dashboard/kata-scoreboard')) return 'Kata Scoreboard (Live Scoring)';
    if (path.includes('/dashboard/control')) return 'Kumite Control Panel';
    if (path.includes('/dashboard/kata-control')) return 'Kata Control Panel';
    if (path.includes('/bracket-hub')) return 'Bracket Console Hub';
    if (path.includes('/categories')) return 'Category Management';
    if (path.includes('/draws')) return 'Draws & Bracket Generator';
    if (path.includes('/schedule')) return 'Match Scheduler';
    if (path.includes('/display')) return 'Spectator Arena Display';
    if (path.includes('/admin')) return 'Admin Command Center';
    return 'Operator Standby';
  }, []);

  const [tatamiTelemetry, setTatamiTelemetry] = useState<Record<number, TatamiTelemetry>>({
    1: {
      tatamiId: 1,
      pcId: 'tatami_1',
      username: 'tatami_1@spsportdatasolution.org',
      status: 'online',
      lastHeartbeat: new Date().toISOString(),
      currentCategoryId: null,
      currentCategoryName: null,
      currentMatchId: null,
      currentMatchCode: null,
      currentBoutNo: null,
      currentScreenState: 'Operator Console 2.0',
      isAdminControlled: false,
    },
    2: {
      tatamiId: 2,
      pcId: 'tatami_2',
      username: 'tatami_2@spsportdatasolution.org',
      status: 'online',
      lastHeartbeat: new Date().toISOString(),
      currentCategoryId: null,
      currentCategoryName: null,
      currentMatchId: null,
      currentMatchCode: null,
      currentBoutNo: null,
      currentScreenState: 'Operator Console 2.0',
      isAdminControlled: false,
    }
  });

  const updateTatamiTelemetry = useCallback((data: Partial<TatamiTelemetry>) => {
    const tId = data.tatamiId || tatamiId || takeoverTatami || (userEmail === 'tatami_2@spsportdatasolution.org' ? 2 : userEmail === 'tatami_1@spsportdatasolution.org' ? 1 : null);
    if (!tId || (tId !== 1 && tId !== 2)) return;

    setTatamiTelemetry(prev => {
      const existing = prev[tId] || {
        tatamiId: tId as 1 | 2,
        pcId: tId === 1 ? 'tatami_1' : 'tatami_2',
        username: tId === 1 ? 'tatami_1@spsportdatasolution.org' : 'tatami_2@spsportdatasolution.org',
        status: 'online',
        lastHeartbeat: new Date().toISOString(),
        currentCategoryId: null,
        currentCategoryName: null,
        currentMatchId: null,
        currentMatchCode: null,
        currentBoutNo: null,
        currentScreenState: 'Operator Console 2.0',
        isAdminControlled: false,
      };

      const updated = {
        ...existing,
        ...data,
        lastHeartbeat: new Date().toISOString()
      };

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`kt_tatami_telemetry_${tId}`, JSON.stringify(updated));
          const channel = new BroadcastChannel('kt-tatami-heartbeats');
          channel.postMessage({
            type: 'TELEMETRY_UPDATE',
            telemetry: updated
          });
          channel.close();
        } catch (e) {}
      }

      return {
        ...prev,
        [tId]: updated
      };
    });
  }, [tatamiId, takeoverTatami, userEmail]);

  const assignCategoryToTatami = useCallback(async (categoryId: string, tatami: 'Tatami 1' | 'Tatami 2') => {
    const tatamiNum = tatami === 'Tatami 1' ? 1 : 2;
    const targetPcId = tatamiNum === 1 ? 'tatami_1' : 'tatami_2';
    const targetUsername = tatamiNum === 1 ? 'tatami_1@spsportdatasolution.org' : 'tatami_2@spsportdatasolution.org';
    
    // 0. Force break any existing lock so dbClient allows our updates
    if (activeTournamentId) {
      await db.pcControl.overrideLock(activeTournamentId, categoryId, 'admin');
    }

    // 1. Update Category record (best-effort — assigned_tatami may not exist in Supabase schema)
    try {
      await db.categories.update(categoryId, {
        assigned_tatami: tatami,
        status: 'Open'
      } as any);
    } catch (catUpdateErr: any) {
      // PGRST204: column doesn't exist in Supabase — safe to ignore, we use ts_cat_tatami_map instead
      console.warn('[assignCategoryToTatami] categories.update ignored (column may not exist in DB):', catUpdateErr?.message || catUpdateErr);
    }

    // 2. Cascade Tatami Ring to all existing bouts in this Category
    try {
      const allBouts = await db.bouts.list();
      const catBouts = allBouts.filter(b => String(b.category_id) === String(categoryId));
      await Promise.all(catBouts.map(b => db.bouts.update(b.id, { tatami })));

      if (typeof window !== 'undefined') {
        // Update ts_bouts so schedule page reflects immediately
        const storedBouts = localStorage.getItem('ts_bouts');
        if (storedBouts) {
          const parsed = JSON.parse(storedBouts);
          const updated = parsed.map((b: any) => String(b.category_id) === String(categoryId) ? { ...b, tatami } : b);
          localStorage.setItem('ts_bouts', JSON.stringify(updated));
        }

        // *** CRITICAL: Persist assigned_tatami to ts_categories so generateDraw reads it correctly ***
        const storedCats = localStorage.getItem('ts_categories');
        if (storedCats) {
          const parsedCats = JSON.parse(storedCats);
          const updatedCats = parsedCats.map((c: any) => String(c.id) === String(categoryId) ? { ...c, assigned_tatami: tatami } : c);
          localStorage.setItem('ts_categories', JSON.stringify(updatedCats));
        }

        // *** MOST RELIABLE: Persist to dedicated cat-tatami map key (survives Supabase syncs) ***
        try {
          const rawMap = localStorage.getItem('ts_cat_tatami_map');
          const catTatamiMap = rawMap ? JSON.parse(rawMap) : {};
          catTatamiMap[String(categoryId)] = tatami;
          localStorage.setItem('ts_cat_tatami_map', JSON.stringify(catTatamiMap));
        } catch (mapErr) {
          console.warn('Failed to persist cat-tatami map:', mapErr);
        }
      }
    } catch (e) {
      console.warn('Failed cascading tatami assignment to category bouts:', e);
    }

    // 3. Update PC locks
    if (activeTournamentId) {
      await db.pcControl.acquireLock(activeTournamentId, categoryId, targetPcId, tatami, targetUsername);
      const locks = await db.pcControl.getActiveLocks(activeTournamentId);
      setActiveLocks(locks);
    }

    if (typeof window !== 'undefined') {
      try {
        const channel = new BroadcastChannel('kt-tatami-heartbeats');
        channel.postMessage({
          type: 'CATEGORY_ASSIGNED',
          categoryId,
          tatami,
          tatamiNum
        });
        channel.close();

        const schedChannel = new BroadcastChannel('kt-schedule-sync');
        schedChannel.postMessage({
          type: 'CATEGORY_ASSIGNED',
          categoryId,
          tatami
        });
        schedChannel.close();
      } catch (e) {}
    }
    setRefreshKey(prev => prev + 1);
  }, [activeTournamentId]);

  const releaseCategoryFromTatami = useCallback(async (categoryId: string) => {
    // 1. Update Category record (best-effort — assigned_tatami may not exist in Supabase schema)
    try {
      await db.categories.update(categoryId, {
        assigned_tatami: null
      } as any);
    } catch (catUpdateErr: any) {
      console.warn('[releaseCategoryFromTatami] categories.update ignored:', catUpdateErr?.message || catUpdateErr);
    }

    // 2. Cascade unassigned state to bouts
    try {
      const allBouts = await db.bouts.list();
      const catBouts = allBouts.filter(b => String(b.category_id) === String(categoryId));
      await Promise.all(catBouts.map(b => db.bouts.update(b.id, { tatami: null as any })));

      if (typeof window !== 'undefined') {
        const storedBouts = localStorage.getItem('ts_bouts');
        if (storedBouts) {
          const parsed = JSON.parse(storedBouts);
          const updated = parsed.map((b: any) => String(b.category_id) === String(categoryId) ? { ...b, tatami: null } : b);
          localStorage.setItem('ts_bouts', JSON.stringify(updated));
        }

        // Clear assigned_tatami from ts_categories in localStorage
        const storedCats = localStorage.getItem('ts_categories');
        if (storedCats) {
          const parsedCats = JSON.parse(storedCats);
          const updatedCats = parsedCats.map((c: any) => String(c.id) === String(categoryId) ? { ...c, assigned_tatami: null } : c);
          localStorage.setItem('ts_categories', JSON.stringify(updatedCats));
        }

        // Clear from dedicated cat-tatami map
        try {
          const rawMap = localStorage.getItem('ts_cat_tatami_map');
          if (rawMap) {
            const catTatamiMap = JSON.parse(rawMap);
            delete catTatamiMap[String(categoryId)];
            localStorage.setItem('ts_cat_tatami_map', JSON.stringify(catTatamiMap));
          }
        } catch (mapErr) {
          console.warn('Failed to clear cat-tatami map:', mapErr);
        }
      }
    } catch (e) {
      console.warn('Failed clearing tatami from category bouts:', e);
    }

    // 3. Release locks
    if (activeTournamentId) {
      await db.pcControl.overrideLock(activeTournamentId, categoryId, 'admin');
      const locks = await db.pcControl.getActiveLocks(activeTournamentId);
      setActiveLocks(locks);
    }

    if (typeof window !== 'undefined') {
      try {
        const channel = new BroadcastChannel('kt-tatami-heartbeats');
        channel.postMessage({
          type: 'CATEGORY_RELEASED',
          categoryId
        });
        channel.close();

        const schedChannel = new BroadcastChannel('kt-schedule-sync');
        schedChannel.postMessage({
          type: 'CATEGORY_RELEASED',
          categoryId
        });
        schedChannel.close();
      } catch (e) {}
    }
    setRefreshKey(prev => prev + 1);
  }, [activeTournamentId]);

  const lockCategoryByAdmin = useCallback(async (categoryId: string) => {
    await db.categories.update(categoryId, {
      status: 'Locked'
    } as any);

    if (activeTournamentId) {
      await db.pcControl.acquireLock(activeTournamentId, categoryId, 'admin', 'Admin Lock', 'admin@spsportdatasolution.org');
      const locks = await db.pcControl.getActiveLocks(activeTournamentId);
      setActiveLocks(locks);
    }

    if (typeof window !== 'undefined') {
      try {
        const channel = new BroadcastChannel('kt-tatami-heartbeats');
        channel.postMessage({
          type: 'CATEGORY_LOCKED',
          categoryId
        });
        channel.close();
      } catch (e) {}
    }
    setRefreshKey(prev => prev + 1);
  }, [activeTournamentId]);

  const disconnectTatamiPC = useCallback(async (tatamiIdNum: 1 | 2) => {
    setTatamiTelemetry(prev => ({
      ...prev,
      [tatamiIdNum]: {
        ...prev[tatamiIdNum],
        status: 'disconnected'
      }
    }));
    if (typeof window !== 'undefined') {
      try {
        const channel = new BroadcastChannel('kt-tatami-heartbeats');
        channel.postMessage({
          type: 'TATAMI_DISCONNECTED',
          tatamiId: tatamiIdNum
        });
        channel.close();
      } catch (e) {}
    }
  }, []);

  const reconnectTatamiPC = useCallback(async (tatamiIdNum: 1 | 2) => {
    setTatamiTelemetry(prev => ({
      ...prev,
      [tatamiIdNum]: {
        ...prev[tatamiIdNum],
        status: 'online',
        lastHeartbeat: new Date().toISOString()
      }
    }));
    if (typeof window !== 'undefined') {
      try {
        const channel = new BroadcastChannel('kt-tatami-heartbeats');
        channel.postMessage({
          type: 'TATAMI_RECONNECTED',
          tatamiId: tatamiIdNum
        });
        channel.close();
      } catch (e) {}
    }
  }, []);

  const takeoverTatamiPC = useCallback(async (tatamiIdNum: 1 | 2) => {
    setTakeoverTatami(tatamiIdNum);
    if (activeTournamentId) {
      db.pcControl.setAdminControlled(activeTournamentId, `Tatami ${tatamiIdNum}`, true).catch(console.error);
    }
    setTatamiTelemetry(prev => ({
      ...prev,
      [tatamiIdNum]: {
        ...prev[tatamiIdNum],
        status: 'taken_over',
        isAdminControlled: true
      }
    }));
    if (typeof window !== 'undefined') {
      try {
        const channel = new BroadcastChannel('kt-tatami-heartbeats');
        channel.postMessage({
          type: 'TAKEOVER_ACTIVE',
          tatamiId: tatamiIdNum
        });
        channel.close();
      } catch (e) {}
    }
  }, [setTakeoverTatami]);

  const releaseTatamiTakeover = useCallback(async (tatamiIdNum: 1 | 2) => {
    setTakeoverTatami(null);
    if (activeTournamentId) {
      db.pcControl.setAdminControlled(activeTournamentId, `Tatami ${tatamiIdNum}`, false).catch(console.error);
    }
    setTatamiTelemetry(prev => ({
      ...prev,
      [tatamiIdNum]: {
        ...prev[tatamiIdNum],
        isAdminControlled: false,
        status: 'online'
      }
    }));
    if (typeof window !== 'undefined') {
      try {
        const channel = new BroadcastChannel('kt-tatami-heartbeats');
        channel.postMessage({
          type: 'TAKEOVER_RELEASED',
          tatamiId: tatamiIdNum
        });
        channel.close();
      } catch (e) {}
    }
  }, [setTakeoverTatami]);

  // Heartbeat listener channel
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const channel = new BroadcastChannel('kt-tatami-heartbeats');
    channel.onmessage = (event) => {
      const data = event.data;
      if (data?.type === 'TELEMETRY_UPDATE' && data.telemetry) {
        const item = data.telemetry as TatamiTelemetry;
        setTatamiTelemetry(prev => ({
          ...prev,
          [item.tatamiId]: item
        }));
      } else if (data?.type === 'CATEGORY_ASSIGNED' || data?.type === 'CATEGORY_RELEASED' || data?.type === 'CATEGORY_LOCKED') {
        setRefreshKey(prev => prev + 1);
        if (activeTournamentId) {
          db.pcControl.getActiveLocks(activeTournamentId).then(setActiveLocks).catch(console.error);
        }
      }
    };
    return () => channel.close();
  }, [activeTournamentId]);

  const refreshLocks = useCallback(async () => {
    if (activeTournamentId) {
      const locks = await db.pcControl.getActiveLocks(activeTournamentId);
      setActiveLocks(locks);
    }
  }, [activeTournamentId]);

  const acquireLock = useCallback(async (categoryId: string): Promise<{ success: boolean }> => {
    if (!supabase || !pcId || !activeTournamentId) return { success: false };
    
    const effectiveTatami = takeoverTatami || tatamiId || (userEmail === 'tatami_2@spsportdatasolution.org' ? 2 : userEmail === 'tatami_1@spsportdatasolution.org' ? 1 : 1);
    
    const result = await db.pcControl.acquireLock(
      activeTournamentId,
      categoryId,
      pcId,
      `Tatami ${effectiveTatami}`,
      userEmail || undefined
    );
    if (result.success) await refreshLocks();
    return result;
  }, [pcId, activeTournamentId, tatamiId, userEmail, refreshLocks]);

  const releaseLock = useCallback(async (categoryId: string): Promise<void> => {
    if (!supabase || !pcId || !activeTournamentId) return;
    await db.pcControl.releaseLock(activeTournamentId, categoryId, pcId);
    await refreshLocks();
  }, [pcId, activeTournamentId, refreshLocks]);

  // Dynamic canModify calculation
  useEffect(() => {
    if (!isLoggedIn) {
      setCanModify(false);
      return;
    }
    // Admin and Co-Admin always can modify (regardless of system_users table)
    if (userRole === 'Admin' || userRole === 'Co-Admin') {
      setCanModify(true);
      return;
    }
    // For Viewer role, check per-user canModify flag in usersList
    const matched = usersList.find(u => u.email.toLowerCase() === userEmail.toLowerCase());
    setCanModify(!!matched?.canModify);
  }, [isLoggedIn, userRole, userEmail, usersList]);

  // Initialize theme, livestream, users and auth role
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme') as 'light' | 'dark' | null;
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initialTheme = stored || (prefersDark ? 'dark' : 'light');
      
      setTheme(initialTheme);
      document.documentElement.classList.toggle('dark', initialTheme === 'dark');

      const storedName = localStorage.getItem('ts_tournament_name');
      if (storedName) {
        if (storedName === '1st Kelab Senshi Goju-Ryu Championship 2026') {
          setTournamentName('Kelab Senshi Goju-Ryu Open Karate Championship 2026');
        } else {
          setTournamentNameState(storedName);
        }
      }

      const storedStream = localStorage.getItem('ts_livestream_url');
      if (storedStream) {
        setLiveStreamUrlState(storedStream);
      }

      const storedLogo = localStorage.getItem('ts_logo_url');
      if (storedLogo && !storedLogo.includes('logo.jpg')) {
        setLogoUrlState(storedLogo);
      } else {
        setLogoUrlState(`${basePath}/karatetech-logo.png`);
      }

      const storedRole = localStorage.getItem('ts_user_role') as 'Admin' | 'Co-Admin' | 'Viewer' | null;
      const storedEmail = localStorage.getItem('ts_user_email') || '';
      const storedPcId = localStorage.getItem('ts_pc_id');
      const storedTatamiId = localStorage.getItem('ts_tatami_id');
      
      if (storedRole) {
        setUserRole(storedRole);
        setUserEmail(storedEmail);
        setPcId(storedPcId);
        setTatamiId(storedTatamiId ? parseInt(storedTatamiId, 10) : null);
        setIsLoggedIn(true);
      }

      // Initialize users list
      const storedUsers = localStorage.getItem('ts_users_list');
      let initialList = defaultUsers;
      if (storedUsers) {
        try {
          initialList = JSON.parse(storedUsers);
        } catch (e) {}
      }
      setUsersListState(initialList);

      // Async fetch users and tournament from Supabase if available
      if (supabase) {
        supabase
          .from('system_users')
          .select('*')
          .then(({ data, error }) => {
            if (!error && data && data.length > 0) {
              const mapped: SystemUser[] = data.map((row: any) => ({
                name: row.name,
                email: row.email,
                role: row.role,
                status: row.status,
                canModify: row.can_modify ?? (row.role === 'Admin'),
                accessibility: row.accessibility
              }));
              setUsersListState(mapped);
              localStorage.setItem('ts_users_list', JSON.stringify(mapped));
            } else if (error) {
              console.warn('Could not load users from Supabase, using local fallback:', error.message);
            }
          });

        supabase
          .from('tournaments')
          .select('*')
          .then(({ data, error }) => {
            if (!error && data && data.length > 0) {
              const featured = data.find((t: any) => t.featured && !t.deleted_at) || data.find((t: any) => !t.deleted_at);
              if (featured) {
                setActiveTournamentId(featured.id);
                setTournamentNameState(featured.name);
                localStorage.setItem('ts_tournament_name', featured.name);
                
                // Keep local storage variables in sync for settings page
                localStorage.setItem('ts_upcoming_name', featured.name);
                if (featured.venue) localStorage.setItem('ts_upcoming_venue', featured.venue);
                if (featured.city) localStorage.setItem('ts_upcoming_city', featured.city);
                
                const dateIsoStr = featured.date_iso ? new Date(featured.date_iso).toISOString().split('T')[0] : '';
                if (dateIsoStr) {
                  localStorage.setItem('ts_upcoming_date', dateIsoStr);
                } else if (featured.date) {
                  localStorage.setItem('ts_upcoming_date', featured.date);
                }
                
                const regCloseIsoStr = featured.registration_close_iso ? new Date(featured.registration_close_iso).toISOString().split('T')[0] : '';
                if (regCloseIsoStr) {
                  localStorage.setItem('ts_upcoming_reg_close', regCloseIsoStr);
                } else if (featured.registration_close) {
                  localStorage.setItem('ts_upcoming_reg_close', featured.registration_close);
                }
              }
            } else if (error) {
              console.warn('Could not load tournament details from Supabase:', error.message);
            }
          });
      }

      // Initialize global accessibility
      const storedAccessibility = localStorage.getItem('ts_global_accessibility');
      if (storedAccessibility) {
        try {
          setGlobalAccessibilityState(JSON.parse(storedAccessibility));
        } catch (e) {
          setGlobalAccessibilityState(defaultAccessibility);
        }
      } else {
        setGlobalAccessibilityState(defaultAccessibility);
        localStorage.setItem('ts_global_accessibility', JSON.stringify(defaultAccessibility));
      }
    }
  }, []);

  // Listen to Supabase Auth State changes
  useEffect(() => {
    if (!supabase) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const email = session.user.email?.toLowerCase().trim();
        if (email) {
          const storedEmail = localStorage.getItem('ts_user_email');
          if (storedEmail?.toLowerCase() !== email) {
            let role: 'Admin' | 'Co-Admin' | 'Viewer' = 'Viewer';
            let newPcId: string | null = null;
            let newTatamiId: number | null = null;
            
            // 1. Authoritative Identity Check
            if (email in INITIAL_ACCOUNT_RULES) {
              const rule = INITIAL_ACCOUNT_RULES[email as keyof typeof INITIAL_ACCOUNT_RULES];
              role = rule.role;
              newPcId = rule.pcId;
              newTatamiId = rule.tatami;
            } else {
              // 2. Fallback to system_users / local storage
              const storedUsers = localStorage.getItem('ts_users_list');
              if (storedUsers) {
                try {
                  const list = JSON.parse(storedUsers);
                  const matched = list.find((u: any) => u.email.toLowerCase() === email);
                  if (matched) {
                    role = matched.role;
                  }
                } catch(e){}
              }
            }

            setUserRole(role);
            setUserEmail(email);
            setPcId(newPcId);
            setTatamiId(newTatamiId);
            setIsLoggedIn(true);
            
            localStorage.setItem('ts_user_role', role);
            localStorage.setItem('ts_user_email', email);
            if (newPcId) localStorage.setItem('ts_pc_id', newPcId);
            else localStorage.removeItem('ts_pc_id');
            if (newTatamiId !== null) localStorage.setItem('ts_tatami_id', newTatamiId.toString());
            else localStorage.removeItem('ts_tatami_id');
          }
        }
      } else if (event === 'SIGNED_OUT') {
        const storedRole = localStorage.getItem('ts_user_role');
        if (storedRole) {
          setUserRole(null);
          setUserEmail('');
          setPcId(null);
          setTatamiId(null);
          setIsLoggedIn(false);
          localStorage.removeItem('ts_user_role');
          localStorage.removeItem('ts_user_email');
          localStorage.removeItem('ts_pc_id');
          localStorage.removeItem('ts_tatami_id');
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Subscribe to category_locks realtime updates
  useEffect(() => {
    if (!supabase) return;
    
    refreshLocks();

    const locksChannel = supabase.channel(`public:category_locks-${activeTournamentId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'category_locks' }, () => {
        refreshLocks();
      })
      .subscribe();

    return () => {
      if (supabase) {
        supabase.removeChannel(locksChannel);
      }
    };
  }, [activeTournamentId, refreshLocks]);

  // Auto-track screen updates when navigation occurs
  useEffect(() => {
    const effectiveTatami = takeoverTatami || tatamiId || (userEmail === 'tatami_2@spsportdatasolution.org' ? 2 : userEmail === 'tatami_1@spsportdatasolution.org' ? 1 : null);
    if (effectiveTatami === 1 || effectiveTatami === 2) {
      const screenLabel = getScreenLabel(pathname || '');
      updateTatamiTelemetry({
        tatamiId: effectiveTatami as 1 | 2,
        currentScreenState: screenLabel,
        status: 'online',
        username: effectiveTatami === 2 ? 'tatami_2@spsportdatasolution.org' : 'tatami_1@spsportdatasolution.org'
      });
    }
  }, [pathname, tatamiId, takeoverTatami, userEmail, getScreenLabel, updateTatamiTelemetry]);

  // Heartbeat & Telemetry Broadcaster for Logged-in Tatamis (every 3 seconds)
  useEffect(() => {
    const effectiveTatami = takeoverTatami || tatamiId || (userEmail === 'tatami_2@spsportdatasolution.org' ? 2 : userEmail === 'tatami_1@spsportdatasolution.org' ? 1 : null);
    if (!isLoggedIn || !effectiveTatami) return;

    const screenLabel = getScreenLabel(pathname || '');
    updateTatamiTelemetry({
      tatamiId: effectiveTatami as 1 | 2,
      currentScreenState: screenLabel,
      status: 'online',
      username: effectiveTatami === 2 ? 'tatami_2@spsportdatasolution.org' : 'tatami_1@spsportdatasolution.org'
    });

    if (supabase && pcId) {
      db.pcControl.registerPC(pcId, `Tatami ${effectiveTatami}`, activeTournamentId || undefined, `Tatami ${effectiveTatami}`, undefined, userEmail).catch(console.error);
    }

    const interval = setInterval(() => {
      const currentLiveScreen = getScreenLabel(pathname || '');
      updateTatamiTelemetry({
        tatamiId: effectiveTatami as 1 | 2,
        currentScreenState: currentLiveScreen,
        status: 'online'
      });

      if (pcId) {
        db.pcControl.heartbeat(pcId).then(res => {
        }).catch(console.error);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isLoggedIn, pcId, tatamiId, takeoverTatami, userEmail, pathname, activeTournamentId, getScreenLabel, updateTatamiTelemetry]);

  // Dynamically apply accessibility classes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loggedInUser = usersList.find(u => u.email === userEmail);
    const activeSettings = loggedInUser?.accessibility || globalAccessibility;

    // Apply High Contrast
    const isHighContrast = activeSettings.themeContrast === 'high-contrast';
    document.documentElement.classList.toggle('high-contrast', isHighContrast);

    // Apply Text Scale
    document.documentElement.classList.remove('text-scale-large', 'text-scale-xl');
    if (activeSettings.textScale === 'large') {
      document.documentElement.classList.add('text-scale-large');
    } else if (activeSettings.textScale === 'extra-large') {
      document.documentElement.classList.add('text-scale-xl');
    }

    // Apply Reduced Motion
    document.documentElement.classList.toggle('reduced-motion', activeSettings.reducedMotion);

    // Apply Legibility Font
    const isDyslexic = activeSettings.legibilityFont === 'dyslexic';
    document.documentElement.classList.toggle('legibility-font', isDyslexic);
  }, [userEmail, usersList, globalAccessibility]);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
  };

  const setTournamentName = (name: string) => {
    setTournamentNameState(name);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ts_tournament_name', name);
    }
    if (supabase) {
      const client = supabase;
      client
        .from('tournaments')
        .select('*')
        .then(({ data }) => {
          const featured = data?.find((t: any) => t.featured && !t.deleted_at) || data?.find((t: any) => !t.deleted_at);
          if (featured) {
            client
              .from('tournaments')
              .update({ name })
              .eq('id', featured.id)
              .then(() => {});
          }
        });
    }
  };

  const setLiveStreamUrl = (url: string) => {
    setLiveStreamUrlState(url);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ts_livestream_url', url);
    }
  };

  const setLogoUrl = (url: string) => {
    setLogoUrlState(url);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ts_logo_url', url);
    }
  };

  const login = (role: 'Admin' | 'Co-Admin' | 'Viewer', email?: string, newPcId?: string | null, newTatamiId?: number | null) => {
    setUserRole(role);
    const emailStr = email || (role === 'Admin' ? 'admin@spsportdatasolution.org' : role === 'Co-Admin' ? 'tatami_1@spsportdatasolution.org' : 'spectator@senshikarate.com');
    setUserEmail(emailStr);
    setPcId(newPcId || null);
    setTatamiId(newTatamiId === undefined ? null : newTatamiId);
    setIsLoggedIn(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ts_user_role', role);
      localStorage.setItem('ts_user_email', emailStr);
      if (newPcId) localStorage.setItem('ts_pc_id', newPcId);
      else localStorage.removeItem('ts_pc_id');
      if (newTatamiId !== undefined && newTatamiId !== null) localStorage.setItem('ts_tatami_id', newTatamiId.toString());
      else localStorage.removeItem('ts_tatami_id');
    }
  };

  const logout = () => {
    setUserRole(null);
    setUserEmail('');
    setPcId(null);
    setTatamiId(null);
    setIsLoggedIn(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ts_user_role');
      localStorage.removeItem('ts_user_email');
      localStorage.removeItem('ts_pc_id');
      localStorage.removeItem('ts_tatami_id');
    }
    if (supabase) {
      supabase.auth.signOut().catch(err => console.error("Error signing out from Supabase:", err));
    }
  };

  const resetFilters = () => {
    setFilters(initialFilters);
  };

  const triggerRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const addUser = async (user: SystemUser) => {
    const updated = [...usersList, user];
    setUsersListState(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ts_users_list', JSON.stringify(updated));
    }
    if (supabase) {
      try {
        const { error } = await supabase.from('system_users').insert([{
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
          can_modify: user.canModify,
          accessibility: user.accessibility
        }]);
        if (error) console.error('Failed to sync new user to Supabase:', error.message);
      } catch (e) {}
    }
  };

  const updateUser = async (email: string, updates: Partial<SystemUser>) => {
    const updated = usersList.map(u => {
      if (u.email === email) {
        const updatedAccessibility = updates.accessibility 
          ? { ...(u.accessibility || defaultAccessibility), ...updates.accessibility }
          : u.accessibility;
        return {
          ...u,
          ...updates,
          accessibility: updatedAccessibility
        } as SystemUser;
      }
      return u;
    });
    setUsersListState(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ts_users_list', JSON.stringify(updated));
    }
    if (supabase) {
      const fullUser = updated.find(u => u.email === email);
      if (fullUser) {
        try {
          const { error } = await supabase
            .from('system_users')
            .update({
              name: fullUser.name,
              role: fullUser.role,
              status: fullUser.status,
              can_modify: fullUser.canModify,
              accessibility: fullUser.accessibility
            })
            .eq('email', email);
          if (error) console.error('Failed to sync updated user to Supabase:', error.message);
        } catch (e) {}
      }
    }
  };

  const deleteUser = async (email: string) => {
    const updated = usersList.filter(u => u.email !== email);
    setUsersListState(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ts_users_list', JSON.stringify(updated));
    }
    if (supabase) {
      try {
        const { error } = await supabase
          .from('system_users')
          .delete()
          .eq('email', email);
        if (error) console.error('Failed to sync user deletion to Supabase:', error.message);
      } catch (e) {}
    }
  };

  const setGlobalAccessibility = (settings: AccessibilitySettings) => {
    setGlobalAccessibilityState(settings);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ts_global_accessibility', JSON.stringify(settings));
    }
  };

  return (
    <TournamentContext.Provider
      value={{
        searchQuery,
        setSearchQuery,
        filters,
        setFilters,
        resetFilters,
        selectedIds,
        setSelectedIds,
        isAddOpen,
        setIsAddOpen,
        isFilterOpen,
        setIsFilterOpen,
        theme,
        toggleTheme,
        refreshKey,
        triggerRefresh,
        tournamentName,
        setTournamentName,
        liveStreamUrl,
        setLiveStreamUrl,
        userRole,
        isLoggedIn,
        login,
        logout,
        userEmail,
        pcId,
        tatamiId,
        takeoverTatami,
        setTakeoverTatami,
        tatamiTelemetry,
        updateTatamiTelemetry,
        assignCategoryToTatami,
        releaseCategoryFromTatami,
        lockCategoryByAdmin,
        disconnectTatamiPC,
        reconnectTatamiPC,
        takeoverTatamiPC,
        releaseTatamiTakeover,
        logoUrl,
        setLogoUrl,
        usersList,
        addUser,
        updateUser,
        deleteUser,
        globalAccessibility,
        setGlobalAccessibility,
        canModify,
        activeLocks,
        refreshLocks,
        activeTournamentId,
        acquireLock,
        releaseLock,
      }}
    >
      {children}
    </TournamentContext.Provider>
  );
}

export function useTournament() {
  const context = useContext(TournamentContext);
  if (!context) {
    throw new Error('useTournament must be used within a TournamentProvider');
  }
  return context;
}
