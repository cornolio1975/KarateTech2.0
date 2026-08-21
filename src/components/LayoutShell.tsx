'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { TournamentProvider, useTournament } from '@/context/TournamentContext';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import ImportModal from './ImportModal';
import LoginPage from '@/app/login/page';

function LayoutShellContent({ children }: { children: React.ReactNode }) {
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { isLoggedIn, userRole } = useTournament();

  // Auto-minimize sidebar on mobile or on control page: start closed on small screens
  useEffect(() => {
    const isControlPage = window.location.pathname.includes('/control');
    const mq = window.matchMedia('(min-width: 768px)');
    
    // Default open on desktop, unless it's the control dashboard
    if (isControlPage) {
      setIsSidebarOpen(false);
    } else {
      setIsSidebarOpen(mq.matches);
    }

    const handler = (e: MediaQueryListEvent) => {
      // Don't auto-open if we are on the control page
      if (!window.location.pathname.includes('/control')) {
        setIsSidebarOpen(e.matches);
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const handleOpenImport = () => setIsImportOpen(true);
    window.addEventListener('open-import-modal', handleOpenImport);
    return () => window.removeEventListener('open-import-modal', handleOpenImport);
  }, []);

  // Auto-close sidebar when navigating on mobile, or when going to Scoreboard Control
  useEffect(() => {
    const isMobile = !window.matchMedia('(min-width: 768px)').matches;
    const isControlPage = pathname?.includes('/control');
    if (isMobile || isControlPage) {
      setIsSidebarOpen(false);
    }
  }, [pathname]);

  const isPublicOrAuthRoute = pathname === '/' || pathname === '/login' || pathname?.startsWith('/public') || pathname?.startsWith('/auth') || pathname?.startsWith('/display') || pathname?.startsWith('/draws/print-preview');

  // Enforce Active Tournament Context
  const [isDbReady, setIsDbReady] = useState(isPublicOrAuthRoute);

  useEffect(() => {
    if (isPublicOrAuthRoute) return;

    import('@/db/dbClient').then(async ({ dbManager }) => {
      let activeDb = dbManager.getActiveTournament();
      
      // If memory was cleared by a hard reload, try to restore from localStorage
      if (!activeDb) {
        const activeId = localStorage.getItem('ts_active_tournament_id');
        if (activeId) {
          const { localStore } = await import('@/db/localStore');
          activeDb = await localStore.loadTournament(activeId);
          if (activeDb) {
             const { setActiveTournamentDb } = await import('@/db/mockStore');
             setActiveTournamentDb(activeDb);
          }
        }
      }

      if (!activeDb) {
        window.location.href = '/';
      } else {
        setIsDbReady(true);
      }
    });
  }, [pathname, isPublicOrAuthRoute]);

  // If public or auth route, render directly without admin frame
  if (isPublicOrAuthRoute) {
    return (
      <div className="flex h-screen w-screen overflow-hidden print:h-auto print:w-auto print:overflow-visible print:block bg-background text-foreground">
        <main className="flex-1 overflow-y-auto print:overflow-visible bg-background focus:outline-none relative text-foreground">
          {children}
        </main>
      </div>
    );
  }

  // If not logged in, force render the login screen
  if (!isLoggedIn) {
    return <LoginPage />;
  }

  // Prevent rendering protected admin routes until DB is loaded into memory
  if (!isPublicOrAuthRoute && !isDbReady) {
    return (
       <div className="flex items-center justify-center h-screen bg-background text-foreground">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
       </div>
    );
  }

  // Standard Admin layout for logged in Admin/Co-Admin
  return (
    <div id="admin-layout-wrapper" className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Mobile backdrop overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Content Shell */}
      <div id="admin-layout-shell" className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <TopBar
          onImportClick={() => setIsImportOpen(true)}
          onMenuToggle={() => setIsSidebarOpen((prev) => !prev)}
        />

        {/* Page Body */}
        <main id="admin-layout-main" className="flex-1 overflow-y-auto bg-background focus:outline-none relative">
          {children}
        </main>
      </div>

      {/* Global Import Modal */}
      <ImportModal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} />
    </div>
  );
}

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <TournamentProvider>
      <LayoutShellContent>{children}</LayoutShellContent>
    </TournamentProvider>
  );
}
