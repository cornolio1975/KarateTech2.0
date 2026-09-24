'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, AlertTriangle } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────

export type ActionLevel = 'primary' | 'secondary' | 'dangerous';

export interface ActionItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  /** Which menu this belongs to: primary button, secondary (Actions▾), or dangerous (More▾ / Administration) */
  level: ActionLevel;
  /** Handler to call when clicked */
  handler: () => void;
  /** If true, shows a ⚠ prefix and red styling */
  dangerous?: boolean;
  /** If true, show a confirmation dialog before calling handler */
  requireConfirm?: boolean;
  /** Custom confirmation message */
  confirmMessage?: string;
  /** If true, item is disabled */
  disabled?: boolean;
  /** Tooltip / aria-label */
  title?: string;
  /** If true, item is shown with a separator above it */
  separator?: boolean;
}

export interface ActionMenuProps {
  /** Primary action button label (always visible) */
  primaryLabel?: string;
  /** Primary action button icon */
  primaryIcon?: React.ReactNode;
  /** Handler for the primary button */
  onPrimary?: () => void;
  /** Whether primary button is disabled */
  primaryDisabled?: boolean;

  /** Label for the Actions dropdown (default: "Actions") */
  actionsLabel?: string;
  /** Label for the More/Admin dropdown (default: "More") */
  moreLabel?: string;

  /** All actions. Rendered in their appropriate menus based on .level */
  actions: ActionItem[];

  /** CSS class for the root container */
  className?: string;
}

// ─── Confirmation modal ────────────────────────────────────────────────────

function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground mb-1">Confirm Action</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-muted-foreground border border-border rounded-lg hover:bg-secondary/50 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition cursor-pointer"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Dropdown menu ─────────────────────────────────────────────────────────

