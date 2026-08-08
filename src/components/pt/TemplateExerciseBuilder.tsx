import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Star,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import {
  DndPlaceholder,
  dndDragHandleClassName,
  dndDraggableClassName,
  dndDroppableClassName,
  getDraggingStyle,
  portalWhileDragging,
  useDndSessionState,
} from '@/lib/dnd/helloPangea';
import {
  resolveSetsData,
  summarizeSets,
  DEFAULT_SET,
  getSetTargetMode,
  type SetItem,
} from '@/lib/setsData';
import { defaultLoadFields } from '@/lib/loadPrescription';
import { LoadField } from '@/components/pt/LoadField';
import {
  getProtocolDef,
  getNested,
  setNested,
  resolveRampingUnit,
  isProtocolType,
  describeExerciseProtocol,
  type ProtocolType,
  type ProtocolParams,
} from '@/lib/protocols/registry';
import { ProtocolInfoPopover } from '@/components/protocols/ProtocolInfoPopover';
import { EmomBlocksEditor } from '@/components/pt/protocols/EmomBlocksEditor';
import { AmrapEditor } from '@/components/pt/protocols/AmrapEditor';
import { SupersetEditor } from '@/components/pt/protocols/SupersetEditor';
import { TimedRoundsEditor } from '@/components/pt/protocols/TimedRoundsEditor';
import { normalizeTimedRoundsParams } from '@/lib/protocols/timedRounds';
import { normalizeAmrapParams } from '@/lib/protocols/amrap';
import { normalizeSupersetParams } from '@/lib/protocols/superset';
import { normalizeEmomParams } from '@/lib/protocols/emom';
import { useFavoriteIds } from '@/hooks/usePTFavoriteExercises';
import {
  useExerciseCatalogs,
  useAllPtCatalogItems,
} from '@/hooks/useExerciseCatalogs';
import { categorizeArchiveExercises, type ArchiveExerciseRow } from '@/lib/protocolExerciseArchive';
import {
  ExerciseArchivePickerPanel,
  exercisePickerPopoverClassName,
  exercisePickerPopoverProps,
  type CatalogPickerOption,
} from '@/components/pt/ExerciseArchivePickerPanel';
import { AddProtocolDialog, type AddProtocolResult } from '@/components/pt/AddProtocolDialog';
import {
  seedParamsWithHostExercise,
  seedEmptyProtocolParams,
  resolveHostExerciseId,
  updatePtProtocol,
  saveSheetProtocolAsMine,
  getProtocolById,
} from '@/lib/api/ptProtocols';
import { useFavoriteProtocolIds } from '@/hooks/usePTFavoriteProtocols';
import {
  type ProtocolConfig,
  type SetData,
  type SetTargetMode,
  type TemplateExerciseInsert,
  type TemplateExerciseUpdate,
  toJson,
} from '@/types/database';

// =====================================================
// TEMPLATE SEQUENCE BUILDER
// Sequenza scheda: esercizi (Set standard) + protocolli (blocchi).
// Set standard NON è un protocollo.
// =====================================================

interface Exercise {
  id: string;
  name: string;
  category: string;
  muscle_groups: string[];
  difficulty_level: string;
  video_url: string | null;
  image_url: string | null;
  is_public: boolean;
  created_by: string | null;
}

interface TemplateExercise {
  id: string;
  exercise_id: string;
  order_index: number;
  sets: number;
  reps_min: number | null;
  reps_max: number | null;
  rest_seconds: number | null;
  notes: string | null;
  tempo: string | null;
  prescribed_duration_seconds?: number | null;
  sets_data?: SetData[] | null;
  protocol_type?: string | null;
  protocol_params?: ProtocolConfig | null;
  protocol_name?: string | null;
  library_protocol_id?: string | null;
  block_id?: string | null;
  exercise?: Exercise;
}

interface TemplateExerciseBuilderProps {
  templateId: string;
  blockId?: string | null; // null = esercizi fuori circuito
  onSave?: () => void;
}

