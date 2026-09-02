// Shared CSV serialization/parsing helpers for the Participants database round-trip
// (Export CSV -> Import CSV). Field list mirrors the exact `participants` table columns,
// plus two relationship columns (kumite/kata category id) sourced from participant_categories.
import { Participant } from '@/db/types';
import { parseCSVText, csvField } from '@/utils/categoryCsv';

export { parseCSVText, csvField };

export const PARTICIPANT_CSV_FIELDS = [
  'id', 'registration_no', 'full_name', 'gender', 'dob', 'age', 'nationality_code',
  'passport_ic', 'email', 'phone', 'emergency_contact_name', 'emergency_contact_phone',
  'club_id', 'coach_id', 'weight', 'height', 'status', 'medical_status', 'payment_status',
  'isKumite', 'isKata', 'remarks', 'created_at',
] as const;

// Relationship columns appended after the exact table fields (participant_categories join)
export const PARTICIPANT_CSV_RELATION_FIELDS = ['kumite_category_id', 'kata_category_id'] as const;

export type ParticipantCsvField = typeof PARTICIPANT_CSV_FIELDS[number];

export const REQUIRED_PARTICIPANT_FIELDS: ParticipantCsvField[] = [
  'full_name', 'gender', 'dob', 'passport_ic', 'weight', 'height'
];

const HEADER_ALIASES: Record<string, ParticipantCsvField | typeof PARTICIPANT_CSV_RELATION_FIELDS[number]> = {
  'id': 'id', 'participant id': 'id', 'participant_id': 'id',
  'registration_no': 'registration_no', 'registration no': 'registration_no', 'reg no': 'registration_no',
  'full_name': 'full_name', 'full name': 'full_name', 'name': 'full_name',
  'gender': 'gender',
  'dob': 'dob', 'date of birth': 'dob',
  'age': 'age',
  'nationality_code': 'nationality_code', 'nationality': 'nationality_code',
  'passport_ic': 'passport_ic', 'passport / ic': 'passport_ic', 'passport/ic': 'passport_ic', 'ic': 'passport_ic',
  'email': 'email',
  'phone': 'phone',
  'emergency_contact_name': 'emergency_contact_name', 'emergency contact name': 'emergency_contact_name',
  'emergency_contact_phone': 'emergency_contact_phone', 'emergency contact phone': 'emergency_contact_phone',
  'club_id': 'club_id', 'club id': 'club_id',
  'coach_id': 'coach_id', 'coach id': 'coach_id',
  'weight': 'weight',
  'height': 'height',
  'status': 'status',
  'medical_status': 'medical_status', 'medical status': 'medical_status',
  'payment_status': 'payment_status', 'payment status': 'payment_status',
  'iskumite': 'isKumite', 'kumite': 'isKumite',
  'iskata': 'isKata', 'kata': 'isKata',
  'remarks': 'remarks',
  'created_at': 'created_at', 'created at': 'created_at',
  'kumite_category_id': 'kumite_category_id', 'kumite category id': 'kumite_category_id',
  'kata_category_id': 'kata_category_id', 'kata category id': 'kata_category_id',
};

export interface ParticipantRowError {
  row: number;
  participantId: string;
  field: string;
  problem: string;
  suggestion: string;
}

export interface ParsedParticipantRow {
  row: number;
  id?: string;
  registration_no?: string;
  full_name: string;
  gender: 'Male' | 'Female';
  dob: string;
  age?: number;
  nationality_code?: string;
  passport_ic: string;
  email?: string;
  phone?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  club_id?: string;
  coach_id?: string;
  weight: number;
  height: number;
  status: 'Confirmed' | 'Pending' | 'Checked In' | 'Disqualified' | 'Cancelled';
  medical_status: 'Cleared' | 'Review Needed' | 'Action Required';
  payment_status: 'Paid' | 'Unpaid' | 'Pending';
  isKumite: boolean;
  isKata: boolean;
  remarks?: string;
  kumite_category_id?: string;
  kata_category_id?: string;
  errors: ParticipantRowError[];
  isExistingId: boolean;
  isDuplicateIdInFile: boolean;
}

export function buildParticipantCsv(
  participants: Participant[],
  categoryLookup: (participantId: string) => { kumite?: string; kata?: string }
): string {
  const allFields = [...PARTICIPANT_CSV_FIELDS, ...PARTICIPANT_CSV_RELATION_FIELDS];
  const header = allFields.join(',');
  const rows = participants.map(p => {
    const rel = categoryLookup(p.id);
    return allFields.map(field => {
      if (field === 'kumite_category_id') return csvField(rel.kumite);
      if (field === 'kata_category_id') return csvField(rel.kata);
      return csvField((p as unknown as Record<string, unknown>)[field]);
    }).join(',');
  });
  return [header, ...rows].join('\r\n');
}

