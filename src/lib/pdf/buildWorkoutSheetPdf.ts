// =====================================================
// Generatore PDF scheda allenamento (jsPDF + autoTable)
// =====================================================

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type {
  SheetExerciseItem,
  SheetProtocolItem,
  WorkoutSheetDto,
} from '@/lib/pdf/workoutSheetTypes';

const TEAL: [number, number, number] = [13, 79, 79];
const TEAL_LIGHT: [number, number, number] = [232, 242, 242];
const GRAY: [number, number, number] = [100, 100, 100];
const DARK: [number, number, number] = [30, 30, 30];
const LINE: [number, number, number] = [200, 210, 210];

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'scheda';
}

function formatRest(seconds?: number | null): string {
  if (seconds == null) return '—';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed > pageHeight - 18) {
    doc.addPage();
    return 18;
  }
  return y;
}

function drawHeader(doc: jsPDF, dto: WorkoutSheetDto): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 16;

  doc.setFillColor(...TEAL);
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Livelapp', 14, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Scheda allenamento', 14, 20);

  y = 38;
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  const titleLines = doc.splitTextToSize(dto.title, pageWidth - 28);
  doc.text(titleLines, 14, y);
  y += titleLines.length * 7 + 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);

  const meta: string[] = [];
  if (dto.ptName) meta.push(`PT: ${dto.ptName}`);
  if (dto.athleteName) meta.push(`Atleta: ${dto.athleteName}`);
  if (dto.dateLabel) meta.push(`Data: ${dto.dateLabel}`);
  if (dto.kindLabel) meta.push(`Tipologia: ${dto.kindLabel}`);
  if (dto.levelLabel) meta.push(`Livello: ${dto.levelLabel}`);
  if (dto.includeWarmup) meta.push('Riscaldamento collegato');
  if (dto.includeCooldown) meta.push('Defaticamento collegato');

  if (meta.length) {
    const metaText = doc.splitTextToSize(meta.join('  ·  '), pageWidth - 28);
    doc.text(metaText, 14, y);
    y += metaText.length * 4.5 + 3;
  }

  if (dto.description) {
    doc.setTextColor(...DARK);
    doc.setFontSize(9);
    const desc = doc.splitTextToSize(dto.description, pageWidth - 28);
    doc.text(desc, 14, y);
    y += desc.length * 4.5 + 3;
  }

  if (dto.notesPt) {
    y = ensureSpace(doc, y, 16);
    doc.setFillColor(...TEAL_LIGHT);
    doc.roundedRect(14, y - 3, pageWidth - 28, 2, 0, 0, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...TEAL);
    doc.text('Note del coach', 14, y + 4);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK);
    const notes = doc.splitTextToSize(dto.notesPt, pageWidth - 28);
    doc.text(notes, 14, y + 9);
    y += 12 + notes.length * 4.5;
  }

  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.4);
  doc.line(14, y, pageWidth - 14, y);
  return y + 8;
}

function drawExerciseItem(doc: jsPDF, item: SheetExerciseItem, index: number, startY: number): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = ensureSpace(doc, startY, 24);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...TEAL);
  doc.text(`${index}. ${item.name}`, 14, y);
  y += 5;

  const metaParts: string[] = [];
  if (item.category) metaParts.push(item.category);
  if (item.muscles?.length) metaParts.push(item.muscles.join(', '));
  if (item.tempo) metaParts.push(`Tempo ${item.tempo}`);

  if (metaParts.length) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text(metaParts.join('  ·  '), 14, y);
    y += 4;
  }

  const body = item.sets.map((s) => [
    String(s.setNumber),
    s.reps ?? (s.durationSeconds != null ? `${s.durationSeconds}s` : '—'),
    s.kg ?? '—',
    formatRest(s.restSeconds),
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [['Serie', 'Reps / Tempo', 'Kg', 'Recupero']],
    body,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      textColor: DARK,
      lineColor: LINE,
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: TEAL,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: { fillColor: TEAL_LIGHT },
    columnStyles: {
      0: { cellWidth: 18, halign: 'center' },
      1: { cellWidth: 40, halign: 'center' },
      2: { cellWidth: 28, halign: 'center' },
      3: { cellWidth: 30, halign: 'center' },
    },
  });

  y = ((doc as any).lastAutoTable?.finalY as number) + 3;

  if (item.notes) {
    y = ensureSpace(doc, y, 10);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    const noteLines = doc.splitTextToSize(`Note PT: ${item.notes}`, pageWidth - 28);
    doc.text(noteLines, 14, y);
    y += noteLines.length * 4 + 4;
  } else {
    y += 4;
  }

  return y;
}

