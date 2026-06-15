## Obiettivo
Popolare il database con dati demo coerenti per l'atleta **Francesca Biazzi** (`09d0b667-...685472`) collegata al PT **Laura Bianchi / pt2@fitplatform.com** (`27d34e32-...b75b3c`), così da rendere la scheda atleta "viva" sia lato PT (web dashboard) sia lato atleta (PWA `/app`).

## Stato attuale verificato
- Connessione `active` PT↔Atleta: OK
- Allenamenti: 13 (tutti `attivo`, senza esercizi né completamenti reali)
- Documenti: 1 · Note PT: 1 · Eventi calendario: 0 · Progressi: 0 · Foto progressi: 0 · Chat: 1 (senza messaggi recenti)
- Pacchetto/Abbonamento PT: nessuno · Template PT disponibili: 7 · Esercizi globali: presenti

## Cosa verrà seedato (tutto via migration SQL idempotente su id atleta+PT)

1. **Anagrafica & profilo atleta** (`profiles`, `atleta_profiles`)
   - Telefono, città (Milano), avatar placeholder, livello `intermediate`, obiettivi (`["Tonificazione","Perdita peso","Mobilità"]`), altezza 168 cm, data nascita 1992-04-12.

2. **Abbonamento PT** (`atleta_pt_subscriptions`)
   - 1 pacchetto "10 sessioni PT" attivo: `sessions_total=10`, `sessions_used=4`, prezzo 350€, scadenza +60gg.

3. **Storico allenamenti realistici** (`workouts` + `workout_exercises` + `workout_logs`)
   - Aggiorno gli ultimi 6 workout esistenti in `completato` con `completed_at`, `rating`, `notes_atleta`.
   - Aggiungo `workout_exercises` (5 esercizi pubblici: Squat, Panca, Stacco, Plank, Trazioni) con sets/reps/peso/rest e `workout_logs` per i set completati (RPE 6–9, peso progressivo settimana su settimana → progressi visibili nello storico).
   - Lascio 3 workout futuri in `attivo` con scheduled_date prossima settimana.

4. **Progressi corporei** (`progress_tracking`)
   - 8 misurazioni mensili (peso 68→63 kg, body fat 26→22%, vita 78→72, energia/umore/sonno).

5. **Foto progressi** (`progress_photos`)
   - 3 record (fronte/lato/schiena) con URL placeholder pubblici.

6. **Documenti atleta** (`athlete_documents`)
   - Aggiungo: Visita medica (scadenza +180gg), Certificato agonistico (scadenza −10gg = "in scadenza/scaduto" per testare il badge), Consenso privacy firmato.

7. **Note PT condivise** (`pt_athlete_notes`)
   - 3 note (1 condivisa con l'atleta, 2 private PT): piano alimentare, focus mobilità anche, recupero post-infortunio caviglia.

8. **Calendario** (`calendar_events`)
   - 2 appuntamenti PT futuri (`category=appuntamento`, atleta_user_id valorizzato) — uno tra 2 giorni 18:00 in palestra, uno tra 7 giorni 09:30 sessione mobility.
   - 2 appuntamenti passati completati (storico).

9. **Chat & messaggi** (`messages`)
   - 6 messaggi alternati PT↔Atleta nella chat esistente (ultimi 5 giorni) con `is_read` realistici.

10. **Badge & gamification** (`atleta_badges`)
    - Sblocco di 2 badge esistenti compatibili (es. `workouts_completed` ≥ 5, `first_cheer`).

11. **Notifiche** (`notifications`)
    - 4 notifiche per Francesca (badge sbloccato, nuovo workout, messaggio PT, promemoria appuntamento).

## Aspetti tecnici
- Tutto eseguito come **una sola migration SQL** con `DO $$ ... $$` per recuperare gli id (PT, atleta, chat, esercizi pubblici) e inserire dati senza duplicati (`ON CONFLICT DO NOTHING` / `WHERE NOT EXISTS`).
- Nessuna modifica a schema, RLS o policy: solo INSERT/UPDATE dati.
- Date relative a `now()` per rimanere sempre fresche.
- I trigger esistenti (`enforce_single_pt_connection`, `decrement_subscription_session`, `check_and_award_badges`, `update_atleta_status_on_connection`, `update_chat_last_message`) gestiranno automaticamente conteggi e stati derivati.

## Verifica post-seed
- `/pt/athletes/<id>` → Panoramica, Storico (con logs/RPE), Documenti (con scadenze), Note PT, Progressi, Allena ora.
- `/app` (login Francesca) → Programma con prossimi workout, Storico completati, Documenti scadenza banner, Progressi grafico, Chat con PT, Appuntamenti.
- Conteggi dashboard PT (`I miei atleti`, `Allenamenti completati`, `Appuntamenti prossimi 7gg`, `Messaggi non letti`) si aggiornano coerentemente.