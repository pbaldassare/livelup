import * as XLSX from 'xlsx';
import {
  parseExerciseImportCsv,
  parseExerciseImportSpreadsheet,
  buildExerciseImportCsv,
  buildExerciseImportWorkbook,
  classifyExerciseImportRows,
} from '@/lib/exerciseImport';
import { describe, expect, it } from 'vitest';

describe('exerciseImport', () => {
  it('builds a template with required headers', () => {
    const csv = buildExerciseImportCsv();
    expect(csv).toContain('nome,categoria,muscoli');
    expect(csv).toContain('Back lever');
  });

  it('parses a valid row', () => {
    const csv = `nome,categoria,muscoli,difficolta,video_url,descrizione,istruzioni,catalogo_pt
Hollow hold,Core,"Core, Addominali",principiante,https://youtu.be/abc,desc,istr,Addome`;
    const { rows, issues } = parseExerciseImportCsv(csv);
    expect(issues).toEqual([]);
    expect(rows).toHaveLength(1);
    expect(rows[0].categoria).toBe('Core');
    expect(rows[0].muscoli).toEqual(['Core', 'Addominali']);
    expect(rows[0].catalogo_pt).toBe('Addome');
  });

  it('maps unknown excel folders onto Altro/Stretching instead of rejecting the row', () => {
    const csv = `nome,categoria,muscoli
Foo,MOBILITY,Core`;
    const { rows, issues } = parseExerciseImportCsv(csv);
    expect(issues).toEqual([]);
    expect(rows).toHaveLength(1);
    expect(rows[0].categoria).toBe('Stretching');
    expect(rows[0].catalogo_pt).toBe('MOBILITY');
  });

  it('parses Excel semicolon CSV and skips comment rows', () => {
    const csv = `nome;categoria;muscoli
# commento
Hollow hold;Core;Core`;
    const { rows, issues } = parseExerciseImportCsv(csv);
    expect(issues).toEqual([]);
    expect(rows).toHaveLength(1);
    expect(rows[0].nome).toBe('Hollow hold');
  });

  it('rejects Drive video links', () => {
    const csv = `nome,categoria,muscoli,video_url
Hollow hold,Core,Core,https://drive.google.com/file/d/abc`;
    const { rows, issues } = parseExerciseImportCsv(csv);
    expect(rows).toHaveLength(0);
    expect(issues[0].message).toMatch(/YouTube o Vimeo/);
  });

  it('marks existing private names as skipped (case-insensitive)', () => {
    const csv = `nome,categoria,muscoli
Hollow hold,Core,Core
L-sit,L-sit,Core`;
    const { rows, issues } = parseExerciseImportCsv(csv);
    expect(issues).toEqual([]);
    const classified = classifyExerciseImportRows(rows, ['  HOLLOW HOLD  ']);
    expect(classified.skipCount).toBe(1);
    expect(classified.toImport.map((r) => r.nome)).toEqual(['L-sit']);
    expect(classified.preview[0].status).toBe('skip_duplicate');
    expect(classified.preview[1].status).toBe('import');
  });

  it('skips later duplicates in the same file', () => {
    const csv = `nome,categoria,muscoli
Hollow hold,Core,Core
Hollow hold,Core,Addominali`;
    const { rows, issues } = parseExerciseImportCsv(csv);
    expect(issues).toEqual([]);
    const classified = classifyExerciseImportRows(rows, []);
    expect(classified.toImport).toHaveLength(1);
    expect(classified.skipCount).toBe(1);
    expect(classified.preview[0].status).toBe('import');
    expect(classified.preview[1].status).toBe('skip_duplicate');
  });

  it('treats empty muscoli as optional, not an error', () => {
    const csv = `nome,categoria,muscoli
Hollow hold,Core,`;
    const { rows, issues } = parseExerciseImportCsv(csv);
    expect(issues).toEqual([]);
    expect(rows).toHaveLength(1);
    expect(rows[0].muscoli).toEqual([]);
  });

  it('parses rows when the muscoli column is missing', () => {
    const csv = `nome,categoria
Hollow hold,Core`;
    const { rows, issues } = parseExerciseImportCsv(csv);
    expect(issues).toEqual([]);
    expect(rows).toHaveLength(1);
    expect(rows[0].muscoli).toEqual([]);
  });

  it('parses the Excel template workbook', () => {
    const wb = buildExerciseImportWorkbook();
    const bytes = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as Uint8Array;
    const { rows, issues } = parseExerciseImportSpreadsheet(bytes);
    expect(issues).toEqual([]);
    expect(rows).toHaveLength(1);
    expect(rows[0].nome).toBe('Back lever tuck');
    expect(rows[0].categoria).toBe('Back lever');
    expect(rows[0].muscoli).toEqual(['Schiena', 'Core', 'Spalle']);
    expect(rows[0].catalogo_pt).toBe('Leve');
  });

  it('reads Bance-style CATEGORIA / NOME ESERCIZIO / LINK columns', () => {
    const csv = `CATEGORIA,NOME ESERCIZIO,LINK
CORE,Hollow hold,https://youtu.be/abc
SPINTA,Panca piana,https://youtu.be/xyz`;
    const { rows, issues, formatNote } = parseExerciseImportCsv(csv);
    expect(issues).toEqual([]);
    expect(rows).toHaveLength(2);
    expect(rows[0].categoria).toBe('Core');
    expect(rows[0].catalogo_pt).toBe('CORE');
    expect(rows[1].categoria).toBe('Push Up');
    expect(rows[1].catalogo_pt).toBe('SPINTA');
    expect(formatNote).toMatch(/riconosciut/i);
  });

  it('infers A/B/C layout when headers are ESERCIZIO / MOBILITY', () => {
    const csv = ` ,ESERCIZIO,MOBILITY
CORE,Hollow hold,https://youtu.be/abc
CORE,V-up,https://youtu.be/def
CORE,Sit-up,https://youtu.be/ghi
CORE,Crunch,https://youtu.be/jkl`;
    const { rows, issues } = parseExerciseImportCsv(csv);
    expect(issues).toEqual([]);
    expect(rows.length).toBeGreaterThanOrEqual(3);
    expect(rows[0].nome).toBe('Hollow hold');
    expect(rows[0].catalogo_pt).toBe('CORE');
  });

  it('rejects invalid muscle names when provided', () => {
    const csv = `nome,categoria,muscoli
Hollow hold,Core,Bicipite`;
    const { rows, issues } = parseExerciseImportCsv(csv);
    expect(rows).toHaveLength(0);
    expect(issues[0].message).toMatch(/Muscolo non valido/);
  });
});
