'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Calendar, MapPin, Clock, Users, ChevronRight,
  ExternalLink, Trophy, Flame, Star, ArrowLeft,
  Tag, AlarmClock, Info, Home, RefreshCw
} from 'lucide-react';
import { formatLocalDate } from '@/lib/dateUtils';
import { db } from '@/db/dbClient';
import { createClient } from '@/utils/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────

type TournamentStatus = 'Open' | 'Closing Soon' | 'Full' | 'Draft';

interface EventCategory {
  name: string;
  color: string;
}

interface Tournament {
  id: string;
  name: string;
  organizer: string;
  date: string; // display string e.g. "15–16 August 2026"
  dateIso: string; // ISO for countdown target e.g. "2026-08-15T08:00:00"
  venue: string;
  city: string;
  registrationClose: string; // display
  registrationCloseIso: string; // ISO
  categories: EventCategory[];
  status: TournamentStatus;
  bannerGradient: string;
  banner_url?: string;
  registrationStatus?: string;
  featured?: boolean;
}

// ─── Static Tournament Data ────────────────────────────────────────────────

const TOURNAMENTS: Tournament[] = [
  {
    id: 'ksg-open-2026',
    name: 'Kelab Senshi Goju-Ryu Open Karate Championship 2026',
    organizer: 'Kelab Senshi Goju-Ryu',
    date: '15–16 August 2026',
    dateIso: '2026-08-15T08:00:00',
    venue: 'Dewan Serbaguna Petaling Jaya',
    city: 'Petaling Jaya, Selangor',
    registrationClose: '31 July 2026',
    registrationCloseIso: '2026-07-31T23:59:59',
    categories: [
      { name: 'Kata', color: '#d97706' },
      { name: 'Kumite', color: '#dc2626' },
      { name: 'Team Kata', color: '#7c3aed' },
      { name: 'Team Kumite', color: '#0369a1' },
    ],
    status: 'Open',
    bannerGradient: 'linear-gradient(135deg, #0b0f19 0%, #1a1035 40%, #2d1a00 100%)',
    featured: true,
  },
];

// ─── Registration URL ──────────────────────────────────────────────────────
const REGISTRATION_URL =
  'https://cornolio1975.github.io/KarateTech-/login/';

// ─── Countdown Hook ────────────────────────────────────────────────────────

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function useCountdown(targetIso: string): TimeLeft {
  const calculate = useCallback((): TimeLeft => {
    if (!targetIso) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    
    // Normalize targetIso to prevent Safari NaN errors
    let formatted = targetIso;
    if (/^\d{4}-\d{2}-\d{2}$/.test(formatted)) {
      formatted = formatted.replace(/-/g, '/');
    } else if (formatted.includes('-') && !formatted.endsWith('Z') && !formatted.includes('+')) {
      const parts = formatted.split('T');
      parts[0] = parts[0].replace(/-/g, '/');
      formatted = parts.join(' ');
    }

    let targetTime = new Date(formatted).getTime();
    
    if (isNaN(targetTime)) {
      const clean = targetIso.replace('T', ' ').replace(/-/g, '/');
      targetTime = new Date(clean).getTime();
    }

    if (isNaN(targetTime)) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    const diff = targetTime - Date.now();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((diff / (1000 * 60)) % 60),
      seconds: Math.floor((diff / 1000) % 60),
    };
  }, [targetIso]);

  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculate);

  useEffect(() => {
    const id = setInterval(() => setTimeLeft(calculate()), 1000);
    return () => clearInterval(id);
  }, [calculate]);

  return timeLeft;
}

