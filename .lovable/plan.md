

## Piano: builder scheda con esercizi liberi + circuiti opzionali

### Obiettivo
Allineare completamente il builder PT alla nuova logica: esercizi liberi (fuori circuito) come default, circuiti come raggruppamenti opzionali, protocollo SET configurabile per esercizio con set orizzontali. Tutto già supportato lato dati (migration `protocol_type`/`protocol_params` + `block_id` nullable già applicata) — questo step rifinisce UI/UX e validazioni.

---

### Stato attuale (cosa già esiste)
- ✅ DB: colonne `protocol_type`, `protocol_params` su `template_exercises` e `workout_exercises`; `block_id` nullable.
- ✅ `TemplateBlockBuilder.tsx`: ha la sezione "Esercizi singoli" e i circuiti.
- ✅ `TemplateExerciseBuilder.tsx`: dropdown protocollo + tabella set orizzontale (`SetsTable`).
- ✅ Step iniziale "Crea Scheda" (titolo, gruppi muscolari, difficoltà) già presente nel dialog di creazione.
- ⚠️ Mancano: validazioni visive, polish UX, drag&drop cross-circuito robusto, etichette ancora residue "Blocco", warning su scheda vuota.

---

### Modifiche

**1. `src/components/pt/TemplateBlockBuilder.tsx`** — polish UX e validazioni
- Sostituire ogni residuo "Blocco" → "Circuito" nelle label/empty state/conferme.
- Sezione "Esercizi liberi" sempre in cima con header chiaro: "Esercizi della scheda" + sottotitolo "Esercizi non raggruppati in un circuito".
- Pulsanti top-bar coerenti: `[+ Aggiungi esercizio]` (azione primaria) e `[+ Aggiungi circuito]` (azione secondaria outline).
- Empty state globale: se la scheda non ha né esercizi liberi né circuiti, mostrare card centrale con illustrazione + CTA "Aggiungi il primo esercizio".
- Badge warning su circuiti vuoti (già parziale): rendere giallo con icona `AlertTriangle` + tooltip "Aggiungi almeno un esercizio o elimina il circuito".
- Drag&drop cross-droppable: ogni circuito + la sezione "Liberi" sono droppable distinti; al drop aggiorna `block_id` (UUID o `null`) e ricalcola `order_index` per la destinazione.
- Menu "Sposta in…" su ogni esercizio (fallback senza drag): voci = "Esercizi liberi" + lista circuiti, selezione aggiorna `block_id`.

**2. `src/components/pt/TemplateExerciseBuilder.tsx`** — rifinitura SET
- Per `protocol_type='SET'` mostrare sempre la `SetsTable` orizzontale (intestazioni `Set 1 | Set 2 | …`, righe Reps / Kg / Rec).
- Pulsanti tabella: `+ Aggiungi set` (duplica ultimo), `🗑` per riga set, edit inline numerico.
- Warning inline rosso "Imposta almeno 1 set" se `sets_data` vuoto e nessun fallback dai campi legacy.
- Mantenere render condizionale per protocolli avanzati (EMOM/AMRAP) — invariato.

**3. `src/pages/pt/PTTemplateDetailPage.tsx`** — validazioni a livello scheda
- Banner in alto se la scheda non contiene esercizi: "Questa scheda è vuota. Aggiungi almeno un esercizio per poterla assegnare."
- Conteggio chiaro nel sidebar: "Esercizi (X)" dove X è il totale (liberi + dentro circuiti). Sotto: "di cui in circuiti: Y".
- Disabilitare il pulsante "Assegna ad atleta" finché la scheda è vuota (con tooltip esplicativo).

**4. `src/components/pt/AssignWorkoutDialog.tsx`** (verifica già fatta) — assicurarsi che `protocol_type`, `protocol_params`, `sets_data`, `block_id` vengano copiati 1:1 da `template_exercises` a `workout_exercises` durante l'assegnazione. Patch solo se manca un campo.

---

### Struttura UI finale

```text
┌─ Builder scheda ──────────────────────────────────────┐
│  [+ Aggiungi esercizio]   [+ Aggiungi circuito]       │
│                                                       │
│  ▸ Esercizi della scheda                              │
│  ┌─ Panca Piana       [SET ▾]  [⋯ Sposta] [🗑]      │
│  │  ┌────────┬────────┬────────┐  [+ Set]          │
│  │  │ Set 1  │ Set 2  │ Set 3  │                   │
│  │  │ R: 10  │ R: 8   │ R: 6   │                   │
│  │  │ Kg:60  │ Kg:70  │ Kg:80  │                   │
│  │  │ Rec:90 │ Rec:120│ Rec:120│                   │
│  │  └────────┴────────┴────────┘                   │
│  └────────────────────────────────────────────────   │
│                                                       │
│  ▸ Circuito A — "Finisher"  [✎] [🗑]  ⚠ se vuoto   │
│  ┌─ Plank   [SET ▾] 3×60s ……                       │
│  └─ Crunch  [SET ▾] 3×15  ……                       │
│  [+ Aggiungi esercizio al circuito]                  │
└──────────────────────────────────────────────────────┘
```

---

### Validazioni
| Caso | Tipo | Messaggio |
|---|---|---|
| Scheda con 0 esercizi | Errore (blocca assegnazione) | "Aggiungi almeno un esercizio per assegnare la scheda" |
| Esercizio SET con 0 set | Warning inline | "Imposta almeno 1 set" |
| Circuito vuoto | Warning badge | "Circuito vuoto — aggiungi un esercizio o eliminalo" |
| Esercizio fuori circuito | OK (default) | nessun avviso |

---

### Compatibilità retro
- Nessuna nuova migration: usiamo schema già esistente.
- Schede vecchie con `block_id` valorizzato → continuano a vedersi come "in circuito".
- Schede vecchie con esercizi `block_id=null` → appaiono nella sezione "Esercizi della scheda".
- Esercizi senza `sets_data` → `SetsTable` deriva i set dai campi legacy (`sets`, `reps_min`, `weight_kg`, `rest_seconds`).

---

### File modificati
- `src/components/pt/TemplateBlockBuilder.tsx` — polish UX, label "Circuito", drag&drop cross, menu Sposta, empty state
- `src/components/pt/TemplateExerciseBuilder.tsx` — warning set vuoti, micro-rifiniture SetsTable
- `src/pages/pt/PTTemplateDetailPage.tsx` — banner scheda vuota, contatori, gating assegnazione
- `src/components/pt/AssignWorkoutDialog.tsx` — verifica copia integrale `protocol_*` + `sets_data` + `block_id`

---

### Checklist test
1. Apro scheda nuova → vedo empty state + due CTA
2. Click "Aggiungi esercizio" → finisce in "Esercizi della scheda", protocollo SET, tabella con 3 set default
3. Modifico Set 1 reps/kg/rec → salvati indipendenti dagli altri
4. Click "+ Set" → si aggiunge Set 4 duplicando Set 3
5. Elimino Set 2 → restano 3 set rinumerati
6. Click "Aggiungi circuito" → appare card vuota con badge warning "Vuoto"
7. Trascino esercizio dentro circuito → `block_id` aggiornato, warning sparisce
8. Uso menu "Sposta in… → Esercizi liberi" → torna fuori circuito
9. Elimino circuito non vuoto → conferma + esercizi tornano liberi (non cancellati)
10. Apro scheda vecchia → tutto si vede correttamente, niente regressioni
11. Tento di assegnare scheda vuota → bottone disabilitato + tooltip
12. Assegno scheda nuova ad atleta → workout creato con `protocol_type`, `protocol_params`, `sets_data`, `block_id` integrali

