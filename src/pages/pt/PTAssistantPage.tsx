import { useCallback, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Bot,
  Dumbbell,
  FileText,
  Layers,
  ListOrdered,
  Loader2,
  Save,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { loadPTCatalog } from '@/lib/api/ptCatalog';
import { saveAssistantCreate } from '@/lib/api/ptAssistantCreate';
import type { CreateIntent } from '@/lib/ptAssistantCreateParse';
import type { ProtocolType } from '@/lib/protocols/registry';
import {
  buildPayload,
  defaultExerciseForm,
  defaultProgramForm,
  defaultProtocolForm,
  defaultTemplateForm,
  previewFromExercise,
  previewFromProgram,
  previewFromProtocol,
  previewFromTemplate,
} from '@/lib/ptAssistantForm';
import {
  defaultAssignProgramForm,
  defaultAssignSchedaForm,
  getAssignSchedaDates,
  isAssignProgramReady,
  isAssignSchedaReady,
  previewFromAssignProgram,
  previewFromAssignScheda,
  type AssignIntent,
} from '@/lib/ptAssistantAssignForm';
import type { AssistantIntent } from '@/lib/ptAssistantWizard';
import {
  countOccupiedAssignmentDates,
  loadTemplateExerciseRowIds,
  saveProgramAssignment,
  saveSchedaAssignment,
} from '@/lib/api/ptAssistantSave';
import { SentenceBuilder } from '@/components/pt/SentenceBuilder';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const CREATE_BUTTONS: { intent: CreateIntent; label: string; icon: typeof Dumbbell }[] = [
  { intent: 'template', label: 'Crea scheda', icon: FileText },
  { intent: 'program', label: 'Crea programma', icon: ListOrdered },
  { intent: 'exercise', label: 'Crea esercizio', icon: Dumbbell },
  { intent: 'protocol', label: 'Crea protocollo', icon: Layers },
];

const ASSIGN_BUTTONS: { intent: AssignIntent; label: string; icon: typeof UserPlus }[] = [
  { intent: 'assign-scheda', label: 'Assegna scheda', icon: FileText },
  { intent: 'assign-program', label: 'Assegna programma', icon: ListOrdered },
];

function isCreateIntent(i: AssistantIntent): i is CreateIntent {
  return i !== 'assign-scheda' && i !== 'assign-program';
}

export default function PTAssistantPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const locked = useRef<Set<string>>(new Set());

  const [intent, setIntent] = useState<AssistantIntent | null>(null);
  const [lastSavedLink, setLastSavedLink] = useState<string | null>(null);

  const [exerciseForm, setExerciseForm] = useState(defaultExerciseForm);
  const [templateForm, setTemplateForm] = useState(defaultTemplateForm);
  const [protocolForm, setProtocolForm] = useState(defaultProtocolForm);
  const [programForm, setProgramForm] = useState(defaultProgramForm);
  const [assignSchedaForm, setAssignSchedaForm] = useState(defaultAssignSchedaForm);
  const [assignProgramForm, setAssignProgramForm] = useState(defaultAssignProgramForm);

  const { data: catalog, isLoading: catalogLoading } = useQuery({
    queryKey: ['pt-catalog', user?.id],
    queryFn: () => loadPTCatalog(user!.id),
    enabled: !!user?.id,
  });

  const forms = useMemo(
    () => ({
      exercise: exerciseForm,
      template: templateForm,
      protocol: protocolForm,
      program: programForm,
      assignScheda: assignSchedaForm,
      assignProgram: assignProgramForm,
    }),
    [exerciseForm, templateForm, protocolForm, programForm, assignSchedaForm, assignProgramForm],
  );

  const createPayload = useMemo(
    () => (intent && isCreateIntent(intent) && catalog ? buildPayload(intent, forms, catalog) : null),
    [intent, forms, catalog],
  );

  const assignSchedaDates = useMemo(
    () => (intent === 'assign-scheda' ? getAssignSchedaDates(assignSchedaForm) : []),
    [intent, assignSchedaForm],
  );

  const { data: occupiedCount = 0 } = useQuery({
    queryKey: [
      'assign-occupied',
      user?.id,
      assignSchedaForm.athleteId,
      assignSchedaDates.map((d) => d.toISOString()).join(','),
    ],
    queryFn: () =>
      countOccupiedAssignmentDates({
        ptUserId: user!.id,
        athleteId: assignSchedaForm.athleteId,
        dates: assignSchedaDates,
      }),
    enabled: intent === 'assign-scheda' && !!user?.id && !!assignSchedaForm.athleteId && assignSchedaDates.length > 0,
  });

  const previewFields = useMemo(() => {
    if (!intent || !catalog) return [];
    switch (intent) {
      case 'exercise':
        return previewFromExercise(exerciseForm);
      case 'template':
        return previewFromTemplate(templateForm, catalog);
      case 'protocol':
        return previewFromProtocol(protocolForm, catalog);
      case 'program':
        return previewFromProgram(programForm, catalog);
      case 'assign-scheda':
        return previewFromAssignScheda(assignSchedaForm, catalog, occupiedCount);
      case 'assign-program':
        return previewFromAssignProgram(assignProgramForm, catalog);
    }
  }, [
    intent,
    exerciseForm,
    templateForm,
    protocolForm,
    programForm,
    assignSchedaForm,
    assignProgramForm,
    catalog,
    occupiedCount,
  ]);

  const canSaveCreate = !!createPayload;
  const canSaveAssign =
    intent === 'assign-scheda'
      ? isAssignSchedaReady(assignSchedaForm) && assignSchedaDates.length > 0
      : intent === 'assign-program'
        ? isAssignProgramReady(assignProgramForm)
        : false;

  const resetForms = useCallback(() => {
    locked.current = new Set();
    setExerciseForm(defaultExerciseForm());
    setTemplateForm(defaultTemplateForm());
    setProtocolForm(defaultProtocolForm());
    setProgramForm(defaultProgramForm());
    setAssignSchedaForm(defaultAssignSchedaForm());
    setAssignProgramForm(defaultAssignProgramForm());
    setLastSavedLink(null);
  }, []);

  const selectIntent = (next: AssistantIntent) => {
    if (next === intent) return;
    setIntent(next);
    resetForms();
  };

  const applyField = useCallback((fieldIntent: AssistantIntent, key: string, value: unknown) => {
    locked.current.add(key);
    switch (fieldIntent) {
      case 'exercise':
        setExerciseForm((prev) => ({ ...prev, [key]: value }));
        break;
      case 'template':
        setTemplateForm((prev) => ({ ...prev, [key]: value }));
        break;
      case 'protocol':
        if (key === 'protocolType') {
          setProtocolForm((prev) => ({ ...prev, protocolType: value as ProtocolType }));
        } else {
          setProtocolForm((prev) => ({ ...prev, [key]: value }));
        }
        break;
      case 'program':
        setProgramForm((prev) => ({ ...prev, [key]: value }));
        break;
      case 'assign-scheda':
        setAssignSchedaForm((prev) => ({ ...prev, [key]: value }));
        break;
      case 'assign-program':
        setAssignProgramForm((prev) => {
          const next = { ...prev, [key]: value };
          if (key === 'programId' && catalog && typeof value === 'string') {
            const prog = catalog.programs.find((p) => p.id === value);
            if (prog?.activeDays?.length && !locked.current.has('activeDays')) {
              next.activeDays = [...prog.activeDays];
            }
          }
          return next;
        });
        break;
    }
  }, [catalog]);

  const lock = (key: string) => locked.current.add(key);

  const saveCreateMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !createPayload) throw new Error('Completa i campi obbligatori');
      return saveAssistantCreate(user.id, createPayload);
    },
    onSuccess: (result) => {
      toast.success('Salvato nel catalogo');
      queryClient.invalidateQueries({ queryKey: ['pt-catalog'], refetchType: 'none' });
      void queryClient.refetchQueries({ queryKey: ['pt-catalog'] });
      queryClient.invalidateQueries({ queryKey: ['pt-templates'] });
      queryClient.invalidateQueries({ queryKey: ['pt-programs'] });
      queryClient.invalidateQueries({ queryKey: ['pt-exercises-archive'] });

      if (createPayload?.intent === 'template' && result && 'id' in result) {
        setLastSavedLink(`/pt/templates/${result.id}`);
      } else if (createPayload?.intent === 'protocol' && result && 'templateId' in result) {
        setLastSavedLink(`/pt/templates/${result.templateId}`);
      } else if (createPayload?.intent === 'program') {
        setLastSavedLink('/pt/workouts');
      } else if (createPayload?.intent === 'exercise') {
        setLastSavedLink('/pt/exercises');
      }
    },
    onError: (err: Error) => toast.error(err.message || 'Errore salvataggio'),
  });

  const saveAssignMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !catalog) throw new Error('Completa i campi obbligatori');

      if (intent === 'assign-scheda') {
        const template = catalog.templates.find((t) => t.id === assignSchedaForm.templateId);
        if (!template) throw new Error('Scheda non trovata');
        const dates = getAssignSchedaDates(assignSchedaForm);
        const rowIds = await loadTemplateExerciseRowIds(assignSchedaForm.templateId);
        return saveSchedaAssignment({
          ptUserId: user.id,
          athleteId: assignSchedaForm.athleteId,
          templateId: assignSchedaForm.templateId,
          templateTitle: template.title,
          dates,
          selectedExerciseRowIds: rowIds,
        });
      }

      if (intent === 'assign-program') {
        const start = new Date(`${assignProgramForm.startDate}T00:00:00`);
        return saveProgramAssignment({
          ptUserId: user.id,
          athleteId: assignProgramForm.athleteId,
          programId: assignProgramForm.programId,
          startDate: start,
          activeDays: assignProgramForm.activeDays,
        });
      }

      throw new Error('Intent non valido');
    },
    onSuccess: (result) => {
      if (intent === 'assign-scheda' && result && 'created' in result) {
        const { created, skipped } = result;
        toast.success(
          created > 0
            ? `${created} allenament${created === 1 ? 'o' : 'i'} assegnat${created === 1 ? 'o' : 'i'}${skipped > 0 ? ` (${skipped} date saltate)` : ''}`
            : 'Nessun nuovo allenamento — tutte le date erano già occupate',
        );
        setLastSavedLink('/pt/athletes');
      } else {
        toast.success('Programma assegnato all\'atleta');
        setLastSavedLink('/pt/athletes');
      }
      queryClient.invalidateQueries({ queryKey: ['pt-athlete-workouts'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Errore assegnazione'),
  });

  const isAssign = intent === 'assign-scheda' || intent === 'assign-program';
  const savePending = isAssign ? saveAssignMutation.isPending : saveCreateMutation.isPending;
  const canSave = isAssign ? canSaveAssign : canSaveCreate;

  return (
    <div className="space-y-5 max-w-3xl pb-10">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Bot className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Assistente</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Crea nel catalogo o assegna schede e programmi agli atleti — compila la frase campo per campo.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Crea nel catalogo</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {CREATE_BUTTONS.map(({ intent: i, label, icon: Icon }) => (
            <Button
              key={i}
              type="button"
              variant={intent === i ? 'default' : 'outline'}
              className="h-auto py-3 flex flex-col gap-1.5"
              onClick={() => selectIntent(i)}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{label}</span>
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assegna ad atleta</p>
        <div className="grid grid-cols-2 gap-2">
          {ASSIGN_BUTTONS.map(({ intent: i, label, icon: Icon }) => (
            <Button
              key={i}
              type="button"
              variant={intent === i ? 'default' : 'outline'}
              className="h-auto py-3 flex flex-col gap-1.5"
              onClick={() => selectIntent(i)}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{label}</span>
            </Button>
          ))}
        </div>
      </div>

      {!intent ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground text-sm">
            Scegli un&apos;azione sopra: crea nel catalogo oppure assegna a un atleta collegato.
          </CardContent>
        </Card>
      ) : (
        <>
          <SentenceBuilder
            intent={intent}
            catalog={catalog}
            forms={forms}
            onFieldChange={applyField}
            lock={lock}
          />

          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {isAssign ? 'Anteprima e assegnazione' : 'Anteprima e salvataggio'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-1 rounded-md border bg-background p-3 text-sm">
                {previewFields.map((f) => (
                  <li key={f.key} className="flex gap-2">
                    <span className="text-muted-foreground w-32 shrink-0">{f.label}</span>
                    <span
                      className={cn(
                        'font-medium',
                        f.displayValue === '—' && 'text-muted-foreground italic font-normal',
                      )}
                    >
                      {f.displayValue}
                      {f.required && f.displayValue === '—' && (
                        <span className="text-destructive text-xs ml-1">(obbligatorio)</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>

              <Button
                type="button"
                size="lg"
                disabled={!canSave || savePending || catalogLoading}
                onClick={() => (isAssign ? saveAssignMutation.mutate() : saveCreateMutation.mutate())}
              >
                {savePending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {isAssign ? 'Assegna all\'atleta' : 'Salva nel catalogo'}
              </Button>

              <Button type="button" variant="outline" size="sm" onClick={resetForms}>
                Azzera campi
              </Button>

              {lastSavedLink && (
                <p className="text-sm">
                  <Link to={lastSavedLink} className="text-primary underline">
                    {isAssign ? 'Vai agli atleti →' : 'Apri risorsa creata →'}
                  </Link>
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
