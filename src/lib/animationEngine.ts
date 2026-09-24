import { supabase } from '@/db/dbClient';

export interface AnimationEvent {
  tournamentId: string;
  tatamiId?: string;
  scoreType: 'YUKO' | 'WAZA-ARI' | 'IPPON';
  side: 'AKA' | 'AO';
  animationTrigger: string;
}

/**
 * Emits an animation event via Supabase Realtime broadcast channel.
 * Does not block or fail if the broadcast fails.
 */
export const triggerAnimation = async (event: AnimationEvent) => {
  if (!supabase) return;

  try {
    const channelName = `kt3_animations_${event.tournamentId}${event.tatamiId ? `_${event.tatamiId}` : ''}`;
    const channel = supabase.channel(channelName);
    
    await channel.httpSend('animation_trigger', event);
    
    // Unsubscribe immediately after sending to avoid keeping the connection open unnecessarily
    supabase.removeChannel(channel);
  } catch (error) {
    console.warn('Animation engine broadcast failed (non-blocking):', error);
  }
};
