## Obiettivo

Mostrare all'atleta una vista chiara dell'EMOM a blocchi nel `AtletaExerciseDetailSheet`, mantenendo intatto il rendering degli EMOM legacy (senza blocchi).

## Output desiderato

Nel pannello dettaglio esercizio dell'atleta, quando il protocollo è EMOM **con blocchi**, viene mostrato un riquadro nuovo:

```text
[icona timer]  EMOM 9 Round da 50"

Blocco 1
 • Squat 5 ripetizioni
 • Trazioni 5 ripetizioni

Blocco 2
 • Dip 5 ripetizioni
 • Affondi 5 ripetizioni

Blocco 3
 • Plank 1 minuto

Alterni i blocchi ad ogni suono del timer
```

Nessun dato tecnico (no ladder, no mode, no struttura interna).

## Modifiche

### 1. Nuovo componente `src/components/app/AtletaEmomSummary.tsx`

- Riceve `params` (i `protocol_params` dell'esercizio) e un opzionale `fallbackName` (nome esercizio del template, usato se un esercizio del blocco non ha nome).
- Se `params.blocks` non esiste o è vuoto → ritorna `null` (EMOM legacy: la UI esistente resta com'è, nessuna rottura).
- Altrimenti normalizza con `normalizeEmomParams` (helper già esistente in `src/lib/protocols/emom.ts`).
- Renderizza:
  - Titolo: `EMOM {rounds} Round da {durata}` — durata formattata: secondi (`50"`) se < 1 min, minuti (`1'`, `1'30"`) altrimenti.
  - Lista blocchi (`Blocco 1`, `Blocco 2`, … usando `block.label` se presente).
  - Per ogni esercizio: `• {nome} {valore}` con valore = `N ripetizioni` oppure `N secondi` / `N minuti` (se multiplo di 60).
  - Riga finale corsivo: `Alterni i blocchi ad ogni suono del timer`.
- Stile coerente col tema dark atleta: `bg-app-card/60`, `border-app-border/70`, accenti `text-app-accent` (lime).

### 2. `src/components/app/AtletaExerciseDetailSheet.tsx`

- Importare `AtletaEmomSummary`.
- Inserirlo nel tab "Animazione", subito sotto il box "Duration OR Reps" (riga ~244), passando `params={exercise.protocol_params}` e `fallbackName={ex.name}`.
- Nessuna modifica alla logica esistente: il box reps/durata resta invariato perché serve agli altri protocolli ed agli EMOM legacy.

## Compatibilità

- EMOM **con** blocchi (creati con il nuovo editor): vedono il nuovo riquadro riassuntivo + il box reps standard sopra (mostra il valore prescritto del template, accettabile e non confonde).
- EMOM **senza** blocchi (legacy): `AtletaEmomSummary` ritorna `null`, l'UI resta identica a prima.
- Tutti gli altri protocolli: nessun impatto (il componente è usato solo passando params EMOM e ritorna null se non rileva blocchi).

## Cosa NON viene toccato

- Logica esecuzione workout, timer, set tracker, mark-completed.
- Editor PT EMOM e struttura `protocol_params`.
- Altri protocolli (SET, AMRAP, ecc.).
- Database, RLS, edge functions.
