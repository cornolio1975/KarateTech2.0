// Shared CSV serialization/parsing helpers for the Categories database round-trip
// (Export CSV -> Import CSV). Field list mirrors the exact `categories` table columns.
import { Category } from '@/db/types';

export const CATEGORY_CSV_FIELDS = [
  'id', 'name', 'gender', 'min_age', 'max_age', 'min_weight', 'max_weight',
  'capacity', 'status', 'format', 'created_at'
] as const;

export type CategoryCsvField = typeof CATEGORY_CSV_FIELDS[number];

// Fields that are NOT NULL in the categories table and therefore required on import
export const REQUIRED_CATEGORY_FIELDS: CategoryCsvField[] = [
  'name', 'gender', 'min_age', 'max_age', 'min_weight', 'max_weight'
];

// Accepted header spellings (lowercased) mapped to the exact database field name
const HEADER_ALIASES: Record<string, CategoryCsvField> = {
  'id': 'id', 'category id': 'id', 'category_id': 'id', 'categoryid': 'id',
  'name': 'name', 'category name': 'name', 'category_name': 'name',
  'gender': 'gender',
  'min_age': 'min_age', 'min age': 'min_age', 'min age (years)': 'min_age', 'minimum age': 'min_age',
  'max_age': 'max_age', 'max age': 'max_age', 'max age (years)': 'max_age', 'maximum age': 'max_age',
  'min_weight': 'min_weight', 'min weight': 'min_weight', 'min weight (kg)': 'min_weight', 'minimum weight': 'min_weight', 'minimum weight (kg)': 'min_weight',
  'max_weight': 'max_weight', 'max weight': 'max_weight', 'max weight (kg)': 'max_weight', 'maximum weight': 'max_weight', 'maximum weight (kg)': 'max_weight',
  'capacity': 'capacity', 'capacity limits': 'capacity',
  'status': 'status', 'category status': 'status',
  'format': 'format', 'tournament format': 'format',
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
  missingRequired: CategoryCsvField[];
} {
  const fieldToIndex = new Map<CategoryCsvField, number>();
  headerRow.forEach((rawHeader, idx) => {
    const key = rawHeader.trim().toLowerCase();
    const field = HEADER_ALIASES[key];
    if (field && !fieldToIndex.has(field)) {
      fieldToIndex.set(field, idx);
    }
  });
  const missingRequired = REQUIRED_CATEGORY_FIELDS.filter(f => !fieldToIndex.has(f));
  return { fieldToIndex, missingRequired };
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

  const rawGender = get('gender');
  const gender = (['Male', 'Female', 'Mixed'] as const).find(g => g.toLowerCase() === rawGender.toLowerCase());
  if (!gender) {
    errors.push({ row: rowNumber, categoryId: id || '(new)', field: 'gender', problem: `Invalid gender value "${rawGender}"`, suggestion: 'Use Male, Female, or Mixed' });
  }

  const min_age = parseInt(get('min_age'), 10);
  const max_age = parseInt(get('max_age'), 10);
  if (Number.isNaN(min_age)) {
    errors.push({ row: rowNumber, categoryId: id || '(new)', field: 'min_age', problem: 'Min age is not a number', suggestion: 'Provide a whole number, e.g. 12' });
  }
  if (Number.isNaN(max_age)) {
    errors.push({ row: rowNumber, categoryId: id || '(new)', field: 'max_age', problem: 'Max age is not a number', suggestion: 'Provide a whole number, e.g. 13' });
  }
  if (!Number.isNaN(min_age) && !Number.isNaN(max_age) && min_age > max_age) {
    errors.push({ row: rowNumber, categoryId: id || '(new)', field: 'min_age/max_age', problem: 'Min age is greater than max age', suggestion: 'Ensure min_age <= max_age' });
  }

  const min_weight = parseFloat(get('min_weight'));
  const max_weight = parseFloat(get('max_weight'));
  if (Number.isNaN(min_weight)) {
    errors.push({ row: rowNumber, categoryId: id || '(new)', field: 'min_weight', problem: 'Min weight is not a number', suggestion: 'Provide a numeric value, e.g. 0' });
  }
  if (Number.isNaN(max_weight)) {
    errors.push({ row: rowNumber, categoryId: id || '(new)', field: 'max_weight', problem: 'Max weight is not a number', suggestion: 'Provide a numeric value, e.g. 40' });
  }
  if (!Number.isNaN(min_weight) && !Number.isNaN(max_weight) && min_weight > max_weight) {
    errors.push({ row: rowNumber, categoryId: id || '(new)', field: 'min_weight/max_weight', problem: 'Min weight is greater than max weight', suggestion: 'Ensure min_weight <= max_weight' });
  }

  const rawCapacity = get('capacity');
  const capacity = rawCapacity ? parseInt(rawCapacity, 10) : 32;
  if (rawCapacity && Number.isNaN(capacity)) {
    errors.push({ row: rowNumber, categoryId: id || '(new)', field: 'capacity', problem: 'Capacity is not a number', suggestion: 'Provide a whole number, e.g. 32' });
  }

  const rawStatus = get('status');
  const status = (['Open', 'Closed', 'Full'] as const).find(s => s.toLowerCase() === rawStatus.toLowerCase()) || 'Open';

  const rawFormat = get('format');
  const format = (['knockout', 'round_robin', 'wkf_repechage'] as const).find(f => f.toLowerCase() === rawFormat.toLowerCase()) || 'knockout';

  const created_at = get('created_at') || undefined;

  if (isDuplicateIdInFile) {
    errors.push({ row: rowNumber, categoryId: id || '(new)', field: 'id', problem: 'Duplicate Category ID within the CSV file', suggestion: 'Ensure each row has a unique category id' });
  }

  return {
    row: rowNumber,
    id,
    name,
    gender: gender || 'Male',
    min_age: Number.isNaN(min_age) ? 0 : min_age,
    max_age: Number.isNaN(max_age) ? 0 : max_age,
    min_weight: Number.isNaN(min_weight) ? 0 : min_weight,
    max_weight: Number.isNaN(max_weight) ? 0 : max_weight,
    capacity: Number.isNaN(capacity) ? 32 : capacity,
    status,
    format,
    created_at,
    errors,
    isExistingId,
    isDuplicateIdInFile,
  };
}
