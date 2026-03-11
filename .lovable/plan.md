

# Piano di Implementazione — Funzionalità Mancanti

Dato che il messaggio originale è stato riassunto, ecco i punti che implementeremo basandomi sull'analisi del codice:

- **3. Upload Media** — Avatar, foto esercizi, gallery PT
- **5. Esecuzione Workout Live** — Flusso completo start-to-finish con persistenza
- **6. Gamification & Badge** — Trigger automatici per assegnazione badge
- **7. Calendario PT** — Prenotazione sessioni end-to-end
- **8. Onboarding Completo** — Flusso guidato post-registrazione
- **9. Progress Tracking** — Grafici e statistiche progressi atleta

Se i punti 8/9 non corrispondono a ciò che intendevi, fammelo sapere.

---

## 1. Upload Media (Punto 3)

**Stato attuale**: Bucket storage esistenti (`avatars`, `pt-gallery`, `cover-images`) ma nessun componente di upload frontend.

**Implementazione**:
- Creare un componente riutilizzabile `ImageUpload` con preview, crop e upload su storage
- Integrare upload avatar nella pagina profilo atleta (`AtletaProfilePage`) e PT
- Collegare `PTGalleryUpload` al bucket `pt-gallery` con drag-and-drop
- Upload immagini esercizi per i PT nella gestione template

**File**: `src/components/common/ImageUpload.tsx` (nuovo), modifiche a `AtletaProfilePage.tsx`, `PTAppProfilePage.tsx`, `PTGalleryUpload.tsx`

---

## 2. Esecuzione Workout Live (Punto 5)

**Stato attuale**: `AtletaWorkoutDetailPage` ha già il flusso base (timer, set tracker, log mutation). Manca:
- Recupero dei log precedenti per pre-popolare i set già completati (resume workout)
- Schermata di riepilogo post-workout con stats e feedback
- Gestione RPE per ogni set

**Implementazione**:
- Fetch `workout_logs` esistenti al caricamento per permettere resume
- Aggiungere schermata finale con riepilogo (tempo totale, volume, rating/feedback)
- Integrare input RPE nel `SetTracker`
- Salvare `notes_atleta` e `rating` al completamento

**File**: Modifiche a `AtletaWorkoutDetailPage.tsx`, `SetTracker.tsx`

---

## 3. Gamification & Badge (Punto 6)

**Stato attuale**: Tabelle `badges` e `atleta_badges` esistono. Nessun trigger automatico.

**Implementazione**:
- **Migrazione DB**: Creare una funzione `check_and_award_badges()` come trigger su `workouts` quando `status = 'completato'`
- Badge definiti:
  - "Primo Allenamento" (1 workout completato)
  - "Costanza" (5 workout completati)
  - "Macchina" (10 workout completati)
  - "Streak 4" (4 settimane consecutive)
  - "Primo Cheer" (primo cheer inviato)
- Seed dei badge nella tabella `badges`
- Notifica in-app quando un badge viene assegnato
- Visualizzazione badge nel profilo atleta (già parzialmente presente con `BadgeCard`)

**DB**: Trigger `after update on workouts`, funzione `check_and_award_badges`, insert dati badge

---

## 4. Calendario PT Completo (Punto 7)

**Stato attuale**: `PTAppCalendarPage` mostra eventi, `PTAvailabilityManager` gestisce disponibilità, `CreatePublicEventDialog` crea eventi. Manca la prenotazione lato atleta.

**Implementazione**:
- Pagina atleta per visualizzare disponibilità del PT connesso
- Componente di prenotazione slot con conferma
- Notifica al PT quando un atleta prenota
- Stato dell'evento aggiornato (confermato/rifiutato dal PT)

**File**: `src/pages/atleta/AtletaBookingPage.tsx` (nuovo), modifiche a `PTAppCalendarPage.tsx`, route in `App.tsx`

---

## 5. Onboarding Completo (Punto 8)

**Stato attuale**: `AtletaOnboardingPage` esiste ma va verificato il flusso completo.

**Implementazione**:
- Step-by-step wizard: dati personali → obiettivi → livello fitness → upload avatar
- Salvataggio progressivo su `atleta_profiles` e `profiles`
- Redirect automatico dopo primo login se onboarding non completato
- Onboarding PT: specializzazioni, certificazioni, tariffa, disponibilità

**File**: Modifiche a `AtletaOnboardingPage.tsx`, nuovo `PTOnboardingPage.tsx`, logica redirect in `ProtectedRoute.tsx`

---

## 6. Progress Tracking (Punto 9)

**Stato attuale**: `AtletaProgressPage` esiste, `WeeklyStatsSection` mostra stats base. Mancano grafici dettagliati.

**Implementazione**:
- Grafico volume di allenamento settimanale (recharts — già installato)
- Grafico progressione peso per esercizio nel tempo
- Calendario attività con heatmap (giorni attivi)
- RPC function per aggregare dati storici workout_logs

**File**: Modifiche a `AtletaProgressPage.tsx`, `ActivityCalendar.tsx`, nuova RPC `get_progress_stats`

---

## Ordine di Implementazione Suggerito

1. **Upload Media** — prerequisito per onboarding e profili
2. **Onboarding** — flusso base per nuovi utenti
3. **Esecuzione Workout** — core dell'app
4. **Gamification** — motivazione post-workout
5. **Progress Tracking** — visualizzazione dati
6. **Calendario PT** — prenotazioni

Questo è un piano corposo. Suggerisco di procedere un punto alla volta, partendo dall'Upload Media.

