Piano di implementazione per migliorare la sezione “Media esercizio” nel modal Admin.

1. Estendere il form Admin esercizi
- Aggiornare `AdminExercisesPage.tsx` trasformando la sezione “Media esercizio” in un media manager a due card parallele:
  - Card sinistra: Immagine esercizio con preview grande, upload, sostituzione, rimozione e URL fallback.
  - Card destra: Video tutorial con tab “Carica video” e “Link YouTube/Vimeo”.
- Aggiungere input file dedicato per video, drag & drop, pulsante “Carica video”, stato di upload e progress bar.
- Mantenere il modal centrato già corretto.

2. Upload video su storage esistente
- Usare il bucket pubblico già presente `exercise-videos`.
- Validare file video:
  - formati: `mp4`, `mov` dove supportato dal browser;
  - limite dimensione ragionevole, ad esempio 100 MB.
- Salvare automaticamente l’URL pubblico del video nel campo `exercises.video_url`, così resta una sola sorgente dati.
- Gestire replace/remove senza perdere il video già salvato se un nuovo upload fallisce.
- Per la progress bar usare l’evento nativo `XMLHttpRequest` verso Storage, perché l’upload SDK attuale non espone una progress percentuale affidabile.

3. Supporto video link esterno
- Mantenere il campo `video_url` per YouTube/Vimeo.
- Rafforzare la validazione: se il valore non è un file caricato e non è YouTube/Vimeo, mostrare errore prima del salvataggio.
- Mostrare preview embed automatica per YouTube/Vimeo.
- Per URL video caricati dal bucket, mostrare player `<video controls>` inline.

4. Preview combinata Admin/PT/Atleta
- Aggiornare `ExerciseDetailDialog.tsx` per mostrare una preview combinata:
  - se esiste solo immagine: immagine;
  - se esiste solo video: video;
  - se esistono entrambi: tab “Immagine” / “Video”.
- Supportare tre tipi di video nello stesso componente:
  - YouTube embed;
  - Vimeo embed;
  - file caricato con player HTML5.
- Questa preview alimenterà automaticamente Admin preview e Archivio Esercizi PT, perché condividono lo stesso dialog.

5. Collegamento lato atleta
- Aggiornare `AtletaExerciseDetailSheet.tsx` per usare `video_url` sia quando è YouTube/Vimeo sia quando è un file caricato.
- Nel tab “Tutorial” mostrare il video corretto con priorità al valore salvato in `video_url`.
- Nella hero/Animazione mantenere immagine come base visuale e usare il video quando disponibile senza rompere il workout flow.

6. Nessuna modifica ai protocolli o builder
- Non verrà cambiata la logica dei protocolli.
- Non verrà modificato il builder schede, salvo continuare a leggere `image_url`/`video_url` già presenti dove previsto.
- La sorgente dati rimane unica: tabella `exercises`, campi `image_url` e `video_url` già esistenti.

Dettagli tecnici
- Non serve migration per `image_url` e `video_url`: i campi sono già presenti nel model `exercises` e il bucket `exercise-videos` esiste già.
- File previsti da modificare:
  - `src/pages/admin/AdminExercisesPage.tsx`
  - `src/components/exercises/ExerciseDetailDialog.tsx`
  - `src/components/app/AtletaExerciseDetailSheet.tsx`
- Verifica finale: build TypeScript e controllo che create/edit esercizio, preview Admin, Archivio PT e dettaglio atleta leggano lo stesso `video_url`.