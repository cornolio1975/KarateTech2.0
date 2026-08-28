'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/db/dbClient';
import { Official } from '@/db/types';
import { MapPin } from 'lucide-react';

export default function OfficialsDisplayPage() {
  const [officials, setOfficials] = useState<Official[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState('');

  // Initial load
  useEffect(() => {
    loadData();

    // Set up polling for live updates
    const intervalId = setInterval(() => {
      fetchOfficialsQuietly();
    }, 5000); // 5 seconds poll for live synchronization
    
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);

    return () => {
      clearInterval(intervalId);
      clearInterval(timeInterval);
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const list = await db.officials.list();
      setOfficials(list);
    } catch (err) {
      console.error('Error loading officials data', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOfficialsQuietly = async () => {
    try {
      const list = await db.officials.list();
      setOfficials(list);
    } catch (err) {
      // ignore silent errors on poll
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <div className="animate-pulse text-lg font-bold">Loading Officials Allocation...</div>
      </div>
    );
  }

  // Get unique tatamis
  const tatamis = Array.from(new Set(officials.map(o => o.assigned_tatami || 'Unassigned'))).sort();

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background relative">
      {/* Top Status Bar for Broadcast display */}
      <div className="shrink-0 bg-primary/10 border-b border-primary/20 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground uppercase tracking-wider">Officials Tatami Allocation</h1>
        </div>
        <div className="flex items-center gap-6 text-sm font-bold">
          <div className="text-muted-foreground">{currentTime}</div>
          <div className="flex items-center gap-1.5 text-emerald-500">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            LIVE SYNC
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-4 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 h-full">
          {tatamis.map((ring) => {
            const ringOfficials = officials.filter(o => (o.assigned_tatami || 'Unassigned') === ring);

            return (
              <div key={ring} className="bg-card border border-border rounded-xl p-6 shadow-2xl flex flex-col space-y-4">
                <div className="border-b border-border pb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-primary">
                    <MapPin className="h-6 w-6" />
                    <span className="font-extrabold text-xl uppercase tracking-wider">{ring}</span>
                  </div>
                  <span className="text-sm bg-secondary px-3 py-1 rounded-md font-bold text-muted-foreground">
                    {ringOfficials.length} assigned
                  </span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto pr-2">
                  {ringOfficials.length === 0 ? (
                    <div className="text-center text-sm text-muted-foreground italic py-8 border border-dashed border-border rounded-xl">
                      No officials assigned to this ring.
                    </div>
                  ) : (
                    ringOfficials.map((off) => (
                      <div 
                        key={off.id}
                        className="p-4 bg-secondary/35 border border-border/60 rounded-xl flex items-center justify-between gap-4"
                      >
                        <div className="min-w-0 flex items-center gap-4">
                          {off.photo_url ? (
                            <img src={off.photo_url} alt={off.name} className="w-12 h-12 rounded-full object-cover border-2 border-border" />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-lg font-bold text-muted-foreground border-2 border-border">
                              {off.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <span className="font-bold text-lg block text-foreground truncate">{off.name}</span>
                            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{off.qualification}</span>
                          </div>
                        </div>
                        <span className={`shrink-0 px-3 py-1 rounded text-xs font-black uppercase ${
                          off.role === 'Tatami Manager' ? 'bg-purple-500/10 text-purple-500 border border-purple-500/20' :
                          off.role === 'Referee' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                          off.role === 'Judge' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                          off.role === 'Coach' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                          'bg-gray-500/10 text-gray-500 border border-gray-500/20'
                        }`}>
                          {off.role === 'Table Official' ? 'Table' : off.role === 'Tatami Manager' ? 'Manager' : off.role}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
