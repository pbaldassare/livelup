import { useMemo, useState } from 'react';
import { Plus, Sparkles, X } from 'lucide-react';
import type { AssistantIntent } from '@/lib/ptAssistantWizard';
import type { PTCatalog } from '@/lib/api/ptCatalog';
import {
  getSentenceParts,
  getStepByKey,
  wizardGetValue,
  type SentencePart,
  type WizardForms,
  type WizardStep,
} from '@/lib/ptAssistantWizard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Toggle } from '@/components/ui/toggle';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const WEEKDAYS = [
  { iso: 1, label: 'Lun' }, { iso: 2, label: 'Mar' }, { iso: 3, label: 'Mer' },
  { iso: 4, label: 'Gio' }, { iso: 5, label: 'Ven' }, { iso: 6, label: 'Sab' }, { iso: 7, label: 'Dom' },
];

const inlineInput =
  'inline-flex h-8 min-w-[7rem] max-w-[14rem] border-b-2 border-primary/50 bg-primary/5 px-2 rounded-t-sm text-sm font-semibold focus-visible:outline-none focus-visible:border-primary';
const inlineNumber =
  'inline-flex h-8 w-[4.5rem] border-b-2 border-primary/50 bg-primary/5 px-2 rounded-t-sm text-sm font-semibold text-center focus-visible:outline-none focus-visible:border-primary';
const inlineSelect =
  'inline-flex h-8 min-w-[8rem] max-w-[12rem] border-b-2 border-primary/50 bg-primary/5 px-1 rounded-t-sm text-sm font-medium';

type Props = {
  intent: AssistantIntent;
  catalog?: PTCatalog;
  forms: WizardForms;
  onFieldChange: (intent: AssistantIntent, key: string, value: unknown) => void;
  lock: (key: string) => void;
};

