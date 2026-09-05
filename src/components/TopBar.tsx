'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useTournament } from '@/context/TournamentContext';
import { 
  Search, SlidersHorizontal, Download, Upload, MoreHorizontal, 
  Plus, Bell, Moon, Sun, ChevronDown, CheckCircle, AlertTriangle, Menu, Home, Globe, ExternalLink, Tv, Palette, Check, Lock, Cloud, CloudOff, Server, RefreshCw
} from 'lucide-react';
import { db, describeError } from '@/db/dbClient';
import { useLanSyncStatus } from '@/lib/useLanSync';
import { syncEngine } from '@/lib/syncEngine';

interface TopBarProps {
  onImportClick?: () => void;
  onMenuToggle?: () => void;
}

export default function TopBar({ onImportClick, onMenuToggle }: TopBarProps) {
  const pathname = usePathname();
  const {
    searchQuery,
    setSearchQuery,
    isFilterOpen,
    setIsFilterOpen,
    selectedIds,
    setSelectedIds,
    setIsAddOpen,
    theme,
    toggleTheme,
    consoleTheme,
    setConsoleTheme,
    tournamentName,
    triggerRefresh,
    canModify
  } = useTournament();

  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const lanStatus = useLanSyncStatus();

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleManualSync = async () => {
    if (!isOnline) {
      alert('Cannot sync to Cloud: No Internet connection. System is continuing offline safely.');
      return;
    }
    setIsSyncing(true);
    try {
      const res = await syncEngine.syncNow();
      if (res && res.synced > 0) {
        alert(`Cloud Sync complete: ${res.synced} local changes synchronized.`);
      } else {
        alert('Local database is already synchronized with Cloud.');
      }
    } catch (e: any) {
      alert(`Sync failed: ${e.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const isParticipantsPage = pathname === '/participants';
  const isControllerPage = pathname?.includes('/operator') || pathname?.includes('/kata-control') || pathname?.includes('/dashboard/control');

  // Handler for bulk action execution
  const handleBulkAction = async (action: string) => {
    if (selectedIds.length === 0) return;
    
    try {
      if (action === 'delete') {
        if (confirm(`Are you sure you want to delete the ${selectedIds.length} selected participant(s)?`)) {
          for (const id of selectedIds) {
            await db.participants.delete(id, 'Admin Operator');
          }
          alert(`Successfully soft-deleted ${selectedIds.length} participant(s).`);
          setSelectedIds([]);
          triggerRefresh();
        }
      } else if (action.startsWith('status:')) {
        const newStatus = action.split(':')[1] as any;
        for (const id of selectedIds) {
          await db.participants.update(id, { status: newStatus }, 'Admin Operator');
        }
        alert(`Successfully updated status for ${selectedIds.length} participant(s).`);
        setSelectedIds([]);
        triggerRefresh();
      } else if (action.startsWith('payment:')) {
        const newPaymentStatus = action.split(':')[1] as any;
        for (const id of selectedIds) {
          await db.participants.update(id, { payment_status: newPaymentStatus }, 'Admin Operator');
        }
        alert(`Successfully updated payment for ${selectedIds.length} participant(s).`);
        setSelectedIds([]);
        triggerRefresh();
      } else if (action === 'print') {
        alert(`Sending print request for ID Cards / Certificates for ${selectedIds.length} participant(s).`);
      }
    } catch (e: any) {
      alert(`Bulk operation failed: ${describeError(e)}`);
    }
    setIsBulkOpen(false);
  };

  return (
    <header className="h-16 px-6 glass-header flex items-center justify-between sticky top-0 z-10 w-full">
      {/* Left: Hamburger (mobile) + Tournament Identifier */}
      <div className="flex items-center gap-2">
        {/* Hamburger menu */}
        <button
          onClick={onMenuToggle}
          className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
        {canModify && !isControllerPage && (
          <a
            href="https://tournamentdisplay.spsportdatasolution.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 border border-amber-500/20 bg-amber-950/20 hover:bg-amber-900/40 rounded-lg text-xs font-bold transition text-amber-300 hover:text-white cursor-pointer"
            title="Open Tournament Live Display"
          >
            <Tv className="h-3.5 w-3.5 text-amber-400" />
            <span className="hidden md:inline">T-LiveDisplay</span>
          </a>
        )}
        <a
          href="https://spsportdatasolution.org/karatetech/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 border border-indigo-500/20 bg-indigo-950/20 hover:bg-indigo-900/40 rounded-lg text-xs font-bold transition text-indigo-300 hover:text-white cursor-pointer"
          title="Open Corporate Home Showcase"
        >
          <Globe className="h-3.5 w-3.5 text-indigo-400" />
          <span className="hidden md:inline">Corporate Home</span>
        </a>
        <Link
          href="/"
          prefetch={false}
          onClick={() => {
            import('@/db/dbClient').then(({ dbManager }) => dbManager.closeTournament());
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-border hover:bg-secondary rounded-lg text-xs font-bold transition text-muted-foreground hover:text-foreground cursor-pointer"
          title="Back to Projects Manager"
        >
          <Home className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Projects</span>
        </Link>
        <div className="flex items-center gap-1 bg-secondary px-3 py-1.5 rounded-lg text-xs font-semibold text-foreground border border-border">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>LIVE EVENT</span>
        </div>

        {/* Local Server / LAN Sync status */}
        <div 
          className="flex items-center gap-1.5 bg-secondary/80 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-foreground border border-border cursor-default"
          title={lanStatus.isConnected ? `Local Server Connected (${lanStatus.clientCount} active PCs on LAN)` : 'Local Server Active (Offline Mode)'}
        >
          <span className={`w-2 h-2 rounded-full ${lanStatus.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
          <span className="hidden md:inline font-bold text-[11px] tracking-tight">
            {lanStatus.isConnected ? `LAN SERVER (${lanStatus.clientCount})` : 'LOCAL SERVER'}
          </span>
        </div>

        {/* Cloud Sync / Online Status */}
        <button
          onClick={handleManualSync}
          disabled={isSyncing}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
            isOnline 
              ? 'bg-indigo-950/20 border-indigo-500/30 text-indigo-300 hover:bg-indigo-900/30' 
              : 'bg-amber-950/20 border-amber-500/30 text-amber-300 hover:bg-amber-900/30'
          }`}
          title={isOnline ? 'Online (Click to push/pull cloud sync)' : 'Offline Mode (Tournament operations unaffected)'}
        >
          {isSyncing ? (
            <RefreshCw className="h-3.5 w-3.5 animate-spin text-indigo-400" />
          ) : isOnline ? (
            <Cloud className="h-3.5 w-3.5 text-indigo-400" />
          ) : (
            <CloudOff className="h-3.5 w-3.5 text-amber-400" />
          )}
          <span className="hidden lg:inline text-[11px] font-bold">
            {isSyncing ? 'SYNCING...' : isOnline ? 'CLOUD SYNC' : 'OFFLINE MODE'}
          </span>
        </button>

        <span className="font-bold text-sm text-foreground truncate max-w-xs md:max-w-md hidden sm:inline-block">
          {tournamentName}
        </span>
      </div>

      {/* Navigation Specific Context Actions */}
      <div className="flex items-center gap-3">
        {isParticipantsPage && (
          <>
            {/* Search Input */}
            <div className="relative w-48 md:w-64 hidden sm:block">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search participant..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-foreground"
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`p-2 rounded-lg border text-sm font-medium transition-all duration-200 flex items-center gap-2 cursor-pointer ${
                isFilterOpen
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border hover:text-foreground hover:bg-secondary'
              }`}
              title="Toggle Filters"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden md:inline">Filters</span>
            </button>

            {/* CSV Import */}
            <button
              onClick={onImportClick}
              className="p-2 bg-card text-muted-foreground border border-border hover:text-foreground hover:bg-secondary rounded-lg text-sm font-medium transition-all flex items-center gap-2 cursor-pointer"
              title="Import CSV"
            >
              <Upload className="h-4 w-4" />
              <span className="hidden md:inline">Import</span>
            </button>

            {/* Bulk Actions Dropdown */}
            {selectedIds.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setIsBulkOpen(!isBulkOpen)}
                  className="p-2 bg-secondary text-foreground border border-border hover:bg-muted rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 cursor-pointer animate-fade-in"
                >
                  <span className="bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold">
                    {selectedIds.length}
                  </span>
                  <span className="hidden md:inline">Bulk</span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                {isBulkOpen && (
                  <div className="absolute right-0 mt-1.5 w-56 bg-card border border-border rounded-xl shadow-lg py-1.5 z-30 animate-scale-in text-foreground">
                    <div className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border">
                      Operations
                    </div>
                    <button
                      onClick={() => handleBulkAction('status:Confirmed')}
                      className="w-full text-left px-4 py-2 text-xs hover:bg-secondary flex items-center gap-2 cursor-pointer"
                    >
                      <CheckCircle className="h-3.5 w-3.5 text-confirmed" /> Mark Confirmed
                    </button>
                    <button
                      onClick={() => handleBulkAction('status:Checked In')}
                      className="w-full text-left px-4 py-2 text-xs hover:bg-secondary flex items-center gap-2 cursor-pointer"
                    >
                      <CheckCircle className="h-3.5 w-3.5 text-checkedin" /> Mark Checked In
                    </button>
                    <button
                      onClick={() => handleBulkAction('status:Disqualified')}
                      className="w-full text-left px-4 py-2 text-xs hover:bg-secondary flex items-center gap-2 cursor-pointer"
                    >
                      <AlertTriangle className="h-3.5 w-3.5 text-disqualified" /> Disqualify Selected
                    </button>
                    <div className="h-px bg-border my-1"></div>
                    <button
                      onClick={() => handleBulkAction('payment:Paid')}
                      className="w-full text-left px-4 py-2 text-xs hover:bg-secondary cursor-pointer"
                    >
                      Mark as Paid
                    </button>
                    <button
                      onClick={() => handleBulkAction('payment:Unpaid')}
                      className="w-full text-left px-4 py-2 text-xs hover:bg-secondary cursor-pointer"
                    >
                      Mark as Unpaid
                    </button>
                    <div className="h-px bg-border my-1"></div>
                    <button
                      onClick={() => handleBulkAction('print')}
                      className="w-full text-left px-4 py-2 text-xs hover:bg-secondary cursor-pointer"
                    >
                      Print ID Cards / Badges
                    </button>
                    <div className="h-px bg-border my-1"></div>
                    <button
                      onClick={() => handleBulkAction('delete')}
                      className="w-full text-left px-4 py-2 text-xs hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 font-medium cursor-pointer"
                    >
                      Delete Selected
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Add Participant */}
            <button
              onClick={() => setIsAddOpen(true)}
              className="p-2 bg-primary text-primary-foreground hover:bg-primary/95 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Add Participant"
            >
              <Plus className="h-4.5 w-4.5" />
              <span className="hidden md:inline">Add Participant</span>
            </button>
          </>
        )}

        <div className="h-8 w-px bg-border hidden sm:block mx-1"></div>

        {/* Global Toolbar items (Notifications, Theme, User) */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <button className="p-2 hover:bg-secondary text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer relative">
            <Bell className="h-4.5 w-4.5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500"></span>
          </button>

          {/* Console Theme Picker Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsThemeOpen(!isThemeOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-secondary text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer border border-border/50 text-xs font-bold"
              title="Change Console Theme (WKF Dark, Arena Blue, Tatami Green)"
            >
              <Palette className="h-4 w-4 text-primary" />
              <span className="hidden md:inline capitalize text-[11px]">
                {consoleTheme === 'wkf-dark' ? 'WKF Dark' : consoleTheme === 'arena-blue' ? 'Arena Blue' : consoleTheme === 'tatami-green' ? 'Tatami Green' : 'Dojo Gold'}
              </span>
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>

            {isThemeOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsThemeOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-72 bg-card border border-border rounded-xl shadow-2xl z-50 p-3 space-y-2.5 text-foreground animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <span className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Palette className="h-3.5 w-3.5 text-primary" />
                      Console Theme
                    </span>
                    <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 flex items-center gap-1">
                      <Lock className="h-2.5 w-2.5" />
                      Scoreboard Protected
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {/* 1. WKF Dark */}
                    <label
                      onClick={() => { setConsoleTheme('wkf-dark'); setIsThemeOpen(false); }}
                      className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition ${
                        consoleTheme === 'wkf-dark'
                          ? 'bg-yellow-500/10 border-yellow-500/50 text-foreground font-bold'
                          : 'border-transparent hover:bg-secondary text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="topbarTheme"
                          checked={consoleTheme === 'wkf-dark'}
                          onChange={() => { setConsoleTheme('wkf-dark'); setIsThemeOpen(false); }}
                          className="h-3.5 w-3.5 text-yellow-500 focus:ring-yellow-500 cursor-pointer"
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-bold leading-tight">1. WKF Dark</span>
                          <span className="text-[10px] text-muted-foreground">Obsidian & Gold</span>
                        </div>
                      </div>
                      <span className="w-3 h-3 rounded-full bg-yellow-400 border border-black/20" />
                    </label>

                    {/* 2. Arena Blue */}
                    <label
                      onClick={() => { setConsoleTheme('arena-blue'); setIsThemeOpen(false); }}
                      className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition ${
                        consoleTheme === 'arena-blue'
                          ? 'bg-sky-500/10 border-sky-500/50 text-foreground font-bold'
                          : 'border-transparent hover:bg-secondary text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="topbarTheme"
                          checked={consoleTheme === 'arena-blue'}
                          onChange={() => { setConsoleTheme('arena-blue'); setIsThemeOpen(false); }}
                          className="h-3.5 w-3.5 text-sky-400 focus:ring-sky-400 cursor-pointer"
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-bold leading-tight">2. Arena Blue</span>
                          <span className="text-[10px] text-muted-foreground">Midnight & Cyan</span>
                        </div>
                      </div>
                      <span className="w-3 h-3 rounded-full bg-sky-400 border border-black/20" />
                    </label>

                    {/* 3. Tatami Green */}
                    <label
                      onClick={() => { setConsoleTheme('tatami-green'); setIsThemeOpen(false); }}
                      className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition ${
                        consoleTheme === 'tatami-green'
                          ? 'bg-emerald-500/10 border-emerald-500/50 text-foreground font-bold'
                          : 'border-transparent hover:bg-secondary text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="topbarTheme"
                          checked={consoleTheme === 'tatami-green'}
                          onChange={() => { setConsoleTheme('tatami-green'); setIsThemeOpen(false); }}
                          className="h-3.5 w-3.5 text-emerald-400 focus:ring-emerald-400 cursor-pointer"
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-bold leading-tight">3. Tatami Green</span>
                          <span className="text-[10px] text-muted-foreground">Emerald & Mint</span>
                        </div>
                      </div>
                      <span className="w-3 h-3 rounded-full bg-emerald-400 border border-black/20" />
                    </label>

                    {/* 4. Dojo Gold */}
                    <label
                      onClick={() => { setConsoleTheme('dojo-gold'); setIsThemeOpen(false); }}
                      className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition ${
                        consoleTheme === 'dojo-gold'
                          ? 'bg-amber-500/10 border-amber-500/50 text-foreground font-bold'
                          : 'border-transparent hover:bg-secondary text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="topbarTheme"
                          checked={consoleTheme === 'dojo-gold'}
                          onChange={() => { setConsoleTheme('dojo-gold'); setIsThemeOpen(false); }}
                          className="h-3.5 w-3.5 text-amber-400 focus:ring-amber-400 cursor-pointer"
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-bold leading-tight">4. Dojo Gold</span>
                          <span className="text-[10px] text-muted-foreground">Solar Amber & Gold</span>
                        </div>
                      </div>
                      <span className="w-3 h-3 rounded-full bg-amber-400 border border-black/20 shadow-xs shadow-amber-400" />
                    </label>
                  </div>

                  <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Scoreboard:</span>
                    <span className="font-bold text-red-500">AKA Red</span>
                    <span>•</span>
                    <span className="font-bold text-blue-500">AO Blue</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* User Info Dropdown */}
          <div className="flex items-center gap-2 pl-1 cursor-pointer">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center border border-border">
              AD
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
