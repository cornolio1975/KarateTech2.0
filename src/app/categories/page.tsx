'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTournament } from '@/context/TournamentContext';
import { db } from '@/db/dbClient';
import { Category, Participant, Club, Bout, isKumiteCategory, isKataCategory } from '@/db/types';
import { basePath } from '@/db/dbClient';
import { 
  Plus, Tags, Merge, Split, Move, X, Check, AlertCircle, RefreshCw, Trash2, Edit2, Monitor, ChevronRight, Upload, Search, Filter, Download, Users, UserPlus, Sparkles, Settings2, Save, Lock, Unlock
} from 'lucide-react';
import ImportCategoryModal from '@/components/ImportCategoryModal';

export default function CategoriesPage() {
  const { 
    refreshKey, 
    triggerRefresh, 
    canModify, 
    activeLocks, 
    pcId, 
    tatamiId, 
    takeoverTatami, 
    userRole, 
    userEmail, 
    activeTournamentId, 
    acquireLock, 
    releaseLock 
  } = useTournament();
  const [lockingCatId, setLockingCatId] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [bouts, setBouts] = useState<Bout[]>([]);
  const [mappings, setMappings] = useState<any[]>([]);

  // Dialog states
  const [isMergeOpen, setIsMergeOpen] = useState(false);
  const [isSplitOpen, setIsSplitOpen] = useState(false);
  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [consoleCat, setConsoleCat] = useState<Category | null>(null); // for bout-picker modal

  // Merge state
  const [selectedMergeIds, setSelectedMergeIds] = useState<string[]>([]);
  const [mergedName, setMergedName] = useState('');

  // Split state
  const [selectedSplitId, setSelectedSplitId] = useState('');
  const [split1, setSplit1] = useState({ name: '', min_age: 18, max_age: 99, min_weight: 0, max_weight: 65, gender: 'Male' as any });
  const [split2, setSplit2] = useState({ name: '', min_age: 18, max_age: 99, min_weight: 65.01, max_weight: 999, gender: 'Male' as any });

  // Move / Drag assignment state
  const [movePartId, setMovePartId] = useState('');
  const [moveTargetCatId, setMoveTargetCatId] = useState('');
  const [moveEligibilityAlert, setMoveEligibilityAlert] = useState<{
    eligible: boolean;
    reason: string;
  } | null>(null);

  // Add Participants to Category modal state
  const [selectedCatForAdd, setSelectedCatForAdd] = useState<Category | null>(null);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [participantModalSearch, setParticipantModalSearch] = useState<string>('');
  const [autoMatchCount, setAutoMatchCount] = useState<number>(0);
  const [showOnlyEligible, setShowOnlyEligible] = useState<boolean>(true);

  // Manage Participants (Add/Delete/Modify) modal state
  const [manageCat, setManageCat] = useState<Category | null>(null);
  const [manageSearch, setManageSearch] = useState<string>('');
  const [manageSelected, setManageSelected] = useState<string[]>([]);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [editParticipantForm, setEditParticipantForm] = useState<Partial<Participant>>({});

  // Category Filtering states
  const [disciplineFilter, setDisciplineFilter] = useState<'ALL' | 'KUMITE' | 'KATA'>('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('');
  const [genderFilter, setGenderFilter] = useState<'ALL' | 'Male' | 'Female' | 'Mixed'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [newCat, setNewCat] = useState({
    name: '',
    gender: 'Male' as any,
    min_age: 18,
    max_age: 99,
    min_weight: 0,
    max_weight: 100,
    capacity: 32,
    status: 'Open' as any,
    format: 'knockout' as any
  });

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
      setCategories(catList);
      setParticipants(pList);
      setClubs(clList);
      setBouts(bList);
      setMappings(pcList);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mounted) {
      loadData().then(() => {
        // Auto-open Match Console Hub if returning from control page after saving
        const consoleParam = searchParams.get('console');
        if (consoleParam) {
          // Categories are loaded, find the category and open modal
          // We use a small delay to let state settle
          setTimeout(() => {
            setCategories(prev => {
              const cat = prev.find(c => c.id === consoleParam);
              if (cat) setConsoleCat(cat);
              return prev;
            });
          }, 100);
        }
      });
    }
  }, [mounted, refreshKey]);

  const handleConsoleClick = async (cat: Category) => {
    if (!pcId) {
      alert("PC Identity not established. Please relogin.");
      return;
    }
    
    // Check if we already own it
    const existingLock = activeLocks.find(l => l.category_id === cat.id);
    if (existingLock && existingLock.pc_id === pcId) {
      setConsoleCat(cat);
      return;
    }
    
    setLockingCatId(cat.id);
    try {
      const result = await acquireLock(cat.id);
      if (result.success) {
        setConsoleCat(cat);
        triggerRefresh();
      } else {
        alert("This category is currently locked by another Tatami/PC.");
      }
    } catch (err: any) {
      alert("Error acquiring lock: " + err.message);
    } finally {
      setLockingCatId(null);
    }
  };

  // Handle move participant validation preview
  useEffect(() => {
    if (!movePartId || !moveTargetCatId) {
      setMoveEligibilityAlert(null);
      return;
    }

    const p = participants.find(part => part.id === movePartId);
    const c = categories.find(cat => cat.id === moveTargetCatId);
    
    if (p && c) {
      const getAge = (dobString: string) => {
        const dob = new Date(dobString);
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
        return age;
      };

      const age = getAge(p.dob);
      const ageOk = age >= c.min_age && age <= c.max_age;
      const weightOk = p.weight >= c.min_weight && p.weight <= c.max_weight;
      const genderOk = c.gender === 'Mixed' || c.gender === p.gender;

      if (ageOk && weightOk && genderOk) {
        setMoveEligibilityAlert({
          eligible: true,
          reason: `Eligible: Athlete matches rules (Age: ${age} yr, Weight: ${p.weight}kg, Gender: ${p.gender})`
        });
      } else {
        const mismatchList: string[] = [];
        if (!ageOk) mismatchList.push(`Age: ${age} yr (expected ${c.min_age}-${c.max_age})`);
        if (!weightOk) mismatchList.push(`Weight: ${p.weight}kg (expected ${c.min_weight}-${c.max_weight}kg)`);
        if (!genderOk) mismatchList.push(`Gender: ${p.gender} (expected ${c.gender})`);
        setMoveEligibilityAlert({
          eligible: false,
          reason: `Ineligible: ${mismatchList.join(', ')}. Manual override will override auto-rules.`
        });
      }
    }
  }, [movePartId, moveTargetCatId, participants, categories]);

  if (!mounted) return null;

  // Active Category Lists
  const activeCategories = categories.filter(c => c.status !== 'Closed');

  const getParticipantsForCategory = (catId: string) => {
    const pIds = mappings.filter(m => m.category_id === catId).map(m => m.participant_id);
    return participants.filter(p => pIds.includes(p.id));
  };

  const getCategoryBracketStatus = (catId: string) => {
    const catBouts = bouts.filter(b => b.category_id === catId);
    if (catBouts.length === 0) {
      return 'non-active';
    }
    const allCompleted = catBouts.every(b => b.status === 'Completed' || b.status === 'Walkover');
    if (allCompleted) {
      return 'completed';
    }
    const hasStarted = catBouts.some(b => b.status === 'Completed' || b.status === 'Walkover' || b.status === 'Running');
    if (hasStarted) {
      return 'active';
    }
    return 'non-active';
  };

  // Actions
  const handleMergeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMergeIds.length < 2 || !mergedName) {
      alert('Select at least 2 categories and fill in the merged name.');
      return;
    }
    
    try {
      setLoading(true);
      await db.categories.merge(selectedMergeIds, mergedName);
      alert('Merged successfully.');
      setIsMergeOpen(false);
      setSelectedMergeIds([]);
      setMergedName('');
      triggerRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSplitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSplitId || !split1.name || !split2.name) {
      alert('Please fill in both split category names.');
      return;
    }
    
    try {
      setLoading(true);
      await db.categories.split(selectedSplitId, split1, split2);
      alert('Split successfully redistribution complete.');
      setIsSplitOpen(false);
      setSelectedSplitId('');
      triggerRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMoveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movePartId || !moveTargetCatId) return;

    try {
      setLoading(true);
      await db.participants.assignCategoryManually(movePartId, moveTargetCatId, 'Category Admin');
      alert('Participant reassigned successfully.');
      setIsMoveOpen(false);
      setMovePartId('');
      setMoveTargetCatId('');
      triggerRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCat) return;
    try {
      setLoading(true);
      await db.categories.update(editCat.id, editCat);
      alert('Category updated successfully.');
      setIsEditOpen(false);
      setEditCat(null);
      triggerRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to update category.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCat.name) {
      alert('Please fill in the category name.');
      return;
    }
    
    try {
      setLoading(true);
      await db.categories.add(newCat);
      alert('Category added successfully.');
      setIsAddOpen(false);
      setNewCat({
        name: '',
        gender: 'Male' as any,
        min_age: 18,
        max_age: 99,
        min_weight: 0,
        max_weight: 100,
        capacity: 32,
        status: 'Open' as any,
        format: 'knockout' as any
      });
      triggerRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    if (!confirm('Are you sure you want to delete this category? All related bouts and mapping logs will be deleted!')) {
      return;
    }
    try {
      setLoading(true);
      await db.categories.delete(catId);
      alert('Category deleted successfully.');
      triggerRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAllCategories = async () => {
    if (categories.length === 0) {
      alert('There are no categories to delete.');
      return;
    }
    if (!confirm(`Are you sure you want to delete ALL ${categories.length} categories? This action cannot be undone.`)) {
      return;
    }
    try {
      setLoading(true);
      for (const cat of categories) {
        await db.categories.delete(cat.id);
      }
      alert('All categories deleted successfully.');
      triggerRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to delete categories.');
    } finally {
      setLoading(false);
    }
  };

  // Categories for dropdown list (filtered by discipline)
  const dropdownCategories = categories.filter(c => {
    if (disciplineFilter === 'KUMITE') return isKumiteCategory(c);
    if (disciplineFilter === 'KATA') return isKataCategory(c);
    return true;
  });

  // Categories filtered for display grid
  const filteredCategories = categories.filter(c => {
    if (disciplineFilter === 'KUMITE' && !isKumiteCategory(c)) return false;
    if (disciplineFilter === 'KATA' && !isKataCategory(c)) return false;
    if (genderFilter !== 'ALL' && c.gender !== genderFilter) return false;
    if (selectedCategoryFilter && c.id !== selectedCategoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesName = c.name.toLowerCase().includes(q);
      const matchesGender = c.gender.toLowerCase().includes(q);
      const matchesWeight = `${c.min_weight}-${c.max_weight}kg`.toLowerCase().includes(q);
      if (!matchesName && !matchesGender && !matchesWeight) return false;
    }
    return true;
  }).sort((a, b) => {
    if (a.gender !== b.gender) {
      const order = { 'Male': 1, 'Female': 2, 'Mixed': 3 };
      const gA = order[a.gender as keyof typeof order] || 99;
      const gB = order[b.gender as keyof typeof order] || 99;
      if (gA !== gB) return gA - gB;
      return a.gender.localeCompare(b.gender);
    }
    if (a.min_age !== b.min_age) return a.min_age - b.min_age;
    if (a.max_age !== b.max_age) return a.max_age - b.max_age;
    if (a.min_weight !== b.min_weight) return a.min_weight - b.min_weight;
    if (a.max_weight !== b.max_weight) return a.max_weight - b.max_weight;
    return a.name.localeCompare(b.name);
  });

  const calculateAge = (dobString: string): number => {
    if (!dobString) return 0;
    let birthDate: Date | null = null;
    const str = String(dobString).trim();

    // Parse DD/MM/YYYY format (e.g. 15/08/2014)
    if (str.includes('/')) {
      const parts = str.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
          birthDate = new Date(year, month, day);
        }
      }
    }

    if (!birthDate || isNaN(birthDate.getTime())) {
      birthDate = new Date(str);
    }

    if (!birthDate || isNaN(birthDate.getTime())) {
      return 0;
    }

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return Math.max(0, age);
  };

  const getGenderNorm = (genderStr?: string, nameStr?: string): string => {
    const g = (genderStr || '').trim().toLowerCase();
    const n = (nameStr || '').trim().toLowerCase();
    if (g === 'female' || g === 'f' || g === 'girl' || g === 'women' || g === 'woman' || n.includes('female') || n.includes('girl') || n.includes('women')) return 'Female';
    if (g === 'male' || g === 'm' || g === 'boy' || g === 'men' || g === 'man' || n.includes('male') || n.includes('boy') || n.includes('men')) return 'Male';
    return 'Mixed';
  };

  const getMatchingParticipantIds = (cat: Category) => {
    const autoMatchedIds: string[] = [];
    participants.forEach(p => {
      const age = calculateAge(p.dob);
      const pGenderNorm = getGenderNorm(p.gender);
      const cGenderNorm = (cat.gender as any) === 'Mixed' ? 'Mixed' : getGenderNorm(cat.gender, cat.name);
      const genderMatches = cGenderNorm === 'Mixed' || cGenderNorm === pGenderNorm;
      const ageMatches = age >= cat.min_age && age <= cat.max_age;
      const isKataOrOpenWeight = (cat.min_weight === 0 && (cat.max_weight === 0 || cat.max_weight >= 100)) || cat.name.toLowerCase().includes('kata');
      const weightMatches = isKataOrOpenWeight || (p.weight >= cat.min_weight && p.weight <= cat.max_weight);

      if (genderMatches && ageMatches && weightMatches) {
        autoMatchedIds.push(p.id);
      }
    });
    return autoMatchedIds;
  };

  const handleOpenAddParticipantsModal = (cat: Category) => {
    setSelectedCatForAdd(cat);
    setParticipantModalSearch('');
    setShowOnlyEligible(true);

    const autoMatchedIds = getMatchingParticipantIds(cat);
    setSelectedParticipantIds(autoMatchedIds);
    setAutoMatchCount(autoMatchedIds.length);
  };

  const handleConfirmAddParticipants = async () => {
    if (!selectedCatForAdd) return;
    if (selectedParticipantIds.length === 0) {
      alert('No participants selected.');
      return;
    }

    const confirmMsg = `Confirm adding ${selectedParticipantIds.length} selected participant(s) to category "${selectedCatForAdd.name}"?`;
    if (window.confirm(confirmMsg)) {
      try {
        setLoading(true);
        for (const pId of selectedParticipantIds) {
          await db.participants.assignCategoryManually(pId, selectedCatForAdd.id, 'Admin');
        }
        alert(`Successfully assigned ${selectedParticipantIds.length} participant(s) to "${selectedCatForAdd.name}".`);
        setSelectedCatForAdd(null);
        setSelectedParticipantIds([]);
        await loadData();
        triggerRefresh();
      } catch (err: any) {
        alert(err.message || 'Failed to assign participants.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleExportCSV = () => {
    const targetCategories = filteredCategories.length > 0 ? filteredCategories : categories;
    if (targetCategories.length === 0) {
      alert('No categories available to export.');
      return;
    }

    const headers = [
      'Category ID',
      'Name',
      'Discipline',
      'Gender',
      'Min Age',
      'Max Age',
      'Min Weight (kg)',
      'Max Weight (kg)',
      'Format',
      'Status',
      'Registered Athletes',
      'Total Bouts'
    ];

    const rows = targetCategories.map(cat => {
      const isKata = isKataCategory(cat);
      const isKumite = isKumiteCategory(cat);
      const discipline = isKata ? 'Kata' : isKumite ? 'Kumite' : 'Open';
      const count = mappings.filter(m => m.category_id === cat.id).length;
      const boutCount = bouts.filter(b => b.category_id === cat.id).length;

      return [
        `"${cat.id}"`,
        `"${cat.name.replace(/"/g, '""')}"`,
        `"${discipline}"`,
        `"${cat.gender}"`,
        cat.min_age ?? 0,
        cat.max_age ?? 99,
        cat.min_weight ?? 0,
        cat.max_weight ?? 999,
        `"${cat.format || 'knockout'}"`,
        `"${cat.status || 'Open'}"`,
        count,
        boutCount
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `KarateTech_Categories_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 space-y-6 text-foreground w-full h-full overflow-y-auto">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Category Management</h1>
          <p className="text-sm text-muted-foreground">Manage athlete weight brackets, trigger merges, splits, and custom overrides.</p>
        </div>
        {canModify && (
          <div className="flex items-center gap-2 self-start flex-wrap">
            <button
              onClick={() => setIsImportOpen(true)}
              className="px-3.5 py-2 bg-card hover:bg-secondary border border-border text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer text-foreground"
            >
              <Upload className="h-4 w-4 text-muted-foreground" />
              <span>Import CSV</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 bg-card hover:bg-secondary border border-border text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer text-foreground"
              title="Export current categories to CSV file"
            >
              <Download className="h-4 w-4 text-muted-foreground" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handleDeleteAllCategories}
              className="px-3.5 py-2 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-500 rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Trash2 className="h-4 w-4 text-red-500" />
              <span>Delete All</span>
            </button>
            <button
              onClick={() => setIsAddOpen(true)}
              className="px-3.5 py-2 bg-card hover:bg-secondary border border-border text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer text-foreground"
            >
              <Plus className="h-4 w-4 text-muted-foreground" />
              <span>Add Category</span>
            </button>
            <button
              onClick={() => setIsMergeOpen(true)}
              className="px-3.5 py-2 bg-card hover:bg-secondary border border-border text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer text-foreground"
            >
              <Merge className="h-4 w-4 text-muted-foreground" />
              <span>Merge Categories</span>
            </button>
            <button
              onClick={() => setIsSplitOpen(true)}
              className="px-3.5 py-2 bg-card hover:bg-secondary border border-border text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer text-foreground"
            >
              <Split className="h-4 w-4 text-muted-foreground" />
              <span>Split Brackets</span>
            </button>
            <button
              onClick={() => setIsMoveOpen(true)}
              className="px-3.5 py-2 bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Move className="h-4 w-4" />
              <span>Reassign Athlete</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-card border border-border p-4 rounded-xl shadow-xs grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
        
        {/* Discipline Filter (ALL / KUMITE / KATA) */}
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Discipline</span>
          <div className="grid grid-cols-3 bg-secondary/40 p-1 rounded-lg border border-border gap-1 text-xs">
            <button
              type="button"
              onClick={() => { setDisciplineFilter('ALL'); setSelectedCategoryFilter(''); }}
              className={`py-1.5 px-2 rounded-md font-bold text-center cursor-pointer transition-colors ${
                disciplineFilter === 'ALL'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              ALL
            </button>
            <button
              type="button"
              onClick={() => { setDisciplineFilter('KUMITE'); setSelectedCategoryFilter(''); }}
              className={`py-1.5 px-2 rounded-md font-bold text-center cursor-pointer transition-colors ${
                disciplineFilter === 'KUMITE'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              🥋 KUMITE
            </button>
            <button
              type="button"
              onClick={() => { setDisciplineFilter('KATA'); setSelectedCategoryFilter(''); }}
              className={`py-1.5 px-2 rounded-md font-bold text-center cursor-pointer transition-colors ${
                disciplineFilter === 'KATA'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              🏆 KATA
            </button>
          </div>
        </div>

        {/* Categories Dropdown List */}
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Select Category</span>
          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
          >
            <option value="">All Categories ({dropdownCategories.length})</option>
            {dropdownCategories.map(c => (
              <option key={c.id} value={c.id}>
                {isKataCategory(c) ? '🏆 [KATA] ' : '🥋 [KUMITE] '}{c.name} ({getParticipantsForCategory(c.id).length} athletes)
              </option>
            ))}
          </select>
        </div>

        {/* Gender Filter */}
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Gender</span>
          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value as any)}
            className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
          >
            <option value="ALL">All Genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Mixed">Mixed</option>
          </select>
        </div>

        {/* Category Search Input */}
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Search</span>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Filter category / weight..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-secondary border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
          <span className="text-xs">Syncing categories telemetry...</span>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-xl bg-card">
          <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-semibold text-foreground">No categories found matching your filters</p>
          <p className="text-xs text-muted-foreground mt-1">Try resetting or switching discipline filters to view all brackets.</p>
          <button
            onClick={() => {
              setDisciplineFilter('ALL');
              setSelectedCategoryFilter('');
              setGenderFilter('ALL');
              setSearchQuery('');
            }}
            className="mt-3 px-3 py-1.5 bg-secondary border border-border text-foreground hover:bg-secondary/80 rounded-lg text-xs font-bold cursor-pointer transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        /* Visual Category Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCategories.map((cat) => {
            const list = getParticipantsForCategory(cat.id);
            const count = list.length;
            const cap = cat.capacity || 32;
            const ratio = (count / cap) * 100;

            const status = getCategoryBracketStatus(cat.id);
            let cardClass = '';
            if (status === 'completed') {
              cardClass = 'bg-emerald-50/70 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-900/35 hover:border-emerald-400/50';
            } else if (status === 'active') {
              cardClass = 'bg-orange-50/70 dark:bg-orange-950/10 border-orange-200 dark:border-orange-900/35 hover:border-orange-400/50';
            } else {
              cardClass = 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-350';
            }

            return (
              <div key={cat.id} className={`rounded-xl p-5 border shadow-sm flex flex-col justify-between transition-all duration-200 ${cardClass}`}>
                {/* Category metadata */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                        cat.gender === 'Male' 
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' 
                          : cat.gender === 'Female' 
                            ? 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400' 
                            : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                      }`}>
                        {cat.gender}
                      </span>
                      <span className="text-[10px] font-bold text-muted-foreground bg-secondary/50 dark:bg-secondary/20 px-1.5 py-0.5 rounded border border-border/30">
                        {cat.min_weight}-{cat.max_weight}kg
                      </span>
                      {status === 'completed' && (
                        <span className="text-[9px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Completed
                        </span>
                      )}
                      {status === 'active' && (
                        <span className="text-[9px] font-bold bg-orange-500/20 text-orange-700 dark:text-orange-450 px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                          Active
                        </span>
                      )}
                      {(() => {
                        const lock = activeLocks.find(l => l.category_id === cat.id);
                        if (!lock) {
                          return (
                            <span className="text-[9px] font-bold bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                              <Unlock className="w-2.5 h-2.5" />
                              Available
                            </span>
                          );
                        }
                        if (lock.pc_id === pcId) {
                          return (
                            <span className="text-[9px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5" />
                              Owned By This PC
                            </span>
                          );
                        }
                        return (
                          <span className="text-[9px] font-bold bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" />
                            {lock.tatami || lock.username || 'In Use'}
                          </span>
                        );
                      })()}
                    </div>
                    {canModify && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditCat(cat);
                            setIsEditOpen(true);
                          }}
                          className="p-1 hover:bg-secondary text-muted-foreground hover:text-primary rounded transition-colors cursor-pointer"
                          title="Edit Category"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="p-1 hover:bg-secondary text-muted-foreground hover:text-red-500 rounded transition-colors cursor-pointer"
                          title="Delete Category"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <h3 className="font-extrabold text-sm text-foreground truncate" title={cat.name}>
                    {cat.name}
                  </h3>
                  <span className="text-[10px] text-muted-foreground block mt-0.5">
                    Age limits: {cat.min_age} - {cat.max_age} years old
                  </span>
                </div>

                {/* Progress capacity bar */}
                <div className="mt-5 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-semibold">Registered: {count} / {cap}</span>
                    <span className="text-muted-foreground">{Math.round(ratio)}% filled</span>
                  </div>
                  <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        ratio >= 90 ? 'bg-red-500' : ratio >= 60 ? 'bg-amber-500' : 'bg-primary'
                      }`} 
                      style={{ width: `${Math.min(100, ratio)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Quick list of participant initials */}
                {count > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1 border-t border-border/40 pt-3">
                    {list.slice(0, 5).map(p => (
                      <div 
                        key={p.id} 
                        className="text-[9px] font-bold bg-secondary px-2 py-0.5 rounded-full text-foreground border border-border"
                        title={p.full_name}
                      >
                        {p.full_name.substring(0, 8)}..
                      </div>
                    ))}
                    {count > 5 && (
                      <span className="text-[9px] text-muted-foreground font-semibold px-1 py-0.5">
                        +{count - 5} more
                      </span>
                    )}
                  </div>
                )}



                {/* Action buttons on Category Card Box */}
                <div className="mt-3 space-y-1.5 pt-2 border-t border-border/40">
                  {canModify && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenAddParticipantsModal(cat)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-bold border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary transition cursor-pointer"
                        title="Auto-select & add matching participants to this category"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        <span>+ Add</span>
                      </button>
                      <button
                        onClick={() => {
                          setManageCat(cat);
                          setManageSearch('');
                          setManageSelected([]);
                          setEditingParticipant(null);
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-bold border border-secondary bg-card hover:bg-secondary text-foreground transition cursor-pointer"
                        title="View, modify or remove participants enrolled in this category"
                      >
                        <Settings2 className="h-3.5 w-3.5" />
                        <span>Manage</span>
                      </button>
                    </div>
                  )}
                  {bouts.some(b => b.category_id === cat.id) && (() => {
                    const assignedTatami = (cat as any).assigned_tatami;
                    const effectiveTatamiNum = takeoverTatami || tatamiId;
                    const isAssignedToOtherTatami = effectiveTatamiNum && assignedTatami && assignedTatami !== `Tatami ${effectiveTatamiNum}` && userRole !== 'Admin';
                    
                    const lock = activeLocks.find(l => l.category_id === cat.id);
                    const isLockedByOtherPc = lock && lock.pc_id !== pcId && userRole !== 'Admin';
                    const isLockedByOther = isAssignedToOtherTatami || isLockedByOtherPc;
                    const isLocking = lockingCatId === cat.id;

                    let lockLabel = 'Console';
                    if (isLocking) lockLabel = 'Locking...';
                    else if (isAssignedToOtherTatami) lockLabel = `🔒 Locked (${assignedTatami.toUpperCase()})`;
                    else if (isLockedByOtherPc) lockLabel = `🔒 Locked (${lock?.tatami || 'Other PC'})`;

                    return (
                      <button
                        onClick={() => handleConsoleClick(cat)}
                        disabled={isLockedByOther || isLocking}
                        className={`w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-[11px] font-bold border transition ${
                          isLockedByOther 
                            ? 'bg-red-500/10 border-red-500/20 text-red-400 cursor-not-allowed opacity-80'
                            : 'bg-card hover:bg-secondary border-border text-foreground cursor-pointer'
                        }`}
                        title={isLockedByOther ? `Category is locked / assigned to ${assignedTatami || lock?.tatami || 'another Tatami'}` : 'Open match console hub for this category'}
                      >
                        {isLocking ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : isLockedByOther ? (
                          <Lock className="h-3.5 w-3.5" />
                        ) : (
                          <Monitor className="h-3.5 w-3.5" />
                        )}
                        <span>{lockLabel}</span>
                      </button>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* --- DIALOG MODALS --- */}

      {/* MATCH CONSOLE — Bout Picker Modal */}
      {consoleCat && (() => {
        const catBouts = bouts
          .filter(b => b.category_id === consoleCat.id && b.round_no !== 99 && b.status !== 'Walkover')
          .sort((a, b) => a.round_no !== b.round_no ? a.round_no - b.round_no : a.bout_no - b.bout_no);

        const getRoundLabel = (roundNo: number) => {
          const roundBouts = catBouts.filter(b => b.round_no === roundNo);
          if (roundBouts.length === 1) return 'Final';
          if (roundBouts.length === 2) return 'Semi-Final';
          return `Round ${roundNo}`;
        };

        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-30 p-4">
            <div className="bg-card w-full max-w-lg rounded-2xl shadow-2xl border border-border overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-foreground">
              
              {/* Modal Header */}
              <div className="p-5 border-b border-border bg-secondary/10 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-primary/10 rounded-lg">
                    <Monitor className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <span className="font-bold text-sm block">Match Console Hub</span>
                    <span className="text-[10px] text-muted-foreground font-medium truncate max-w-[280px] block" title={consoleCat.name}>
                      {consoleCat.name} — Select a bout to open the control console
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      if (pcId) {
                        try {
                          await releaseLock(consoleCat.id);
                          triggerRefresh();
                        } catch (err) {
                          console.error("Error releasing lock", err);
                        }
                      }
                      setConsoleCat(null);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 dark:text-red-400 rounded-lg text-[10px] font-bold border border-red-500/20 transition cursor-pointer"
                    title="Release the lock on this category so other Tatamis can control it"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Release Category</span>
                  </button>
                  <button
                    onClick={() => setConsoleCat(null)}
                    className="p-1.5 hover:bg-secondary text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer"
                    title="Close (Keep Lock)"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Bout List */}
              <div className="p-4 space-y-1.5 max-h-[55vh] overflow-y-auto">
                {catBouts.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    No bouts found for this category.
                  </div>
                ) : (
                  catBouts.map(bout => {
                    const compA = participants.find(p => p.id === bout.participant_a_id);
                    const compB = participants.find(p => p.id === bout.participant_b_id);
                    const roundLabel = getRoundLabel(bout.round_no);
                    const isCompleted = bout.status === 'Completed';
                    const isRunning = bout.status === 'Running';

                    return (
                      <button
                        key={bout.id}
                        onClick={() => {
                          setConsoleCat(null);
                          const targetControl = isKataCategory(consoleCat) ? '/dashboard/kata-control' : '/dashboard/control';
                          router.push(`${targetControl}?boutId=${bout.id}&catId=${consoleCat.id}`);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-150 cursor-pointer text-left group ${
                          isRunning
                            ? 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800/40 hover:border-orange-400/60'
                            : isCompleted
                            ? 'bg-emerald-50/60 dark:bg-emerald-950/10 border-emerald-200/60 dark:border-emerald-800/30 hover:border-emerald-400/50'
                            : 'bg-secondary/40 border-border hover:bg-secondary hover:border-border/80'
                        }`}
                      >
                        {/* Round + Bout badge */}
                        <div className="flex flex-col items-center min-w-[48px] gap-0.5">
                          <span className={`text-[9px] font-black uppercase tracking-widest ${
                            isRunning ? 'text-orange-600 dark:text-orange-400' :
                            isCompleted ? 'text-emerald-600 dark:text-emerald-400' :
                            'text-muted-foreground'
                          }`}>
                            {roundLabel}
                          </span>
                          <span className="text-[11px] font-bold text-foreground">B{bout.bout_no}</span>
                        </div>

                        {/* Divider */}
                        <div className="w-px h-8 bg-border/60" />

                        {/* Fighters */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-600 shrink-0" />
                            <span className="text-[9px] font-black text-red-500 uppercase tracking-wider w-7">AKA</span>
                            <span className="text-xs font-bold text-foreground truncate">
                              {compA?.full_name || 'TBD'}
                            </span>
                            {clubs.find(c => c.id === compA?.club_id) && (
                              <span className="text-[10px] text-muted-foreground truncate hidden sm:inline">
                                ({clubs.find(c => c.id === compA?.club_id)?.name})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                            <span className="text-[9px] font-black text-blue-500 uppercase tracking-wider w-7">AO</span>
                            <span className="text-xs font-bold text-foreground truncate">
                              {compB?.full_name || 'TBD'}
                            </span>
                            {clubs.find(c => c.id === compB?.club_id) && (
                              <span className="text-[10px] text-muted-foreground truncate hidden sm:inline">
                                ({clubs.find(c => c.id === compB?.club_id)?.name})
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Status chip */}
                        <div className="shrink-0 flex items-center gap-2">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            isRunning
                              ? 'bg-orange-500/20 text-orange-700 dark:text-orange-400 animate-pulse'
                              : isCompleted
                              ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                              : 'bg-secondary text-muted-foreground'
                          }`}>
                            {isRunning ? 'Live' : isCompleted ? 'Done' : 'Ready'}
                          </span>
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-border bg-secondary/5 flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">{catBouts.length} bout{catBouts.length !== 1 ? 's' : ''} in this category</span>
                <button
                  onClick={() => setConsoleCat(null)}
                  className="px-3 py-1.5 border border-border text-muted-foreground hover:text-foreground rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* A. MERGE DIALOG */}
      {isMergeOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-30 p-4">
          <form onSubmit={handleMergeSubmit} className="bg-card w-full max-w-md rounded-xl shadow-xl border border-border overflow-hidden animate-scale-in text-foreground">
            <div className="p-5 border-b border-border bg-secondary/10 flex justify-between items-center">
              <span className="font-bold text-sm">Merge Event Brackets</span>
              <button type="button" onClick={() => { setIsMergeOpen(false); setSelectedMergeIds([]); }} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Combine under-populated weight groups. Checkboxes below select the categories to combine. The system redistributes mappings automatically.
              </p>

              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {activeCategories.map(c => (
                  <label key={c.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-secondary/40 text-xs cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={selectedMergeIds.includes(c.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedMergeIds([...selectedMergeIds, c.id]);
                        else setSelectedMergeIds(selectedMergeIds.filter(id => id !== c.id));
                      }}
                      className="rounded border-border text-primary"
                    />
                    <div>
                      <span className="font-bold block">{c.name}</span>
                      <span className="text-[10px] text-muted-foreground block">
                        Active count: {getParticipantsForCategory(c.id).length} athletes
                      </span>
                    </div>
                  </label>
                ))}
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Merged Category Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Combined Kumite -65kg"
                  value={mergedName}
                  onChange={(e) => setMergedName(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                />
              </div>
            </div>

            <div className="p-4 border-t border-border flex justify-end gap-2 bg-secondary/5">
              <button 
                type="button" 
                onClick={() => { setIsMergeOpen(false); setSelectedMergeIds([]); }} 
                className="px-3 py-1.5 border border-border text-muted-foreground hover:text-foreground rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={selectedMergeIds.length < 2 || !mergedName}
                className="px-4 py-1.5 bg-primary text-primary-foreground disabled:opacity-50 hover:bg-primary/95 text-xs font-bold rounded-lg cursor-pointer"
              >
                Merge Brackets
              </button>
            </div>
          </form>
        </div>
      )}

      {/* B. SPLIT DIALOG */}
      {isSplitOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-30 p-4">
          <form onSubmit={handleSplitSubmit} className="bg-card w-full max-w-lg rounded-xl shadow-xl border border-border overflow-hidden animate-scale-in text-foreground">
            <div className="p-5 border-b border-border bg-secondary/10 flex justify-between items-center">
              <span className="font-bold text-sm">Split Large Category</span>
              <button type="button" onClick={() => setIsSplitOpen(false)} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <p className="text-xs text-muted-foreground">
                Split a crowded category into two. Athletes will be redistributed automatically based on the age/weight rules you specify for the splits.
              </p>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Select Category to Split</label>
                <select
                  required
                  value={selectedSplitId}
                  onChange={(e) => {
                    setSelectedSplitId(e.target.value);
                    const original = categories.find(c => c.id === e.target.value);
                    if (original) {
                      setSplit1({ name: `${original.name} (Light)`, min_age: original.min_age, max_age: original.max_age, min_weight: original.min_weight, max_weight: (original.min_weight + original.max_weight) / 2, gender: original.gender });
                      setSplit2({ name: `${original.name} (Heavy)`, min_age: original.min_age, max_age: original.max_age, min_weight: (original.min_weight + original.max_weight) / 2 + 0.01, max_weight: original.max_weight, gender: original.gender });
                    }
                  }}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs focus:outline-none text-foreground"
                >
                  <option value="">Select category...</option>
                  {activeCategories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({getParticipantsForCategory(c.id).length} registered)
                    </option>
                  ))}
                </select>
              </div>

              {selectedSplitId && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 animate-fade-in">
                  {/* Split 1 */}
                  <div className="border border-border p-4 rounded-xl space-y-3 bg-secondary/10">
                    <span className="text-[10px] font-bold uppercase tracking-wider block text-primary">First Split Category</span>
                    <div>
                      <label className="text-[9px] font-bold text-muted-foreground uppercase block mb-1">Name</label>
                      <input
                        type="text"
                        required
                        value={split1.name}
                        onChange={(e) => setSplit1({ ...split1, name: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-card border border-border rounded-lg text-xs text-foreground focus:outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] font-bold text-muted-foreground uppercase block mb-1">Min Weight (kg)</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={split1.min_weight}
                          onChange={(e) => setSplit1({ ...split1, min_weight: parseFloat(e.target.value) })}
                          className="w-full px-2.5 py-1.5 bg-card border border-border rounded-lg text-xs text-foreground focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-muted-foreground uppercase block mb-1">Max Weight (kg)</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={split1.max_weight}
                          onChange={(e) => setSplit1({ ...split1, max_weight: parseFloat(e.target.value) })}
                          className="w-full px-2.5 py-1.5 bg-card border border-border rounded-lg text-xs text-foreground focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Split 2 */}
                  <div className="border border-border p-4 rounded-xl space-y-3 bg-secondary/10">
                    <span className="text-[10px] font-bold uppercase tracking-wider block text-primary">Second Split Category</span>
                    <div>
                      <label className="text-[9px] font-bold text-muted-foreground uppercase block mb-1">Name</label>
                      <input
                        type="text"
                        required
                        value={split2.name}
                        onChange={(e) => setSplit2({ ...split2, name: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-card border border-border rounded-lg text-xs text-foreground focus:outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] font-bold text-muted-foreground uppercase block mb-1">Min Weight (kg)</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={split2.min_weight}
                          onChange={(e) => setSplit2({ ...split2, min_weight: parseFloat(e.target.value) })}
                          className="w-full px-2.5 py-1.5 bg-card border border-border rounded-lg text-xs text-foreground focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-muted-foreground uppercase block mb-1">Max Weight (kg)</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={split2.max_weight}
                          onChange={(e) => setSplit2({ ...split2, max_weight: parseFloat(e.target.value) })}
                          className="w-full px-2.5 py-1.5 bg-card border border-border rounded-lg text-xs text-foreground focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border flex justify-end gap-2 bg-secondary/5">
              <button type="button" onClick={() => setIsSplitOpen(false)} className="px-3 py-1.5 border border-border text-muted-foreground hover:text-foreground rounded-lg text-xs font-semibold cursor-pointer">
                Cancel
              </button>
              <button
                type="submit"
                disabled={!selectedSplitId || !split1.name || !split2.name}
                className="px-4 py-1.5 bg-primary text-primary-foreground disabled:opacity-50 hover:bg-primary/95 text-xs font-bold rounded-lg cursor-pointer"
              >
                Split Bracket & Assign
              </button>
            </div>
          </form>
        </div>
      )}

      {/* C. MOVE ATHLETE (REASSIGNMENT) DIALOG */}
      {isMoveOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-30 p-4">
          <form onSubmit={handleMoveSubmit} className="bg-card w-full max-w-md rounded-xl shadow-xl border border-border overflow-hidden animate-scale-in text-foreground">
            <div className="p-5 border-b border-border bg-secondary/10 flex justify-between items-center">
              <span className="font-bold text-sm">Reassign Category Override</span>
              <button type="button" onClick={() => { setIsMoveOpen(false); setMovePartId(''); setMoveTargetCatId(''); }} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Target Category</label>
                <select
                  required
                  value={moveTargetCatId}
                  onChange={(e) => {
                    setMoveTargetCatId(e.target.value);
                    setMovePartId(''); // Reset participant when category changes
                  }}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs focus:outline-none text-foreground"
                >
                  <option value="">Choose destination category...</option>
                  {activeCategories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.min_weight}-{c.max_weight}kg)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Select Participant</label>
                <select
                  required
                  value={movePartId}
                  onChange={(e) => setMovePartId(e.target.value)}
                  disabled={!moveTargetCatId}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs focus:outline-none text-foreground disabled:opacity-50"
                >
                  <option value="">{moveTargetCatId ? "Choose athlete..." : "Select Target Category first"}</option>
                  {participants.filter(p => {
                    if (!moveTargetCatId) return true;
                    const cat = activeCategories.find(c => c.id === moveTargetCatId);
                    if (!cat) return true;
                    if (isKumiteCategory(cat)) return p.isKumite;
                    if (isKataCategory(cat)) return p.isKata;
                    return true;
                  }).map(p => {
                    const cId = mappings.find(m => m.participant_id === p.id)?.category_id;
                    const cName = categories.find(cat => cat.id === cId)?.name || 'Unassigned';
                    return (
                      <option key={p.id} value={p.id}>
                        {p.full_name} ({p.gender}, {p.weight}kg) • Currently: {cName}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Eligibility Preview Warning */}
              {moveEligibilityAlert && (
                <div className={`p-3.5 border rounded-lg flex gap-2 text-xs ${
                  moveEligibilityAlert.eligible 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30' 
                    : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30'
                }`}>
                  <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">{moveEligibilityAlert.eligible ? 'Ready for Assignment' : 'Eligibility Flag Warning'}</span>
                    <span className="block mt-0.5 leading-relaxed text-[11px]">{moveEligibilityAlert.reason}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border flex justify-end gap-2 bg-secondary/5">
              <button 
                type="button" 
                onClick={() => { setIsMoveOpen(false); setMovePartId(''); setMoveTargetCatId(''); }} 
                className="px-3 py-1.5 border border-border text-muted-foreground hover:text-foreground rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!movePartId || !moveTargetCatId}
                className="px-4 py-1.5 bg-primary text-primary-foreground disabled:opacity-50 hover:bg-primary/95 text-xs font-bold rounded-lg cursor-pointer"
              >
                Reassign Athlete
              </button>
            </div>
          </form>
        </div>
      )}

      {/* D. ADD CATEGORY DIALOG */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-30 p-4">
          <form onSubmit={handleAddSubmit} className="bg-card w-full max-w-md rounded-xl shadow-xl border border-border overflow-hidden animate-scale-in text-foreground">
            <div className="p-5 border-b border-border bg-secondary/10 flex justify-between items-center">
              <span className="font-bold text-sm">Add New Category</span>
              <button type="button" onClick={() => setIsAddOpen(false)} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
            
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Category Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cadet Male Kumite -52kg"
                  value={newCat.name}
                  onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Gender Focus</label>
                  <select
                    value={newCat.gender}
                    onChange={(e) => setNewCat({ ...newCat, gender: e.target.value as any })}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs focus:outline-none text-foreground"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Mixed">Mixed</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Status</label>
                  <select
                    value={newCat.status}
                    onChange={(e) => setNewCat({ ...newCat, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs focus:outline-none text-foreground"
                  >
                    <option value="Open">Open</option>
                    <option value="Closed">Closed</option>
                    <option value="Full">Full</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Min Age (Years)</label>
                  <input
                    type="number"
                    required
                    value={newCat.min_age}
                    onChange={(e) => setNewCat({ ...newCat, min_age: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs focus:outline-none text-foreground"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Max Age (Years)</label>
                  <input
                    type="number"
                    required
                    value={newCat.max_age}
                    onChange={(e) => setNewCat({ ...newCat, max_age: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs focus:outline-none text-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Min Weight (kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newCat.min_weight}
                    onChange={(e) => setNewCat({ ...newCat, min_weight: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs focus:outline-none text-foreground"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Max Weight (kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newCat.max_weight}
                    onChange={(e) => setNewCat({ ...newCat, max_weight: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs focus:outline-none text-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Capacity Limits</label>
                  <input
                    type="number"
                    required
                    value={newCat.capacity}
                    onChange={(e) => setNewCat({ ...newCat, capacity: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs focus:outline-none text-foreground"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Tournament Format</label>
                  <select
                    value={newCat.format || 'knockout'}
                    onChange={(e) => setNewCat({ ...newCat, format: e.target.value as any })}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs focus:outline-none text-foreground"
                  >
                    <option value="knockout">Single Elimination</option>
                    <option value="round_robin">Round Robin System</option>
                    <option value="wkf_repechage">WKF Repechage System</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-border flex justify-end gap-2 bg-secondary/5">
              <button type="button" onClick={() => setIsAddOpen(false)} className="px-3 py-1.5 border border-border text-muted-foreground hover:text-foreground rounded-lg text-xs font-semibold cursor-pointer">
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-lg cursor-pointer"
              >
                Add Category
              </button>
            </div>
          </form>
        </div>
      )}
      {/* E. EDIT CATEGORY DIALOG */}
      {isEditOpen && editCat && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-30 p-4">
          <form onSubmit={handleEditSubmit} className="bg-card w-full max-w-md rounded-xl shadow-xl border border-border overflow-hidden animate-scale-in text-foreground">
            <div className="p-5 border-b border-border bg-secondary/10 flex justify-between items-center">
              <span className="font-bold text-sm">Edit Category</span>
              <button type="button" onClick={() => { setIsEditOpen(false); setEditCat(null); }} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
            
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Category Name</label>
                <input
                  type="text"
                  required
                  value={editCat.name}
                  onChange={(e) => setEditCat({ ...editCat, name: e.target.value })}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Gender Focus</label>
                  <select
                    value={editCat.gender}
                    onChange={(e) => setEditCat({ ...editCat, gender: e.target.value as any })}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs focus:outline-none text-foreground"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Mixed">Mixed</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Status</label>
                  <select
                    value={editCat.status}
                    onChange={(e) => setEditCat({ ...editCat, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs focus:outline-none text-foreground"
                  >
                    <option value="Open">Open</option>
                    <option value="Closed">Closed</option>
                    <option value="Full">Full</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Min Age (Years)</label>
                  <input
                    type="number"
                    required
                    value={editCat.min_age}
                    onChange={(e) => setEditCat({ ...editCat, min_age: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs focus:outline-none text-foreground"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Max Age (Years)</label>
                  <input
                    type="number"
                    required
                    value={editCat.max_age}
                    onChange={(e) => setEditCat({ ...editCat, max_age: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs focus:outline-none text-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Min Weight (kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editCat.min_weight}
                    onChange={(e) => setEditCat({ ...editCat, min_weight: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs focus:outline-none text-foreground"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Max Weight (kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editCat.max_weight}
                    onChange={(e) => setEditCat({ ...editCat, max_weight: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs focus:outline-none text-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Capacity Limits</label>
                  <input
                    type="number"
                    required
                    value={editCat.capacity}
                    onChange={(e) => setEditCat({ ...editCat, capacity: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs focus:outline-none text-foreground"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Tournament Format</label>
                  <select
                    value={editCat.format || 'knockout'}
                    onChange={(e) => setEditCat({ ...editCat, format: e.target.value as any })}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs focus:outline-none text-foreground"
                  >
                    <option value="knockout">Single Elimination</option>
                    <option value="round_robin">Round Robin System</option>
                    <option value="wkf_repechage">WKF Repechage System</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-border flex justify-end gap-2 bg-secondary/5">
              <button type="button" onClick={() => { setIsEditOpen(false); setEditCat(null); }} className="px-3 py-1.5 border border-border text-muted-foreground hover:text-foreground rounded-lg text-xs font-semibold cursor-pointer">
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-lg cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Import CSV Modal */}
      <ImportCategoryModal 
        isOpen={isImportOpen} 
        onClose={() => setIsImportOpen(false)} 
      />

      {/* ADD PARTICIPANTS TO CATEGORY MODAL */}
      {selectedCatForAdd && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-card border border-border rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-border bg-secondary/15 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-foreground uppercase tracking-wider">
                    Add Participants to Category
                  </h3>
                  <p className="text-xs text-primary font-bold">
                    {selectedCatForAdd.name} ({selectedCatForAdd.gender} • {selectedCatForAdd.min_age}-{selectedCatForAdd.max_age} yrs • {selectedCatForAdd.min_weight}-{selectedCatForAdd.max_weight} kg)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCatForAdd(null)}
                className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Auto-selection Notice & Filter Bar */}
            <div className="px-5 pt-4 pb-2 space-y-3">
              <div className="p-3 bg-primary/10 border border-primary/30 rounded-xl flex items-start gap-2.5 text-xs">
                <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold text-foreground block">
                    System pre-selected {autoMatchCount} matching participant(s)
                  </span>
                  <span className="text-muted-foreground text-[11px] block">
                    Participants matching Age ({selectedCatForAdd.min_age}-{selectedCatForAdd.max_age}), Gender ({selectedCatForAdd.gender}), and Weight criteria were automatically checked below. You may manually check or uncheck any participants before saving.
                  </span>
                </div>
              </div>

              {/* Search input & Select All / Deselect All controls */}
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search by participant name, club, or reg no..."
                    value={participantModalSearch}
                    onChange={(e) => setParticipantModalSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-secondary border border-border rounded-lg text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="flex items-center gap-2 text-xs shrink-0">
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-muted-foreground hover:text-foreground">
                    <input
                      type="checkbox"
                      checked={showOnlyEligible}
                      onChange={(e) => setShowOnlyEligible(e.target.checked)}
                      className="h-3.5 w-3.5 rounded text-primary focus:ring-primary"
                    />
                    <span>
                      Show Only Matching Athletes (
                      {getGenderNorm(selectedCatForAdd.gender, selectedCatForAdd.name) === 'Female'
                        ? 'Female / Age & Weight'
                        : getGenderNorm(selectedCatForAdd.gender, selectedCatForAdd.name) === 'Male'
                          ? 'Male / Age & Weight'
                          : 'Age & Weight'}
                      )
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedCatForAdd) {
                        setSelectedParticipantIds(getMatchingParticipantIds(selectedCatForAdd));
                      }
                    }}
                    className="px-2.5 py-1 bg-secondary hover:bg-secondary/80 border border-border text-foreground font-bold rounded-md cursor-pointer text-[10px]"
                    title="Select only system pre-selected matching participants"
                  >
                    Select All Matching ({autoMatchCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedParticipantIds([])}
                    className="px-2.5 py-1 bg-secondary hover:bg-secondary/80 border border-border text-muted-foreground font-bold rounded-md cursor-pointer text-[10px]"
                  >
                    Deselect All
                  </button>
                </div>
              </div>
            </div>

            {/* Scrollable Participants Roster */}
            <div className="flex-1 overflow-y-auto px-5 py-2 divide-y divide-border/50">
              {participants
                .filter(p => {
                  const age = calculateAge(p.dob);
                  const pGenderNorm = getGenderNorm(p.gender);
                  const cGenderNorm = (selectedCatForAdd.gender as any) === 'Mixed' ? 'Mixed' : getGenderNorm(selectedCatForAdd.gender, selectedCatForAdd.name);
                  const genderMatches = cGenderNorm === 'Mixed' || cGenderNorm === pGenderNorm;
                  const ageMatches = age >= selectedCatForAdd.min_age && age <= selectedCatForAdd.max_age;
                  const isKataOrOpenWeight = (selectedCatForAdd.min_weight === 0 && (selectedCatForAdd.max_weight === 0 || selectedCatForAdd.max_weight >= 100)) || selectedCatForAdd.name.toLowerCase().includes('kata');
                  const weightMatches = isKataOrOpenWeight || (p.weight >= selectedCatForAdd.min_weight && p.weight <= selectedCatForAdd.max_weight);
                  const isCriteriaMatched = genderMatches && ageMatches && weightMatches;

                  if (showOnlyEligible && !isCriteriaMatched) {
                    return false;
                  }

                  if (!participantModalSearch.trim()) return true;
                  const q = participantModalSearch.toLowerCase();
                  const clubName = clubs.find(c => c.id === p.club_id)?.name || '';
                  return p.full_name.toLowerCase().includes(q) || (p.registration_no || '').toLowerCase().includes(q) || clubName.toLowerCase().includes(q);
                })
                .map(p => {
                  const age = calculateAge(p.dob);
                  const club = clubs.find(c => c.id === p.club_id);
                  const isSelected = selectedParticipantIds.includes(p.id);

                  // Check eligibility
                  const pGenderNorm = getGenderNorm(p.gender);
                  const cGenderNorm = (selectedCatForAdd.gender as any) === 'Mixed' ? 'Mixed' : getGenderNorm(selectedCatForAdd.gender, selectedCatForAdd.name);
                  const genderMatches = cGenderNorm === 'Mixed' || cGenderNorm === pGenderNorm;
                  const ageMatches = age >= selectedCatForAdd.min_age && age <= selectedCatForAdd.max_age;
                  const isKataOrOpenWeight = (selectedCatForAdd.min_weight === 0 && (selectedCatForAdd.max_weight === 0 || selectedCatForAdd.max_weight >= 100)) || selectedCatForAdd.name.toLowerCase().includes('kata');
                  const weightMatches = isKataOrOpenWeight || (p.weight >= selectedCatForAdd.min_weight && p.weight <= selectedCatForAdd.max_weight);
                  const isCriteriaMatched = genderMatches && ageMatches && weightMatches;

                  // Current category
                  const currentMapping = mappings.find(m => m.participant_id === p.id);
                  const currentCat = currentMapping ? categories.find(c => c.id === currentMapping.category_id) : null;

                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedParticipantIds(selectedParticipantIds.filter(id => id !== p.id));
                        } else {
                          setSelectedParticipantIds([...selectedParticipantIds, p.id]);
                        }
                      }}
                      className={`py-3 px-3 rounded-lg flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                        isSelected ? 'bg-primary/10 border border-primary/30' : 'hover:bg-secondary/40 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="h-4 w-4 rounded text-primary focus:ring-primary cursor-pointer shrink-0"
                        />
                        <div className="truncate space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xs text-foreground truncate">{p.full_name}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">({p.registration_no})</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-2 flex-wrap">
                            <span>Club: {club?.name || 'Independent'}</span>
                            <span>•</span>
                            <span>{p.gender}</span>
                            <span>•</span>
                            <span>{age} yrs</span>
                            <span>•</span>
                            <span>{p.weight} kg</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isCriteriaMatched ? (
                          <span className="px-2 py-0.5 text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-md">
                            Matches Criteria
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[9px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-md">
                            Criteria Mismatch
                          </span>
                        )}
                        {currentCat && (
                          <span className="px-2 py-0.5 text-[9px] font-bold bg-secondary text-muted-foreground border border-border rounded-md truncate max-w-[110px]" title={currentCat.name}>
                            Current: {currentCat.name}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Modal Footer & Confirmation / Done Trigger */}
            <div className="p-4 border-t border-border bg-secondary/15 flex items-center justify-between gap-3">
              <div className="text-xs font-bold text-foreground">
                Selected: <span className="text-primary font-black">{selectedParticipantIds.length}</span> participant(s)
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCatForAdd(null);
                    setSelectedParticipantIds([]);
                    loadData();
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-extrabold shadow-sm cursor-pointer flex items-center gap-1.5 transition-colors"
                  title="Close modal and return to Category Management"
                >
                  <Check className="h-4 w-4" />
                  <span>Done</span>
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAddParticipants}
                  disabled={selectedParticipantIds.length === 0}
                  className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/95 rounded-lg text-xs font-bold shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Assign Selected Participants</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ─── Manage Participants Modal (Add / Delete / Modify) ─── */}
      {manageCat && (() => {
        const manageMappings = mappings.filter(m => m.category_id === manageCat.id);
        const enrolledParticipants = manageMappings
          .map(m => participants.find(p => p.id === m.participant_id))
          .filter(Boolean) as Participant[];

        const getClubName = (p: Participant) =>
          clubs.find(c => c.id === p.club_id)?.name || '—';

        const filtered = enrolledParticipants.filter(p =>
          !manageSearch.trim() ||
          p.full_name.toLowerCase().includes(manageSearch.toLowerCase()) ||
          (p.registration_no || '').toLowerCase().includes(manageSearch.toLowerCase()) ||
          getClubName(p).toLowerCase().includes(manageSearch.toLowerCase())
        );

        // Selection state for bulk remove
        const toggleManageSelect = (id: string) =>
          setManageSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

        const handleRemoveFromCategory = async (participantId: string) => {
          if (!confirm('Remove this participant from the category?')) return;
          try {
            await db.participants.removeCategoryMapping(participantId, manageCat.id);
            await loadData();
          } catch (e: any) {
            alert(e.message || 'Failed to remove participant.');
          }
        };

        const handleBulkRemove = async () => {
          if (manageSelected.length === 0) return;
          if (!confirm(`Remove ${manageSelected.length} selected participant(s) from this category?`)) return;
          try {
            for (const pId of manageSelected) {
              await db.participants.removeCategoryMapping(pId, manageCat.id);
            }
            setManageSelected([]);
            await loadData();
          } catch (e: any) {
            alert(e.message || 'Failed to remove participants.');
          }
        };

        const handleSaveEdit = async () => {
          if (!editingParticipant) return;
          try {
            await db.participants.update(editingParticipant.id, editParticipantForm);
            setEditingParticipant(null);
            setEditParticipantForm({});
            await loadData();
          } catch (e: any) {
            alert(e.message || 'Failed to update participant.');
          }
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-card border border-border rounded-2xl shadow-2xl flex flex-col w-full max-w-2xl max-h-[90vh] overflow-hidden">

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-secondary/20">
                <div>
                  <h2 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                    <Settings2 className="h-4 w-4 text-primary" />
                    Manage Participants
                  </h2>
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate max-w-sm" title={manageCat.name}>
                    {manageCat.name} · {enrolledParticipants.length} enrolled
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenAddParticipantsModal(manageCat)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 cursor-pointer transition"
                    title="Add more participants to this category"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Add Participants
                  </button>
                  <button
                    type="button"
                    onClick={() => { setManageCat(null); setManageSelected([]); setEditingParticipant(null); setEditParticipantForm({}); }}
                    className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Search + Select All / Deselect All */}
              <div className="px-5 pt-3 pb-2 space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search by name, reg no, or club..."
                    value={manageSearch}
                    onChange={e => setManageSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-secondary border border-border rounded-lg text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                {filtered.length > 0 && canModify && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setManageSelected(filtered.map(p => p.id))}
                      className="px-2.5 py-1 bg-secondary hover:bg-secondary/80 border border-border text-foreground font-bold rounded-md cursor-pointer text-[10px]"
                    >
                      Select All ({filtered.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setManageSelected([])}
                      className="px-2.5 py-1 bg-secondary hover:bg-secondary/80 border border-border text-muted-foreground font-bold rounded-md cursor-pointer text-[10px]"
                    >
                      Deselect All
                    </button>
                    {manageSelected.length > 0 && (
                      <button
                        type="button"
                        onClick={handleBulkRemove}
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-800 font-bold rounded-md cursor-pointer text-[10px] transition"
                      >
                        <Trash2 className="h-3 w-3" />
                        Remove Selected ({manageSelected.length})
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Participant List */}
              <div className="flex-1 overflow-y-auto px-5 pb-3 space-y-2">
                {filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <Users className="h-8 w-8 mb-2 opacity-30" />
                    <span className="text-xs font-bold">No participants enrolled in this category yet.</span>
                    <button
                      type="button"
                      onClick={() => handleOpenAddParticipantsModal(manageCat)}
                      className="mt-3 flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-primary text-primary-foreground cursor-pointer hover:bg-primary/90"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      Add Participants
                    </button>
                  </div>
                ) : (
                  filtered.map(p => {
                    const isEditing = editingParticipant?.id === p.id;
                    const age = calculateAge(p.dob);
                    const isSelected = manageSelected.includes(p.id);
                    const clubName = getClubName(p);
                    return (
                      <div key={p.id} className={`rounded-xl border transition-all ${isEditing ? 'border-primary bg-primary/5' : isSelected ? 'border-red-400 bg-red-500/5' : 'border-border bg-card'}`}>
                        {isEditing ? (
                          /* Edit Form */
                          <div className="p-3 space-y-2">
                            <div className="flex items-center gap-2 mb-1">
                              <Edit2 className="h-3.5 w-3.5 text-primary" />
                              <span className="text-xs font-extrabold text-primary">Editing: {p.full_name}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Full Name</label>
                                <input
                                  type="text"
                                  value={editParticipantForm.full_name ?? p.full_name}
                                  onChange={e => setEditParticipantForm(prev => ({ ...prev, full_name: e.target.value }))}
                                  className="w-full mt-0.5 px-2 py-1 bg-secondary border border-border rounded-md text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Weight (kg)</label>
                                <input
                                  type="number"
                                  step="0.1"
                                  value={editParticipantForm.weight ?? p.weight}
                                  onChange={e => setEditParticipantForm(prev => ({ ...prev, weight: parseFloat(e.target.value) || 0 }))}
                                  className="w-full mt-0.5 px-2 py-1 bg-secondary border border-border rounded-md text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Gender</label>
                                <select
                                  value={editParticipantForm.gender ?? p.gender}
                                  onChange={e => setEditParticipantForm(prev => ({ ...prev, gender: e.target.value as any }))}
                                  className="w-full mt-0.5 px-2 py-1 bg-secondary border border-border rounded-md text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                                >
                                  <option value="Male">Male</option>
                                  <option value="Female">Female</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Registration No</label>
                                <input
                                  type="text"
                                  value={editParticipantForm.registration_no ?? p.registration_no}
                                  onChange={e => setEditParticipantForm(prev => ({ ...prev, registration_no: e.target.value }))}
                                  className="w-full mt-0.5 px-2 py-1 bg-secondary border border-border rounded-md text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                              </div>
                            </div>
                            <div className="flex items-center gap-2 pt-1">
                              <button
                                type="button"
                                onClick={handleSaveEdit}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-extrabold cursor-pointer transition"
                              >
                                <Save className="h-3.5 w-3.5" />
                                Save Changes
                              </button>
                              <button
                                type="button"
                                onClick={() => { setEditingParticipant(null); setEditParticipantForm({}); }}
                                className="px-3 py-1.5 bg-secondary hover:bg-secondary/80 border border-border rounded-lg text-[11px] font-bold text-muted-foreground cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* View Row */
                          <div className="flex items-center justify-between px-3 py-2.5 gap-2">
                            {canModify && (
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleManageSelect(p.id)}
                                className="h-3.5 w-3.5 rounded text-red-500 focus:ring-red-500 shrink-0 cursor-pointer"
                                title="Select for bulk remove"
                              />
                            )}
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <span className="text-[10px] font-extrabold text-primary">{p.full_name.charAt(0)}</span>
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-foreground truncate">{p.full_name}</div>
                                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                  <span className="text-[10px] text-muted-foreground">{clubName}</span>
                                  <span className="text-[9px] text-muted-foreground/60">•</span>
                                  <span className="text-[10px] font-semibold text-foreground">{p.weight} kg</span>
                                  <span className="text-[9px] text-muted-foreground/60">•</span>
                                  <span className="text-[10px] text-muted-foreground">Age {age}</span>
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${p.gender === 'Female' ? 'bg-pink-500/10 text-pink-600 dark:text-pink-400' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'}`}>
                                    {p.gender}
                                  </span>
                                </div>
                              </div>
                            </div>
                            {canModify && (
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingParticipant(p);
                                    setEditParticipantForm({});
                                  }}
                                  className="p-1.5 rounded-lg bg-secondary hover:bg-amber-500/10 hover:text-amber-500 text-muted-foreground border border-border cursor-pointer transition"
                                  title="Modify this participant's details"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFromCategory(p.id)}
                                  className="p-1.5 rounded-lg bg-secondary hover:bg-red-500/10 hover:text-red-500 text-muted-foreground border border-border cursor-pointer transition"
                                  title="Remove this participant from category"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-border bg-secondary/15 flex items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground font-semibold">{enrolledParticipants.length} participant(s) enrolled{manageSelected.length > 0 ? ` · ${manageSelected.length} selected` : ''}</span>
                <button
                  type="button"
                  onClick={() => { setManageCat(null); setManageSelected([]); setEditingParticipant(null); setEditParticipantForm({}); loadData(); }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-extrabold shadow-sm cursor-pointer transition"
                >
                  <Check className="h-4 w-4" />
                  Done
                </button>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
}
