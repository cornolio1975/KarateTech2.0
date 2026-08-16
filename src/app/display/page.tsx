'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { db, supabase, basePath, dbManager } from '@/db/dbClient';
import { Bout, Participant, Category, Club, DisplayPlaylist, DisplayPlaylistSlide, TournamentDatabase, isKataCategory } from '@/db/types';
import { ShieldAlert, Zap, Award, Trophy, Volume2, Maximize2, Minimize2, Play, Pause, SkipForward, SkipBack, Monitor, Clock, Layers, Calendar, Flag, UserSquare2, X, Users, Globe } from 'lucide-react';
import { useTournament } from '@/context/TournamentContext';
import { localStore } from '@/db/localStore';

interface SponsorTickerItem {
  id: string;
  name: string;
  logo_url: string;
  website_url?: string;
  active: boolean;
  order: number;
}

const extractSponsorsFromSource = (source: unknown): SponsorTickerItem[] => {
  const rawSponsors = (
    (source as { tournament?: { settings?: { sponsors?: unknown } } } | null | undefined)?.tournament?.settings?.sponsors
    ?? (source as { settings?: { sponsors?: unknown } } | null | undefined)?.settings?.sponsors
    ?? (source as { data?: { tournament?: { settings?: { sponsors?: unknown } }; settings?: { sponsors?: unknown } } } | null | undefined)?.data?.tournament?.settings?.sponsors
    ?? (source as { data?: { settings?: { sponsors?: unknown } } } | null | undefined)?.data?.settings?.sponsors
  );

  if (!Array.isArray(rawSponsors)) {
    return [];
  }

  return rawSponsors
    .map((item, idx) => {
      const sponsor = item as Partial<SponsorTickerItem>;
      return {
        id: sponsor.id || `sponsor-${idx}`,
        name: sponsor.name || 'Unnamed Sponsor',
        logo_url: sponsor.logo_url || '',
        website_url: sponsor.website_url || '',
        active: sponsor.active !== false,
        order: typeof sponsor.order === 'number' ? sponsor.order : idx
      } satisfies SponsorTickerItem;
    })
    .filter(sponsor => sponsor.active)
    .sort((a, b) => a.order - b.order);
};

const ScaleWrapper = ({ children }: { children: React.ReactNode }) => {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const handleResize = () => {
      const scaleX = window.innerWidth / 1920;
      const scaleY = window.innerHeight / 1080;
      setScale(Math.min(scaleX, scaleY));
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center overflow-hidden z-0">
      <div style={{ width: 1920, height: 1080, transform: `scale(${scale})`, transformOrigin: 'center center', position: 'relative' }}>
        {children}
      </div>
    </div>
  );
};

