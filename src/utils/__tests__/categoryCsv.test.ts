import { describe, it, expect } from 'vitest';
import {
  parseCSVText,
  mapHeaderRowToFields,
  parseCategoryDataRow,
  buildCategoryCsv
} from '../categoryCsv';

describe('Category CSV Parsing & Capacity Validation', () => {
  it('should parse full standard CSV with Capacity column', () => {
    const csv = `Category Name,Gender,Min Age,Max Age,Min Weight,Max Weight,Capacity,Format
Senior Male Kumite -60kg (18+),Male,18,99,0,60,32,knockout
Senior Female Kumite -50kg (18+),Female,18,99,0,50,16,knockout`;

    const rows = parseCSVText(csv);
    expect(rows.length).toBe(3);

    const { fieldToIndex, missingRequired } = mapHeaderRowToFields(rows[0]);
    expect(missingRequired.length).toBe(0);

    const existingIds = new Set<string>();
    const seenIds = new Set<string>();

    const row1 = parseCategoryDataRow(rows[1], fieldToIndex, 1, existingIds, seenIds);
    expect(row1.errors.length).toBe(0);
    expect(row1.name).toBe('Senior Male Kumite -60kg (18+)');
    expect(row1.gender).toBe('Male');
    expect(row1.min_age).toBe(18);
    expect(row1.max_age).toBe(99);
    expect(row1.min_weight).toBe(0);
    expect(row1.max_weight).toBe(60);
    expect(row1.capacity).toBe(32);

    const row2 = parseCategoryDataRow(rows[2], fieldToIndex, 2, existingIds, seenIds);
    expect(row2.errors.length).toBe(0);
    expect(row2.gender).toBe('Female');
    expect(row2.capacity).toBe(16);
  });

  it('should support forgiving spelling "Capasity" or "Limit"', () => {
    const csv = `Category Name,Gender,Age,Weight,Capasity
Junior Male Kumite -55kg,Male,16-17,-55kg,64`;

    const rows = parseCSVText(csv);
    const { fieldToIndex, missingRequired } = mapHeaderRowToFields(rows[0]);
    expect(missingRequired.length).toBe(0);

    const row = parseCategoryDataRow(rows[1], fieldToIndex, 1, new Set(), new Set());
    expect(row.errors.length).toBe(0);
    expect(row.name).toBe('Junior Male Kumite -55kg');
    expect(row.gender).toBe('Male');
    expect(row.min_age).toBe(16);
    expect(row.max_age).toBe(17);
    expect(row.min_weight).toBe(0);
    expect(row.max_weight).toBe(55);
    expect(row.capacity).toBe(64);
  });

  it('should auto-infer fields if only Category and Capacity are provided', () => {
    const csv = `Category,Capasity
Female Kata (18+),16
Male Kumite +75kg (18+),32`;

    const rows = parseCSVText(csv);
    const { fieldToIndex, missingRequired } = mapHeaderRowToFields(rows[0]);
    expect(missingRequired.length).toBe(0);

    const row1 = parseCategoryDataRow(rows[1], fieldToIndex, 1, new Set(), new Set());
    expect(row1.errors.length).toBe(0);
    expect(row1.gender).toBe('Female');
    expect(row1.min_age).toBe(18);
    expect(row1.max_age).toBe(99);
    expect(row1.capacity).toBe(16);

    const row2 = parseCategoryDataRow(rows[2], fieldToIndex, 2, new Set(), new Set());
    expect(row2.errors.length).toBe(0);
    expect(row2.gender).toBe('Male');
    expect(row2.min_weight).toBe(75.01);
    expect(row2.max_weight).toBe(999);
    expect(row2.capacity).toBe(32);
  });

  it('should parse semicolon-delimited CSV exported from Excel (e.g. Malay headers)', () => {
    const csv = `Kategori;Jantina;Umur;Berat;Had Peserta
Senior Lelaki Kumite -67kg (18+);Lelaki;18-99;-67kg;32
Junior Perempuan Kata (16-17);Perempuan;16-17;Open;16`;

    const rows = parseCSVText(csv);
    expect(rows.length).toBe(3);
    const { fieldToIndex, missingRequired } = mapHeaderRowToFields(rows[0]);
    expect(missingRequired.length).toBe(0);

    const row1 = parseCategoryDataRow(rows[1], fieldToIndex, 1, new Set(), new Set());
    expect(row1.errors.length).toBe(0);
    expect(row1.name).toBe('Senior Lelaki Kumite -67kg (18+)');
    expect(row1.gender).toBe('Male');
    expect(row1.capacity).toBe(32);

    const row2 = parseCategoryDataRow(rows[2], fieldToIndex, 2, new Set(), new Set());
    expect(row2.errors.length).toBe(0);
    expect(row2.gender).toBe('Female');
    expect(row2.capacity).toBe(16);
  });

  it('should fallback to column 0 if unknown header provided without failing', () => {
    const csv = `Acara Pertandingan,Capasity
Boys Kumite U14 -45kg,32`;

    const rows = parseCSVText(csv);
    const { fieldToIndex, missingRequired } = mapHeaderRowToFields(rows[0]);
    expect(missingRequired.length).toBe(0);

    const row = parseCategoryDataRow(rows[1], fieldToIndex, 1, new Set(), new Set());
    expect(row.errors.length).toBe(0);
    expect(row.name).toBe('Boys Kumite U14 -45kg');
    expect(row.capacity).toBe(32);
  });
});
