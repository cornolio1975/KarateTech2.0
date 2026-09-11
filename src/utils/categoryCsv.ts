// Shared CSV serialization/parsing helpers for the Categories database round-trip
// (Export CSV -> Import CSV). Field list mirrors the exact `categories` table columns.
import { Category } from '@/db/types';

export const CATEGORY_CSV_FIELDS = [
  'id', 'name', 'gender', 'min_age', 'max_age', 'min_weight', 'max_weight',
  'capacity', 'status', 'format', 'created_at'
] as const;

export type CategoryCsvField = typeof CATEGORY_CSV_FIELDS[number] | 'age' | 'weight';

// Only 'name' is strictly required in the CSV header; all other fields are auto-inferred or defaulted
export const REQUIRED_CATEGORY_FIELDS = ['name'] as const;

// Accepted header spellings (lowercased) mapped to category fields
const HEADER_ALIASES: Record<string, CategoryCsvField> = {
  'id': 'id', 'category id': 'id', 'category_id': 'id', 'categoryid': 'id', 'cat_id': 'id',
  'name': 'name', 'category name': 'name', 'category_name': 'name', 'category': 'name', 'categories': 'name', 'event': 'name', 'event name': 'name', 'division': 'name', 'discipline': 'name',
  'gender': 'gender', 'sex': 'gender', 'division gender': 'gender',
  'age': 'age', 'age group': 'age', 'age range': 'age', 'division age': 'age',
  'min_age': 'min_age', 'min age': 'min_age', 'min age (years)': 'min_age', 'minimum age': 'min_age', 'minage': 'min_age',
  'max_age': 'max_age', 'max age': 'max_age', 'max age (years)': 'max_age', 'maximum age': 'max_age', 'maxage': 'max_age',
  'weight': 'weight', 'weight class': 'weight', 'weight category': 'weight', 'weight range': 'weight',
  'min_weight': 'min_weight', 'min weight': 'min_weight', 'min weight (kg)': 'min_weight', 'minimum weight': 'min_weight', 'minimum weight (kg)': 'min_weight', 'minweight': 'min_weight',
  'max_weight': 'max_weight', 'max weight': 'max_weight', 'max weight (kg)': 'max_weight', 'maximum weight': 'max_weight', 'maximum weight (kg)': 'max_weight', 'maxweight': 'max_weight',
  'capacity': 'capacity', 'capasity': 'capacity', 'cap': 'capacity', 'capacity limits': 'capacity', 'max_participants': 'capacity', 'max participants': 'capacity', 'max_capacity': 'capacity', 'max capacity': 'capacity', 'limit': 'capacity', 'max': 'capacity',
  'status': 'status', 'category status': 'status', 'state': 'status',
  'format': 'format', 'tournament format': 'format', 'system': 'format', 'type': 'format',
  'created_at': 'created_at', 'created at': 'created_at',
};

export interface CategoryRowError {
  row: number; // 1-based data row number (excluding header)
  categoryId: string;
  field: string;
  problem: string;
  suggestion: string;
}

export interface ParsedCategoryRow {
  row: number;
  id?: string;
  name: string;
  gender: 'Male' | 'Female' | 'Mixed';
  min_age: number;
  max_age: number;
  min_weight: number;
  max_weight: number;
  capacity: number;
  status: 'Open' | 'Closed' | 'Full';
  format: 'knockout' | 'round_robin' | 'wkf_repechage';
  created_at?: string;
  errors: CategoryRowError[];
  isExistingId: boolean;
  isDuplicateIdInFile: boolean;
}

