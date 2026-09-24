'use client';

import React, { useState, useEffect } from 'react';
import { ShieldAlert, Play, Pause, Square, Clock, List, RefreshCw } from 'lucide-react';
import { recordTimerEvent } from '@/lib/scoringEngine';
import { useTournament } from '@/context/TournamentContext';
import PageHeader from '@/components/PageHeader';

export default function TimerConsolePage() {
  const { tournamentName } = useTournament();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'timer' | 'events' | 'config'>('timer');
  const [tatamiId, setTatamiId] = useState<string>('1');

  // Dummy values for demonstration
  const activeBoutId = 'live-bout-123';
  const activeTournamentId = 'demo-tournament';

  const [timeLeft, setTimeLeft] = useState(180); // 3 minutes
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleTimerAction = async (action: 'START' | 'STOP' | 'RESET') => {
    if (action === 'START') setIsRunning(true);
    if (action === 'STOP') setIsRunning(false);
    if (action === 'RESET') {
      setIsRunning(false);
      setTimeLeft(180);
    }
    
    await recordTimerEvent({
      tournamentId: activeTournamentId,
      boutId: activeBoutId,
      tatamiId,
      eventType: action,
      remainingSeconds: action === 'RESET' ? 180 : timeLeft,
    });
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#07070a] text-white">
      <PageHeader
        title="Timekeeper Console"
        breadcrumbs={[
          { label: 'Scoring', href: '/dashboard/operator' },
          { label: 'Timer' }
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
            { id: 'timer', label: 'Bout Timer', icon: <Clock className="h-4 w-4" /> },
            { id: 'events', label: 'Time Events', icon: <List className="h-4 w-4" /> },
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
            </button>
          ))}
        </div>

        {activeTab === 'timer' ? (
          <div className="max-w-3xl mx-auto">
            <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-12 text-center backdrop-blur-md mb-8">
              <div className="text-[10rem] font-black leading-none font-mono tracking-tighter mb-8 text-white drop-shadow-2xl">
                {formatTime(timeLeft)}
              </div>
              
              <div className="flex items-center justify-center gap-6">
                {!isRunning ? (
                  <button 
                    onClick={() => handleTimerAction('START')}
                    className="flex-1 max-w-[200px] flex items-center justify-center gap-3 py-6 bg-green-500 hover:bg-green-400 text-black rounded-2xl font-black text-2xl transition"
                  >
                    <Play className="h-8 w-8 fill-black" /> START
                  </button>
                ) : (
                  <button 
                    onClick={() => handleTimerAction('STOP')}
                    className="flex-1 max-w-[200px] flex items-center justify-center gap-3 py-6 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-black text-2xl transition"
                  >
                    <Pause className="h-8 w-8 fill-white" /> STOP
                  </button>
                )}
                
                <button 
                  onClick={() => handleTimerAction('RESET')}
                  className="flex items-center justify-center gap-2 py-6 px-8 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold transition"
                >
                  <RefreshCw className="h-6 w-6" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center border border-white/10 bg-white/[0.02] rounded-2xl p-16 text-center">
            <Clock className="h-16 w-16 text-white/20 mb-6" />
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
