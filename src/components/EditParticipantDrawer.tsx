'use client';

import React, { useState, useEffect } from 'react';
import { useTournament } from '@/context/TournamentContext';
import { db } from '@/db/dbClient';
import { 
  Club, Coach, Country, Category, Participant, 
  Payment, MedicalRecord, Document, ActivityLog, AuditLog 
} from '@/db/types';
import { X, Save, FileText, CheckCircle2, History, CreditCard, Shield, BadgeAlert, Paperclip, Trash2, RefreshCw, Camera, UserSquare2 } from 'lucide-react';
import PlayerPhotoModal from './PlayerPhotoModal';

interface EditParticipantDrawerProps {
  participantId: string | null;
  onClose: () => void;
}

type TabType = 'personal' | 'tournament' | 'category' | 'medical' | 'payment' | 'documents' | 'history';

export default function EditParticipantDrawer({ participantId, onClose }: EditParticipantDrawerProps) {
  const { triggerRefresh, canModify } = useTournament();
  
  const [activeTab, setActiveTab] = useState<TabType>('personal');
  const [loading, setLoading] = useState(true);
  
  // Dropdowns
  const [clubs, setClubs] = useState<Club[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Local state form fields
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [fullName, setFullName] = useState('');
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
  const [status, setStatus] = useState<'Confirmed' | 'Pending' | 'Checked In' | 'Disqualified' | 'Cancelled'>('Pending');
  const [remarks, setRemarks] = useState('');
  const [isKumite, setIsKumite] = useState(false);
  const [isKata, setIsKata] = useState(false);

  // Category mapping state
  const [assignedCat, setAssignedCat] = useState<Category | null>(null);
  const [manualOverride, setManualOverride] = useState(false);
  const [selectedCatId, setSelectedCatId] = useState('');

  // Medical Record state
  const [medRecord, setMedRecord] = useState<MedicalRecord | null>(null);
  const [conditions, setConditions] = useState('');
  const [allergies, setAllergies] = useState('');
  const [bloodType, setBloodType] = useState('O+');
  const [hasClearance, setHasClearance] = useState(true);
  const [medicalRemarks, setMedicalRemarks] = useState('');

  // Payment state
  const [payments, setPayments] = useState<Payment[]>([]);
  const [payAmount, setPayAmount] = useState('150');
  const [payStatus, setPayStatus] = useState<'Paid' | 'Unpaid' | 'Refunded' | 'Pending'>('Unpaid');
  const [payMethod, setPayMethod] = useState('Credit Card');
  const [txnId, setTxnId] = useState('');

  // Documents state
  const [docs, setDocs] = useState<Document[]>([]);
  const [newDocName, setNewDocName] = useState('');
  const [newDocType, setNewDocType] = useState('Identity');
  
  // History & Audits
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [audits, setAudits] = useState<AuditLog[]>([]);

  // Load dropdown lists once
  useEffect(() => {
    const fetchLists = async () => {
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
      } catch (e) {
        console.error(e);
      }
    };
    fetchLists();
  }, []);

  // Fetch participant specific details whenever participantId changes
  useEffect(() => {
    const fetchParticipantData = async () => {
      if (!participantId) {
        setParticipant(null);
        return;
      }

      setLoading(true);
      try {
        const p = await db.participants.get(participantId);
        if (!p) {
          onClose();
          return;
        }

        // Map basic fields
        setParticipant(p);
        setFullName(p.full_name);
        setGender(p.gender);
        setDob(p.dob);
        setNationality(p.nationality_code || 'MAS');
        setPassportIc(p.passport_ic);
        setEmail(p.email || '');
        setPhone(p.phone || '');
        setEmergencyName(p.emergency_contact_name || '');
        setEmergencyPhone(p.emergency_contact_phone || '');
        setClubId(p.club_id || '');
        setCoachId(p.coach_id || '');
        setWeight(String(p.weight));
        setHeight(String(p.height));
        setStatus(p.status);
        setRemarks(p.remarks || '');
        setIsKumite(p.isKumite || false);
        setIsKata(p.isKata || false);

        // Fetch category
        const mapping = await db.participants.getAssignedCategory(p.id);
        const listMappings = await db.participantCategories.list();
        const thisMapping = listMappings.find((m: any) => m.participant_id === p.id);
        
        setAssignedCat(mapping || null);
        setManualOverride(thisMapping?.manual_override || false);
        setSelectedCatId(mapping?.id || '');

        // Fetch Medical Clearance
        const med = await db.medical.get(p.id);
        if (med) {
          setMedRecord(med);
          setConditions(med.conditions || 'None');
          setAllergies(med.allergies || 'None');
          setBloodType(med.blood_type || 'O+');
          setHasClearance(med.has_clearance);
          setMedicalRemarks(med.remarks || '');
        } else {
          setMedRecord(null);
        }

        // Fetch Payments
        const pList = await db.payments.list();
        const thisPays = pList.filter(pay => pay.participant_id === p.id);
        setPayments(thisPays);
        if (thisPays.length > 0) {
          setPayAmount(String(thisPays[0].amount));
          setPayStatus(thisPays[0].status);
          setPayMethod(thisPays[0].payment_method || 'Credit Card');
          setTxnId(thisPays[0].transaction_id || '');
        }

        // Fetch Documents
        const dList = await db.documents.list(p.id);
        setDocs(dList);

        // Fetch Activity History & Auditing Logs
        const actList = await db.activityLogs.list(p.id);
        setLogs(actList);

        const auditList = await db.audit.list();
        const thisAudits = auditList.filter(a => a.record_id === p.id);
        setAudits(thisAudits);

      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchParticipantData();
  }, [participantId, onClose]);

  if (!participantId || !participant) return null;

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Update basic participant columns
      const updated = await db.participants.update(participant.id, {
        full_name: fullName,
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
        weight: parseFloat(weight) || 0,
        height: parseFloat(height) || 0,
        status,
        remarks,
        isKumite,
        isKata,
        payment_status: payStatus === 'Refunded' ? 'Unpaid' : payStatus,
        medical_status: hasClearance ? 'Cleared' : 'Review Needed'
      }, 'Admin Director');

      // 2. Save Category mapping (override vs auto assign)
      if (manualOverride) {
        if (selectedCatId) {
          await db.participants.assignCategoryManually(participant.id, selectedCatId, 'Admin Director');
        }
      } else {
        // Auto-assign category
        await db.participants.autoAssignCategory(updated);
      }

      // 3. Save Medical changes
      if (medRecord) {
        await db.medical.update(medRecord.id, {
          conditions,
          allergies,
          blood_type: bloodType,
          has_clearance: hasClearance,
          remarks: medicalRemarks
        });
      } else {
        await db.medical.create(participant.id, {
          conditions,
          allergies,
          blood_type: bloodType,
          has_clearance: hasClearance,
          remarks: medicalRemarks
        });
      }

      // 4. Save Payment edits
      if (payments.length > 0) {
        await db.payments.update(payments[0].id, {
          amount: parseFloat(payAmount) || 0,
          status: payStatus,
          payment_method: payMethod,
          transaction_id: txnId
        });
      } else {
        await db.payments.create(participant.id, {
          amount: parseFloat(payAmount) || 150,
          status: payStatus,
          payment_method: payMethod,
          transaction_id: txnId
        });
      }

      alert('Athletes registration saved successfully.');
      triggerRefresh();
      onClose();
    } catch (e: any) {
      alert(`Update failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName) return;

    try {
      const mockUrl = `/mock/docs/${newDocName.toLowerCase().replace(/ /g, '_')}`;
      const newDoc = await db.documents.upload(participant.id, newDocName, newDocType, mockUrl);
      setDocs(prev => [...prev, newDoc]);
      setNewDocName('');
      triggerRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDocumentDelete = async (docId: string) => {
    if (confirm('Delete this document scan?')) {
      try {
        await db.documents.delete(docId);
        setDocs(prev => prev.filter(d => d.id !== docId));
        triggerRefresh();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const getBadgeColors = (s: string) => {
    switch (s) {
      case 'Confirmed': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'Checked In': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'Pending': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case 'Disqualified': return 'bg-red-500/10 text-red-600 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs flex justify-end text-foreground">
      {/* Backdrop area click closes */}
      <div className="flex-1" onClick={onClose}></div>

      {/* Drawer Panel */}
      <div className="w-full max-w-2xl bg-card border-l border-border h-full shadow-2xl flex flex-col animate-slide-in">
        {/* Header */}
        <div className="p-6 border-b border-border bg-secondary/15 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm border border-border">
              {fullName.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">{fullName}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-mono text-muted-foreground">{participant.registration_no}</span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${getBadgeColors(status)}`}>
                  {status}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Headers */}
        <div className="flex border-b border-border overflow-x-auto bg-secondary/5 shrink-0">
          {(['personal', 'tournament', 'category', 'medical', 'payment', 'documents', 'history'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === tab 
                  ? 'border-primary text-foreground bg-card' 
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Form Container */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <RefreshCw className="h-6 w-6 text-primary animate-spin" />
              <span className="text-xs text-muted-foreground">Loading record telemetry...</span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSaveChanges} className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* 1. PERSONAL TAB */}
            {activeTab === 'personal' && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <FileText className="h-4 w-4" /> Personal Information
                </h4>
                
                <div className="flex flex-col sm:flex-row gap-6 items-start">
                  {/* Photo Frame */}
                  <div className="flex flex-col items-center gap-2">
                    <div 
                      className="w-24 h-32 rounded-xl bg-black/40 border-2 border-white/10 overflow-hidden flex items-center justify-center cursor-pointer group relative shadow-lg hover:border-white/30 transition-colors"
                      onClick={() => setIsPhotoModalOpen(true)}
                    >
                      {participant?.photo_url
                        ? <img src={participant.photo_url} alt={fullName} className="w-full h-full object-cover" />
                        : <UserSquare2 className="h-12 w-12 text-white/10 group-hover:text-white/20 transition-colors" />
                      }
                      <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="h-6 w-6 text-white mb-1" />
                        <span className="text-[9px] font-black text-white uppercase tracking-widest">Change</span>
                      </div>
                    </div>
                  </div>

                  {/* Personal Info Grid */}
                  <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs text-foreground focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value as any)}
                      className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs text-foreground focus:outline-none"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Date of Birth</label>
                    <input
                      type="date"
                      required
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs text-foreground focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Passport / IC Number</label>
                    <input
                      type="text"
                      required
                      value={passportIc}
                      onChange={(e) => setPassportIc(e.target.value)}
                      className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs text-foreground focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Nationality</label>
                    <select
                      value={nationality}
                      onChange={(e) => setNationality(e.target.value)}
                      className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs text-foreground focus:outline-none"
                    >
                      {countries.map(c => (
                        <option key={c.code} value={c.code}>{c.flag_emoji} {c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs text-foreground focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs text-foreground focus:outline-none"
                    />
                  </div>
                </div>
                </div>

                <hr className="border-border" />
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Emergency Contact</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Contact Name</label>
                    <input
                      type="text"
                      value={emergencyName}
                      onChange={(e) => setEmergencyName(e.target.value)}
                      className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs text-foreground focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Contact Phone</label>
                    <input
                      type="text"
                      value={emergencyPhone}
                      onChange={(e) => setEmergencyPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs text-foreground focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 2. TOURNAMENT TAB */}
            {activeTab === 'tournament' && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> Tournament Registration Settings
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Club / Dojo Representation</label>
                    <select
                      value={clubId}
                      onChange={(e) => setClubId(e.target.value)}
                      className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs text-foreground focus:outline-none"
                    >
                      <option value="">No Club (Independent)</option>
                      {clubs.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Assigned Coach</label>
                    <select
                      value={coachId}
                      onChange={(e) => setCoachId(e.target.value)}
                      className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs text-foreground focus:outline-none"
                    >
                      <option value="">No Coach</option>
                      {coaches.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Official Weight (kg)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs text-foreground focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Athlete Height (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs text-foreground focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Registration Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs text-foreground focus:outline-none"
                    >
                      <option value="Confirmed">Confirmed</option>
                      <option value="Pending">Pending</option>
                      <option value="Checked In">Checked In</option>
                      <option value="Disqualified">Disqualified</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Competition Events</label>
                    <div className="flex items-center gap-6 p-3 bg-secondary border border-border rounded-lg">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={isKumite} 
                          onChange={(e) => setIsKumite(e.target.checked)} 
                          className="w-4 h-4 rounded border-border bg-card text-primary focus:ring-primary accent-primary"
                        />
                        <span className="text-xs font-medium text-foreground">Kumite</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={isKata} 
                          onChange={(e) => setIsKata(e.target.checked)} 
                          className="w-4 h-4 rounded border-border bg-card text-primary focus:ring-primary accent-primary"
                        />
                        <span className="text-xs font-medium text-foreground">Kata</span>
                      </label>
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Internal Log Remarks</label>
                    <textarea
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      className="w-full h-24 p-3 bg-secondary border border-border rounded-lg text-xs text-foreground focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 3. CATEGORY MANAGEMENT TAB */}
            {activeTab === 'category' && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  Category Rules & Assignments
                </h4>
                
                {/* Auto Calculated Display */}
                <div className="bg-secondary/30 border border-border p-4 rounded-xl space-y-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Currently Assigned category</span>
                  {assignedCat ? (
                    <div>
                      <span className="font-extrabold text-sm text-foreground block">{assignedCat.name}</span>
                      <span className="text-[10px] text-muted-foreground block mt-0.5">
                        Gender: {assignedCat.gender} • Weight Bounds: {assignedCat.min_weight}-{assignedCat.max_weight}kg • Age Bounds: {assignedCat.min_age}-{assignedCat.max_age} yr
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground italic block">No category matches age/weight rules.</span>
                  )}
                </div>

                {/* Override trigger */}
                <div className="border border-border rounded-xl p-4 space-y-4">
                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={manualOverride}
                      onChange={(e) => setManualOverride(e.target.checked)}
                      className="rounded border-border focus:ring-primary text-primary"
                    />
                    <span>Allow manual category override</span>
                  </label>

                  {manualOverride && (
                    <div className="space-y-1.5 animate-fade-in">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Choose custom Category Override</label>
                      <select
                        value={selectedCatId}
                        onChange={(e) => setSelectedCatId(e.target.value)}
                        className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs text-foreground focus:outline-none"
                      >
                        <option value="">Select custom category</option>
                        {categories.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 4. MEDICAL TAB */}
            {activeTab === 'medical' && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Shield className="h-4 w-4" /> Medical History & Health Status
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Declared Conditions</label>
                    <input
                      type="text"
                      value={conditions}
                      onChange={(e) => setConditions(e.target.value)}
                      className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs text-foreground focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Allergies List</label>
                    <input
                      type="text"
                      value={allergies}
                      onChange={(e) => setAllergies(e.target.value)}
                      className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs text-foreground focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Blood Type</label>
                    <select
                      value={bloodType}
                      onChange={(e) => setBloodType(e.target.value)}
                      className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs text-foreground focus:outline-none"
                    >
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={hasClearance}
                        onChange={(e) => setHasClearance(e.target.checked)}
                        className="rounded border-border focus:ring-primary text-primary"
                      />
                      <span className="text-foreground">Physically Cleared for Fight</span>
                    </label>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Medical Clearance Comments</label>
                    <textarea
                      value={medicalRemarks}
                      onChange={(e) => setMedicalRemarks(e.target.value)}
                      className="w-full h-20 p-3 bg-secondary border border-border rounded-lg text-xs text-foreground focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 5. PAYMENT SETTLEMENT TAB */}
            {activeTab === 'payment' && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <CreditCard className="h-4 w-4" /> Registration Payment Audit
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Registration Fee (MYR)</label>
                    <input
                      type="number"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs text-foreground focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Settlement Status</label>
                    <select
                      value={payStatus}
                      onChange={(e) => setPayStatus(e.target.value as any)}
                      className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs text-foreground focus:outline-none"
                    >
                      <option value="Paid">Paid</option>
                      <option value="Unpaid">Unpaid</option>
                      <option value="Pending">Pending Audit</option>
                      <option value="Refunded">Refunded</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Payment Method</label>
                    <select
                      value={payMethod}
                      onChange={(e) => setPayMethod(e.target.value)}
                      className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs text-foreground focus:outline-none"
                    >
                      <option value="Credit Card">Credit Card</option>
                      <option value="Cash">Cash at Dojo</option>
                      <option value="Bank Transfer">Bank Transfer / EFT</option>
                      <option value="PayPal">PayPal</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Transaction Ref ID</label>
                    <input
                      type="text"
                      placeholder="e.g. TXN-9871"
                      value={txnId}
                      onChange={(e) => setTxnId(e.target.value)}
                      className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs text-foreground focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 6. DOCUMENTS TAB */}
            {activeTab === 'documents' && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Paperclip className="h-4 w-4" /> Identity & Clearance uploads
                </h4>

                {/* Upload Form */}
                {canModify && (
                  <div className="bg-secondary/20 border border-border p-4 rounded-xl flex gap-3 items-end">
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Document Label</label>
                      <input
                        type="text"
                        placeholder="e.g. Passport Scan, Liability Waiver"
                        value={newDocName}
                        onChange={(e) => setNewDocName(e.target.value)}
                        className="w-full px-3 py-1.5 bg-secondary border border-border rounded-lg text-xs text-foreground focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Category</label>
                      <select
                        value={newDocType}
                        onChange={(e) => setNewDocType(e.target.value)}
                        className="px-3 py-1.5 bg-secondary border border-border rounded-lg text-xs text-foreground focus:outline-none"
                      >
                        <option value="Identity">Identity</option>
                        <option value="Medical">Medical Clearance</option>
                        <option value="Waiver">Liability Waiver</option>
                      </select>
                    </div>
                    <button
                      onClick={handleDocumentUpload}
                      disabled={!newDocName}
                      className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      Simulate Attach
                    </button>
                  </div>
                )}

                {/* Documents List */}
                <div className="space-y-2">
                  {docs.length === 0 ? (
                    <span className="text-xs text-muted-foreground italic block text-center py-6">No attachments uploaded yet.</span>
                  ) : (
                    docs.map(d => (
                      <div key={d.id} className="flex items-center justify-between border border-border p-3 rounded-lg bg-card">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4.5 w-4.5 text-muted-foreground" />
                          <div>
                            <span className="text-xs font-semibold block">{d.name}</span>
                            <span className="text-[10px] text-muted-foreground block">{d.doc_type}</span>
                          </div>
                        </div>
                        {canModify && (
                          <button
                            type="button"
                            onClick={() => handleDocumentDelete(d.id)}
                            className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 7. HISTORY & AUDIT TAB */}
            {activeTab === 'history' && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <History className="h-4 w-4" /> Registration Activity Logs
                </h4>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {logs.length === 0 ? (
                    <span className="text-xs text-muted-foreground italic block">No entries logged.</span>
                  ) : (
                    logs.map(l => (
                      <div key={l.id} className="border border-border p-3 rounded-lg bg-secondary/15 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{l.action}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {new Date(l.created_at || '').toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-muted-foreground text-[11px]">{l.details}</p>
                        <span className="text-[10px] text-muted-foreground block text-right font-medium">by {l.operator_name}</span>
                      </div>
                    ))
                  )}
                </div>

                <hr className="border-border" />
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Database Audit Trail</h4>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {audits.length === 0 ? (
                    <span className="text-xs text-muted-foreground italic block">No audit footprints found.</span>
                  ) : (
                    audits.map(a => (
                      <div key={a.id} className="border border-border p-3 rounded-lg bg-secondary/10 text-xs space-y-1 font-mono">
                        <div className="flex justify-between font-bold text-[10px] text-muted-foreground">
                          <span>{a.action}</span>
                          <span>{new Date(a.created_at || '').toLocaleDateString()}</span>
                        </div>
                        <span className="text-[10px] block font-semibold text-primary">{a.user_email}</span>
                        {a.new_values && (
                          <div className="text-[10px] text-muted-foreground bg-card p-1.5 rounded-md overflow-x-auto">
                            <span className="block font-bold">New Payload:</span>
                            <span>{JSON.stringify(a.new_values, null, 2)}</span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Sticky bottom save bar inside form */}
            <div className="flex justify-end gap-2.5 pt-4 border-t border-border bg-card shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-border text-muted-foreground hover:text-foreground rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canModify}
                className="px-5 py-2 bg-primary text-primary-foreground hover:bg-primary/95 disabled:bg-neutral-500/20 disabled:text-muted-foreground disabled:cursor-not-allowed rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5 transition"
              >
                <Save className="h-4 w-4" /> <span>{canModify ? 'Save Record Edits' : 'Read-Only Mode'}</span>
              </button>
            </div>

          </form>
        )}
      </div>

      {isPhotoModalOpen && participant && (
        <PlayerPhotoModal
          participant={participant}
          onClose={() => setIsPhotoModalOpen(false)}
          onSaved={(updated) => {
            setParticipant(updated);
            // Refresh to ensure any sibling components or views know about the change
            triggerRefresh();
          }}
        />
      )}
    </div>
  );
}
