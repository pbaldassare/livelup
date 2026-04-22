

## Piano: fix apertura `AtletaExerciseDetailSheet`

### Causa
Lo Sheet non si apre perché `AtletaExerciseDetailSheet` usa `<SheetContent>` **senza** `SheetTitle`. Radix Dialog (su cui si basa lo Sheet shadcn) richiede obbligatoriamente un `DialogTitle` come discendente: in mancanza, lancia un warning bloccante e in alcuni runtime impedisce il mount visibile del contenuto (vedi solo l'overlay nero o nulla).

Stesso problema per la mancanza di `SheetDescription` (warning meno grave ma presente).

Inoltre l'utente potrebbe non aver mai visto la lista cliccabile perché si trova ancora sulla landing `/` e non ha aperto una scheda — quindi parte del feedback "non vedo le ultime modifiche" si risolve navigando in `/app/workout` → aprire una scheda.

---

### Modifiche

**`src/components/app/AtletaExerciseDetailSheet.tsx`**

1. Importare `SheetTitle`, `SheetDescription`, `SheetHeader` da `@/components/ui/sheet`.
2. Sostituire l'`<h2>` plain nell'header con `<SheetTitle>` (mantenendo styling attuale).
3. Aggiungere una `<SheetDescription className="sr-only">` con descrizione breve ("Dettaglio esercizio: nome, istruzioni e set") così Radix è felice senza impatto visivo.
4. Mantenere il bottone back come `<button onClick={() => onOpenChange(false)}>` (funziona già).

Niente altre modifiche — la struttura, i tabs, il media, i set verticali, i bottoni footer restano identici.

---

### File modificati

| File | Modifica |
|---|---|
| `src/components/app/AtletaExerciseDetailSheet.tsx` | Aggiunto `SheetTitle` (a11y obbligatorio Radix) + `SheetDescription` sr-only |

---

### Checklist test
1. `/app/workout/:id` → click su un esercizio nella lista → lo Sheet si apre correttamente dal basso a 92dvh.
2. Titolo esercizio visibile in header (stesso stile di prima).
3. Nessun warning Radix in console su `DialogTitle`/`DialogDescription`.
4. Tutti i contenuti (media, durata/reps, istruzioni, muscoli, set verticali, footer azioni) renderizzati come previsto.
5. Tasto back e overlay chiudono correttamente lo Sheet.
6. Nessuna regressione su lista, stati esercizio, "Inizia esercizio", "Segna come completato".

