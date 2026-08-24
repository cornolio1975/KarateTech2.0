/**
 * ==============================================================================
 * PROTECTED WKF COMPETITION SCOREBOARD COLOR SYSTEM
 * ==============================================================================
 * 
 * CRITICAL RULE:
 * Changing the KarateTech console theme (e.g. WKF Dark, Arena Blue, Tatami Green)
 * must NEVER overwrite, inherit, or modify AKA (Red) and AO (Blue) scoreboard colors.
 * 
 * - AKA = RED (Always #ef4444 / Crimson / Red Accents)
 * - AO  = BLUE (Always #3b82f6 / Cobalt / Blue Accents)
 * 
 * Scoreboard indicators, fighter identification cards, score values, penalty marks,
 * and winner banners must remain PERMANENTLY Red for AKA and Blue for AO in EVERY theme.
 * ==============================================================================
 */

export const AKA_COLOR = 'RED' as const;
export const AO_COLOR = 'BLUE' as const;

export interface FighterColorConfig {
  readonly name: 'AKA' | 'AO';
  readonly color: 'RED' | 'BLUE';
  readonly hex: string;
  readonly bg: string;
  readonly bgMuted: string;
  readonly bgCard: string;
  readonly bgGradient: string;
  readonly border: string;
  readonly borderActive: string;
  readonly text: string;
  readonly textLight: string;
  readonly scoreText: string;
  readonly glow: string;
  readonly shadow: string;
}

export const SCOREBOARD_COLORS: {
  readonly AKA: FighterColorConfig;
  readonly AO: FighterColorConfig;
} = {
  AKA: {
    name: 'AKA',
    color: AKA_COLOR,
    hex: '#ef4444',
    bg: 'bg-red-600',
    bgMuted: 'bg-red-950/60',
    bgCard: 'bg-[#150000]',
    bgGradient: 'bg-gradient-to-br from-red-950/80 via-[#1a0000] to-black',
    border: 'border-red-600/40',
    borderActive: 'border-red-500',
    text: 'text-red-500',
    textLight: 'text-red-400',
    scoreText: 'text-red-500',
    glow: 'rgba(239, 68, 68, 0.7)',
    shadow: 'shadow-[0_0_80px_rgba(239,68,68,0.7)]',
  },
  AO: {
    name: 'AO',
    color: AO_COLOR,
    hex: '#3b82f6',
    bg: 'bg-blue-600',
    bgMuted: 'bg-blue-950/60',
    bgCard: 'bg-[#000a1f]',
    bgGradient: 'bg-gradient-to-br from-blue-950/80 via-[#000d26] to-black',
    border: 'border-blue-600/40',
    borderActive: 'border-blue-500',
    text: 'text-blue-500',
    textLight: 'text-blue-400',
    scoreText: 'text-blue-500',
    glow: 'rgba(59, 130, 246, 0.7)',
    shadow: 'shadow-[0_0_80px_rgba(59,130,246,0.7)]',
  },
} as const;

/**
 * Returns protected color config for a competitor corner.
 * Guarantees RED for AKA and BLUE for AO irrespective of active UI theme.
 */
export function getScoreboardColor(corner: 'AKA' | 'AO' | 'aka' | 'ao'): FighterColorConfig {
  const normalized = corner.toUpperCase() === 'AO' ? 'AO' : 'AKA';
  return SCOREBOARD_COLORS[normalized];
}
