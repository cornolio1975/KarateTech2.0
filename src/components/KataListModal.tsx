'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { X, Search, Printer, BookOpen, Check, ExternalLink } from 'lucide-react';
import { basePath } from '@/db/dbClient';

export interface KataEntry {
  id: number;
  name: string;
}

export const OFFICIAL_WKF_KATA_LIST: KataEntry[] = [
  { id: 1, name: 'Anan' },
  { id: 2, name: 'Anan Dai' },
  { id: 3, name: 'Ananko' },
  { id: 4, name: 'Aoyagi' },
  { id: 5, name: 'Bassai' },
  { id: 6, name: 'Bassai Dai' },
  { id: 7, name: 'Bassai Sho' },
  { id: 8, name: 'Chatanyara Kushanku' },
  { id: 9, name: 'Chibana No Kushanku' },
  { id: 10, name: 'Chinte' },
  { id: 11, name: 'Chinto' },
  { id: 12, name: 'Enpi' },
  { id: 13, name: 'Fukyugata Ichi' },
  { id: 14, name: 'Fukyugata Ni' },
  { id: 15, name: 'Gankaku' },
  { id: 16, name: 'Garyu' },
  { id: 17, name: 'Gekisai (Geksai) 1' },
  { id: 18, name: 'Gekisai (Geksai) 2' },
  { id: 19, name: 'Gojushiho' },
  { id: 20, name: 'Gojushiho Dai' },
  { id: 21, name: 'Gojushiho Sho' },
  { id: 22, name: 'Hakusho' },
  { id: 23, name: 'Hangetsu' },
  { id: 24, name: 'Haufa (Haffa)' },
  { id: 25, name: 'Heian Shodan' },
  { id: 26, name: 'Heian Nidan' },
  { id: 27, name: 'Heian Sandan' },
  { id: 28, name: 'Heian Yondan' },
  { id: 29, name: 'Heian Godan' },
  { id: 30, name: 'Heiku' },
  { id: 31, name: 'Ishimine Bassai' },
  { id: 32, name: 'Itosu Rohai Shodan' },
  { id: 33, name: 'Itosu Rohai Nidan' },
  { id: 34, name: 'Itosu Rohai Sandan' },
  { id: 35, name: 'Jiin' },
  { id: 36, name: 'Jion' },
  { id: 37, name: 'Jitte' },
  { id: 38, name: 'Juroku' },
  { id: 39, name: 'Kanchin' },
  { id: 40, name: 'Kanku Dai' },
  { id: 41, name: 'Kanku Sho' },
  { id: 42, name: 'Kanshu' },
  { id: 43, name: 'Kishimoto No Kushanku' },
  { id: 44, name: 'Kousoukun' },
  { id: 45, name: 'Kousoukun Dai' },
  { id: 46, name: 'Kousoukun Sho' },
  { id: 47, name: 'Kururunfa' },
  { id: 48, name: 'Kusanku' },
  { id: 49, name: 'Kyan No Chinto' },
  { id: 50, name: 'Kyan No Wanshu' },
  { id: 51, name: 'Matsukaze' },
  { id: 52, name: 'Matsumura Bassai' },
  { id: 53, name: 'Matsumura Rohai' },
  { id: 54, name: 'Meikyo' },
  { id: 55, name: 'Myojo' },
  { id: 56, name: 'Naifanchin Shodan' },
  { id: 57, name: 'Naifanchin Nidan' },
  { id: 58, name: 'Naifanchin Sandan' },
  { id: 59, name: 'Naihanchi' },
  { id: 60, name: 'Nijushiho' },
  { id: 61, name: 'Nipaipo' },
  { id: 62, name: 'Niseishi' },
  { id: 63, name: 'Ohan' },
  { id: 64, name: 'Ohan Dai' },
  { id: 65, name: 'Oyadomari No Passai' },
  { id: 66, name: 'Pachu' },
  { id: 67, name: 'Paiku' },
  { id: 68, name: 'Papuren' },
  { id: 69, name: 'Passai' },
  { id: 70, name: 'Pinan Shodan' },
  { id: 71, name: 'Pinan Nidan' },
  { id: 72, name: 'Pinan Sandan' },
  { id: 73, name: 'Pinan Yondan' },
  { id: 74, name: 'Pinan Godan' },
  { id: 75, name: 'Rohai' },
  { id: 76, name: 'Saifa' },
  { id: 77, name: 'Sanchin' },
  { id: 78, name: 'Sansai' },
  { id: 79, name: 'Sanseiru' },
  { id: 80, name: 'Sanseru' },
  { id: 81, name: 'Seichin' },
  { id: 82, name: 'Seienchin (Seiyunchin)' },
  { id: 83, name: 'Seipai' },
  { id: 84, name: 'Seiryu' },
  { id: 85, name: 'Seishan' },
  { id: 86, name: 'Seisan (Sesan)' },
  { id: 87, name: 'Shiho Kousoukun' },
  { id: 88, name: 'Shinpa' },
  { id: 89, name: 'Shinsei' },
  { id: 90, name: 'Shisochin' },
  { id: 91, name: 'Sochin' },
  { id: 92, name: 'Suparinpei' },
  { id: 93, name: 'Tekki Shodan' },
  { id: 94, name: 'Tekki Nidan' },
  { id: 95, name: 'Tekki Sandan' },
  { id: 96, name: 'Tensho' },
  { id: 97, name: 'Tomari Bassai' },
  { id: 98, name: 'Unshu' },
  { id: 99, name: 'Unsu' },
  { id: 100, name: 'Useishi' },
  { id: 101, name: 'Wankan' },
  { id: 102, name: 'Wanshu' },
];

