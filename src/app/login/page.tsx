'use client';

import React from 'react';
import LoginComponent from '@/components/LoginComponent';

export default function LoginPage() {
  return (
    <div className="relative min-h-screen w-screen overflow-hidden">
      <LoginComponent />
      
      {/* System Status / Version Indicator */}
      <div className="absolute bottom-8 left-0 right-0 text-center text-[9px] text-slate-600 font-mono tracking-widest uppercase flex items-center justify-center gap-2 pointer-events-none z-20">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        Senshi Core v3.0.1
      </div>
    </div>
  );
}
