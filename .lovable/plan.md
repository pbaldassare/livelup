## Piano: Admin Archivio Esercizi + media esercizio

### Obiettivo
Trasformare il CRUD Admin degli esercizi in un editor completo e collegare `image_url` e `video_url` come sorgente unica per Admin, PT e Atleta.

Nota: la tabella `exercises` ha già `image_url` e `video_url`, e lo storage `exercise-images` / `exercise-videos` esiste già. Non serve migration schema.

---

### 1. Modal Admin “Nuovo/Modifica Esercizio”
File: `src/pages/admin/AdminExercisesPage.tsx`

- Ridisegnare il dialog con layout centrato, larghezza desktop circa `760–820px`, responsive mobile, scroll interno sicuro.
- Riorganizzare il form in sezioni:
  - Informazioni base: Nome, Istruzioni esecuzione obbligatorie, Consigli aggiuntivi.
  - Classificazione: Categoria, Livello, Gruppi muscolari.
  - Media esercizio: Immagine e Video tutorial.
- Rafforzare validazioni:
  - Nome obbligatorio e limite lunghezza.
  - Istruzioni obbligatorie e limite lunghezza.
  - Video facoltativo ma URL valido se presente.
  - Immagine consigliata ma non obbligatoria.

---

### 2. Upload e gestione immagine nel CRUD Admin
File: `src/pages/admin/AdminExercisesPage.tsx`

- Aggiungere upload file verso bucket `exercise-images`.
- Salvare il public URL in `exercises.image_url`.
- Mostrare preview immediata.
- Consentire sostituzione immagine.
- Consentire rimozione immagine, salvando `image_url = null`.
- Mantenere anche campo URL immagine come fallback manuale.
- Usare placeholder premium quando manca immagine.

---

### 3. Video tutorial nel CRUD Admin
File: `src/pages/admin/AdminExercisesPage.tsx`

- Gestire `video_url` come campo dedicato.
- Supportare URL YouTube e Vimeo tramite validazione semplice.
- Mostrare preview automatica:
  - embed YouTube quando riconosciuto;
  - embed Vimeo quando riconosciuto;
  - link/placeholder se provider non riconosciuto ma URL valido.
- Consentire aggiunta, modifica e rimozione video in create/edit.

---

### 4. Archivio Esercizi Admin: tabella e preview
File: `src/pages/admin/AdminExercisesPage.tsx`

- Aggiungere colonna thumbnail.
- Aggiungere colonna video con icona quando `video_url` è presente.
- Rendere l’anteprima più ricca tramite dialog dettaglio:
  - immagine;
  - video;
  - istruzioni;
  - consigli;
  - badge categoria/livello/muscoli.

---

### 5. Dialog dettaglio esercizio condiviso
File: `src/components/exercises/ExerciseDetailDialog.tsx`

- Migliorare il dialog esistente per visualizzare sia immagine sia video, non solo immagine quando manca YouTube.
- Aggiungere supporto Vimeo semplice.
- Mantenere bottone preferiti opzionale per PT.
- Stile coerente con LivellApp e adatto sia ad Admin sia a PT.

---

### 6. Collegamento lato PT
File: `src/pages/pt/PTExercisesArchivePage.tsx`

- Mostrare thumbnail in Archivio Esercizi PT.
- Mostrare icona video se presente.
- Al click, aprire il dialog dettaglio con immagine, video e istruzioni.

File: `src/pages/pt/PTWorkoutsPage.tsx`

- Nella tab “Esercizi” dentro Allenamenti PT, mostrare thumbnail da `image_url` per gli esercizi preferiti.
- Mantenere invariata la logica dei preferiti e del builder.

Importante: non aggiungere immagini nel builder schede, circuiti, protocolli o blocchi scheda. Il builder resta pulito e focalizzato sui parametri.

---

### 7. Collegamento lato Atleta
File già allineati da verificare/rafforzare:
- `src/pages/atleta/AtletaEserciziPage.tsx`
- `src/components/app/AtletaExerciseDetailSheet.tsx`

- Confermare uso di `exercises.image_url` come thumbnail lista.
- Confermare hero image nel dettaglio.
- Migliorare la tab Tutorial per usare `video_url` quando presente invece di restare solo placeholder.
- Non modificare workout flow, tracking localStorage, protocolli o logica di esecuzione.

---

### 8. Controlli finali

- Build/typecheck per verificare che non ci siano regressioni.
- Verificare create/edit Admin con:
  - upload immagine;
  - URL fallback immagine;
  - rimozione immagine;
  - video YouTube/Vimeo;
  - rimozione video.
- Verificare che i dati salvati in Admin siano letti automaticamente da PT e Atleta.
- Verificare che il builder schede non mostri immagini.