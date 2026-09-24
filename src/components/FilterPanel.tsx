'use client';

import React, { useState, useEffect } from 'react';
import { useTournament, FilterState } from '@/context/TournamentContext';
import { db } from '@/db/dbClient';
import { Club, Coach, Country, Category } from '@/db/types';
import { X, RotateCcw } from 'lucide-react';

export default function FilterPanel() {
  const { filters, setFilters, resetFilters, isFilterOpen, setIsFilterOpen } = useTournament();

  const [clubs, setClubs] = useState<Club[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);

  // Sync local filters when global state changes
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [cList, coList, cntList] = await Promise.all([
          db.clubs.list(),
          db.coaches.list(),
          db.countries.list(),
        ]);
        setClubs(cList);
        setCoaches(coList);
        setCountries(cntList);
      } catch (e) {
        console.error(e);
      }
    };
    if (isFilterOpen) {
      fetchDropdowns();
    }
  }, [isFilterOpen]);

  if (!isFilterOpen) return null;

  const handleCheckboxChange = (key: Exclude<keyof FilterState, 'discipline'>, value: string) => {
    setLocalFilters(prev => {
      const currentValues = (prev[key] as string[]) || [];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(val => val !== value)
        : [...currentValues, value];
      
      return { ...prev, [key]: newValues };
    });
  };

  const handleApply = () => {
    setFilters(localFilters);
    setIsFilterOpen(false);
  };

  const handleReset = () => {
    resetFilters();
    setIsFilterOpen(false);
  };

  const renderSectionHeader = (title: string) => (
    <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 mt-4 first:mt-0">
      {title}
    </h5>
  );

  return (
    <div className="w-80 bg-card border-l border-border h-[calc(100vh-64px)] flex flex-col fixed right-0 top-16 z-20 shadow-xl animate-slide-in text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-sm">Filter Registrations</span>
          <span className="text-[10px] bg-secondary text-foreground px-1.5 py-0.5 rounded-full font-bold">
            Panel
          </span>
        </div>
        <button 
          onClick={() => setIsFilterOpen(false)}
          className="p-1 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Filter Options List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Gender */}
        <div>
          {renderSectionHeader('Gender')}
          <div className="space-y-1.5">
            {['Male', 'Female'].map(g => (
              <label key={g} className="flex items-center gap-2 text-xs cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={localFilters.gender.includes(g)}
                  onChange={() => handleCheckboxChange('gender', g)}
                  className="rounded border-border focus:ring-primary text-primary"
                />
                <span>{g}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Registration Status */}
        <div>
          {renderSectionHeader('Registration Status')}
          <div className="space-y-1.5">
            {['Confirmed', 'Pending', 'Checked In', 'Disqualified', 'Cancelled'].map(s => (
              <label key={s} className="flex items-center gap-2 text-xs cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={localFilters.status.includes(s)}
                  onChange={() => handleCheckboxChange('status', s)}
                  className="rounded border-border focus:ring-primary text-primary"
                />
                <span>{s}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Payment Status */}
        <div>
          {renderSectionHeader('Payment Status')}
          <div className="space-y-1.5">
            {['Paid', 'Unpaid', 'Pending'].map(p => (
              <label key={p} className="flex items-center gap-2 text-xs cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={localFilters.payment_status.includes(p)}
                  onChange={() => handleCheckboxChange('payment_status', p)}
                  className="rounded border-border focus:ring-primary text-primary"
                />
                <span>{p}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Medical Status */}
        <div>
          {renderSectionHeader('Medical Clearance')}
          <div className="space-y-1.5">
            {['Cleared', 'Review Needed', 'Action Required'].map(m => (
              <label key={m} className="flex items-center gap-2 text-xs cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={localFilters.medical_status.includes(m)}
                  onChange={() => handleCheckboxChange('medical_status', m)}
                  className="rounded border-border focus:ring-primary text-primary"
                />
                <span>{m}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Clubs */}
        {clubs.length > 0 && (
          <div>
            {renderSectionHeader('Club / Dojo')}
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {clubs.map(c => (
                <label key={c.id} className="flex items-center gap-2 text-xs cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={localFilters.club_id.includes(c.id)}
                    onChange={() => handleCheckboxChange('club_id', c.id)}
                    className="rounded border-border focus:ring-primary text-primary"
                  />
                  <span className="truncate">{c.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Coaches */}
        {coaches.length > 0 && (
          <div>
            {renderSectionHeader('Assignee Coach')}
            <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
              {coaches.map(c => (
                <label key={c.id} className="flex items-center gap-2 text-xs cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={localFilters.coach_id.includes(c.id)}
                    onChange={() => handleCheckboxChange('coach_id', c.id)}
                    className="rounded border-border focus:ring-primary text-primary"
                  />
                  <span>{c.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Countries */}
        {countries.length > 0 && (
          <div>
            {renderSectionHeader('Nationality / Flag')}
            <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
              {countries.map(c => (
                <label key={c.code} className="flex items-center gap-2 text-xs cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={localFilters.nationality_code.includes(c.code)}
                    onChange={() => handleCheckboxChange('nationality_code', c.code)}
                    className="rounded border-border focus:ring-primary text-primary"
                  />
                  <span>{c.flag_emoji} {c.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer buttons */}
      <div className="p-4 border-t border-border bg-secondary/10 flex items-center justify-between gap-2">
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 px-3 py-2 border border-border text-muted-foreground hover:text-foreground rounded-lg text-xs font-semibold cursor-pointer transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Reset</span>
        </button>
        <button
          onClick={handleApply}
          className="flex-1 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/95 rounded-lg text-xs font-bold text-center cursor-pointer shadow-xs transition-colors"
        >
          Apply Filters
        </button>
      </div>
    </div>
  );
}