// Serialize a single value as an RFC4180-compliant CSV field
export function csvField(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

// Build the full CSV text (header + rows) for the given categories, exact DB fields only
export function buildCategoryCsv(categories: Category[]): string {
  const header = CATEGORY_CSV_FIELDS.join(',');
  const rows = categories.map(cat =>
    CATEGORY_CSV_FIELDS.map(field => csvField((cat as unknown as Record<string, unknown>)[field])).join(',')
  );
  return [header, ...rows].join('\r\n');
}

// Full RFC4180-aware CSV parser (handles quoted fields, doubled quotes, embedded commas/newlines)
export function parseCSVText(text: string): string[][] {
  let src = text;
  if (src.charCodeAt(0) === 0xFEFF) src = src.slice(1); // strip BOM

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  while (i < src.length) {
    const char = src[i];
    if (inQuotes) {
      if (char === '"') {
        if (src[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += char; i++; continue;
    }
    if (char === '"') { inQuotes = true; i++; continue; }
    if (char === ',') { row.push(field); field = ''; i++; continue; }
    if (char === '\r') { i++; continue; }
    if (char === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    field += char; i++;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }

  return rows.filter(r => !(r.length === 1 && r[0].trim() === ''));
}

// Maps a header row to field indexes; returns which required fields (if any) are missing
export function mapHeaderRowToFields(headerRow: string[]): {
  fieldToIndex: Map<CategoryCsvField, number>;
  missingRequired: string[];
} {
  const fieldToIndex = new Map<CategoryCsvField, number>();
  headerRow.forEach((rawHeader, idx) => {
    const key = rawHeader.trim().toLowerCase();
    const field = HEADER_ALIASES[key];
    if (field && !fieldToIndex.has(field)) {
      fieldToIndex.set(field, idx);
    }
  });
  const missingRequired = (REQUIRED_CATEGORY_FIELDS as readonly string[]).filter(f => !fieldToIndex.has(f as CategoryCsvField));
  return { fieldToIndex, missingRequired };
}

// Helper: infer gender from text or category name
function inferGender(text: string): 'Male' | 'Female' | 'Mixed' {
  const lower = text.toLowerCase();
  if (/\b(female|women|woman|girl|girls|f)\b/i.test(lower)) return 'Female';
  if (/\b(male|men|man|boy|boys|m)\b/i.test(lower)) return 'Male';
  return 'Mixed';
}

// Helper: extract age range from text (e.g. "18+", "16-17", "U21", "Senior (18+)", "14-15 yrs")
function parseAgeRange(text: string, defaultMin = 0, defaultMax = 99): { min: number; max: number } {
  if (!text) return { min: defaultMin, max: defaultMax };
  const rangeMatch = text.match(/(\d+)\s*[-–to/]\s*(\d+)/i);
  if (rangeMatch) {
    return { min: parseInt(rangeMatch[1], 10), max: parseInt(rangeMatch[2], 10) };
  }
  const plusMatch = text.match(/(\d+)\s*\+/);
  if (plusMatch) {
    return { min: parseInt(plusMatch[1], 10), max: 99 };
  }
  const uMatch = text.match(/u\s*(\d+)/i);
  if (uMatch) {
    const max = parseInt(uMatch[1], 10) - 1;
    return { min: Math.max(0, max - 3), max };
  }
  return { min: defaultMin, max: defaultMax };
}

// Helper: extract weight range from text (e.g. "-60kg", "+75kg", "60-67", "under 50kg", "Open")
function parseWeightRange(text: string, defaultMin = 0, defaultMax = 999): { min: number; max: number } {
  if (!text) return { min: defaultMin, max: defaultMax };
  const lower = text.toLowerCase();
  if (lower.includes('open')) return { min: 0, max: 999 };

  const plusMatch = text.match(/\+\s*(\d+(?:\.\d+)?)/);
  if (plusMatch) {
    return { min: parseFloat(plusMatch[1]) + 0.01, max: 999 };
  }
  const overMatch = text.match(/(?:over|>)\s*(\d+(?:\.\d+)?)/i);
  if (overMatch) {
    return { min: parseFloat(overMatch[1]) + 0.01, max: 999 };
  }
  const minusMatch = text.match(/-\s*(\d+(?:\.\d+)?)/);
  if (minusMatch) {
    return { min: 0, max: parseFloat(minusMatch[1]) };
  }
  const underMatch = text.match(/(?:under|<)\s*(\d+(?:\.\d+)?)/i);
  if (underMatch) {
    return { min: 0, max: parseFloat(underMatch[1]) };
  }
  const rangeMatch = text.match(/(\d+(?:\.\d+)?)\s*[-–to/]\s*(\d+(?:\.\d+)?)/i);
  if (rangeMatch) {
    return { min: parseFloat(rangeMatch[1]), max: parseFloat(rangeMatch[2]) };
  }
  return { min: defaultMin, max: defaultMax };
}

// Validates and converts a single CSV data row into a Category-shaped row, collecting errors
export function parseCategoryDataRow(
  cols: string[],
  fieldToIndex: Map<CategoryCsvField, number>,
  rowNumber: number,
  existingIds: Set<string>,
  seenIdsInFile: Set<string>
): ParsedCategoryRow {
  const get = (field: CategoryCsvField): string => {
    const idx = fieldToIndex.get(field);
    return idx === undefined ? '' : (cols[idx] ?? '').trim();
  };

  const errors: CategoryRowError[] = [];
  const rawId = get('id');
  const id = rawId || undefined;
  const isDuplicateIdInFile = !!id && seenIdsInFile.has(id);
  if (id) seenIdsInFile.add(id);
  const isExistingId = !!id && existingIds.has(id);

  const name = get('name');
  if (!name) {
    errors.push({ row: rowNumber, categoryId: id || '(new)', field: 'name', problem: 'Category name is empty', suggestion: 'Provide a non-empty category name' });
  }

  // Gender: check explicit column, otherwise infer from name
  const rawGender = get('gender');
  let gender: 'Male' | 'Female' | 'Mixed' = 'Male';
  if (rawGender) {
    const foundGender = (['Male', 'Female', 'Mixed'] as const).find(g => g.toLowerCase() === rawGender.toLowerCase());
    if (foundGender) {
      gender = foundGender;
    } else {
      gender = inferGender(rawGender);
    }
  } else if (name) {
    gender = inferGender(name);
  }

  // Age limits: check min_age / max_age columns, then 'age' column, then name
  let min_age = parseInt(get('min_age'), 10);
  let max_age = parseInt(get('max_age'), 10);
  const rawAge = get('age');

  if (Number.isNaN(min_age) || Number.isNaN(max_age)) {
    const parsedAge = parseAgeRange(rawAge || name, 0, 99);
    if (Number.isNaN(min_age)) min_age = parsedAge.min;
    if (Number.isNaN(max_age)) max_age = parsedAge.max;
  }

  if (min_age > max_age) {
    errors.push({ row: rowNumber, categoryId: id || '(new)', field: 'min_age/max_age', problem: 'Min age is greater than max age', suggestion: 'Ensure min_age <= max_age' });
  }

  // Weight limits: check min_weight / max_weight columns, then 'weight' column, then name
  let min_weight = parseFloat(get('min_weight'));
  let max_weight = parseFloat(get('max_weight'));
  const rawWeight = get('weight');

  if (Number.isNaN(min_weight) || Number.isNaN(max_weight)) {
    const parsedWeight = parseWeightRange(rawWeight || name, 0, 999);
    if (Number.isNaN(min_weight)) min_weight = parsedWeight.min;
    if (Number.isNaN(max_weight)) max_weight = parsedWeight.max;
  }

  if (min_weight > max_weight) {
    errors.push({ row: rowNumber, categoryId: id || '(new)', field: 'min_weight/max_weight', problem: 'Min weight is greater than max weight', suggestion: 'Ensure min_weight <= max_weight' });
  }

  // Capacity: check 'capacity' or 'capasity', default to 32
  const rawCapacity = get('capacity');
  const capacity = rawCapacity ? parseInt(rawCapacity, 10) : 32;
  if (rawCapacity && Number.isNaN(capacity)) {
    errors.push({ row: rowNumber, categoryId: id || '(new)', field: 'capacity', problem: 'Capacity is not a number', suggestion: 'Provide a whole number, e.g. 32' });
  }

  // Status: default to 'Open'
  const rawStatus = get('status');
  const status = (['Open', 'Closed', 'Full'] as const).find(s => s.toLowerCase() === rawStatus.toLowerCase()) || 'Open';

  // Format: default to 'knockout'
  const rawFormat = get('format');
  const format = (['knockout', 'round_robin', 'wkf_repechage'] as const).find(f => f.toLowerCase() === rawFormat.toLowerCase()) || 'knockout';

  const created_at = get('created_at') || undefined;

  if (isDuplicateIdInFile) {
    errors.push({ row: rowNumber, categoryId: id || '(new)', field: 'id', problem: 'Duplicate Category ID within the CSV file', suggestion: 'Ensure each row has a unique category id' });
  }

  return {
    row: rowNumber,
    id,
    name: name || 'Untitled Category',
    gender,
    min_age: Number.isNaN(min_age) ? 0 : min_age,
    max_age: Number.isNaN(max_age) ? 99 : max_age,
    min_weight: Number.isNaN(min_weight) ? 0 : min_weight,
    max_weight: Number.isNaN(max_weight) ? 999 : max_weight,
    capacity: Number.isNaN(capacity) ? 32 : capacity,
    status,
    format,
    created_at,
    errors,
    isExistingId,
    isDuplicateIdInFile,
  };
}