function SpectatorDisplayContent() {
  const searchParams = useSearchParams();
  const urlTournamentId = searchParams.get('tournament');
  const urlBoutId = searchParams.get('boutId');
  const urlPlaylistId = searchParams.get('playlistId');
  const forceLiveOnly = searchParams.get('liveOnly') === 'true' || Boolean(urlBoutId);

  const [activeBoutId, setActiveBoutId] = useState<string | null>(null);
  const { tournamentName } = useTournament();

  // Playlist Presentation Engine States
  const [playlists, setPlaylists] = useState<DisplayPlaylist[]>([]);
  const [activePlaylist, setActivePlaylist] = useState<DisplayPlaylist | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [slideTimeLeft, setSlideTimeLeft] = useState<number>(25);
  const [isPlaylistPaused, setIsPlaylistPaused] = useState<boolean>(false);

  // General Presentation Data
  const [allBouts, setAllBouts] = useState<Bout[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [allParticipants, setAllParticipants] = useState<Participant[]>([]);
  const [allClubs, setAllClubs] = useState<Club[]>([]);
  const [sponsors, setSponsors] = useState<SponsorTickerItem[]>([]);

  // Sync activeBoutId & mode & panelSize with URL query params initially or when they change

  useEffect(() => {
    if (urlBoutId) {
      setActiveBoutId(urlBoutId);
    }
    const urlMode = searchParams.get('mode');
    if (urlMode === 'Flags' || urlMode === 'flags') {
      setScoringMethod('Flags');
    } else if (urlMode === 'Points' || urlMode === 'points') {
      setScoringMethod('Points');
    }
    const urlPanelSize = searchParams.get('panelSize');
    if (urlPanelSize) {
      const parsed = parseInt(urlPanelSize);
      if (parsed === 5 || parsed === 7) setPanelSize(parsed);
    }
  }, [urlBoutId, searchParams]);

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);

  // Competitor info
  const [akaName, setAkaName] = useState<string>('TBD Red');
  const [akaClub, setAkaClub] = useState<string>('Senshi Karate Academy');
  const [aoName, setAoName] = useState<string>('TBD Blue');
  const [aoClub, setAoClub] = useState<string>('Goju-Ryu Karate Club');

  // Match details
  const [categoryName, setCategoryName] = useState<string>('Kumite Championship');
  const [tatamiName, setTatamiName] = useState<string>('Tatami 1');
  const [boutNo, setBoutNo] = useState<number>(1);
  const [roundNo, setRoundNo] = useState<number>(1);

  // Set window title dynamically
  useEffect(() => {
    document.title = `Referee View, ${tatamiName} , Round ${roundNo} , Bout ${boutNo}`;
  }, [tatamiName, roundNo, boutNo]);

  // Live scoreboard states
  const [scoreAka, setScoreAka] = useState<number>(0);
  const [scoreAo, setScoreAo] = useState<number>(0);
  const [senshuAka, setSenshuAka] = useState<boolean>(false);
  const [senshuAo, setSenshuAo] = useState<boolean>(false);
  const [penaltiesAka, setPenaltiesAka] = useState<string[]>([]);
  const [penaltiesAo, setPenaltiesAo] = useState<string[]>([]);

  // Detailed WKF warnings states: C1, C2, C3, HC, H (1 to 5)
  const [c1Aka, setC1Aka] = useState<number>(0);
  const [c1Ao, setC1Ao] = useState<number>(0);
  const [eventsAka, setEventsAka] = useState<{ fighter: string; points: number; technique: string; timestamp: number; matchId: string }[]>([]);
  const [eventsAo, setEventsAo] = useState<{ fighter: string; points: number; technique: string; timestamp: number; matchId: string }[]>([]);
  const [showPointHistory, setShowPointHistory] = useState(false);

  // Kata spectator states
  const [isKata, setIsKata] = useState<boolean>(false);
  const [kataA, setKataA] = useState<string>('');
  const [kataB, setKataB] = useState<string>('');
  const [judgeScoresA, setJudgeScoresA] = useState<number[]>([]);
  const [judgeScoresB, setJudgeScoresB] = useState<number[]>([]);
  const [panelSize, setPanelSize] = useState<number>(5);
  const [scoringMethod, setScoringMethod] = useState<'Points' | 'Flags'>('Flags');
  const [penaltyH, setPenaltyH] = useState<'AKA' | 'AO' | null>(null);

  const getScoreStatusIndex = (scores: number[], index: number) => {
    if (!scores || scores.length < 3) return 'active';
    const sorted = [...scores].sort((a, b) => a - b);
    const minVal = sorted[0];
    const maxVal = sorted[sorted.length - 1];

    const val = scores[index];
    if (val === minVal && scores.indexOf(val) === index) return 'min';
    if (val === maxVal && scores.lastIndexOf(val) === index) return 'max';
    return 'active';
  };

  // Timer states
  const [timeLeft, setTimeLeft] = useState<number>(1800);
  const [timerActive, setTimerActive] = useState<boolean>(false);

  // Winner banner & result confirmation
  const [winnerSide, setWinnerSide] = useState<'aka' | 'ao' | null>(null);
  const [winMethod, setWinMethod] = useState<string>('');
  const [resultConfirmed, setResultConfirmed] = useState<boolean>(false);

  // Player Details presentation slide on Referee Screen
  const [showPlayerDetails, setShowPlayerDetails] = useState<boolean>(false);
  const [playerDetailsPayload, setPlayerDetailsPayload] = useState<any>(null);

  // Extra / Break Timer on Referee Screen
  const [showExtraTimer, setShowExtraTimer] = useState<boolean>(false);
  const [extraTimerSeconds, setExtraTimerSeconds] = useState<number>(300);
  const [extraTimerIsRunning, setExtraTimerIsRunning] = useState<boolean>(false);

  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const soundBuzzerRef = useRef<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const hideControlsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const soundPlayedRef = useRef<string | null>(null);

  const parseJudgeScores = (scores: any) => {
    if (!scores) return null;
    if (Array.isArray(scores)) return scores;
    if (typeof scores === 'string') {
      try {
        return JSON.parse(scores);
      } catch {
        const cleaned = scores.replace(/^{|}$|\[|\]/g, '').trim();
        if (cleaned) return cleaned.split(',').map(Number);
      }
    }
    return null;
  };

  const inferKataScoringMethod = (scoresA: number[] | null, scoresB: number[] | null) => {
    if (!scoresA?.length || !scoresB?.length) return null;
    const isFlags = scoresA.every(score => score === 0 || score === 1)
      && scoresB.every(score => score === 0 || score === 1);
    return isFlags ? 'Flags' : 'Points';
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Auto-hide controls after 3s idle
  const resetHideTimer = () => {
    setShowControls(true);
    if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current);
    hideControlsTimerRef.current = setTimeout(() => setShowControls(false), 3000);
  };

  useEffect(() => {
    resetHideTimer();
    return () => { if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current); };
  }, []);

  // Load Playlist & Presentation Data
  useEffect(() => {
    const loadPresentationData = async () => {
      try {
        let plList: DisplayPlaylist[] = [], bList: Bout[] = [], cList: Category[] = [], pList: Participant[] = [], clList: Club[] = [];
        let sponsorList: SponsorTickerItem[] = [];

        if (urlTournamentId) {
          const localTournamentDb = await localStore.loadTournament(urlTournamentId);
          if (localTournamentDb) {
            sponsorList = extractSponsorsFromSource(localTournamentDb);
          }
        }

        let loadedFromCloud = false;
        if (supabase && urlTournamentId) {
          try {
            const { data: tournamentRow, error: tournamentError } = await supabase
              .from('tournaments')
              .select('*')
              .eq('id', urlTournamentId)
              .maybeSingle();

            if (!tournamentError && tournamentRow) {
              const tournamentDb = (tournamentRow.data as TournamentDatabase | undefined) || null;
              if (
                tournamentDb
                && tournamentRow.status
                && !['Archived', 'Deleted'].includes(tournamentRow.status)
                && !tournamentRow.deleted_at
              ) {
                plList = tournamentDb.display_playlists || [];
                bList = tournamentDb.bouts || [];
                cList = tournamentDb.categories || [];
                pList = (tournamentDb.participants || []).filter(participant => !participant.deleted_at);
                clList = tournamentDb.clubs || [];
                sponsorList = extractSponsorsFromSource(tournamentDb);
                loadedFromCloud = true;
              }
            }
          } catch (cloudErr) {
            console.warn('Cloud tournament query notice (falling back to local):', cloudErr);
          }
        }

        if (!loadedFromCloud) {
          if (urlTournamentId) {
            const localTournamentDb = await localStore.loadTournament(urlTournamentId);
            if (localTournamentDb) {
              plList = localTournamentDb.display_playlists || [];
              bList = localTournamentDb.bouts || [];
              cList = localTournamentDb.categories || [];
              pList = (localTournamentDb.participants || []).filter(participant => !participant.deleted_at);
              clList = localTournamentDb.clubs || [];
              sponsorList = extractSponsorsFromSource(localTournamentDb);
            } else {
              [plList, bList, cList, pList, clList] = await Promise.all([
                db.displayPlaylists.list(),
                db.bouts.list(),
                db.categories.list(),
                db.participants.list(),
                db.clubs.list()
              ]);
              const activeDb = dbManager.getActiveTournament();
              if (activeDb) sponsorList = extractSponsorsFromSource(activeDb);
            }
          } else {
            [plList, bList, cList, pList, clList] = await Promise.all([
              db.displayPlaylists.list(),
              db.bouts.list(),
              db.categories.list(),
              db.participants.list(),
              db.clubs.list()
            ]);
            const activeDb = dbManager.getActiveTournament();
            if (activeDb) sponsorList = extractSponsorsFromSource(activeDb);
          }
        }
        setPlaylists(plList);
        setAllBouts(bList);
        setAllCategories(cList);
        setAllParticipants(pList);
        setAllClubs(clList);
        setSponsors(sponsorList);

        if (forceLiveOnly) {
          // Keep display on the active live scoreboard and ignore playlist slides.
          setActivePlaylist(null);
          setCurrentSlideIndex(0);
          setSlideTimeLeft(25);
        } else if (urlPlaylistId) {
          const targetPl = plList.find(p => p.id === urlPlaylistId);
          if (targetPl) {
            setActivePlaylist(targetPl);
            setCurrentSlideIndex(0);
            setSlideTimeLeft(targetPl.slides[0]?.duration_seconds || 25);
          }
        } else {
          // Auto-load the active playlist for viewers if no specific ID provided
          const activePl = plList.find(p => p.is_active) || plList[0];
          if (activePl) {
            setActivePlaylist(activePl);
            setCurrentSlideIndex(0);
            setSlideTimeLeft(activePl.slides[0]?.duration_seconds || 25);
          }
        }
      } catch (err: any) {
        console.error('Error loading presentation data:', err?.message || err);
        console.error('Full error object:', err);
      }
    };
    loadPresentationData();
  }, [forceLiveOnly, urlPlaylistId, urlTournamentId]);

  // Playlist Slide Rotation Timer Effect
  useEffect(() => {
    // Pause rotation if user paused manually or if a winner is actively being displayed
    if (!activePlaylist || !activePlaylist.slides || activePlaylist.slides.length === 0 || isPlaylistPaused || winnerSide) return;

    const timer = setInterval(() => {
      setSlideTimeLeft((prev) => {
        if (prev <= 1) {
          return 0; // Trigger effect below
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activePlaylist, isPlaylistPaused, winnerSide]);

  useEffect(() => {
    if (slideTimeLeft === 0 && activePlaylist && activePlaylist.slides.length > 0 && !isPlaylistPaused && !winnerSide) {
      const nextIdx = (currentSlideIndex + 1) % activePlaylist.slides.length;
      setCurrentSlideIndex(nextIdx);
      setSlideTimeLeft(activePlaylist.slides[nextIdx]?.duration_seconds || 25);
    }
  }, [slideTimeLeft, activePlaylist, currentSlideIndex, isPlaylistPaused, winnerSide]);

  // Force jump to the live_scoreboard slide when a winner is declared so spectators can see it
  useEffect(() => {
    if (winnerSide && activePlaylist && activePlaylist.slides) {
      const liveSlideIndex = activePlaylist.slides.findIndex(s => s.type === 'live_scoreboard');
      if (liveSlideIndex !== -1 && currentSlideIndex !== liveSlideIndex) {
        setCurrentSlideIndex(liveSlideIndex);
        setSlideTimeLeft(activePlaylist.slides[liveSlideIndex]?.duration_seconds || 25);
      }
    }
  }, [winnerSide, activePlaylist, currentSlideIndex]);

  const handleNextSlide = () => {
    if (!activePlaylist || !activePlaylist.slides.length) return;
    const nextIdx = (currentSlideIndex + 1) % activePlaylist.slides.length;
    setCurrentSlideIndex(nextIdx);
    setSlideTimeLeft(activePlaylist.slides[nextIdx]?.duration_seconds || 25);
  };

  const handlePrevSlide = () => {
    if (!activePlaylist || !activePlaylist.slides.length) return;
    const prevIdx = (currentSlideIndex - 1 + activePlaylist.slides.length) % activePlaylist.slides.length;
    setCurrentSlideIndex(prevIdx);
    setSlideTimeLeft(activePlaylist.slides[prevIdx]?.duration_seconds || 25);
  };

  // Trigger Superior Points fanfare or Hansoku alarm when winner is declared
  useEffect(() => {
    if (winnerSide && winMethod === 'HANSOKU' && soundPlayedRef.current !== winnerSide + '-hansoku') {
      soundPlayedRef.current = winnerSide + '-hansoku';
      playHansokuAlarm();
    } else if (winnerSide && winMethod === 'Superior Points' && soundPlayedRef.current !== winnerSide + '-superior') {
      soundPlayedRef.current = winnerSide + '-superior';
      playSuperiorPointsSound();
    } else if (!winnerSide) {
      soundPlayedRef.current = null;
    }
  }, [winnerSide, winMethod]);

  // Web Audio buzzer sound
  const playBuzzer = () => {
    if (!soundBuzzerRef.current) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(320, audioCtx.currentTime); // Deep buzzer tone
      
      gainNode.gain.setValueAtTime(0.8, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.2);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 1.2);
    } catch (err) {
      console.warn('Audio Context error:', err);
    }
  };

  const playBeep = () => {
    if (!soundBuzzerRef.current) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const playBellRing = (startTime: number) => {
        const gainNode = audioCtx.createGain();
        gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime + startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + startTime + 0.6);
        gainNode.connect(audioCtx.destination);

        const freqs = [880, 1200, 1760];
        freqs.forEach((f) => {
          const osc = audioCtx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, audioCtx.currentTime + startTime);
          osc.connect(gainNode);
          osc.start(audioCtx.currentTime + startTime);
          osc.stop(audioCtx.currentTime + startTime + 0.6);
        });
      };

      playBellRing(0);
      playBellRing(0.4);
      playBellRing(0.8);
    } catch (err) {
      console.warn('Audio Context error:', err);
    }
  };

  const playSuperiorPointsSound = () => {
    if (!soundBuzzerRef.current) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const playTone = (freq: number, start: number, duration: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + start);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + start + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime + start);
        osc.stop(audioCtx.currentTime + start + duration);
      };

      playTone(523.25, 0, 0.15);
      playTone(659.25, 0.15, 0.15);
      playTone(783.99, 0.3, 0.15);
      playTone(1046.50, 0.45, 0.35);
    } catch (err) {
      console.warn('Audio Context sound error:', err);
    }
  };

  const playHansokuAlarm = () => {
    if (!soundBuzzerRef.current) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const playAlarmTone = (start: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, audioCtx.currentTime + start);
        gain.gain.setValueAtTime(0.8, audioCtx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + start + 0.4);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime + start);
        osc.stop(audioCtx.currentTime + start + 0.4);
      };

      playAlarmTone(0);
      playAlarmTone(0.5);
      playAlarmTone(1.0);
    } catch (err) {
      console.warn('Alarm sound error:', err);
    }
  };

  // Setup broadcast channel receiver
  useEffect(() => {
    setMounted(true);
    
    if (typeof window !== 'undefined') {
      const channel = new BroadcastChannel('wkf-scoreboard-sync');
      broadcastChannelRef.current = channel;

      const isStream = searchParams.get('stream') === 'true' || searchParams.get('overlay') === 'true';
      const key = isStream ? 'ts_show_point_history_stream' : 'ts_show_point_history_public';
      setShowPointHistory(searchParams.get('history') === 'true' || localStorage.getItem(key) === 'true');

      // Send initial connect notification
      channel.postMessage({ type: 'SPECTATOR_CONNECTED' });

      const handleUnload = () => {
        channel.postMessage({ type: 'SPECTATOR_DISCONNECTED' });
      };
      window.addEventListener('beforeunload', handleUnload);

      channel.onmessage = (event) => {
        const data = event.data;

        // Respond to heartbeat pings from the controller
        if (data.type === 'PING') {
          channel.postMessage({ type: 'PONG' });
          return;
        }

        if (data.type === 'MATCH_FINISHED') {
          setWinnerSide(data.winnerSide);
          setWinMethod('Completed');
          playBuzzer();
          return;
        }

        if (data.type === 'CLOSE_DISPLAY') {
          window.close();
          return;
        }

        if (data.type === 'SHOW_PLAYER_DETAILS') {
          setShowPlayerDetails(Boolean(data.show));
          if (data.show) {
            setPlayerDetailsPayload(data);
          }
          return;
        }

        if (data.type === 'EXTRA_TIMER_TICK') {
          setShowExtraTimer(Boolean(data.show));
          if (data.extraTime !== undefined) setExtraTimerSeconds(data.extraTime);
          if (data.extraRunning !== undefined) setExtraTimerIsRunning(data.extraRunning);
          return;
        }

        if (data.type === 'SHOW_RESULT' || data.type === 'REFRESH_DISPLAY') {
          setShowPlayerDetails(false);
          setShowExtraTimer(false);
          if (data.boutId && data.boutId !== activeBoutId) {
            setActiveBoutId(data.boutId);
          }
          if (data.scoreAka !== undefined) setScoreAka(data.scoreAka);
          if (data.scoreAo !== undefined) setScoreAo(data.scoreAo);
          if (data.senshuAka !== undefined) setSenshuAka(data.senshuAka);
          if (data.senshuAo !== undefined) setSenshuAo(data.senshuAo);
          if (data.c1Aka !== undefined) setC1Aka(data.c1Aka);
          if (data.c1Ao !== undefined) setC1Ao(data.c1Ao);
          if (data.winnerSide !== undefined || data.winner !== undefined) {
            setWinnerSide(data.winnerSide || data.winner);
          }
          if (data.winMethod !== undefined) {
            setWinMethod(data.winMethod);
          }
          if (data.resultConfirmed !== undefined) {
            setResultConfirmed(data.resultConfirmed);
          }
          fetchBout();
          return;
        }

        if (data.boutId) {
          // If the controller shifted to a new match, update our active target boutId
          if (data.boutId !== activeBoutId) {
            setActiveBoutId(data.boutId);
          }

          if (data.isKata !== undefined) {
            setIsKata(data.isKata);
          } else if (data.kataA || data.judgeScoresA) {
            setIsKata(true);
          }

          if (data.kataA !== undefined) setKataA(data.kataA);
          if (data.kataB !== undefined) setKataB(data.kataB);

          if (data.judgeScoresA) {
            const pA = parseJudgeScores(data.judgeScoresA);
            if (pA) setJudgeScoresA(pA);
          }
          if (data.judgeScoresB) {
            const pB = parseJudgeScores(data.judgeScoresB);
            if (pB) setJudgeScoresB(pB);
          }
          if (data.panelSize !== undefined) setPanelSize(data.panelSize);
          if (data.scoringMethod !== undefined) setScoringMethod(data.scoringMethod);

          if (data.akaName !== undefined && data.akaName !== null) setAkaName(data.akaName);
          if (data.akaClub !== undefined && data.akaClub !== null) setAkaClub(data.akaClub);
          if (data.aoName !== undefined && data.aoName !== null) setAoName(data.aoName);
          if (data.aoClub !== undefined && data.aoClub !== null) setAoClub(data.aoClub);
          if (data.scoreAka !== undefined && data.scoreAka !== null) setScoreAka(data.scoreAka);
          if (data.scoreAo !== undefined && data.scoreAo !== null) setScoreAo(data.scoreAo);
          if (data.senshuAka !== undefined && data.senshuAka !== null) setSenshuAka(data.senshuAka);
          if (data.senshuAo !== undefined && data.senshuAo !== null) setSenshuAo(data.senshuAo);
          if (data.penaltiesAka !== undefined) setPenaltiesAka(data.penaltiesAka || []);
          if (data.penaltiesAo !== undefined) setPenaltiesAo(data.penaltiesAo || []);
          if (data.c1Aka !== undefined && data.c1Aka !== null) setC1Aka(data.c1Aka);
          if (data.c1Ao !== undefined && data.c1Ao !== null) setC1Ao(data.c1Ao);
          if (data.eventsAka !== undefined) setEventsAka(data.eventsAka || []);
          if (data.eventsAo !== undefined) setEventsAo(data.eventsAo || []);
          if (data.timeLeft !== undefined && data.timeLeft !== null) setTimeLeft(data.timeLeft);
          if (data.timerActive !== undefined && data.timerActive !== null) setTimerActive(data.timerActive);

          if (data.showPointHistory !== undefined) {
            setShowPointHistory(data.showPointHistory || searchParams.get('history') === 'true');
          }
          if (data.winner !== undefined) setWinnerSide(data.winner);
          if (data.winMethod !== undefined && data.winMethod !== null) setWinMethod(data.winMethod);
          if (data.resultConfirmed !== undefined && data.resultConfirmed !== null) {
            setResultConfirmed(data.resultConfirmed);
          }
          if (data.penaltyH !== undefined) setPenaltyH(data.penaltyH);
        }
      };

      return () => {
        window.removeEventListener('beforeunload', handleUnload);
        channel.postMessage({ type: 'SPECTATOR_DISCONNECTED' });
        channel.close();
      };
    }
  }, [activeBoutId, searchParams]);

  // Fetch bout data from Database client
  const fetchBout = useCallback(async () => {
    if (!activeBoutId) return;
    try {
      setLoading(true);
      const [boutsList, partsList, categoriesList] = await Promise.all([
        db.bouts.list(),
        db.participants.list(),
        db.categories.list()
      ]);

      const bout = boutsList.find(b => b.id === activeBoutId);
      if (bout) {
        const compAka = partsList.find(p => p.id === bout.participant_a_id);
        const compAo = partsList.find(p => p.id === bout.participant_b_id);
        const cat = categoriesList.find(c => c.id === bout.category_id);

        const kataBout = isKataCategory(cat);
        setIsKata(kataBout);

        if (kataBout) {
          setKataA(bout.kata_a || '');
          setKataB(bout.kata_b || '');
          
          const parsedA = parseJudgeScores(bout.judge_scores_a);
          if (parsedA) setJudgeScoresA(parsedA);
          
          const parsedB = parseJudgeScores(bout.judge_scores_b);
          if (parsedB) setJudgeScoresB(parsedB);

          const inferredMethod = inferKataScoringMethod(parsedA, parsedB);
          if (inferredMethod) setScoringMethod(inferredMethod);
          const inferredPanelSize = parsedA?.length || parsedB?.length;
          if (inferredPanelSize === 5 || inferredPanelSize === 7) setPanelSize(inferredPanelSize);
          
          setScoreAka(bout.total_score_a || bout.score_a || 0);
          setScoreAo(bout.total_score_b || bout.score_b || 0);
        }

        if ((bout.status === 'Completed' || bout.winner_id) && bout.winner_id) {
          setWinnerSide(bout.winner_id === compAka?.id ? 'aka' : bout.winner_id === compAo?.id ? 'ao' : null);
          setWinMethod(bout.victory_method || (bout.status === 'Completed' ? 'Completed' : 'Winner Declared'));
          setResultConfirmed(bout.status === 'Completed');
          if (bout.victory_method?.includes('Penalty AKA')) setPenaltyH('AKA');
          else if (bout.victory_method?.includes('Penalty AO')) setPenaltyH('AO');
          else setPenaltyH(null);
        } else {
          setWinnerSide(null);
          setWinMethod('');
          setPenaltyH(null);
          setResultConfirmed(false);
        }

        setAkaName(compAka?.full_name || 'TBD Red');
        setAkaClub(compAka?.club_id ? 'Senshi Karate Academy' : 'Senshi Club');
        setAoName(compAo?.full_name || 'TBD Blue');
        setAoClub(compAo?.club_id ? 'Goju-Ryu Karate Club' : 'Goju-Ryu Club');
        
        setCategoryName(cat?.name || 'Kumite Open Division');
        setTatamiName(bout.tatami || 'Tatami 1');
        setBoutNo(bout.bout_no);
        setRoundNo(bout.round_no);

        if (!kataBout) {
          setScoreAka(bout.score_a ?? 0);
          setScoreAo(bout.score_b ?? 0);
        }
        setSenshuAka(bout.senshu_a ?? false);
        setSenshuAo(bout.senshu_b ?? false);
        let parsedEventsAka: { fighter: string; points: number; technique: string; timestamp: number; matchId: string }[] = [];
        let parsedEventsAo: { fighter: string; points: number; technique: string; timestamp: number; matchId: string }[] = [];

        if (bout.points_aka_history) {
          if (bout.points_aka_history.startsWith('[')) {
            try {
              parsedEventsAka = JSON.parse(bout.points_aka_history);
            } catch (e) {
              console.error(e);
            }
          } else {
            const pointsList = bout.points_aka_history.split(',').map(Number).filter(Boolean);
            parsedEventsAka = pointsList.map((pts: number) => ({
              fighter: 'AKA',
              points: pts,
              technique: pts === 1 ? 'Yuko' : pts === 2 ? 'Waza-ari' : pts === 3 ? 'Ippon' : 'Point',
              timestamp: 0,
              matchId: bout.id
            }));
          }
        }

        if (bout.points_ao_history) {
          if (bout.points_ao_history.startsWith('[')) {
            try {
              parsedEventsAo = JSON.parse(bout.points_ao_history);
            } catch (e) {
              console.error(e);
            }
          } else {
            const pointsList = bout.points_ao_history.split(',').map(Number).filter(Boolean);
            parsedEventsAo = pointsList.map((pts: number) => ({
              fighter: 'AO',
              points: pts,
              technique: pts === 1 ? 'Yuko' : pts === 2 ? 'Waza-ari' : pts === 3 ? 'Ippon' : 'Point',
              timestamp: 0,
              matchId: bout.id
            }));
          }
        }

        setEventsAka(parsedEventsAka);
        setEventsAo(parsedEventsAo);
        setPenaltiesAka(bout.penalties_a ? bout.penalties_a.split(',').filter(Boolean) : []);
        setPenaltiesAo(bout.penalties_b ? bout.penalties_b.split(',').filter(Boolean) : []);
        
        setC1Aka(bout.penalties_c1_a ? parseInt(bout.penalties_c1_a) || 0 : 0);
        setC1Ao(bout.penalties_c1_b ? parseInt(bout.penalties_c1_b) || 0 : 0);

        setTimeLeft((bout.timer_seconds ?? 180) * 10);
        setTimerActive(bout.timer_active ?? false);
      }
    } catch (e) {
      console.error('Fetch bout error:', e);
    } finally {
      setLoading(false);
    }
  }, [activeBoutId]);

  useEffect(() => {
    if (!mounted || !activeBoutId) return;
    fetchBout();
  }, [mounted, activeBoutId, fetchBout]);

  // Supabase Realtime fallback subscription
  useEffect(() => {
    if (!supabase || !activeBoutId) return;

    const channel = supabase
      .channel(`display-bout-${activeBoutId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bouts', filter: `id=eq.${activeBoutId}` },
        async (payload: any) => {
          const updated = payload.new;
          if (updated) {
            const parsedJudgeScoresA = parseJudgeScores(updated.judge_scores_a);
            const parsedJudgeScoresB = parseJudgeScores(updated.judge_scores_b);
            const isKataUpdate = !!(updated.kata_a || updated.kata_b || parsedJudgeScoresA?.length || parsedJudgeScoresB?.length);

            if (isKataUpdate) {
              setIsKata(true);
              setKataA(updated.kata_a || '');
              setKataB(updated.kata_b || '');
              if (parsedJudgeScoresA) setJudgeScoresA(parsedJudgeScoresA);
              if (parsedJudgeScoresB) setJudgeScoresB(parsedJudgeScoresB);

              const inferredMethod = inferKataScoringMethod(parsedJudgeScoresA, parsedJudgeScoresB);
              if (inferredMethod) setScoringMethod(inferredMethod);
              const inferredPanelSize = parsedJudgeScoresA?.length || parsedJudgeScoresB?.length;
              if (inferredPanelSize === 5 || inferredPanelSize === 7) setPanelSize(inferredPanelSize);

              setScoreAka(updated.total_score_a ?? updated.score_a ?? 0);
              setScoreAo(updated.total_score_b ?? updated.score_b ?? 0);
            } else {
              setScoreAka(updated.score_a ?? 0);
              setScoreAo(updated.score_b ?? 0);
            }
            setSenshuAka(updated.senshu_a ?? false);
            setSenshuAo(updated.senshu_b ?? false);
            let parsedEventsAka: { fighter: string; points: number; technique: string; timestamp: number; matchId: string }[] = [];
            let parsedEventsAo: { fighter: string; points: number; technique: string; timestamp: number; matchId: string }[] = [];

            if (updated.points_aka_history) {
              if (updated.points_aka_history.startsWith('[')) {
                try {
                  parsedEventsAka = JSON.parse(updated.points_aka_history);
                } catch (e) {
                  console.error(e);
                }
              } else {
                const pointsList = updated.points_aka_history.split(',').map(Number).filter(Boolean);
                parsedEventsAka = pointsList.map((pts: number) => ({
                  fighter: 'AKA',
                  points: pts,
                  technique: pts === 1 ? 'Yuko' : pts === 2 ? 'Waza-ari' : pts === 3 ? 'Ippon' : 'Point',
                  timestamp: 0,
                  matchId: activeBoutId!
                }));
              }
            }

            if (updated.points_ao_history) {
              if (updated.points_ao_history.startsWith('[')) {
                try {
                  parsedEventsAo = JSON.parse(updated.points_ao_history);
                } catch (e) {
                  console.error(e);
                }
              } else {
                const pointsList = updated.points_ao_history.split(',').map(Number).filter(Boolean);
                parsedEventsAo = pointsList.map((pts: number) => ({
                  fighter: 'AO',
                  points: pts,
                  technique: pts === 1 ? 'Yuko' : pts === 2 ? 'Waza-ari' : pts === 3 ? 'Ippon' : 'Point',
                  timestamp: 0,
                  matchId: activeBoutId!
                }));
              }
            }

            setEventsAka(parsedEventsAka);
            setEventsAo(parsedEventsAo);
            setPenaltiesAka(updated.penalties_a ? updated.penalties_a.split(',').filter(Boolean) : []);
            setPenaltiesAo(updated.penalties_b ? updated.penalties_b.split(',').filter(Boolean) : []);
            
            setC1Aka(updated.penalties_c1_a ? parseInt(updated.penalties_c1_a) || 0 : 0);
            setC1Ao(updated.penalties_c1_b ? parseInt(updated.penalties_c1_b) || 0 : 0);

            setTimeLeft((updated.timer_seconds ?? 180) * 10);
            setTimerActive(updated.timer_active ?? false);
            
            if (updated.status === 'Completed' || updated.winner_id) {
              setWinnerSide(updated.winner_id === updated.participant_a_id ? 'aka' : 'ao');
              setWinMethod(updated.victory_method || (updated.status === 'Completed' ? 'Completed' : 'Winner Declared'));
              setResultConfirmed(updated.status === 'Completed');
              if (updated.victory_method?.includes('Penalty AKA')) setPenaltyH('AKA');
              else if (updated.victory_method?.includes('Penalty AO')) setPenaltyH('AO');
              else setPenaltyH(null);
              
              if (updated.status === 'Completed') {
                playBuzzer();
              }
            } else {
              setWinnerSide(null);
              setWinMethod('');
              setPenaltyH(null);
              setResultConfirmed(false);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  }, [activeBoutId]);

  // Clock Countdown interval (for displays running timer locally)
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerActive) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setTimerActive(false);
            playBuzzer();
            return 0;
          }
          const nextVal = prev - 1;
          // Beep once when exactly 15 seconds remaining
          if (nextVal === 150) {
            playBeep();
          }
          return nextVal;
        });
      }, 100);
    } else if (interval) {
      clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerActive]);

  // Format countdown clock
  const formatMainTime = (tenths: number) => {
    const mins = Math.floor(tenths / 600);
    const secs = Math.floor((tenths % 600) / 10);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDecsTime = (tenths: number) => {
    const decs = tenths % 10;
    return `.${decs}0`;
  };

  const akaTechniqueCounts = useMemo(() => {
    return eventsAka.reduce(
      (acc, event) => {
        if (event.points === 3) acc.ippon += 1;
        if (event.points === 2) acc.wazaAri += 1;
        if (event.points === 1) acc.yuko += 1;
        return acc;
      },
      { ippon: 0, wazaAri: 0, yuko: 0 }
    );
  }, [eventsAka]);

  const aoTechniqueCounts = useMemo(() => {
    return eventsAo.reduce(
      (acc, event) => {
        if (event.points === 3) acc.ippon += 1;
        if (event.points === 2) acc.wazaAri += 1;
        if (event.points === 1) acc.yuko += 1;
        return acc;
      },
      { ippon: 0, wazaAri: 0, yuko: 0 }
    );
  }, [eventsAo]);

  const akaTwoDigitScore = scoreAka >= 10;
  const aoTwoDigitScore = scoreAo >= 10;

  const akaScoreShiftClass = '';
  const aoScoreShiftClass = '';

  const akaScoreSizeClass = 'text-[130px] lg:text-[194px]';
  const aoScoreSizeClass = 'text-[130px] lg:text-[194px]';

  const akaSummaryBoxClass = akaTwoDigitScore ? 'h-full px-0.5 py-1' : 'h-full px-1 py-1';
  const aoSummaryBoxClass = aoTwoDigitScore ? 'h-full px-0.5 py-1' : 'h-full px-1 py-1';

  const akaSummaryGridClass = akaTwoDigitScore ? 'gap-x-0 text-[8px] lg:text-[10px]' : 'gap-x-0 text-[9px] lg:text-[11px]';
  const aoSummaryGridClass = aoTwoDigitScore ? 'gap-x-0 text-[8px] lg:text-[10px]' : 'gap-x-0 text-[9px] lg:text-[11px]';

  const akaSummaryValueClass = akaTwoDigitScore ? 'px-0 min-w-3.5' : 'px-0.5 min-w-4';
  const aoSummaryValueClass = aoTwoDigitScore ? 'px-0 min-w-3.5' : 'px-0.5 min-w-4';

  const akaSummarySlotClass = akaTwoDigitScore
    ? 'w-[74px] lg:w-[82px] h-[48px] lg:h-[58px]'
    : 'w-[84px] lg:w-[92px] h-[54px] lg:h-[64px]';
  const aoSummarySlotClass = aoTwoDigitScore
    ? 'w-[74px] lg:w-[82px] h-[50px] lg:h-[60px]'
    : 'w-[84px] lg:w-[92px] h-[56px] lg:h-[66px]';

  const currentSlide = activePlaylist?.slides[currentSlideIndex];
  const currentSlideType = currentSlide?.type || 'live_scoreboard';

  const medalStandings = (() => {
    const tally: Record<string, { name: string; gold: number; silver: number; bronze: number }> = {};

    allClubs.forEach(club => {
      tally[club.id] = { name: club.name, gold: 0, silver: 0, bronze: 0 };
    });
    tally.Independent = { name: 'Independent Athletes', gold: 0, silver: 0, bronze: 0 };

    allCategories.forEach(category => {
      const categoryBouts = allBouts.filter(bout => bout.category_id === category.id);
      if (categoryBouts.length === 0) return;

      const isRoundRobin = categoryBouts.length > 1 && categoryBouts.every(bout => bout.round_no === 1);

      if (isRoundRobin) {
        const winsMap: Record<string, number> = {};
        const scoreMap: Record<string, number> = {};

        categoryBouts.forEach(bout => {
          if (bout.winner_id) winsMap[bout.winner_id] = (winsMap[bout.winner_id] || 0) + 1;
          if (bout.participant_a_id) scoreMap[bout.participant_a_id] = (scoreMap[bout.participant_a_id] || 0) + bout.score_a;
          if (bout.participant_b_id) scoreMap[bout.participant_b_id] = (scoreMap[bout.participant_b_id] || 0) + bout.score_b;
        });

        const rankedParticipants = (Array.from(
          new Set(categoryBouts.flatMap(bout => [bout.participant_a_id, bout.participant_b_id]).filter(Boolean))
        ) as string[]).sort((leftId, rightId) => {
          const winDifference = (winsMap[rightId] || 0) - (winsMap[leftId] || 0);
          if (winDifference !== 0) return winDifference;
          return (scoreMap[rightId] || 0) - (scoreMap[leftId] || 0);
        });

        [['gold', rankedParticipants[0]], ['silver', rankedParticipants[1]], ['bronze', rankedParticipants[2]]].forEach(([medal, participantId]) => {
          if (!participantId) return;
          const participant = allParticipants.find(entry => entry.id === participantId);
          const clubKey = participant?.club_id || 'Independent';
          if (tally[clubKey]) tally[clubKey][medal as 'gold' | 'silver' | 'bronze'] += 1;
        });

        return;
      }

      const competitiveRounds = categoryBouts.map(bout => bout.round_no).filter(roundNo => roundNo !== 99);
      const maxRound = Math.max(...competitiveRounds, 0);
      const finalBout = categoryBouts.find(bout => bout.round_no === maxRound);

      if (finalBout && (finalBout.status === 'Completed' || finalBout.status === 'Walkover') && finalBout.winner_id) {
        const goldWinner = allParticipants.find(participant => participant.id === finalBout.winner_id);
        const goldClubKey = goldWinner?.club_id || 'Independent';
        if (tally[goldClubKey]) tally[goldClubKey].gold += 1;

        const silverParticipantId = finalBout.winner_id === finalBout.participant_a_id ? finalBout.participant_b_id : finalBout.participant_a_id;
        if (silverParticipantId) {
          const silverWinner = allParticipants.find(participant => participant.id === silverParticipantId);
          const silverClubKey = silverWinner?.club_id || 'Independent';
          if (tally[silverClubKey]) tally[silverClubKey].silver += 1;
        }
      }

      const bronzeBout = categoryBouts.find(bout => bout.round_no === 99);
      if (bronzeBout && (bronzeBout.status === 'Completed' || bronzeBout.status === 'Walkover') && bronzeBout.winner_id) {
        const bronzeWinner = allParticipants.find(participant => participant.id === bronzeBout.winner_id);
        const bronzeClubKey = bronzeWinner?.club_id || 'Independent';
        if (tally[bronzeClubKey]) tally[bronzeClubKey].bronze += 1;
      }
    });

    return Object.entries(tally)
      .map(([id, value]) => ({ id, ...value, total: value.gold + value.silver + value.bronze }))
      .filter(club => club.total > 0)
      .sort((left, right) => right.gold - left.gold || right.silver - left.silver || right.bronze - left.bronze)
      .slice(0, 5);
  })();

  if (!mounted) return null;

  return (
    <ScaleWrapper>
    <div
      className="h-[1080px] w-[1920px] bg-black text-white flex flex-col overflow-hidden select-none font-sans p-2 lg:p-4 relative"
      onMouseMove={resetHideTimer}
    >
      {/* Top Controls Bar (Playlist & Fullscreen) */}
      <div className={`fixed top-4 left-4 right-4 z-50 flex items-center justify-between pointer-events-none transition-all duration-300 ${
        showControls || !isFullscreen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      }`}>
        {/* Playlist Controls Badge */}
        <div className="flex items-center gap-2 pointer-events-auto">

          {activePlaylist && (
            <div className="flex items-center gap-2.5 bg-black/85 backdrop-blur-md border border-white/20 px-3 py-1.5 rounded-xl text-xs font-bold text-white shadow-2xl">
              <div className="flex items-center gap-1.5 text-yellow-400">
                <Monitor className="h-4 w-4" />
                <span className="max-w-[140px] truncate">{activePlaylist.name}</span>
              </div>
              <span className="text-white/30">|</span>
              <span className="text-white/90">
                SLIDE {currentSlideIndex + 1}/{activePlaylist.slides.length}: {currentSlide?.title}
              </span>
              <span className="bg-yellow-500/20 text-yellow-400 border border-yellow-400/30 px-2 py-0.5 rounded-md font-mono text-[11px] font-black">
                ⏱ {slideTimeLeft}s
              </span>

              <div className="flex items-center gap-1 ml-1 border-l border-white/20 pl-2">
                <button
                  onClick={handlePrevSlide}
                  className="p-1 hover:bg-white/20 rounded text-white cursor-pointer transition"
                  title="Previous Slide"
                >
                  <SkipBack className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setIsPlaylistPaused(!isPlaylistPaused)}
                  className="p-1 hover:bg-white/20 rounded text-yellow-400 cursor-pointer transition"
                  title={isPlaylistPaused ? 'Resume Rotation' : 'Pause Rotation'}
                >
                  {isPlaylistPaused ? <Play className="h-3.5 w-3.5 fill-current" /> : <Pause className="h-3.5 w-3.5 fill-current" />}
                </button>
                <button
                  onClick={handleNextSlide}
                  className="p-1 hover:bg-white/20 rounded text-white cursor-pointer transition"
                  title="Next Slide"
                >
                  <SkipForward className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Floating Fullscreen Button */}
        <button
          onClick={toggleFullscreen}
          className={`pointer-events-auto flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer backdrop-blur-md border shadow-xl ${
            isFullscreen
              ? 'bg-white/10 border-white/20 text-white hover:bg-white/20'
              : 'bg-yellow-400/20 border-yellow-400/40 text-yellow-400 hover:bg-yellow-400/30'
          }`}
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        </button>
      </div>

      {/* RENDER NON-SCOREBOARD PRESENTATION SLIDES */}
      {currentSlideType === 'kata_scoreboard' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-6 bg-gradient-to-b from-slate-950 via-black to-slate-950 rounded-3xl border border-white/10 shadow-2xl my-12">
          <div className="flex items-center gap-3">
            <Award className="h-8 w-8 text-yellow-400" />
            <h2 className="text-3xl font-extrabold uppercase tracking-widest text-yellow-400">WKF 7-Judge Kata Performance</h2>
          </div>

          <div className="grid grid-cols-2 gap-8 w-full max-w-5xl">
            {/* AKA RED KATA */}
            <div className="bg-red-950/40 border-2 border-red-600/50 rounded-2xl p-6 flex flex-col items-center justify-between space-y-4">
              <span className="text-red-400 font-extrabold text-5xl lg:text-7xl tracking-wider">AKA</span>
              <h3 className="text-3xl font-black text-white">{akaName}</h3>
              <p className="text-sm font-bold text-red-300/60 uppercase">{akaClub}</p>
              <div className="w-full bg-red-900/30 p-3 rounded-xl border border-red-500/30 text-center">
                <span className="text-xs text-red-300 font-bold block uppercase mb-1">Total Kata Score</span>
                <span className="text-5xl font-black text-red-400 font-mono">24.65</span>
              </div>
            </div>

            {/* AO BLUE KATA */}
            <div className="bg-blue-950/40 border-2 border-blue-600/50 rounded-2xl p-6 flex flex-col items-center justify-between space-y-4">
              <span className="text-blue-400 font-extrabold text-5xl lg:text-7xl tracking-wider">AO</span>
              <h3 className="text-3xl font-black text-white">{aoName}</h3>
              <p className="text-sm font-bold text-blue-300/60 uppercase">{aoClub}</p>
              <div className="w-full bg-blue-900/30 p-3 rounded-xl border border-blue-500/30 text-center">
                <span className="text-xs text-blue-300 font-bold block uppercase mb-1">Total Kata Score</span>
                <span className="text-5xl font-black text-blue-400 font-mono">25.10</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {currentSlideType === 'bracket' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-6 bg-slate-950/90 rounded-3xl border border-white/10 my-12 overflow-hidden">
          <div className="flex items-center gap-3">
            <Layers className="h-8 w-8 text-yellow-400" />
            <h2 className="text-3xl font-extrabold uppercase tracking-widest text-yellow-400">Live Category Brackets & Progress</h2>
          </div>
          <div className="w-full max-w-5xl bg-secondary/10 border border-white/10 rounded-2xl p-6 text-center space-y-4">
            <h3 className="text-2xl font-black text-white uppercase">{categoryName}</h3>
            <div className="grid grid-cols-3 gap-4 pt-4">
              {allCategories.slice(0, 3).map(cat => (
                <div key={cat.id} className="bg-black/60 border border-white/10 p-4 rounded-xl text-left space-y-2">
                  <span className="text-xs font-bold text-yellow-400 uppercase">{cat.discipline || 'Kumite'}</span>
                  <h4 className="text-sm font-bold text-white truncate">{cat.name}</h4>
                  <div className="flex justify-between text-[11px] text-white/60 font-mono">
                    <span>Status: {cat.status}</span>
                    <span>Max: {cat.capacity || 32}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {currentSlideType === 'medals' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-6 bg-slate-950/90 rounded-3xl border border-white/10 my-12 overflow-hidden">
          <div className="flex items-center gap-3">
            <Trophy className="h-8 w-8 text-yellow-400" />
            <h2 className="text-3xl font-extrabold uppercase tracking-widest text-yellow-400">Club Medal Standings Leaderboard</h2>
          </div>
          <div className="w-full max-w-4xl bg-black/60 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            <div className="grid grid-cols-6 p-4 bg-white/5 font-black text-xs text-white/60 uppercase border-b border-white/10">
              <span className="col-span-3">Dojo / Club Academy</span>
              <span className="text-center text-yellow-400">🥇 Gold</span>
              <span className="text-center text-slate-300">🥈 Silver</span>
              <span className="text-center text-amber-600">🥉 Bronze</span>
            </div>
            <div className="divide-y divide-white/10 text-sm font-bold">
              {medalStandings.length === 0 ? (
                <div className="p-6 text-center text-white/60 font-semibold">
                  No medal results yet. Complete final and bronze bouts to populate the leaderboard.
                </div>
              ) : medalStandings.map((club, idx) => (
                <div key={club.id} className="grid grid-cols-6 p-4 items-center hover:bg-white/5 transition">
                  <span className="col-span-3 text-white font-extrabold">{idx + 1}. {club.name}</span>
                  <span className="text-center font-mono text-yellow-400 font-extrabold">{club.gold}</span>
                  <span className="text-center font-mono text-slate-300">{club.silver}</span>
                  <span className="text-center font-mono text-amber-600">{club.bronze}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {currentSlideType === 'schedule' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-6 bg-slate-950/90 rounded-3xl border border-white/10 my-12 overflow-hidden">
          <div className="flex items-center gap-3">
            <Calendar className="h-8 w-8 text-yellow-400" />
            <h2 className="text-3xl font-extrabold uppercase tracking-widest text-yellow-400">Upcoming Tatami Match Schedule</h2>
          </div>
          <div className="w-full max-w-4xl bg-black/60 border border-white/10 rounded-2xl p-4 divide-y divide-white/10">
            {allBouts.slice(0, 4).map((b) => (
              <div key={b.id} className="py-3 flex items-center justify-between text-sm font-bold">
                <div className="flex items-center gap-3">
                  <span className="text-yellow-400 font-mono text-xs font-black">BOUT #{b.bout_no}</span>
                  <span className="text-white/80">{b.tatami || 'Tatami 1'}</span>
                </div>
                <span className="text-xs bg-white/10 px-3 py-1 rounded-md text-white/70 font-mono">{b.scheduled_time || '09:30 AM'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {currentSlideType === 'announcement' && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-6 bg-gradient-to-br from-yellow-950/40 via-black to-slate-950 rounded-3xl border-2 border-yellow-500/40 shadow-2xl my-12 text-center">
          <Volume2 className="h-16 w-16 text-yellow-400 animate-bounce" />
          <h2 className="text-4xl lg:text-5xl font-black uppercase tracking-widest text-yellow-400 leading-tight">
            {currentSlide?.announcement_text || 'Welcome to KarateTech Open Championship 2026!'}
          </h2>
          <p className="text-lg font-bold text-white/60 uppercase tracking-wider">
            {tournamentName || 'Kelab Karate Do Senshi Goju-Ryu'}
          </p>
        </div>
      )}

      {currentSlideType === 'image' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-4 bg-slate-950/90 rounded-3xl border border-white/10 my-12 overflow-hidden">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-extrabold uppercase tracking-widest text-yellow-400">{currentSlide?.title || 'Image Media'}</h2>
            <p className="text-sm font-semibold text-white/50">Playlist image presentation</p>
          </div>
          {currentSlide?.media_url ? (
            <img
              src={currentSlide.media_url}
              alt={currentSlide.title || 'Playlist image'}
              className="max-h-[756px] max-w-full object-contain rounded-2xl border border-white/10 shadow-2xl"
            />
          ) : (
            <div className="text-sm font-semibold text-white/50">No image URL configured for this slide.</div>
          )}
        </div>
      )}

      {currentSlideType === 'video' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-4 bg-slate-950/90 rounded-3xl border border-white/10 my-12 overflow-hidden">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-extrabold uppercase tracking-widest text-yellow-400">{currentSlide?.title || 'Video Media'}</h2>
            <p className="text-sm font-semibold text-white/50">Playlist video presentation</p>
          </div>
          {currentSlide?.media_url ? (
            <video
              key={currentSlide.id}
              src={currentSlide.media_url}
              className="max-h-[756px] max-w-full rounded-2xl border border-white/10 shadow-2xl bg-black"
              autoPlay
              muted
              loop
              playsInline
              controls
            />
          ) : (
            <div className="text-sm font-semibold text-white/50">No video URL configured for this slide.</div>
          )}
        </div>
      )}

      {/* WKF KATA SPECTATOR DISPLAY */}
      {currentSlideType === 'live_scoreboard' && isKata && (
        <div className={`flex-1 flex flex-col justify-between my-auto max-w-7xl mx-auto w-full pt-8 pb-4 ${winnerSide ? 'gap-2' : 'gap-6'}`}>
          {/* Top Category Header */}
          <div className="flex justify-between items-center border-b-2 border-white/10 pb-4 shrink-0">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Award className="h-5 w-5 text-yellow-400" />
                <span className="text-yellow-400 font-black tracking-widest text-sm uppercase">
                  WKF KATA SPECTATOR SCOREBOARD • {tatamiName} • BOUT #{boutNo}
                </span>
                <button
                  disabled
                  title="Judge panel locked to 5 Judges standard"
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] uppercase font-black transition cursor-default bg-blue-400/20 text-blue-400 border border-blue-400/40 shadow-sm opacity-80"
                >
                  <span>PANEL: {panelSize} JUDGES (STANDARD)</span>
                </button>
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white line-clamp-1">
                {categoryName}
              </h1>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-black uppercase text-white/40 tracking-wider">
                OFFICIAL TOURNAMENT
              </span>
              <p className="text-lg font-black text-white/70 tracking-tight">
                {tournamentName || 'Kelab Karate Do Senshi Goju-Ryu'}
              </p>
            </div>
          </div>

          {/* Winner Full Screen Display OR Normal Scoreboard */}
          {resultConfirmed && winnerSide ? (
            <div className="flex-1 flex flex-col items-center justify-center min-h-0 animate-in fade-in zoom-in duration-500 overflow-hidden">
              <div className={`w-full max-w-6xl p-6 md:p-10 rounded-[3rem] flex flex-col items-center justify-center font-black uppercase border-4 z-20 flex-1 max-h-[972px] ${
                winnerSide === 'aka'
                  ? 'bg-red-600/90 text-white border-red-400 ring-1 ring-red-500/30 shadow-[0_0_100px_rgba(220,38,38,0.6)]'
                  : 'bg-blue-600/90 text-white border-blue-400 ring-1 ring-blue-500/30 shadow-[0_0_100px_rgba(37,99,235,0.6)]'
              }`}>
                <Trophy className="h-16 w-16 md:h-32 md:w-32 mb-2 md:mb-4 text-yellow-300 drop-shadow-2xl shrink-0" />
                <h2 className="text-2xl md:text-5xl font-black text-white/90 tracking-[0.2em] mb-1 md:mb-2 drop-shadow-md shrink-0">
                  {winnerSide === 'aka' ? 'AKA' : 'AO'}
                </h2>
                <h1 className="text-[70px] tracking-tighter mb-2 md:mb-4 text-center leading-tight drop-shadow-lg max-w-full break-words text-balance px-2 md:px-6 shrink min-h-0 overflow-hidden">
                  {winnerSide === 'aka' ? akaName : aoName}
                </h1>
                <h3 className="text-xl md:text-4xl text-white/90 tracking-widest mb-4 md:mb-6 drop-shadow-md shrink-0">
                  WINNER
                </h3>
                {penaltyH && (
                  <div className="text-xl md:text-3xl text-yellow-300 bg-black/50 px-8 py-5 rounded-3xl border-2 border-yellow-500/50 shadow-inner flex flex-col items-center">
                    <span className="text-sm md:text-xl text-yellow-200/70 tracking-[0.3em] mb-1">DECISION BY CHIEF JUDGE</span>
                    <span>HANSOKU PENALTY (H) TO {penaltyH}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Kata Timer Box */}
          {(timeLeft > 0 || timerActive) && !winnerSide && (
            <div className="flex justify-center w-full my-2">
              <div className="bg-black/60 backdrop-blur-xl border border-white/20 rounded-3xl px-12 py-4 flex items-center gap-8 shadow-2xl">
                <div className="flex flex-col items-center">
                  <span className="text-[12px] font-black text-white/50 uppercase tracking-[0.2em] mb-1">Match Time</span>
                  <div className={`font-mono text-6xl font-bold tracking-tight flex items-baseline ${timeLeft <= 150 && timeLeft > 0 ? 'text-red-500 animate-pulse drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]' : 'text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]'}`}>
                    <span>{formatMainTime(timeLeft)}</span>
                    <span className={`text-4xl ml-1 ${timeLeft <= 150 && timeLeft > 0 ? 'text-red-500/60' : 'text-white/70'}`}>{formatDecsTime(timeLeft)}</span>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <span className={`w-4 h-4 rounded-full ${timerActive ? 'bg-green-500 animate-ping shadow-[0_0_15px_rgba(34,197,94,0.6)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]'}`} />
                  <span className="text-[10px] font-black uppercase text-white/50 tracking-[0.2em]">
                    {timerActive ? 'RUNNING' : 'PAUSED'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* AKA & AO Competitor Cards */}
          {(() => {
            const displayScoresA = (judgeScoresA.length > 0 ? judgeScoresA : Array(panelSize).fill(8.0)).slice(0, panelSize);
            const displayScoresB = (judgeScoresB.length > 0 ? judgeScoresB : Array(panelSize).fill(8.0)).slice(0, panelSize);
            const displayFlagsA = (judgeScoresA.length > 0 ? judgeScoresA : Array(panelSize).fill(-1)).slice(0, panelSize);
            const displayFlagsB = (judgeScoresB.length > 0 ? judgeScoresB : Array(panelSize).fill(-1)).slice(0, panelSize);

            return (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 items-stretch">
                {/* AKA RED CARD */}
                <div className={`relative rounded-3xl p-6 lg:p-8 flex flex-col justify-between border-2 transition-all duration-500 shadow-2xl overflow-hidden ${
                  winnerSide === 'aka'
                    ? 'bg-gradient-to-br from-red-950/90 via-red-900/60 to-black border-red-500 shadow-red-600/40 ring-4 ring-red-500/50'
                    : 'bg-gradient-to-br from-red-950/40 via-red-950/20 to-black/80 border-red-600/40'
                }`}>
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-3.5 py-1 bg-red-600/30 border border-red-500/50 text-red-400 font-black text-xs uppercase tracking-widest rounded-lg">
                        AKA
                      </span>
                      {kataA && (
                        <span className="text-xs font-extrabold uppercase tracking-wider text-red-300 bg-black/60 px-3.5 py-1.5 rounded-xl border border-red-500/30 font-mono">
                          KATA: {kataA}
                        </span>
                      )}
                    </div>
                    <h2 className="text-3xl lg:text-5xl font-black tracking-tight text-white uppercase drop-shadow-md truncate">
                      {akaName}
                    </h2>
                    <p className="text-sm lg:text-base font-bold text-red-300/70 uppercase tracking-wide truncate mt-1">
                      {akaClub}
                    </p>
                  </div>

                  {/* Judge Scorecard Breakdown */}
                  {scoringMethod === 'Points' ? (
                    <div className="my-4">
                      <div className="text-[10px] uppercase font-bold text-red-400/80 tracking-widest mb-2 flex items-center justify-between">
                        <span>Judge Score Breakdown ({displayScoresA.length} Judges)</span>
                        <span className="text-gray-400 text-[9px]">Min & Max Trimmed</span>
                      </div>
                      <div className={`grid gap-1.5 bg-black/60 p-3 rounded-2xl border border-red-500/20 font-mono text-center ${
                        displayScoresA.length === 5 ? 'grid-cols-5' : 'grid-cols-7'
                      }`}>
                        {displayScoresA.map((score, idx) => {
                          const status = getScoreStatusIndex(displayScoresA, idx);
                          return (
                            <div
                              key={idx}
                              className={`p-2 rounded-xl border flex flex-col items-center transition ${
                                status === 'min' || status === 'max'
                                  ? 'bg-white/5 border-white/10 text-gray-500 opacity-40 line-through scale-90'
                                  : 'bg-red-500/20 border-red-500/40 text-red-300 font-black shadow-sm scale-100'
                              }`}
                            >
                              <span className="text-[9px] text-gray-400 block font-sans">J{idx + 1}</span>
                              <span className="text-base lg:text-lg font-black">{score.toFixed(1)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    /* Flags Mode Scorecard */
                    <div className="my-4">
                      <div className="text-[10px] uppercase font-bold text-red-400/80 tracking-widest mb-2 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Flag className="h-3.5 w-3.5 text-red-400 fill-red-400" />
                          WKF Flag Votes ({displayFlagsA.length} Judges)
                        </span>
                        <span className="text-red-300 text-[9px]">Red Flag Voted</span>
                      </div>
                      <div className={`grid gap-2 bg-black/60 p-3 rounded-2xl border border-red-500/20 font-mono text-center ${
                        displayFlagsA.length === 5 ? 'grid-cols-5' : 'grid-cols-7'
                      }`}>
                        {displayFlagsA.map((vote, idx) => {
                          const isRedVote = Number(vote) === 1;
                          return (
                            <div
                              key={idx}
                              className={`p-2 rounded-xl border flex flex-col items-center justify-between transition ${
                                isRedVote
                                  ? 'bg-red-600/40 border-red-500 text-red-300 font-black shadow-lg shadow-red-600/40 scale-105'
                                  : 'bg-white/5 border-white/10 text-gray-600 opacity-30 scale-90'
                              }`}
                            >
                              <span className="text-[9px] text-gray-400 block font-sans">J{idx + 1}</span>
                              <div className="my-1">
                                {isRedVote ? (
                                  <Flag className="h-5 w-5 text-red-400 fill-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                                ) : (
                                  <Flag className="h-4 w-4 text-gray-600 opacity-30" />
                                )}
                              </div>
                              <span className="text-[8px] font-black uppercase text-red-400 tracking-tighter">
                                {isRedVote ? 'AKA' : '—'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Total Score / Total Flags */}
                  <div className="bg-red-950/60 border border-red-500/40 rounded-2xl p-4 lg:p-6 text-center flex items-center justify-between shadow-inner">
                    <div className="text-left">
                      <span className="text-xs uppercase font-extrabold tracking-widest text-red-400 block">
                        {scoringMethod === 'Flags' ? 'Total WKF Flags' : 'Total Kata Score'}
                      </span>
                      <span className="text-[11px] font-bold text-red-300/70">
                        {scoringMethod === 'Flags' ? 'Flags Awarded' : 'WKF Calculated'}
                      </span>
                    </div>
                    <div className="text-5xl lg:text-7xl font-black font-mono tracking-tight text-red-400 drop-shadow-[0_0_20px_rgba(239,68,68,0.5)] flex items-center gap-3">
                      <span>
                        {scoringMethod === 'Flags' 
                          ? (judgeScoresA.length > 0 ? judgeScoresA.filter(s => Number(s) === 1).length : Math.round(scoreAka))
                          : scoreAka.toFixed(2)}
                      </span>
                      
                      {scoringMethod === 'Flags' && (
                        <Flag className="h-9 w-9 text-red-500 fill-red-500 inline-block drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
                      )}

                      {penaltyH === 'AKA' && (
                        <div className="bg-red-600 text-white border-2 border-red-400 rounded-xl px-4 py-1 flex items-center justify-center text-4xl lg:text-6xl ml-3 shadow-[0_0_15px_rgba(220,38,38,0.8)]">
                          H
                        </div>
                      )}

                      {winnerSide === 'aka' && (
                        <div className="bg-red-600 text-white border-2 border-red-400 rounded-xl px-4 py-1 flex items-center justify-center ml-3 shadow-[0_0_15px_rgba(220,38,38,0.8)]">
                          <Trophy className="h-6 w-6 lg:h-8 lg:w-8 text-white drop-shadow-md" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* AO BLUE CARD */}
                <div className={`relative rounded-3xl p-6 lg:p-8 flex flex-col justify-between border-2 transition-all duration-500 shadow-2xl overflow-hidden ${
                  winnerSide === 'ao'
                    ? 'bg-gradient-to-br from-blue-950/90 via-blue-900/60 to-black border-blue-500 shadow-blue-600/40 ring-4 ring-blue-500/50'
                    : 'bg-gradient-to-br from-blue-950/40 via-blue-950/20 to-black/80 border-blue-600/40'
                }`}>
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-3.5 py-1 bg-blue-600/30 border border-blue-500/50 text-blue-400 font-black text-xs uppercase tracking-widest rounded-lg">
                        AO
                      </span>
                      {kataB && (
                        <span className="text-xs font-extrabold uppercase tracking-wider text-blue-300 bg-black/60 px-3.5 py-1.5 rounded-xl border border-blue-500/30 font-mono">
                          KATA: {kataB}
                        </span>
                      )}
                    </div>
                    <h2 className="text-3xl lg:text-5xl font-black tracking-tight text-white uppercase drop-shadow-md truncate">
                      {aoName}
                    </h2>
                    <p className="text-sm lg:text-base font-bold text-blue-300/70 uppercase tracking-wide truncate mt-1">
                      {aoClub}
                    </p>
                  </div>

                  {/* Judge Scorecard Breakdown */}
                  {scoringMethod === 'Points' ? (
                    <div className="my-4">
                      <div className="text-[10px] uppercase font-bold text-blue-400/80 tracking-widest mb-2 flex items-center justify-between">
                        <span>Judge Score Breakdown ({displayScoresB.length} Judges)</span>
                        <span className="text-gray-400 text-[9px]">Min & Max Trimmed</span>
                      </div>
                      <div className={`grid gap-1.5 bg-black/60 p-3 rounded-2xl border border-blue-500/20 font-mono text-center ${
                        displayScoresB.length === 5 ? 'grid-cols-5' : 'grid-cols-7'
                      }`}>
                        {displayScoresB.map((score, idx) => {
                          const status = getScoreStatusIndex(displayScoresB, idx);
                          return (
                            <div
                              key={idx}
                              className={`p-2 rounded-xl border flex flex-col items-center transition ${
                                status === 'min' || status === 'max'
                                  ? 'bg-white/5 border-white/10 text-gray-500 opacity-40 line-through scale-90'
                                  : 'bg-blue-500/20 border-blue-500/40 text-blue-300 font-black shadow-sm scale-100'
                              }`}
                            >
                              <span className="text-[9px] text-gray-400 block font-sans">J{idx + 1}</span>
                              <span className="text-base lg:text-lg font-black">{score.toFixed(1)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    /* Flags Mode Scorecard */
                    <div className="my-4">
                      <div className="text-[10px] uppercase font-bold text-blue-400/80 tracking-widest mb-2 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Flag className="h-3.5 w-3.5 text-blue-400 fill-blue-400" />
                          WKF Flag Votes ({displayFlagsB.length} Judges)
                        </span>
                        <span className="text-blue-300 text-[9px]">Blue Flag Voted</span>
                      </div>
                      <div className={`grid gap-2 bg-black/60 p-3 rounded-2xl border border-blue-500/20 font-mono text-center ${
                        displayFlagsB.length === 5 ? 'grid-cols-5' : 'grid-cols-7'
                      }`}>
                        {displayFlagsB.map((vote, idx) => {
                          const isBlueVote = Number(vote) === 1;
                          return (
                            <div
                              key={idx}
                              className={`p-2 rounded-xl border flex flex-col items-center justify-between transition ${
                                isBlueVote
                                  ? 'bg-blue-600/40 border-blue-500 text-blue-300 font-black shadow-lg shadow-blue-600/40 scale-105'
                                  : 'bg-white/5 border-white/10 text-gray-600 opacity-30 scale-90'
                              }`}
                            >
                              <span className="text-[9px] text-gray-400 block font-sans">J{idx + 1}</span>
                              <div className="my-1">
                                {isBlueVote ? (
                                  <Flag className="h-5 w-5 text-blue-400 fill-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                                ) : (
                                  <Flag className="h-4 w-4 text-gray-600 opacity-30" />
                                )}
                              </div>
                              <span className="text-[8px] font-black uppercase text-blue-400 tracking-tighter">
                                {isBlueVote ? 'AO' : '—'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Total Score / Total Flags */}
                  <div className="bg-blue-950/60 border border-blue-500/40 rounded-2xl p-4 lg:p-6 text-center flex items-center justify-between shadow-inner">
                    <div className="text-left">
                      <span className="text-xs uppercase font-extrabold tracking-widest text-blue-400 block">
                        {scoringMethod === 'Flags' ? 'Total WKF Flags' : 'Total Kata Score'}
                      </span>
                      <span className="text-[11px] font-bold text-blue-300/70">
                        {scoringMethod === 'Flags' ? 'Flags Awarded' : 'WKF Calculated'}
                      </span>
                    </div>
                    <div className="text-5xl lg:text-7xl font-black font-mono tracking-tight text-blue-400 drop-shadow-[0_0_20px_rgba(59,130,246,0.5)] flex items-center gap-3">
                      <span>
                        {scoringMethod === 'Flags' 
                          ? (judgeScoresB.length > 0 ? judgeScoresB.filter(s => Number(s) === 1).length : Math.round(scoreAo))
                          : scoreAo.toFixed(2)}
                      </span>
                      
                      {scoringMethod === 'Flags' && (
                        <Flag className="h-9 w-9 text-blue-500 fill-blue-500 inline-block drop-shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                      )}

                      {penaltyH === 'AO' && (
                        <div className="bg-red-600 text-white border-2 border-red-400 rounded-xl px-4 py-1 flex items-center justify-center text-4xl lg:text-6xl ml-3 shadow-[0_0_15px_rgba(220,38,38,0.8)]">
                          H
                        </div>
                      )}

                      {winnerSide === 'ao' && (
                        <div className="bg-blue-600 text-white border-2 border-blue-400 rounded-xl px-4 py-1 flex items-center justify-center ml-3 shadow-[0_0_15px_rgba(59,130,246,0.8)]">
                          <Trophy className="h-6 w-6 lg:h-8 lg:w-8 text-white drop-shadow-md" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
          </>
          )}
        </div>
      )}

      {/* STANDARD WKF KUMITE SCOREBOARD DISPLAY (Preserved baseline setup) */}
      {currentSlideType === 'live_scoreboard' && !isKata && (
        <>
          {/* Top Details bar (Projector optimized size) */}
          <div className="flex justify-between items-center border-b-2 border-white/10 pb-4 mb-4 shrink-0 mt-8">
            <div>
              <span className="text-yellow-400 font-black tracking-widest text-lg uppercase">
                {tatamiName} , R{roundNo}B{boutNo}
              </span>
              <h1 className="text-2xl font-black tracking-tight text-white/80 line-clamp-1 mt-1">
                {categoryName}
              </h1>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black uppercase text-white/40 tracking-wider">
                TOURNAMENT HUB
              </span>
              <p className="text-lg font-black text-white/70 tracking-tight">
                {tournamentName || 'Kelab Karate Do Senshi Goju-Ryu'}
              </p>
            </div>
          </div>

      {/* Hansoku Disqualification Blinking Banner */}
      {(c1Aka >= 5 || c1Ao >= 5) && !winnerSide && (
        <div className="bg-red-600 text-white font-black text-center py-2 text-2xl rounded-2xl mb-3 animate-pulse tracking-widest uppercase border-2 border-red-500 shadow-[0_0_30px_rgba(220,38,38,0.6)] z-20 shrink-0">
          🚨 HANSOKU – {c1Aka >= 5 ? 'AKA' : 'AO'} 🚨
        </div>
      )}

      {/* Winner Full Screen Display OR Normal Scoreboard */}
      {resultConfirmed && winnerSide ? (
        <div className="flex-1 flex flex-col items-center justify-center min-h-0 animate-in fade-in zoom-in duration-500 overflow-hidden">
          <div className={`w-full max-w-6xl p-6 md:p-10 rounded-[3rem] flex flex-col items-center justify-center font-black uppercase border-4 z-20 flex-1 max-h-[972px] ${
            winnerSide === 'aka'
              ? 'bg-red-950/90 text-red-100 border-red-500 shadow-[0_0_100px_rgba(239,68,68,0.6)]'
              : 'bg-blue-950/90 text-blue-100 border-blue-500 shadow-[0_0_100px_rgba(59,130,246,0.6)]'
          }`}>
             <Trophy className="h-16 w-16 md:h-32 md:w-32 mb-2 md:mb-4 text-yellow-400 drop-shadow-2xl shrink-0" />
             <h2 className="text-2xl md:text-5xl font-black text-white/90 tracking-[0.2em] mb-1 md:mb-2 drop-shadow-md shrink-0">
               {winnerSide === 'aka' ? 'AKA' : 'AO'}
             </h2>
             <h1 className="text-[70px] tracking-tighter mb-2 md:mb-4 text-center leading-tight drop-shadow-lg max-w-full break-words text-balance px-2 md:px-6 shrink min-h-0 overflow-hidden">
               {winnerSide === 'aka' ? akaName : aoName}
             </h1>
             <h3 className="text-xl md:text-4xl text-white/90 tracking-widest mb-4 md:mb-6 drop-shadow-md shrink-0">
               WINNER
             </h3>
             <div className="text-xl md:text-4xl text-yellow-300 bg-black/50 px-8 py-5 rounded-3xl border-2 border-yellow-500/50 shadow-inner flex flex-col items-center">
               <span className="text-sm md:text-xl text-yellow-200/70 tracking-[0.3em] mb-1">VICTORY METHOD</span>
               <span>{winMethod === 'Points' ? 'POINTS ADVANTAGE' : winMethod === 'SENSHU' ? 'SENSHU ADVANTAGE' : winMethod === 'Superior Points' ? 'SUPERIOR POINTS' : winMethod === 'Hantei' ? 'HANTEI DECISION' : winMethod === 'HANSOKU' ? 'HANSOKU DISQUALIFICATION' : winMethod === 'Kiken' ? 'KIKEN (WITHDRAWAL)' : winMethod || 'POINTS ADVANTAGE'}</span>
             </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 grid grid-cols-2 xl:grid-cols-12 gap-3 lg:gap-4 xl:gap-6 pb-2">
        {/* AKA RED CARD */}
        <div className={`col-span-1 xl:col-span-4 order-2 xl:order-1 h-auto xl:h-full rounded-[40px] p-2 lg:p-8 flex flex-col justify-between relative overflow-hidden shadow-[0_0_80px_rgba(239,68,68,0.1)] transition-all duration-500 ${
          winnerSide === 'aka'
            ? 'bg-red-950/80 border-4 border-red-500 shadow-[inset_0_0_100px_rgba(239,68,68,0.4),0_0_80px_rgba(239,68,68,0.8)]'
            : 'bg-[#150000] border-4 border-red-600/40 text-white'
        }`}>
          <div>
            <div className="flex flex-col items-center gap-1.5 text-center">
              {senshuAka && (
                <span className="bg-yellow-500 text-black font-black text-sm lg:text-base uppercase px-4 py-1 rounded-xl tracking-widest animate-pulse border-2 border-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.5)] flex items-center justify-center gap-1.5 w-max max-w-full mx-auto">
                  <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24"><path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"/></svg>
                  SENSHU
                </span>
              )}
              <span className={`text-6xl lg:text-8xl font-black uppercase tracking-wider leading-none ${
                winnerSide === 'aka' && winMethod === 'Superior Points' ? 'text-red-400' : 'text-red-500'
              }`}>AKA</span>

              {/* Fighter Name directly under AKA RED */}
              <div className="w-full px-2 mt-1.5 flex flex-col items-center relative z-10">
                <h2 className="font-competitor text-[40px] font-extrabold tracking-tight truncate max-w-full text-center uppercase leading-none" title={akaName}>
                  {akaName}
                </h2>
                <p className={`${
                  winnerSide === 'aka' && winMethod === 'Superior Points' ? 'text-green-400/50' : 'text-red-400/50'
                } text-sm font-bold mt-1 uppercase tracking-wider text-center truncate max-w-full`}>
                  {akaClub}
                </p>

              </div>
            </div>
          </div>

          {/* Huge Score (DIN 1451 Bold 140-220px) */}
          <div className="flex-1 min-h-0 py-2 w-full transition-all duration-500 flex items-center gap-2">
            <div className={`flex-1 min-h-0 flex items-center justify-center gap-4 ${akaScoreShiftClass}`}>
              <span className={`font-din ${akaScoreSizeClass} font-black leading-none select-none tracking-tight transition-all duration-300 ${
                winnerSide === 'aka'
                  ? 'text-red-500 animate-blink drop-shadow-[0_0_80px_rgba(239,68,68,0.7)] scale-110'
                  : scoreAka - scoreAo >= 8 
                    ? 'text-red-500 animate-pulse scale-105 drop-shadow-[0_0_80px_rgba(239,68,68,0.7)]' 
                    : 'text-red-500 drop-shadow-[0_0_55px_rgba(239,68,68,0.3)]'
              }`}>
                {scoreAka}
              </span>

              {/* Trophy Box for Winner */}
              {winnerSide === 'aka' && (
                <div className="bg-red-600 border-4 border-red-400 rounded-3xl p-3 lg:p-5 shadow-[0_0_25px_rgba(239,68,68,0.8)] z-10 shrink-0">
                  <Trophy className="h-8 w-8 lg:h-12 lg:w-12 text-white drop-shadow-md" />
                </div>
              )}
              
              {/* Penalty H Box for Loser by Hansoku */}
              {winnerSide === 'ao' && winMethod === 'HANSOKU' && (
                <div className="bg-red-600 border-4 border-red-400 rounded-3xl px-6 lg:px-8 py-3 shadow-[0_0_25px_rgba(239,68,68,0.8)] flex items-center justify-center z-10 shrink-0">
                  <span className="text-6xl lg:text-8xl font-black text-white drop-shadow-md">H</span>
                </div>
              )}
            </div>
            <div className={`${akaSummarySlotClass} shrink-0 self-center mr-1 lg:mr-2`}>
                <div className={`w-full rounded-lg border border-red-400/60 bg-red-950/65 shadow-[0_0_12px_rgba(239,68,68,0.25)] ${akaSummaryBoxClass}`}>
                  <div className={`grid grid-cols-[auto_auto] justify-end gap-y-0.5 font-black uppercase tracking-wide text-red-100 ${akaSummaryGridClass}`}>
                    <span>Ippon</span>
                    <span className={`rounded bg-red-500/20 border border-red-400/30 text-right ${akaSummaryValueClass}`}>{akaTechniqueCounts.ippon}</span>
                    <span>Waza-Ari</span>
                    <span className={`rounded bg-red-500/20 border border-red-400/30 text-right ${akaSummaryValueClass}`}>{akaTechniqueCounts.wazaAri}</span>
                    <span>Yuko</span>
                    <span className={`rounded bg-red-500/20 border border-red-400/30 text-right ${akaSummaryValueClass}`}>{akaTechniqueCounts.yuko}</span>
                  </div>
                </div>
            </div>
          </div>

          {/* AKA Warnings Row */}
          <div className="border-t-2 border-red-900/30 pt-3 mt-auto">
            <div className="flex items-center gap-2 w-full">
              <div className="flex-1 grid grid-cols-5 gap-2 lg:gap-3">
                {[1, 2, 3, 4, 5].map((level) => {
                  const isActive = c1Aka >= level;
                  const labels = ['', 'C1', 'C2', 'C3', 'HC', 'H'];
                  return (
                    <div
                      key={level}
                      className={`flex items-center justify-center h-12 lg:h-16 rounded-xl font-din text-[36px] font-black transition-all border ${
                        isActive
                          ? 'bg-red-500 text-black border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.6)]'
                          : 'bg-transparent text-white/20 border-white/10'
                      }`}
                    >
                      {labels[level]}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* CENTER COLUMN: TIMER */}
        <div className="col-span-2 xl:col-span-4 order-1 xl:order-2 flex flex-col justify-center items-center h-auto xl:h-full text-center px-1 lg:px-4">
          <div className="bg-black/60 backdrop-blur-xl border border-white/20 shadow-[0_0_80px_rgba(0,0,0,0.8)] rounded-[40px] w-full h-auto xl:h-full min-h-[300px] p-2 lg:p-8 flex flex-col justify-between items-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

            {/* EXTRA TIMER FULL OVERLAY (COVERS MATCH TIMER) */}
            {showExtraTimer && (
              <div className="absolute inset-0 z-30 bg-[#070a14]/98 backdrop-blur-2xl rounded-[40px] border-4 border-yellow-500 shadow-[inset_0_0_100px_rgba(234,179,8,0.25),0_0_120px_rgba(234,179,8,0.6)] p-4 lg:p-8 flex flex-col justify-between items-center select-none animate-fade-in">
                {/* Header Badge */}
                <div className="mt-2 flex items-center gap-2.5">
                  <div className="p-1.5 bg-yellow-500/20 border border-yellow-500/40 rounded-xl text-yellow-400">
                    <Clock className="h-5 w-5 lg:h-6 lg:w-6" />
                  </div>
                  <span className="bg-yellow-500 text-black font-black text-sm lg:text-base uppercase px-5 py-1 rounded-xl tracking-widest border border-yellow-400 shadow-md">
                    EXTRA / BREAK TIMER
                  </span>
                </div>

                {/* Giant Extra Timer Clock */}
                <div className="font-din text-[150px] lg:text-[220px] font-black leading-none tracking-tight text-yellow-400 drop-shadow-[0_0_70px_rgba(234,179,8,0.8)] flex items-center justify-center my-auto w-full">
                  {Math.floor(extraTimerSeconds / 60).toString().padStart(2, '0')}:{(extraTimerSeconds % 60).toString().padStart(2, '0')}
                </div>

                {/* Bottom Status Indicator */}
                <div className="mb-3 flex items-center gap-3">
                  <span className={`w-4 h-4 lg:w-5 lg:h-5 rounded-full ${extraTimerIsRunning ? 'bg-green-400 animate-ping shadow-[0_0_20px_rgba(74,222,128,1)]' : 'bg-orange-400 shadow-[0_0_10px_rgba(251,146,60,0.8)]'}`} />
                  <span className="text-sm lg:text-base font-black uppercase text-white/90 tracking-[0.2em]">
                    {extraTimerIsRunning ? 'RUNNING' : 'PAUSED'}
                  </span>
                </div>
              </div>
            )}
            
            {/* Top Area: Label */}
            <div className="mt-4">
              <span className="text-xl lg:text-2xl uppercase font-black text-white/40 tracking-[0.3em]">
                MATCH TIME
              </span>
            </div>
            
            {/* Giant digital timer (DIN 1451 Bold White 160-260px) */}
            <div className={`font-din text-[162px] lg:text-[220px] font-bold leading-none tracking-tight transition-all duration-300 select-none flex items-baseline justify-center relative z-10 w-full ${
              timeLeft <= 150 && timeLeft > 0 
                ? 'text-red-500 scale-105 animate-pulse drop-shadow-[0_0_40px_rgba(239,68,68,0.5)]' 
                : 'text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.4)]'
            }`}>
              <span>{formatMainTime(timeLeft)}</span>
              <span className={`font-din text-[110px] font-bold ml-1 lg:ml-2 ${
                timeLeft <= 150 && timeLeft > 0 ? 'text-red-500/60' : 'text-white/70'
              }`}>
                {formatDecsTime(timeLeft)}
              </span>
            </div>

            {/* Bottom Area: Status & Warnings */}
            <div className="mb-4 flex flex-col items-center gap-4 relative z-10 h-24 justify-end">
              {Math.abs(scoreAka - scoreAo) >= 8 && (
                <div className="bg-red-500/20 text-red-500 border border-red-500/30 px-5 py-2.5 rounded-full font-black text-sm uppercase tracking-widest animate-bounce">
                  8-Point Gap Decision
                </div>
              )}
              <div className="flex flex-col items-center gap-2">
                <span className={`w-4 h-4 lg:w-5 lg:h-5 rounded-full ${timerActive ? 'bg-green-500 animate-ping shadow-[0_0_20px_rgba(34,197,94,0.6)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]'}`} />
                <span className="text-xs lg:text-sm font-black uppercase text-white/50 tracking-[0.2em] mt-1">
                  {timerActive ? 'RUNNING' : 'PAUSED'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* AO BLUE CARD */}
        <div className={`col-span-1 xl:col-span-4 order-3 xl:order-3 h-auto xl:h-full rounded-[40px] p-2 lg:p-8 flex flex-col justify-between relative overflow-hidden shadow-[0_0_80px_rgba(59,130,246,0.1)] transition-all duration-500 ${
          winnerSide === 'ao'
            ? 'bg-blue-950/80 border-4 border-blue-500 shadow-[inset_0_0_100px_rgba(59,130,246,0.4),0_0_80px_rgba(59,130,246,0.8)]'
            : 'bg-[#000515] border-4 border-blue-600/40 text-white'
        }`}>
          <div>
            <div className="flex flex-col items-center gap-1.5 text-center">
              {senshuAo && (
                <span className="bg-yellow-500 text-black font-black text-sm lg:text-base uppercase px-4 py-1 rounded-xl tracking-widest animate-pulse border-2 border-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.5)] flex items-center justify-center gap-1.5 w-max max-w-full mx-auto">
                  <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24"><path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"/></svg>
                  SENSHU
                </span>
              )}
              <span className={`text-6xl lg:text-8xl font-black uppercase tracking-wider leading-none ${
                winnerSide === 'ao' ? 'text-blue-400' : 'text-blue-400'
              }`}>AO</span>

              {/* Fighter Name directly under AO BLUE */}
              <div className="w-full px-2 mt-1.5 flex flex-col items-center relative z-10">
                <h2 className="font-competitor text-[40px] font-extrabold tracking-tight truncate max-w-full text-center uppercase leading-none" title={aoName}>
                  {aoName}
                </h2>
                <p className={`${
                  winnerSide === 'ao' && winMethod === 'Superior Points' ? 'text-green-400/50' : 'text-blue-400/50'
                } text-sm font-bold mt-1 uppercase tracking-wider text-center truncate max-w-full`}>
                  {aoClub}
                </p>

              </div>
            </div>
          </div>

          {/* Huge Score (DIN 1451 Bold 140-220px) */}
          <div className="flex-1 min-h-0 py-2 w-full transition-all duration-500 flex items-center gap-2">
            <div className={`flex-1 min-h-0 flex items-center justify-center gap-4 ${aoScoreShiftClass}`}>
              <span className={`font-din ${aoScoreSizeClass} font-black leading-none select-none tracking-tight transition-all duration-300 ${
                winnerSide === 'ao'
                  ? 'text-blue-400 animate-blink drop-shadow-[0_0_80px_rgba(59,130,246,0.7)] scale-110'
                  : scoreAo - scoreAka >= 8 
                    ? 'text-blue-400 animate-pulse scale-105 drop-shadow-[0_0_80px_rgba(59,130,246,0.7)]' 
                    : 'text-blue-400 drop-shadow-[0_0_35px_rgba(59,130,246,0.3)]'
              }`}>
                {scoreAo}
              </span>

              {/* Trophy Box for Winner */}
              {winnerSide === 'ao' && (
                <div className="bg-blue-600 border-4 border-blue-400 rounded-3xl p-3 lg:p-5 shadow-[0_0_25px_rgba(59,130,246,0.8)] z-10 shrink-0">
                  <Trophy className="h-8 w-8 lg:h-12 lg:w-12 text-white drop-shadow-md" />
                </div>
              )}
              
              {/* Penalty H Box for Loser by Hansoku */}
              {winnerSide === 'aka' && winMethod === 'HANSOKU' && (
                <div className="bg-red-600 border-4 border-red-400 rounded-3xl px-6 lg:px-8 py-3 shadow-[0_0_25px_rgba(239,68,68,0.8)] flex items-center justify-center z-10 shrink-0">
                  <span className="text-6xl lg:text-8xl font-black text-white drop-shadow-md">H</span>
                </div>
              )}
            </div>
            <div className={`${aoSummarySlotClass} shrink-0 self-center mr-1 lg:mr-2`}>
                <div className={`w-full rounded-lg border border-blue-400/60 bg-blue-950/65 shadow-[0_0_12px_rgba(59,130,246,0.25)] ${aoSummaryBoxClass}`}>
                  <div className={`grid grid-cols-[auto_auto] justify-end gap-y-0.5 font-black uppercase tracking-wide text-blue-100 ${aoSummaryGridClass}`}>
                    <span>Ippon</span>
                    <span className={`rounded bg-blue-500/20 border border-blue-400/30 text-right ${aoSummaryValueClass}`}>{aoTechniqueCounts.ippon}</span>
                    <span>Waza-Ari</span>
                    <span className={`rounded bg-blue-500/20 border border-blue-400/30 text-right ${aoSummaryValueClass}`}>{aoTechniqueCounts.wazaAri}</span>
                    <span>Yuko</span>
                    <span className={`rounded bg-blue-500/20 border border-blue-400/30 text-right ${aoSummaryValueClass}`}>{aoTechniqueCounts.yuko}</span>
                  </div>
                </div>
            </div>
          </div>

          {/* AO Warnings Row */}
          <div className="border-t-2 border-blue-900/30 pt-3 mt-auto">
            <div className="flex items-center gap-2 w-full">
              <div className="flex-1 grid grid-cols-5 gap-2 lg:gap-3">
                {[1, 2, 3, 4, 5].map((level) => {
                  const isActive = c1Ao >= level;
                  const labels = ['', 'C1', 'C2', 'C3', 'HC', 'H'];
                  return (
                    <div
                      key={level}
                      className={`flex items-center justify-center h-12 lg:h-16 rounded-xl font-din text-[36px] font-black transition-all border ${
                        isActive
                          ? 'bg-blue-500 text-black border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.6)]'
                          : 'bg-transparent text-white/20 border-white/10'
                      }`}
                    >
                      {labels[level]}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
      )}
    </>
  )}

  {/* PROFESSIONAL PLAYER DETAILS PRESENTATION OVERLAY */}
  {showPlayerDetails && (
    <div className="fixed inset-0 z-[100] bg-[#05070e] flex flex-col justify-between p-6 lg:p-10 select-none overflow-hidden font-sans animate-fade-in shadow-2xl">
      {/* Dynamic Ambient Background Lights */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-red-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-yellow-500/10 rounded-full blur-[160px] pointer-events-none" />

      {/* Top Header Bar */}
      <header className="relative z-10 flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-yellow-400">
            <Trophy className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl lg:text-2xl font-black text-white tracking-wider uppercase drop-shadow-md">
              {tournamentName || 'OFFICIAL KARATE CHAMPIONSHIP'}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs font-black uppercase text-yellow-400 bg-yellow-500/10 px-2.5 py-0.5 rounded-full border border-yellow-500/30">
                {playerDetailsPayload?.category?.name || categoryName || 'MATCH PRESENTATION'}
              </span>
              <span className="text-xs font-bold text-white/50">
                {tatamiName} · MATCH R{roundNo}B{boutNo}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowPlayerDetails(false)}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-white/40 hover:text-white border border-white/10 transition cursor-pointer flex items-center gap-1.5 text-xs font-bold"
        >
          <X className="h-4 w-4" /> CLOSE
        </button>
      </header>

      {/* Center Stage: Competitor Face-Off Grid */}
      {(() => {
        const aka = playerDetailsPayload?.akaFighter || allParticipants.find(p => p.id === (playerDetailsPayload?.bout?.participant_a_id || activeBoutId));
        const ao = playerDetailsPayload?.aoFighter || allParticipants.find(p => p.id === (playerDetailsPayload?.bout?.participant_b_id || activeBoutId));
        const akaClubName = playerDetailsPayload?.akaClub || (aka?.club_id ? allClubs.find(c => c.id === aka.club_id)?.name : akaClub) || '—';
        const aoClubName = playerDetailsPayload?.aoClub || (ao?.club_id ? allClubs.find(c => c.id === ao.club_id)?.name : aoClub) || '—';
        const akaCoachName = playerDetailsPayload?.akaCoach || '—';
        const aoCoachName = playerDetailsPayload?.aoCoach || '—';

        const calcAge = (dob?: string) => {
          if (!dob) return null;
          const b = new Date(dob);
          const age = new Date().getFullYear() - b.getFullYear();
          return isNaN(age) ? null : age;
        };

        return (
          <main className="relative z-10 flex-1 min-h-0 my-4 grid grid-cols-1 xl:grid-cols-[1fr_200px_1fr] gap-6 items-stretch">
            {/* AKA (RED CORNER) */}
            <div className="bg-gradient-to-b from-red-950/80 via-red-900/30 to-[#0c080d] border-2 border-red-500/60 shadow-[0_0_60px_rgba(239,68,68,0.25)] rounded-3xl p-6 lg:p-8 flex flex-col justify-between relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xl lg:text-2xl font-black text-red-300 bg-red-950/90 border border-red-600/70 px-4 py-1 rounded-xl tracking-widest uppercase shadow-lg shadow-red-950/50">
                  AKA · RED
                </span>
                <span className="text-sm font-black text-white/50 font-mono">
                  #{aka?.registration_no || 'REG-A'}
                </span>
              </div>

              {/* Center Fighter Info */}
              <div className="flex flex-col lg:flex-row items-center gap-6 my-auto">
                {/* Photo Frame */}
                <div className="w-40 h-52 lg:w-48 lg:h-64 rounded-2xl bg-black/60 border-2 border-red-400/80 shadow-[0_0_30px_rgba(239,68,68,0.3)] overflow-hidden flex items-center justify-center shrink-0">
                  {aka?.photo_url ? (
                    <img src={aka.photo_url} alt={aka.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <UserSquare2 className="h-20 w-20 text-red-400/30" />
                  )}
                </div>

                {/* Name & Primary Badges */}
                <div className="flex-1 min-w-0 text-center lg:text-left space-y-2">
                  <h2 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight uppercase leading-tight">
                    {aka?.full_name || akaName}
                  </h2>
                  <p className="text-base lg:text-lg font-bold text-yellow-400 uppercase tracking-wide">
                    {akaClubName}
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center lg:justify-start pt-1">
                    <span className="px-3 py-1 rounded-lg bg-white/10 text-white/80 font-bold text-xs">
                      {aka?.gender || 'Male'}
                    </span>
                    {calcAge(aka?.dob) && (
                      <span className="px-3 py-1 rounded-lg bg-white/10 text-white/80 font-bold text-xs">
                        {calcAge(aka?.dob)} Years Old
                      </span>
                    )}
                    {aka?.weight && (
                      <span className="px-3 py-1 rounded-lg bg-white/10 text-white/80 font-bold text-xs">
                        {aka.weight} kg
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Meta Grid */}
              <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-red-900/40 text-xs">
                <div className="bg-black/30 border border-white/5 rounded-xl p-2.5">
                  <span className="text-[10px] font-black uppercase text-white/30 block">ASSIGNED COACH</span>
                  <span className="font-bold text-white truncate block">{akaCoachName || 'Sensei Coach'}</span>
                </div>
                <div className="bg-black/30 border border-white/5 rounded-xl p-2.5">
                  <span className="text-[10px] font-black uppercase text-white/30 block">AFFILIATION</span>
                  <span className="font-bold text-red-300 truncate block">{aka?.nationality_code || 'NATIONAL'}</span>
                </div>
              </div>
            </div>

            {/* CENTER VS EMBLEM */}
            <div className="flex flex-col items-center justify-center py-4 text-center">
              <div className="w-24 h-24 lg:w-28 lg:h-28 rounded-full bg-gradient-to-tr from-yellow-600 via-yellow-400 to-amber-200 p-1 shadow-[0_0_50px_rgba(234,179,8,0.4)] flex items-center justify-center animate-pulse">
                <div className="w-full h-full rounded-full bg-[#0d1017] flex items-center justify-center border-2 border-yellow-400">
                  <span className="font-black text-3xl lg:text-4xl text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 to-yellow-500 tracking-tighter">
                    VS
                  </span>
                </div>
              </div>

              <div className="mt-4 space-y-1">
                <span className="text-xs font-black uppercase tracking-widest text-white/40 block">
                  {isKata ? 'KATA DIVISION' : 'KUMITE DIVISION'}
                </span>
                <span className="text-sm font-black text-white font-mono block">
                  ROUND {roundNo} · BOUT {boutNo}
                </span>
              </div>
            </div>

            {/* AO (BLUE CORNER) */}
            <div className="bg-gradient-to-b from-blue-950/80 via-blue-900/30 to-[#080b13] border-2 border-blue-500/60 shadow-[0_0_60px_rgba(59,130,246,0.25)] rounded-3xl p-6 lg:p-8 flex flex-col justify-between relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xl lg:text-2xl font-black text-blue-300 bg-blue-950/90 border border-blue-600/70 px-4 py-1 rounded-xl tracking-widest uppercase shadow-lg shadow-blue-950/50">
                  AO · BLUE
                </span>
                <span className="text-sm font-black text-white/50 font-mono">
                  #{ao?.registration_no || 'REG-B'}
                </span>
              </div>

              {/* Center Fighter Info */}
              <div className="flex flex-col lg:flex-row-reverse items-center gap-6 my-auto">
                {/* Photo Frame */}
                <div className="w-40 h-52 lg:w-48 lg:h-64 rounded-2xl bg-black/60 border-2 border-blue-400/80 shadow-[0_0_30px_rgba(59,130,246,0.3)] overflow-hidden flex items-center justify-center shrink-0">
                  {ao?.photo_url ? (
                    <img src={ao.photo_url} alt={ao.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <UserSquare2 className="h-20 w-20 text-blue-400/30" />
                  )}
                </div>

                {/* Name & Primary Badges */}
                <div className="flex-1 min-w-0 text-center lg:text-right space-y-2">
                  <h2 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight uppercase leading-tight">
                    {ao?.full_name || aoName}
                  </h2>
                  <p className="text-base lg:text-lg font-bold text-yellow-400 uppercase tracking-wide">
                    {aoClubName}
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center lg:justify-end pt-1">
                    <span className="px-3 py-1 rounded-lg bg-white/10 text-white/80 font-bold text-xs">
                      {ao?.gender || 'Male'}
                    </span>
                    {calcAge(ao?.dob) && (
                      <span className="px-3 py-1 rounded-lg bg-white/10 text-white/80 font-bold text-xs">
                        {calcAge(ao?.dob)} Years Old
                      </span>
                    )}
                    {ao?.weight && (
                      <span className="px-3 py-1 rounded-lg bg-white/10 text-white/80 font-bold text-xs">
                        {ao.weight} kg
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Meta Grid */}
              <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-blue-900/40 text-xs">
                <div className="bg-black/30 border border-white/5 rounded-xl p-2.5">
                  <span className="text-[10px] font-black uppercase text-white/30 block">ASSIGNED COACH</span>
                  <span className="font-bold text-white truncate block">{aoCoachName || 'Sensei Coach'}</span>
                </div>
                <div className="bg-black/30 border border-white/5 rounded-xl p-2.5">
                  <span className="text-[10px] font-black uppercase text-white/30 block">AFFILIATION</span>
                  <span className="font-bold text-blue-300 truncate block">{ao?.nationality_code || 'NATIONAL'}</span>
                </div>
              </div>
            </div>
          </main>
        );
      })()}

      {/* Footer Bar */}
      <footer className="relative z-10 flex items-center justify-between border-t border-white/10 pt-3 text-xs text-white/40 font-mono shrink-0">
        <span>WORLD KARATE FEDERATION (WKF) OFFICIAL SYSTEM</span>
        <span>BROADCAST DISPLAY FEED · {tatamiName}</span>
      </footer>
    </div>
  )}

</div>
    </ScaleWrapper>
  );
}

export default function SpectatorDisplayPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white/40 text-xl font-black tracking-widest animate-pulse">LOADING DISPLAY...</div>
      </div>
    }>
      <SpectatorDisplayContent />
    </Suspense>
  );
}