export function SentenceBuilder({ intent, catalog, forms, onFieldChange, lock }: Props) {
  const parts = useMemo(() => getSentenceParts(intent, catalog), [intent, catalog]);
  const [pickTemplate, setPickTemplate] = useState('');

  const apply = (key: string, value: unknown) => {
    lock(key);
    onFieldChange(intent, key, value);
  };

  // Raggruppa in righe: break = nuova riga; block field = va a capo
  const rows = useMemo(() => {
    const result: { inline: SentencePart[]; block?: { step: WizardStep } }[] = [];
    let current: SentencePart[] = [];

    for (const part of parts) {
      if (part.kind === 'break') {
        if (current.length) result.push({ inline: current });
        current = [];
        continue;
      }
      if (part.kind === 'field' && part.layout === 'block') {
        if (current.length) result.push({ inline: current });
        current = [];
        const step = getStepByKey(intent, part.key, catalog);
        if (step) result.push({ inline: [], block: { step } });
        continue;
      }
      current.push(part);
    }
    if (current.length) result.push({ inline: current });
    return result;
  }, [parts, intent, catalog]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Compila la frase
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((row, i) => (
          <div key={(row.block?.step.key ?? row.inline.map((p) => (p.kind === 'field' ? p.key : p.kind === 'text' ? p.value.slice(0, 12) : 't')).join('-')) || `row-${i}`}>
            {row.inline.length > 0 && (
              <p className="text-base leading-[2.4] text-foreground flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
                {row.inline.map((part, j) => {
                  if (part.kind === 'text') {
                    return (
                      <span key={j} className="text-muted-foreground whitespace-pre">
                        {part.value}
                      </span>
                    );
                  }
                  const step = getStepByKey(intent, part.key, catalog);
                  if (!step) return null;
                  return (
                    <InlineField
                      key={part.key}
                      intent={intent}
                      step={step}
                      catalog={catalog}
                      forms={forms}
                      apply={apply}
                      pickTemplate={pickTemplate}
                      setPickTemplate={setPickTemplate}
                    />
                  );
                })}
              </p>
            )}
            {row.block && (
              <div key={row.block.step.key} className="mt-1.5 pl-0">
                <BlockField
                  intent={intent}
                  step={row.block.step}
                  catalog={catalog}
                  forms={forms}
                  apply={apply}
                  pickTemplate={pickTemplate}
                  setPickTemplate={setPickTemplate}
                />
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function InlineField({
  intent, step, catalog, forms, apply, pickTemplate, setPickTemplate,
}: {
  intent: AssistantIntent;
  step: WizardStep;
  catalog?: PTCatalog;
  forms: WizardForms;
  apply: (key: string, value: unknown) => void;
  pickTemplate: string;
  setPickTemplate: (v: string) => void;
}) {
  const value = wizardGetValue(intent, step.key, forms);

  if (step.type === 'text') {
    return (
      <Input
        className={cn(inlineInput, step.required && !(value as string)?.trim() && 'border-destructive/60')}
        value={(value as string) ?? ''}
        onChange={(e) => apply(step.key, e.target.value)}
        placeholder={step.label}
      />
    );
  }

  if (step.type === 'number') {
    return (
      <input
        type="number"
        className={inlineNumber}
        value={value as number}
        onChange={(e) => apply(step.key, parseInt(e.target.value, 10) || 0)}
        aria-label={step.label}
      />
    );
  }

  if (step.type === 'date') {
    return (
      <input
        type="date"
        className={inlineInput}
        value={(value as string) ?? ''}
        onChange={(e) => apply(step.key, e.target.value)}
        aria-label={step.label}
      />
    );
  }

  if (step.type === 'select') {
    const strVal = (value as string) || '';
    const selectValue = step.key === 'difficultyLevel' ? (strVal || 'nessuno') : (strVal || undefined);
    return (
      <Select value={selectValue} onValueChange={(v) => apply(step.key, v)}>
        <SelectTrigger className={inlineSelect}>
          <SelectValue placeholder={step.label} />
        </SelectTrigger>
        <SelectContent>
          {(step.options ?? []).map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (step.type === 'multiselect' || step.type === 'catalog-multiselect') {
    return (
      <BlockField
        intent={intent}
        step={step}
        catalog={catalog}
        forms={forms}
        apply={apply}
        pickTemplate={pickTemplate}
        setPickTemplate={setPickTemplate}
        inline
      />
    );
  }

  if (step.type === 'weekdays') {
    return (
      <BlockField intent={intent} step={step} catalog={catalog} forms={forms} apply={apply} pickTemplate={pickTemplate} setPickTemplate={setPickTemplate} inline />
    );
  }

  return null;
}

function BlockField({
  intent, step, catalog, forms, apply, pickTemplate, setPickTemplate, inline = false,
}: {
  intent: AssistantIntent;
  step: WizardStep;
  catalog?: PTCatalog;
  forms: WizardForms;
  apply: (key: string, value: unknown) => void;
  pickTemplate: string;
  setPickTemplate: (v: string) => void;
  inline?: boolean;
}) {
  const value = wizardGetValue(intent, step.key, forms);
  const wrap = inline ? 'inline-flex flex-wrap gap-1 align-middle' : 'flex flex-wrap gap-1.5';

  if (step.type === 'textarea') {
    return (
      <Textarea
        rows={2}
        className="resize-none text-sm mt-1 w-full"
        value={(value as string) ?? ''}
        onChange={(e) => apply(step.key, e.target.value)}
        placeholder={step.hint ?? step.label}
      />
    );
  }

  if (step.type === 'text') {
    return (
      <Input
        className={inline ? inlineInput : 'text-sm max-w-md'}
        value={(value as string) ?? ''}
        onChange={(e) => apply(step.key, e.target.value)}
        placeholder={step.hint ?? step.label}
      />
    );
  }

  if (step.type === 'multiselect') {
    const selected = (value as string[]) ?? [];
    return (
      <div className={wrap}>
        {(step.options ?? []).map((o) => (
          <Badge
            key={o.value}
            variant={selected.includes(o.value) ? 'default' : 'outline'}
            className="cursor-pointer text-xs"
            onClick={() => {
              apply(
                step.key,
                selected.includes(o.value)
                  ? selected.filter((x) => x !== o.value)
                  : [...selected, o.value],
              );
            }}
          >
            {o.label}
          </Badge>
        ))}
      </div>
    );
  }

  if (step.type === 'catalog-multiselect' && catalog) {
    const selected = (value as string[]) ?? [];
    return (
      <div className={cn(wrap, !inline && 'max-h-36 overflow-y-auto')}>
        {catalog.exercises.map((e) => (
          <Badge
            key={e.id}
            variant={selected.includes(e.id) ? 'default' : 'outline'}
            className="cursor-pointer text-xs"
            onClick={() => {
              apply(
                step.key,
                selected.includes(e.id)
                  ? selected.filter((x) => x !== e.id)
                  : [...selected, e.id],
              );
            }}
          >
            {e.name}
          </Badge>
        ))}
      </div>
    );
  }

  if (step.type === 'weekdays') {
    const active = (value as number[]) ?? [];
    return (
      <div className={wrap}>
        {WEEKDAYS.map(({ iso, label }) => (
          <Toggle
            key={iso}
            pressed={active.includes(iso)}
            onPressedChange={() => {
              apply(
                step.key,
                active.includes(iso)
                  ? active.filter((d) => d !== iso)
                  : [...active, iso].sort(),
              );
            }}
            size="sm"
            className="px-2.5 h-7 text-xs"
          >
            {label}
          </Toggle>
        ))}
      </div>
    );
  }

  if (step.type === 'template-sequence' && catalog) {
    const ids = (value as string[]) ?? [];
    return (
      <div className="space-y-2 w-full">
        <div className="flex gap-2 max-w-md">
          <Select value={pickTemplate || undefined} onValueChange={setPickTemplate}>
            <SelectTrigger className="flex-1 h-8 text-sm"><SelectValue placeholder="Aggiungi scheda…" /></SelectTrigger>
            <SelectContent>
              {catalog.templates.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            disabled={!pickTemplate}
            onClick={() => {
              if (!pickTemplate || ids.includes(pickTemplate)) return;
              apply(step.key, [...ids, pickTemplate]);
              setPickTemplate('');
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {ids.length > 0 && (
          <p className="text-sm font-medium">
            {ids.map((id, i) => catalog.templates.find((t) => t.id === id)?.title).filter(Boolean).join(' → ')}
          </p>
        )}
        {ids.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {ids.map((id, i) => (
              <Badge key={`${id}-${i}`} variant="secondary" className="gap-1 text-xs">
                {catalog.templates.find((t) => t.id === id)?.title}
                <button type="button" onClick={() => apply(step.key, ids.filter((_, j) => j !== i))}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
}