interface KataListModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function KataListModal({ isOpen, onClose }: KataListModalProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 lg:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="katalist-title"
    >
      {/* Modal Container */}
      <div className="relative w-full max-w-5xl bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[96vh] my-auto border border-slate-200">
        
        {/* Top Control Bar (Screen only, hidden on print) */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 text-white shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-sky-400" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-200">
              Official Reference Document
            </span>
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
                className="bg-slate-800 text-white placeholder-slate-400 text-xs font-medium pl-8 pr-3 py-1 rounded-lg border border-slate-700 focus:outline-none focus:border-sky-400 w-44 sm:w-60 transition"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 text-slate-400 hover:text-white text-xs font-bold"
                  title="Clear search"
                >
                  ×
                </button>
              )}
            </div>

            {/* Open in New Tab Button */}
            <button
              onClick={() => window.open(`${basePath}/katalist`, '_blank')}
              title="Open Kata List in new browser tab / window"
              className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-bold border border-slate-700 transition cursor-pointer"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New Tab</span>
            </button>

            {/* Print Button */}
            <button
              onClick={() => window.print()}
              title="Print official Kata List sheet"
              className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-bold border border-slate-700 transition cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>

            {/* Large Touchscreen-Friendly Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded-lg transition cursor-pointer flex items-center justify-center ml-1"
              aria-label="Close Kata List modal"
              title="Close (Esc)"
            >
              <X className="h-5 w-5 sm:h-5 sm:w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Document Sheet */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-white print:p-0 print:overflow-visible">
          <div className="w-full max-w-4xl mx-auto border border-slate-300 rounded-lg p-4 sm:p-6 bg-white shadow-xs print:border-none print:shadow-none print:p-2">
            
            {/* Header: [WKF LOGO] --- KATA LIST --- [KarateTech / SP SportData] */}
            <header className="flex items-center justify-between pb-4 mb-4 border-b-2 border-slate-800 gap-2 sm:gap-4">
              {/* Left: Official WKF Logo */}
              <div className="flex items-center gap-2 shrink-0 min-w-[90px] sm:min-w-[120px]">
                <img
                  src={`${basePath}/wkf-logo.svg`}
                  alt="World Karate Federation Logo"
                  className="h-12 sm:h-16 w-auto object-contain"
                  onError={(e) => {
                    // Fallback to text badge if asset failed
                    const target = e.currentTarget;
                    target.style.display = 'none';
                    if (target.parentElement) {
                      const badge = document.createElement('div');
                      badge.className = 'font-black text-xl text-red-600 tracking-tighter border-2 border-red-600 px-2 py-0.5 rounded';
                      badge.innerText = 'WKF';
                      target.parentElement.appendChild(badge);
                    }
                  }}
                />
              </div>

              {/* Center: Popup Title - displayed exactly once */}
              <div className="text-center flex-1 px-2">
                <h1
                  id="katalist-title"
                  className="text-2xl sm:text-3xl md:text-4xl font-black tracking-wider text-slate-900 uppercase font-sans leading-none"
                  style={{ fontFamily: "'Montserrat', 'Arial Black', sans-serif" }}
                >
                  KATA LIST
                </h1>
              </div>

              {/* Right: KarateTech + SP SportData Solution Branding */}
              <div className="flex flex-col items-end shrink-0 min-w-[100px] sm:min-w-[140px] text-right">
                <div className="flex items-center gap-1.5 justify-end">
                  <img
                    src={`${basePath}/karatetech-logo.png`}
                    alt="KarateTech"
                    className="h-6 sm:h-7 w-auto object-contain rounded-full"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                  <span
                    className="font-black text-sm sm:text-base tracking-tight font-sans"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}
                  >
                    <span className="text-red-600">Karate</span>
                    <span className="text-sky-500">Tech</span>
                  </span>
                </div>
                <div
                  className="text-[9px] sm:text-[10.5px] font-extrabold tracking-tight text-slate-600 uppercase mt-0.5"
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

            {/* Document Footer Note */}
            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-[9.5px] text-slate-500 font-medium select-none">
              <div>World Karate Federation (WKF) Official Kata List • 102 Kata Entries</div>
              <div className="font-semibold text-slate-600">KarateTech × SP SportData Solution</div>
            </div>

          </div>
        </div>

        {/* Modal Bottom Bar */}
        <div className="px-4 py-2 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 shrink-0 print:hidden">
          <span className="text-[11px]">
            Tip: Use <kbd className="px-1.5 py-0.5 bg-slate-200 border border-slate-300 rounded text-[10px] font-mono">Esc</kbd> or click <b>Close</b> to return to console.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-xs transition cursor-pointer shadow-xs"
          >
            Close Sheet
          </button>
        </div>

      </div>
    </div>
  );
}
