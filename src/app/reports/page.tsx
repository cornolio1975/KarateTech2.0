'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/db/dbClient';
import { Participant, Category, Bout, Club, Country } from '@/db/types';
import { 
  FileText, Download, Printer, Trophy, Users, ShieldCheck, 
  MapPin, CheckCircle, RefreshCw, X 
} from 'lucide-react';

interface MedalTally {
  id: string;
  name: string;
  gold: number;
  silver: number;
  bronze: number;
  total: number;
}

export default function ReportsPage() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [bouts, setBouts] = useState<Bout[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<string>('');

  useEffect(() => {
    setMounted(true);
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [pList, catList, bList, clList, coList] = await Promise.all([
        db.participants.list(),
        db.categories.list(),
        db.bouts.list(),
        db.clubs.list(),
        db.countries.list()
      ]);
      setParticipants(pList);
      setCategories(catList);
      setBouts(bList);
      setClubs(clList);
      setCountries(coList);
      if (catList.length > 0) {
        setSelectedCatId(catList[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Medal Tally Computation by Club
  const calculateMedalTally = (): MedalTally[] => {
    const tallyMap: { [clubId: string]: { gold: number; silver: number; bronze: number } } = {};
    
    // Initialize for all clubs
    clubs.forEach((c) => {
      tallyMap[c.id] = { gold: 0, silver: 0, bronze: 0 };
    });
    // Add an independent slot
    tallyMap['Independent'] = { gold: 0, silver: 0, bronze: 0 };

    categories.forEach((cat) => {
      const catBouts = bouts.filter((b) => b.category_id === cat.id);
      if (catBouts.length === 0) return;

      // Detect if Round-robin
      const allRound1 = catBouts.every(b => b.round_no === 1);
      const isRoundRobin = allRound1 && catBouts.length > 1;

      if (isRoundRobin) {
        // Count wins per athlete
        const winsMap: { [id: string]: number } = {};
        const scoreMap: { [id: string]: number } = {};
        
        catBouts.forEach((b) => {
          if (b.winner_id) {
            winsMap[b.winner_id] = (winsMap[b.winner_id] || 0) + 1;
          }
          if (b.participant_a_id) {
            scoreMap[b.participant_a_id] = (scoreMap[b.participant_a_id] || 0) + b.score_a;
          }
          if (b.participant_b_id) {
            scoreMap[b.participant_b_id] = (scoreMap[b.participant_b_id] || 0) + b.score_b;
          }
        });

        // Sort athletes by wins, then scores
        const participantsInCat = Array.from(new Set(catBouts.flatMap(b => [b.participant_a_id, b.participant_b_id]).filter(Boolean))) as string[];
        const sorted = participantsInCat.sort((a, b) => {
          const winsDiff = (winsMap[b] || 0) - (winsMap[a] || 0);
          if (winsDiff !== 0) return winsDiff;
          return (scoreMap[b] || 0) - (scoreMap[a] || 0);
        });

        if (sorted[0]) {
          const p = participants.find(part => part.id === sorted[0]);
          const clubKey = p?.club_id || 'Independent';
          if (tallyMap[clubKey]) tallyMap[clubKey].gold += 1;
        }
        if (sorted[1]) {
          const p = participants.find(part => part.id === sorted[1]);
          const clubKey = p?.club_id || 'Independent';
          if (tallyMap[clubKey]) tallyMap[clubKey].silver += 1;
        }
        if (sorted[2]) {
          const p = participants.find(part => part.id === sorted[2]);
          const clubKey = p?.club_id || 'Independent';
          if (tallyMap[clubKey]) tallyMap[clubKey].bronze += 1;
        }

      } else {
        // Single Elimination: Final match has round no = maximum round
        const rounds = catBouts.map(b => b.round_no).filter(r => r !== 99);
        const maxRound = Math.max(...rounds, 0);
        const finalBout = catBouts.find(b => b.round_no === maxRound);

        if (finalBout && finalBout.status === 'Completed') {
          // Gold
          const goldWinner = participants.find(p => p.id === finalBout.winner_id);
          const goldClubKey = goldWinner?.club_id || 'Independent';
          if (tallyMap[goldClubKey]) tallyMap[goldClubKey].gold += 1;

          // Silver
          const silverId = finalBout.winner_id === finalBout.participant_a_id ? finalBout.participant_b_id : finalBout.participant_a_id;
          if (silverId) {
            const silverWinner = participants.find(p => p.id === silverId);
            const silverClubKey = silverWinner?.club_id || 'Independent';
            if (tallyMap[silverClubKey]) tallyMap[silverClubKey].silver += 1;
          }
        }

        // Bronze match (bout_no = 99 or round_no = 99)
        const bronzeBout = catBouts.find(b => b.round_no === 99);
        if (bronzeBout && bronzeBout.status === 'Completed' && bronzeBout.winner_id) {
          const bronzeWinner = participants.find(p => p.id === bronzeBout.winner_id);
          const bronzeClubKey = bronzeWinner?.club_id || 'Independent';
          if (tallyMap[bronzeClubKey]) tallyMap[bronzeClubKey].bronze += 1;
        }

        // WKF Repechage: two bronze pools (round_no === 98). The final bout of each
        // pool has no successor bout (bout_no + 1 does not exist in the pool).
        const repechageBouts = catBouts.filter(b => b.round_no === 98);
        const repechageBoutNos = new Set(repechageBouts.map(b => b.bout_no));
        repechageBouts
          .filter(b => !repechageBoutNos.has(b.bout_no + 1))
          .forEach(b => {
            if ((b.status === 'Completed' || b.status === 'Walkover') && b.winner_id) {
              const bronzeWinner = participants.find(p => p.id === b.winner_id);
              const bronzeClubKey = bronzeWinner?.club_id || 'Independent';
              if (tallyMap[bronzeClubKey]) tallyMap[bronzeClubKey].bronze += 1;
            }
          });

        // No dedicated bronze bout/repechage was drawn for this bracket: both
        // semifinal losers are awarded bronze (same rule the bracket view uses).
        if (!bronzeBout && repechageBouts.length === 0) {
          const semiRound = maxRound - 1;
          const semiBouts = catBouts.filter(b => b.round_no === semiRound);
          const bronzeLoserIds = new Set<string>();
          semiBouts.forEach(sb => {
            if ((sb.status === 'Completed' || sb.status === 'Walkover') && sb.winner_id) {
              const loserId = sb.winner_id === sb.participant_a_id ? sb.participant_b_id : sb.participant_a_id;
              if (loserId) bronzeLoserIds.add(loserId);
            }
          });
          bronzeLoserIds.forEach(loserId => {
            const bronzeWinner = participants.find(p => p.id === loserId);
            const bronzeClubKey = bronzeWinner?.club_id || 'Independent';
            if (tallyMap[bronzeClubKey]) tallyMap[bronzeClubKey].bronze += 1;
          });
        }
      }
    });

    return Object.keys(tallyMap)
      .map((clubId) => {
        const name = clubId === 'Independent' ? 'Independent Athletes' : clubs.find(c => c.id === clubId)?.name || 'Unknown Club';
        const { gold, silver, bronze } = tallyMap[clubId];
        return {
          id: clubId,
          name,
          gold,
          silver,
          bronze,
          total: gold + silver + bronze
        };
      })
      .filter(t => t.total > 0)
      .sort((a, b) => {
        if (b.gold !== a.gold) return b.gold - a.gold;
        if (b.silver !== a.silver) return b.silver - a.silver;
        return b.bronze - a.bronze;
      });
  };

  // CSV Exporters
  const downloadParticipantsCSV = () => {
    const headers = ['Registration No', 'Full Name', 'Gender', 'Weight (kg)', 'Height (cm)', 'Club', 'Status', 'Medical Clearance'];
    const rows = participants.map((p) => {
      const clubName = clubs.find(c => c.id === p.club_id)?.name || 'Independent';
      return [
        p.registration_no,
        `"${p.full_name.replace(/"/g, '""')}"`,
        p.gender,
        p.weight,
        p.height,
        `"${clubName.replace(/"/g, '""')}"`,
        p.status,
        p.medical_status
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Karate_Roster_Export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadBoutResultsCSV = () => {
    const headers = ['Bout No', 'Category', 'Competitor Aka (Red)', 'Score Aka', 'Competitor Ao (Blue)', 'Score Ao', 'Status', 'Winner', 'Tatami'];
    const rows = bouts.map((b) => {
      const cat = categories.find(c => c.id === b.category_id);
      const compA = participants.find(p => p.id === b.participant_a_id)?.full_name || 'TBD';
      const compB = participants.find(p => p.id === b.participant_b_id)?.full_name || 'TBD';
      const winner = participants.find(p => p.id === b.winner_id)?.full_name || '-';
      
      return [
        b.bout_no,
        `"${cat?.name.replace(/"/g, '""') || 'Category'}"`,
        `"${compA.replace(/"/g, '""')}"`,
        b.score_a,
        `"${compB.replace(/"/g, '""')}"`,
        b.score_b,
        b.status,
        `"${winner.replace(/"/g, '""')}"`,
        b.tatami || 'TBD'
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Karate_Bout_Results_Export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintDrawSheet = () => {
    if (!selectedCatId) return;
    
    // Redirect browser to printable path, or open window with customized content
    const category = categories.find(c => c.id === selectedCatId);
    const catBouts = bouts.filter(b => b.category_id === selectedCatId);

    if (catBouts.length === 0) {
      alert('Draws are empty. Please generate draws before printing.');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Pop-up blocked. Please allow pop-ups to print draw sheets.');
      return;
    }

    // Build print HTML content
    let matchRows = '';
    catBouts.forEach((b) => {
      const compA = participants.find(p => p.id === b.participant_a_id)?.full_name || 'TBD';
      const compB = participants.find(p => p.id === b.participant_b_id)?.full_name || 'TBD';
      const winner = participants.find(p => p.id === b.winner_id)?.full_name || '-';
      matchRows += `
        <tr>
          <td>Bout ${b.bout_no}</td>
          <td>Round ${b.round_no === 99 ? '3rd' : b.round_no}</td>
          <td style="font-weight: bold; color: #dc2626;">${compA}</td>
          <td style="text-align: center; font-weight: bold;">${b.score_a} - ${b.score_b}</td>
          <td style="font-weight: bold; color: #2563eb;">${compB}</td>
          <td>${b.tatami || 'TBD'}</td>
          <td>${b.status}</td>
          <td style="font-weight: bold; color: #059669;">${winner}</td>
        </tr>
      `;
    });

    printWindow.document.write(`
      <html>
        <head>
          <title>Draw Sheet - ${category?.name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
            h1 { font-size: 20px; text-transform: uppercase; margin-bottom: 5px; }
            p { font-size: 12px; color: #666; margin-top: 0; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f3f4f6; font-weight: bold; }
            @media print {
              body { padding: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>Official Draw & Bout Results Sheet</h1>
          <p>Category: ${category?.name} | Created on ${new Date().toLocaleDateString()}</p>
          <table>
            <thead>
              <tr>
                <th>Bout</th>
                <th>Round</th>
                <th>Aka (Red)</th>
                <th>Score</th>
                <th>Ao (Blue)</th>
                <th>Tatami</th>
                <th>Status</th>
                <th>Winner</th>
              </tr>
            </thead>
            <tbody>
              ${matchRows}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (!mounted) return null;

  const medalStandings = calculateMedalTally();

  return (
    <div className="p-6 space-y-6 text-foreground w-full">
      
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports & Statistics</h1>
          <p className="text-sm text-muted-foreground">Medal standings summaries, printable category draw sheets, and CSV record exporters.</p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="p-2 hover:bg-secondary border border-border text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Key Metric Telemetry Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card border border-border rounded-xl p-5 shadow-xs flex items-center gap-4">
          <div className="h-10 w-10 bg-primary/5 text-primary rounded-lg flex items-center justify-center shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">Registered Athletes</span>
            <span className="text-xl font-extrabold block text-foreground">{participants.length}</span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 shadow-xs flex items-center gap-4">
          <div className="h-10 w-10 bg-primary/5 text-primary rounded-lg flex items-center justify-center shrink-0">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">Matches Completed</span>
            <span className="text-xl font-extrabold block text-foreground">
              {bouts.filter(b => b.status === 'Completed' || b.status === 'Walkover').length} / {bouts.length}
            </span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 shadow-xs flex items-center gap-4">
          <div className="h-10 w-10 bg-primary/5 text-primary rounded-lg flex items-center justify-center shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">Clubs Dojo</span>
            <span className="text-xl font-extrabold block text-foreground">{clubs.length}</span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 shadow-xs flex items-center gap-4">
          <div className="h-10 w-10 bg-primary/5 text-primary rounded-lg flex items-center justify-center shrink-0">
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">Represented Nations</span>
            <span className="text-xl font-extrabold block text-foreground">{countries.length}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* MEDAL LEADERBOARD (2 cols) */}
        <div className="bg-card border border-border rounded-xl shadow-xs lg:col-span-2 flex flex-col overflow-hidden">
          <div className="p-5 border-b border-border flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Medal Standings Leaderboard</h2>
          </div>

          <div className="flex-1 overflow-x-auto">
            {medalStandings.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No medals declared yet. Complete matches in the referee scoring page to trigger standings updates.
              </div>
            ) : (
              <table className="w-full text-xs text-left">
                <thead className="bg-secondary/40 font-bold border-b border-border text-muted-foreground">
                  <tr>
                    <th className="p-3 w-16 text-center">Rank</th>
                    <th className="p-3">Dojo Club</th>
                    <th className="p-3 w-16 text-center">🥇 Gold</th>
                    <th className="p-3 w-16 text-center">🥈 Silver</th>
                    <th className="p-3 w-16 text-center">🥉 Bronze</th>
                    <th className="p-3 w-16 text-center">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {medalStandings.map((t, idx) => (
                    <tr key={t.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="p-3 text-center font-bold text-muted-foreground">{idx + 1}</td>
                      <td className="p-3 font-semibold text-foreground">{t.name}</td>
                      <td className="p-3 text-center font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-500/5">{t.gold}</td>
                      <td className="p-3 text-center font-mono font-bold text-gray-500 bg-gray-500/5">{t.silver}</td>
                      <td className="p-3 text-center font-mono font-bold text-amber-700 dark:text-amber-600 bg-amber-700/5">{t.bronze}</td>
                      <td className="p-3 text-center font-mono font-bold bg-secondary/10 text-foreground">{t.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* PRINT & EXPORT TOOLS (1 col) */}
        <div className="space-y-6">
          
          {/* Printable Draw Sheets */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <Printer className="h-5 w-5 text-primary" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Print Draw Sheets</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Generate printable, high-contrast, black-and-white match result sheets for physical brackets pasting.
            </p>

            <div className="space-y-3">
              <select 
                value={selectedCatId}
                onChange={(e) => setSelectedCatId(e.target.value)}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs font-semibold text-foreground focus:outline-none"
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <button
                onClick={handlePrintDrawSheet}
                className="w-full py-2.5 bg-primary text-primary-foreground hover:bg-primary/95 rounded-lg text-xs font-bold transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Printer className="h-4 w-4 text-white" />
                <span>Print Category Draw Sheet</span>
              </button>
            </div>
          </div>

          {/* CSV Exporters */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Export Raw Datasets</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Download standard comma-separated files (CSVs) for external spreadsheet analyses.
            </p>

            <div className="space-y-2">
              <button
                onClick={downloadParticipantsCSV}
                className="w-full py-2 border border-border text-foreground hover:bg-secondary rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Download className="h-4 w-4 text-muted-foreground" />
                <span>Export Athletes Roster (CSV)</span>
              </button>

              <button
                onClick={downloadBoutResultsCSV}
                className="w-full py-2 border border-border text-foreground hover:bg-secondary rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Download className="h-4 w-4 text-muted-foreground" />
                <span>Export Match Results (CSV)</span>
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
