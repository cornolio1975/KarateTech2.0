'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/db/dbClient';
import { Tournament } from '@/db/types';
import { Share2, Copy, Check, QrCode, ExternalLink } from 'lucide-react';

const DISPLAY_BASE_URL =
  process.env.NEXT_PUBLIC_DISPLAY_BASE_URL ||
  'https://tournamentdisplay.spsportdatasolution.org';

interface TournamentShareLinkProps {
  /** If provided, shows share link for just this tournament. Otherwise shows a list picker. */
  tournamentId?: string;
  tournamentName?: string;
}

// Lightweight inline QR using a data URI SVG via the qrcode.react-like approach.
// We use a simple URL-encoded SVG QR grid generated with a tiny algorithm.
function TinyQRCode({ value, size = 120 }: { value: string; size?: number }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    // Lazy-load qrcode library from CDN if available, else show fallback
    const generateQR = async () => {
      try {
        // Try dynamic import of qrcode package if it exists
        const QRCode = await import('qrcode' as any).catch(() => null);
        if (QRCode) {
          const url = await QRCode.toDataURL(value, { width: size, margin: 1 });
          setQrDataUrl(url);
        }
      } catch {
        setQrDataUrl(null);
      }
    };
    generateQR();
  }, [value, size]);

  if (!qrDataUrl) {
    // Fallback: simple text placeholder styled as QR
    return (
      <div
        style={{ width: size, height: size }}
        className="bg-white rounded-xl flex items-center justify-center border-2 border-white/20"
      >
        <div className="text-center p-2">
          <QrCode className="h-8 w-8 text-black mx-auto mb-1" />
          <p className="text-[8px] text-black/60 font-mono break-all leading-tight max-w-[80px]">
            {value.replace('https://', '')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <img
      src={qrDataUrl}
      alt="QR Code"
      width={size}
      height={size}
      className="rounded-xl border-4 border-white shadow-xl"
    />
  );
}

export default function TournamentShareLink({ tournamentId, tournamentName }: TournamentShareLinkProps) {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedId, setSelectedId] = useState<string | undefined>(tournamentId);
  const [selectedName, setSelectedName] = useState<string | undefined>(tournamentName);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const shareUrl = selectedId
    ? `${DISPLAY_BASE_URL}/?tournament=${selectedId}`
    : null;

  useEffect(() => {
    if (!tournamentId && supabase) {
      supabase
        .from('tournaments')
        .select('id, name, status')
        .in('status', ['Active', 'Open', 'Closing Soon', 'Full', 'Completed'])
        .is('deleted_at', null)
        .order('date_iso', { ascending: false })
        .then(({ data }) => {
          if (data) setTournaments(data as Tournament[]);
        });
    }
  }, [tournamentId]);

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback for older browsers
      const el = document.createElement('textarea');
      el.value = shareUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="bg-black/40 border border-white/10 rounded-2xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Share2 className="h-4 w-4 text-yellow-400" />
        <h3 className="text-sm font-black uppercase tracking-widest text-yellow-400">
          Public Display Link
        </h3>
      </div>

      {/* Tournament picker (if no tournamentId prop) */}
      {!tournamentId && tournaments.length > 0 && (
        <select
          value={selectedId || ''}
          onChange={e => {
            const t = tournaments.find(t => t.id === e.target.value);
            setSelectedId(t?.id);
            setSelectedName(t?.name);
            setShowQR(false);
          }}
          className="w-full bg-black/60 border border-white/15 text-white rounded-xl px-3 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-yellow-500/30 cursor-pointer"
          id="share-link-tournament-select"
        >
          <option value="">Select a tournament...</option>
          {tournaments.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      )}

      {/* Selected tournament name */}
      {selectedName && (
        <p className="text-xs font-bold text-white/40 uppercase tracking-wider truncate">
          {selectedName}
        </p>
      )}

      {/* Link display */}
      {shareUrl ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 bg-black/60 border border-white/10 rounded-xl px-3 py-2.5">
            <span className="flex-1 text-xs font-mono text-white/60 truncate">{shareUrl}</span>
            <a
              href={shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/40 hover:text-yellow-400 transition shrink-0"
              title="Open in new tab"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              id="copy-display-link-btn"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition cursor-pointer border bg-yellow-500/10 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20"
            >
              {copied
                ? <><Check className="h-3.5 w-3.5" /> Copied!</>
                : <><Copy className="h-3.5 w-3.5" /> Copy Link</>
              }
            </button>
            <button
              onClick={() => setShowQR(v => !v)}
              id="toggle-qr-btn"
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition cursor-pointer border ${
                showQR
                  ? 'bg-white/10 border-white/20 text-white'
                  : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white'
              }`}
            >
              <QrCode className="h-3.5 w-3.5" />
              QR
            </button>
          </div>

          {/* QR Code */}
          {showQR && (
            <div className="flex flex-col items-center gap-3 pt-2">
              <TinyQRCode value={shareUrl} size={140} />
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest text-center">
                Scan to open on any device
              </p>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-white/30 font-bold text-center py-2">
          Select a tournament to generate a link
        </p>
      )}
    </div>
  );
}
