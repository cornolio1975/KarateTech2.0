'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────

export interface BreadcrumbItem {
  label: string;
  href?: string;
  /** If true, renders as current page (non-linkable) */
  current?: boolean;
}

export interface ContextBadge {
  label: string;
  value: string;
  color?: 'green' | 'yellow' | 'red' | 'blue' | 'purple' | 'default';
}

export interface PageHeaderProps {
  /** Page title shown in the header */
  title: string;
  /** Optional subtitle / description */
  subtitle?: string;
  /** Breadcrumb trail. Auto-prefixed with Dashboard if omitted. */
  breadcrumbs?: BreadcrumbItem[];
  /** Context badges shown as small pills (e.g. Tournament / Category / Tatami) */
  contextBadges?: ContextBadge[];
  /** Status indicator (e.g. LIVE / READY / COMPLETED) */
  status?: {
    label: string;
    color: 'green' | 'yellow' | 'red' | 'blue' | 'gray';
    pulse?: boolean;
  };
  /** Right-side action slot — render primary action buttons here */
  actions?: React.ReactNode;
  /** Optional icon next to the title */
  icon?: React.ReactNode;
}

// ─── Badge color map ──────────────────────────────────────────────────────

function contextBadgeClass(color?: ContextBadge['color']): string {
  switch (color) {
    case 'green':  return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
    case 'yellow': return 'bg-yellow-400/15 text-yellow-400 border border-yellow-400/30';
    case 'red':    return 'bg-red-500/15 text-red-400 border border-red-500/30';
    case 'blue':   return 'bg-sky-500/15 text-sky-400 border border-sky-500/30';
    case 'purple': return 'bg-purple-500/15 text-purple-400 border border-purple-500/30';
    default:       return 'bg-secondary/60 text-muted-foreground border border-border/40';
  }
}

function statusBadgeClass(color: NonNullable<PageHeaderProps['status']>['color']): string {
  switch (color) {
    case 'green':  return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
    case 'yellow': return 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/30';
    case 'red':    return 'bg-red-500/20 text-red-400 border border-red-500/30';
    case 'blue':   return 'bg-sky-500/20 text-sky-400 border border-sky-500/30';
    default:       return 'bg-secondary/60 text-muted-foreground border border-border/40';
  }
}

// ─── PageHeader Component ─────────────────────────────────────────────────

export default function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  contextBadges,
  status,
  actions,
  icon,
}: PageHeaderProps) {
  const crumbs: BreadcrumbItem[] = breadcrumbs ?? [];

  return (
    <div className="no-print border-b border-border bg-card/50 backdrop-blur-sm px-4 py-3 shrink-0">
      {/* ── Breadcrumb row ──────────────────────────────────────────────── */}
      {crumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 mb-2 flex-wrap">
          <Link
            href="/admin"
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Dashboard"
          >
            <Home className="h-3 w-3" />
          </Link>
          {crumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              <ChevronRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />
              {crumb.current || !crumb.href ? (
                <span className="text-[11px] font-medium text-foreground">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {crumb.label}
                </Link>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      {/* ── Title row ───────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        {/* Left: Icon + Title + Subtitle */}
        <div className="flex items-center gap-3 min-w-0">
          {icon && (
            <div className="shrink-0 text-primary">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-foreground leading-tight truncate">
                {title}
              </h1>
              {status && (
                <span
                  className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border shrink-0 ${statusBadgeClass(status.color)} ${status.pulse ? 'animate-pulse' : ''}`}
                >
                  {status.label}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right: Action buttons */}
        {actions && (
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {actions}
          </div>
        )}
      </div>

      {/* ── Context badges row ───────────────────────────────────────────── */}
      {contextBadges && contextBadges.length > 0 && (
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {contextBadges.map((badge, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${contextBadgeClass(badge.color)}`}
            >
              <span className="text-[9px] uppercase tracking-wider opacity-70">{badge.label}</span>
              <span className="font-bold">{badge.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Pre-built context badge helpers ──────────────────────────────────────

/**
 * Build context badges from the current tournament/category/bout context.
 * Pass undefined to omit a level.
 */
export function buildContextBadges(opts: {
  tournament?: string;
  category?: string;
  bracket?: string;
  bout?: string | number;
  tatami?: string | number;
  session?: string;
}): ContextBadge[] {
  const badges: ContextBadge[] = [];
  if (opts.tournament) badges.push({ label: 'Tournament', value: opts.tournament, color: 'blue' });
  if (opts.category)   badges.push({ label: 'Category',   value: opts.category,   color: 'default' });
  if (opts.bracket)    badges.push({ label: 'Bracket',    value: opts.bracket,    color: 'default' });
  if (opts.bout != null) badges.push({ label: 'Bout',     value: String(opts.bout), color: 'yellow' });
  if (opts.tatami != null) badges.push({ label: 'Tatami', value: String(opts.tatami), color: 'green' });
  if (opts.session)    badges.push({ label: 'Session',    value: opts.session,    color: 'purple' });
  return badges;
}
