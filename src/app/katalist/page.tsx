'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, Printer, Maximize2, Minimize2, ArrowLeft, BookOpen, Globe } from 'lucide-react';
import { basePath } from '@/db/dbClient';
import { OFFICIAL_WKF_KATA_LIST, KataEntry } from '@/components/KataListModal';

export default function KataListPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  const col1 = useMemo(() => OFFICIAL_WKF_KATA_LIST.slice(0, 34), []);
  const col2 = useMemo(() => OFFICIAL_WKF_KATA_LIST.slice(34, 68), []);
  const col3 = useMemo(() => OFFICIAL_WKF_KATA_LIST.slice(68, 102), []);

  const isMatched = (kata: KataEntry) => {
    if (!searchTerm.trim()) return false;
    const term = searchTerm.trim().toLowerCase();
    return (
      kata.id.toString() === term ||
      kata.name.toLowerCase().includes(term)
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-900 flex flex-col print:bg-white print:text-black">
      
      {/* Top Controls Bar (Screen only, hidden when printing) */}
      <header className="sticky top-0 z-50 bg-[#0c1017] border-b border-slate-800 px-4 py-3 text-white flex items-center justify-between gap-3 shadow-lg print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/operator"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-bold border border-slate-700 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Back to Console</span>
          </Link>
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-sky-400" />
            <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-200">
              WKF Official Kata List Reference
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Search */}
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search Kata (1–102 / Name)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-800 text-white placeholder-slate-400 text-xs font-medium pl-8 pr-3 py-1.5 rounded-lg border border-slate-700 focus:outline-none focus:border-sky-400 w-40 sm:w-64 transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 text-slate-400 hover:text-white text-xs font-bold"
                title="Clear search"
              >
                ×
              </button>
            )}
          </div>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-bold border border-slate-700 transition cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>

          {/* Print Button */}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-black shadow-md shadow-sky-900/30 transition cursor-pointer"
            title="Print official document"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print Sheet</span>
          </button>
        </div>
      </header>

      {/* Main Document Content */}
      <main className="flex-1 p-3 sm:p-6 lg:p-10 flex items-center justify-center print:p-0 print:m-0">
        <div className="w-full max-w-5xl bg-white border border-slate-300 rounded-xl p-5 sm:p-8 shadow-2xl print:border-none print:shadow-none print:p-2 print:max-w-none">
          
          {/* Header: [WKF LOGO] --- KATA LIST --- [KarateTech / SP SportData] */}
          <header className="flex items-center justify-between pb-5 mb-5 border-b-2 border-slate-800 gap-3 sm:gap-6">
            {/* Left: Official WKF Logo */}
            <div className="flex items-center gap-2 shrink-0 min-w-[100px] sm:min-w-[140px]">
              <img
                src={`${basePath}/wkf-logo.svg`}
                alt="World Karate Federation Logo"
                className="h-14 sm:h-20 w-auto object-contain"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.style.display = 'none';
                  if (target.parentElement) {
                    const badge = document.createElement('div');
                    badge.className = 'font-black text-2xl text-red-600 tracking-tighter border-2 border-red-600 px-2 py-0.5 rounded';
                    badge.innerText = 'WKF';
                    target.parentElement.appendChild(badge);
                  }
                }}
              />
            </div>

            {/* Center: Title - displayed exactly once */}
            <div className="text-center flex-1 px-2">
              <h1
                className="text-3xl sm:text-4xl md:text-5xl font-black tracking-wider text-slate-900 uppercase font-sans leading-none"
                style={{ fontFamily: "'Montserrat', 'Arial Black', sans-serif" }}
              >
                KATA LIST
              </h1>
            </div>

            {/* Right: KarateTech + SP SportData Solution Branding */}
            <div className="flex flex-col items-end shrink-0 min-w-[110px] sm:min-w-[160px] text-right">
              <div className="flex items-center gap-2 justify-end">
                <img
                  src={`${basePath}/karatetech-logo.png`}
                  alt="KarateTech"
                  className="h-7 sm:h-8 w-auto object-contain rounded-full"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
                <span
                  className="font-black text-base sm:text-lg tracking-tight font-sans"
                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                >
                  <span className="text-red-600">Karate</span>
                  <span className="text-sky-500">Tech</span>
                </span>
              </div>
              <div
                className="text-[10px] sm:text-xs font-extrabold tracking-tight text-slate-600 uppercase mt-0.5"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                SP SportData Solution
              </div>
            </div>
          </header>

          {/* Three-Column Table Layout: 1–34 | 35–68 | 69–102 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            
            {/* Column 1: 1–34 */}
            <div className="border border-slate-300 rounded overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <tbody>
                  {col1.map((item) => {
                    const matched = isMatched(item);
                    return (
                      <tr
                        key={item.id}
                        className={`border-b border-slate-200 last:border-b-0 transition-colors ${
                          matched
                            ? 'bg-yellow-100 font-bold'
                            : item.id % 2 === 0
                            ? 'bg-slate-50/70'
                            : 'bg-white'
                        }`}
                      >
                        <td className="w-10 sm:w-12 py-1 px-2 text-right font-black text-[#0d6db1] tabular-nums border-r border-slate-200 select-none">
                          {item.id}
                        </td>
                        <td className="py-1 px-2.5 text-slate-900 font-semibold tracking-tight">
                          {item.name}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Column 2: 35–68 */}
            <div className="border border-slate-300 rounded overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <tbody>
                  {col2.map((item) => {
                    const matched = isMatched(item);
                    return (
                      <tr
                        key={item.id}
                        className={`border-b border-slate-200 last:border-b-0 transition-colors ${
                          matched
                            ? 'bg-yellow-100 font-bold'
                            : item.id % 2 === 0
                            ? 'bg-slate-50/70'
                            : 'bg-white'
                        }`}
                      >
                        <td className="w-10 sm:w-12 py-1 px-2 text-right font-black text-[#0d6db1] tabular-nums border-r border-slate-200 select-none">
                          {item.id}
                        </td>
                        <td className="py-1 px-2.5 text-slate-900 font-semibold tracking-tight">
                          {item.name}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Column 3: 69–102 */}
            <div className="border border-slate-300 rounded overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <tbody>
                  {col3.map((item) => {
                    const matched = isMatched(item);
                    return (
                      <tr
                        key={item.id}
                        className={`border-b border-slate-200 last:border-b-0 transition-colors ${
                          matched
                            ? 'bg-yellow-100 font-bold'
                            : item.id % 2 === 0
                            ? 'bg-slate-50/70'
                            : 'bg-white'
                        }`}
                      >
                        <td className="w-10 sm:w-12 py-1 px-2 text-right font-black text-[#0d6db1] tabular-nums border-r border-slate-200 select-none">
                          {item.id}
                        </td>
                        <td className="py-1 px-2.5 text-slate-900 font-semibold tracking-tight">
                          {item.name}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </div>

          {/* Document Footer */}
          <div className="mt-5 pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 select-none">
            <div>World Karate Federation (WKF) Official Kata List • 102 Kata Entries</div>
            <div className="font-semibold text-slate-600">KarateTech × SP SportData Solution</div>
          </div>

        </div>
      </main>

    </div>
  );
}
