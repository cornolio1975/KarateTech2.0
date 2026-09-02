'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PrintBracketView } from '@/components/PrintBracketView';
import { db } from '@/db/dbClient';
import { Bout, Participant, Club, Category } from '@/db/types';
import { Orientation, FitMode, MarginSize } from '@/utils/printScaling';

function PrintPreviewContent() {
  const searchParams = useSearchParams();
  const rawCatParam = searchParams.get('catId') || searchParams.get('categoryId');
  
  const [bouts, setBouts] = useState<Bout[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Print settings
  const [fitMode, setFitMode] = useState<FitMode>('auto');
  const [orientation, setOrientation] = useState<Orientation>('auto');
  const [marginSize, setMarginSize] = useState<MarginSize>('normal');

  // Custom page selection, e.g. "1-3,5" — empty means print every page
  const [pageRangeInput, setPageRangeInput] = useState('');

  // On-screen preview zoom only — does not affect the actual printed/PDF page size
  const [previewZoom, setPreviewZoom] = useState(100);
  const PREVIEW_ZOOM_MIN = 40;
  const PREVIEW_ZOOM_MAX = 150;
  const PREVIEW_ZOOM_STEP = 10;

  const autoPrint = searchParams.get('autoPrint') === 'true';

  useEffect(() => {
    async function loadData() {
      try {
        const [catList, pList, clList, bList] = await Promise.all([
          db.categories.list(),
          db.participants.list(),
          db.clubs.list(),
          db.bouts.list(),
        ]);
        setCategories(catList);
        setParticipants(pList);
        setClubs(clList);
        setBouts(bList);
      } catch (err) {
        console.error("Error loading print data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Parse multiple categories if comma-separated, or default to all categories with bouts.
  // When printing "ALL", preserve the tournament's existing category order and skip empty categories.
  const selectedCatIds = useMemo(() => {
    if (rawCatParam && rawCatParam !== 'ALL') {
      return rawCatParam.split(',').filter(Boolean);
    }
    const catIdsWithBouts = new Set(bouts.map(b => b.category_id).filter(Boolean));
    const orderedCatIds = categories.filter(c => catIdsWithBouts.has(c.id)).map(c => c.id);
    if (orderedCatIds.length > 0) return orderedCatIds;
    return categories.map(c => c.id);
  }, [rawCatParam, bouts, categories]);

  // Parses input like "1-3,5,7-8" into a set of 1-based page numbers; invalid/empty input means "all pages"
  const parsePageRange = (input: string, totalPages: number): Set<number> | null => {
    const trimmed = input.trim();
    if (!trimmed) return null;
    const pages = new Set<number>();
    for (const part of trimmed.split(',')) {
      const segment = part.trim();
      if (!segment) continue;
      const rangeMatch = segment.match(/^(\d+)\s*-\s*(\d+)$/);
      if (rangeMatch) {
        const start = Math.max(1, parseInt(rangeMatch[1], 10));
        const end = Math.min(totalPages, parseInt(rangeMatch[2], 10));
        for (let p = start; p <= end; p++) pages.add(p);
        continue;
      }
      const single = parseInt(segment, 10);
      if (!Number.isNaN(single) && single >= 1 && single <= totalPages) pages.add(single);
    }
    return pages.size > 0 ? pages : null;
  };

  // Categories actually rendered/printed — auto-narrows to the user's chosen page numbers
  const printCatIds = useMemo(() => {
    const chosenPages = parsePageRange(pageRangeInput, selectedCatIds.length);
    if (!chosenPages) return selectedCatIds;
    return selectedCatIds.filter((_, idx) => chosenPages.has(idx + 1));
  }, [selectedCatIds, pageRangeInput]);

  // Automatically trigger native print dialog when opened with autoPrint=true
  useEffect(() => {
    if (!loading && printCatIds.length > 0 && autoPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading, printCatIds.length, autoPrint]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100 text-gray-800">
        <p className="text-xl font-bold animate-pulse">Loading Print Data...</p>
      </div>
    );
  }

  if (selectedCatIds.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100 text-gray-800">
        <p className="text-xl font-bold">No categories with brackets found to print.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-200 print:bg-white pb-10 print:pb-0">
      
      {/* Floating Toolbar (Hidden during actual printing) */}
      <div className="print:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-slate-900 text-white px-6 py-3 shadow-lg overflow-x-auto">
        <div className="flex items-center gap-6">
          <div className="font-bold whitespace-nowrap">
            📄 Tournament Print Preview
          </div>
          
          <div className="flex items-center gap-4 text-sm bg-slate-800 p-2 rounded shrink-0">
            <div className="flex items-center gap-2">
              <label className="text-slate-300">Fit:</label>
              <select value={fitMode} onChange={e => setFitMode(e.target.value as FitMode)} className="bg-slate-700 text-white rounded p-1 border-none focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="auto">Auto Fit A4</option>
                <option value="width">Fit Width</option>
                <option value="actual">Actual Size</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-slate-300">Orientation:</label>
              <select value={orientation} onChange={e => setOrientation(e.target.value as Orientation)} className="bg-slate-700 text-white rounded p-1 border-none focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="auto">Auto</option>
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-slate-300">Margins:</label>
              <select value={marginSize} onChange={e => setMarginSize(e.target.value as MarginSize)} className="bg-slate-700 text-white rounded p-1 border-none focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="narrow">Narrow (10mm)</option>
                <option value="normal">Normal (15mm)</option>
                <option value="wide">Wide (20mm)</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-slate-300">Pages:</label>
              <input
                type="text"
                value={pageRangeInput}
                onChange={e => setPageRangeInput(e.target.value)}
                placeholder={`All (1-${selectedCatIds.length})`}
                title='Custom page selection, e.g. "1-3,5" — auto-loads only those pages'
                className="w-28 bg-slate-700 text-white rounded p-1 border-none focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-400"
              />
              <span className="text-slate-400 text-xs whitespace-nowrap">of {selectedCatIds.length}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => window.close()} 
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm font-semibold transition-colors"
          >
            Close
          </button>
          <button 
            onClick={() => window.print()} 
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-bold shadow transition-colors flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
            Print / Save PDF
          </button>
        </div>
      </div>

      {/* Pages Container - Push down below toolbar */}
      <div className="pt-16 pb-24 print:pt-0 print:pb-0 print:block">
        {/* Use `zoom` (not `transform`) for on-screen scaling — `transform` creates a print
            fragmentation boundary in Chrome that collapses multi-page output into one page. */}
        <style dangerouslySetInnerHTML={{ __html: `@media print { #print-preview-zoom-wrapper { zoom: 1 !important; } }` }} />
        <div id="print-preview-zoom-wrapper" style={{ zoom: previewZoom / 100 } as React.CSSProperties}>
        {printCatIds.length === 0 && (
          <p className="print:hidden text-center text-slate-500 py-16">No pages match "{pageRangeInput}". Try a range like 1-3 or a comma list like 1,3,5.</p>
        )}
        {printCatIds.map((catId, index) => (
          <React.Fragment key={catId}>
            {/* Page number caption (screen only — helps pick values for the Pages box) */}
            <p className="print:hidden max-w-[95vw] mx-auto text-xs font-bold text-slate-600 mb-1">
              Page {index + 1} of {printCatIds.length}
            </p>
            <div 
              className="relative mx-auto shadow-2xl print:shadow-none print:border-none print:max-w-none print:!w-full max-w-[95vw] border border-slate-200 bg-white print:block print:m-0 print:p-0"
              style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
            >
              <PrintBracketView 
                bouts={bouts}
                participants={participants}
                clubs={clubs}
                categories={categories}
                selectedCatId={catId}
                orientation={orientation}
                fitMode={fitMode}
                marginSize={marginSize}
              />
              {/* Page number stamp printed on the page itself, bottom-right corner */}
              <div className="hidden print:block" style={{ position: 'absolute', bottom: '4px', right: '8px', fontSize: '7px', fontWeight: 700, color: '#64748b' }}>
                Page {index + 1} of {printCatIds.length}
              </div>
            </div>
            
            {/* The Page Break (Only in Print) */}
            {index < printCatIds.length - 1 && (
              <div className="hidden print:block" style={{ pageBreakAfter: 'always', breakAfter: 'page', height: '0px', margin: 0, padding: 0 }} />
            )}
            
            {/* Spacing for Screen View (Hidden in Print) */}
            {index < printCatIds.length - 1 && (
              <div className="h-10 print:hidden" />
            )}
          </React.Fragment>
        ))}
        </div>
      </div>

      {/* Floating Zoom Control (Screen only) */}
      <div className="print:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-slate-900 text-white px-4 py-2 rounded-full shadow-lg">
        <button
          onClick={() => setPreviewZoom(z => Math.max(PREVIEW_ZOOM_MIN, z - PREVIEW_ZOOM_STEP))}
          disabled={previewZoom <= PREVIEW_ZOOM_MIN}
          title="Reduce preview size"
          className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-700 hover:bg-slate-600 disabled:opacity-40 font-bold cursor-pointer"
        >
          −
        </button>
        <span className="text-sm font-bold w-12 text-center select-none">{previewZoom}%</span>
        <button
          onClick={() => setPreviewZoom(z => Math.min(PREVIEW_ZOOM_MAX, z + PREVIEW_ZOOM_STEP))}
          disabled={previewZoom >= PREVIEW_ZOOM_MAX}
          title="Increase preview size"
          className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-700 hover:bg-slate-600 disabled:opacity-40 font-bold cursor-pointer"
        >
          +
        </button>
        <button
          onClick={() => setPreviewZoom(100)}
          title="Reset to 100%"
          className="text-xs text-slate-300 hover:text-white underline ml-1 cursor-pointer"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

export default function PrintPreviewPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading Preview...</div>}>
      <PrintPreviewContent />
    </Suspense>
  );
}
