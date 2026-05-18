## Obiettivo

Aggiungere il campo **Kg** ai parametri generali di **Top Set** e **Back Off** nel protocollo già esistente `TOP_SET_BACKOFF`, con auto-compilazione delle tabelle sottostanti tramite formule percentuali (aumento per il Top Set, riduzione per il Back Off), preservando sempre le modifiche manuali del PT sulle celle Kg.

Non viene creato alcun nuovo protocollo. Nessuna modifica a DB, RLS, auth, sidebar, archivio esercizi o altri protocolli (EMOM, AMRAP, SUPERSET, RAMPING, SET, ecc.).

---

## File toccati

1. `src/components/pt/TemplateExerciseBuilder.tsx` — l'intera logica del Top Set + Back Off vive qui (UI parametri, normalize, sync, tabella).
2. `src/lib/protocols/registry.ts` — solo aggiunta di campi opzionali (`top_kg`, `backoff_kg`) al type `ProtocolParams`. Nessuna modifica a `defaultParams` o `paramFields` di `TOP_SET_BACKOFF` (l'editor è custom, non usa `paramFields`).

---

## Modifiche di dettaglio

### 1. Nuovi campi nei parametri principali

Aggiungere due input numerici nella card "Parametri Top Set + Back Off":

- **Top Set → Kg**: `number`, `min=0`, `step=0.5`, può essere vuoto. Salvato come `top_kg: number | null`. La griglia Top Set passa da 4 → 5 colonne: Serie | Reps | Recupero (s) | **Kg** | Aumento %.
- **Back Off → Kg**: `number`, `min=0`, `step=0.5`, può essere vuoto. Salvato come `backoff_kg: number | null`. La griglia Back Off passa da 3 → 4 colonne: Serie | Reps | **Kg** | % riduzione.

### 2. Estensione del tipo `SetItem` interno e `TSBOParams`

In `TemplateExerciseBuilder.tsx`:

- Tipo locale `TSBOSetItem = SetItem & { weight_is_manual?: boolean }` usato solo nelle helper TSBO, senza impattare l'uso di `SetItem` negli altri protocolli (es. SET).
- Aggiungere a `TSBOParams`: `top_kg: number | null`, `backoff_kg: number | null`.

### 3. Calcolo automatico

Helper puro per l'arrotondamento per eccesso a 0.5 kg:

```text
ceilHalfKg(n):
  return Math.ceil(n * 2) / 2
```

Top Set, per ogni indice `i` (0-based):
```text
raw  = top_kg * (1 + (top_increase_percent / 100) * i)
kg_i = ceilHalfKg(raw)
```

Back Off, per ogni indice `i`:
```text
raw  = backoff_kg * (1 - (backoff_percentage / 100) * i)
kg_i = Math.max(0, ceilHalfKg(raw))
```
Limite minimo a 0 se il calcolo scende sotto zero. L'arrotondamento resta sempre per eccesso a 0.5 kg (mai `Math.floor`).

Se `top_kg` (o `backoff_kg`) è `null`, **non sovrascrivere** le celle: la riga Kg resta come da PT (eventualmente vuota).

### 4. Trigger di ricalcolo

In `applyParamSync` aggiungere i casi:

- `top_kg`, `top_increase_percent`, `top_sets` → ricalcolare la colonna Kg di `top_set_data` **solo** sulle celle dove `weight_is_manual !== true`. Se `top_kg` è valorizzato, applicare la formula; se `top_kg` è `null`, lasciare il valore esistente intoccato.
- `backoff_kg`, `backoff_percentage`, `backoff_sets` → stessa logica simmetrica su `backoff_data`.
- Per `top_sets` / `backoff_sets`: nelle nuove celle aggiunte (estensione array) `weight_is_manual` parte a `false` e viene riempito subito dal calcolo se `top_kg`/`backoff_kg` sono presenti.
- Le sync già esistenti per `top_reps`, `top_rest`, `backoff_reps` restano invariate (toccano solo `reps`/`rest_seconds`).

### 5. Modifica manuale dal PT in tabella

In `TopSetBackoffTable`, quando l'utente edita la cella **Kg**:

- l'handler `onCellChange` riceve `{ weight, weight_is_manual: true }`. La cella diventa "manuale" e non viene più sovrascritta dai ricalcoli automatici.
- Reps e Rec (s): non toccano `weight_is_manual` (la regola si applica solo al Kg).

Reset opzionale a "auto": se il PT svuota la cella Kg (input vuoto → `null`), `weight_is_manual = false` (così il prossimo ricalcolo la ripopola). Coerente con "modifica esplicita del PT".

### 6. Normalize idempotente e niente write al mount

- `normalizeTopSetBackoff` aggiorna le strutture in memoria (legge `top_kg`, `backoff_kg`, propaga `weight_is_manual` esistente da `r.top_set_data[i].weight_is_manual` con default `false`).
- Nessuna chiamata di mutation al mount: il commit avviene solo dentro `updateParam` / `updateTopSetCell` / `updateBackoffCell`, come oggi.

### 7. Registry

In `src/lib/protocols/registry.ts`, dentro `ProtocolParams`, aggiungere come campi opzionali:

```ts
top_kg?: number | null;
backoff_kg?: number | null;
```

Niente altro: `defaultParams` e `paramFields` di `TOP_SET_BACKOFF` restano identici (la UI custom non legge `paramFields`).

---

## Esempi di risultato

Top Set: `top_kg=60`, `top_increase_percent=10`, `top_sets=3` →
```text
Set 1: 60   Set 2: 66   Set 3: 72
```
Poi PT scrive 65 in Set 2 → `weight_is_manual=true`. Cambio successivo di `top_increase_percent` aggiorna Set 1 e Set 3, Set 2 resta 65.

Back Off: `backoff_kg=80`, `backoff_percentage=20`, `backoff_sets=3` →
```text
Set 1: 80   Set 2: 64   Set 3: 48
```
Se il calcolo scende sotto 0 → clamp a 0 (sempre via `ceilHalfKg`, mai `Math.floor`).

---

## Cosa NON cambia

- Nessuna migration, RLS, edge function, auth.
- Nessun altro protocollo (SET, RAMPING, EMOM, AMRAP, SUPERSET, LADDER, ecc.).
- Nessuna modifica a `sets_data`, `setsData.ts`, `GuidedWorkoutFlow`, sidebar, archivio esercizi.
- `paramFields` di `TOP_SET_BACKOFF` resta invariato (l'editor è custom).