function drawProtocolItem(doc: jsPDF, item: SheetProtocolItem, index: number, startY: number): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = ensureSpace(doc, startY, 28);

  doc.setFillColor(...TEAL_LIGHT);
  doc.roundedRect(14, y - 4, pageWidth - 28, 12, 1, 1, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...TEAL);
  doc.text(`${index}. ${item.name}`, 16, y + 3);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  const badge = `[${item.protocolLabel}]`;
  doc.text(badge, pageWidth - 14 - doc.getTextWidth(badge), y + 3);
  y += 12;

  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  doc.text(item.summary, 14, y);
  y += 5;

  if (item.hostExerciseName) {
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text(`Esercizio host: ${item.hostExerciseName}`, 14, y);
    y += 4;
  }

  if (item.paramsLines.length) {
    doc.setFontSize(8);
    doc.setTextColor(...DARK);
    for (const line of item.paramsLines) {
      y = ensureSpace(doc, y, 6);
      doc.text(`• ${line}`, 16, y);
      y += 4;
    }
    y += 1;
  }

  if (item.nestedExercises.length) {
    const hasSets = item.nestedExercises.some((e) => e.sets && e.sets.length > 0);
    if (hasSets) {
      for (const nested of item.nestedExercises) {
        y = ensureSpace(doc, y, 14);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...DARK);
        doc.text(nested.name, 14, y);
        y += 3;
        if (nested.sets?.length) {
          autoTable(doc, {
            startY: y,
            margin: { left: 14, right: 14 },
            head: [['Serie', 'Reps', 'Kg', 'Recupero']],
            body: nested.sets.map((s) => [
              String(s.setNumber),
              s.reps ?? '—',
              s.kg ?? '—',
              formatRest(s.restSeconds),
            ]),
            theme: 'grid',
            styles: { fontSize: 7.5, cellPadding: 1.5, textColor: DARK, lineColor: LINE },
            headStyles: { fillColor: TEAL, textColor: [255, 255, 255], fontStyle: 'bold' },
            alternateRowStyles: { fillColor: TEAL_LIGHT },
          });
          y = ((doc as any).lastAutoTable?.finalY as number) + 3;
        }
      }
    } else {
      autoTable(doc, {
        startY: y,
        margin: { left: 14, right: 14 },
        head: [['#', 'Esercizio', 'Reps', 'Kg', 'Note']],
        body: item.nestedExercises.map((ex, i) => [
          String(i + 1),
          ex.name,
          ex.reps ?? '—',
          ex.kg ?? '—',
          ex.notes ?? '—',
        ]),
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2, textColor: DARK, lineColor: LINE },
        headStyles: { fillColor: TEAL, textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: TEAL_LIGHT },
        columnStyles: {
          0: { cellWidth: 12, halign: 'center' },
          2: { cellWidth: 22, halign: 'center' },
          3: { cellWidth: 20, halign: 'center' },
        },
      });
      y = ((doc as any).lastAutoTable?.finalY as number) + 3;
    }
  }

  if (item.notes) {
    y = ensureSpace(doc, y, 10);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    const noteLines = doc.splitTextToSize(`Note PT: ${item.notes}`, pageWidth - 28);
    doc.text(noteLines, 14, y);
    y += noteLines.length * 4 + 4;
  } else {
    y += 4;
  }

  return y;
}

function drawFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const stamp = format(new Date(), 'dd/MM/yyyy HH:mm');

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.3);
    doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text(`Generato da Livelapp · ${stamp}`, 14, pageHeight - 7);
    doc.text(`${i} / ${pageCount}`, pageWidth - 14, pageHeight - 7, { align: 'right' });
  }
}

export function buildWorkoutSheetPdf(dto: WorkoutSheetDto): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = drawHeader(doc, dto);

  dto.items.forEach((item, idx) => {
    if (item.kind === 'exercise') {
      y = drawExerciseItem(doc, item, idx + 1, y);
    } else {
      y = drawProtocolItem(doc, item, idx + 1, y);
    }
  });

  drawFooter(doc);
  return doc;
}

export function downloadWorkoutSheetPdf(dto: WorkoutSheetDto): void {
  const doc = buildWorkoutSheetPdf(dto);
  const filename = `scheda-${slugify(dto.title)}.pdf`;
  doc.save(filename);
}
