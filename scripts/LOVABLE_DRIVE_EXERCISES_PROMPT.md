# Prompt Lovable Cloud — archivio esercizi Drive

Incolla questo blocco in Lovable **dopo** che il file di migration è su `main` (sync repo).

```text
Sei Lovable Cloud per Livelapp (project ref kxgaqnksylntokyrpaxp).

ARCHIVIO ESERCIZI CALISTHENICS (metadati only, NESSUN video da Drive):

Applica ESATTAMENTE la migration già nel repo, senza riscriverla:
  supabase/migrations/20260820140000_drive_calisthenics_exercise_archive.sql

Cosa fa (non cambiare la logica):
1) DELETE da pt_course_step_exercises i passi che puntano a exercises.is_public = true
   (FK ON DELETE RESTRICT: senza questo lo DELETE sugli esercizi fallisce).
2) DELETE FROM public.exercises WHERE is_public = true
   — toglie il vecchio catalogo palestra/yoga/pilates pubblico.
   — NON cancellare esercizi privati PT (is_public = false).
3) INSERT di 274 esercizi pubblici allineati alle cartelle Google Drive:
   - category = nome cartella Drive (es. Pull up, Planche, Warm-up, Hspu)
   - name = "Cartella · Variante" (es. Pull up · Wide Pull Up)
   - muscle_groups, equipment, difficulty_level, description, instructions compilati
   - video_url = NULL (i file Drive NON vanno scaricati né caricati nello storage)
   - created_by = NULL (catalogo piattaforma)

Verifica SQL dopo l’apply e riportami i numeri:
  SELECT COUNT(*) FROM public.exercises WHERE is_public = true;
    → atteso 274
  SELECT category, COUNT(*) FROM public.exercises WHERE is_public = true GROUP BY category ORDER BY category;
    → 23 cartelle: Back lever, Bar muscle up, Core, Dip, Dragon press, Front lever, Handstand, Hspu, Human flag, Iron cross, L-sit, Legs, Maltese, Oap, Planche, Pull up, Push Up, Ring muscle up, Stretching, Ted, V-sit, Victorian assisted, Warm-up
  SELECT COUNT(*) FROM public.exercises WHERE is_public = false;
    → deve restare invariato rispetto a prima (esercizi PT)

Non toccare: .env, client.ts, types.ts, config.toml, storage, Edge Functions.
Non importare MP4 da Google Drive.
Non reinserire il vecchio seed Forza/Cardio/Pilates/Yoga.

Se la migration è già stata applicata (274 pubblici con category Drive), non rilanciarla.
Riporta: migration applicata sì/no, count pubblici, elenco category+count, eventuali errori FK.
```
