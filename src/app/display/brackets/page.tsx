'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { db, basePath } from '@/db/dbClient';
import { Bout, Participant, Club, Category, isKataCategory } from '@/db/types';
import { SportdataBracket } from '@/components/SportdataBracket';

function BracketDisplayContent() {
  const searchParams = useSearchParams();
  const categoryId = searchParams.get('categoryId');

  const [bouts, setBouts] = useState<Bout[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Initial load
  useEffect(() => {
    if (!categoryId) return;
    loadData();
  }, [categoryId]);

  // Polling for live updates
  useEffect(() => {
    if (!categoryId) return;
    const intervalId = setInterval(() => {
      fetchBoutsQuietly();
    }, 3000); // 3 seconds poll for live synchronization
    
    return () => clearInterval(intervalId);
  }, [categoryId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [bList, pList, clList, catList] = await Promise.all([
        db.bouts.list(),
        db.participants.list(),
        db.clubs.list(),
        db.categories.list()
      ]);
      setBouts(bList);
      setParticipants(pList);
      setClubs(clList);
      setCategories(catList);
    } catch (err) {
      console.error('Error loading bracket data', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBoutsQuietly = async () => {
    try {
      const bList = await db.bouts.list();
      setBouts(bList);
    } catch (err) {
      // ignore silent errors on poll
    }
  };

  const router = useRouter();

  const handleBoutClick = (bout: Bout) => {
    const isKata = category ? isKataCategory(category) : false;
    const scoreboardPath = isKata ? '/dashboard/kata-scoreboard' : '/dashboard/scoreboard';

    // Broadcast match switch across any open operator/referee screens
    if (typeof window !== 'undefined') {
      try {
        const channel = new BroadcastChannel('wkf-scoreboard-sync');
        channel.postMessage({
          type: 'LOAD_BOUT',
          boutId: bout.id,
          categoryId: bout.category_id
        });
        channel.close();
      } catch (e) {}
    }

    const targetUrl = `${scoreboardPath}?boutId=${bout.id}&catId=${bout.category_id}`;
    router.push(targetUrl);
  };

  if (!categoryId) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <h1 className="text-xl font-bold">No Category Selected</h1>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <div className="animate-pulse text-lg font-bold">Loading Live Bracket...</div>
      </div>
    );
  }

  const category = categories.find(c => c.id === categoryId);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background">
      {/* Optional Top Status Bar for Broadcast display */}
      <div className="shrink-0 bg-primary/10 border-b border-primary/20 px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-foreground uppercase tracking-wider">{category?.name || 'Tournament Bracket'}</h1>
        </div>
        <div className="flex items-center gap-4 text-xs font-bold">
          <div className="flex items-center gap-1.5 text-emerald-500">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            LIVE SYNC
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-4 md:p-8">
        <div className="w-full h-full min-h-[800px] border border-border rounded-xl bg-card overflow-hidden shadow-2xl">
          <SportdataBracket
            bouts={bouts}
            participants={participants}
            clubs={clubs}
            categories={categories}
            selectedCatId={categoryId}
            canModify={true}
            onBoutClick={handleBoutClick}
            hideZoomControls={false}
          />
        </div>
      </div>
    </div>
  );
}

export default function BracketsDisplayPage() {
  return (
    <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center font-bold">Initializing...</div>}>
      <BracketDisplayContent />
    </Suspense>
  );
}
