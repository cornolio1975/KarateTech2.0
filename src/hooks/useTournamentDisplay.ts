'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/db/dbClient';
import { mockStore } from '@/db/mockStore';
import { Tournament, Bout, Category, Participant, Club, DisplayPlaylist, TournamentDatabase } from '@/db/types';

export interface TournamentDisplayData {
  tournament: Tournament | null;
  bouts: Bout[];
  categories: Category[];
  participants: Participant[];
  clubs: Club[];
  playlists: DisplayPlaylist[];
  loading: boolean;
  error: string | null; // 'not_found' | 'archived' | 'load_error' | null
}

export function useTournamentDisplay(tournamentId: string | null): TournamentDisplayData {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [bouts, setBouts] = useState<Bout[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [playlists, setPlaylists] = useState<DisplayPlaylist[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!tournamentId) {
      setTournament(null);
      setBouts([]);
      setCategories([]);
      setParticipants([]);
      setClubs([]);
      setPlaylists([]);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        if (supabase) {
          // 1. Load tournament record
          const { data: tData, error: tErr } = await supabase
            .from('tournaments')
            .select('*')
            .eq('id', tournamentId)
            .maybeSingle();

          if (tErr) throw tErr;
          if (!tData) {
            if (!cancelled) { setError('not_found'); setLoading(false); }
            return;
          }
          if (tData.status === 'Archived' || tData.status === 'Deleted') {
            if (!cancelled) { setError('archived'); setLoading(false); }
            return;
          }
          if (!cancelled) setTournament(tData as Tournament);

          const tournamentDb = (tData.data as TournamentDatabase | undefined) || null;
          const tournamentPlaylists = tournamentDb?.display_playlists || [];

          // 2. Load related data — try tournament_id scoped queries, fall back if column missing
          const tryQuery = async (
            table: string,
            tourIdFilter: boolean,
            extra?: (q: any) => any
          ) => {
            let q = supabase!.from(table).select('*');
            if (tourIdFilter) q = q.eq('tournament_id', tournamentId);
            if (extra) q = extra(q);
            const res = await q;
            if (res.error && res.error.code === '42703') {
              // column does not exist — fall back to unfiltered query
              let fallback = supabase!.from(table).select('*');
              if (extra) fallback = extra(fallback);
              const fb = await fallback;
              return fb.data || [];
            }
            return res.data || [];
          };

          const [boutsData, catsData, partsData, clubsData] = await Promise.all([
            tryQuery('bouts', true),
            tryQuery('categories', true, q => q.order('name')),
            tryQuery('participants', true, q => q.is('deleted_at', null)),
            tryQuery('clubs', false, q => q.order('name')),
          ]);

          if (cancelled) return;
          setBouts(boutsData);
          setCategories(catsData);
          setParticipants(partsData);
          setClubs(clubsData);
          setPlaylists(tournamentPlaylists);

        } else {
          // Offline / mock store fallback — no tournament isolation in mock
          if (!cancelled) {
            setTournament({
              id: tournamentId,
              name: 'Demo Tournament',
              organizer: 'KarateTech',
              date: new Date().toLocaleDateString(),
              date_iso: new Date().toISOString(),
              venue: 'Sports Hall',
              city: 'Kuala Lumpur',
              registration_close: '',
              registration_close_iso: '',
              status: 'Active',
            });
            setBouts(mockStore.bouts.list());
            setCategories(mockStore.categories.list());
            setParticipants(mockStore.participants.list());
            setClubs(mockStore.clubs.list());
            setPlaylists((mockStore as any).displayPlaylists?.list?.() || []);
          }
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error('[useTournamentDisplay] load error:', err);
          setError('load_error');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    // Supabase Realtime — subscribe to bout updates scoped to this tournament
    if (supabase) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      const ch = supabase
        .channel(`tournament-display-bouts-${tournamentId}`)
        .on(
          'postgres_changes' as any,
          {
            event: '*',
            schema: 'public',
            table: 'bouts',
            filter: `tournament_id=eq.${tournamentId}`,
          },
          (payload: any) => {
            if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
              const updated = payload.new as Bout;
              setBouts(prev => {
                const idx = prev.findIndex(b => b.id === updated.id);
                if (idx >= 0) {
                  const next = [...prev];
                  next[idx] = updated;
                  return next;
                }
                return [...prev, updated];
              });
            } else if (payload.eventType === 'DELETE') {
              const deleted = payload.old as Bout;
              setBouts(prev => prev.filter(b => b.id !== deleted.id));
            }
          }
        )
        .subscribe();

      channelRef.current = ch;
    }

    return () => {
      cancelled = true;
      if (supabase && channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [tournamentId]);

  return { tournament, bouts, categories, participants, clubs, playlists, loading, error };
}
