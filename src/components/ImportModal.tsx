'use client';

import React, { useState } from 'react';
import { useTournament } from '@/context/TournamentContext';
import { db, basePath } from '@/db/dbClient';
import { Upload, X, Check, RefreshCw, AlertCircle, FileText, ArrowRight } from 'lucide-react';
import {
  parseCSVText,
  mapParticipantHeaderRow,
  parseParticipantDataRow,
  ParsedParticipantRow,
} from '@/utils/participantCsv';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ParsedRow {
  full_name: string;
  gender: 'Male' | 'Female';
  dob: string;
  weight: number;
  height: number;
  passport_ic: string;
  club_name: string;
  email?: string;
  phone?: string;
  payment_status: 'Paid' | 'Unpaid' | 'Pending';
  medical_status: 'Cleared' | 'Review Needed';
  isKumite?: boolean;
  isKata?: boolean;
  age?: number;
}

export default function ImportModal({ isOpen, onClose }: ImportModalProps) {
  const { triggerRefresh } = useTournament();
  const [dragActive, setDragActive] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [previewRows, setPreviewRows] = useState<ParsedRow[]>([]);
  const [importReport, setImportReport] = useState<{
    importedIds: string[];
    duplicates: string[];
    errors: string[];
  } | null>(null);

  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Upload, 2: Preview & Map, 3: Success Report
  const [isProcessing, setIsProcessing] = useState(false);

  // Exact database round-trip mode (activated when the CSV header includes an "id" column,
  // i.e. a file produced by "Export CSV"). Existing IDs are updated in place; new IDs are inserted.
  const [exactMode, setExactMode] = useState(false);
  const [exactPreviewRows, setExactPreviewRows] = useState<ParsedParticipantRow[]>([]);
  const [headerError, setHeaderError] = useState('');
  const [exactReport, setExactReport] = useState<{ createdCount: number; updatedCount: number; errors: string[] } | null>(null);

  if (!isOpen) return null;

  // Raw mock CSV sample to seed pasting - Tab-separated to match user's custom template
  const sampleCSV = "First Name\tLast Name\tGender\tDOB\tAge\tWeight / kg\tSize / cm\tPassport/IC\tClub\tEMail\tPhone\tPayment\tMedical\tKumite\tKata\n" +
    "Aainesh\tAainesh\tm\t2012-05-01\t12\t46\t0\t\tSenshi Goju-Ryu\t\t60121523691\tPaid\tCleared\tYes\tNo\n" +
    "AKILESH\tVAMATHEVAN\tm\t2008-09-06\t16\t86\t0\t\tSenshi Goju-Ryu\t\t6011-3334445\tPaid\tCleared\tYes\tYes\n" +
    "AKILESH ALAGAN\tVAMATHEVAN\tm\t2008-09-06\t16\t86\t0\t80906101709\tSenshi Goju-Ryu\t\t6018-7776655\tPaid\tCleared\tNo\tYes";

  const downloadCSVTemplate = () => {
    const link = document.createElement("a");
    link.setAttribute("href", `${basePath}/senshi_karate_registration_template.csv`);
    link.setAttribute("download", "senshi_karate_registration_template.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          parseCSV(event.target.result as string);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          parseCSV(event.target.result as string);
        }
      };
      reader.readAsText(file);
    }
  };

  const handlePasteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCsvContent(e.target.value);
  };

  const handlePasteParse = () => {
    if (!csvContent.trim()) return;
    parseCSV(csvContent);
  };

  // Helper: normalize a name segment - replace underscores with spaces, trim
  const normalizeName = (name: string): string => {
    return name.replace(/_/g, ' ').trim();
  };

  // Helper: build full_name from first and last in Malaysian format
  // If firstName == lastName (same word), just use one
  // Last Name may have bracket suffix like [1], [2] for siblings - strip for display, keep for disambiguation
  const buildFullName = (rawFirst: string, rawLast: string): string => {
    const firstName = normalizeName(rawFirst);
    const lastName = normalizeName(rawLast);
    // Strip bracket suffixes [1], [2] etc. from display
    const lastNameDisplay = lastName.replace(/\s*\[\d+\]$/, '');
    if (!firstName && !lastName) return 'Unknown';
    if (!lastName || firstName.toLowerCase() === lastNameDisplay.toLowerCase()) return firstName || lastName;
    return `${firstName} ${lastNameDisplay}`.trim();
  };

  const splitCSVLine = (line: string, separator: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === separator && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current);
    return result;
  };

  const parseCSV = async (text: string) => {
    setHeaderError('');

    // Detect a full database export (has an "id" column) vs. the legacy club-registration template
    const allRows = parseCSVText(text);
    if (allRows.length > 0) {
      const { fieldToIndex, missingRequired, hasIdColumn } = mapParticipantHeaderRow(allRows[0]);
      if (hasIdColumn) {
        if (missingRequired.length > 0) {
          setHeaderError(`Import Error: Required participant field missing (${missingRequired.join(', ')})`);
          return;
        }
        const dataRows = allRows.slice(1);
        if (dataRows.length === 0) {
          alert('No participant data rows found below the header.');
          return;
        }
        const existingParticipants = await db.participants.list();
        const existingIds = new Set(existingParticipants.map(p => p.id));
        const seenIdsInFile = new Set<string>();
        const parsed = dataRows.map((cols, i) => parseParticipantDataRow(cols, fieldToIndex, i + 1, existingIds, seenIdsInFile));
        setExactMode(true);
        setExactPreviewRows(parsed);
        setStep(2);
        return;
      }
    }
    setExactMode(false);

    try {
      const lines = text.split('\n');
      const rows: ParsedRow[] = [];
      
      const parseBoolean = (val?: string) => {
        if (!val) return false;
        const lower = val.trim().toLowerCase();
        return lower === 'yes' || lower === 'y' || lower === 'true' || lower === '1';
      };
      
      const headerLine = lines[0] ? lines[0].toLowerCase() : '';
      const hasAgeCol = headerLine.includes('age');

      // Skip header line
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Support tab-separated and comma-separated layouts
        const separator = line.includes('\t') ? '\t' : ',';
        const cols = splitCSVLine(line, separator);
        if (cols.length < 7) continue;

        let fullName = '';
        let gender: 'Male' | 'Female' = 'Male';
        let dob = '2005-01-01';
        let age: number | undefined = undefined;
        let weight = 0;
        let height = 0;
        let passport_ic = '';
        let club_name = 'Senshi Goju-Ryu';
        let email = '';
        let phone = '';
        let payment_status: 'Paid' | 'Unpaid' | 'Pending' = 'Unpaid';
        let medical_status: 'Cleared' | 'Review Needed' = 'Cleared';
        let isKumite = false;
        let isKata = false;

        if (cols.length >= 12) {
          // 12+ columns: First Name, Last Name, Gender, DOB, [Age], Weight / kg, Size / cm, Passport/IC, Club, EMail, Phone, Payment, Medical, (Kumite), (Kata)
          fullName = buildFullName(cols[0]?.trim() || '', cols[1]?.trim() || '');
          const rawGen = cols[2]?.trim().toLowerCase();
          gender = (rawGen === 'f' || rawGen === 'female') ? 'Female' : 'Male';
          dob = cols[3]?.trim() || '2005-01-01';
          
          let offset = 0;
          if (hasAgeCol) {
            age = parseInt(cols[4]?.trim() || '0', 10);
            offset = 1;
          }

          weight = parseFloat(cols[4 + offset]?.trim()) || 0;
          height = parseFloat(cols[5 + offset]?.trim()) || 0;
          passport_ic = cols[6 + offset]?.trim() || '';
          club_name = cols[7 + offset]?.trim() || 'Senshi Goju-Ryu';
          email = cols[8 + offset]?.trim() || '';
          phone = cols[9 + offset]?.trim() || '';
          
          const payStr = cols[10 + offset]?.trim().toLowerCase();
          payment_status = payStr === 'paid' ? 'Paid' : payStr === 'pending' ? 'Pending' : 'Unpaid';
          
          const medStr = cols[11 + offset]?.trim().toLowerCase();
          medical_status = medStr === 'cleared' ? 'Cleared' : 'Review Needed';

          if (cols.length >= 14 + offset) {
            isKumite = parseBoolean(cols[12 + offset]);
            isKata = parseBoolean(cols[13 + offset]);
          }
        } else {
          // Comma layout or standard (11+ columns: Full Name, Gender, DOB, Weight, Height, Passport/IC, Club, Email, Phone, Payment, Medical, (Kumite), (Kata))
          fullName = normalizeName(cols[0]?.trim() || '');
          const rawGen = cols[1]?.trim().toLowerCase();
          gender = (rawGen === 'f' || rawGen === 'female') ? 'Female' : 'Male';
          dob = cols[2]?.trim() || '2005-01-01';
          weight = parseFloat(cols[3]?.trim()) || 0;
          height = parseFloat(cols[4]?.trim()) || 0;
          passport_ic = cols[5]?.trim() || '';
          club_name = cols[6]?.trim() || 'Senshi Goju-Ryu';
          email = cols[7]?.trim() || '';
          phone = cols[8]?.trim() || '';
          
          const payStr = cols[9]?.trim().toLowerCase();
          payment_status = payStr === 'paid' ? 'Paid' : payStr === 'pending' ? 'Pending' : 'Unpaid';
          
          const medStr = cols[10]?.trim().toLowerCase();
          medical_status = medStr === 'cleared' ? 'Cleared' : 'Review Needed';

          if (cols.length >= 13) {
            isKumite = parseBoolean(cols[11]);
            isKata = parseBoolean(cols[12]);
          }
        }

        if (!fullName) continue;

        rows.push({
          full_name: fullName,
          gender,
          dob,
          age,
          weight,
          height,
          passport_ic,
          club_name,
          email,
          phone,
          payment_status,
          medical_status,
          isKumite,
          isKata
        });
      }

      if (rows.length === 0) {
        alert("No valid rows parsed from CSV. Make sure you match the format.");
        return;
      }

      setPreviewRows(rows);
      setStep(2);
    } catch (e: any) {
      alert("Error parsing CSV: " + e.message);
    }
  };

  const invalidExactRows = exactPreviewRows.filter(r => r.errors.length > 0);
  const validExactRows = exactPreviewRows.filter(r => r.errors.length === 0);
  const newExactRows = validExactRows.filter(r => !r.isExistingId);
  const updateExactRows = validExactRows.filter(r => r.isExistingId);

  const handleExactImport = async () => {
    if (invalidExactRows.length > 0) return; // Validate everything first — block save while errors exist
    setIsProcessing(true);
    let createdCount = 0;
    let updatedCount = 0;
    const errors: string[] = [];

    try {
      for (const row of validExactRows) {
        const payload = {
          registration_no: row.registration_no,
          full_name: row.full_name,
          gender: row.gender,
          dob: row.dob,
          age: row.age,
          nationality_code: row.nationality_code,
          passport_ic: row.passport_ic,
          email: row.email,
          phone: row.phone,
          emergency_contact_name: row.emergency_contact_name,
          emergency_contact_phone: row.emergency_contact_phone,
          club_id: row.club_id,
          coach_id: row.coach_id,
          weight: row.weight,
          height: row.height,
          status: row.status,
          medical_status: row.medical_status,
          payment_status: row.payment_status,
          isKumite: row.isKumite,
          isKata: row.isKata,
          remarks: row.remarks,
        };

        try {
          let participantId = row.id;
          if (row.isExistingId && row.id) {
            // Same Participant ID -> update the existing database record in place
            await db.participants.update(row.id, payload);
            updatedCount++;
          } else {
            // No matching existing ID -> insert as new, preserving any supplied ID/registration_no
            const created = await db.participants.add(row.id ? { ...payload, id: row.id } : payload);
            participantId = created.id;
            createdCount++;
          }

          // Reassign category reference if supplied (single mapping, same limit as manual reassignment elsewhere)
          const targetCategoryId = row.kumite_category_id || row.kata_category_id;
          if (targetCategoryId && participantId) {
            await db.participants.assignCategoryManually(participantId, targetCategoryId, 'CSV Import');
          }
        } catch (err: any) {
          errors.push(`Row ${row.row} (${row.id || row.full_name}): ${err.message}`);
        }
      }

      setExactReport({ createdCount, updatedCount, errors });
      setStep(3);
      triggerRefresh();
    } catch (err: any) {
      alert('Import process failed: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (exactMode) return handleExactImport();
    setIsProcessing(true);
    const importedIds: string[] = [];
    const duplicates: string[] = [];
    const errors: string[] = [];

    try {
      const activeParticipants = await db.participants.list();
      const clubs = await db.clubs.list();

      for (const row of previewRows) {
        // 1. Duplicate Detection
        // Only match IC when both sides are non-empty (empty IC must not cross-match)
        const icMatch = row.passport_ic
          ? activeParticipants.some(p => p.passport_ic && p.passport_ic.toLowerCase() === row.passport_ic.toLowerCase())
          : false;
        // Only match name as duplicate when there is also an IC match or name is truly identical
        const nameMatch = activeParticipants.some(p =>
          p.full_name.toLowerCase() === row.full_name.toLowerCase() &&
          (!row.passport_ic || p.passport_ic.toLowerCase() === row.passport_ic.toLowerCase())
        );
        const isDuplicate = icMatch || nameMatch;

        if (isDuplicate) {
          duplicates.push(row.full_name);
          continue;
        }

        // 2. Find or create club id
        let clubId = clubs.find(c => c.name.toLowerCase() === row.club_name.toLowerCase())?.id;
        if (!clubId) {
          const newClub = await db.clubs.add({ name: row.club_name, city: 'Unknown' });
          clubId = newClub.id;
        }

        // 3. Create Participant
        const newPart = await db.participants.add({
          full_name: row.full_name,
          gender: row.gender,
          dob: row.dob,
          age: row.age,
          weight: row.weight,
          height: row.height,
          passport_ic: row.passport_ic || '',
          club_id: clubId,
          email: row.email,
          phone: row.phone,
          status: 'Pending',
          payment_status: row.payment_status,
          medical_status: row.medical_status === 'Cleared' ? 'Cleared' : 'Review Needed',
          isKumite: row.isKumite,
          isKata: row.isKata,
          remarks: row.passport_ic ? 'CSV Imported' : 'CSV Imported — IC/Passport pending update'
        });
        
        importedIds.push(newPart.id);
      }

      setImportReport({
        importedIds,
        duplicates,
        errors
      });
      setStep(3);
      triggerRefresh();
    } catch (e: any) {
      alert(`Import failed: ${e.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRollback = async () => {
    if (!importReport || importReport.importedIds.length === 0) return;
    if (confirm(`Rollback will delete the ${importReport.importedIds.length} participant(s) imported in this batch. Proceed?`)) {
      setIsProcessing(true);
      try {
        for (const id of importReport.importedIds) {
          // Hard delete from storage by editing raw array
          // Since our db client wraps mockStore, we can just delete soft-delete or clear them
          await db.participants.delete(id, 'System Rollback');
        }
        alert("Rollback completed successfully.");
        onClose();
        triggerRefresh();
      } catch (e: any) {
        alert("Rollback failed: " + e.message);
      } finally {
        setIsProcessing(false);
        setImportReport(null);
        setStep(1);
        setPreviewRows([]);
      }
    }
  };

  const handleReset = () => {
    setCsvContent('');
    setPreviewRows([]);
    setImportReport(null);
    setStep(1);
    setExactMode(false);
    setExactPreviewRows([]);
    setExactReport(null);
    setHeaderError('');
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 text-foreground">
      <div className="bg-card w-full max-w-3xl rounded-xl shadow-xl overflow-hidden flex flex-col h-[600px] border border-border animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-secondary/10">
          <div>
            <h3 className="font-bold text-lg">CSV Participant Import Wizard</h3>
            <p className="text-xs text-muted-foreground">Upload or paste comma-separated data to populate registrations instantly</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 && (
            <div className="space-y-6">
              {headerError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-500 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{headerError}</span>
                </div>
              )}
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30 rounded-xl p-3 text-[11px] text-blue-800 dark:text-blue-300">
                Tip: uploading a CSV exported via "Export CSV" (with an <strong>id</strong> column) updates existing participants in place instead of creating new registrations.
              </div>
              {/* Template Download Panel */}
              <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-0.5 text-left w-full">
                  <span className="font-bold text-xs text-foreground block">Download CSV Import Template</span>
                  <span className="text-[11px] text-muted-foreground block">Get the official spreadsheet layout to prepare your Dojo participant list.</span>
                </div>
                <button
                  type="button"
                  onClick={downloadCSVTemplate}
                  className="px-3.5 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
                >
                  <FileText className="h-4 w-4" />
                  <span>Download Template</span>
                </button>
              </div>

              {/* Drag n Drop area */}
              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
                  dragActive ? 'border-primary bg-secondary/50' : 'border-border hover:border-muted-foreground'
                }`}
              >
                <input 
                  type="file" 
                  id="csv-file-upload" 
                  accept=".csv" 
                  className="hidden" 
                  onChange={handleFileChange}
                />
                <label htmlFor="csv-file-upload" className="w-full h-full cursor-pointer flex flex-col items-center">
                  <Upload className="h-10 w-10 text-muted-foreground mb-4" />
                  <span className="font-semibold text-sm mb-1 block">Drag and drop CSV files here</span>
                  <span className="text-xs text-muted-foreground mb-3">or click to browse from device</span>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground bg-secondary px-2.5 py-1 rounded-md border border-border">
                    CSV Format Only
                  </span>
                </label>
              </div>

              {/* Paste Text Area */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Or Paste CSV Comma-Separated Values</label>
                <textarea
                  placeholder={sampleCSV}
                  value={csvContent}
                  onChange={handlePasteChange}
                  className="w-full h-36 p-3 bg-secondary border border-border rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-muted-foreground/50"
                />
                <div className="flex justify-between items-center">
                  <button 
                    onClick={() => setCsvContent(sampleCSV)}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Insert template columns & sample rows
                  </button>
                  <button
                    onClick={handlePasteParse}
                    disabled={!csvContent.trim()}
                    className="px-4 py-1.5 bg-primary text-primary-foreground disabled:opacity-50 hover:bg-primary/95 text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1 cursor-pointer"
                  >
                    Parse Data <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 2 && exactMode && (
            <div className="space-y-4 h-full flex flex-col">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs shrink-0">
                <div className="p-2.5 bg-muted/40 border border-border rounded-lg text-center">
                  <span className="block text-lg font-black">{exactPreviewRows.length}</span>
                  <span className="text-muted-foreground">Total Rows</span>
                </div>
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-center text-emerald-600 dark:text-emerald-400">
                  <span className="block text-lg font-black">{newExactRows.length}</span>
                  <span>New</span>
                </div>
                <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-center text-blue-600 dark:text-blue-400">
                  <span className="block text-lg font-black">{updateExactRows.length}</span>
                  <span>Updates</span>
                </div>
                <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-center text-red-600 dark:text-red-400">
                  <span className="block text-lg font-black">{invalidExactRows.length}</span>
                  <span>Errors</span>
                </div>
              </div>

              <div className="flex-1 border border-border rounded-lg overflow-hidden flex flex-col bg-card">
                <div className="overflow-x-auto overflow-y-auto max-h-[300px]">
                  <table className="w-full min-w-max text-left border-collapse text-xs">
                    <thead className="bg-secondary/40 sticky top-0 border-b border-border">
                      <tr>
                        <th className="p-3 font-semibold text-muted-foreground whitespace-nowrap">Row</th>
                        <th className="p-3 font-semibold text-muted-foreground whitespace-nowrap">Status</th>
                        <th className="p-3 font-semibold text-muted-foreground whitespace-nowrap">Participant ID</th>
                        <th className="p-3 font-semibold text-muted-foreground whitespace-nowrap">Full Name</th>
                        <th className="p-3 font-semibold text-muted-foreground whitespace-nowrap">Gender</th>
                        <th className="p-3 font-semibold text-muted-foreground whitespace-nowrap">DOB</th>
                        <th className="p-3 font-semibold text-muted-foreground whitespace-nowrap">Weight</th>
                        <th className="p-3 font-semibold text-muted-foreground whitespace-nowrap">Height</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {exactPreviewRows.map((row) => (
                        <tr key={row.row} className={row.errors.length > 0 ? 'bg-red-500/10' : row.isExistingId ? 'bg-blue-500/5' : 'hover:bg-secondary/20'}>
                          <td className="p-3 text-muted-foreground whitespace-nowrap">{row.row}</td>
                          <td className="p-3 whitespace-nowrap">
                            {row.errors.length > 0 ? (
                              <span className="px-2 py-0.5 bg-red-500/20 text-red-500 text-[10px] rounded font-bold">Error</span>
                            ) : row.isExistingId ? (
                              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-500 text-[10px] rounded font-bold">Update</span>
                            ) : (
                              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-500 text-[10px] rounded font-bold">New</span>
                            )}
                          </td>
                          <td className="p-3 font-mono text-[10px] text-muted-foreground whitespace-nowrap">{row.id || '(auto)'}</td>
                          <td className="p-3 font-medium whitespace-nowrap">{row.full_name}</td>
                          <td className="p-3 whitespace-nowrap">{row.gender}</td>
                          <td className="p-3 font-mono whitespace-nowrap">{row.dob}</td>
                          <td className="p-3 font-mono whitespace-nowrap">{row.weight} kg</td>
                          <td className="p-3 font-mono whitespace-nowrap">{row.height} cm</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {invalidExactRows.length > 0 && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-500 max-h-32 overflow-y-auto space-y-1 shrink-0">
                  <span className="font-bold flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" /> Fix these errors before importing:</span>
                  {invalidExactRows.flatMap(r => r.errors).map((err, i) => (
                    <p key={i}>Row {err.row} • ID {err.participantId} • {err.field}: {err.problem}. Suggestion: {err.suggestion}</p>
                  ))}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 shrink-0">
                <button
                  onClick={handleReset}
                  className="px-4 py-2 border border-border text-muted-foreground hover:text-foreground rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancel Import / Back
                </button>
                <button
                  onClick={handleImport}
                  disabled={isProcessing || invalidExactRows.length > 0}
                  title={invalidExactRows.length > 0 ? 'Resolve all errors before importing' : undefined}
                  className="px-5 py-2 bg-primary text-primary-foreground hover:bg-primary/95 rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Importing...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" /> Confirm Import ({newExactRows.length} New / {updateExactRows.length} Updates)
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {step === 2 && !exactMode && (
            <div className="space-y-4 h-full flex flex-col">
              <div className="flex justify-between items-center bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 p-3 rounded-lg text-xs text-amber-800 dark:text-amber-300">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>
                    Parsed <strong>{previewRows.length}</strong> record(s) successfully. Please verify columns before uploading. Duplicate checks will skip matches.
                  </span>
                </div>
              </div>

              {/* Data Preview Table */}
              <div className="flex-1 border border-border rounded-lg overflow-hidden flex flex-col bg-card">
                <div className="overflow-x-auto overflow-y-auto max-h-[300px]">
                  <table className="w-full min-w-max text-left border-collapse text-xs">
                    <thead className="bg-secondary/40 sticky top-0 border-b border-border">
                      <tr>
                        <th className="p-3 font-semibold text-muted-foreground whitespace-nowrap">Full Name</th>
                        <th className="p-3 font-semibold text-muted-foreground whitespace-nowrap">Gender</th>
                        <th className="p-3 font-semibold text-muted-foreground whitespace-nowrap">DOB</th>
                        <th className="p-3 font-semibold text-muted-foreground whitespace-nowrap">Age</th>
                        <th className="p-3 font-semibold text-muted-foreground whitespace-nowrap">Weight</th>
                        <th className="p-3 font-semibold text-muted-foreground whitespace-nowrap">Height</th>
                        <th className="p-3 font-semibold text-muted-foreground whitespace-nowrap">Passport/IC</th>
                        <th className="p-3 font-semibold text-muted-foreground whitespace-nowrap">Club</th>
                        <th className="p-3 font-semibold text-muted-foreground whitespace-nowrap">Payment</th>
                        <th className="p-3 font-semibold text-muted-foreground whitespace-nowrap">Medical</th>
                        <th className="p-3 font-semibold text-muted-foreground whitespace-nowrap">Kumite</th>
                        <th className="p-3 font-semibold text-muted-foreground whitespace-nowrap">Kata</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {previewRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-secondary/20">
                          <td className="p-3 font-medium whitespace-nowrap">{row.full_name}</td>
                          <td className="p-3 whitespace-nowrap">{row.gender}</td>
                          <td className="p-3 font-mono whitespace-nowrap">{row.dob}</td>
                          <td className="p-3 font-mono whitespace-nowrap">{row.age ?? '-'}</td>
                          <td className="p-3 font-mono whitespace-nowrap">{row.weight} kg</td>
                          <td className="p-3 font-mono whitespace-nowrap">{row.height} cm</td>
                          <td className="p-3 font-mono whitespace-nowrap">
                            {row.passport_ic ? row.passport_ic : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">IC Pending</span>
                            )}
                          </td>
                          <td className="p-3 whitespace-nowrap">{row.club_name}</td>
                          <td className="p-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              row.payment_status === 'Paid' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400'
                            }`}>
                              {row.payment_status}
                            </span>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              row.medical_status === 'Cleared' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400'
                            }`}>
                              {row.medical_status}
                            </span>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            {row.isKumite ? <span className="text-emerald-500 font-bold">Y</span> : <span className="text-muted-foreground">N</span>}
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            {row.isKata ? <span className="text-emerald-500 font-bold">Y</span> : <span className="text-muted-foreground">N</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Wizard Nav */}
              <div className="flex justify-end gap-2 pt-2">
                <button 
                  onClick={handleReset} 
                  className="px-4 py-2 border border-border text-muted-foreground hover:text-foreground rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={handleImport}
                  disabled={isProcessing}
                  className="px-5 py-2 bg-primary text-primary-foreground hover:bg-primary/95 rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Importing...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" /> Run Import Wizard
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {step === 3 && exactMode && exactReport && (
            <div className="space-y-6">
              <div className="flex flex-col items-center justify-center text-center p-8 bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 rounded-xl">
                <div className="h-12 w-12 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-4">
                  <Check className="h-6 w-6" />
                </div>
                <h4 className="font-bold text-base text-foreground mb-1">Import Completed</h4>
                <p className="text-xs text-muted-foreground max-w-md">
                  Participant IDs were preserved for updated records; no existing registrations were duplicated or deleted.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-secondary/40 border border-border p-4 rounded-xl">
                  <span className="text-xs text-muted-foreground block">New Participants Added</span>
                  <span className="text-2xl font-bold text-foreground block mt-1">{exactReport.createdCount}</span>
                </div>
                <div className="bg-secondary/40 border border-border p-4 rounded-xl">
                  <span className="text-xs text-muted-foreground block">Existing Participants Updated</span>
                  <span className="text-2xl font-bold text-foreground block mt-1">{exactReport.updatedCount}</span>
                </div>
              </div>

              {exactReport.errors.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl space-y-1 text-xs text-red-500">
                  <span className="font-semibold uppercase tracking-wider block">Errors</span>
                  {exactReport.errors.map((err, idx) => <p key={idx}>{err}</p>)}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <button
                  onClick={handleReset}
                  className="px-4 py-2 border border-border text-muted-foreground hover:text-foreground rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Import More
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2 bg-primary text-primary-foreground hover:bg-primary/95 rounded-lg text-xs font-bold shadow-sm cursor-pointer"
                >
                  Done & Close
                </button>
              </div>
            </div>
          )}

          {step === 3 && !exactMode && importReport && (
            <div className="space-y-6">
              {/* Completed Panel */}
              <div className="flex flex-col items-center justify-center text-center p-8 bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 rounded-xl">
                <div className="h-12 w-12 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-4">
                  <Check className="h-6 w-6" />
                </div>
                <h4 className="font-bold text-base text-foreground mb-1">Import Completed Successfully</h4>
                <p className="text-xs text-muted-foreground max-w-md">
                  We scanned and matched the data structure. Standard categories were automatically calculated and mapped for each imported entry.
                </p>
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-secondary/40 border border-border p-4 rounded-xl">
                  <span className="text-xs text-muted-foreground block">Successfully Imported</span>
                  <span className="text-2xl font-bold text-foreground block mt-1">{importReport.importedIds.length}</span>
                  <span className="text-[10px] text-muted-foreground block mt-1">Registrations added</span>
                </div>
                <div className="bg-secondary/40 border border-border p-4 rounded-xl">
                  <span className="text-xs text-muted-foreground block">Skipped (Duplicates)</span>
                  <span className="text-2xl font-bold text-foreground block mt-1">{importReport.duplicates.length}</span>
                  <span className="text-[10px] text-muted-foreground block mt-1">Matched name or IC</span>
                </div>
                <div className="bg-secondary/40 border border-border p-4 rounded-xl">
                  <span className="text-xs text-muted-foreground block">Failures / Errors</span>
                  <span className="text-2xl font-bold text-foreground block mt-1">{importReport.errors.length}</span>
                  <span className="text-[10px] text-muted-foreground block mt-1">Validation failed</span>
                </div>
              </div>

              {/* Duplicate Details */}
              {importReport.duplicates.length > 0 && (
                <div className="bg-secondary/20 border border-border p-4 rounded-xl space-y-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Skipped Entries</span>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    {importReport.duplicates.map((dup, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                        <span>{dup} (Duplicate registry conflict)</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-4 border-t border-border">
                {importReport.importedIds.length > 0 ? (
                  <button
                    onClick={handleRollback}
                    disabled={isProcessing}
                    className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Rollback This Batch
                  </button>
                ) : (
                  <div></div>
                )}
                <div className="flex gap-2">
                  <button 
                    onClick={handleReset} 
                    className="px-4 py-2 border border-border text-muted-foreground hover:text-foreground rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Import More
                  </button>
                  <button
                    onClick={onClose}
                    className="px-5 py-2 bg-primary text-primary-foreground hover:bg-primary/95 rounded-lg text-xs font-bold shadow-sm cursor-pointer"
                  >
                    Done & Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
