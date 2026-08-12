'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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

  const refreshLocks = useCallback(async () => {
    if (activeTournamentId) {
      const locks = await db.pcControl.getActiveLocks(activeTournamentId);
      setActiveLocks(locks);
    }
  }, [activeTournamentId]);

  const acquireLock = useCallback(async (categoryId: string): Promise<{ success: boolean }> => {
    if (!supabase || !pcId || !activeTournamentId) return { success: false };
    const result = await db.pcControl.acquireLock(
      activeTournamentId,
      categoryId,
      pcId,
      tatamiId?.toString(),
      userEmail
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

    const locksChannel = supabase.channel('public:category_locks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'category_locks' }, () => {
        refreshLocks();
      })
      .subscribe();

    return () => {
      if (supabase) {
        supabase.removeChannel(locksChannel);
      }
    };
  }, []);

  // Heartbeat for logged-in Tatami PCs
  useEffect(() => {
    if (!isLoggedIn || !pcId) return;

    // Register PC and send initial heartbeat
    const registerAndHeartbeat = async () => {
      if (supabase) {
        try {
          await db.pcControl.registerPC(pcId, `Tatami ${tatamiId || 'Admin'}`, activeTournamentId || undefined, tatamiId?.toString(), undefined, userEmail);
        } catch (e: any) {
          console.error('Failed to register PC:', {
            message: e?.message,
            details: e?.details,
            hint: e?.hint,
            code: e?.code,
            error: e,
          });
        }
      }
    };

    registerAndHeartbeat();

    // Send heartbeat every 15 seconds
    const interval = setInterval(() => {
      if (supabase) {
        db.pcControl.heartbeat(pcId).catch(console.error);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [isLoggedIn, pcId, tatamiId, userEmail, activeTournamentId]);

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
