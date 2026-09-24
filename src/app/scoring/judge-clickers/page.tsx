'use client';

import React, { useState, useEffect } from 'react';
import { ShieldAlert, Zap, AlertTriangle, ChevronLeft, Wifi, WifiOff } from 'lucide-react';
import { recordJudgeSignal, ScoreSide, ScoreType } from '@/lib/scoringEngine';
import { useTournament } from '@/context/TournamentContext';
import Link from 'next/link';

export default function JudgeClickerPage() {
  const { tournamentName } = useTournament();
  const [mounted, setMounted] = useState(false);
  const [judgeId, setJudgeId] = useState<'J1'|'J2'|'J3'|'J4'|''>('');
  const [tatamiId, setTatamiId] = useState<string>('1');
  
  // Dummy bout ID for demonstration (would come from live sync in reality)
  const activeBoutId = 'live-bout-123';
  const activeTournamentId = 'demo-tournament';

  const [isConnected, setIsConnected] = useState(true);
  const [lastSignalStatus, setLastSignalStatus] = useState<'idle'|'sending'|'success'|'error'>('idle');

  useEffect(() => {
    setMounted(true);
    // Auto-detect config from local storage if available
    if (typeof window !== 'undefined') {
      const savedJudge = localStorage.getItem('kt3_judge_id');
      const savedTatami = localStorage.getItem('kt3_judge_tatami');
      if (savedJudge) setJudgeId(savedJudge as any);
      if (savedTatami) setTatamiId(savedTatami);
    }
  }, []);

  const saveConfig = (j: string, t: string) => {
    setJudgeId(j as any);
    setTatamiId(t);
    localStorage.setItem('kt3_judge_id', j);
    localStorage.setItem('kt3_judge_tatami', t);
  };

  const handleScore = async (side: ScoreSide, scoreType: ScoreType) => {
    if (!judgeId || !activeBoutId) return;

    setLastSignalStatus('sending');
    
    // Play haptic feedback if available (mobile devices)
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(50);
    }

    const result = await recordJudgeSignal({
      tournamentId: activeTournamentId,
      boutId: activeBoutId,
      tatamiId,
      judgeId,
      side,
      scoreType,
    });

    if (result) {
      setLastSignalStatus('success');
      setTimeout(() => setLastSignalStatus('idle'), 1000);
    } else {
      setLastSignalStatus('error');
      setTimeout(() => setLastSignalStatus('idle'), 2000);
    }
  };

  if (!mounted) return null;

  // ── Configuration Screen ──────────────────────────────────────────────────
  if (!judgeId) {
    return (
      <div className="min-h-screen bg-[#07070a] text-white flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-white/[0.02] border border-white/10 p-8 rounded-3xl backdrop-blur-md">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Zap className="h-8 w-8 text-yellow-400" />
            <h1 className="text-2xl font-black tracking-tight">Judge Device Config</h1>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Tatami Assignment</label>
              <select 
                value={tatamiId} 
                onChange={e => setTatamiId(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-lg font-bold focus:border-yellow-400 focus:outline-none"
              >
                <option value="1">Tatami 1</option>
                <option value="2">Tatami 2</option>
                <option value="3">Tatami 3</option>
                <option value="4">Tatami 4</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Judge Position</label>
              <div className="grid grid-cols-2 gap-3">
                {['J1', 'J2', 'J3', 'J4'].map(j => (
                  <button
                    key={j}
                    onClick={() => saveConfig(j, tatamiId)}
                    className="py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-black text-xl transition-colors"
                  >
                    {j}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <Link href="/dashboard/operator" className="mt-8 flex items-center gap-2 text-gray-500 hover:text-white transition">
          <ChevronLeft className="h-4 w-4" /> Back to Console
        </Link>
      </div>
    );
  }

  // ── Clicker Interface ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header Bar */}
      <div className="h-14 bg-[#111] border-b border-white/10 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-yellow-400/20 text-yellow-400 flex items-center justify-center font-black text-sm">
            {judgeId}
          </div>
          <div>
            <div className="text-xs font-bold leading-tight">Tatami {tatamiId}</div>
            <div className="text-[10px] text-gray-500 uppercase font-bold leading-tight">Live Scoring</div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {lastSignalStatus === 'sending' && <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />}
            {lastSignalStatus === 'success' && <span className="w-2 h-2 rounded-full bg-green-400" />}
            {lastSignalStatus === 'error' && <span className="text-[10px] font-bold text-red-400">FAILED</span>}
            
            {isConnected ? (
              <Wifi className="h-4 w-4 text-green-400" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500 animate-pulse" />
            )}
          </div>
          
          <button 
            onClick={() => setJudgeId('')}
            className="text-[10px] uppercase font-bold text-gray-500 hover:text-white px-2 py-1 bg-white/5 rounded-md"
          >
            Config
          </button>
        </div>
      </div>

      {/* Main Clicker Area */}
      <div className="flex-1 flex flex-col sm:flex-row p-2 gap-2 overflow-hidden">
        
        {/* AKA (RED) SIDE */}
        <div className="flex-1 flex flex-col gap-2">
          <div className="bg-red-600 rounded-xl p-2 flex items-center justify-center shrink-0 h-12">
            <span className="font-black text-xl tracking-widest text-white shadow-sm">AKA</span>
          </div>
          
          <button onClick={() => handleScore('AKA', 'YUKO')} className="flex-1 bg-red-600/20 hover:bg-red-600/30 active:bg-red-600/50 border-2 border-red-600 rounded-2xl flex flex-col items-center justify-center transition-colors">
            <span className="text-4xl font-black text-red-500 mb-1">YUKO</span>
            <span className="text-xl font-bold text-red-500/50">1 PT</span>
          </button>
          
          <button onClick={() => handleScore('AKA', 'WAZA-ARI')} className="flex-1 bg-red-600/20 hover:bg-red-600/30 active:bg-red-600/50 border-2 border-red-600 rounded-2xl flex flex-col items-center justify-center transition-colors">
            <span className="text-4xl font-black text-red-500 mb-1">WAZA-ARI</span>
            <span className="text-xl font-bold text-red-500/50">2 PTS</span>
          </button>
          
          <button onClick={() => handleScore('AKA', 'IPPON')} className="flex-1 bg-red-600/20 hover:bg-red-600/30 active:bg-red-600/50 border-2 border-red-600 rounded-2xl flex flex-col items-center justify-center transition-colors">
            <span className="text-4xl font-black text-red-500 mb-1">IPPON</span>
            <span className="text-xl font-bold text-red-500/50">3 PTS</span>
          </button>
        </div>

        {/* AO (BLUE) SIDE */}
        <div className="flex-1 flex flex-col gap-2">
          <div className="bg-blue-600 rounded-xl p-2 flex items-center justify-center shrink-0 h-12">
            <span className="font-black text-xl tracking-widest text-white shadow-sm">AO</span>
          </div>
          
          <button onClick={() => handleScore('AO', 'YUKO')} className="flex-1 bg-blue-600/20 hover:bg-blue-600/30 active:bg-blue-600/50 border-2 border-blue-600 rounded-2xl flex flex-col items-center justify-center transition-colors">
            <span className="text-4xl font-black text-blue-500 mb-1">YUKO</span>
            <span className="text-xl font-bold text-blue-500/50">1 PT</span>
          </button>
          
          <button onClick={() => handleScore('AO', 'WAZA-ARI')} className="flex-1 bg-blue-600/20 hover:bg-blue-600/30 active:bg-blue-600/50 border-2 border-blue-600 rounded-2xl flex flex-col items-center justify-center transition-colors">
            <span className="text-4xl font-black text-blue-500 mb-1">WAZA-ARI</span>
            <span className="text-xl font-bold text-blue-500/50">2 PTS</span>
          </button>
          
          <button onClick={() => handleScore('AO', 'IPPON')} className="flex-1 bg-blue-600/20 hover:bg-blue-600/30 active:bg-blue-600/50 border-2 border-blue-600 rounded-2xl flex flex-col items-center justify-center transition-colors">
            <span className="text-4xl font-black text-blue-500 mb-1">IPPON</span>
            <span className="text-xl font-bold text-blue-500/50">3 PTS</span>
          </button>
        </div>

      </div>

      {/* Footer Controls */}
      <div className="h-16 shrink-0 p-2 flex gap-2">
        <button onClick={() => handleScore('AKA', 'UNDO')} className="flex-1 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center gap-2 text-gray-400 hover:text-white font-bold text-sm transition">
          UNDO AKA
        </button>
        <button onClick={() => handleScore('AO', 'UNDO')} className="flex-1 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center gap-2 text-gray-400 hover:text-white font-bold text-sm transition">
          UNDO AO
        </button>
      </div>

    </div>
  );
}
