## Piano: nuova sezione Esercizi atleta mobile-first

### Obiettivo
Trasformare `/app/esercizi` da vista operativa dell’allenamento a **libreria visuale consultabile**, mantenendo però tutte le logiche già presenti: recupero workout prioritario, tracking localStorage, apertura dettaglio, ingresso all’esecuzione guidata, completa/salta workout.

Il riferimento principale è il mockup allegato: titolo semplice, lista verticale, thumbnail a sinistra, nome grande e una sola metrica sotto.

---

### 1. Lista esercizi atleta
File: `src/pages/atleta/AtletaEserciziPage.tsx`

Sostituirò la resa attuale della lista con un layout più simile a mobile native fitness app:

- header minimale “Esercizi” con sottotitolo contestuale leggero
- riepilogo workout più discreto, non dominante da dashboard
- lista verticale full-width con righe alte e ariose
- thumbnail grande a sinistra, rounded e `object-cover`
- nome esercizio grande e leggibile
- sotto una sola metrica:
  - `00:20` se `prescribed_duration_seconds` è valorizzato
  - `x12` oppure `x10–12` se reps-based
- divider sottili tra righe
- indicatore stato piccolo ma visibile:
  - non iniziato: dot outline
  - in corso: dot lime/pulse o micro badge
  - completato: check lime
- click sulla riga mantiene `openExercise(ex)` e apre il dettaglio già esistente

Non verranno mostrate metriche tecniche extra nella lista.

---

### 2. Immagini esercizi
Userò il campo già presente `exercises.image_url`, già incluso nelle query.

Comportamento:

- nella lista: thumbnail grande a sinistra
- nel dettaglio: hero image ampia
- fallback se manca immagine:
  - box rounded
  - sfondo muted/dark
  - icona `Dumbbell`
  - aspetto premium coerente LivellApp
- `loading="lazy"` sulle thumbnail
- `object-cover` e proporzioni stabili per evitare salti di layout

Non sono necessarie modifiche database.

---

### 3. Dettaglio esercizio
File: `src/components/app/AtletaExerciseDetailSheet.tsx`

Rafforzerò la coerenza con la nuova lista mantenendo il componente esistente:

- header con nome grande e bottone “Cambia” placeholder
- hero media più evidente, con `image_url` o thumbnail YouTube se video presente
- tab:
  - Animazione attiva
  - Muscoli placeholder
  - Tutorial placeholder
- info chiare:
  - durata oppure reps, mai entrambe
  - istruzioni dal database
  - badge gruppi muscolari
- footer sticky con ingresso al workout flow esistente

Il bottone “Inizia/Riprendi esercizio” continuerà a usare `navigate('/app/workout/:id')`, senza reinventare l’esecuzione guidata.

---

### 4. Set verticali per protocollo SET
Nel dettaglio esercizio confermerò e rifinirò la resa verticale già impostata:

```text
Set 1
Reps: 10
Kg: 20
Recupero: 60s

Set 2
Reps: 10
Kg: 20
Recupero: 60s
```

Regole:

- niente tabella
- niente layout orizzontale tecnico
- ogni set come blocco separato e leggibile durante l’allenamento
- uso di `resolveSetsData` per mantenere compatibilità con `sets_data` e fallback legacy

---

### 5. Mantenimento logica attuale
Non cambierò:

- query di priorità workout (`in_corso`, `in_sospeso`, oggi, prossimo)
- tracking localStorage per set completati
- azioni completa/salta workout
- routing verso esecuzione guidata
- protocolli
- schema dati

Il lavoro è UI/UX atleta, non logica workout.

---

### 6. Regole immagini PT/Admin
Confermerò la separazione richiesta:

Immagini visibili solo in:

- PT: Archivio Esercizi
- PT: Tab Esercizi
- Atleta: nuova sezione Esercizi
- Atleta: dettaglio esercizio

Immagini non aggiunte a:

- builder schede
- circuiti
- protocolli
- blocchi scheda

Il builder resterà pulito e focalizzato su parametri, set, protocolli e note.

---

### 7. File coinvolti
Modifiche previste:

- `src/pages/atleta/AtletaEserciziPage.tsx`
- `src/components/app/AtletaExerciseDetailSheet.tsx`

Verifica/nessuna modifica salvo necessità:

- `src/components/pt/TemplateExerciseBuilder.tsx` per assicurare che non vengano reintrodotte immagini nel builder
- eventuali componenti PT già esistenti solo per confermare la visibilità immagine nelle aree consentite

---

### 8. Controlli finali
Dopo l’implementazione verificherò:

1. lista vicina al mockup allegato
2. feeling mobile native, non dashboard
3. immagine + nome + una sola metrica
4. click su esercizio apre dettaglio
5. hero image e fallback funzionano
6. set SET verticali e leggibili
7. “Inizia/Riprendi esercizio” entra nel flow esistente
8. stato esercizio visibile ma discreto
9. immagini non presenti nel builder/circuiti/protocolli/blocchi scheda
10. coerenza con tema LivellApp dark + lime accent