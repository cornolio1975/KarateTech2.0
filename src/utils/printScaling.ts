export type PaperSize = 'A4' | 'A3' | 'A2';
export type Orientation = 'portrait' | 'landscape' | 'auto';
export type FitMode = 'auto' | 'actual' | 'width';
export type MarginSize = 'narrow' | 'normal' | 'wide';

export interface PrintDimensions {
  paperSize: PaperSize;
  orientation: 'portrait' | 'landscape'; // Resolved orientation
  bracketBaseWidthPx: number;
  bracketBaseHeightPx: number;
  scaleFactor: number;
  marginMm: number;
}

/**
 * Calculates the best paper size, orientation, and scaling factor for a bracket.
 * 
 * @param competitorCount Number of competitors in the category
 * @param rounds Number of rounds in the bracket
 * @param isRoundRobin Whether this is a round-robin format
 * @param prefOrientation User's preferred orientation
 * @param prefFitMode User's preferred fit mode
 * @param prefMargin User's preferred margin size
 */
export function calculatePrintDimensions(
  competitorCount: number, 
  rounds: number,
  isRoundRobin: boolean,
  prefOrientation: Orientation = 'auto',
  prefFitMode: FitMode = 'auto',
  prefMargin: MarginSize = 'normal'
): PrintDimensions {
  
  // Resolve Margin in mm (tuned for zero overflow)
  let marginMm = 8;
  if (prefMargin === 'narrow') marginMm = 5;
  if (prefMargin === 'wide') marginMm = 12;

  let paperSize: PaperSize = 'A4';
  // Karate draw brackets expand horizontally: default orientation is landscape
  let resolvedOrientation: 'portrait' | 'landscape' = 'landscape';
  if (prefOrientation === 'portrait') {
    resolvedOrientation = 'portrait';
  } else if (prefOrientation === 'landscape') {
    resolvedOrientation = 'landscape';
  } else {
    // Auto: landscape is standard for tournament tree brackets
    resolvedOrientation = 'landscape';
  }

  if (isRoundRobin) {
    return {
      paperSize: 'A4',
      orientation: resolvedOrientation,
      bracketBaseWidthPx: 1050,
      bracketBaseHeightPx: 680,
      scaleFactor: 1.0,
      marginMm
    };
  }

  // 2. Standard paper pixel dimensions (at ~96 DPI screen/print baseline)
  // A4 Landscape: 1123 x 794 px
  const paperSizes = {
    'A4': { portrait: { w: 794, h: 1123 }, landscape: { w: 1123, h: 794 } },
    'A3': { portrait: { w: 1123, h: 1587 }, landscape: { w: 1587, h: 1123 } },
    'A2': { portrait: { w: 1587, h: 2245 }, landscape: { w: 2245, h: 1587 } }
  };

  // Safe printable area (subtract margins, approx 1mm = 3.78px)
  const marginPx = marginMm * 3.78;
  const availableWidth = paperSizes[paperSize][resolvedOrientation].w - (marginPx * 2);
  // Reserve 145px for Header (40px), Category Banner (30px), Footer (35px), and outer paddings (40px)
  const availableHeight = paperSizes[paperSize][resolvedOrientation].h - (marginPx * 2) - 145;

  // 3. Base size for bracket rendering
  const minCardWidthPx = 185;
  const baseHeight = Math.max(competitorCount * 42, 480);
  const baseWidth = Math.max((rounds + 1) * minCardWidthPx, 860);

  // 4. Calculate Scale Factor to guarantee fitting inside printable area
  const scaleX = availableWidth / baseWidth;
  const scaleY = availableHeight / baseHeight;
  
  let scaleFactor = Math.min(scaleX, scaleY);

  if (prefFitMode === 'actual') {
    scaleFactor = 1.0;
  } else if (prefFitMode === 'width') {
    scaleFactor = scaleX;
  } else {
    // 'auto' mode - strictly fit within single page boundaries
    scaleFactor = Math.min(scaleX, scaleY);
  }

  // Stretch base dimensions so the bracket utilizes 100% of printable space
  const finalBaseWidth = availableWidth / scaleFactor;
  const finalBaseHeight = availableHeight / scaleFactor;

  return {
    paperSize,
    orientation: resolvedOrientation,
    bracketBaseWidthPx: finalBaseWidth,
    bracketBaseHeightPx: finalBaseHeight,
    scaleFactor,
    marginMm
  };
}
