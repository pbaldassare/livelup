# Ramping — campo "Valore" + note visibili lato atleta

Modifiche limitate al protocollo `RAMPING`. Nessun cambio a DB / RLS / auth / sidebar / migration / `workout_logs` / `weight_used`. La voce **Valore è puramente cosmetica**: cambia SOLO la label mostrata a PT e atleta. Il valore inserito dall'atleta continua a salvarsi nel campo esistente (`weight_used`), indipendentemente da `value_type`.

## 1. Nuovi parametri nel registry

File: `src/lib/protocols/registry.ts`, blocco `RAMPING`.

Estendere `defaultParams` e `paramFields` (la generic form supporta già `select` + `showWhen`):

```
defaultParams: {
  reps: 5, rest_seconds: 120, note: '',
  value_type: 'kg',
  custom_value_label: null,
}

paramFields: [
  ...campi esistenti,
  {
    key: 'value_type',
    label: 'Valore',
    type: 'select',
    options: [
      { value: 'kg',     label: 'Kg' },
      { value: 'time',   label: 'Tempo' },
      { value: 'km',     label: 'Km' },
      { value: 'custom', label: 'Altro' },
    ],
    placeholder: 'Kg',
  },
  {
    key: 'custom_value_label',
    label: 'Specifica valore',
    type: 'text',
    placeholder: 'Es: Watt, BPM, Calorie, Zone, RPM…',
    showWhen: (p) => p?.value_type === 'custom',
    hint: 'Unità personalizzata visibile all\'atleta',
  },
]
```

`showWhen` già supportato in `TemplateExerciseBuilder.tsx` (riga 834): "Specifica valore" appare solo se `value_type === 'custom'`. Nessun cambio strutturale al builder PT.

## 2. Helper unico per la label

Esportato da `src/lib/protocols/registry.ts`:

```
export function resolveRampingUnit(params: any): string {
  const t = params?.value_type ?? 'kg';
  if (t === 'kg')   return 'Kg';
  if (t === 'time') return 'Tempo';
  if (t === 'km')   return 'Km';
  if (t === 'custom') {
    const label = (params?.custom_value_label ?? '').trim();
    return label || 'Valore';
  }
  return 'Kg';
}
```

Fallback: `value_type` mancante → `Kg`. `custom` senza label → `Valore`.

## 3. Salvataggio coerente in `protocol_params`

Stesso `updateProtocolParamMutation`. Aggiungere una sola normalizzazione **al salvataggio** dentro la generic form, limitata a Ramping:

- `value_type !== 'custom'` → `custom_value_label = null`.
- `value_type === 'custom'` → testo PT preservato.

Punto: `TemplateExerciseBuilder.tsx`, dentro `onValueChange` del `select` (~riga 870) e `onChange` del `text` (~riga 914), solo se `te.protocol_type === 'RAMPING'` e `f.key ∈ {value_type, custom_value_label}`. Nessun impatto sugli altri protocolli. Nessuna scrittura automatica al mount.

## 4. Rendering lato PT — pill "Unità atleta"

Ramping in PT non ha una `SetsTable` propria (cade nella generic param form). Per dare riscontro visivo:

- Pill compatta `Unità atleta: <resolveRampingUnit(params)>` accanto / sotto al banner-nota Ramping già presente (`TemplateExerciseBuilder.tsx` ~riga 932).
- Aggiornata reattivamente al cambio del select / del campo Altro.

Nessuna riga / colonna fissa "Kg" da modificare in PT per Ramping.

## 5. Note visibili anche lato atleta (Ramping)

Le note Ramping vivono in `protocol_params.note` (campo `note` della registry), NON in `te.notes`. L'atleta oggi non le vede.

Render condizionato su `protocol_type === 'RAMPING'` + `protocol_params.note` non vuoto, sotto il nome esercizio e prima della tabella / stats:

- `src/components/app/GuidedWorkoutFlow.tsx` — schermata `ready` (~riga 494): card note tra `<h2>` nome esercizio e griglia `Target / Peso / Recupero` (~riga 501).
- `src/components/app/AtletaExerciseDetailSheet.tsx` — sezione tab principale: card analoga prima della tabella set. Le `te.notes` generiche restano gestite come ora (riga ~360) per gli altri protocolli.

UI:

- `rounded-xl border border-app-border bg-app-card/60 px-4 py-3`
- Label `Note del coach` `text-xs text-app-muted-foreground`
- Testo `text-sm text-app-foreground whitespace-pre-line`
- Note vuota → nessun render.

Nessun cambio per gli altri protocolli.

## 6. Label "Peso (kg)" durante l'esecuzione — solo cosmetica

In `GuidedWorkoutFlow` lo step `input` (~riga 567) ha `label="Peso (kg)"`. Solo per Ramping sostituirla con `resolveRampingUnit(currentExercise.protocol_params)`.

**Importante:**

- Lo state `weight` interno resta `weight`.
- Il salvataggio continua a scrivere `weight_used` su `workout_logs` (riga ~251), identico a oggi.
- Anche con `value_type ∈ {time, km, custom}` il valore inserito dall'atleta finisce in `weight_used`. Nessun nuovo campo DB, nessun ramo logico nuovo nel save.
- È puramente un cambio di etichetta UI.

Stessa cosa per la pill `Peso` nello step `ready` (~riga 507): solo label, valore numerico = `prescribed_weight` come ora.

## 7. Compatibilità retroattiva

- Ramping esistenti senza `value_type` → `resolveRampingUnit` ritorna `Kg`.
- `custom_value_label` mancante → `null`, render fallback "Valore".
- Nessuna mutazione automatica al mount: il save parte solo dopo che il PT cambia esplicitamente uno dei due campi.
- Log storici e log nuovi restano omogenei in `weight_used`.

## File toccati

- `src/lib/protocols/registry.ts` — nuovi `paramFields` + helper `resolveRampingUnit`.
- `src/components/pt/TemplateExerciseBuilder.tsx` — normalizzazione `custom_value_label` al save Ramping; pill `Unità atleta: …` accanto al banner Ramping.
- `src/components/app/GuidedWorkoutFlow.tsx` — card note Ramping nello step `ready`; label dinamica unità nello step `input` (e label pill Peso nello step ready).
- `src/components/app/AtletaExerciseDetailSheet.tsx` — card note Ramping prima della tabella set.

## File / aree NON toccate

`setsData.ts`, altri protocolli (SET, TOP_SET_BACKOFF, EMOM, AMRAP, …), esecuzione di altri protocolli, schema `workout_logs`, campo `weight_used`, logica di salvataggio log, DB, migration, RLS, auth, sidebar.