export function TemplateExerciseBuilder({ templateId, blockId, onSave }: TemplateExerciseBuilderProps) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [searchOpen, setSearchOpen] = useState(false);
  const [protocolDialogOpen, setProtocolDialogOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const dndSession = useDndSessionState();
  const { data: favoriteProtocolIds } = useFavoriteProtocolIds();

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Cache key — separato per blocco
  const queryKey = ['template-exercises', templateId, blockId ?? 'no-block'];

  // Fetch PT's favorite exercises + own private exercises
  const { data: favIds } = useFavoriteIds();
  const { data: exercises = [] } = useQuery({
    queryKey: ['template-exercises-library', user?.id, favIds ? Array.from(favIds).sort().join(',') : ''],
    queryFn: async () => {
      if (!user?.id) return [] as Exercise[];
      const ids = favIds ? Array.from(favIds) : [];

      let q = supabase.from('exercises').select('*');

      // Include own private exercises AND favorited exercises
      const ownPrivate = `and(created_by.eq.${user.id},is_public.eq.false)`;
      if (ids.length > 0) {
        q = q.or(`${ownPrivate},id.in.(${ids.join(',')})`);
      } else {
        q = q.eq('created_by', user.id).eq('is_public', false);
      }

      const { data, error } = await q.order('name');
      if (error) throw error;
      return (data || []) as Exercise[];
    },
    enabled: !!user?.id && favIds !== undefined,
  });

  // Fetch template exercises (filtrati per block_id se presente)
  const { data: templateExercises = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const mapRows = (data: any[]) =>
        data.map((te) => ({
          ...te,
          protocol_name:
            te.protocol_name ??
            (te.protocol_params as any)?.protocol_name ??
            null,
          exercise: te.exercises,
        })) as unknown as TemplateExercise[];

      const baseSelect =
        'id, exercise_id, order_index, sets, reps_min, reps_max, rest_seconds, notes, tempo, block_id, prescribed_duration_seconds, sets_data, protocol_type, protocol_params, protocol_name, library_protocol_id, exercises (*)';
      const legacySelect =
        'id, exercise_id, order_index, sets, reps_min, reps_max, rest_seconds, notes, tempo, block_id, prescribed_duration_seconds, sets_data, protocol_type, protocol_params, exercises (*)';

      const run = async (select: string) => {
        let q = supabase
          .from('template_exercises')
          .select(select)
          .eq('template_id', templateId)
          .order('order_index');
        if (blockId) q = q.eq('block_id', blockId);
        else q = q.is('block_id', null);
        return q;
      };

      const first = await run(baseSelect);
      if (!first.error) return mapRows(first.data || []);
      if (/protocol_name|library_protocol_id|42703|PGRST204|schema cache/i.test(first.error.message)) {
        const legacy = await run(legacySelect);
        if (legacy.error) throw legacy.error;
        return mapRows(legacy.data || []);
      }
      throw first.error;
    },
    enabled: !!templateId,
  });

  // Lista COMPLETA degli esercizi del template (tutti i blocchi/circuiti).
  // Usata per popolare il dropdown EMOM, indipendentemente dal block_id corrente.
  const { data: allTemplateExerciseOptions = [] } = useQuery({
    queryKey: ['template-exercise-options', templateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('template_exercises')
        .select('exercise_id, exercises ( id, name )')
        .eq('template_id', templateId);
      if (error) throw error;
      const seen = new Set<string>();
      const out: { id: string; name: string }[] = [];
      for (const row of data ?? []) {
        const id = row.exercise_id;
        const name = row.exercises?.name ?? '';
        if (!id || !name.trim() || seen.has(id)) continue;
        seen.add(id);
        out.push({ id, name });
      }
      return out;
    },
    enabled: !!templateId,
  });

  // Archivio completo (globali + privati PT, via RLS) per i dropdown dei protocolli
  const { data: archiveExerciseRows = [] } = useQuery({
    queryKey: ['protocol-exercise-archive', user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as ArchiveExerciseRow[];
      const { data, error } = await supabase
        .from('exercises')
        .select('id, name, is_public, created_by')
        .order('name');
      if (error) throw error;
      return (data ?? []) as ArchiveExerciseRow[];
    },
    enabled: !!user?.id,
  });

  const protocolExerciseArchive = useMemo(() => {
    if (!user?.id || !favIds) {
      return { favoriteOptions: [], mineOptions: [], globalOptions: [] };
    }
    const workoutIds = new Set(allTemplateExerciseOptions.map((o) => o.id));
    return categorizeArchiveExercises(archiveExerciseRows, {
      userId: user.id,
      favIds,
      excludeIds: workoutIds,
    });
  }, [archiveExerciseRows, allTemplateExerciseOptions, user?.id, favIds]);

  const { data: exerciseCatalogs = [] } = useExerciseCatalogs();
  const { data: allCatalogItems = [] } = useAllPtCatalogItems();

  /** Cataloghi PT con esercizi risolti dai nomi archivio (per picker). */
  const catalogPickerOptions = useMemo((): CatalogPickerOption[] => {
    const nameById = new Map(
      archiveExerciseRows.map((r) => [r.id, r.name] as const),
    );
    const byCatalog = new Map<string, { id: string; name: string }[]>();
    for (const item of allCatalogItems) {
      const name = nameById.get(item.exercise_id);
      if (!name?.trim()) continue;
      const list = byCatalog.get(item.catalog_id) ?? [];
      list.push({ id: item.exercise_id, name });
      byCatalog.set(item.catalog_id, list);
    }
    return exerciseCatalogs.map((c) => ({
      id: c.id,
      name: c.name,
      emoji: c.emoji,
      exercises: byCatalog.get(c.id) ?? [],
    }));
  }, [exerciseCatalogs, allCatalogItems, archiveExerciseRows]);

  const inBlockExerciseIds = useMemo(
    () => new Set(templateExercises.map((te) => te.exercise_id)),
    [templateExercises],
  );

  const addExercisePickerOptions = useMemo(() => {
    const notInBlock = (o: { id: string }) => !inBlockExerciseIds.has(o.id);
    return {
      workout: allTemplateExerciseOptions.filter(notInBlock),
      favorites: protocolExerciseArchive.favoriteOptions.filter(notInBlock),
      mine: protocolExerciseArchive.mineOptions.filter(notInBlock),
      global: protocolExerciseArchive.globalOptions.filter(notInBlock),
      catalogs: catalogPickerOptions.map((c) => ({
        ...c,
        exercises: c.exercises.filter(notInBlock),
      })),
    };
  }, [
    allTemplateExerciseOptions,
    protocolExerciseArchive,
    inBlockExerciseIds,
    catalogPickerOptions,
  ]);

  /** Cataloghi per editor protocolli: esclude esercizi già in tab Workout. */
  const protocolCatalogOptions = useMemo(() => {
    const workoutIds = new Set(allTemplateExerciseOptions.map((o) => o.id));
    return catalogPickerOptions.map((c) => ({
      ...c,
      exercises: c.exercises.filter((e) => !workoutIds.has(e.id)),
    }));
  }, [catalogPickerOptions, allTemplateExerciseOptions]);

  // Add exercise mutation — default SET, 3 set generici
  const addExerciseMutation = useMutation({
    mutationFn: async ({ id: exerciseId }: { id: string }) => {
      const maxOrder = templateExercises.length > 0
        ? Math.max(...templateExercises.map((te) => te.order_index)) + 1
        : 0;

      const sets = 3;
      const repsVal = 10;
      const rest = 60;

      const sets_data: SetData[] = Array.from({ length: sets }).map(() => ({
        mode: 'reps' as const,
        reps: repsVal,
        duration_seconds: null,
        ...defaultLoadFields(),
        rest_seconds: rest,
      }));

      const insertRow: TemplateExerciseInsert = {
        template_id: templateId,
        exercise_id: exerciseId,
        order_index: maxOrder,
        sets,
        reps_min: repsVal,
        reps_max: null,
        rest_seconds: rest,
        prescribed_duration_seconds: null,
        sets_data: toJson(sets_data),
        block_id: blockId ?? null,
        protocol_type: 'SET',
        protocol_params: toJson({}),
      };

      const { data, error } = await supabase
        .from('template_exercises')
        .insert(insertRow)
        .select('id')
        .single();

      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (newId) => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['template-blocks', templateId] });
      queryClient.invalidateQueries({ queryKey: ['template-blocks-counts', templateId] });
      queryClient.invalidateQueries({ queryKey: ['template-exercise-options', templateId] });
      setExpandedIds(new Set([newId]));
      toast.success('Esercizio aggiunto');
      setSearchOpen(false);
    },
    onError: () => {
      toast.error("Errore durante l'aggiunta");
    },
  });

  const nextOrderIndex = () =>
    templateExercises.length > 0
      ? Math.max(...templateExercises.map((te) => te.order_index)) + 1
      : 0;

  /** Aggiunge un protocollo come item di sequenza (non come proprietà dell'esercizio). */
  const addProtocolMutation = useMutation({
    mutationFn: async (result: AddProtocolResult) => {
      if (!user?.id) throw new Error('Non autenticato');

      let protocolType: Exclude<ProtocolType, 'SET'>;
      let protocolName: string;
      let hostExerciseId: string;
      let libraryId: string | null = null;
      let params: ProtocolParams & { protocol_name?: string; host_exercise_id?: string };

      if (result.mode === 'mine') {
        // Solo copie private del PT (flusso temporaneamente nascosto in dialog)
        if (result.protocol.is_public) {
          throw new Error('Usa lo standard dalla tab Standard, non come protocollo personale');
        }
        if (!result.hostExerciseId) {
          throw new Error('Seleziona un esercizio iniziale');
        }
        protocolType = result.protocol.type;
        protocolName = result.protocol.name;
        hostExerciseId = result.hostExerciseId;
        libraryId = result.protocol.id;
        params = seedParamsWithHostExercise(
          protocolType,
          hostExerciseId,
          result.hostExerciseName,
          result.protocol.config as ProtocolParams,
        );
        params.protocol_name = protocolName;
      } else if (result.hostExerciseId) {
        // standard | new con host esplicito (legacy / personalizzazione)
        protocolType = result.type;
        protocolName = result.name;
        hostExerciseId = result.hostExerciseId;
        params = seedParamsWithHostExercise(
          protocolType,
          hostExerciseId,
          result.hostExerciseName || '',
        );
        params.protocol_name = protocolName;

        if (result.saveAsMine) {
          const saved = await saveSheetProtocolAsMine(user.id, {
            type: protocolType,
            name: protocolName,
            config: params,
            favoriteOnCreate: result.favorite,
            updateOnly: true,
          });
          libraryId = saved.id;
        }
      } else {
        // Flusso semplificato: standard senza host → slot vuoti + placeholder FK
        protocolType = result.type;
        protocolName = result.name;
        const placeholder = allExerciseOptionsForProtocol[0];
        if (!placeholder?.id) {
          throw new Error('Aggiungi almeno un esercizio all\'archivio prima');
        }
        hostExerciseId = placeholder.id;
        params = {
          ...seedEmptyProtocolParams(protocolType),
          protocol_name: protocolName,
        };
        // Nessuna riga libreria / preferiti in questo percorso
      }

      const insertRow: TemplateExerciseInsert & {
        protocol_name?: string | null;
        library_protocol_id?: string | null;
      } = {
        template_id: templateId,
        exercise_id: hostExerciseId,
        order_index: nextOrderIndex(),
        sets: 1,
        reps_min: null,
        reps_max: null,
        rest_seconds: 60,
        prescribed_duration_seconds: null,
        sets_data: toJson([]),
        block_id: blockId ?? null,
        protocol_type: protocolType,
        protocol_params: toJson(params),
        protocol_name: protocolName,
        library_protocol_id: libraryId,
      };

      const { data, error } = await supabase
        .from('template_exercises')
        .insert(insertRow as any)
        .select('id')
        .single();
      if (error) {
        if (/protocol_name|library_protocol_id|42703|PGRST204|schema cache/i.test(error.message)) {
          const { protocol_name: _n, library_protocol_id: _l, ...legacy } = insertRow;
          const legacyParams = {
            ...params,
            ...(libraryId ? { library_protocol_id: libraryId } : {}),
          };
          const { data: legacyData, error: legacyErr } = await supabase
            .from('template_exercises')
            .insert({ ...legacy, protocol_params: toJson(legacyParams) } as any)
            .select('id')
            .single();
          if (legacyErr) throw legacyErr;
          return { id: legacyData.id as string, protocolName };
        } else {
          throw error;
        }
      }
      return { id: data.id as string, protocolName };
    },
    onSuccess: ({ id: newId, protocolName }) => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['pt-protocols-mine', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['pt-protocols', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['pt-favorite-protocol-ids', user?.id] });
      setExpandedIds(new Set([newId]));
      toast.success(`Protocollo “${protocolName}” aggiunto`);
      setProtocolDialogOpen(false);
    },
    onError: (e: Error) => toast.error(e.message || 'Errore aggiunta protocollo'),
  });

  const renameProtocolMutation = useMutation({
    mutationFn: async ({
      id,
      name,
      libraryProtocolId,
      params,
    }: {
      id: string;
      name: string;
      libraryProtocolId?: string | null;
      params: ProtocolConfig;
    }) => {
      const nextParams = { ...(params || {}), protocol_name: name };
      const updateRow: any = {
        protocol_name: name,
        protocol_params: toJson(nextParams),
      };
      const { error } = await supabase.from('template_exercises').update(updateRow).eq('id', id);
      if (error) {
        if (/protocol_name|42703|PGRST204|schema cache/i.test(error.message)) {
          const { error: legacyErr } = await supabase
            .from('template_exercises')
            .update({ protocol_params: toJson(nextParams) })
            .eq('id', id);
          if (legacyErr) throw legacyErr;
        } else {
          throw error;
        }
      }
      // Aggiorna libreria solo se copia privata (mai standard pubblico)
      if (libraryProtocolId) {
        const lib = await getProtocolById(libraryProtocolId);
        if (lib && !lib.is_public) {
          await updatePtProtocol(libraryProtocolId, { name, config: nextParams as ProtocolParams });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['pt-protocols-mine', user?.id] });
    },
    onError: (e: Error) => toast.error(e.message || 'Errore rinomina protocollo'),
  });

  const saveProtocolToLibraryMutation = useMutation({
    mutationFn: async (te: TemplateExercise) => {
      if (!user?.id) throw new Error('Non autenticato');
      const ptype = te.protocol_type as Exclude<ProtocolType, 'SET'>;
      if (!isProtocolType(ptype)) throw new Error('Non è un protocollo');
      const name =
        te.protocol_name?.trim() ||
        (te.protocol_params as any)?.protocol_name ||
        getProtocolDef(ptype).label;
      const config = {
        ...(te.protocol_params as ProtocolParams),
        protocol_name: name,
        host_exercise_id: te.exercise_id,
      };

      const libId =
        te.library_protocol_id ||
        ((te.protocol_params as any)?.library_protocol_id as string | undefined) ||
        null;
      const currentlyFavorite = libId ? favoriteProtocolIds?.has(libId) ?? false : false;

      const saved = await saveSheetProtocolAsMine(user.id, {
        libraryProtocolId: libId,
        type: ptype,
        name,
        config,
        currentlyFavorite,
      });

      // Collega la riga scheda alla copia privata
      if (saved.id !== libId) {
        const { error } = await supabase
          .from('template_exercises')
          .update({ library_protocol_id: saved.id } as any)
          .eq('id', te.id);
        if (error && !/library_protocol_id|42703|PGRST204/i.test(error.message)) {
          await supabase
            .from('template_exercises')
            .update({
              protocol_params: toJson({
                ...config,
                library_protocol_id: saved.id,
              }),
            } as any)
            .eq('id', te.id);
        }
      }
      return saved;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['pt-protocols-mine', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['pt-favorite-protocol-ids', user?.id] });
      toast.success(
        res.action === 'removed'
          ? 'Rimosso dai tuoi preferiti'
          : 'Salvato nei tuoi protocolli (copia personale)',
      );
    },
    onError: (e: Error) => toast.error(e.message || 'Errore salvataggio preferito'),
  });

  // Aggiorna protocol_params preservando nome / link libreria
  const updateProtocolParamMutation = useMutation({
    mutationFn: async ({ id, params }: { id: string; params: ProtocolConfig }) => {
      const current = templateExercises.find((t) => t.id === id);
      // Solo esercizi annidati contano come host reale (ignora placeholder FK sulla riga)
      const resolvedFromNested = resolveHostExerciseId({
        ...(params as Record<string, unknown>),
        host_exercise_id: null,
      });
      const merged: Record<string, unknown> = {
        ...(params as any),
        protocol_name:
          (params as any)?.protocol_name ||
          current?.protocol_name ||
          (current?.protocol_params as any)?.protocol_name,
        library_protocol_id:
          (params as any)?.library_protocol_id ||
          current?.library_protocol_id ||
          (current?.protocol_params as any)?.library_protocol_id,
      };
      if (resolvedFromNested) {
        merged.host_exercise_id = resolvedFromNested;
      } else {
        delete merged.host_exercise_id;
      }
      const updateRow: TemplateExerciseUpdate = {
        protocol_params: toJson(merged),
      };
      // Se l'utente seleziona il primo esercizio nel protocollo, allinea la FK riga
      if (resolvedFromNested && resolvedFromNested !== current?.exercise_id) {
        updateRow.exercise_id = resolvedFromNested;
      }
      const { error } = await supabase
        .from('template_exercises')
        .update(updateRow)
        .eq('id', id);
      if (error) throw error;

      // Sincronizza solo copie private del PT — mai gli standard pubblici
      if (current?.library_protocol_id) {
        const lib = await getProtocolById(current.library_protocol_id).catch(() => null);
        if (lib && !lib.is_public) {
          await updatePtProtocol(current.library_protocol_id, {
            config: merged as ProtocolParams,
            name: merged.protocol_name as string | undefined,
          }).catch(() => undefined);
        }
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  // Update exercise (campi piatti / note / tempo)
  const updateExerciseMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; sets?: number; reps_min?: number; reps_max?: number; rest_seconds?: number; notes?: string | null; tempo?: string | null }) => {
      const { error } = await supabase
        .from('template_exercises')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const debounceTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => () => {
    Object.values(debounceTimersRef.current).forEach(clearTimeout);
  }, []);

  const scheduleExerciseFieldUpdate = useCallback(
    (id: string, data: { notes?: string | null; tempo?: string | null }) => {
      const field = data.notes !== undefined ? 'notes' : 'tempo';
      const key = `${id}:${field}`;
      if (debounceTimersRef.current[key]) clearTimeout(debounceTimersRef.current[key]);
      debounceTimersRef.current[key] = setTimeout(() => {
        updateExerciseMutation.mutate({ id, ...data });
        delete debounceTimersRef.current[key];
      }, 500);
    },
    [updateExerciseMutation],
  );

  const patchExerciseInCache = useCallback(
    (id: string, patch: Partial<Pick<TemplateExercise, 'notes' | 'tempo'>>) => {
      queryClient.setQueryData<TemplateExercise[]>(queryKey, (old) =>
        (old || []).map((item) => (item.id === id ? { ...item, ...patch } : item)),
      );
    },
    [queryClient, queryKey],
  );

  // Mutation per aggiornare i sets_data (set eterogenei) + riassunto nei campi piatti
  const updateSetsMutation = useMutation({
    mutationFn: async ({ id, sets_data }: { id: string; sets_data: SetData[] }) => {
      const summary = summarizeSets(sets_data);
      const updateRow: TemplateExerciseUpdate = {
        sets_data: toJson(sets_data),
        sets: summary.sets,
        reps_min: summary.reps_min,
        reps_max: summary.reps_max,
        rest_seconds: summary.rest_seconds,
        prescribed_duration_seconds: summary.prescribed_duration_seconds,
      };
      const { error } = await supabase
        .from('template_exercises')
        .update(updateRow)
        .eq('id', id);
      if (error) throw error;
    },
    onMutate: async ({ id, sets_data }) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<TemplateExercise[]>(queryKey);
      const summary = summarizeSets(sets_data);
      queryClient.setQueryData<TemplateExercise[]>(queryKey, (old) =>
        (old || []).map((te) =>
          te.id === id
            ? {
                ...te,
                sets_data,
                sets: summary.sets,
                reps_min: summary.reps_min,
                reps_max: summary.reps_max,
                rest_seconds: summary.rest_seconds,
                prescribed_duration_seconds: summary.prescribed_duration_seconds,
              }
            : te,
        ),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(queryKey, ctx.prev);
      toast.error('Errore aggiornamento set');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  // Remove exercise mutation
  const removeExerciseMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('template_exercises')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['template-blocks', templateId] });
      queryClient.invalidateQueries({ queryKey: ['template-exercise-options', templateId] });
      toast.success('Esercizio rimosso');
    },
    onError: () => {
      toast.error('Errore durante la rimozione');
    },
  });

  // Reorder mutation for drag and drop
  const reorderMutation = useMutation({
    mutationFn: async ({
      updates,
    }: {
      updates: { id: string; order_index: number }[];
      previousOrder: TemplateExercise[];
    }) => {
      const results = await Promise.all(
        updates.map(({ id, order_index }) =>
          supabase.from('template_exercises').update({ order_index }).eq('id', id),
        ),
      );
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;
    },
    onError: (_e, { previousOrder }) => {
      queryClient.setQueryData(queryKey, previousOrder);
      toast.error('Errore durante il riordinamento');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Handle drag end
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    if (sourceIndex === destinationIndex) return;

    const previousOrder = templateExercises;

    // Create a new array with the reordered items
    const reordered = Array.from(templateExercises);
    const [removed] = reordered.splice(sourceIndex, 1);
    reordered.splice(destinationIndex, 0, removed);

    // Update order indices
    const updates = reordered.map((item, index) => ({
      id: item.id,
      order_index: index,
    }));

    // Optimistically update the cache
    queryClient.setQueryData(queryKey,
      reordered.map((item, index) => ({ ...item, order_index: index })),
    );

    // Persist to database
    reorderMutation.mutate({ updates, previousOrder });
  };

  const allExerciseOptionsForProtocol = useMemo(() => {
    const seen = new Set<string>();
    const out: { id: string; name: string }[] = [];
    for (const o of [
      ...allTemplateExerciseOptions,
      ...protocolExerciseArchive.favoriteOptions,
      ...protocolExerciseArchive.mineOptions,
      ...protocolExerciseArchive.globalOptions,
    ]) {
      if (!o.id || seen.has(o.id)) continue;
      seen.add(o.id);
      out.push({ id: o.id, name: o.name });
    }
    return out;
  }, [allTemplateExerciseOptions, protocolExerciseArchive]);

  const protocolCount = templateExercises.filter((te) => isProtocolType(te.protocol_type)).length;
  const exerciseCount = templateExercises.length - protocolCount;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <p className="text-sm text-muted-foreground">
            {exerciseCount} esercizi · {protocolCount} protocolli • Trascina per riordinare
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isMobile ? (
            <>
              <Button size="default" variant="outline" onClick={() => setSearchOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Aggiungi esercizio
              </Button>
              <Drawer open={searchOpen} onOpenChange={setSearchOpen}>
                <DrawerContent className="max-h-[90vh] outline-none">
                  <DrawerHeader className="pb-2 text-left">
                    <DrawerTitle>Aggiungi esercizio</DrawerTitle>
                  </DrawerHeader>
                  <div className="min-h-0 overflow-hidden px-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
                    <ExerciseArchivePickerPanel
                      open={searchOpen}
                      className="max-h-[min(65vh,480px)]"
                      workoutExerciseOptions={addExercisePickerOptions.workout}
                      favoriteExerciseOptions={addExercisePickerOptions.favorites}
                      mineExerciseOptions={addExercisePickerOptions.mine}
                      globalExerciseOptions={addExercisePickerOptions.global}
                      catalogOptions={addExercisePickerOptions.catalogs}
                      onSelect={(opt) => {
                        if (opt.id) addExerciseMutation.mutate({ id: opt.id });
                        setSearchOpen(false);
                      }}
                    />
                  </div>
                </DrawerContent>
              </Drawer>
            </>
          ) : (
            <Popover open={searchOpen} onOpenChange={setSearchOpen}>
              <PopoverTrigger asChild>
                <Button size="default" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Aggiungi esercizio
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className={exercisePickerPopoverClassName}
                {...exercisePickerPopoverProps}
              >
                <ExerciseArchivePickerPanel
                  open={searchOpen}
                  workoutExerciseOptions={addExercisePickerOptions.workout}
                  favoriteExerciseOptions={addExercisePickerOptions.favorites}
                  mineExerciseOptions={addExercisePickerOptions.mine}
                  globalExerciseOptions={addExercisePickerOptions.global}
                  catalogOptions={addExercisePickerOptions.catalogs}
                  onSelect={(opt) => {
                    if (opt.id) addExerciseMutation.mutate({ id: opt.id });
                  }}
                />
              </PopoverContent>
            </Popover>
          )}
          <Button size="default" onClick={() => setProtocolDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Aggiungi protocollo
          </Button>
        </div>
      </div>

      <AddProtocolDialog
        open={protocolDialogOpen}
        onOpenChange={setProtocolDialogOpen}
        exerciseOptions={allExerciseOptionsForProtocol}
        isSubmitting={addProtocolMutation.isPending}
        onConfirm={(result) => addProtocolMutation.mutate(result)}
      />

      {/* Sequenza esercizi + protocolli */}
      {templateExercises.length === 0 ? (
        <div className="py-6 text-center text-sm text-muted-foreground">
          Nessun elemento. Aggiungi un esercizio o un protocollo per iniziare.
        </div>
      ) : (
        <DragDropContext
          onDragStart={dndSession.onDragStart}
          onDragEnd={dndSession.wrapDragEnd(handleDragEnd)}
        >
          <Droppable droppableId="template-exercises">
            {(provided, snapshot) => (
              <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={dndDroppableClassName(
                    snapshot.isDraggingOver,
                    'space-y-3 min-h-[80px]',
                  )}
                >
                  {templateExercises.map((te, index) => (
                    <Draggable key={te.id} draggableId={te.id} index={index}>
                      {(provided, snapshot) => {
                        const rowIsProtocol = isProtocolType(te.protocol_type);
                        const isRowExpanded =
                          expandedIds.has(te.id) &&
                          !snapshot.isDragging &&
                          dndSession.draggingId !== te.id;
                        return portalWhileDragging(
                          snapshot,
                          <Card
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          style={getDraggingStyle(provided.draggableProps.style, snapshot)}
                          className={dndDraggableClassName(
                            snapshot,
                            'overflow-hidden',
                            rowIsProtocol && 'border-primary/30 bg-primary/[0.02]',
                          )}
                        >
                          <CardContent className="p-3 sm:p-4">
                            <div className="flex gap-2 sm:gap-4">
                              {/* Drag Handle — solo da qui, target touch ~44px */}
                              <div
                                {...provided.dragHandleProps}
                                className={dndDragHandleClassName}
                                aria-label="Trascina per riordinare"
                                title="Trascina per riordinare"
                              >
                                <GripVertical className="h-5 w-5" />
                                <span className="text-xs font-medium tabular-nums">
                                  {index + 1}
                                </span>
                              </div>

                              {/* Exercise / Protocol Info */}
                              <div className="flex-1 min-w-0 space-y-3">
                                {(() => {
                                  const isProtocol = isProtocolType(te.protocol_type);
                                  const ptype = (te.protocol_type as ProtocolType) || 'SET';
                                  const def = getProtocolDef(ptype);
                                  const ProtocolIcon = def.icon;
                                  const protocolDisplayName =
                                    te.protocol_name?.trim() ||
                                    (te.protocol_params as any)?.protocol_name ||
                                    def.label;
                                  return (
                                <div className="flex items-start justify-between gap-2">
                                  <button
                                    type="button"
                                    onClick={() => toggleExpanded(te.id)}
                                    className="flex min-w-0 items-start gap-2 text-left"
                                    aria-expanded={isRowExpanded}
                                    title={isRowExpanded ? 'Comprimi' : 'Espandi'}
                                  >
                                    {!isRowExpanded ? (
                                      <ChevronRight className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                                    )}
                                    <div className="min-w-0">
                                      {isProtocol ? (
                                        <>
                                          <p className="font-medium truncate flex items-center gap-1.5">
                                            <ProtocolIcon className="h-3.5 w-3.5 shrink-0 text-primary" />
                                            {protocolDisplayName}
                                          </p>
                                          <p className="text-sm text-muted-foreground truncate">
                                            Protocollo · {def.label}
                                            {(() => {
                                              // Nasconde il placeholder FK silenzioso finché non c’è un esercizio annidato
                                              const nestedHost = resolveHostExerciseId({
                                                ...(te.protocol_params as Record<string, unknown>),
                                                host_exercise_id: null,
                                              });
                                              return nestedHost && te.exercise?.name
                                                ? ` · ${te.exercise.name}`
                                                : '';
                                            })()}
                                            {' · '}
                                            {describeExerciseProtocol(
                                              ptype,
                                              te.protocol_params as ProtocolParams,
                                              te.sets,
                                            )}
                                          </p>
                                        </>
                                      ) : (
                                        <>
                                          <p className="font-medium truncate">{te.exercise?.name}</p>
                                          <p className="text-sm text-muted-foreground truncate">
                                            {te.exercise?.category}
                                            {te.exercise?.muscle_groups?.length
                                              ? ` • ${te.exercise.muscle_groups.join(', ')}`
                                              : ''}
                                          </p>
                                        </>
                                      )}
                                    </div>
                                  </button>
                                  <div className="flex items-center gap-1 shrink-0">
                                    {isProtocol && (
                                      <>
                                        <ProtocolInfoPopover type={ptype} />
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          title="Salva nei preferiti"
                                          disabled={saveProtocolToLibraryMutation.isPending}
                                          onClick={() => saveProtocolToLibraryMutation.mutate(te)}
                                        >
                                          <Star
                                            className={cn(
                                              'h-4 w-4',
                                              (() => {
                                                const libId =
                                                  te.library_protocol_id ||
                                                  (te.protocol_params as any)?.library_protocol_id;
                                                return libId && favoriteProtocolIds?.has(libId)
                                                  ? 'fill-amber-400 text-amber-400'
                                                  : 'text-muted-foreground';
                                              })(),
                                            )}
                                          />
                                        </Button>
                                      </>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-destructive hover:text-destructive"
                                      onClick={() => removeExerciseMutation.mutate(te.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                                  );
                                })()}

                                {/* Render condizionale: esercizio SET vs editor protocollo */}
                                {isRowExpanded && (() => {
                                  const ptype = ((te.protocol_type as ProtocolType) || 'SET');
                                  if (ptype === 'SET') {
                                    return (
                                      <SetsTable
                                        te={te}
                                        onChange={(sets_data) =>
                                          updateSetsMutation.mutate({ id: te.id, sets_data })
                                        }
                                      />
                                    );
                                  }

                                  const protocolDisplayName =
                                    te.protocol_name?.trim() ||
                                    (te.protocol_params as any)?.protocol_name ||
                                    getProtocolDef(ptype).label;

                                  const nameField = (
                                    <div className="space-y-1.5 rounded-md border bg-muted/20 p-3">
                                      <Label className="text-xs">Nome protocollo</Label>
                                      <Input
                                        defaultValue={protocolDisplayName}
                                        key={`${te.id}-${protocolDisplayName}`}
                                        className="h-8"
                                        placeholder="Nome del protocollo"
                                        onBlur={(e) => {
                                          const next = e.target.value.trim();
                                          if (!next || next === protocolDisplayName) return;
                                          renameProtocolMutation.mutate({
                                            id: te.id,
                                            name: next,
                                            libraryProtocolId: te.library_protocol_id,
                                            params: (te.protocol_params || {}) as ProtocolConfig,
                                          });
                                        }}
                                      />
                                      <p className="text-[11px] text-muted-foreground">
                                        Combina gli esercizi sotto. Puoi spostare questo blocco nella scheda come un esercizio.
                                      </p>
                                    </div>
                                  );

                                  if (ptype === 'TOP_SET_BACKOFF') {
                                    const rawParams = te.protocol_params ?? {};
                                    const params = normalizeTopSetBackoff(rawParams);
                                    const backoffEnabled = params.backoff_enabled !== false;

                                    const commit = (next: any) => {
                                      updateProtocolParamMutation.mutate({ id: te.id, params: next });
                                    };

                                    const updateParam = (
                                      key: 'top_sets' | 'top_reps' | 'top_rest' | 'top_increase_percent' | 'top_kg' | 'backoff_enabled' | 'backoff_sets' | 'backoff_reps' | 'backoff_percentage' | 'backoff_kg',
                                      value: number | boolean | null,
                                    ) => {
                                      const next = applyParamSync(params, key, value);
                                      commit(next);
                                    };

                                    const updateTopSetCell = (idx: number, patch: Partial<SetItem> & { weight_is_manual?: boolean }) => {
                                      const top_set_data = params.top_set_data.map((s, i) =>
                                        i === idx ? { ...s, ...patch } : s,
                                      );
                                      commit({ ...params, top_set_data });
                                    };
                                    const updateBackoffCell = (idx: number, patch: Partial<SetItem> & { weight_is_manual?: boolean }) => {
                                      const backoff_data = params.backoff_data.map((s, i) =>
                                        i === idx ? { ...s, ...patch } : s,
                                      );
                                      commit({ ...params, backoff_data });
                                    };
                                    const addTopSet = () => {
                                      const next = applyParamSync(params, 'top_sets', (params.top_sets ?? 1) + 1);
                                      commit(next);
                                    };
                                    const removeTopSet = (idx: number) => {
                                      if (params.top_set_data.length <= 1) return;
                                      const filtered = params.top_set_data.filter((_, i) => i !== idx);
                                      const top_set_data = applyTopAutoWeights(filtered, params.top_kg, params.top_increase_percent);
                                      commit({ ...params, top_sets: filtered.length, top_set_data });
                                    };
                                    const addBackoffSet = () => {
                                      const next = applyParamSync(params, 'backoff_sets', (params.backoff_sets ?? 1) + 1);
                                      commit(next);
                                    };
                                    const removeBackoffSet = (idx: number) => {
                                      if (params.backoff_data.length <= 1) return;
                                      const filtered = params.backoff_data.filter((_, i) => i !== idx);
                                      const backoff_data = applyBackoffAutoWeights(filtered, params.backoff_kg, params.backoff_percentage);
                                      commit({ ...params, backoff_sets: filtered.length, backoff_data });
                                    };

                                    return (
                                      <div className="space-y-3">
                                        {nameField}
                                        <div className="rounded-md border bg-muted/20 p-3 space-y-3">
                                          <p className="text-xs font-medium text-muted-foreground">
                                            Parametri Top Set + Back Off
                                          </p>
                                          {/* Top Set */}
                                          <div className="space-y-2">
                                            <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground/80">Top Set</p>
                                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                              <div className="space-y-1">
                                                <Label className="text-xs">Serie</Label>
                                                <Input
                                                  type="number"
                                                  min={1}
                                                  placeholder="1"
                                                  value={params.top_sets ?? ''}
                                                  onChange={(e) => updateParam('top_sets', e.target.value === '' ? null : Number(e.target.value))}
                                                  className="h-8"
                                                />
                                              </div>
                                              <div className="space-y-1">
                                                <Label className="text-xs">Reps</Label>
                                                <Input
                                                  type="number"
                                                  min={1}
                                                  placeholder="5"
                                                  value={params.top_reps ?? ''}
                                                  onChange={(e) => updateParam('top_reps', e.target.value === '' ? null : Number(e.target.value))}
                                                  className="h-8"
                                                />
                                              </div>
                                              <div className="space-y-1">
                                                <Label className="text-xs">Recupero (s)</Label>
                                                <Input
                                                  type="number"
                                                  min={0}
                                                  step={15}
                                                  placeholder="120"
                                                  value={params.top_rest ?? ''}
                                                  onChange={(e) => updateParam('top_rest', e.target.value === '' ? null : Number(e.target.value))}
                                                  className="h-8"
                                                />
                                              </div>
                                              <div className="space-y-1">
                                                <Label className="text-xs">Kg</Label>
                                                <Input
                                                  type="number"
                                                  min={0}
                                                  step={0.5}
                                                  placeholder="—"
                                                  value={params.top_kg ?? ''}
                                                  onChange={(e) => updateParam('top_kg', e.target.value === '' ? null : Number(e.target.value))}
                                                  className="h-8"
                                                />
                                              </div>
                                              <div className="space-y-1">
                                                <Label className="text-xs">Aumento %</Label>
                                                <Input
                                                  type="number"
                                                  min={0}
                                                  max={100}
                                                  step={0.5}
                                                  placeholder="5"
                                                  value={params.top_increase_percent ?? ''}
                                                  onChange={(e) => updateParam('top_increase_percent', e.target.value === '' ? null : Number(e.target.value))}
                                                  className="h-8"
                                                />
                                              </div>
                                            </div>
                                          </div>
                                          {/* Back Off toggle */}
                                          <div className="flex items-center justify-between rounded-md border border-border/60 bg-background/50 px-3 py-2">
                                            <div>
                                              <p className="text-xs font-semibold">Back Off</p>
                                              <p className="text-[10px] text-muted-foreground">Serie di scarico a carico ridotto</p>
                                            </div>
                                            <Switch
                                              checked={backoffEnabled}
                                              onCheckedChange={(checked) => updateParam('backoff_enabled', checked)}
                                            />
                                          </div>
                                          {/* Back Off params */}
                                          {backoffEnabled && (
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                              <div className="space-y-1">
                                                <Label className="text-xs">Serie</Label>
                                                <Input
                                                  type="number"
                                                  min={1}
                                                  placeholder="3"
                                                  value={params.backoff_sets ?? ''}
                                                  onChange={(e) => updateParam('backoff_sets', e.target.value === '' ? null : Number(e.target.value))}
                                                  className="h-8"
                                                />
                                              </div>
                                              <div className="space-y-1">
                                                <Label className="text-xs">Reps</Label>
                                                <Input
                                                  type="number"
                                                  min={1}
                                                  placeholder="8"
                                                  value={params.backoff_reps ?? ''}
                                                  onChange={(e) => updateParam('backoff_reps', e.target.value === '' ? null : Number(e.target.value))}
                                                  className="h-8"
                                                />
                                              </div>
                                              <div className="space-y-1">
                                                <Label className="text-xs">Kg</Label>
                                                <Input
                                                  type="number"
                                                  min={0}
                                                  step={0.5}
                                                  placeholder="—"
                                                  value={params.backoff_kg ?? ''}
                                                  onChange={(e) => updateParam('backoff_kg', e.target.value === '' ? null : Number(e.target.value))}
                                                  className="h-8"
                                                />
                                              </div>
                                              <div className="space-y-1">
                                                <Label className="text-xs">% riduzione</Label>
                                                <Input
                                                  type="number"
                                                  min={1}
                                                  max={90}
                                                  placeholder="20"
                                                  value={params.backoff_percentage ?? ''}
                                                  onChange={(e) => updateParam('backoff_percentage', e.target.value === '' ? null : Number(e.target.value))}
                                                  className="h-8"
                                                />
                                              </div>
                                            </div>
                                          )}
                                        </div>

                                        {/* Tabella Top Set */}
                                        <TopSetBackoffTable
                                          title="Top Set"
                                          sets={params.top_set_data}
                                          onCellChange={updateTopSetCell}
                                          onAddSet={addTopSet}
                                          onRemoveSet={removeTopSet}
                                        />

                                        {/* Tabella Back Off */}
                                        {backoffEnabled && (
                                          <TopSetBackoffTable
                                            title="Back Off"
                                            sets={params.backoff_data}
                                            onCellChange={updateBackoffCell}
                                            onAddSet={addBackoffSet}
                                            onRemoveSet={removeBackoffSet}
                                          />
                                        )}
                                      </div>
                                    );
                                  }
                                  // Protocolli non-set-based: render dei paramFields
                                  const def = getProtocolDef(ptype);
                                  const params = (te.protocol_params as ProtocolParams) || {};

                                  // EMOM: editor a blocchi dedicato (override della form generica)
                                  if (ptype === 'EMOM') {
                                    const fallbackName =
                                      exercises.find((e) => e.id === te.exercise_id)?.name;
                                    const emomValue = normalizeEmomParams(
                                      params as Record<string, unknown>,
                                      fallbackName,
                                    );
                                    return (
                                      <div className="space-y-3">
                                        {nameField}
                                        <EmomBlocksEditor
                                          value={emomValue}
                                          workoutExerciseOptions={allTemplateExerciseOptions}
                                          favoriteExerciseOptions={protocolExerciseArchive.favoriteOptions}
                                          mineExerciseOptions={protocolExerciseArchive.mineOptions}
                                          globalExerciseOptions={protocolExerciseArchive.globalOptions}
                                          catalogOptions={protocolCatalogOptions}
                                          onChange={(next) => {
                                            updateProtocolParamMutation.mutate({
                                              id: te.id,
                                              params: next as unknown as ProtocolParams,
                                            });
                                          }}
                                        />
                                      </div>
                                    );
                                  }

                                  if (ptype === 'AMRAP') {
                                    const amrapValue = normalizeAmrapParams(
                                      params as Record<string, unknown>,
                                    );
                                    return (
                                      <div className="space-y-3">
                                        {nameField}
                                        <AmrapEditor
                                          value={amrapValue}
                                          workoutExerciseOptions={allTemplateExerciseOptions}
                                          favoriteExerciseOptions={protocolExerciseArchive.favoriteOptions}
                                          mineExerciseOptions={protocolExerciseArchive.mineOptions}
                                          globalExerciseOptions={protocolExerciseArchive.globalOptions}
                                          catalogOptions={protocolCatalogOptions}
                                          onChange={(next) => {
                                            updateProtocolParamMutation.mutate({
                                              id: te.id,
                                              params: next as unknown as ProtocolParams,
                                            });
                                          }}
                                        />
                                      </div>
                                    );
                                  }

                                  if (ptype === 'SUPERSET') {
                                    const supersetValue = normalizeSupersetParams(
                                      params as Record<string, unknown>,
                                    );
                                    return (
                                      <div className="space-y-3">
                                        {nameField}
                                        <SupersetEditor
                                          value={supersetValue}
                                          workoutExerciseOptions={allTemplateExerciseOptions}
                                          favoriteExerciseOptions={protocolExerciseArchive.favoriteOptions}
                                          mineExerciseOptions={protocolExerciseArchive.mineOptions}
                                          globalExerciseOptions={protocolExerciseArchive.globalOptions}
                                          catalogOptions={protocolCatalogOptions}
                                          onChange={(next) => {
                                            updateProtocolParamMutation.mutate({
                                              id: te.id,
                                              params: next as unknown as ProtocolParams,
                                            });
                                          }}
                                        />
                                      </div>
                                    );
                                  }

                                  if (ptype === 'HIIT' || ptype === 'TABATA') {
                                    const trValue = normalizeTimedRoundsParams(
                                      params as Record<string, unknown>,
                                    );
                                    return (
                                      <div className="space-y-3">
                                        {nameField}
                                        <TimedRoundsEditor
                                          value={trValue}
                                          title={ptype}
                                          workoutExerciseOptions={allTemplateExerciseOptions}
                                          favoriteExerciseOptions={protocolExerciseArchive.favoriteOptions}
                                          mineExerciseOptions={protocolExerciseArchive.mineOptions}
                                          globalExerciseOptions={protocolExerciseArchive.globalOptions}
                                          catalogOptions={protocolCatalogOptions}
                                          onChange={(next) => {
                                            updateProtocolParamMutation.mutate({
                                              id: te.id,
                                              params: next as unknown as ProtocolParams,
                                            });
                                          }}
                                        />
                                      </div>
                                    );
                                  }


                                  return (
                                    <div className="space-y-3">
                                    {nameField}
                                    <div className="rounded-md border bg-muted/20 p-3 space-y-3">
                                      <p className="text-xs font-medium text-muted-foreground">
                                        Parametri {def.label}
                                      </p>
                                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {def.paramFields
                                          .filter((f) => !f.showWhen || f.showWhen(params))
                                          .map((f) => {
                                          const val = getNested(params, f.key);
                                          const isWide = f.type === 'text' || f.type === 'select' || f.type === 'exercise_select' || f.type === 'number_list';
                                          return (
                                            <div key={f.key} className={cn('space-y-1', isWide && 'col-span-2 md:col-span-3')}>
                                              <Label className="text-xs">{f.label}</Label>
                                              {f.type === 'exercise_select' ? (
                                                <Select
                                                  value={(val as string) ?? ''}
                                                  onValueChange={(newVal) => {
                                                    const next = setNested(params, f.key, newVal);
                                                    updateProtocolParamMutation.mutate({ id: te.id, params: next });
                                                  }}
                                                >
                                                  <SelectTrigger className="h-8">
                                                    <SelectValue placeholder={f.placeholder || 'Seleziona esercizio…'} />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    {exercises
                                                      .filter((ex) => ex.id !== te.exercise_id)
                                                      .map((ex) => (
                                                        <SelectItem key={ex.id} value={ex.id}>
                                                          {ex.name}
                                                        </SelectItem>
                                                      ))}
                                                    {exercises.filter((ex) => ex.id !== te.exercise_id).length === 0 && (
                                                      <div className="px-2 py-1.5 text-xs text-muted-foreground">
                                                        Nessun esercizio disponibile.
                                                      </div>
                                                    )}
                                                  </SelectContent>
                                                </Select>
                                              ) : f.type === 'select' ? (
                                                <Select
                                                  value={(val as string) ?? ''}
                                                  onValueChange={(newVal) => {
                                                    let next = setNested(params, f.key, newVal);
                                                    // Ramping: se value_type ≠ custom, azzera la label custom
                                                    if (ptype === 'RAMPING' && f.key === 'value_type' && newVal !== 'custom') {
                                                      next = setNested(next, 'custom_value_label', null);
                                                    }
                                                    updateProtocolParamMutation.mutate({ id: te.id, params: next });
                                                  }}
                                                >
                                                  <SelectTrigger className="h-8">
                                                    <SelectValue placeholder={f.placeholder || 'Seleziona...'} />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    {(f.options || []).map((opt) => (
                                                      <SelectItem key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                      </SelectItem>
                                                    ))}
                                                  </SelectContent>
                                                </Select>
                                              ) : f.type === 'number_list' ? (
                                                <Input
                                                  type="text"
                                                  inputMode="numeric"
                                                  placeholder={f.placeholder || 'Es. 1,2,3'}
                                                  value={Array.isArray(val) ? (val as number[]).join(',') : ''}
                                                  onChange={(e) => {
                                                    const raw = e.target.value;
                                                    // Mantieni la digitazione ma salva solo i numeri parsabili
                                                    const parsed = raw
                                                      .split(/[,\s]+/)
                                                      .map((s) => s.trim())
                                                      .filter((s) => s !== '')
                                                      .map((s) => Number(s))
                                                      .filter((n) => Number.isFinite(n) && n > 0);
                                                    const next = setNested(params, f.key, parsed);
                                                    updateProtocolParamMutation.mutate({ id: te.id, params: next });
                                                  }}
                                                  className="h-8"
                                                />
                                              ) : (
                                                <Input
                                                  type={f.type}
                                                  min={f.min}
                                                  max={f.max}
                                                  step={f.step}
                                                  placeholder={f.placeholder}
                                                  value={val ?? ''}
                                                  onChange={(e) => {
                                                    const raw = e.target.value;
                                                    const newVal = f.type === 'text'
                                                      ? raw
                                                      : (raw === '' ? null : Number(raw));
                                                    const next = setNested(params, f.key, newVal);
                                                    updateProtocolParamMutation.mutate({ id: te.id, params: next });
                                                  }}
                                                  className="h-8"
                                                />
                                              )}
                                              {f.hint && (
                                                <p className="text-[10px] text-muted-foreground">{f.hint}</p>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                      {ptype === 'RAMPING' && (
                                        <div className="rounded-md border border-dashed border-primary/30 bg-primary/5 px-3 py-2 space-y-2">
                                          <p className="text-[11px] text-foreground/80 leading-relaxed">
                                            <span className="font-semibold">Nota:</span> le serie verranno generate dall'atleta durante l'allenamento aumentando il carico set dopo set, fino al KO.
                                          </p>
                                          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-[10px] font-medium text-foreground/80">
                                            <span className="text-muted-foreground">Unità atleta:</span>
                                            <span className="font-semibold text-foreground">{resolveRampingUnit(params)}</span>
                                          </div>
                                        </div>
                                      )}
                                      {/* EMOM, AMRAP e SUPERSET hanno editor dedicati (vedi early return sopra) */}
                                      {ptype === 'LADDER' && (
                                        <div className="rounded-md border border-dashed border-primary/30 bg-primary/5 px-3 py-2">
                                          <p className="text-[11px] text-foreground/80 leading-relaxed">
                                            <span className="font-semibold">Nota:</span> completa tutta la scala per formare una serie. Ripeti per il numero di serie impostato. Lo stato avanzamento (scalino X/totale, serie X/totale) verrà mostrato all'atleta durante l'allenamento.
                                          </p>
                                        </div>
                                      )}
                                      {ptype === 'DEAD_LADDER' && (
                                        <div className="rounded-md border border-dashed border-primary/30 bg-primary/5 px-3 py-2">
                                          <p className="text-[11px] text-foreground/80 leading-relaxed">
                                            <span className="font-semibold">Nota:</span> l'atleta aumenterà le ripetizioni progressivamente fino al cedimento. Il massimo raggiunto rappresenta il risultato della serie. Tasti "Continua" e "KO" verranno mostrati durante l'allenamento.
                                          </p>
                                        </div>
                                      )}
                                      {/* HIIT e TABATA: rendering gestito da TimedRoundsEditor sopra (early return) */}

                                      {ptype === 'RXT' && (
                                        <div className="rounded-md border border-dashed border-primary/30 bg-primary/5 px-3 py-2">
                                          <p className="text-[11px] text-foreground/80 leading-relaxed">
                                            <span className="font-semibold">Nota:</span> L’atleta deve completare i round previsti nel minor tempo possibile. La struttura atleta mostrerà cronometro totale count-up, round corrente / totale, azione “Round completato” e benchmark futuri su miglior tempo, ultimo tempo e trend miglioramento.
                                          </p>
                                        </div>
                                      )}
                                      {ptype === 'RUNNING_TOTAL' && (
                                        <div className="rounded-md border border-dashed border-primary/30 bg-primary/5 px-3 py-2">
                                          <p className="text-[11px] text-foreground/80 leading-relaxed">
                                            <span className="font-semibold">Nota:</span> L’atleta può spezzare liberamente il blocco in sub-serie fino a raggiungere il totale. La struttura atleta mostrerà cronometro count-up, reps cumulative, azione “+ aggiungi reps”, auto-complete blocco al target e tracking futuro su miglior tempo, distribuzione sub-serie e storico progressioni.
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                    </div>
                                  );
                                })()}

                                {/* Avanzate: tempo + note (collassate) */}
                                {isRowExpanded && (
                                  <Collapsible>
                                  <CollapsibleTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
                                      <ChevronDown className="h-3 w-3" />
                                      Mostra avanzate (tempo, note)
                                    </Button>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent className="space-y-3 pt-2">
                                    <div className="space-y-1">
                                      <Label className="text-xs">Tempo (cadenza movimento)</Label>
                                      <div className="flex items-center gap-1">
                                        {(() => {
                                          const tempoParts = (te.tempo || '').split('-');
                                          const labels = ['Ecc.', 'Pausa', 'Conc.', 'Pausa'];
                                          return labels.map((label, i) => (
                                            <div key={i} className="flex-1">
                                              <Input
                                                type="number"
                                                min={0}
                                                max={9}
                                                placeholder="0"
                                                value={tempoParts[i] || ''}
                                                onChange={(e) => {
                                                  const newParts = [...(te.tempo || '0-0-0-0').split('-')];
                                                  while (newParts.length < 4) newParts.push('0');
                                                  newParts[i] = e.target.value || '0';
                                                  const tempo = newParts.join('-');
                                                  patchExerciseInCache(te.id, { tempo });
                                                  scheduleExerciseFieldUpdate(te.id, { tempo });
                                                }}
                                                className="h-8 text-center px-1"
                                              />
                                              <span className="text-[10px] text-muted-foreground text-center block mt-0.5">{label}</span>
                                            </div>
                                          ));
                                        })()}
                                      </div>
                                      <p className="text-[10px] text-muted-foreground">Es: 3-1-2-0 = 3s discesa, 1s pausa, 2s risalita, 0s pausa</p>
                                    </div>

                                    <div className="space-y-1">
                                      <Label className="text-xs">Note e istruzioni</Label>
                                      <Textarea
                                        placeholder="Aggiungi istruzioni specifiche per l'atleta..."
                                        value={te.notes ?? ''}
                                        onChange={(e) => {
                                          const notes = e.target.value || null;
                                          patchExerciseInCache(te.id, { notes });
                                          scheduleExerciseFieldUpdate(te.id, { notes });
                                        }}
                                        className="min-h-[60px] text-sm resize-none"
                                      />
                                    </div>
                                  </CollapsibleContent>
                                </Collapsible>
                                )}

                              </div>
                            </div>
                          </CardContent>
                        </Card>,
                        );
                      }}
                    </Draggable>
                  ))}
                  <DndPlaceholder
                    placeholder={provided.placeholder}
                    isDraggingOver={snapshot.isDraggingOver}
                  />
                </div>
            )}
          </Droppable>
        </DragDropContext>
      )}
    </div>
  );
}

export default TemplateExerciseBuilder;

// =====================================================
// SetsTable: tabella orizzontale per set eterogenei
// =====================================================
interface SetsTableProps {
  te: TemplateExercise;
  onChange: (sets_data: SetItem[]) => void;
}

function SetsTable({ te, onChange }: SetsTableProps) {
  const sets = useMemo<SetItem[]>(
    () =>
      resolveSetsData(te.sets_data, {
        sets: te.sets,
        reps_min: te.reps_min,
        reps_max: te.reps_max,
        rest_seconds: te.rest_seconds,
        prescribed_duration_seconds: te.prescribed_duration_seconds,
      }),
    [te.sets_data, te.sets, te.reps_min, te.reps_max, te.rest_seconds, te.prescribed_duration_seconds],
  );

  const updateSet = (idx: number, patch: Partial<SetItem>) => {
    const next = sets.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    onChange(next);
  };

  const setTargetMode = (idx: number, mode: SetTargetMode) => {
    const current = sets[idx];
    if (!current || getSetTargetMode(current) === mode) return;
    if (mode === 'seconds') {
      updateSet(idx, {
        mode: 'seconds',
        reps: null,
        duration_seconds:
          typeof current.duration_seconds === 'number' && current.duration_seconds > 0
            ? current.duration_seconds
            : 20,
      });
    } else {
      updateSet(idx, {
        mode: 'reps',
        duration_seconds: null,
        reps: typeof current.reps === 'number' && current.reps > 0 ? current.reps : 10,
      });
    }
  };

  const addSet = () => {
    const last = sets[sets.length - 1] ?? DEFAULT_SET;
    onChange([...sets, { ...last }]);
  };

  const removeSet = (idx: number) => {
    if (sets.length <= 1) {
      toast.warning('Deve esserci almeno 1 set');
      return;
    }
    onChange(sets.filter((_, i) => i !== idx));
  };

  const parseNum = (v: string): number | null => {
    if (v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  return (
    <div className="rounded-md border bg-muted/20 p-2">
      <div className="flex items-center mb-2">
        <span className="text-xs font-medium text-muted-foreground">Set</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left font-medium text-muted-foreground pr-2 py-1 sticky left-0 bg-muted/20"></th>
              {sets.map((_, i) => (
                <th key={i} className="px-1 py-1 text-center font-medium text-muted-foreground min-w-[72px]">
                  Set {i + 1}
                </th>
              ))}
              <th className="pl-2 py-1 align-middle">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-[11px]"
                  onClick={addSet}
                >
                  <Plus className="h-3 w-3 mr-0.5" /> Set
                </Button>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="pr-2 py-1 text-muted-foreground sticky left-0 bg-muted/20 align-top pt-2">
                Target
              </td>
              {sets.map((s, i) => {
                const mode = getSetTargetMode(s);
                return (
                  <td key={i} className="px-1 py-1 align-top">
                    <div className="flex flex-col gap-1 items-stretch">
                      <div className="flex rounded border border-border overflow-hidden h-6">
                        <button
                          type="button"
                          className={cn(
                            'flex-1 text-[10px] font-medium transition-colors',
                            mode === 'reps'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-background text-muted-foreground hover:bg-muted',
                          )}
                          onClick={() => setTargetMode(i, 'reps')}
                        >
                          Reps
                        </button>
                        <button
                          type="button"
                          className={cn(
                            'flex-1 text-[10px] font-medium transition-colors border-l border-border',
                            mode === 'seconds'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-background text-muted-foreground hover:bg-muted',
                          )}
                          onClick={() => setTargetMode(i, 'seconds')}
                        >
                          Sec
                        </button>
                      </div>
                      <Input
                        type="number"
                        min="0"
                        value={
                          mode === 'seconds'
                            ? (s.duration_seconds ?? '')
                            : (s.reps ?? '')
                        }
                        onChange={(e) => {
                          const n = parseNum(e.target.value);
                          if (mode === 'seconds') {
                            updateSet(i, { mode: 'seconds', duration_seconds: n, reps: null });
                          } else {
                            updateSet(i, { mode: 'reps', reps: n, duration_seconds: null });
                          }
                        }}
                        className="h-8 text-center px-1"
                        aria-label={mode === 'seconds' ? `Secondi set ${i + 1}` : `Reps set ${i + 1}`}
                      />
                    </div>
                  </td>
                );
              })}
              <td />
            </tr>
            <tr>
              <td className="pr-2 py-1 text-muted-foreground sticky left-0 bg-muted/20 align-top pt-2">
                Carico
              </td>
              {sets.map((s, i) => (
                <td key={i} className="px-1 py-1 align-top">
                  <LoadField
                    compact
                    showLabel={false}
                    value={s}
                    onChange={(load) => updateSet(i, load)}
                  />
                </td>
              ))}
              <td />
            </tr>
            <tr>
              <td className="pr-2 py-1 text-muted-foreground sticky left-0 bg-muted/20">Rec (s)</td>
              {sets.map((s, i) => (
                <td key={i} className="px-1 py-1">
                  <Input
                    type="number"
                    min="0"
                    value={s.rest_seconds ?? ''}
                    onChange={(e) => updateSet(i, { rest_seconds: parseNum(e.target.value) })}
                    className="h-8 text-center px-1"
                  />
                </td>
              ))}
              <td />
            </tr>

            <tr>
              <td className="sticky left-0 bg-muted/20"></td>
              {sets.map((_, i) => (
                <td key={i} className="px-1 py-1 text-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive hover:text-destructive"
                    onClick={() => removeSet(i)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </td>
              ))}
              <td />
            </tr>

          </tbody>
        </table>
      </div>
    </div>
  );
}

// =====================================================
// TOP SET + BACK OFF helpers
// =====================================================
type TSBOSetItem = SetItem & { weight_is_manual?: boolean };

interface TSBOParams {
  top_sets: number | null;
  top_reps: number | null;
  top_rest: number | null;
  top_increase_percent: number | null;
  top_kg: number | null;
  backoff_enabled: boolean;
  backoff_sets: number | null;
  backoff_reps: number | null;
  backoff_percentage: number | null;
  backoff_kg: number | null;
  top_set_data: TSBOSetItem[];
  backoff_data: TSBOSetItem[];
  [k: string]: any;
}

function adjustLength(
  arr: TSBOSetItem[],
  n: number,
  defaults: TSBOSetItem,
): TSBOSetItem[] {
  const safeN = Math.max(0, Math.floor(n));
  if (arr.length === safeN) return arr;
  if (arr.length > safeN) return arr.slice(0, safeN);
  const out = [...arr];
  while (out.length < safeN) out.push({ ...defaults });
  return out;
}

// Arrotondamento per eccesso al mezzo kg superiore
function ceilHalfKg(n: number): number {
  return Math.ceil(n * 2) / 2;
}

function computeTopKg(top_kg: number, increasePct: number | null, index: number): number {
  const pct = typeof increasePct === 'number' ? increasePct : 0;
  return ceilHalfKg(top_kg * (1 + (pct / 100) * index));
}

function computeBackoffKg(backoff_kg: number, reductionPct: number | null, index: number): number {
  const pct = typeof reductionPct === 'number' ? reductionPct : 0;
  return Math.max(0, ceilHalfKg(backoff_kg * (1 - (pct / 100) * index)));
}

// Riempie weight nelle celle non-manuali. Se kg base è null/0-non-valido, lascia invariato.
function applyTopAutoWeights(
  rows: TSBOSetItem[],
  top_kg: number | null,
  increasePct: number | null,
): TSBOSetItem[] {
  if (typeof top_kg !== 'number') return rows;
  return rows.map((s, i) =>
    s.weight_is_manual
      ? s
      : {
          ...s,
          load_mode: 'kg' as const,
          weight: computeTopKg(top_kg, increasePct, i),
          band_color: null,
          other_text: null,
          weight_is_manual: false,
        },
  );
}

function applyBackoffAutoWeights(
  rows: TSBOSetItem[],
  backoff_kg: number | null,
  reductionPct: number | null,
): TSBOSetItem[] {
  if (typeof backoff_kg !== 'number') return rows;
  return rows.map((s, i) =>
    s.weight_is_manual
      ? s
      : {
          ...s,
          load_mode: 'kg' as const,
          weight: computeBackoffKg(backoff_kg, reductionPct, i),
          band_color: null,
          other_text: null,
          weight_is_manual: false,
        },
  );
}

function normalizeTopSetBackoff(raw: any): TSBOParams {
  const r = raw && typeof raw === 'object' ? raw : {};
  const top_sets = typeof r.top_sets === 'number' && r.top_sets > 0 ? r.top_sets : 1;
  const top_reps = typeof r.top_reps === 'number' ? r.top_reps : null;
  const top_rest = typeof r.top_rest === 'number' ? r.top_rest : null;
  const top_kg = typeof r.top_kg === 'number' ? r.top_kg : null;
  const top_increase_percent = typeof r.top_increase_percent === 'number' ? r.top_increase_percent : null;
  const backoff_enabled = r.backoff_enabled !== false;
  const backoff_sets = typeof r.backoff_sets === 'number' && r.backoff_sets > 0 ? r.backoff_sets : (backoff_enabled ? 3 : 0);
  const backoff_reps = typeof r.backoff_reps === 'number' ? r.backoff_reps : null;
  const backoff_kg = typeof r.backoff_kg === 'number' ? r.backoff_kg : null;
  const backoff_percentage = typeof r.backoff_percentage === 'number' ? r.backoff_percentage : null;

  const topDefaults: TSBOSetItem = { reps: top_reps, weight: null, rest_seconds: top_rest, weight_is_manual: false };
  const backoffDefaults: TSBOSetItem = { reps: backoff_reps, weight: null, rest_seconds: top_rest, weight_is_manual: false };

  const top_set_data = adjustLength(
    Array.isArray(r.top_set_data) ? (r.top_set_data as TSBOSetItem[]).map((s) => ({
      reps: s?.reps ?? null,
      weight: s?.weight ?? null,
      rest_seconds: s?.rest_seconds ?? null,
      weight_is_manual: s?.weight_is_manual === true,
    })) : [],
    top_sets,
    topDefaults,
  );

  const backoff_data = adjustLength(
    Array.isArray(r.backoff_data) ? (r.backoff_data as TSBOSetItem[]).map((s) => ({
      reps: s?.reps ?? null,
      weight: s?.weight ?? null,
      rest_seconds: s?.rest_seconds ?? null,
      weight_is_manual: s?.weight_is_manual === true,
    })) : [],
    backoff_enabled ? backoff_sets : 0,
    backoffDefaults,
  );

  return {
    ...r,
    top_sets,
    top_reps,
    top_rest,
    top_increase_percent,
    top_kg,
    backoff_enabled,
    backoff_sets,
    backoff_reps,
    backoff_percentage,
    backoff_kg,
    top_set_data,
    backoff_data,
  };
}

function applyParamSync(
  prev: TSBOParams,
  key: 'top_sets' | 'top_reps' | 'top_rest' | 'top_increase_percent' | 'top_kg' | 'backoff_enabled' | 'backoff_sets' | 'backoff_reps' | 'backoff_percentage' | 'backoff_kg',
  value: number | boolean | null,
): TSBOParams {
  const next: TSBOParams = { ...prev, [key]: value as any };

  if (key === 'top_sets') {
    const n = typeof value === 'number' && value > 0 ? value : 1;
    next.top_set_data = adjustLength(prev.top_set_data, n, {
      reps: prev.top_reps,
      weight: null,
      rest_seconds: prev.top_rest,
      weight_is_manual: false,
    });
    next.top_set_data = applyTopAutoWeights(next.top_set_data, next.top_kg, next.top_increase_percent);
  } else if (key === 'top_reps') {
    next.top_set_data = prev.top_set_data.map((s) => ({ ...s, reps: typeof value === 'number' ? value : null }));
  } else if (key === 'top_rest') {
    next.top_set_data = prev.top_set_data.map((s) => ({ ...s, rest_seconds: typeof value === 'number' ? value : null }));
  } else if (key === 'top_kg' || key === 'top_increase_percent') {
    next.top_set_data = applyTopAutoWeights(prev.top_set_data, next.top_kg, next.top_increase_percent);
  } else if (key === 'backoff_sets') {
    const n = typeof value === 'number' && value > 0 ? value : 0;
    next.backoff_data = adjustLength(prev.backoff_data, n, {
      reps: prev.backoff_reps,
      weight: null,
      rest_seconds: prev.top_rest,
      weight_is_manual: false,
    });
    next.backoff_data = applyBackoffAutoWeights(next.backoff_data, next.backoff_kg, next.backoff_percentage);
  } else if (key === 'backoff_reps') {
    next.backoff_data = prev.backoff_data.map((s) => ({ ...s, reps: typeof value === 'number' ? value : null }));
  } else if (key === 'backoff_kg' || key === 'backoff_percentage') {
    next.backoff_data = applyBackoffAutoWeights(prev.backoff_data, next.backoff_kg, next.backoff_percentage);
  } else if (key === 'backoff_enabled' && value === true && (!prev.backoff_data || prev.backoff_data.length === 0)) {
    const n = prev.backoff_sets ?? 3;
    next.backoff_sets = n;
    next.backoff_data = adjustLength([], n, {
      reps: prev.backoff_reps,
      weight: null,
      rest_seconds: prev.top_rest,
      weight_is_manual: false,
    });
    next.backoff_data = applyBackoffAutoWeights(next.backoff_data, next.backoff_kg, next.backoff_percentage);
  }

  return next;
}

interface TopSetBackoffTableProps {
  title: string;
  sets: SetItem[];
  onCellChange: (idx: number, patch: Partial<SetItem> & { weight_is_manual?: boolean }) => void;
  onAddSet?: () => void;
  onRemoveSet?: (idx: number) => void;
}

function TopSetBackoffTable({ title, sets, onCellChange, onAddSet, onRemoveSet }: TopSetBackoffTableProps) {
  const parseNum = (v: string): number | null => {
    if (v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  if (sets.length === 0) {
    return (
      <div className="rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
        {title}: imposta il numero di serie per generare la tabella.
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-muted/20 p-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left font-medium text-muted-foreground pr-2 py-1 sticky left-0 bg-muted/20"></th>
              {sets.map((_, i) => (
                <th key={i} className="px-1 py-1 text-center font-medium text-muted-foreground min-w-[64px]">
                  Set {i + 1}
                </th>
              ))}
              {onAddSet && (
                <th className="px-1 py-1 text-center align-middle">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-[11px]"
                    onClick={onAddSet}
                    aria-label="Aggiungi set"
                  >
                    <Plus className="h-3 w-3 mr-0.5" /> Set
                  </Button>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="pr-2 py-1 text-muted-foreground sticky left-0 bg-muted/20">Reps</td>
              {sets.map((s, i) => (
                <td key={i} className="px-1 py-1">
                  <Input
                    type="number"
                    min="0"
                    value={s.reps ?? ''}
                    onChange={(e) => onCellChange(i, { reps: parseNum(e.target.value) })}
                    className="h-8 text-center px-1"
                  />
                </td>
              ))}
              {onAddSet && <td />}
            </tr>
            <tr>
              <td className="pr-2 py-1 text-muted-foreground sticky left-0 bg-muted/20 align-top pt-2">
                Carico
              </td>
              {sets.map((s, i) => (
                <td key={i} className="px-1 py-1 align-top">
                  <LoadField
                    compact
                    showLabel={false}
                    value={s}
                    onChange={(load) =>
                      onCellChange(i, {
                        ...load,
                        weight_is_manual: true,
                      })
                    }
                  />
                </td>
              ))}
              {onAddSet && <td />}
            </tr>
            <tr>
              <td className="pr-2 py-1 text-muted-foreground sticky left-0 bg-muted/20">Rec (s)</td>
              {sets.map((s, i) => (
                <td key={i} className="px-1 py-1">
                  <Input
                    type="number"
                    min="0"
                    value={s.rest_seconds ?? ''}
                    onChange={(e) => onCellChange(i, { rest_seconds: parseNum(e.target.value) })}
                    className="h-8 text-center px-1"
                  />
                </td>
              ))}
              {onAddSet && <td />}
            </tr>
            {onRemoveSet && (
              <tr>
                <td className="pr-2 py-1 sticky left-0 bg-muted/20"></td>
                {sets.map((_, i) => (
                  <td key={i} className="px-1 py-1 text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      disabled={sets.length <= 1}
                      onClick={() => onRemoveSet(i)}
                      aria-label={`Elimina Set ${i + 1}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                ))}
                {onAddSet && <td />}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
