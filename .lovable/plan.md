# Top Set + Back Off — sincronizzazione reale

Modifiche limitate al rendering del protocollo `TOP_SET_BACKOFF` dentro `src/components/pt/TemplateExerciseBuilder.tsx`. Nessun altro protocollo, nessun cambio a database/RLS/auth.

## 1. Nuovo campo "Aumento %" nel Top Set

Quarto input nella sezione Top Set, accanto a Serie / Reps / Recupero:

- Label `Aumento %`, `type="number"`, `min=0`, `max=100`, `step=0.5`, placeholder `5`
- Salvato in `protocol_params.top_increase_percent` (numero o `null`)
- Griglia Top Set: `grid-cols-2 md:grid-cols-4`

Non tocca le tabelle.

## 2. Due tabelle dedicate (Top Set + Back Off)

Per `TOP_SET_BACKOFF` non si renderizza più la `SetsTable` legacy basata su `te.sets_data`. Al suo posto:

- **Tabella Top Set** — sempre visibile, righe `Reps / Kg / Recupero (s)`, una colonna per ogni `top_sets`.
- **Tabella Back Off** — visibile solo se `backoff_enabled !== false`, righe `Reps / Kg / Recupero (s)`, una colonna per ogni `backoff_sets`.

Dati salvati dentro `protocol_params`:

```
{
  top_sets, top_reps, top_rest, top_increase_percent,
  backoff_enabled, backoff_sets, backoff_reps, backoff_percentage,
  top_set_data:  SetItem[],
  backoff_data:  SetItem[]
}
```

Nuovo componente locale `TopSetBackoffTable` che riceve `sets` + `onChange` come props (riusa il markup di `SetsTable`, ma non legge da `te.sets_data`). `te.sets_data` resta intatto e ignorato per questo protocollo.

## 3. Sincronizzazione parametri → tabelle

Helper puro `applyParamSync(prev, patch)` chiamato SOLO dagli `onChange` dei 5 input parametro:

| Trigger | Effetto |
|---|---|
| `top_sets` cresce a N | append di `{reps: top_reps, weight: null, rest_seconds: top_rest}` fino a N |
| `top_sets` cala a N | `top_set_data.slice(0, N)` |
| `top_reps` cambia | `top_set_data = top_set_data.map(s => ({...s, reps: nuovo_top_reps}))` |
| `top_rest` cambia | `top_set_data = top_set_data.map(s => ({...s, rest_seconds: nuovo_top_rest}))` |
| `backoff_sets` cresce/cala | append/slice analogo su `backoff_data` |
| `backoff_reps` cambia | `backoff_data = backoff_data.map(s => ({...s, reps: nuovo_backoff_reps}))` |

`top_increase_percent`, `backoff_percentage`, `backoff_enabled` non toccano le tabelle.

## 4. Edit manuale delle celle — fonte di verità

L'edit di una singola cella (Reps/Kg/Rec di Set i nella Top Set o nel Back Off):

- aggiorna SOLO `top_set_data[i]` o `backoff_data[i]`
- NON tocca `top_sets/top_reps/top_rest/backoff_sets/backoff_reps`
- NON ri-applica `applyParamSync`

I valori manuali sono persistenti nel JSON e diventano la verità della tabella. Restano salvati anche dopo refresh.

## 5. Normalizzazione retro-compatibile (read-only, mai distruttiva)

`normalizeTopSetBackoff(params)` è un helper PURO usato solo in lettura per il render:

- se `top_set_data` è assente / non array / vuoto → genera array di lunghezza `top_sets ?? 1` derivando i default da `top_reps` / `top_rest` (peso `null`)
- se `top_set_data.length < top_sets` → estende con i default fino a `top_sets`
- se `top_set_data.length > top_sets` → tronca a `top_sets`
- stesse regole su `backoff_data` con `backoff_sets` / `backoff_reps`
- **NON modifica mai i valori di celle già presenti**: `reps/weight/rest_seconds` esistenti vengono preservati così come sono. Estende solo le righe mancanti, tronca solo quelle in eccesso.

Nessuna mutate al mount: il valore normalizzato serve solo al render. Il salvataggio parte solo dal primo `onChange` esplicito (param o cella).

## 6. SetsTable legacy

Resta utilizzata solo per il protocollo `SET`. Per `TOP_SET_BACKOFF` non viene più montata e `te.sets_data` non viene più scritto.

## File toccati

- `src/components/pt/TemplateExerciseBuilder.tsx` — UI Top Set + Back Off, `TopSetBackoffTable`, `applyParamSync`, `normalizeTopSetBackoff`.

Non modifico: `setsData.ts`, registry protocolli, altri rendering, esecuzione lato atleta, EMOM, DB.
