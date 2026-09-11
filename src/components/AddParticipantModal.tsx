'use client';

import React, { useState, useEffect } from 'react';
import { useTournament } from '@/context/TournamentContext';
import { db } from '@/db/dbClient';
import { Club, Coach, Country, Category, isKataCategory, isKumiteCategory } from '@/db/types';
import { X, Upload, Check, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function AddParticipantModal() {
  const { isAddOpen, setIsAddOpen, triggerRefresh } = useTournament();

  const [clubs, setClubs] = useState<Club[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Form Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female'>('Male');
  const [dob, setDob] = useState('');
  const [nationality, setNationality] = useState('MAS');
  const [passportIc, setPassportIc] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [clubId, setClubId] = useState('');
  const [coachId, setCoachId] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [medicalConditions, setMedicalConditions] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'Paid' | 'Unpaid' | 'Pending'>('Unpaid');
  const [remarks, setRemarks] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [isKumite, setIsKumite] = useState(true);
  const [isKata, setIsKata] = useState(false);

  // Auto assignment preview
  const [previewCats, setPreviewCats] = useState<Category[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [cList, coList, cntList, catList] = await Promise.all([
          db.clubs.list(),
          db.coaches.list(),
          db.countries.list(),
          db.categories.list()
        ]);
        setClubs(cList);
        setCoaches(coList);
        setCountries(cntList);
        setCategories(catList);
        
        if (cList.length > 0) setClubId(cList[0].id);
        if (coList.length > 0) setCoachId(coList[0].id);
      } catch (e) {
        console.error(e);
      }
    };
    if (isAddOpen) {
      fetchDropdowns();
    }
  }, [isAddOpen]);

  // Recalculate auto assignment preview when gender, dob, weight, isKumite, or isKata changes
  useEffect(() => {
    if (!dob || !gender) {
      setPreviewCats([]);
      return;
    }

    const calculatedAge = () => {
      const birth = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      return age;
    };

    const age = calculatedAge();
    const w = parseFloat(weight) || 0;
    const pGenderNorm = gender.toLowerCase().startsWith('f') ? 'Female' : 'Male';

    const matched = categories.filter(c => {
      if (c.status === 'Closed') return false;

      const cGenderNorm = c.gender || 'Male';
      const genderMatches = cGenderNorm === 'Mixed' || cGenderNorm === pGenderNorm;
      if (!genderMatches) return false;

      const ageMatches = age >= c.min_age && age <= c.max_age;
      if (!ageMatches) return false;

      const isKataCat = isKataCategory(c);
      const isKumiteCat = isKumiteCategory(c);

      if (isKumite || isKata) {
        if (isKataCat && !isKata) return false;
        if (isKumiteCat && !isKumite) return false;
      } else {
        return false;
      }

      if (isKataCat) {
        return true;
      }

      const isWeightFree = (c.min_weight === 0 && (c.max_weight === 0 || c.max_weight >= 100));
      return isWeightFree || (w >= c.min_weight && w <= c.max_weight);
    });

    setPreviewCats(matched);
  }, [gender, dob, weight, isKumite, isKata, categories]);

  if (!isAddOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullName = `${firstName} ${lastName}`.trim();
    if (!fullName || !dob || !passportIc || !weight || !height) {
      alert('Please fill in all required fields (First Name, Last Name, DOB, IC/Passport, Weight, Height).');
      return;
    }

    setIsSaving(true);
    try {
      const newPart = await db.participants.add({
        full_name: `${firstName} ${lastName}`.trim(),
        gender,
        dob,
        nationality_code: nationality,
        passport_ic: passportIc,
        email,
        phone,
        emergency_contact_name: emergencyName,
        emergency_contact_phone: emergencyPhone,
        club_id: clubId || undefined,
        coach_id: coachId || undefined,
        weight: parseFloat(weight),
        height: parseFloat(height),
        status: 'Pending',
        payment_status: paymentStatus,
        medical_status: 'Cleared',
        isKumite,
        isKata,
        remarks: remarks || medicalConditions ? `Conditions: ${medicalConditions}. Remarks: ${remarks}` : '',
        photo_url: photoUrl || undefined
      });

      // Fire confetti celebration on successful addition
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      triggerRefresh();
      setIsAddOpen(false);
      resetForm();
    } catch (e: any) {
      alert(`Failed to save participant: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setGender('Male');
    setDob('');
    setNationality('MAS');
    setPassportIc('');
    setEmail('');
    setPhone('');
    setEmergencyName('');
    setEmergencyPhone('');
    setWeight('');
    setHeight('');
    setMedicalConditions('');
    setPaymentStatus('Unpaid');
    setRemarks('');
    setPhotoUrl('');
    setIsKumite(true);
    setIsKata(false);
    setPreviewCats([]);
  };

  // Quick photo selection simulation
  const mockAvatarPhotos = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100&h=100',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100&h=100',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100&h=100',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100&h=100'
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 text-foreground">
      <div className="bg-card w-full max-w-3xl rounded-xl shadow-xl overflow-hidden flex flex-col h-[90vh] border border-border animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-secondary/10">
          <div>
            <h3 className="font-bold text-lg">Add New Tournament Participant</h3>
            <p className="text-xs text-muted-foreground">Fill in the profile details. System will auto-assign event categories.</p>
          </div>
          <button 
            onClick={() => { setIsAddOpen(false); resetForm(); }} 
            className="p-1 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quick Notice for Bulk Import */}
          <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in">
            <div className="space-y-0.5 text-left w-full">
              <span className="font-bold text-xs text-foreground block">Need to import participants in bulk?</span>
              <span className="text-[11px] text-muted-foreground block">
                Use the CSV Import Wizard to load participants grouped by Dojo club automatically.
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsAddOpen(false);
                resetForm();
                window.dispatchEvent(new CustomEvent('open-import-modal'));
              }}
              className="px-3.5 py-2 bg-secondary hover:bg-secondary/80 border border-border text-foreground hover:text-primary rounded-lg text-xs font-bold transition shrink-0 cursor-pointer shadow-2xs"
            >
              Go to CSV Import
            </button>
          </div>

          {/* Section 1: Photo & Main */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Mock Photo Select */}
            <div className="flex flex-col items-center justify-center border border-border rounded-xl p-4 bg-secondary/10">
              <div className="relative w-24 h-24 rounded-full overflow-hidden bg-secondary border border-border flex items-center justify-center mb-3">
                {photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
                ) : (
                  <Upload className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Simulate Photo Select</span>
              <div className="flex gap-2 justify-center">
                {mockAvatarPhotos.map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPhotoUrl(url)}
                    className={`w-8 h-8 rounded-full overflow-hidden border-2 transition-all cursor-pointer ${
                      photoUrl === url ? 'border-primary scale-105' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Avatar option ${idx}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* Basic Info */}
            <div className="md:col-span-2 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Aainesh"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-foreground"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Last Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Vamathevan"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Gender *</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-foreground"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Date of Birth *</label>
                  <input
                    type="date"
                    required
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-foreground"
                  />
                </div>
              </div>
            </div>
          </div>

          <hr className="border-border" />

          {/* Section 2: Identity & Contact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Passport / IC No *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 050412-14-1235 / A12345678"
                  value={passportIc}
                  onChange={(e) => setPassportIc(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-foreground"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Nationality *</label>
                <select
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-foreground"
                >
                  {countries.map(c => (
                    <option key={c.code} value={c.code}>
                      {c.flag_emoji} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. athlete@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-foreground"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="e.g. +6012-3456789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-foreground"
                />
              </div>
            </div>

            {/* emergency + physical */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Weight (kg) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 62.5"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-foreground"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Height (cm) *</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    placeholder="e.g. 175"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Club / Dojo</label>
                  <select
                    value={clubId}
                    onChange={(e) => setClubId(e.target.value)}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-foreground"
                  >
                    <option value="">No Club (Independent)</option>
                    {clubs.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Assign Coach</label>
                  <select
                    value={coachId}
                    onChange={(e) => setCoachId(e.target.value)}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-foreground"
                  >
                    <option value="">No Coach</option>
                    {coaches.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Emergency Contact Name</label>
                <input
                  type="text"
                  placeholder="e.g. Mother's name"
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-foreground"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Emergency Contact Phone</label>
                <input
                  type="text"
                  placeholder="e.g. +6011-9999888"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-foreground"
                />
              </div>
            </div>
          </div>

          <hr className="border-border" />

          {/* Section: Competition Events */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Competition Events</h4>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={isKumite} 
                  onChange={(e) => setIsKumite(e.target.checked)} 
                  className="w-4 h-4 rounded border-border bg-secondary text-primary focus:ring-primary accent-primary"
                />
                <span className="text-sm font-medium text-foreground">Kumite</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={isKata} 
                  onChange={(e) => setIsKata(e.target.checked)} 
                  className="w-4 h-4 rounded border-border bg-secondary text-primary focus:ring-primary accent-primary"
                />
                <span className="text-sm font-medium text-foreground">Kata</span>
              </label>
            </div>
          </div>

          <hr className="border-border" />

          {/* Section 3: Medical conditions & Category Auto assignment indicator */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Medical Conditions</label>
                <input
                  type="text"
                  placeholder="e.g. Asthma, allergies, or 'None'"
                  value={medicalConditions}
                  onChange={(e) => setMedicalConditions(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-foreground"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Initial Payment Status</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-foreground"
                >
                  <option value="Paid">Paid (Simulate Checkout)</option>
                  <option value="Unpaid">Unpaid</option>
                  <option value="Pending">Pending Audit</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Administrative Remarks</label>
                <textarea
                  placeholder="Internal administrative comments..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full h-20 px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-foreground"
                />
              </div>
            </div>

            {/* Category Auto Assignment Previewer */}
            <div className="bg-secondary/40 border border-border rounded-xl p-5 flex flex-col justify-center space-y-3">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Real-Time Category Auto-Assignment
              </span>
              {previewCats.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <Check className="h-4.5 w-4.5 bg-emerald-500/10 rounded-full p-0.5 shrink-0" />
                    <span className="text-xs font-bold">{previewCats.length} Category Matched (Auto-Assigned)</span>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {previewCats.map(cat => (
                      <div key={cat.id} className="bg-card border border-border p-3 rounded-lg space-y-1">
                        <span className="font-extrabold text-xs block text-foreground">{cat.name}</span>
                        <span className="text-[10px] text-muted-foreground block">
                          Discipline: {isKataCategory(cat) ? 'Kata' : 'Kumite'} • Gender: {cat.gender} • Age: {cat.min_age}-{cat.max_age} yr {isKataCategory(cat) ? '' : `• Weight: ${cat.min_weight}-${cat.max_weight}kg`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground py-6 text-center space-y-1.5 border border-dashed border-border rounded-lg">
                  <span className="block font-semibold">No Category Matched</span>
                  <span className="block text-[10px] max-w-[220px] mx-auto leading-relaxed">
                    Select Kumite and/or Kata events and enter Gender, DOB, and Weight to auto-match categories.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="flex justify-end gap-2.5 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => { setIsAddOpen(false); resetForm(); }}
              className="px-4 py-2 border border-border text-muted-foreground hover:text-foreground rounded-lg text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-primary text-primary-foreground hover:bg-primary/95 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" /> Save Registration
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
