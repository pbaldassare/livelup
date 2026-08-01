import { supabase } from '@/integrations/supabase/client';
import type { ProtocolType, ProtocolParams } from '@/lib/protocols/registry';
import {
  getDefaultParamsForProtocol,
  PROTOCOL_ONLY_LIST,
  getProtocolDef,
} from '@/lib/protocols/registry';

/** Cast finché Lovable non rigenera types.ts */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export type PtProtocol = {
  id: string;
  pt_user_id: string;
  name: string;
  /** Alias app-side; in DB la colonna è `protocol_type`. */
  type: Exclude<ProtocolType, 'SET'>;
  config: ProtocolParams & {
    protocol_name?: string;
    host_exercise_id?: string | null;
  };
  description?: string | null;
  notes?: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

/** Voce standard (da registry FE o riga DB pubblica). */
export type StandardProtocol = {
  /** id DB se seedato; altrimenti chiave tipo */
  id: string | null;
  type: Exclude<ProtocolType, 'SET'>;
  name: string;
  description: string;
  is_public: true;
  source: 'registry' | 'db';
};

export type CreatePtProtocolInput = {
  name: string;
  type: Exclude<ProtocolType, 'SET'>;
  config?: ProtocolParams & { host_exercise_id?: string | null };
  favorite?: boolean;
};

type PtProtocolRow = {
  id: string;
  pt_user_id: string;
  name: string;
  protocol_type?: string;
  type?: string;
  config?: PtProtocol['config'] | null;
  description?: string | null;
  notes?: string | null;
  is_public?: boolean;
  created_at: string;
  updated_at: string;
};

function mapProtocolRow(row: PtProtocolRow): PtProtocol {
  const raw = (row.protocol_type || row.type || 'EMOM') as Exclude<ProtocolType, 'SET'>;
  return {
    id: row.id,
    pt_user_id: row.pt_user_id,
    name: row.name,
    type: raw,
    config: (row.config || {}) as PtProtocol['config'],
    description: row.description ?? null,
    notes: row.notes ?? null,
    is_public: !!row.is_public,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/** Solo personalizzati del PT (mai gli standard pubblici). */
export async function listMineProtocols(ptUserId: string): Promise<PtProtocol[]> {
  const { data, error } = await db
    .from('pt_protocols')
    .select('*')
    .eq('pt_user_id', ptUserId)
    .eq('is_public', false)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return ((data || []) as PtProtocolRow[]).map(mapProtocolRow);
}

/** @deprecated usa listMineProtocols */
export async function listPtProtocols(ptUserId: string): Promise<PtProtocol[]> {
  return listMineProtocols(ptUserId);
}

/**
 * Standard di piattaforma.
 * Preferisce righe DB is_public=true; integra con registry FE per tipi mancanti.
 */
export async function listStandardProtocols(): Promise<StandardProtocol[]> {
  const { data, error } = await db
    .from('pt_protocols')
    .select('*')
    .eq('is_public', true)
    .order('name');

  const fromDb = error ? [] : ((data || []) as PtProtocolRow[]).map(mapProtocolRow);
  const byType = new Map<string, StandardProtocol>();

  for (const row of fromDb) {
    byType.set(row.type, {
      id: row.id,
      type: row.type,
      name: row.name,
      description: row.description || getProtocolDef(row.type).description,
      is_public: true,
      source: 'db',
    });
  }

  for (const def of PROTOCOL_ONLY_LIST) {
    if (byType.has(def.type)) continue;
    byType.set(def.type, {
      id: null,
      type: def.type as Exclude<ProtocolType, 'SET'>,
      name: def.label,
      description: def.description,
      is_public: true,
      source: 'registry',
    });
  }

  return Array.from(byType.values()).sort((a, b) => a.name.localeCompare(b.name, 'it'));
}

export async function listFavoriteProtocolIds(ptUserId: string): Promise<Set<string>> {
  const { data, error } = await db
    .from('pt_favorite_protocols')
    .select('protocol_id')
    .eq('pt_user_id', ptUserId);
  if (error) throw error;
  return new Set<string>((data || []).map((r: { protocol_id: string }) => r.protocol_id));
}

export async function getProtocolById(protocolId: string): Promise<PtProtocol | null> {
  const { data, error } = await db.from('pt_protocols').select('*').eq('id', protocolId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapProtocolRow(data as PtProtocolRow);
}

/** Crea SEMPRE un protocollo privato del PT (mai standard pubblico). */
export async function createPtProtocol(
  ptUserId: string,
  input: CreatePtProtocolInput,
): Promise<PtProtocol> {
  const name = input.name.trim();
  if (!name) throw new Error('Nome protocollo obbligatorio');
  if (input.type === ('SET' as ProtocolType)) {
    throw new Error('Set standard non è un protocollo');
  }

  const config = {
    ...getDefaultParamsForProtocol(input.type),
    ...(input.config || {}),
    protocol_name: name,
  };

  const { data, error } = await db
    .from('pt_protocols')
    .insert({
      pt_user_id: ptUserId,
      name,
      protocol_type: input.type,
      config,
      is_public: false,
    })
    .select('*')
    .single();

  if (error) {
    if (/protocol_type|schema cache|PGRST204|42703/i.test(error.message)) {
      const legacy = await db
        .from('pt_protocols')
        .insert({
          pt_user_id: ptUserId,
          name,
          type: input.type,
          config,
          is_public: false,
        })
        .select('*')
        .single();
      if (legacy.error) throw legacy.error;
      if (input.favorite) await ensureFavorite(ptUserId, legacy.data.id);
      return mapProtocolRow(legacy.data as PtProtocolRow);
    }
    throw error;
  }

  if (input.favorite) await ensureFavorite(ptUserId, data.id);
  return mapProtocolRow(data as PtProtocolRow);
}

/**
 * Personalizza uno standard: crea copia privata del PT.
 * Non modifica mai la riga pubblica.
 */
export async function personalizeStandardProtocol(
  ptUserId: string,
  input: {
    type: Exclude<ProtocolType, 'SET'>;
    name: string;
    config?: ProtocolParams;
    favorite?: boolean;
  },
): Promise<PtProtocol> {
  return createPtProtocol(ptUserId, {
    name: input.name,
    type: input.type,
    config: input.config,
    favorite: input.favorite ?? true,
  });
}

async function ensureFavorite(ptUserId: string, protocolId: string): Promise<void> {
  const { error } = await db.from('pt_favorite_protocols').upsert(
    { pt_user_id: ptUserId, protocol_id: protocolId },
    { onConflict: 'pt_user_id,protocol_id' },
  );
  if (error) {
    if (/duplicate|23505/i.test(error.message)) return;
    const ins = await db
      .from('pt_favorite_protocols')
      .insert({ pt_user_id: ptUserId, protocol_id: protocolId });
    if (ins.error && !/duplicate|23505/i.test(ins.error.message)) throw ins.error;
  }
}

/** Aggiorna solo protocolli PRIVATI del PT. Rifiuta standard pubblici. */
export async function updatePtProtocol(
  protocolId: string,
  patch: { name?: string; config?: ProtocolParams; type?: Exclude<ProtocolType, 'SET'> },
): Promise<void> {
  const existing = await getProtocolById(protocolId);
  if (!existing) throw new Error('Protocollo non trovato');
  if (existing.is_public) {
    throw new Error('I protocolli standard non si modificano. Personalizzali: si crea una tua copia.');
  }

  const row: Record<string, unknown> = { is_public: false };
  if (patch.name !== undefined) row.name = patch.name.trim();
  if (patch.type !== undefined) row.protocol_type = patch.type;
  if (patch.config !== undefined) {
    row.config = {
      ...patch.config,
      protocol_name: patch.name?.trim() || patch.config.protocol_name,
    };
  }
  const { error } = await db.from('pt_protocols').update(row).eq('id', protocolId).eq('is_public', false);
  if (error) {
    if (patch.type !== undefined && /protocol_type|schema cache|PGRST204|42703/i.test(error.message)) {
      const { protocol_type: _pt, ...rest } = row;
      const legacy = await db
        .from('pt_protocols')
        .update({ ...rest, type: patch.type })
        .eq('id', protocolId)
        .eq('is_public', false);
      if (legacy.error) throw legacy.error;
      return;
    }
    throw error;
  }
}

export async function deletePtProtocol(protocolId: string): Promise<void> {
  const existing = await getProtocolById(protocolId);
  if (!existing) return;
  if (existing.is_public) {
    throw new Error('I protocolli standard non si eliminano');
  }
  const { error } = await db.from('pt_protocols').delete().eq('id', protocolId).eq('is_public', false);
  if (error) throw error;
}

/**
 * Preferito su standard pubblico → crea copia privata e la marca preferita.
 * Preferito su privato → toggle classico.
 */
export async function toggleFavoriteProtocol(
  ptUserId: string,
  protocolId: string,
  isFavorite: boolean,
): Promise<'added' | 'removed' | { action: 'added'; copyId: string }> {
  if (isFavorite) {
    const { error } = await db
      .from('pt_favorite_protocols')
      .delete()
      .eq('pt_user_id', ptUserId)
      .eq('protocol_id', protocolId);
    if (error) throw error;
    return 'removed';
  }

  const proto = await getProtocolById(protocolId);
  if (proto?.is_public) {
    const copy = await personalizeStandardProtocol(ptUserId, {
      type: proto.type,
      name: proto.name,
      config: proto.config,
      favorite: true,
    });
    return { action: 'added', copyId: copy.id };
  }

  await ensureFavorite(ptUserId, protocolId);
  return 'added';
}

/**
 * Salva/aggiorna personalizzazione da scheda.
 * - Se library punta a standard pubblico → nuova copia privata
 * - Se punta a privato mio → update + preferito
 * - Se assente → nuova copia privata
 */
export async function saveSheetProtocolAsMine(
  ptUserId: string,
  input: {
    libraryProtocolId?: string | null;
    type: Exclude<ProtocolType, 'SET'>;
    name: string;
    config: ProtocolParams;
    currentlyFavorite?: boolean;
    /** Solo in creazione: default true */
    favoriteOnCreate?: boolean;
    /** Se true su privato esistente: aggiorna senza toggle preferito */
    updateOnly?: boolean;
  },
): Promise<{ id: string; action: 'added' | 'removed' | 'saved' }> {
  let targetId = input.libraryProtocolId || null;
  const favoriteOnCreate = input.favoriteOnCreate !== false;

  if (targetId) {
    const existing = await getProtocolById(targetId);
    if (!existing) {
      targetId = null;
    } else if (existing.is_public) {
      // Non aggiornare lo standard: nuova copia privata
      const copy = await createPtProtocol(ptUserId, {
        name: input.name,
        type: input.type,
        config: input.config,
        favorite: favoriteOnCreate,
      });
      return { id: copy.id, action: 'added' };
    } else if (existing.pt_user_id !== ptUserId) {
      targetId = null;
    }
  }

  if (!targetId) {
    const created = await createPtProtocol(ptUserId, {
      name: input.name,
      type: input.type,
      config: input.config,
      favorite: favoriteOnCreate,
    });
    return { id: created.id, action: 'added' };
  }

  // Privato mio: aggiorna config
  await updatePtProtocol(targetId, {
    name: input.name,
    config: input.config,
    type: input.type,
  });

  if (input.updateOnly) {
    return { id: targetId, action: 'saved' };
  }

  // Toggle preferito
  const favAction = await toggleFavoriteProtocol(
    ptUserId,
    targetId,
    !!input.currentlyFavorite,
  );
  if (favAction === 'removed') return { id: targetId, action: 'removed' };
  return { id: targetId, action: typeof favAction === 'object' ? 'added' : 'saved' };
}

export function resolveHostExerciseId(config: Record<string, unknown> | null | undefined): string | null {
  if (!config) return null;
  const host = config.host_exercise_id;
  if (typeof host === 'string' && host) return host;

  const exercises = config.exercises;
  if (Array.isArray(exercises)) {
    for (const ex of exercises) {
      const id = (ex as { exercise_id?: string })?.exercise_id;
      if (id) return id;
    }
  }

  const blocks = config.blocks;
  if (Array.isArray(blocks)) {
    for (const blk of blocks) {
      const list = (blk as { exercises?: Array<{ exercise_id?: string }> })?.exercises;
      if (!Array.isArray(list)) continue;
      for (const ex of list) {
        if (ex?.exercise_id) return ex.exercise_id;
      }
    }
  }

  const setData = config.set_data;
  if (Array.isArray(setData)) {
    for (const row of setData) {
      const id = (row as { exercise_id?: string })?.exercise_id;
      if (id) return id;
    }
  }

  return null;
}

export function seedParamsWithHostExercise(
  type: Exclude<ProtocolType, 'SET'>,
  hostExerciseId: string,
  hostExerciseName: string,
  base?: ProtocolParams,
): ProtocolParams & { protocol_name?: string; host_exercise_id?: string } {
  const params = {
    ...getDefaultParamsForProtocol(type),
    ...(base || {}),
    host_exercise_id: hostExerciseId,
  } as ProtocolParams & { host_exercise_id?: string };

  if (type === 'EMOM') {
    const blocks = Array.isArray(params.blocks) ? params.blocks : [];
    if (blocks.length === 0) {
      params.blocks = [
        {
          id: 'blk_default',
          exercises: [{ id: 'ex_default', exercise_id: hostExerciseId, name: hostExerciseName, reps: 10 }],
        },
      ];
      params.blocks_count = 1;
    } else {
      const first = blocks[0];
      const exs = Array.isArray(first.exercises) ? first.exercises : [];
      if (exs.length === 0 || !exs[0].name) {
        first.exercises = [
          { id: exs[0]?.id || 'ex_default', exercise_id: hostExerciseId, name: hostExerciseName, reps: exs[0]?.reps ?? 10 },
        ];
      } else if (!exs[0].exercise_id) {
        exs[0].exercise_id = hostExerciseId;
        if (!exs[0].name) exs[0].name = hostExerciseName;
      }
    }
  }

  if (type === 'AMRAP' || type === 'HIIT' || type === 'TABATA' || type === 'RXT' || type === 'RUNNING_TOTAL') {
    const exercises = Array.isArray(params.exercises) ? params.exercises : [];
    if (exercises.length === 0) {
      params.exercises = [
        {
          id: 'ex_default',
          exercise_id: hostExerciseId,
          name: hostExerciseName,
          reps: type === 'AMRAP' ? 10 : 0,
          weight: null,
        },
      ];
      params.exercises_count = 1;
    }
  }

  if (type === 'SUPERSET') {
    const setData = Array.isArray(params.set_data) ? params.set_data : [];
    if (setData.length === 0) {
      params.set_data = [
        {
          exercise_id: hostExerciseId,
          exercise_name: hostExerciseName,
          sets: [{ set_number: 1, reps: 10, weight: null, rest_seconds: 30 }],
        },
      ];
    }
  }

  return params;
}