export function mapParticipantHeaderRow(headerRow: string[]): {
  fieldToIndex: Map<string, number>;
  missingRequired: ParticipantCsvField[];
  hasIdColumn: boolean;
} {
  const fieldToIndex = new Map<string, number>();
  headerRow.forEach((rawHeader, idx) => {
    const key = rawHeader.trim().toLowerCase();
    const field = HEADER_ALIASES[key];
    if (field && !fieldToIndex.has(field)) {
      fieldToIndex.set(field, idx);
    }
  });
  const missingRequired = REQUIRED_PARTICIPANT_FIELDS.filter(f => !fieldToIndex.has(f));
  return { fieldToIndex, missingRequired, hasIdColumn: fieldToIndex.has('id') };
}

export function parseParticipantDataRow(
  cols: string[],
  fieldToIndex: Map<string, number>,
  rowNumber: number,
  existingIds: Set<string>,
  seenIdsInFile: Set<string>
): ParsedParticipantRow {
  const get = (field: string): string => {
    const idx = fieldToIndex.get(field);
    return idx === undefined ? '' : (cols[idx] ?? '').trim();
  };

  const errors: ParticipantRowError[] = [];
  const rawId = get('id');
  const id = rawId || undefined;
  const isDuplicateIdInFile = !!id && seenIdsInFile.has(id);
  if (id) seenIdsInFile.add(id);
  const isExistingId = !!id && existingIds.has(id);

  const full_name = get('full_name');
  if (!full_name) {
    errors.push({ row: rowNumber, participantId: id || '(new)', field: 'full_name', problem: 'Full name is empty', suggestion: 'Provide a non-empty full name' });
  }

  const rawGender = get('gender');
  const gender = (['Male', 'Female'] as const).find(g => g.toLowerCase() === rawGender.toLowerCase());
  if (!gender) {
    errors.push({ row: rowNumber, participantId: id || '(new)', field: 'gender', problem: `Invalid gender value "${rawGender}"`, suggestion: 'Use Male or Female' });
  }

  const dob = get('dob');
  if (!dob || Number.isNaN(new Date(dob).getTime())) {
    errors.push({ row: rowNumber, participantId: id || '(new)', field: 'dob', problem: `Invalid date of birth "${dob}"`, suggestion: 'Use YYYY-MM-DD format' });
  }

  const passport_ic = get('passport_ic');
  if (!passport_ic) {
    errors.push({ row: rowNumber, participantId: id || '(new)', field: 'passport_ic', problem: 'Passport/IC is empty', suggestion: 'Provide a passport or IC number' });
  }

  const weight = parseFloat(get('weight'));
  if (Number.isNaN(weight)) {
    errors.push({ row: rowNumber, participantId: id || '(new)', field: 'weight', problem: 'Weight is not a number', suggestion: 'Provide a numeric value in kg' });
  }
  const height = parseFloat(get('height'));
  if (Number.isNaN(height)) {
    errors.push({ row: rowNumber, participantId: id || '(new)', field: 'height', problem: 'Height is not a number', suggestion: 'Provide a numeric value in cm' });
  }

  const rawAge = get('age');
  const age = rawAge ? parseInt(rawAge, 10) : undefined;

  const rawStatus = get('status');
  const status = (['Confirmed', 'Pending', 'Checked In', 'Disqualified', 'Cancelled'] as const).find(s => s.toLowerCase() === rawStatus.toLowerCase()) || 'Pending';

  const rawMedical = get('medical_status');
  const medical_status = (['Cleared', 'Review Needed', 'Action Required'] as const).find(s => s.toLowerCase() === rawMedical.toLowerCase()) || 'Review Needed';

  const rawPayment = get('payment_status');
  const payment_status = (['Paid', 'Unpaid', 'Pending'] as const).find(s => s.toLowerCase() === rawPayment.toLowerCase()) || 'Unpaid';

  const parseBool = (v: string) => ['yes', 'y', 'true', '1'].includes(v.trim().toLowerCase());
  const isKumite = parseBool(get('isKumite'));
  const isKata = parseBool(get('isKata'));

  if (isDuplicateIdInFile) {
    errors.push({ row: rowNumber, participantId: id || '(new)', field: 'id', problem: 'Duplicate Participant ID within the CSV file', suggestion: 'Ensure each row has a unique participant id' });
  }

  return {
    row: rowNumber,
    id,
    registration_no: get('registration_no') || undefined,
    full_name,
    gender: gender || 'Male',
    dob,
    age,
    nationality_code: get('nationality_code') || undefined,
    passport_ic,
    email: get('email') || undefined,
    phone: get('phone') || undefined,
    emergency_contact_name: get('emergency_contact_name') || undefined,
    emergency_contact_phone: get('emergency_contact_phone') || undefined,
    club_id: get('club_id') || undefined,
    coach_id: get('coach_id') || undefined,
    weight: Number.isNaN(weight) ? 0 : weight,
    height: Number.isNaN(height) ? 0 : height,
    status,
    medical_status,
    payment_status,
    isKumite,
    isKata,
    remarks: get('remarks') || undefined,
    kumite_category_id: get('kumite_category_id') || undefined,
    kata_category_id: get('kata_category_id') || undefined,
    errors,
    isExistingId,
    isDuplicateIdInFile,
  };
}
