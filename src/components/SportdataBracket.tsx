import React from "react";
import { Bout, Participant, Club, Category, isKataCategory } from "@/db/types";
import { useTournament } from "@/context/TournamentContext";
import { basePath } from "@/db/dbClient";
import { calculateRoundRobinRankings } from "@/utils/roundRobinRankings";

interface SportdataBracketProps {
  bouts: Bout[];
  participants: Participant[];
  clubs: Club[];
  categories: Category[];
  selectedCatId: string | null;
  canModify?: boolean;
  onBoutClick?: (bout: Bout) => void;
  theme?: "light" | "dark";
  height?: string;
  hideZoomControls?: boolean;
}

const flagMap: Record<string, string> = {
  MAS: "🇲🇾",
  SGP: "🇸🇬",
  THA: "🇹🇭",
  INA: "🇮🇩",
  JPN: "🇯🇵",
  BRU: "🇧🇳",
  VIE: "🇻🇳",
  PHI: "🇵🇭",
};

export const SportdataBracket: React.FC<SportdataBracketProps> = ({
  bouts,
  participants,
  clubs,
  categories,
  selectedCatId,
  canModify = false,
  onBoutClick,
  theme = "light",
  height = "650px",
  hideZoomControls = false,
}) => {
  const { tournamentName, logoUrl } = useTournament();
  const [zoom, setZoom] = React.useState(100);

  const handleBoutSelect = (b: Bout) => {
    if (onBoutClick) {
      onBoutClick(b);
      return;
    }
    if (typeof window !== 'undefined') {
      const cat = categories.find((c) => c.id === b.category_id);
      const isKata = cat ? isKataCategory(cat) : false;
      const scoreboardPath = isKata ? '/dashboard/kata-scoreboard' : '/dashboard/scoreboard';

      try {
        const channel = new BroadcastChannel('wkf-scoreboard-sync');
        channel.postMessage({
          type: 'LOAD_BOUT',
          boutId: b.id,
          categoryId: b.category_id
        });
        channel.close();
      } catch (e) {}
    }
  };

  // 1. Get bouts for selected category (excluding 3rd place bout, which is round_no === 99)
  const categoryBouts = bouts.filter((b) => b.category_id === selectedCatId);
  const selectedCategory = categories.find((c) => c.id === selectedCatId);
  const isRoundRobin = selectedCategory?.format === "round_robin";

  if (categoryBouts.length === 0) {
    return (
      <div
        className={`text-center py-12 text-xs italic ${theme === "dark" ? "text-gray-500" : "text-muted-foreground"}`}
      >
        No draws generated for this category.
      </div>
    );
  }

  if (isRoundRobin) {
    const standings = calculateRoundRobinRankings(
      categoryBouts,
      participants,
      clubs,
    );

    return (
      <div
        className={`w-full flex flex-col rounded-xl overflow-hidden ${
          theme === "dark"
            ? "bg-[#060a13] border border-gray-800 text-gray-200"
            : "bg-white border border-gray-200 text-gray-900"
        }`}
        style={{ minHeight: height }}
      >
        {/* Header */}
        <div
          className="sportdata-header flex items-stretch justify-between px-3 py-2 shrink-0 border-b relative"
          style={{
            height: "45px",
            borderColor: theme === "dark" ? "#1f2937" : "#cbd5e1",
            background: theme === "dark" ? "#0b111e" : "#f8fafc",
          }}
        >
          {/* Left Side */}
          <div
            className="flex-1 flex flex-col justify-center px-3 py-1 border rounded"
            style={{
              borderColor: theme === "dark" ? "#374151" : "#a3a3a3",
              background: theme === "dark" ? "#111827" : "#e5e5e5",
              marginRight: "12px",
            }}
          >
            <div className="text-[10px] font-black uppercase tracking-wide leading-none text-gray-900 dark:text-white truncate">
              {selectedCategory?.name || "Round Robin Division"}
            </div>
            <div className="text-[7.5px] font-bold uppercase text-gray-600 dark:text-gray-400 truncate mt-0.5 leading-none">
              {tournamentName ||
                "Kelab Senshi Goju-Ryu Open Karate Championship 2026"}
              , MAS
            </div>
          </div>

          {/* Right Side — KarateTech 2.0© Brand (matches main operator page) */}
          <div
            className="flex items-center gap-2 leading-none select-none shrink-0"
            style={{ maxWidth: "180px" }}
          >
            <img
              src={logoUrl || `${basePath}/karatetech-logo.png`}
              alt="KarateTech Logo"
              style={{ height: '28px', width: '28px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)', objectFit: 'contain', flexShrink: 0 }}
            />
            <div className="flex flex-col items-start leading-none">
              <div style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 900, fontSize: '8.5px', lineHeight: 1, letterSpacing: '0.01em' }}>
                <span style={{ color: '#b91c2e' }}>Karate</span>
                <span style={{ color: '#38bdf8' }}>Tech</span>
                <span style={{ color: theme === 'dark' ? '#ffffff' : '#111827', marginLeft: '2px', fontSize: '7.5px' }}>2.0</span>
                <span style={{ color: '#94a3b8', fontSize: '5px', marginLeft: '1px', verticalAlign: 'super' }}>©</span>
              </div>
              <div style={{ fontSize: '5px', color: '#64748b', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: '1px', lineHeight: 1 }}>
                • PRECISION. SPEED. RESULTS. •
              </div>
              <div style={{ marginTop: '2px', background: '#ffffff', display: 'block', borderRadius: '2px', padding: '1px 2px', width: '100%' }}>
                <img
                  src={`${basePath}/spsportdata-logo.jpg`}
                  alt="SP SportData Solution"
                  style={{ display: 'block', height: '14px', width: '100%', objectFit: 'contain', objectPosition: 'left' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Contents Grid */}
        <div className="flex-1 p-4 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto max-h-[600px]">
          {/* Standings Table */}
          <div className="lg:col-span-7 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1">
              🏆 Standings Table
            </h3>
            <div className="border border-border rounded-xl overflow-hidden bg-card">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-secondary/20 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
                    <th className="py-2 px-3 text-center w-10">Rank</th>
                    <th className="py-2 px-3">Competitor</th>
                    <th className="py-2 px-3 text-center w-12">W</th>
                    <th className="py-2 px-3 text-center w-12">L</th>
                    <th className="py-2 px-3 text-center w-12">D</th>
                    <th className="py-2 px-3 text-center w-16">Score Diff</th>
                    <th className="py-2 px-3 text-center w-16">Total Pts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {standings.map((row, idx) => {
                    const isGold = idx === 0;
                    const isSilver = idx === 1;
                    const isBronze = idx === 2;

                    return (
                      <tr
                        key={row.participantId}
                        className={`hover:bg-secondary/5 transition-colors ${
                          isGold
                            ? "bg-amber-500/5 font-semibold"
                            : isSilver
                              ? "bg-slate-400/5"
                              : isBronze
                                ? "bg-amber-700/5"
                                : ""
                        }`}
                      >
                        <td className="py-2 px-3 text-center">
                          {isGold && (
                            <span className="text-yellow-500 font-black text-sm">
                              🥇
                            </span>
                          )}
                          {isSilver && (
                            <span className="text-slate-400 font-black text-sm">
                              🥈
                            </span>
                          )}
                          {isBronze && (
                            <span className="text-amber-700 font-black text-sm">
                              🥉
                            </span>
                          )}
                          {!isGold && !isSilver && !isBronze && idx + 1}
                        </td>
                        <td className="py-2 px-3">
                          <div className="font-bold text-foreground">
                            {row.fullName}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {row.clubName}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                          {row.wins}
                        </td>
                        <td className="py-2 px-3 text-center text-red-600 dark:text-red-400">
                          {row.losses}
                        </td>
                        <td className="py-2 px-3 text-center text-muted-foreground">
                          {row.draws}
                        </td>
                        <td className="py-2 px-3 text-center font-mono">
                          {row.pointsDifference > 0
                            ? `+${row.pointsDifference}`
                            : row.pointsDifference}
                        </td>
                        <td className="py-2 px-3 text-center font-mono font-semibold">
                          {row.pointsScored}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Match Order List */}
          <div className="lg:col-span-5 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1">
              🥋 Match List
            </h3>
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {categoryBouts
                .sort((a, b) => a.bout_no - b.bout_no)
                .map((b) => {
                  const compA = participants.find(
                    (p) => p.id === b.participant_a_id,
                  );
                  const compB = participants.find(
                    (p) => p.id === b.participant_b_id,
                  );
                  const isCompleted =
                    b.status === "Completed" || b.status === "Walkover";
                  const isRunning = b.status === "Running";

                  return (
                    <div
                      key={b.id}
                      className={`border border-border/85 rounded-xl p-3 bg-card space-y-2.5 transition relative overflow-hidden ${
                        isRunning ? "ring-1 ring-primary/50 bg-primary/5" : ""
                      }`}
                    >
                      <div className="flex justify-between items-center text-[10px] text-muted-foreground border-b border-border/40 pb-1.5">
                        <span className="font-bold uppercase tracking-wider">
                          Match #{b.bout_no}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="bg-secondary/40 px-1.5 py-0.5 rounded font-mono font-semibold">
                            {b.tatami}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded-sm font-bold uppercase ${
                              isCompleted
                                ? "bg-emerald-500/10 text-emerald-500"
                                : isRunning
                                  ? "bg-primary/10 text-primary"
                                  : "bg-secondary text-muted-foreground"
                            }`}
                          >
                            {b.status}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        {/* Competitor A */}
                        <div className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-2 h-2 rounded-full bg-[#ff0000] shrink-0" />
                            <span
                              className={`font-bold truncate ${b.winner_id === b.participant_a_id ? "underline text-primary" : "text-foreground"}`}
                            >
                              {compA?.full_name || "TBD"}
                            </span>
                          </div>
                          <span className="font-mono font-extrabold text-foreground">
                            {b.total_score_a !== undefined && b.total_score_a !== null && b.total_score_a !== 0
                              ? (b.total_score_a % 1 !== 0 ? b.total_score_a.toFixed(2) : b.total_score_a)
                              : (b.score_a ?? 0)}
                          </span>
                        </div>

                        {/* Competitor B */}
                        <div className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-2 h-2 rounded-full bg-[#0000ff] shrink-0" />
                            <span
                              className={`font-bold truncate ${b.winner_id === b.participant_b_id ? "underline text-primary" : "text-foreground"}`}
                            >
                              {compB?.full_name || "TBD"}
                            </span>
                          </div>
                          <span className="font-mono font-extrabold text-foreground">
                            {b.total_score_b !== undefined && b.total_score_b !== null && b.total_score_b !== 0
                              ? (b.total_score_b % 1 !== 0 ? b.total_score_b.toFixed(2) : b.total_score_b)
                              : (b.score_b ?? 0)}
                          </span>
                        </div>
                      </div>

                      {canModify && onBoutClick && (
                        <div className="flex justify-end pt-1.5 border-t border-border/30">
                          <button
                            onClick={() => onBoutClick(b)}
                            className="px-2.5 py-1 bg-primary text-primary-foreground hover:bg-primary/95 text-[10px] font-bold rounded-lg cursor-pointer"
                          >
                            Resolve Match
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const mainBouts = categoryBouts.filter((b) => b.round_no !== 99);
  const bronzeBout = categoryBouts.find((b) => b.round_no === 99);

  // 2. Determine number of rounds (R) and slots (S)
  const maxRound = Math.max(...mainBouts.map((b) => b.round_no), 1);
  const R = maxRound;
  const S = Math.pow(2, R);

  // 3. Calculate recursive baseline heights
  const coordMap: Record<string, number> = {};

  // Base case: Round 1 competitor baselines
  const B1 = S / 2;
  for (let b = 1; b <= B1; b++) {
    coordMap[`1,${b},0`] = (2 * b - 2 + 0.5) * (100 / S);
    coordMap[`1,${b},1`] = (2 * b - 1 + 0.5) * (100 / S);
  }

  // Recursive cases for subsequent rounds
  for (let r = 2; r <= R; r++) {
    const Br = S / Math.pow(2, r);
    for (let b = 1; b <= Br; b++) {
      const yPrevTopTop = coordMap[`${r - 1},${2 * b - 1},0`];
      const yPrevTopBot = coordMap[`${r - 1},${2 * b - 1},1`];
      coordMap[`${r},${b},0`] = (yPrevTopTop + yPrevTopBot) / 2;

      const yPrevBotTop = coordMap[`${r - 1},${2 * b},0`];
      const yPrevBotBot = coordMap[`${r - 1},${2 * b},1`];
      coordMap[`${r},${b},1`] = (yPrevBotTop + yPrevBotBot) / 2;
    }
  }

  // Vertical position for champion slot
  const yChampion =
    R > 0 ? (coordMap[`${R},1,0`] + coordMap[`${R},1,1`]) / 2 : 50;

  // 4. Horizontal Spacing calculations
  const getX = (round: number) => (round - 1) * (80 / R);
  const W_card = Math.min(18, 70 / R); // percentage card width
  const X_champion = 85;

  // 5. Standings calculation - Auto updates all winner names (1st, 2nd, 3rd, 3rd) as matches finish
  const getStandings = () => {
    const list: {
      rank: string;
      label: string;
      medal: string;
      tag: string;
      tagClass: string;
      p: Participant | null;
    }[] = [
      { rank: "1", label: "1.", medal: "🥇", tag: "GOLD", tagClass: "bg-amber-500 text-black", p: null },
      { rank: "2", label: "2.", medal: "🥈", tag: "SILVER", tagClass: "bg-slate-300 text-black", p: null },
      { rank: "3", label: "3.", medal: "🥉", tag: "BRONZE", tagClass: "bg-amber-700 text-white", p: null },
      { rank: "3", label: "3.", medal: "🥉", tag: "BRONZE", tagClass: "bg-amber-700 text-white", p: null },
    ];

    // 1. Final Bout (Gold & Silver)
    const finalBout =
      mainBouts.find((b) => b.round_no === R && (b.bout_no === 1 || !b.bout_no)) ||
      mainBouts.find((b) => b.round_no === R);

    if (finalBout && finalBout.winner_id) {
      const goldWinner = participants.find((p) => p.id === finalBout.winner_id) || null;
      const silverWinnerId =
        finalBout.winner_id === finalBout.participant_a_id
          ? finalBout.participant_b_id
          : finalBout.participant_a_id;
      const silverWinner = silverWinnerId
        ? participants.find((p) => p.id === silverWinnerId) || null
        : null;

      list[0].p = goldWinner;
      list[1].p = silverWinner;
    }

    // 2. Explicit Bronze Matches (if any)
    const bronzeMatches = categoryBouts.filter(
      (b) => (b.round_no === 98 || b.round_no === 99 || b.bout_no === 99) && b.winner_id
    );

    if (bronzeMatches.length > 0) {
      bronzeMatches.forEach((bm, idx) => {
        if (idx < 2 && bm.winner_id) {
          const bronzeWinner = participants.find((p) => p.id === bm.winner_id) || null;
          if (bronzeWinner) list[2 + idx].p = bronzeWinner;
        }
      });
    } else {
      // 3. Single Elimination Semifinals (Losers of semifinals are both 3rd place Bronze winners)
      const semiRound = R - 1;
      if (semiRound > 0) {
        const semiBouts = mainBouts.filter((b) => b.round_no === semiRound);
        const semiBronzeWinners: (Participant | null)[] = [];

        semiBouts.forEach((sb) => {
          if (sb.winner_id) {
            const loserId =
              sb.winner_id === sb.participant_a_id
                ? sb.participant_b_id
                : sb.participant_a_id;
            if (loserId) {
              const bronzePlayer = participants.find((p) => p.id === loserId) || null;
              if (bronzePlayer && !semiBronzeWinners.some((bp) => bp?.id === bronzePlayer.id)) {
                semiBronzeWinners.push(bronzePlayer);
              }
            }
          }
        });

        if (semiBronzeWinners[0]) list[2].p = semiBronzeWinners[0];
        if (semiBronzeWinners[1]) list[3].p = semiBronzeWinners[1];
      }
    }

    return list;
  };

  const standings = getStandings();

  // Helper: render competitor card content
  const renderCompetitorCard = (
    partId: string | null,
    score: number,
    isWinner: boolean,
    isAka: boolean,
    round: number,
    boutNo: number,
    bout: any = null,
  ) => {
    const comp = partId ? participants.find((p) => p.id === partId) : null;
    const club = comp ? clubs.find((c) => c.id === comp.club_id) : null;
    const flag = comp ? flagMap[comp.nationality_code || "MAS"] || "" : "";

    const blockColor = isAka ? "bg-[#ff0000]" : "bg-[#0000ff]";
    const textPrimary = theme === "dark" ? "text-white" : "text-black";
    const textSecondary = theme === "dark" ? "text-gray-400" : "text-gray-600";
    const bgBox =
      theme === "dark" ? "bg-[#1a1a1a] border-[#333]" : "bg-white border-black";

    if (!comp) {
      // Empty slot placeholder
      return (
        <div
          className={`h-[28px] w-full border border-dashed flex items-stretch select-none ${bgBox}`}
          style={{ borderWidth: "1px" }}
        >
          <div className={`w-[6px] shrink-0 ${blockColor} opacity-50`} />
          <div className="flex-1 flex items-center px-1.5">
            <span
              className={`text-[9px] font-bold tracking-wider uppercase ${textSecondary}`}
            >
              {isAka ? "AKA" : "AO"}
            </span>
          </div>
        </div>
      );
    }

    const isKata = isKataCategory(selectedCategory);
    let hasPenaltyH = false;
    if (isKata && bout?.victory_method?.includes("Penalty")) {
      if (bout.victory_method.includes("Penalty AKA") && isAka) {
        hasPenaltyH = true;
      } else if (bout.victory_method.includes("Penalty AO") && !isAka) {
        hasPenaltyH = true;
      }
    } else if (!isKata && bout?.victory_method === "HANSOKU") {
      if (!isWinner && bout?.winner_id) {
        hasPenaltyH = true;
      }
    }

    return (
      <div
        className={`h-[28px] w-full border flex items-stretch select-none overflow-hidden ${bgBox}`}
        style={{ borderWidth: "1px" }}
      >
        {/* Red / Blue Block */}
        <div className={`w-[6px] shrink-0 ${blockColor}`} />

        {/* Competitor Details */}
        <div className="flex items-center gap-1 min-w-0 flex-1 px-1.5 bg-transparent">
          {flag && <span className="text-[10px] shrink-0">{flag}</span>}
          <div className="min-w-0 flex-1 leading-[1.1]">
            <span
              className={`block truncate text-[10px] font-bold uppercase tracking-tight ${isWinner ? "underline" : ""} ${textPrimary}`}
              style={{ fontFamily: "Arial, sans-serif" }}
            >
              {comp.full_name}
            </span>
            {club && (
              <span
                className={`block truncate text-[8px] uppercase ${textSecondary}`}
                style={{ fontFamily: "Arial, sans-serif" }}
              >
                {club.name}
              </span>
            )}
          </div>
        </div>

        {/* Score Box */}
        <div
          className={`w-[20px] shrink-0 border-l flex items-center justify-center font-bold text-[10px] ${
            isWinner
              ? theme === "dark"
                ? "bg-white text-black border-white"
                : "bg-black text-white border-black"
              : theme === "dark"
                ? "border-[#333] text-gray-300"
                : "border-black text-black"
          }`}
        >
          {score}
        </div>

        {/* Penalty Box (H) */}
        {hasPenaltyH && (
          <div className="w-[16px] shrink-0 border-l flex items-center justify-center font-bold text-[10px] bg-red-600 text-white border-red-700">
            H
          </div>
        )}

        {/* Winner Trophy Box */}
        {isWinner && (
          <div className={`w-[16px] shrink-0 border-l flex items-center justify-center text-[10px] ${
            theme === "dark" ? "bg-white text-black border-white" : "bg-black text-white border-black"
          }`}>
            🏆
          </div>
        )}
      </div>
    );
  };

  const finalBout =
    mainBouts.find((b) => b.round_no === R && (b.bout_no === 1 || !b.bout_no)) ||
    mainBouts.find((b) => b.round_no === R);
  const championPlayer =
    finalBout && finalBout.winner_id
      ? participants.find((p) => p.id === finalBout.winner_id) || null
      : null;

  return (
    <div
      className={`w-full relative select-none rounded-xl overflow-hidden ${
        theme === "dark"
          ? "bg-[#060a13] border border-gray-800 text-gray-200"
          : "bg-white border border-gray-200 text-gray-900"
      }`}
      style={{ minHeight: height, height: height }}
    >
      {/* 1. Header Information Block */}
      <div
        className="sportdata-header flex items-stretch justify-between px-3 py-2 shrink-0 border-b relative z-10"
        style={{
          height: "45px",
          borderColor: theme === "dark" ? "#1f2937" : "#cbd5e1",
          background: theme === "dark" ? "#0b111e" : "#f8fafc",
        }}
      >
        {/* Left Side: Gray category box */}
        <div
          className="flex-1 flex flex-col justify-center px-3 py-1 border rounded"
          style={{
            borderColor: theme === "dark" ? "#374151" : "#a3a3a3",
            background: theme === "dark" ? "#111827" : "#e5e5e5",
            marginRight: "12px",
          }}
        >
          <div className="text-[10px] font-black uppercase tracking-wide leading-none text-gray-900 dark:text-white truncate">
            {categories.find((c) => c.id === selectedCatId)?.name ||
              "Tournament Division"}
          </div>
          <div className="text-[7.5px] font-bold uppercase text-gray-600 dark:text-gray-400 truncate mt-0.5 leading-none">
            {tournamentName ||
              "Kelab Senshi Goju-Ryu Open Karate Championship 2026"}
            , MAS
          </div>
        </div>

        {/* Right Side Controls / Branding */}
        <div
          className="flex flex-col items-end justify-between shrink-0"
          style={{ width: "160px" }}
        >
          {/* Metadata Table (Tatami & Pool) */}
          <div
            className="flex w-full border text-[7.5px] font-black uppercase text-center leading-none rounded"
            style={{
              borderColor: theme === "dark" ? "#374151" : "#737373",
              background: theme === "dark" ? "#1f2937" : "#ffffff",
            }}
          >
            <div
              className="flex-1 flex flex-col border-r"
              style={{ borderColor: theme === "dark" ? "#374151" : "#737373" }}
            >
              <div
                className="bg-gray-100 dark:bg-gray-800 p-0.5 border-b"
                style={{
                  borderColor: theme === "dark" ? "#374151" : "#737373",
                  color: "#525252",
                }}
              >
                Tatami
              </div>
              <div className="p-1 bg-gray-900 text-white">
                {mainBouts.find((b) => b.tatami)?.tatami
                  ? mainBouts
                      .find((b) => b.tatami)!
                      .tatami!.replace(/Tatami\s+/i, "")
                  : "TBA"}
              </div>
            </div>
            <div className="flex-1 flex flex-col">
              <div
                className="bg-gray-100 dark:bg-gray-800 p-0.5 border-b"
                style={{
                  borderColor: theme === "dark" ? "#374151" : "#737373",
                  color: "#525252",
                }}
              >
                Pool
              </div>
              <div className="p-1 bg-gray-900 text-white">1/1</div>
            </div>
          </div>

          {/* Rebranded Logo — KarateTech 2.0© Brand (matches main operator page) */}
          <div
            className="flex items-center gap-2 leading-none select-none shrink-0"
            style={{ maxWidth: "180px" }}
          >
            <img
              src={logoUrl || `${basePath}/karatetech-logo.png`}
              alt="KarateTech Logo"
              style={{ height: '28px', width: '28px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)', objectFit: 'contain', flexShrink: 0 }}
            />
            <div className="flex flex-col items-start leading-none">
              <div style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 900, fontSize: '8.5px', lineHeight: 1, letterSpacing: '0.01em' }}>
                <span style={{ color: '#b91c2e' }}>Karate</span>
                <span style={{ color: '#38bdf8' }}>Tech</span>
                <span style={{ color: theme === 'dark' ? '#ffffff' : '#111827', marginLeft: '2px', fontSize: '7.5px' }}>2.0</span>
                <span style={{ color: '#94a3b8', fontSize: '5px', marginLeft: '1px', verticalAlign: 'super' }}>©</span>
              </div>
              <div style={{ fontSize: '5px', color: '#64748b', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: '1px', lineHeight: 1 }}>
                • PRECISION. SPEED. RESULTS. •
              </div>
              <div style={{ marginTop: '2px', background: '#ffffff', display: 'block', borderRadius: '2px', padding: '1px 2px', width: '100%' }}>
                <img
                  src={`${basePath}/spsportdata-logo.jpg`}
                  alt="SP SportData Solution"
                  style={{ display: 'block', height: '14px', width: '100%', objectFit: 'contain', objectPosition: 'left' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Zoom Controls */}
      {!hideZoomControls && (
        <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-xs border border-white/10 px-2 py-1.5 rounded-lg shadow-lg no-print">
          <button
            type="button"
            onClick={() => setZoom((prev) => Math.max(50, prev - 10))}
            className="p-1 hover:bg-white/10 rounded text-white text-xs font-bold w-6 h-6 flex items-center justify-center cursor-pointer"
            title="Zoom Out"
          >
            -
          </button>
          <span className="text-[10px] text-gray-300 font-mono font-bold w-10 text-center select-none">
            {zoom}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((prev) => Math.min(150, prev + 10))}
            className="p-1 hover:bg-white/10 rounded text-white text-xs font-bold w-6 h-6 flex items-center justify-center cursor-pointer"
            title="Zoom In"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => setZoom(100)}
            className="px-1.5 py-0.5 hover:bg-white/10 rounded text-gray-300 text-[9px] font-bold cursor-pointer"
          >
            Reset
          </button>
        </div>
      )}

      {/* Scrollable Zoom Wrapper */}
      <div
        className="w-full overflow-auto absolute inset-0"
        style={{ top: "45px", height: "calc(100% - 45px)" }}
      >
        <div
          className="relative transition-transform duration-200 origin-top-left"
          style={{
            transform: `scale(${zoom / 100})`,
            width: `${100 * (100 / zoom)}%`,
            height: `${100 * (100 / zoom)}%`,
            minWidth: "950px",
            minHeight: "580px",
          }}
        >
          {/* 2. SVG Connections Canvas */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ top: "50px", height: "calc(100% - 50px)" }}
          >
            {/* Removed gradients for strict Sportdata style */}

            {/* Bracket connections loop */}
            {Array.from({ length: R }).map((_, rIdx) => {
              const r = rIdx + 1;
              const Br = S / Math.pow(2, r);

              return Array.from({ length: Br }).map((_, bIdx) => {
                const b = bIdx + 1;
                const yA = coordMap[`${r},${b},0`];
                const yB = coordMap[`${r},${b},1`];
                const yMid = (yA + yB) / 2;

                const xStart = getX(r) + W_card;
                const xEnd = r === R ? X_champion : getX(r + 1);
                const xVertical = xStart + (xEnd - xStart) * 0.7;

                const strokeColor = theme === "dark" ? "#555555" : "#000000";

                return (
                  <g key={`lines-${r}-${b}`}>
                    {/* Horizontal extension from Aka */}
                    <line
                      x1={`${xStart}%`}
                      y1={`${yA}%`}
                      x2={`${xVertical}%`}
                      y2={`${yA}%`}
                      stroke={strokeColor}
                      strokeWidth="1"
                    />

                    {/* Horizontal extension from Ao */}
                    <line
                      x1={`${xStart}%`}
                      y1={`${yB}%`}
                      x2={`${xVertical}%`}
                      y2={`${yB}%`}
                      stroke={strokeColor}
                      strokeWidth="1"
                    />

                    {/* Vertical connector line */}
                    <line
                      x1={`${xVertical}%`}
                      y1={`${yA}%`}
                      x2={`${xVertical}%`}
                      y2={`${yB}%`}
                      stroke={strokeColor}
                      strokeWidth="1"
                    />

                    {/* Horizontal winner line going to the next round */}
                    <line
                      x1={`${xVertical}%`}
                      y1={`${yMid}%`}
                      x2={`${xEnd}%`}
                      y2={`${yMid}%`}
                      stroke={strokeColor}
                      strokeWidth="1"
                    />
                  </g>
                );
              });
            })}
          </svg>

          {/* 3. HTML Absolute Render Area */}
          <div
            className="absolute inset-0"
            style={{ top: "50px", height: "calc(100% - 50px)" }}
          >
            {/* Draw cards by round */}
            {Array.from({ length: R }).map((_, rIdx) => {
              const r = rIdx + 1;
              const Br = S / Math.pow(2, r);

              return (
                <div key={`round-${r}`}>
                  {Array.from({ length: Br }).map((_, bIdx) => {
                    const b = bIdx + 1;
                    const bout = mainBouts.find(
                      (x) => x.round_no === r && x.bout_no === b,
                    );

                    const yA = coordMap[`${r},${b},0`];
                    const yB = coordMap[`${r},${b},1`];
                    const yMid = (yA + yB) / 2;

                    const xStart = getX(r) + W_card;
                    const xEnd = r === R ? X_champion : getX(r + 1);
                    const xVertical = xStart + (xEnd - xStart) * 0.7;

                    const isResolved = bout
                      ? bout.status === "Completed" ||
                        bout.status === "Walkover"
                      : false;

                    const isWalkover =
                      !bout ||
                      bout.status === "Walkover" ||
                      bout.victory_method === "Walkover" ||
                      bout.victory_method === "Bye" ||
                      !bout.participant_a_id ||
                      !bout.participant_b_id;

                    return (
                      <React.Fragment key={`bout-${r}-${b}`}>
                        {/* Competitor A Card (Aka) */}
                        <div
                          style={{
                            position: "absolute",
                            left: `${getX(r)}%`,
                            top: `${yA}%`,
                            width: `${W_card}%`,
                            transform: "translateY(-100%)",
                          }}
                          className={
                            bout && !isWalkover
                              ? "cursor-pointer hover:opacity-90 hover:brightness-110 transition-all duration-150"
                              : ""
                          }
                          onClick={() =>
                            bout && !isWalkover && handleBoutSelect(bout)
                          }
                          title={bout && !isWalkover ? `Click to load Match R${bout.round_no}-B${bout.bout_no} into Scoreboard` : undefined}
                        >
                          {renderCompetitorCard(
                            bout?.participant_a_id || null,
                            bout?.score_a || 0,
                            isResolved &&
                              bout?.winner_id === bout?.participant_a_id,
                            true,
                            r,
                            b,
                            bout,
                          )}
                        </div>

                        {/* Competitor B Card (Ao) */}
                        <div
                          style={{
                            position: "absolute",
                            left: `${getX(r)}%`,
                            top: `${yB}%`,
                            width: `${W_card}%`,
                            transform: "translateY(-100%)",
                          }}
                          className={
                            bout && !isWalkover
                              ? "cursor-pointer hover:opacity-90 hover:brightness-110 transition-all duration-150"
                              : ""
                          }
                          onClick={() =>
                            bout && !isWalkover && handleBoutSelect(bout)
                          }
                          title={bout && !isWalkover ? `Click to load Match R${bout.round_no}-B${bout.bout_no} into Scoreboard` : undefined}
                        >
                          {renderCompetitorCard(
                            bout?.participant_b_id || null,
                            bout?.score_b || 0,
                            isResolved &&
                              bout?.winner_id === bout?.participant_b_id,
                            false,
                            r,
                            b,
                            bout,
                          )}
                        </div>

                        {/* Bout No indicator near connector */}
                        {bout && (
                          <div
                            style={{
                              position: "absolute",
                              left: `${xStart + 0.5}%`,
                              top: `${yMid}%`,
                              transform: "translateY(-50%)",
                            }}
                            className={`text-[8.5px] font-black font-mono tracking-tight select-none px-1.5 py-[2px] rounded-[4px] border z-20 transition-all duration-150 ${
                              isWalkover
                                ? theme === "dark"
                                  ? "text-gray-400 border-gray-700 bg-gray-900/80 cursor-not-allowed opacity-70"
                                  : "text-gray-500 border-gray-300 bg-gray-100 cursor-not-allowed opacity-70"
                                : theme === "dark"
                                  ? "text-white border-gray-600 bg-gray-900 cursor-pointer shadow-md hover:bg-yellow-500 hover:text-black hover:border-yellow-400 hover:scale-110 active:scale-95"
                                  : "text-white border-black bg-gray-900 cursor-pointer shadow-md hover:bg-yellow-500 hover:text-black hover:border-yellow-400 hover:scale-110 active:scale-95"
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isWalkover) {
                                handleBoutSelect(bout);
                              }
                            }}
                            title={
                              isWalkover
                                ? `Match R${bout.round_no}-B${bout.bout_no} (Walkover / Bye - Click Disabled)`
                                : `Click to load Match R${bout.round_no}-B${bout.bout_no} directly into Scoreboard`
                            }
                          >
                            R{bout.round_no}-B{bout.bout_no}
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              );
            })}

            {/* 4. Champion Card Render */}
            <div
              style={{
                position: "absolute",
                left: `${X_champion}%`,
                top: `${yChampion}%`,
                width: `${W_card}%`,
                transform: "translateY(-100%)",
              }}
            >
              {championPlayer ? (
                <div
                  className={`h-[35px] w-full border-l-4 border-y border-r rounded-r flex items-center px-2 justify-between gap-1 shadow-sm overflow-hidden bg-amber-500/10 border-amber-500`}
                >
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span className="text-[11px] shrink-0">🏆</span>
                    <div className="min-w-0 flex-1 leading-tight">
                      <span
                        className={`block truncate text-[10px] font-black uppercase tracking-wide text-amber-500`}
                      >
                        {championPlayer.full_name}
                      </span>
                      <span
                        className={`block truncate text-[8px] font-bold uppercase text-amber-500/70`}
                      >
                        CHAMPION
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  className={`h-[35px] w-full border-l-4 border-y border-r rounded-r border-dashed flex items-center px-3 justify-center select-none ${
                    theme === "dark"
                      ? "border-amber-500/40 bg-amber-500/5 text-amber-500/40"
                      : "border-amber-400 bg-amber-50/20 text-amber-500/60"
                  }`}
                >
                  <span className="text-[9px] font-extrabold tracking-widest uppercase">
                    FINALIST
                  </span>
                </div>
              )}
            </div>

            {/* 5. Final Standings Leaderboard Table (Positioned below Champion, shifted left) */}
            <div
              style={{
                position: "absolute",
                left: `calc(${X_champion}% - 75px)`,
                top: `calc(${yChampion}% + 8px)`,
                minWidth: "190px",
                maxWidth: "230px",
                width: "max-content",
              }}
              className="border border-black bg-white text-black rounded-lg p-2 shadow-xs overflow-hidden z-10"
            >
              <div className="text-[8px] font-black uppercase tracking-wider border-b border-black pb-0.5 mb-1.5 flex items-center justify-between text-black leading-none">
                <div className="flex items-center gap-1">
                  <span className="text-[8.5px]">🏆</span>
                  <span className="font-black text-black">
                    FINAL STANDINGS
                  </span>
                </div>
              </div>
              <div className="space-y-1.5 text-[7.5px] font-bold uppercase text-black">
                {standings.map((slot, index) => {
                  const comp = slot.p || (index === 0 ? championPlayer : null);
                  const compClub = comp ? clubs.find((c) => c.id === comp.club_id) : null;

                  return (
                    <div
                      key={index}
                      className="border-b border-dashed border-gray-300 pb-0.5 text-black leading-relaxed"
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="flex items-start gap-1 min-w-0 flex-1">
                          <span className="text-[8px] shrink-0">{slot.medal}</span>
                          <span className="text-black text-[7.5px] font-black shrink-0">
                            {slot.label}
                          </span>
                          {comp ? (
                            <span className="font-black text-black text-[7.5px] leading-tight break-words">
                              {comp.full_name}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-[7px] font-normal tracking-wider">
                              ____________________
                            </span>
                          )}
                        </div>
                        <div className="text-[7px] font-bold text-black shrink-0 text-right pl-1 whitespace-nowrap">
                          {comp ? (
                            compClub?.name || "Independent"
                          ) : (
                            <span className="text-gray-400 text-[6px] italic font-normal">
                              (Club)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 6. Referees Table (stamped bottom right, hidden in print mode where official footer is used) */}
            {!hideZoomControls && (
              <div
                style={{
                  position: "absolute",
                  right: "20px",
                  bottom: "20px",
                  width: "380px",
                }}
                className={`border rounded-lg text-[8px] font-bold uppercase overflow-hidden ${
                  theme === "dark"
                    ? "bg-[#080d19] border-gray-800 text-gray-400"
                    : "bg-gray-50 border-gray-300 text-gray-600"
                }`}
              >
                <div className="flex border-b border-gray-800/40">
                  <div className="w-16 p-1.5 bg-gray-900/10 border-r border-gray-800/40 font-black text-center flex items-center justify-center">
                    Referees
                  </div>
                  <div className="flex-1 grid grid-cols-4">
                    <div className="border-r border-gray-800/40 p-1 text-center flex flex-col justify-between min-h-[36px]">
                      <span className="text-[6px] text-gray-500">Referee</span>
                      <div className="border-t border-gray-800/20 pt-0.5 mt-auto">
                        Sign
                      </div>
                    </div>
                    <div className="border-r border-gray-800/40 p-1 text-center flex flex-col justify-between min-h-[36px]">
                      <span className="text-[6px] text-gray-500">Judge 1</span>
                      <div className="border-t border-gray-800/20 pt-0.5 mt-auto">
                        Sign
                      </div>
                    </div>
                    <div className="border-r border-gray-800/40 p-1 text-center flex flex-col justify-between min-h-[36px]">
                      <span className="text-[6px] text-gray-500">Judge 2</span>
                      <div className="border-t border-gray-800/20 pt-0.5 mt-auto">
                        Sign
                      </div>
                    </div>
                    <div className="p-1 text-center flex flex-col justify-between min-h-[36px]">
                      <span className="text-[6px] text-gray-500">Judge 3</span>
                      <div className="border-t border-gray-800/20 pt-0.5 mt-auto">
                        Sign
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 7. Official Company Footer Notice */}
            <div
              style={{
                position: "absolute",
                left: "20px",
                bottom: "12px",
              }}
              className={`text-[6.5px] font-semibold tracking-wide uppercase ${
                theme === "dark" ? "text-gray-600" : "text-gray-400"
              }`}
            >
              © KarateTech Tournament Management System • SP SportData Solution • Precision · Speed · Results • All Rights Reserved
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