function DropdownMenu({
  label,
  items,
  align = 'left',
  variant = 'default',
}: {
  label: string;
  items: ActionItem[];
  align?: 'left' | 'right';
  variant?: 'default' | 'danger';
}) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState<ActionItem | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (items.length === 0) return null;

  const handleItemClick = (item: ActionItem) => {
    if (item.disabled) return;
    setOpen(false);
    if (item.requireConfirm) {
      setConfirm(item);
    } else {
      item.handler();
    }
  };

  const baseButtonClass = `
    flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
    border transition-all duration-150 cursor-pointer select-none
    focus:outline-none focus:ring-2 focus:ring-primary/50
  `;

  const variantButtonClass = variant === 'danger'
    ? 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20 hover:border-red-500/50'
    : 'bg-secondary/60 text-muted-foreground border-border hover:bg-secondary hover:text-foreground';

  return (
    <>
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen(prev => !prev)}
          className={`${baseButtonClass} ${variantButtonClass}`}
          aria-expanded={open}
          aria-haspopup="true"
        >
          {variant === 'danger' && <AlertTriangle className="h-3 w-3" />}
          {label}
          <ChevronDown className={`h-3 w-3 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div
            className={`
              absolute z-50 mt-1.5 min-w-[180px] bg-card border border-border rounded-xl shadow-2xl py-1
              ${align === 'right' ? 'right-0' : 'left-0'}
            `}
          >
            {items.map((item, idx) => (
              <React.Fragment key={item.id}>
                {item.separator && idx > 0 && (
                  <div className="my-1 border-t border-border/50" />
                )}
                <button
                  onClick={() => handleItemClick(item)}
                  disabled={item.disabled}
                  title={item.title}
                  className={`
                    w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-left
                    transition-colors duration-100 cursor-pointer
                    ${item.disabled
                      ? 'opacity-40 cursor-not-allowed text-muted-foreground'
                      : item.dangerous
                        ? 'text-red-400 hover:bg-red-500/10'
                        : 'text-foreground hover:bg-secondary/60 hover:text-foreground'
                    }
                  `}
                >
                  {item.icon && (
                    <span className={`shrink-0 ${item.dangerous ? 'text-red-400' : 'text-muted-foreground'}`}>
                      {item.icon}
                    </span>
                  )}
                  {item.dangerous && !item.icon && (
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-400" />
                  )}
                  <span className="flex-1">{item.label}</span>
                </button>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation dialog */}
      {confirm && (
        <ConfirmDialog
          message={confirm.confirmMessage || `Are you sure you want to perform: "${confirm.label}"?`}
          onConfirm={() => {
            confirm.handler();
            setConfirm(null);
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </>
  );
}

// ─── ActionMenu Component ─────────────────────────────────────────────────

/**
 * Three-level action menu system for KarateTech 3.0.
 *
 * Usage:
 *   <ActionMenu
 *     primaryLabel="+ Add Category"
 *     onPrimary={handleAdd}
 *     actionsLabel="Actions"
 *     moreLabel="More"
 *     actions={[
 *       { id: 'edit',   label: 'Edit',   level: 'secondary', handler: handleEdit },
 *       { id: 'flush',  label: 'Flush',  level: 'dangerous', dangerous: true, requireConfirm: true, handler: handleFlush },
 *     ]}
 *   />
 */
export default function ActionMenu({
  primaryLabel,
  primaryIcon,
  onPrimary,
  primaryDisabled,
  actionsLabel = 'Actions',
  moreLabel = 'More',
  actions,
  className = '',
}: ActionMenuProps) {
  const secondaryActions  = actions.filter(a => a.level === 'secondary');
  const dangerousActions  = actions.filter(a => a.level === 'dangerous');

  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      {/* Primary action button */}
      {primaryLabel && (
        <button
          onClick={onPrimary}
          disabled={primaryDisabled}
          className={`
            flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold
            bg-primary text-primary-foreground hover:bg-primary/90
            transition-all duration-150 shadow-sm
            cursor-pointer select-none
            focus:outline-none focus:ring-2 focus:ring-primary/50
            ${primaryDisabled ? 'opacity-40 cursor-not-allowed' : ''}
          `}
        >
          {primaryIcon}
          {primaryLabel}
        </button>
      )}

      {/* Actions dropdown (secondary) */}
      <DropdownMenu
        label={actionsLabel}
        items={secondaryActions}
        align="left"
        variant="default"
      />

      {/* More / Administration dropdown (dangerous) */}
      <DropdownMenu
        label={moreLabel}
        items={dangerousActions}
        align="right"
        variant="danger"
      />
    </div>
  );
}

// ─── Page Tab System ──────────────────────────────────────────────────────

export interface PageTab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
  badgeColor?: 'green' | 'yellow' | 'red' | 'blue' | 'default';
  /** If true, tab is shown with a visual separator before it */
  separator?: boolean;
}

export interface PageTabBarProps {
  tabs: PageTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

/**
 * Horizontal tab bar for use inside pages.
 * Renders all tabs and calls onTabChange when a tab is clicked.
 */
export function PageTabBar({ tabs, activeTab, onTabChange, className = '' }: PageTabBarProps) {
  function tabBadgeClass(color?: PageTab['badgeColor']): string {
    switch (color) {
      case 'green':  return 'bg-emerald-400/20 text-emerald-400';
      case 'yellow': return 'bg-yellow-400/20 text-yellow-400';
      case 'red':    return 'bg-red-400/20 text-red-400';
      case 'blue':   return 'bg-sky-400/20 text-sky-400';
      default:       return 'bg-secondary text-muted-foreground';
    }
  }

  return (
    <div className={`no-print border-b border-border bg-card/30 px-4 ${className}`}>
      <div className="flex items-center gap-0 overflow-x-auto scrollbar-none -mb-px">
        {tabs.map((tab, idx) => {
          const isActive = tab.id === activeTab;
          return (
            <React.Fragment key={tab.id}>
              {tab.separator && idx > 0 && (
                <div className="w-px h-4 bg-border/50 mx-2 shrink-0" />
              )}
              <button
                onClick={() => onTabChange(tab.id)}
                className={`
                  flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold
                  whitespace-nowrap shrink-0 border-b-2 transition-all duration-150
                  cursor-pointer select-none
                  ${isActive
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }
                `}
                aria-selected={isActive}
                role="tab"
              >
                {tab.icon && <span className="shrink-0">{tab.icon}</span>}
                {tab.label}
                {tab.badge != null && (
                  <span className={`ml-1 text-[9px] font-bold px-1 py-0.5 rounded ${tabBadgeClass(tab.badgeColor)}`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