// ─── Status Badge ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: TournamentStatus }) {
  const styles: Record<TournamentStatus, string> = {
    Open: 'tournament-badge-open',
    'Closing Soon': 'tournament-badge-closing',
    Full: 'tournament-badge-full',
    Draft: 'tournament-badge-full', // Fallback or new class
  };
  const dots: Record<TournamentStatus, string> = {
    Open: '#22c55e',
    'Closing Soon': '#f59e0b',
    Full: '#ef4444',
    Draft: '#888',
  };
  return (
    <span className={`tournament-badge ${styles[status]}`}>
      <span
        className="tournament-badge-dot"
        style={{ backgroundColor: dots[status] }}
      />
      {status}
    </span>
  );
}

// ─── Countdown Display ─────────────────────────────────────────────────────

function CountdownTimer({ targetIso, label }: { targetIso: string; label: string }) {
  const t = useCountdown(targetIso);
  const segments = [
    { value: t.days, unit: 'Days' },
    { value: t.hours, unit: 'Hrs' },
    { value: t.minutes, unit: 'Min' },
    { value: t.seconds, unit: 'Sec' },
  ];

  return (
    <div className="countdown-wrapper">
      <div className="countdown-label">
        <AlarmClock size={12} />
        {label}
      </div>
      <div className="countdown-segments">
        {segments.map(({ value, unit }, i) => (
          <React.Fragment key={unit}>
            <div className="countdown-seg">
              <span className="countdown-value">
                {String(value).padStart(2, '0')}
              </span>
              <span className="countdown-unit">{unit}</span>
            </div>
            {i < segments.length - 1 && (
              <span className="countdown-colon">:</span>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ─── Tournament Card ───────────────────────────────────────────────────────

function TournamentCard({ tournament }: { tournament: Tournament }) {
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <article className={`t-card ${tournament.featured ? 't-card--featured' : ''}`}>
      {/* Banner */}
      <div className="t-card__banner" style={{ background: tournament.bannerGradient }}>
        {tournament.featured && (
          <img
            src={tournament.banner_url || "/tournament_banner_2026.png"}
            alt={tournament.name}
            className={`t-card__banner-img ${imgLoaded ? 't-card__banner-img--loaded' : ''}`}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgLoaded(false)}
          />
        )}

        {/* Overlay content */}
        <div className="t-card__banner-overlay">
          <div className="t-card__banner-top">
            <StatusBadge status={tournament.status} />
            {tournament.featured && (
              <span className="t-card__featured-badge">
                <Star size={11} fill="currentColor" /> Featured
              </span>
            )}
          </div>

          <div className="t-card__banner-bottom">
            <h2 className="t-card__title">{tournament.name}</h2>
            <p className="t-card__organizer">
              <Trophy size={13} /> {tournament.organizer}
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="t-card__body">
        {/* Meta grid */}
        <div className="t-card__meta">
          <div className="t-card__meta-item">
            <Calendar size={14} className="t-card__meta-icon" />
            <div>
              <span className="t-card__meta-label">Tournament Date</span>
              <span className="t-card__meta-value">{tournament.date}</span>
            </div>
          </div>
          <div className="t-card__meta-item">
            <MapPin size={14} className="t-card__meta-icon" />
            <div>
              <span className="t-card__meta-label">Venue</span>
              <span className="t-card__meta-value">{tournament.venue}</span>
              <span className="t-card__meta-sub">{tournament.city}</span>
            </div>
          </div>
          <div className="t-card__meta-item">
            <Clock size={14} className="t-card__meta-icon" />
            <div>
              <span className="t-card__meta-label">Registration Closes</span>
              <span className="t-card__meta-value">{tournament.registrationClose}</span>
            </div>
          </div>
          <div className="t-card__meta-item">
            <Users size={14} className="t-card__meta-icon" />
            <div>
              <span className="t-card__meta-label">Status</span>
              <span className="t-card__meta-value">{tournament.status}</span>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="t-card__categories">
          <div className="t-card__categories-label">
            <Tag size={12} /> Event Categories
          </div>
          <div className="t-card__categories-list">
            {tournament.categories.map((cat) => (
              <span
                key={cat.name}
                className="t-card__category-pill"
                style={{
                  backgroundColor: `${cat.color}18`,
                  color: cat.color,
                  borderColor: `${cat.color}40`,
                }}
              >
                {cat.name}
              </span>
            ))}
          </div>
        </div>

        {/* Countdown */}
        <div className="t-card__countdowns">
          <CountdownTimer
            targetIso={tournament.registrationCloseIso}
            label="Registration closes in"
          />
          <CountdownTimer
            targetIso={tournament.dateIso}
            label="Tournament starts in"
          />
        </div>

        {/* Register Button */}
        <div className="t-card__actions">
          {tournament.status !== 'Draft' && (
            <Link
              href={tournament.registrationStatus === 'Open' ? `/public/register?tournament=${tournament.id}` : '#'}
              className={`btn-register ${tournament.registrationStatus !== 'Open' ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={tournament.registrationStatus === 'Open' ? "Register for this tournament" : "Registration closed"}
              aria-label={`Register for ${tournament.name}`}
            >
              <span className="btn-register__icon">
                <ExternalLink size={15} />
              </span>
              {tournament.registrationStatus === 'Open' ? 'Register Now' : 'Registration Closed'}
              <ChevronRight size={16} className="btn-register__arrow" />
            </Link>
          )}

          <Link
            href={`/public/tournaments/details?id=${tournament.id}`}
            className="btn-secondary-link"
          >
            <Info size={14} />
            View Tournament
          </Link>
        </div>
      </div>
    </article>
  );
}

// ─── Page Component ────────────────────────────────────────────────────────

export default function TournamentsPage() {
  const [upcomingList, setUpcomingList] = useState<any[]>([]);
  const [completedList, setCompletedList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        setLoading(true);
        const supabase = createClient();
        const { data: dbData, error } = await supabase
          .from('tournaments')
          .select(`
            id, name, discipline, poster_emoji, banner_gradient, organizer, date, date_iso, registration_close, registration_close_iso, venue, city, status, data
          `)
          .neq('status', 'Draft')
          .neq('status', 'Deleted')
          .neq('status', 'Archived')
          .order('date_iso', { ascending: true });

        if (error) throw error;

        let finalData: any[] = [];
        if (dbData && dbData.length > 0) {
          finalData = dbData.map(item => {
            let dataObj = {};
            if (item.data) {
              try {
                dataObj = typeof item.data === 'string' ? JSON.parse(item.data) : item.data;
              } catch (e) {}
            }
            return { ...item, ...dataObj };
          });
        }
        
        if (finalData.length > 0) {
          const mapped = finalData.map((t: any) => ({
            id: t.id,
            name: t.name,
            organizer: t.organizer,
            date: t.date,
            dateIso: t.date_iso || t.date || '',
            venue: t.venue,
            city: t.city,
            registrationClose: t.registration_close,
            registrationCloseIso: t.registration_close_iso || t.registration_close || '',
            registrationStatus: t.registration_status || 'Closed',
            categories: [
              { name: 'Kata', color: '#d97706' },
              { name: 'Kumite', color: '#dc2626' }
            ],
            status: t.status,
            bannerGradient: t.banner_gradient || 'linear-gradient(135deg, #0b0f19 0%, #1a1035 40%, #2d1a00 100%)',
            bannerUrl: t.banner_url,
            featured: true
          }));
          
          setUpcomingList(mapped.filter((t: any) => t.status !== 'Completed' && t.status !== 'Canceled'));
          setCompletedList(mapped.filter((t: any) => t.status === 'Completed'));
        } else {
          setUpcomingList(TOURNAMENTS);
        }
      } catch (e) {
        console.error('Failed to load upcoming tournaments:', e);
        setUpcomingList(TOURNAMENTS);
      } finally {
        setLoading(false);
      }
    };

    fetchTournaments();
  }, []);

  return (
    <div className="tournaments-page">
      {/* Floating Home button */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '1.5rem 1.5rem 0' }}>
        <Link
          href="/"
          prefetch={false}
          className="flex items-center gap-1.5 w-fit px-3 py-1.5 border border-gray-800 hover:border-gray-700 bg-gray-900/40 hover:bg-gray-900/80 rounded-lg text-xs font-bold transition text-gray-300 hover:text-white cursor-pointer"
        >
          <Home className="h-3.5 w-3.5" />
          <span>Back to Home</span>
        </Link>
      </div>

      {/* Hero Header */}
      <header className="tournaments-hero">
        <div className="tournaments-hero__content">
          <div className="tournaments-hero__badge">
            <Flame size={14} fill="currentColor" />
            Live Registrations Open
          </div>
          <h1 className="tournaments-hero__title">Upcoming Tournaments</h1>
          <p className="tournaments-hero__subtitle">
            Compete, conquer, and champion — register for the next Kelab Senshi
            Goju-Ryu karate event and make your mark.
          </p>
        </div>

        {/* Decorative belt stripes */}
        <div className="tournaments-hero__stripes" aria-hidden="true">
          {['#d97706', '#dc2626', '#1d4ed8', '#15803d', '#1a1a1a'].map((c, i) => (
            <span key={i} style={{ backgroundColor: c }} />
          ))}
        </div>
      </header>

      {/* Cards grid */}
      <section className="tournaments-grid" aria-label="Upcoming tournaments">
        {loading ? (
          <div className="col-span-full py-12 text-center text-xs text-gray-400">
            <RefreshCw className="h-4 w-4 animate-spin text-amber-500 mx-auto mb-2" />
            <span>Loading upcoming tournaments...</span>
          </div>
        ) : upcomingList.length === 0 ? (
          <div className="col-span-full py-12 text-center text-xs text-gray-400">
            No upcoming tournaments scheduled at this time.
          </div>
        ) : (
          upcomingList.map((t) => (
            <TournamentCard key={t.id} tournament={t} />
          ))
        )}
      </section>

      {/* Completed Tournaments Small Box */}
      {completedList.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 py-12">
          <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-3">
            <Trophy size={20} className="text-slate-400" />
            <h2 className="text-xl font-bold text-slate-300">Completed Tournaments</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {completedList.map(t => (
              <div key={t.id} className="bg-[#111928] border border-white/5 rounded-xl p-4 flex flex-col hover:border-white/10 transition group">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-sm text-slate-200 line-clamp-2 group-hover:text-sky-400 transition">{t.name}</h3>
                </div>
                <div className="text-xs text-slate-500 mb-4 flex items-center gap-1.5"><Calendar size={12} /> {t.date}</div>
                <div className="mt-auto flex justify-between items-center">
                  <span className="text-[10px] uppercase font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded">Completed</span>
                  <Link href={`/public/tournaments/details?id=${t.id}`} className="text-xs font-semibold text-sky-500 hover:text-sky-400 flex items-center gap-1">
                    View <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Footer note */}
      <div className="tournaments-footer-note">
        <Info size={14} />
        <span>
          All registrations are processed through our official registration
          portal. For inquiries, contact us at{' '}
          <a href="mailto:karatetech@gmail.com">karatetech@gmail.com</a>
        </span>
      </div>

      {/* Public Footer */}
      <footer className="max-w-4xl mx-auto py-8 text-center text-xs text-slate-500 border-t border-white/5 mt-6 space-y-1">
        <div className="font-bold text-slate-400">© 2026 KarateTech</div>
        <div>Developed by <span className="font-semibold text-slate-350">SP SportData Solution</span></div>
        <div className="text-[11px] text-slate-500">(Professional Karate Tournament Management System)</div>
        <div className="text-[11px] text-slate-550">All Rights Reserved.</div>
      </footer>

      {/* Back link */}
      <div className="tournaments-back">
        <Link href="/public/past-tournaments" className="tournaments-back__link">
          <ArrowLeft size={14} />
          View Past Tournaments Archive
        </Link>
      </div>
    </div>
  );
}
