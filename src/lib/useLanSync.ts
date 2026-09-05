'use client';

import { useState, useEffect, useRef } from 'react';

export interface LanSyncMessage {
  type: string;
  sourceClientId?: string;
  tatami?: number | string;
  payload?: any;
  timestamp?: string;
  [key: string]: any;
}

let globalSocket: WebSocket | null = null;
let globalClientId = typeof window !== 'undefined' 
  ? `client-${Date.now()}-${Math.random().toString(36).substr(2, 6)}` 
  : 'server';
let broadcastChannel: BroadcastChannel | null = null;
const listeners = new Set<(status: { isConnected: boolean; clientCount: number }) => void>();

let currentStatus = {
  isConnected: false,
  clientCount: 1
};

function notifyListeners() {
  listeners.forEach(fn => fn(currentStatus));
}

export function initLanSync() {
  if (typeof window === 'undefined') return;
  if (globalSocket && (globalSocket.readyState === WebSocket.OPEN || globalSocket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  // Setup local BroadcastChannel
  if (!broadcastChannel) {
    try {
      broadcastChannel = new BroadcastChannel('wkf-scoreboard-sync');
      broadcastChannel.onmessage = (event) => {
        const data = event.data;
        if (!data || typeof data !== 'object') return;

        // Prevent echo if message came from WebSocket
        if (data._fromLanWs) return;

        // Forward to WebSocket server if connected
        if (globalSocket && globalSocket.readyState === WebSocket.OPEN) {
          globalSocket.send(JSON.stringify({
            ...data,
            sourceClientId: globalClientId,
            timestamp: new Date().toISOString()
          }));
        }
      };
    } catch (e) {
      console.warn('BroadcastChannel not supported in this environment');
    }
  }

  // Connect to WebSocket server
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws`;

  try {
    const ws = new WebSocket(wsUrl);
    globalSocket = ws;

    ws.onopen = () => {
      currentStatus = { ...currentStatus, isConnected: true };
      notifyListeners();
    };

    ws.onmessage = (event) => {
      try {
        const msg: LanSyncMessage = JSON.parse(event.data);

        // Ignore our own echo
        if (msg.sourceClientId === globalClientId) return;

        if (msg.type === 'LAN_CLIENT_COUNT' && typeof msg.count === 'number') {
          currentStatus = { ...currentStatus, clientCount: msg.count };
          notifyListeners();
          return;
        }

        // Forward to local BroadcastChannel for UI consumption
        if (broadcastChannel) {
          broadcastChannel.postMessage({
            ...msg,
            _fromLanWs: true
          });
        }
      } catch (err) {
        console.warn('Error parsing incoming LAN sync message:', err);
      }
    };

    ws.onclose = () => {
      currentStatus = { ...currentStatus, isConnected: false };
      notifyListeners();
      globalSocket = null;
      // Reconnect after 3 seconds
      setTimeout(initLanSync, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
  } catch (err) {
    console.warn('Failed to initialize WebSocket LAN sync:', err);
    setTimeout(initLanSync, 5000);
  }
}

export function useLanSyncStatus() {
  const [status, setStatus] = useState(currentStatus);

  useEffect(() => {
    initLanSync();

    const listener = (newStatus: { isConnected: boolean; clientCount: number }) => {
      setStatus(newStatus);
    };

    listeners.add(listener);
    setStatus(currentStatus);

    return () => {
      listeners.delete(listener);
    };
  }, []);

  return status;
}

export function broadcastLanEvent(message: LanSyncMessage) {
  if (typeof window === 'undefined') return;

  const enriched = {
    ...message,
    sourceClientId: globalClientId,
    timestamp: new Date().toISOString()
  };

  // Local dispatch
  if (broadcastChannel) {
    broadcastChannel.postMessage(enriched);
  }

  // Network dispatch
  if (globalSocket && globalSocket.readyState === WebSocket.OPEN) {
    globalSocket.send(JSON.stringify(enriched));
  }
}
