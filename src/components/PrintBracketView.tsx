import React, { useMemo } from 'react';
import { Bout, Participant, Club, Category } from '@/db/types';
import { SportdataBracket } from './SportdataBracket';
import { calculatePrintDimensions, Orientation, FitMode, MarginSize } from '@/utils/printScaling';
import { basePath } from '@/db/dbClient';
import { useTournament } from '@/context/TournamentContext';

interface PrintBracketViewProps {
  bouts: Bout[];
  participants: Participant[];
  clubs: Club[];
  categories: Category[];
  selectedCatId: string | null;
  orientation?: Orientation;
  fitMode?: FitMode;
  marginSize?: MarginSize;
}

export const PrintBracketView: React.FC<PrintBracketViewProps> = ({
  bouts,
  participants,
  clubs,
  categories,
  selectedCatId,
  orientation = 'auto',
  fitMode = 'auto',
  marginSize = 'normal'
}) => {
  const { tournamentName, logoUrl } = useTournament();

  const selectedCategory = categories.find((c) => c.id === selectedCatId);
  const categoryBouts = bouts.filter((b) => b.category_id === selectedCatId);
  
  // Extract number of rounds and competitors to calculate print scale
  const dimensions = useMemo(() => {
    if (!selectedCategory) return null;
    
    const isRoundRobin = selectedCategory.format === 'round_robin';
    
    // Find unique competitors in this category's bouts
    const compIds = new Set<string>();
    let maxRound = 1;
    
    categoryBouts.forEach(b => {
      if (b.participant_a_id) compIds.add(b.participant_a_id);
      if (b.participant_b_id) compIds.add(b.participant_b_id);
      if (b.round_no !== 99 && b.round_no > maxRound) {
        maxRound = b.round_no;
      }
    });
    
    const competitorCount = compIds.size || 8; // fallback
    
    return calculatePrintDimensions(competitorCount, maxRound, isRoundRobin, orientation, fitMode, marginSize);
  }, [categoryBouts, selectedCategory, orientation, fitMode, marginSize]);

  if (!selectedCategory || !dimensions) {
    return <div>No category selected or missing data.</div>;
  }

  // Generate dynamic CSS block for print page sizing
  const printCss = `
    @page { 
      size: ${dimensions.paperSize} ${dimensions.orientation}; 
      margin: ${dimensions.marginMm}mm; 
    }
    @media print {
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: #fff !important;
        width: 100% !important;
      }
      .print-container {
        width: 100% !important;
        max-width: 100% !important;
        height: 100% !important;
        max-height: 100% !important;
        padding: 0 !important;
        margin: 0 !important;
        /* Chrome does not reliably paginate flex containers when printing multiple
           forced-break pages, so use block layout for print only (screen keeps flex). */
        display: block !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        overflow: hidden !important;
      }
      .print-bracket-page {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        page-break-after: avoid !important;
        break-after: avoid !important;
        height: 100% !important;
        max-height: 100% !important;
        overflow: hidden !important;
      }
      .sportdata-header {
        display: none !important;
      }
    }
    .print-bracket-page, .print-bracket-page * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    /* Compensate for scale factor so sub-pixel borders don't disappear in Chrome print engine AND on-screen preview */
    .print-bracket-page .origin-top-left .border,
    .print-bracket-page .origin-top-left .border-l,
    .print-bracket-page .origin-top-left .border-r,
    .print-bracket-page .origin-top-left .border-b,
    .print-bracket-page .origin-top-left .border-t {
      border-width: ${Math.max(1.5, 1.2 / dimensions.scaleFactor).toFixed(2)}px !important;
      border-style: solid !important;
      border-color: #000 !important;
    }
    .print-bracket-page .origin-top-left svg path,
    .print-bracket-page .origin-top-left svg line {
      stroke-width: ${Math.max(2, 1.5 / dimensions.scaleFactor).toFixed(2)}px !important;
    }
  `;

  return (
    <div className="print-bracket-page print-container bg-white text-black p-3 print:p-0 flex flex-col justify-between w-full h-full">
      <style dangerouslySetInnerHTML={{ __html: printCss }} />

      {/* 1. Header (Fixed Size, doesn't scale with bracket) */}
      <div className="flex items-center justify-between border-b-2 border-slate-800 pb-1 mb-1 shrink-0">
        <div className="flex items-center gap-2">
          <img 
            src={logoUrl || `${basePath}/karatetech-logo.png`} 
            alt="KarateTech Logo" 
            className="h-[36px] w-[36px] object-contain rounded-full border border-gray-300 shadow"
          />
          <div className="flex flex-col justify-center">
            <div style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 900, fontSize: '0.85rem', lineHeight: 1, letterSpacing: '0.01em' }}>
              <span style={{ color: '#b91c2e' }}>Karate</span>
              <span style={{ color: '#38bdf8' }}>Tech</span>
              <span style={{ color: '#111827', marginLeft: '3px', fontSize: '0.75rem' }}>2.0</span>
              <span style={{ color: '#64748b', fontSize: '0.55rem', marginLeft: '2px', verticalAlign: 'super' }}>©</span>
            </div>
            <div style={{ fontSize: '6px', color: '#64748b', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: '1px', lineHeight: 1 }}>
              • PRECISION. SPEED. RESULTS. •
            </div>
            <div style={{ marginTop: '3px', background: '#ffffff', display: 'block', borderRadius: '2px', padding: '1px 2px', width: '100%' }}>
              <img 
                src={`${basePath}/spsportdata-logo.jpg`} 
                alt="SP SportData Solution" 
                style={{ display: 'block', height: '20px', width: '100%', objectFit: 'contain', objectPosition: 'left' }}
              />
            </div>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-sm font-black uppercase text-slate-900">{tournamentName || 'Karate Championship'}</div>
          <div className="text-[9px] text-slate-500 font-semibold mt-0">Official Draw Sheet • Printed {new Date().toLocaleDateString()}</div>
        </div>
      </div>

      {/* 2. Category Banner */}
      <div className="bg-slate-50 border border-slate-200 border-l-[5px] border-l-blue-600 px-2.5 py-0.5 rounded mb-1.5 flex justify-between items-center shrink-0">
        <div className="text-sm font-black uppercase text-slate-900">{selectedCategory.name}</div>
        <div className="text-[11px] font-bold text-slate-600">
          {selectedCategory.gender} • {selectedCategory.format === 'round_robin' ? 'Round Robin' : selectedCategory.format === 'wkf_repechage' ? 'WKF Repechage' : 'Single Elimination'}
        </div>
      </div>

      {/* 3. Scaled Bracket Canvas */}
      <div 
        className="mx-auto overflow-hidden flex-shrink-0 flex items-center justify-center"
        style={{
          width: `${dimensions.bracketBaseWidthPx * dimensions.scaleFactor}px`,
          height: `${dimensions.bracketBaseHeightPx * dimensions.scaleFactor}px`,
        }}
      >
        {/* The inner container renders at full size, but scales down to fit exactly into the outer boundary */}
        <div 
          className="origin-top-left"
          style={{
            width: `${dimensions.bracketBaseWidthPx}px`,
            height: `${dimensions.bracketBaseHeightPx}px`,
            transform: `scale(${dimensions.scaleFactor})`,
          }}
        >
          {/* We force SportdataBracket to light theme, disable modify controls, and force height to 100% of the fixed container */}
          <SportdataBracket
            bouts={bouts}
            participants={participants}
            clubs={clubs}
            categories={categories}
            selectedCatId={selectedCatId}
            theme="light"
            canModify={false}
            height={`${dimensions.bracketBaseHeightPx}px`}
            hideZoomControls={true}
          />
        </div>
      </div>

      {/* 4. Footer */}
      <div className="mt-1 pt-1.5 border-t border-slate-300 flex justify-between shrink-0">
        <div className="text-center w-1/4">
          <div className="border-b border-slate-400 h-5 mb-0.5"></div>
          <div className="text-[8px] font-bold text-slate-500 uppercase">Draw Officer Signature</div>
        </div>
        <div className="text-center w-1/4">
          <div className="border-b border-slate-400 h-5 mb-0.5"></div>
          <div className="text-[8px] font-bold text-slate-500 uppercase">Tournament Director</div>
        </div>
        <div className="text-center w-1/4">
          <div className="border-b border-slate-400 h-5 mb-0.5"></div>
          <div className="text-[8px] font-bold text-slate-500 uppercase">Chief Referee</div>
        </div>
        <div className="text-center w-1/4">
          <div className="border-b border-slate-400 h-5 mb-0.5"></div>
          <div className="text-[8px] font-bold text-slate-500 uppercase">Date & Official Stamp</div>
        </div>
      </div>

      <div className="text-[6.5px] font-semibold text-slate-400 uppercase tracking-wider text-center mt-0.5">
        © KarateTech Tournament Management System • SP SportData Solution • Precision · Speed · Results
      </div>
    </div>
  );
};
