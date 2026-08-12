'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTournament } from '@/context/TournamentContext';
import { db, basePath } from '@/db/dbClient';
import { Participant, Category, Bout, Club, isKataCategory, isKumiteCategory } from '@/db/types';
import { 
  GitPullRequest, Check, Trophy, Trash2, Edit2, Play, 
  ChevronRight, ArrowRight, Award, Plus, Sparkles, RefreshCw, X, Printer,
  Lock, Unlock, ShieldAlert, AlertTriangle
} from 'lucide-react';
import { SportdataBracket } from '@/components/SportdataBracket';


export default function DrawsPage() {
  const { searchQuery, triggerRefresh, canModify, tournamentName, logoUrl, userRole } = useTournament();

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [bouts, setBouts] = useState<Bout[]>([]);
  const [participantCategories, setParticipantCategories] = useState<{participant_id: string; category_id: string}[]>([]);

  // Navigation / Selection states
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [activeCategoryTab, setActiveCategoryTab] = useState<'ALL' | 'KUMITE' | 'KATA' | 'CONFIRMED'>('ALL');
  const [disciplineFilter, setDisciplineFilter] = useState<'ALL' | 'KUMITE' | 'KATA'>('ALL');
  
  // Generation Form configurations (WKF Repechage only)

  // Result dialog state
  const [selectedBoutToResolve, setSelectedBoutToResolve] = useState<Bout | null>(null);
  const [scoreA, setScoreA] = useState<number>(0);
  const [scoreB, setScoreB] = useState<number>(0);
  const [chosenWinnerId, setChosenWinnerId] = useState<string>('');

  // Print state
  const [printMode, setPrintMode] = useState<'current' | 'all'>('all');
  const [printTarget, setPrintTarget] = useState<'current' | 'all'>('all');
  const [isPrinting, setIsPrinting] = useState(false);

  // Emergency Override Protocol state
  const [unlockedCategories, setUnlockedCategories] = useState<string[]>([]);
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [unlockUsername, setUnlockUsername] = useState('');
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [pendingAction, setPendingAction] = useState<'clear' | 'regenerate' | null>(null);

  useEffect(() => {
    if (isPrinting) {
      // Give React 600ms to render the print DOM structure completely after data auto-refresh
      const timer = setTimeout(() => {
        window.print();
        setIsPrinting(false);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isPrinting]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [catList, pList, clList, bList, pcList] = await Promise.all([
        db.categories.list(),
        db.participants.list(),
        db.clubs.list(),
        db.bouts.list(),
        db.participantCategories.list()
      ]);
      catList.sort((a, b) => {
        // Priority 1: Lower age to higher
        if (a.min_age !== b.min_age) {
          return a.min_age - b.min_age;
        }
        
        // Priority 2: Kata to Kumite
        const aIsKata = isKataCategory(a);
        const bIsKata = isKataCategory(b);
        if (aIsKata !== bIsKata) {
          return aIsKata ? -1 : 1;
        }
        
        // Priority 3: Male to Female
        const genderOrder = { 'Male': 1, 'Female': 2, 'Mixed': 3 };
        const aGenderOrder = genderOrder[a.gender] || 4;
        const bGenderOrder = genderOrder[b.gender] || 4;
        if (aGenderOrder !== bGenderOrder) {
          return aGenderOrder - bGenderOrder;
        }
        
        return a.name.localeCompare(b.name);
      });
      setCategories(catList);
      setParticipants(pList);
      setClubs(clList);
      setBouts(bList);
      setParticipantCategories(pcList);
      
      // Auto select first category if none selected
      if (catList.length > 0 && !selectedCatId) {
        setSelectedCatId(catList[0].id);
      }
    } catch (e) {
      console.error('Error loading draws data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mounted) {
      loadData();
    }
  }, [mounted]);


  if (!mounted) return null;

  const currentCategory = categories.find(c => c.id === selectedCatId);
  const categoryBouts = bouts.filter(b => b.category_id === selectedCatId);

  // Category counts info
  const getCategoryCountInfo = (catId: string) => {
    const matchedParts = participantCategories
      .filter(m => m.category_id === catId)
      .map(m => m.participant_id);
    const activeInCat = participants.filter(p => matchedParts.includes(p.id));
    const total = activeInCat.length;
    const confirmed = activeInCat.filter(p => p.status === 'Confirmed' || p.status === 'Checked In').length;
    return { confirmed, total };
  };

  const getCategoryBracketStatus = (catId: string) => {
    const catBouts = bouts.filter(b => b.category_id === catId);
    if (catBouts.length === 0) return 'non-active';
    const allCompleted = catBouts.every(b => b.status === 'Completed' || b.status === 'Walkover');
    if (allCompleted) return 'completed';
    const hasStarted = catBouts.some(b => b.status === 'Completed' || b.status === 'Running' || b.status === 'Walkover' || b.score_a > 0 || b.score_b > 0);
    if (hasStarted) return 'active';
    return 'non-active';
  };

  const isCategoryLocked = (catId: string) => {
    if (unlockedCategories.includes(catId)) return false;
    return getCategoryBracketStatus(catId) !== 'non-active';
  };

  const executeGenerateDraw = async () => {
    if (!selectedCatId) return;
    try {
      setLoading(true);
      const cat = categories.find(c => c.id === selectedCatId);
      const format = cat?.format || 'knockout';
      await db.bouts.generateDraw(selectedCatId, format, false);
      const updatedBouts = await db.bouts.list();
      setBouts(updatedBouts);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Generate Draws Trigger
  const handleGenerateDraw = async () => {
    if (!selectedCatId) return;
    if (isCategoryLocked(selectedCatId)) {
      setPendingAction('regenerate');
      setIsUnlockModalOpen(true);
      return;
    }
    executeGenerateDraw();
  };
 
  const handleGenerateRepechage = async () => {
    if (!selectedCatId) return;
    try {
      setLoading(true);
      await (db.bouts as any).generateRepechage(selectedCatId);
      const updatedBouts = await db.bouts.list();
      setBouts(updatedBouts);
      alert('WKF Repechage brackets generated successfully!');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Generate All Brackets Trigger
  const handleGenerateAllDraws = async () => {
    try {
      setLoading(true);
      let generatedCount = 0;
      for (const cat of categories) {
        const catBouts = bouts.filter(b => b.category_id === cat.id);
        if (catBouts.length === 0) {
          try {
            await db.bouts.generateDraw(cat.id, cat.format || 'knockout', false);
            generatedCount++;
          } catch (e) {
            // Category might have 0 participants
          }
        }
      }
      const updatedBouts = await db.bouts.list();
      setBouts(updatedBouts);
      if (generatedCount > 0) {
        alert(`Successfully generated brackets for ${generatedCount} categories!`);
      } else {
        alert('No new brackets generated. Please ensure participants are registered and confirmed in categories.');
      }
    } catch (err: any) {
      alert(err.message || 'Error generating brackets.');
    } finally {
      setLoading(false);
    }
  };

  // --- Dedicated Standalone Print Engine via /draws/print-preview ---
  const printCategoryDraws = (targetCatIds: string[]) => {
    if (targetCatIds.length === 0) {
      alert('No categories found to print.');
      return;
    }
    const catIdParam = targetCatIds.join(',');
    const printUrl = `/draws/print-preview?catId=${catIdParam}`;
    const printWin = window.open(printUrl, '_blank');
    if (!printWin) {
      alert('Pop-up window blocked. Please allow pop-ups for this site to view the print layout.');
    }
  };

  // --- Print handlers ---
  const handlePrint = async () => {
    try {
      setLoading(true);
      await loadData();
      const currentBouts = await db.bouts.list();
      if (currentBouts.length === 0) {
        alert('No brackets found to print. Please click "Generate All Brackets" first.');
        return;
      }
      const catIdsWithBouts = Array.from(new Set(currentBouts.map(b => b.category_id)));
      printCategoryDraws(catIdsWithBouts);
    } catch (e) {
      console.error('Error printing brackets:', e);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintCurrent = async () => {
    if (!selectedCatId) return;
    try {
      setLoading(true);
      await loadData();
      const currentBouts = await db.bouts.list();
      const currentCatBouts = currentBouts.filter(b => b.category_id === selectedCatId);
      if (currentCatBouts.length === 0) {
        alert('No bracket generated for this category yet. Please click "Generate Bracket".');
        return;
      }
      printCategoryDraws([selectedCatId]);
    } catch (e) {
      console.error('Error printing bracket:', e);
    } finally {
      setLoading(false);
    }
  };

  // Open current category bracket as a standalone PDF-ready page in new browser tab
  const handleOpenAsPDF = async () => {
    handlePrintCurrent(); // Using the exact same workflow for vector PDF via browser native print
  };


  // Helper: group bouts by rounds for a given category's bouts
  const getBoutsByRoundsForCat = (catBouts: Bout[]) => {
    const rounds: { [key: number]: Bout[] } = {};
    catBouts.forEach(b => {
      if (b.round_no === 99) return;
      if (!rounds[b.round_no]) rounds[b.round_no] = [];
      rounds[b.round_no].push(b);
    });
    Object.keys(rounds).forEach(r => rounds[Number(r)].sort((a, b) => a.bout_no - b.bout_no));
    return rounds;
  };


  // Render a print competitor row
  const renderPrintCompetitor = (partId: string | null, score: number, isWinner: boolean, dotClass: string) => {
    const comp = partId ? participants.find(p => p.id === partId) : null;
    const club = comp ? clubs.find(c => c.id === comp.club_id) : null;
    return (
      <div className="print-competitor">
        <span className={`print-dot ${dotClass}`} />
        <span className={`print-comp-name${isWinner ? ' winner' : ''}`}>
          {comp ? comp.full_name : 'TBD'}
          {club ? ` (${club.name})` : ''}
        </span>
        <span className="print-comp-score">{partId ? score : '-'}</span>
      </div>
    );
  };

  const executeClearDraw = async () => {
    if (!selectedCatId) return;
    try {
      setLoading(true);
      await db.bouts.clearDraw(selectedCatId);
      const updatedBouts = await db.bouts.list();
      setBouts(updatedBouts);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Clear Single Category Draw Trigger
  const handleClearDraw = async () => {
    if (!selectedCatId) return;
    if (isCategoryLocked(selectedCatId)) {
      setPendingAction('clear');
      setIsUnlockModalOpen(true);
      return;
    }
    executeClearDraw();
  };

  const handleVerifyUnlockPassword = () => {
    const usr = unlockUsername.trim();
    const pwd = unlockPassword.trim();
    if (usr !== 'admin' || pwd !== 'password') {
      setUnlockError('Invalid Admin Username or Password.');
      return;
    }

    if (selectedCatId) {
      setUnlockedCategories(prev => Array.from(new Set([...prev, selectedCatId])));
    }
    setIsUnlockModalOpen(false);
    setUnlockUsername('');
    setUnlockPassword('');
    setUnlockError('');

    const targetAction = pendingAction;
    setPendingAction(null);

    if (targetAction === 'clear') {
      setTimeout(() => executeClearDraw(), 100);
    } else if (targetAction === 'regenerate') {
      setTimeout(() => executeGenerateDraw(), 100);
    } else {
      alert('Emergency Override Protocol Activated! Bracket is now UNLOCKED.');
    }
  };

  // Clear All Draws Trigger
  const handleClearAllDraws = async () => {
    const confirmClear = window.confirm(
      'Are you sure you want to CLEAR ALL EXISTING BRACKETS across all categories and start fresh? This action cannot be undone.'
    );
    if (!confirmClear) return;
    try {
      setLoading(true);
      await db.bouts.clearAllDraws();
      const updatedBouts = await db.bouts.list();
      setBouts(updatedBouts);
    } catch (err: any) {
      alert(err.message || 'Failed to clear all brackets.');
    } finally {
      setLoading(false);
    }
  };

  // Open resolution dialog
  const openResolveDialog = (bout: Bout) => {
    if (!bout.participant_a_id || !bout.participant_b_id) return; // cannot resolve BYE or empty match slots
    setSelectedBoutToResolve(bout);
    setScoreA(bout.score_a);
    setScoreB(bout.score_b);
    setChosenWinnerId(bout.winner_id || bout.participant_a_id);
  };

  // Submit resolved bout
  const handleResolveBout = async () => {
    if (!selectedBoutToResolve) return;
    try {
      setLoading(true);
      await db.bouts.updateBoutResult(
        selectedBoutToResolve.id,
        chosenWinnerId,
        scoreA,
        scoreB
      );
      // Reload bouts list
      const updatedBouts = await db.bouts.list();
      setBouts(updatedBouts);
      setSelectedBoutToResolve(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Grouping bouts into rounds for visual Knockout Bracket render
  const getBoutsByRounds = () => {
    const rounds: { [key: number]: Bout[] } = {};
    categoryBouts.forEach(b => {
      if (b.round_no === 99) return; // skip 3rd place for rounds calculation
      if (!rounds[b.round_no]) {
        rounds[b.round_no] = [];
      }
      rounds[b.round_no].push(b);
    });
    // Sort round lists by bout no
    Object.keys(rounds).forEach(r => {
      rounds[Number(r)].sort((a, b) => a.bout_no - b.bout_no);
    });
    return rounds;
  };

  const roundsData = getBoutsByRounds();
  const thirdPlaceMatch = categoryBouts.find(b => b.round_no === 99);
  const bracketStatus = currentCategory ? getCategoryBracketStatus(currentCategory.id) : 'non-active';
  const isBracketLocked = bracketStatus === 'active' || bracketStatus === 'completed';

  // Filtered categories display list (Kumite vs Kata vs Confirmed)
  const displayCategories = categories.filter(c => {
    if (activeCategoryTab === 'CONFIRMED') {
      const { confirmed } = getCategoryCountInfo(c.id);
      if (confirmed === 0) return false;
    }
    if (disciplineFilter === 'KUMITE') {
      return isKumiteCategory(c);
    }
    if (disciplineFilter === 'KATA') {
      return isKataCategory(c);
    }
    return true;
  });

  // Helper renderer: Competitor detail
  const renderCompetitorRow = (participantId: string | null, score: number, isWinner: boolean, tagColor: string) => {
    if (!participantId) {
      return (
        <div className="flex items-center justify-between p-2 text-xs text-muted-foreground italic bg-secondary/10">
          <span>TBD / Empty Slot</span>
          <span>-</span>
        </div>
      );
    }

    const competitor = participants.find(p => p.id === participantId);
    const club = clubs.find(c => c.id === competitor?.club_id);

    return (
      <div className={`flex items-center justify-between p-2 text-xs transition-colors ${
        isWinner ? 'bg-primary/10 text-foreground font-bold' : 'text-muted-foreground'
      }`}>
        <div className="flex items-center gap-1.5 min-w-0">
          <div className={`w-1.5 h-6 rounded-full shrink-0 ${tagColor}`} />
          <div className="truncate">
            <span className="block truncate">{competitor?.full_name || 'Competitor'}</span>
            <span className="text-[9px] block truncate text-muted-foreground font-normal">{club?.name || 'Independent'}</span>
          </div>
        </div>
        <span className="font-mono font-bold text-sm px-1">{score}</span>
      </div>
    );
  };

  return (
    <>
    <div className="flex flex-col lg:flex-row h-auto min-h-[calc(100vh-64px)] w-full text-foreground bg-background overflow-y-auto no-print">
      
      {/* ======================================================== */}
      {/* LEFT COLUMN: CATEGORY NAVIGATION PANEL                   */}
      {/* ======================================================== */}
      <div className="w-full lg:w-72 bg-card border-b lg:border-b-0 lg:border-r border-border h-48 lg:h-full flex flex-col shrink-0">
        
        {/* Categories Tab selectors */}
        <div className="grid grid-cols-4 border-b border-border text-[10px] font-bold shrink-0 bg-secondary/10">
          <button
            onClick={() => { setActiveCategoryTab('ALL'); setDisciplineFilter('ALL'); }}
            className={`py-2.5 text-center transition-colors border-b-2 cursor-pointer ${
              activeCategoryTab === 'ALL' && disciplineFilter === 'ALL'
                ? 'border-primary text-foreground bg-card font-extrabold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            ALL
          </button>
          <button
            onClick={() => { setActiveCategoryTab('KUMITE'); setDisciplineFilter('KUMITE'); }}
            className={`py-2.5 text-center transition-colors border-b-2 cursor-pointer ${
              disciplineFilter === 'KUMITE'
                ? 'border-yellow-400 text-yellow-400 font-extrabold bg-card'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            KUMITE
          </button>
          <button
            onClick={() => { setActiveCategoryTab('KATA'); setDisciplineFilter('KATA'); }}
            className={`py-2.5 text-center transition-colors border-b-2 cursor-pointer ${
              disciplineFilter === 'KATA'
                ? 'border-yellow-400 text-yellow-400 font-extrabold bg-card'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            KATA
          </button>
          <button
            onClick={() => { setActiveCategoryTab('CONFIRMED'); setDisciplineFilter('ALL'); }}
            className={`py-2.5 text-center transition-colors border-b-2 flex items-center justify-center gap-0.5 cursor-pointer ${
              activeCategoryTab === 'CONFIRMED'
                ? 'border-primary text-foreground bg-card font-extrabold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Check className="h-3 w-3" />
            <span>CONF</span>
          </button>
        </div>

        {/* Controller Dropdown & Discipline Filter */}
        <div className="p-3 border-b border-border space-y-2.5 shrink-0">
          <div>
            <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Discipline Filter</label>
            <select 
              value={disciplineFilter}
              onChange={e => {
                const val = e.target.value as 'ALL' | 'KUMITE' | 'KATA';
                setDisciplineFilter(val);
                setActiveCategoryTab(val);
                const filtered = categories.filter(c => {
                  if (val === 'KUMITE') return isKumiteCategory(c);
                  if (val === 'KATA') return isKataCategory(c);
                  return true;
                });
                if (filtered.length > 0) setSelectedCatId(filtered[0].id);
              }}
              className="w-full px-2.5 py-1.5 bg-secondary border border-border rounded-lg text-xs font-semibold text-foreground focus:outline-none focus:border-primary"
            >
              <option value="ALL">All Disciplines (Kumite & Kata)</option>
              <option value="KUMITE">Kumite Categories ({categories.filter(isKumiteCategory).length})</option>
              <option value="KATA">Kata Categories ({categories.filter(isKataCategory).length})</option>
            </select>
          </div>

          <div>
            <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Quick Select Category</label>
            <select 
              value={selectedCatId || ''}
              onChange={e => {
                setSelectedCatId(e.target.value);
                if (window.innerWidth < 1024) {
                  setTimeout(() => {
                    document.getElementById('draw-right-panel')?.scrollIntoView({ behavior: 'smooth' });
                  }, 50);
                }
              }}
              className="w-full px-2.5 py-1.5 bg-secondary border border-border rounded-lg text-xs font-semibold text-foreground focus:outline-none focus:border-primary"
            >
              {displayCategories.map(c => (
                <option key={c.id} value={c.id}>
                  {isKataCategory(c) ? '🏆 [KATA] ' : '🥋 [KUMITE] '}{c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center text-[10px] font-bold text-muted-foreground uppercase bg-secondary/30 p-2 rounded-lg border border-border">
            <div>
              <span className="block text-xs font-extrabold text-foreground">{displayCategories.length}</span>
              <span>Categories</span>
            </div>
            <div>
              <span className="block text-xs font-extrabold text-foreground">
                {displayCategories.filter(c => getCategoryCountInfo(c.id).total === 0).length}
              </span>
              <span>Empty</span>
            </div>
          </div>
        </div>

        {/* Category list with Pinned Selected Category Card */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 bg-secondary/5">
          {currentCategory && (
            <div className="p-3 bg-primary/10 border-2 border-primary rounded-xl space-y-2 shadow-xs transition-all duration-200">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-wider bg-primary text-primary-foreground px-2 py-0.5 rounded">
                  Selected Category
                </span>
                <span className="text-[10px] font-mono font-bold text-primary">
                  {getCategoryCountInfo(currentCategory.id).confirmed} Confirmed
                </span>
              </div>
              <div>
                <h4 className="font-extrabold text-xs text-foreground truncate" title={currentCategory.name}>
                  {currentCategory.name}
                </h4>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {currentCategory.gender} • {currentCategory.min_weight}-{currentCategory.max_weight}kg • {currentCategory.format === 'round_robin' ? 'Round Robin' : currentCategory.format === 'wkf_repechage' ? 'WKF Repechage' : 'Knockout'}
                </p>
              </div>

              {/* Quick Generate Action Button inside left panel */}
              {canModify && (
                <div className="pt-1">
                  {bouts.filter(b => b.category_id === currentCategory.id).length > 0 ? (
                    <button
                      onClick={handleGenerateDraw}
                      className="w-full py-1.5 px-3 bg-secondary hover:bg-secondary/80 border border-border text-foreground rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                      title="Regenerate bracket matches for this category"
                    >
                      <RefreshCw className="h-3.5 w-3.5 text-primary" />
                      <span>Regenerate Bracket</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleGenerateDraw}
                      className="w-full py-1.5 px-3 bg-primary text-primary-foreground hover:bg-primary/95 rounded-lg text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      title="Generate bracket matches for this category"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-white" />
                      <span>⚡ Generate Bracket</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* RIGHT COLUMN: DRAW CONFIG & MATCH MATCHUPS PANEL         */}
      <div id="draw-right-panel" className="flex-1 min-w-0 bg-background p-4 lg:p-6 space-y-4 flex flex-col h-auto lg:h-full lg:overflow-hidden">
        
        {/* Title Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 border-b border-border pb-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full overflow-hidden border border-white/20 bg-slate-900 shrink-0">
                <img src={logoUrl || `${basePath}/karatetech-logo.png`} alt="Logo" className="h-full w-full object-cover" />
              </div>
              <div className="flex flex-col leading-none">
                <div style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 900, fontSize: '1.05rem', lineHeight: 1, letterSpacing: '0.01em' }}>
                  <span style={{ color: '#b91c2e' }}>Karate</span>
                  <span style={{ color: '#38bdf8' }}>Tech</span>
                </div>
                <div style={{ height: '1.5px', background: 'linear-gradient(90deg, #b91c2e 60%, transparent 100%)', marginTop: '1.5px', marginBottom: '1.5px', borderRadius: '1px' }} />
                <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.01em', color: '#818cf8', lineHeight: 1.15 }}>
                  SP SportData Solution
                </span>
                <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 600, fontSize: '0.52rem', letterSpacing: '0.08em', color: '#64748b', lineHeight: 1.2, marginTop: '1.5px', whiteSpace: 'nowrap' }}>
                  • Precision. • Speed. • Results. •
                </span>
              </div>
            </div>

            {/* Vertical Divider */}
            <div className="hidden md:block h-8 w-[1px] bg-border mx-2" />

            {/* Page Title & Subtitle */}
            <div className="text-left">
              <h2 className="text-lg font-extrabold tracking-tight">Generate Draws</h2>
              <p className="text-[11px] text-muted-foreground">Configure standard single elimination brackets for categories.</p>
            </div>
          </div>

          {/* Action buttons — visible in header */}
          <div className="flex items-center gap-2 flex-wrap no-print shrink-0">
            {canModify && (
              <button
                onClick={handleGenerateAllDraws}
                disabled={loading}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-primary text-primary-foreground hover:bg-primary/95 rounded-lg text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
                title="Generate brackets for all categories with registered participants"
              >
                <Sparkles className="h-4 w-4 text-white" />
                <span>Generate All Brackets</span>
              </button>
            )}
            {canModify && bouts.length > 0 && (
              <button
                onClick={handleClearAllDraws}
                className="flex items-center gap-1.5 px-3.5 py-2 border border-red-500/30 text-red-500 hover:bg-red-500/10 rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
                title="Clear all existing brackets in system and start fresh"
              >
                <Trash2 className="h-4 w-4" />
                <span>Clear All Brackets</span>
              </button>
            )}
            {bouts.length > 0 && (
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90 rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
                title="Print all categories draw sheets"
              >
                <Printer className="h-4 w-4" />
                <span>Print All Categories</span>
              </button>
            )}
          </div>
        </div>

        {currentCategory ? (
          <>
            {/* Draw Parameters & Category Selection Bar */}
            <div className="bg-card border border-border p-5 rounded-xl shadow-xs flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-4">
              <div className="space-y-3 flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* CATEGORY DROPDOWN MENU */}
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-black uppercase text-muted-foreground whitespace-nowrap">Category:</label>
                    <select 
                      value={selectedCatId || ''}
                      onChange={e => setSelectedCatId(e.target.value)}
                      className="px-3 py-2 bg-secondary border border-border rounded-lg text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer max-w-xs sm:max-w-md truncate"
                    >
                      {categories.map(c => {
                        const count = getCategoryCountInfo(c.id).confirmed;
                        const discIcon = isKataCategory(c) ? '🏆 [KATA] ' : '🥋 [KUMITE] ';
                        return (
                          <option key={c.id} value={c.id}>
                            {discIcon}{c.name} ({c.gender} • {count} athletes)
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {selectedCatId && isCategoryLocked(selectedCatId) ? (
                    <span className="px-2.5 py-1 text-[9px] font-black bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-md uppercase tracking-widest flex items-center gap-1 shrink-0 animate-pulse">
                      <Lock className="h-3 w-3" /> Locked (Matches Started)
                    </span>
                  ) : selectedCatId && unlockedCategories.includes(selectedCatId) ? (
                    <span className="px-2.5 py-1 text-[9px] font-black bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-md uppercase tracking-widest flex items-center gap-1 shrink-0">
                      <Unlock className="h-3 w-3" /> Unlocked via Override
                    </span>
                  ) : null}
                </div>

                <p className="text-xs text-muted-foreground">
                  Format: {
                    currentCategory.format === 'round_robin' ? 'Round Robin System' :
                    currentCategory.format === 'wkf_repechage' ? 'WKF Repechage System' :
                    'Single Elimination (Knockout)'
                  }
                </p>
              </div>

              {/* Draw generation + print buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                {selectedCatId && isCategoryLocked(selectedCatId) ? (
                  <button
                    onClick={() => { setPendingAction(null); setIsUnlockModalOpen(true); setUnlockUsername(''); setUnlockPassword(''); setUnlockError(''); }}
                    className="px-3.5 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-500 hover:bg-amber-500/20 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
                    title="Bracket is locked because matches have begun. Click to enter Admin Password & Unlock."
                  >
                    <Lock className="h-4 w-4" />
                    <span>Unlock Bracket (Emergency Override)</span>
                  </button>
                ) : (
                  <>
                    {canModify && categoryBouts.length > 0 && (
                      <button
                        onClick={handleClearDraw}
                        disabled={loading}
                        className="px-3 py-2 border border-red-500/20 text-red-500 hover:bg-red-500/10 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
                        title="Clear bracket matches"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Clear Bracket</span>
                      </button>
                    )}
                    {canModify && (
                      <button
                        onClick={handleGenerateDraw}
                        disabled={loading}
                        className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/95 rounded-lg text-xs font-bold transition shadow-sm cursor-pointer flex items-center gap-1.5"
                        title="Generate or Regenerate bracket matches"
                      >
                        <Sparkles className="h-4 w-4 text-white" />
                        <span>{categoryBouts.length > 0 ? 'Regenerate Bracket' : 'Generate Bracket'}</span>
                      </button>
                    )}
                  </>
                )}
                {categoryBouts.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handlePrintCurrent}
                      className="px-3 py-2 bg-secondary hover:bg-secondary/80 border border-border text-foreground rounded-lg text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
                      title="Print current category draw sheet"
                    >
                      <Printer className="h-4 w-4" />
                      <span>Print</span>
                    </button>
                    <button
                      onClick={handleOpenAsPDF}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
                      title="Open current bracket in a new browser tab as a PDF-ready page"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                      <span>Open as PDF</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Bracket / Matching Visualization Area */}
            <div className="flex-1 border border-border bg-card rounded-xl overflow-hidden flex flex-col min-h-0">
              
              {categoryBouts.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-4">
                  <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                    <GitPullRequest className="h-6 w-6" />
                  </div>
                  <div className="max-w-md space-y-1">
                    <h4 className="font-bold text-sm">No Draws Generated</h4>
                    <p className="text-xs text-muted-foreground">
                      Bouts for this category are empty. Populate and confirm participants in this category, then select bracket formats above and generate draws.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-auto bg-gray-50/20 dark:bg-gray-950/20 flex flex-col justify-between">
                  <div className="p-4" id={`bracket-render-container-${selectedCatId}`}>
                    <SportdataBracket
                      bouts={bouts}
                      participants={participants}
                      clubs={clubs}
                      categories={categories}
                      selectedCatId={selectedCatId}
                      canModify={canModify}
                      onBoutClick={openResolveDialog}
                      theme="light"
                    />
                  </div>

                  {categoryBouts.filter(b => b.round_no === 98).length > 0 && (
                    <div className="mt-8 border-t border-border pt-6 px-6 pb-8 bg-secondary/20 shrink-0">
                      <h3 className="text-xs font-black uppercase text-foreground tracking-wider mb-4 flex items-center gap-1.5">
                        <GitPullRequest className="h-4 w-4 text-yellow-500" />
                        <span>WKF Repechage Pools (Bronze Medal Bracket)</span>
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Pool A */}
                        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                          <h4 className="text-[10px] font-black text-red-500 uppercase tracking-widest">Repechage Pool A (Aka Finalist Pool)</h4>
                          <div className="space-y-2">
                            {categoryBouts.filter(b => b.round_no === 98 && b.bout_no < 20).sort((a, b) => a.bout_no - b.bout_no).map(b => {
                              const competitorA = participants.find(p => p.id === b.participant_a_id);
                              const competitorB = participants.find(p => p.id === b.participant_b_id);
                              const winner = participants.find(p => p.id === b.winner_id);
                              return (
                                <div key={b.id} className="flex items-center justify-between border border-border/60 bg-secondary/10 p-2.5 rounded-lg text-xs">
                                  <div className="space-y-1">
                                    <div className="font-semibold text-foreground">{competitorA?.full_name || 'TBD'} vs {competitorB?.full_name || 'TBD'}</div>
                                    {b.status === 'Completed' && (
                                      <div className="text-[10px] text-muted-foreground">Winner: <span className="font-bold text-primary">{winner?.full_name}</span> ({b.score_a} - {b.score_b})</div>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => openResolveDialog(b)}
                                    disabled={!b.participant_a_id || !b.participant_b_id || !canModify}
                                    className="px-2.5 py-1 bg-primary text-primary-foreground hover:bg-primary/95 text-[10px] font-bold rounded-md disabled:opacity-40 cursor-pointer"
                                  >
                                    Resolve
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Pool B */}
                        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                          <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Repechage Pool B (Ao Finalist Pool)</h4>
                          <div className="space-y-2">
                            {categoryBouts.filter(b => b.round_no === 98 && b.bout_no >= 20).sort((a, b) => a.bout_no - b.bout_no).map(b => {
                              const competitorA = participants.find(p => p.id === b.participant_a_id);
                              const competitorB = participants.find(p => p.id === b.participant_b_id);
                              const winner = participants.find(p => p.id === b.winner_id);
                              return (
                                <div key={b.id} className="flex items-center justify-between border border-border/60 bg-secondary/10 p-2.5 rounded-lg text-xs">
                                  <div className="space-y-1">
                                    <div className="font-semibold text-foreground">{competitorA?.full_name || 'TBD'} vs {competitorB?.full_name || 'TBD'}</div>
                                    {b.status === 'Completed' && (
                                      <div className="text-[10px] text-muted-foreground">Winner: <span className="font-bold text-primary">{winner?.full_name}</span> ({b.score_a} - {b.score_b})</div>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => openResolveDialog(b)}
                                    disabled={!b.participant_a_id || !b.participant_b_id || !canModify}
                                    className="px-2.5 py-1 bg-primary text-primary-foreground hover:bg-primary/95 text-[10px] font-bold rounded-md disabled:opacity-40 cursor-pointer"
                                  >
                                    Resolve
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-card border border-border rounded-xl p-12 text-center text-muted-foreground text-xs font-semibold">
            Select a weight category on the left to review match grids or run draw generations.
          </div>
        )}

      </div>

      {/* Emergency Unlock Modal */}
      {isUnlockModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <form onSubmit={(e) => { e.preventDefault(); handleVerifyUnlockPassword(); }} className="bg-card border border-red-500/40 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl space-y-0">
            <div className="bg-red-500/10 border-b border-red-500/20 p-5 flex items-center gap-3">
              <div className="p-2.5 bg-red-500/20 text-red-500 rounded-xl">
                <ShieldAlert className="h-6 w-6 animate-pulse" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-foreground uppercase tracking-wider">
                  Emergency Override Protocol
                </h3>
                <p className="text-xs text-muted-foreground">
                  Bracket is locked. Enter Admin Password to unlock.
                </p>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Matches in this division have already commenced. Unlocking this bracket will allow force reset, match re-seeding, or structural changes.
              </p>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Admin Username</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Enter Admin Username"
                      value={unlockUsername}
                      onChange={(e) => { setUnlockUsername(e.target.value); setUnlockError(''); }}
                      className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-red-500/50"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Admin Security Password / PIN</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                      type="password"
                      placeholder="Enter Admin Password"
                      value={unlockPassword}
                      onChange={(e) => { setUnlockPassword(e.target.value); setUnlockError(''); }}
                      className="w-full pl-9 pr-3 py-2 bg-secondary border border-border rounded-lg text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-red-500/50"
                    />
                  </div>
                </div>

                {unlockError && (
                  <p className="text-[11px] font-bold text-red-500 flex items-center gap-1 mt-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {unlockError}
                  </p>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-border bg-secondary/15 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => { setIsUnlockModalOpen(false); setUnlockUsername(''); setUnlockPassword(''); setUnlockError(''); setPendingAction(null); }}
                className="px-4 py-2 border border-border bg-card hover:bg-secondary rounded-lg text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-red-500 text-white hover:bg-red-600 rounded-lg text-xs font-bold shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                <Unlock className="h-4 w-4" />
                <span>Verify & Unlock</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* BOUT RESULTS RESOLUTION DIALOG MODAL */}
      {selectedBoutToResolve && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border max-w-md w-full rounded-2xl shadow-xl overflow-hidden flex flex-col">
            
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                <h3 className="font-extrabold text-sm">Resolve Match Outcome</h3>
              </div>
              <button
                onClick={() => setSelectedBoutToResolve(null)}
                className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              
              <div className="grid grid-cols-2 gap-4">
                
                {/* Aka (Red Side) */}
                <div className="space-y-3 p-4 bg-red-500/5 border border-red-500/20 rounded-xl text-center">
                  <div className="w-2.5 h-2.5 bg-red-500 rounded-full mx-auto" />
                  <span className="block text-xs font-bold text-foreground truncate">
                    {participants.find(p => p.id === selectedBoutToResolve.participant_a_id)?.full_name}
                  </span>
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground block">Points Score</label>
                    <input
                      type="number"
                      min={0}
                      value={scoreA}
                      onChange={(e) => setScoreA(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-16 mx-auto px-2 py-1 bg-secondary border border-border rounded text-center text-sm font-bold text-foreground"
                    />
                  </div>
                </div>

                {/* Ao (Blue Side) */}
                <div className="space-y-3 p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl text-center">
                  <div className="w-2.5 h-2.5 bg-blue-500 rounded-full mx-auto" />
                  <span className="block text-xs font-bold text-foreground truncate">
                    {participants.find(p => p.id === selectedBoutToResolve.participant_b_id)?.full_name}
                  </span>
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground block">Points Score</label>
                    <input
                      type="number"
                      min={0}
                      value={scoreB}
                      onChange={(e) => setScoreB(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-16 mx-auto px-2 py-1 bg-secondary border border-border rounded text-center text-sm font-bold text-foreground"
                    />
                  </div>
                </div>

              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Decided Winner</label>
                <select
                  value={chosenWinnerId}
                  onChange={(e) => setChosenWinnerId(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value={selectedBoutToResolve.participant_a_id || ''}>
                    Red Side: {participants.find(p => p.id === selectedBoutToResolve.participant_a_id)?.full_name}
                  </option>
                  <option value={selectedBoutToResolve.participant_b_id || ''}>
                    Blue Side: {participants.find(p => p.id === selectedBoutToResolve.participant_b_id)?.full_name}
                  </option>
                </select>
              </div>

            </div>

            <div className="p-5 border-t border-border bg-secondary/15 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setSelectedBoutToResolve(null)}
                className="px-4 py-2 border border-border bg-card hover:bg-secondary rounded-lg text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleResolveBout}
                className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/95 rounded-lg text-xs font-bold cursor-pointer"
              >
                Save Outcome
              </button>
            </div>

          </div>
        </div>
      )}
    </div>

    {/* ======================================================= */}
    {/* HIDDEN PRINT AREA — rendered for @media print only      */}
    {/* ======================================================= */}
    <div id="draw-print-area" style={{ display: isPrinting ? 'block' : 'none' }} className="text-black bg-white">
      {categories
        .filter(cat => printTarget === 'current' ? cat.id === selectedCatId : true)
        .map(cat => {
          const catBouts = bouts.filter(b => b.category_id === cat.id);

          return (
            <div key={cat.id} className="print-category-block bg-white text-black p-2 mb-6">
              {catBouts.length === 0 ? (
                <div className="p-8 border border-gray-300 text-center font-sans space-y-2 rounded-lg my-4">
                  <h2 className="text-lg font-bold text-gray-900 uppercase">{cat.name}</h2>
                  <p className="text-xs text-gray-600">No bracket matches generated for this category yet. Please click "Generate Bracket" on the Draws page.</p>
                </div>
              ) : (
                <SportdataBracket
                  bouts={bouts}
                  categories={categories}
                  participants={participants}
                  clubs={clubs}
                  selectedCatId={cat.id}
                  canModify={false}
                  theme="light"
                  height="auto"
                />
              )}
            </div>
          );
        })}
    </div>
    </>
  );
}
