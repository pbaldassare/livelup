

## Piano: nuova tab "Protocolli" in `/pt/workouts`

### Obiettivo
Aggiungere una **tab informativa "Protocolli"** nella pagina Allenamenti del PT. Per ora visibile solo **SET**, in sola lettura (no modifica/duplica/elimina). Serve a far capire al PT come funzionano i protocolli; gli altri (TOP_SET_BACKOFF, RAMPING, EMOM, AMRAP) restano già definiti in `PROTOCOL_REGISTRY` per uso futuro ma non vengono mostrati.

---

### Stato attuale (riuso massimo, nessuna nuova tabella)
- ✅ `src/lib/protocols/registry.ts` — registry completo con `SET`, label, descrizione, icona (`Layers`), parametri.
- ✅ `src/components/protocols/ProtocolInfoPopover.tsx` — popover ⓘ già pronto (attualmente skippa `SET`; lo riadatteremo con un flag opzionale per forzare la visualizzazione nella nuova tab).
- ✅ Builder usa già `protocol_type` per esercizio. Default a `SET` confermato in `getDefaultParamsForProtocol('SET')`.
- ✅ Colonna DB `protocol_type` già presente su `template_exercises` e `workout_exercises` (migration esistente).

---

### Modifiche

**1. Nuovo file `src/components/pt/ProtocolsTab.tsx`**
Componente tab read-only che mostra le card dei protocolli **visibili**. Mostra solo `SET` per ora.

Layout:
- Banner informativo in alto (sfumato, tono educativo): *"I protocolli definiscono come si esegue ogni esercizio. Per ora è disponibile **SET** (default). Nuovi protocolli saranno aggiunti prossimamente."*
- Sezione "Disponibili": griglia card con SET.
- Sezione "Prossimamente": griglia card disabilitate (opacità 60%, badge "In arrivo") per `TOP_SET_BACKOFF`, `RAMPING`, `EMOM`, `AMRAP` — solo visualizzazione, non cliccabili. Questo prepara visualmente l'utente al roadmap senza implementarli.

Per ogni card:
- Icona protocollo (`def.icon`).
- Nome tecnico (`def.label`) + sotto-titolo con `def.athleteLabel`.
- Descrizione completa (`def.description`).
- Lista parametri gestiti (estratta da `def.paramFields`: Serie, Ripetizioni, Tempo, Carico, Recupero per SET).
- Footer: badge "Default" su SET; badge "In arrivo" sui futuri.
- Nessun bottone Modifica/Duplica/Elimina.

Sorgente dati: `PROTOCOL_REGISTRY` da `src/lib/protocols/registry.ts`. Lista visibile gestita con costante locale:
```ts
const VISIBLE_PROTOCOLS: ProtocolType[] = ['SET'];
const COMING_SOON_PROTOCOLS: ProtocolType[] = ['TOP_SET_BACKOFF', 'RAMPING', 'EMOM', 'AMRAP'];
```
Quando si vorrà attivare un nuovo protocollo, basterà spostarlo in `VISIBLE_PROTOCOLS`.

**2. `src/components/protocols/ProtocolInfoPopover.tsx`**
- Aggiungere prop opzionale `forceShow?: boolean` (default `false`) per consentire la visualizzazione anche per `SET` quando esplicitamente richiesto (utile dentro la nuova tab). Il comportamento attuale (skip `SET` di default) resta invariato per non alterare il builder.

**3. `src/pages/pt/PTWorkoutsPage.tsx`**
- Aggiungere import `ProtocolsTab` e icona `Sliders` (o `Layers`) da `lucide-react`.
- Aggiungere quarta TabsTrigger **dopo "Esercizi"**:
  ```tsx
  <TabsTrigger value="protocols" className="gap-2">
    <Sliders className="h-4 w-4" />
    Protocolli
  </TabsTrigger>
  ```
- Aggiungere `<TabsContent value="protocols" className="mt-4"><ProtocolsTab /></TabsContent>`.
- Nessuna query aggiuntiva (componente puramente statico basato sul registry).

**4. Verifica coerenza default `SET` nel builder**
Controllare in `TemplateExerciseBuilder.tsx` che ogni nuovo esercizio aggiunto a un template abbia `protocol_type = 'SET'` e `protocol_params = getDefaultParamsForProtocol('SET')`. Se manca, applicare il default. Questo è un check di robustezza, non una nuova feature.

---

### Regole confermate
- **Tab read-only**: niente CRUD, niente azioni utente sui protocolli.
- **Nessuna tabella nuova**: si riusa esclusivamente `PROTOCOL_REGISTRY` + colonna `protocol_type` già esistente.
- **Default SET garantito** per ogni nuovo esercizio del builder.
- **Nessuna regressione**: schede esistenti continuano a funzionare; il popover `SET` resta nascosto nel builder (come ora).
- **Roadmap visiva**: gli altri 4 protocolli appaiono come "In arrivo" (disabilitati) per chiarezza, senza essere selezionabili.

---

### File modificati / creati

| File | Tipo | Modifica |
|---|---|---|
| `src/components/pt/ProtocolsTab.tsx` | **nuovo** | Tab con card SET (visibile) + 4 card "In arrivo" |
| `src/components/protocols/ProtocolInfoPopover.tsx` | edit | Prop opzionale `forceShow` per mostrare anche SET |
| `src/pages/pt/PTWorkoutsPage.tsx` | edit | Aggiunta TabsTrigger + TabsContent "Protocolli" |
| `src/components/pt/TemplateExerciseBuilder.tsx` | edit (check difensivo) | Garantire `protocol_type='SET'` di default su ogni nuovo esercizio |

---

### Checklist test
1. Login PT → `/pt/workouts` → vedo 4 tab: Schede, Programmi, Assegnati, Esercizi, **Protocolli**.
2. Clicco "Protocolli" → vedo banner informativo + card **SET** ben formattata con descrizione, icona e lista parametri.
3. Sotto vedo 4 card disabilitate ("In arrivo": TOP SET + BACK OFF, RAMPING, EMOM, AMRAP) non cliccabili.
4. Nessun pulsante Modifica/Elimina/Duplica visibile.
5. Apro una scheda e aggiungo un esercizio → `protocol_type` salvato come `'SET'`.
6. Apro una scheda esistente → tutti gli esercizi continuano a funzionare (no regressione).
7. Builder: nessuna ⓘ accanto agli esercizi SET (comportamento invariato).
8. Mobile (<768px): la tab "Protocolli" si vede correttamente con `flex-wrap` già esistente sulla `TabsList`.

