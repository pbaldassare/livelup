## Problema

I popup non risultano centrati nella preview (esempio "Crea Evento" da `CreatePublicEventDialog`, dialog allineato in basso a destra invece che al centro).

Il `DialogContent` base in `src/components/ui/dialog.tsx` usa già `left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]`, ma queste classi vengono perse/sovrascritte in vari contesti (transform parent, override di className, scroll body). La memoria di progetto già fissa lo standard: ogni dialog complesso deve forzare il centraggio con classi `!`-important.

## Cosa fa la patch (solo CSS, nessuna modifica logica)

1. **Hardening del componente base `DialogContent`** (`src/components/ui/dialog.tsx`):
   - aggiungere `!left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2` nella className di default (mantenendo `fixed`, `max-w-lg`, `w-[calc(100%-2rem)]` per il safe area mobile).
   - aggiungere `max-h-[90vh] overflow-y-auto` di default così il body lungo non sfora.

2. **Stesso trattamento su `AlertDialogContent`** (`src/components/ui/alert-dialog.tsx`).

3. **Pulizia delle override locali** (rimuovere classi che alterano la posizione, lasciare solo `max-w-*` / `sm:max-w-*` dove servono). File da rivedere:

```
src/components/pt/CreatePublicEventDialog.tsx
src/components/pt/EditEventDialog.tsx
src/components/pt/calendar/NewAppointmentDialog.tsx
src/components/pt/AssignWorkoutDialog.tsx
src/components/pt/AssignProgramDialog.tsx
src/components/pt/CreateSubscriptionDialog.tsx
src/components/pt/CreateExerciseDialog.tsx
src/components/pt/ProgramFormDialog.tsx
src/components/pt/ImportTemplateDialog.tsx
src/components/pt/ReviewImportedTemplateDialog.tsx
src/components/pt/PTPackagesManager.tsx
src/components/pt/PTGalleryUpload.tsx
src/components/pt/PTPhotoGallery.tsx
src/components/pt/PTReviewsManager.tsx
src/components/pt/AthleteSubscriptionsTab.tsx
src/components/reviews/PTReviewForm.tsx
src/components/reviews/AtletaReviewsHistory.tsx
src/components/exercises/ExerciseDetailDialog.tsx
src/components/admin/CourseBuilder.tsx
src/components/AppTourPrompt.tsx
src/pages/pt/PTWorkoutsPage.tsx
src/pages/pt/PTSettingsPage.tsx
src/pages/pt/PTBlogPage.tsx
src/pages/pt/PTCouponsPage.tsx
src/pages/admin/AdminExercisesPage.tsx
src/pages/admin/AdminCouponTemplatesPage.tsx
src/pages/admin/AdminCouponsPage.tsx
src/pages/admin/AdminCoursesPage.tsx
src/pages/admin/AdminSubscriptionsPage.tsx
src/pages/admin/AdminPTsPage.tsx
src/pages/admin/AdminSettingsPage.tsx
src/pages/atleta/AtletaAppuntamentiPage.tsx
src/pages/atleta/AtletaProfilePage.tsx
src/pages/atleta/AtletaSettingsPage.tsx
src/pages/atleta/AtletaEserciziPage.tsx
src/pages/atleta/AtletaCoursesPage.tsx
src/pages/atleta/AtletaWorkoutDetailPage.tsx
```

4. **Verifica visiva** su tre dialog rappresentativi:
   - `CreatePublicEventDialog` (PT Calendario Eventi → "Nuovo evento")
   - `NewAppointmentDialog` (PT Calendario Appuntamenti → "Nuovo appuntamento")
   - una conferma `AlertDialog` (es. cancellazione appuntamento atleta)

## Dettagli tecnici

- Le classi `!`-important neutralizzano qualunque conflitto di transform/position introdotto da wrapper genitore (preview iframe con `transform: scale`, layout con `transform` per animazioni Framer Motion).
- Manteniamo `w-[calc(100%-2rem)]` per evitare che su mobile il dialog tocchi i bordi.
- `max-h-[90vh] overflow-y-auto` previene il taglio del contenuto su viewport bassi.
- Nessun cambiamento a logica di business, RLS, query o tabelle. Solo CSS/className.
- Aggiornamento della memoria `mem://style/dialog-standardization-system` per ribadire che lo standard è ora applicato anche al componente base, e che le pagine non devono più ripetere le classi di posizione.
