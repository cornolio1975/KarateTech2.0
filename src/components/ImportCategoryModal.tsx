'use client';

import React, { useState } from 'react';
import { useTournament } from '@/context/TournamentContext';
import { db, basePath } from '@/db/dbClient';
import { Upload, X, Check, RefreshCw, AlertCircle, FileText, ArrowRight } from 'lucide-react';
import {
  parseCSVText,
  mapHeaderRowToFields,
  parseCategoryDataRow,
  ParsedCategoryRow,
} from '@/utils/categoryCsv';

interface ImportCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ImportCategoryModal({ isOpen, onClose }: ImportCategoryModalProps) {
  const { triggerRefresh } = useTournament();
  const [dragActive, setDragActive] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [headerError, setHeaderError] = useState<string>('');
  const [previewRows, setPreviewRows] = useState<ParsedCategoryRow[]>([]);
  const [importReport, setImportReport] = useState<{
    createdCount: number;
    updatedCount: number;
    errors: string[];
  } | null>(null);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const downloadCSVTemplate = () => {
    const link = document.createElement("a");
    link.setAttribute("href", `${basePath}/senshi_category_template.csv`);
    link.setAttribute("download", "senshi_category_template.csv");
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
      reader.readAsText(file, 'utf-8');
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
      reader.readAsText(file, 'utf-8');
    }
  };

  const handlePasteParse = () => {
    if (!csvContent.trim()) return;
    parseCSV(csvContent);
  };

  const parseCSV = async (text: string) => {
    setHeaderError('');
    try {
      const existingCategories = await db.categories.list();
      const existingIds = new Set(existingCategories.map(c => c.id));

      const allRows = parseCSVText(text);
      if (allRows.length === 0) {
        alert('No data found in the CSV file.');
        return;
      }

      const { fieldToIndex, missingRequired } = mapHeaderRowToFields(allRows[0]);
      if (missingRequired.length > 0) {
        setHeaderError(`Import Error: Required category field missing (${missingRequired.join(', ')})`);
        return;
      }

      const dataRows = allRows.slice(1);
      if (dataRows.length === 0) {
        alert('No category data rows found below the header.');
        return;
      }

      const seenIdsInFile = new Set<string>();
      const parsed = dataRows.map((cols, i) =>
        parseCategoryDataRow(cols, fieldToIndex, i + 1, existingIds, seenIdsInFile)
      );

      setPreviewRows(parsed);
      setStep(2);
    } catch (e: any) {
      alert("Error parsing CSV: " + e.message);
    }
  };

  const validRows = previewRows.filter(r => r.errors.length === 0);
  const invalidRows = previewRows.filter(r => r.errors.length > 0);
  const newRows = validRows.filter(r => !r.isExistingId);
  const updateRows = validRows.filter(r => r.isExistingId);
  const duplicateIdRows = previewRows.filter(r => r.isDuplicateIdInFile);

  const handleImport = async () => {
    if (invalidRows.length > 0) return; // Validate everything first — block save while errors exist
    setIsProcessing(true);
    let createdCount = 0;
    let updatedCount = 0;
    const errors: string[] = [];

    try {
      for (const row of validRows) {
        const payload = {
          name: row.name,
          gender: row.gender,
          min_age: row.min_age,
          max_age: row.max_age,
          min_weight: row.min_weight,
          max_weight: row.max_weight,
          capacity: row.capacity,
          status: row.status,
          format: row.format,
        };

        try {
          if (row.isExistingId && row.id) {
            // Same Category ID -> update the existing database record in place
            await db.categories.update(row.id, payload);
            updatedCount++;
          } else {
            // No matching existing ID -> insert as a new category, preserving any supplied ID
            await db.categories.add(row.id ? { ...payload, id: row.id } : payload);
            createdCount++;
          }
        } catch (err: any) {
          errors.push(`Row ${row.row} (${row.id || row.name}): ${err.message}`);
        }
      }

      setImportReport({ createdCount, updatedCount, errors });
      setStep(3);
      triggerRefresh();
    } catch (err: any) {
      alert("Import process failed: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetState = () => {
    setCsvContent('');
    setHeaderError('');
    setPreviewRows([]);
    setImportReport(null);
    setStep(1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight">Import Categories CSV</h3>
              <p className="text-xs text-muted-foreground">Database-exact import: same Category IDs are updated in place, new IDs are created</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-4 text-xs font-semibold">
            <span className={`px-3 py-1 rounded-full flex items-center gap-1.5 ${step === 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              1. Upload CSV
            </span>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            <span className={`px-3 py-1 rounded-full flex items-center gap-1.5 ${step === 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              2. Preview & Validate ({previewRows.length})
            </span>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            <span className={`px-3 py-1 rounded-full flex items-center gap-1.5 ${step === 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              3. Status Report
            </span>
          </div>

          {/* Step 1: Upload / Paste */}
          {step === 1 && (
            <div className="space-y-4">
              {headerError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-500 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{headerError}</span>
                </div>
              )}

              <div 
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all flex flex-col items-center justify-center ${
                  dragActive ? 'border-primary bg-primary/5' : 'border-border bg-card'
                }`}
              >
                <input 
                  type="file" 
                  id="category-csv-upload" 
                  accept=".csv" 
                  onChange={handleFileChange}
                  className="hidden" 
                />
                <label htmlFor="category-csv-upload" className="cursor-pointer flex flex-col items-center">
                  <div className="p-3 bg-secondary rounded-full mb-3 text-muted-foreground">
                    <FileText className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-semibold mb-1">Click to select CSV or drag & drop</p>
                  <p className="text-xs text-muted-foreground mb-3">Use the file produced by "Export CSV" for a full round trip</p>
                  <span className="px-4 py-2 bg-secondary hover:bg-secondary/80 border border-border rounded-lg text-xs font-bold transition-colors">
                    Browse File
                  </span>
                </label>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-px bg-border flex-1" />
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Or Paste Raw Text</span>
                <div className="h-px bg-border flex-1" />
              </div>

              <textarea
                value={csvContent}
                onChange={(e) => setCsvContent(e.target.value)}
                placeholder="Paste exported CSV content here (including the header row)..."
                className="w-full h-28 p-3 text-xs bg-secondary/50 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={downloadCSVTemplate}
                  className="text-xs text-primary hover:underline font-medium cursor-pointer"
                >
                  Download Sample CSV Template
                </button>
                <button
                  disabled={!csvContent.trim()}
                  onClick={handlePasteParse}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold disabled:opacity-50 cursor-pointer"
                >
                  Parse Pasted Data
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Preview */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 bg-muted/40 border border-border rounded-lg text-center">
                  <span className="block text-lg font-black">{previewRows.length}</span>
                  <span className="text-muted-foreground">Total Rows</span>
                </div>
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-center text-emerald-600 dark:text-emerald-400">
                  <span className="block text-lg font-black">{newRows.length}</span>
                  <span>New</span>
                </div>
                <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-center text-blue-600 dark:text-blue-400">
                  <span className="block text-lg font-black">{updateRows.length}</span>
                  <span>Updates</span>
                </div>
                <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-center text-red-600 dark:text-red-400">
                  <span className="block text-lg font-black">{invalidRows.length}</span>
                  <span>Errors</span>
                </div>
              </div>

              {duplicateIdRows.length > 0 && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-600 dark:text-amber-400">
                  {duplicateIdRows.length} row(s) share a duplicate Category ID within this file.
                </div>
              )}

              <div className="border border-border rounded-xl overflow-hidden max-h-60 overflow-y-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-muted text-muted-foreground font-semibold sticky top-0">
                    <tr>
                      <th className="p-2.5 border-b border-border">Row</th>
                      <th className="p-2.5 border-b border-border">Status</th>
                      <th className="p-2.5 border-b border-border">Category ID</th>
                      <th className="p-2.5 border-b border-border">Name</th>
                      <th className="p-2.5 border-b border-border">Gender</th>
                      <th className="p-2.5 border-b border-border">Age</th>
                      <th className="p-2.5 border-b border-border">Weight</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {previewRows.map((row) => (
                      <tr key={row.row} className={row.errors.length > 0 ? 'bg-red-500/10' : row.isExistingId ? 'bg-blue-500/5' : 'hover:bg-muted/20'}>
                        <td className="p-2.5 text-muted-foreground">{row.row}</td>
                        <td className="p-2.5 font-medium">
                          {row.errors.length > 0 ? (
                            <span className="px-2 py-0.5 bg-red-500/20 text-red-500 text-[10px] rounded font-bold">Error</span>
                          ) : row.isExistingId ? (
                            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-500 text-[10px] rounded font-bold">Update</span>
                          ) : (
                            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-500 text-[10px] rounded font-bold">New</span>
                          )}
                        </td>
                        <td className="p-2.5 text-muted-foreground font-mono text-[10px]">{row.id || '(auto)'}</td>
                        <td className="p-2.5 font-semibold">{row.name}</td>
                        <td className="p-2.5 text-muted-foreground">{row.gender}</td>
                        <td className="p-2.5 text-muted-foreground">{row.min_age}-{row.max_age} yrs</td>
                        <td className="p-2.5 text-muted-foreground">{row.min_weight}-{row.max_weight} kg</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {invalidRows.length > 0 && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-500 max-h-40 overflow-y-auto space-y-1">
                  <span className="font-bold flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" /> Fix these errors before importing:</span>
                  {invalidRows.flatMap(r => r.errors).map((err, i) => (
                    <p key={i}>Row {err.row} • ID {err.categoryId} • {err.field}: {err.problem}. Suggestion: {err.suggestion}</p>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-3">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 border border-border hover:bg-muted rounded-lg text-xs font-bold cursor-pointer"
                >
                  Cancel Import / Back
                </button>
                <button
                  disabled={isProcessing || invalidRows.length > 0}
                  onClick={handleImport}
                  title={invalidRows.length > 0 ? 'Resolve all errors before importing' : undefined}
                  className="px-5 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isProcessing && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>Confirm Import ({newRows.length} New / {updateRows.length} Updates)</span>
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Report */}
          {step === 3 && importReport && (
            <div className="space-y-4 text-center py-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mb-2">
                <Check className="h-6 w-6" />
              </div>
              <h4 className="text-base font-bold">Import Completed</h4>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Category IDs were preserved for updated categories; no existing records were duplicated or deleted.
              </p>

              <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto text-xs font-semibold pt-2">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400">
                  <span className="block text-xl font-black">{importReport.createdCount}</span>
                  <span>New Categories Added</span>
                </div>
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-600 dark:text-blue-400">
                  <span className="block text-xl font-black">{importReport.updatedCount}</span>
                  <span>Existing Categories Updated</span>
                </div>
              </div>

              {importReport.errors.length > 0 && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-500 text-left space-y-1">
                  <span className="font-bold flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" /> Errors:</span>
                  {importReport.errors.map((err, i) => <p key={i}>{err}</p>)}
                </div>
              )}

              <div className="pt-4 flex justify-center gap-3">
                <button
                  onClick={resetState}
                  className="px-4 py-2 border border-border hover:bg-muted rounded-lg text-xs font-bold cursor-pointer"
                >
                  Import More
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-xs font-bold cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
