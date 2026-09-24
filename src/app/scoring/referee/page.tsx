'use client';

import React, { useState, useEffect } from 'react';
import { ShieldAlert, Flag, Check, AlertTriangle, X, Play, Clock, Activity, ArrowRight, Video } from 'lucide-react';
import { recordRefereeDecision, emitScoringEvent, ScoreSide, ScoreType, RefereeDecisionType } from '@/lib/scoringEngine';
import { useTournament } from '@/context/TournamentContext';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';

export default function RefereeConsolePage() {
  const { tournamentName } = useTournament();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'current' | 'pending' | 'decisions' | 'review' | 'history'>('current');
  const [tatamiId, setTatamiId] = useState<string>('1');

  // Dummy values for demonstration
  const activeBoutId = 'live-bout-123';
  const activeTournamentId = 'demo-tournament';

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDecision = async (type: RefereeDecisionType, side?: ScoreSide, scoreType?: ScoreType) => {
    // In a real app, this would get the current majority result from state
    await recordRefereeDecision({
      tournamentId: activeTournamentId,
      boutId: activeBoutId,
      tatamiId,
      decisionType: type,
      side,
      scoreType,
    });
    
    if (type === 'AWARD_SCORE') {
      await emitScoringEvent({
        tournamentId: activeTournamentId,
        boutId: activeBoutId,
        tatamiId,
        eventType: 'SCORE',
        side,
        scoreType,
        scoreValue: scoreType === 'YUKO' ? 1 : scoreType === 'WAZA-ARI' ? 2 : scoreType === 'IPPON' ? 3 : 0,
        cumulativeScoreAka: 0,
        cumulativeScoreAo: 0,
        animationTrigger: `${scoreType?.toLowerCase()}_${side?.toLowerCase()}`
      });
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#07070a] text-white">
      <PageHeader
        title="Referee Console"
        breadcrumbs={[
          { label: 'Scoring', href: '/dashboard/operator' },
          { label: 'Referee Console' }
        ]}
        contextBadges={[
          { label: 'KT3.0 Event Engine', value: 'Active', color: 'blue' },
          { label: 'Tatami', value: tatamiId, color: 'purple' }
        ]}
      />

      <div className="max-w-7xl mx-auto p-6">
        {/* KT3.0 Tab Bar */}
        <div className="flex items-center gap-0 overflow-x-auto scrollbar-none border-b border-white/10 mb-8">
          {[
            { id: 'current', label: 'Current Bout', icon: <Activity className="h-4 w-4" /> },
            { id: 'pending', label: 'Pending Decisions', icon: <AlertTriangle className="h-4 w-4" /> },
            { id: 'decisions', label: 'Scoring Decisions', icon: <Flag className="h-4 w-4" /> },
            { id: 'review', label: 'Video Review', icon: <Video className="h-4 w-4" /> },
            { id: 'history', label: 'Event History', icon: <Clock className="h-4 w-4" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                flex items-center gap-2 px-6 py-4 text-sm font-bold
                whitespace-nowrap border-b-2 transition-all duration-150
                ${activeTab === tab.id
                  ? 'border-yellow-400 text-yellow-400 bg-yellow-400/5'
                  : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
                }
              `}
            >
              {tab.icon}
              {tab.label}
              {tab.id === 'pending' && <span className="ml-2 bg-yellow-400 text-black text-[10px] font-black px-2 py-0.5 rounded-full">1</span>}
            </button>
          ))}
        </div>

        {activeTab === 'current' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Majority Engine Monitor */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 backdrop-blur-md">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="h-4 w-4 text-green-400" />
                  <h3 className="text-sm font-black uppercase tracking-wider text-gray-400">Majority Engine</h3>
                </div>
                
                {/* Dummy state for design */}
                <div className="bg-green-400/10 border border-green-400/20 rounded-xl p-4 text-center">
                  <div className="text-sm font-bold text-green-400 mb-1">MAJORITY REACHED</div>
                  <div className="text-3xl font-black text-white">YUKO</div>
                  <div className="text-lg font-bold text-red-500 mb-4">AKA (RED)</div>
                  
                  <div className="flex justify-center gap-2 mb-2">
                    <span className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center font-bold text-xs">J1</span>
                    <span className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center font-bold text-xs">J2</span>
                    <span className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center font-bold text-xs">J3</span>
                    <span className="w-8 h-8 rounded-full bg-white/10 text-gray-500 flex items-center justify-center font-bold text-xs">J4</span>
                  </div>
                  <div className="text-xs text-gray-400">3/4 Judges</div>
                </div>
              </div>
            </div>

            {/* Right: Referee Decision Panel */}
            <div className="lg:col-span-2">
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 backdrop-blur-md">
                <div className="flex items-center gap-2 mb-6">
                  <Flag className="h-5 w-5 text-yellow-400" />
                  <h2 className="text-xl font-black tracking-wider uppercase text-white">Make Decision</h2>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <button 
                    onClick={() => handleDecision('AWARD_SCORE', 'AKA', 'YUKO')}
                    className="flex flex-col items-center justify-center gap-2 py-8 bg-red-600 hover:bg-red-500 rounded-2xl font-black transition-colors"
                  >
                    <Check className="h-8 w-8" />
                    <span className="text-xl">AWARD YUKO (AKA)</span>
                  </button>
                  <button 
                    onClick={() => handleDecision('NO_SCORE')}
                    className="flex flex-col items-center justify-center gap-2 py-8 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-black transition-colors"
                  >
                    <X className="h-8 w-8 text-gray-400" />
                    <span className="text-xl text-gray-300">NO SCORE</span>
                  </button>
                </div>

                <div className="border-t border-white/10 pt-6">
                  <h3 className="text-sm font-bold text-gray-400 mb-4 uppercase">Override / Manual Entry</h3>
                  <div className="grid grid-cols-4 gap-4">
                    <button className="py-3 bg-white/5 border border-white/10 rounded-xl text-xs font-bold hover:bg-white/10 transition">Senshu (AKA)</button>
                    <button className="py-3 bg-white/5 border border-white/10 rounded-xl text-xs font-bold hover:bg-white/10 transition">Senshu (AO)</button>
                    <button className="py-3 bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-bold hover:bg-red-500/30 transition">Penalty (AKA)</button>
                    <button className="py-3 bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-xl text-xs font-bold hover:bg-blue-500/30 transition">Penalty (AO)</button>
                  </div>
                </div>

              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center border border-white/10 bg-white/[0.02] rounded-2xl p-16 text-center">
            <Activity className="h-16 w-16 text-white/20 mb-6" />
            <h2 className="text-2xl font-black text-white/80 mb-2 tracking-wide uppercase">
              {activeTab} Console
            </h2>
            <p className="text-gray-400 max-w-lg mb-8">
              This specialized KT3.0 console view is currently under development. 
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
