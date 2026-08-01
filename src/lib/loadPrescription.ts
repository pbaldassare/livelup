// =====================================================
// Carico esercizio: corpo libero | kg | elastici | altro
// Persistito in sets_data / protocol_params (JSON).
// =====================================================

import type { LoadMode } from '@/types/database';

export type { LoadMode };

export type LoadFields = {
  load_mode?: LoadMode;
  /** Kg — usato quando load_mode === 'kg' (anche legacy). */
  weight: number | null;
  band_color?: string | null;
  other_text?: string | null;
};

export const BAND_COLORS = [
  { value: 'giallo', label: 'Giallo' },
  { value: 'rosso', label: 'Rosso' },
  { value: 'verde', label: 'Verde' },
  { value: 'blu', label: 'Blu' },
  { value: 'nero', label: 'Nero' },
  { value: 'arancione', label: 'Arancione' },
  { value: 'viola', label: 'Viola' },
  { value: 'rosa', label: 'Rosa' },
] as const;

export type BandColor = (typeof BAND_COLORS)[number]['value'];

export const LOAD_MODE_OPTIONS: { value: LoadMode; label: string }[] = [
  { value: 'bodyweight', label: 'Corpo libero' },
  { value: 'kg', label: 'Kg' },
  { value: 'band', label: 'Elastici' },
  { value: 'other', label: 'Altro' },
];

const BAND_VALUES = new Set<string>(BAND_COLORS.map((c) => c.value));

export function isLoadMode(v: unknown): v is LoadMode {
  return v === 'bodyweight' || v === 'kg' || v === 'band' || v === 'other';
}

export function getLoadMode(raw: Partial<LoadFields> | null | undefined): LoadMode {
  if (raw && isLoadMode(raw.load_mode)) return raw.load_mode;
  // Legacy: solo weight numerico → kg
  if (typeof raw?.weight === 'number' && Number.isFinite(raw.weight) && raw.weight > 0) {
    return 'kg';
  }
  return 'bodyweight';
}

/** Normalizza carico da JSON grezzo. Default: corpo libero. */
export function normalizeLoad(
  raw: Record<string, unknown> | Partial<LoadFields> | null | undefined,
): LoadFields {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const weightRaw = r.weight;
  const weight =
    typeof weightRaw === 'number' && Number.isFinite(weightRaw) && weightRaw >= 0
      ? weightRaw
      : null;

  let mode: LoadMode;
  if (isLoadMode(r.load_mode)) {
    mode = r.load_mode;
  } else if (weight != null && weight > 0) {
    mode = 'kg';
  } else {
    mode = 'bodyweight';
  }

  const bandRaw = typeof r.band_color === 'string' ? r.band_color.trim().toLowerCase() : '';
  const band_color =
    mode === 'band'
      ? BAND_VALUES.has(bandRaw)
        ? bandRaw
        : 'giallo'
      : null;

  const otherRaw = typeof r.other_text === 'string' ? r.other_text.trim() : '';
  const other_text = mode === 'other' ? otherRaw || null : null;

  return {
    load_mode: mode,
    weight: mode === 'kg' ? weight : null,
    band_color,
    other_text,
  };
}

/** Patch quando si cambia modalità (pulisce campi non pertinenti). */
export function switchLoadMode(
  current: Partial<LoadFields> | null | undefined,
  mode: LoadMode,
): LoadFields {
  const cur = normalizeLoad(current as Record<string, unknown>);
  switch (mode) {
    case 'kg':
      return {
        load_mode: 'kg',
        weight: cur.weight,
        band_color: null,
        other_text: null,
      };
    case 'band':
      return {
        load_mode: 'band',
        weight: null,
        band_color: cur.band_color && BAND_VALUES.has(cur.band_color) ? cur.band_color : 'giallo',
        other_text: null,
      };
    case 'other':
      return {
        load_mode: 'other',
        weight: null,
        band_color: null,
        other_text: cur.other_text,
      };
    default:
      return {
        load_mode: 'bodyweight',
        weight: null,
        band_color: null,
        other_text: null,
      };
  }
}

/** Etichetta UI / player / PDF. */
export function formatLoadLabel(raw: Partial<LoadFields> | null | undefined): string {
  const load = normalizeLoad(raw as Record<string, unknown>);
  switch (load.load_mode) {
    case 'kg':
      return load.weight != null && load.weight > 0 ? `${load.weight} kg` : 'Kg';
    case 'band': {
      const color = BAND_COLORS.find((c) => c.value === load.band_color);
      return color ? `Elastico ${color.label.toLowerCase()}` : 'Elastici';
    }
    case 'other':
      return load.other_text?.trim() ? load.other_text.trim() : 'Altro';
    default:
      return 'Corpo libero';
  }
}

/** True se c’è qualcosa di utile da mostrare all’atleta (sempre true tranne “vuoto”). */
export function hasLoadDisplay(raw: Partial<LoadFields> | null | undefined): boolean {
  const mode = getLoadMode(raw);
  if (mode === 'bodyweight') return true;
  if (mode === 'kg') return typeof raw?.weight === 'number' && raw.weight > 0;
  if (mode === 'band') return true;
  if (mode === 'other') return Boolean(raw?.other_text?.trim());
  return false;
}

export function defaultLoadFields(): LoadFields {
  return {
    load_mode: 'bodyweight',
    weight: null,
    band_color: null,
    other_text: null,
  };
}
