

## Piano: attivazione protocollo "Top Set + Back Off"

### Obiettivo
Promuovere `TOP_SET_BACKOFF` da "In arrivo" a **disponibile**: visibile nella tab Protocolli con scheda completa, selezionabile nel builder schede con campi dedicati Top Set / Back Off, parametri salvati con lo schema richiesto. Default resta `SET`. Nessuna modifica DB.

---

### Stato attuale (analisi)
- ✅ `TOP_SET_BACKOFF` è già nel `PROTOCOL_REGISTRY` ma con uno schema parametri non allineato a quello richiesto (oggi: `top_set.{reps,rpe}`, `back_off.{sets,drop_pct}`).
- ✅ Già selezionabile nel dropdown del builder (è in `PROTOCOL_LIST`).
- ✅ Trattato come "set-based" → mostra già `SetsTable` per il dato eseguito.
- ❌ Manca un blocco UI dedicato per i parametri **Top Set / Back Off**.
- ❌ Manca la sezione `sections` nel registry (Coach/Atleta/Sistema/Esempio).
- ❌ Sta in `COMING_SOON_PROTOCOLS` nella tab Protocolli.

Schede esistenti che eventualmente usano già `TOP_SET_BACKOFF` con il vecchio schema sono praticamente inesistenti (era marcato "in arrivo"), ma garantiamo comunque retrocompatibilità tramite default-fallback nel render.

---

### Modifiche

**1. `src/lib/protocols/registry.ts`** — riallineamento TOP_SET_BACKOFF
- Estendere `ProtocolParams` con i nuovi campi piatti:
  ```ts
  top_sets?: number | null;
  top_reps?: number | null;
  top_rest?: number | null;
  backoff_enabled?: boolean | null;
  backoff_sets?: number | null;
  backoff_reps?: number | null;
  backoff_percentage?: number | null;
  ```
  (i vecchi `top_set` / `back_off` restano per non rompere i tipi).
- Aggiornare la entry `TOP_SET_BACKOFF`:
  - `description`: *"Serie principale ad alta intensità seguita da serie di scarico a carico ridotto per completare il lavoro."*
  - `defaultParams`:
    ```ts
    {
      top_sets: 1,
      top_reps: 5,
      top_rest: 120,
      backoff_enabled: true,
      backoff_sets: 3,
      backoff_reps: 8,
      backoff_percentage: 20,
    }
    ```
  - `paramFields`: rimossi quelli vecchi; useremo un blocco UI custom nel builder (vedi punto 3), quindi `paramFields` resta come elenco minimale per fallback documentale (Top Sets, Top Reps, Recupero, Back Off attivo, Back Off Sets, Back Off Reps, % calo).
  - Nuova `sections` (Coach / Atleta / Sistema / Esempio) come da spec.
- Aggiornare `describeExerciseProtocol` e `describeBlockForAthlete` per leggere i nuovi campi (`backoff_sets` invece di `back_off?.sets`), con fallback ai vecchi.

**2. `src/components/pt/ProtocolsTab.tsx`**
- Spostare `'TOP_SET_BACKOFF'` da `COMING_SOON_PROTOCOLS` a `VISIBLE_PROTOCOLS`.
- Nessun'altra modifica: la card sfrutta già `def.sections` (rendering automatico a 4 blocchi) e `def.paramFields` (chip parametri).

**3. `src/components/pt/TemplateExerciseBuilder.tsx`** — blocco UI dedicato Top/Back Off
- Nel render condizionale (riga ~599), per `ptype === 'TOP_SET_BACKOFF'` aggiungere **un blocco "Parametri Top Set + Back Off"** sopra la `SetsTable` (la tabella set resta per il tracciamento esecuzione):
  - Sezione **Top Set**: input `top_sets`, `top_reps`, `top_rest` (recupero in s).
  - Toggle **`backoff_enabled`** (Switch).
  - Sezione **Back Off** (visibile solo se enabled): input `backoff_sets`, `backoff_reps`, `backoff_percentage` (% calo carico).
  - Tutti gli onChange chiamano `updateProtocolParamMutation` con il nuovo `params` (chiavi piatte, niente nested → niente `setNested`).
- `SetsTable` continua a essere mostrata per il tracking effettivo (nessuna regressione).
- Per `SET` e `RAMPING` nessun cambiamento.
- Quando il PT cambia protocollo verso `TOP_SET_BACKOFF`, `updateProtocolMutation` già chiama `getDefaultParamsForProtocol` → riceve i nuovi default automaticamente.

**4. Verifica regressione SET**
- Default `SET` invariato in `addExerciseMutation` (riga 216).
- `paramFields` di SET intatti.
- `SetsTable` intatta.

---

### Schema dati salvato (in `template_exercises.protocol_params`)
```json
{
  "top_sets": 1,
  "top_reps": 5,
  "top_rest": 120,
  "backoff_enabled": true,
  "backoff_sets": 3,
  "backoff_reps": 8,
  "backoff_percentage": 20
}
```
`protocol_type = "TOP_SET_BACKOFF"`. Colonna DB già esistente (jsonb) — nessuna migration.

---

### File modificati

| File | Modifica |
|---|---|
| `src/lib/protocols/registry.ts` | Tipo `ProtocolParams` esteso, entry TOP_SET_BACKOFF riscritta (description, defaults, paramFields, sections), describe* aggiornati |
| `src/components/pt/ProtocolsTab.tsx` | TOP_SET_BACKOFF spostato in `VISIBLE_PROTOCOLS` |
| `src/components/pt/TemplateExerciseBuilder.tsx` | Nuovo blocco UI parametri Top/Back Off (con Switch) per `ptype === 'TOP_SET_BACKOFF'` |

---

### Checklist test
1. `/pt/workouts` → tab **Protocolli** → vedo card **Top Set + Back Off** in "Disponibili" con descrizione, sezioni Coach/Atleta/Sistema, esempio Squat 1×5 @100kg + 3×8 @80kg.
2. In "Prossimamente" restano solo RAMPING, EMOM, AMRAP.
3. Apro una scheda esistente → tab Schede → tutti gli esercizi mostrano protocollo SET e funzionano come prima.
4. Aggiungo un nuovo esercizio → default `SET`, `SetsTable` invariata.
5. Cambio protocollo su un esercizio in "Top Set + Back Off" → compare blocco "Parametri Top Set + Back Off" con default (1×5, recupero 120, Back Off ON, 3×8, -20%) + `SetsTable` per tracking.
6. Modifico `top_reps` a 3 → salvato in `protocol_params.top_reps`.
7. Toggle Back Off off → i 3 input back off scompaiono; `backoff_enabled=false` salvato.
8. Riapro la scheda → stato persistito correttamente.
9. Torno a SET su un altro esercizio → comportamento invariato (SetsTable, niente blocco Top/Back Off).
10. Nessun errore in console; nessuna regressione su template e workout esistenti.

