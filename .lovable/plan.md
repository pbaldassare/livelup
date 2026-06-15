## Obiettivo
Trasformare la sezione "Atleti" del PT da semplice vista in una vera **Scheda Cliente** completa, modificabile, con tutte le informazioni operative del rapporto PT↔Atleta. Tutto sincronizzato con la PWA Atleta (stessi dati, RLS coerenti).

Ispirazione: `UserDetailsModal` del progetto *allenati* (anagrafica completa, contatto emergenza, certificato medico con scadenza e file).

## Cosa non funziona oggi
- `PTAthleteDetailPage` mostra solo: profilo statico, badge, "Allena ora", storico workout.
- Nessun campo è **modificabile** dal PT.
- Manca: progressi (peso/misure/foto), storico allenamenti completati con dettaglio, note private del PT, upload documenti, scadenze (visita medica/certificato/assicurazione).
- L'Atleta nella PWA non vede ciò che il PT scrive (non esiste).

## Nuova Scheda Atleta — struttura
Header invariato (avatar, nome, status, azioni rapide Chat/Assegna).
Sotto, **tabs ampliati**:

```text
[Panoramica] [Anagrafica] [Progressi] [Storico] [Note PT] [Documenti] [Allena ora] [Badge]
```

### 1. Anagrafica (NUOVO — editabile)
Form inline con sezioni a card (sul modello allenati):
- **Personale**: nome, cognome, nickname, data nascita, genere, codice fiscale, telefono
- **Contatti**: indirizzo, città, CAP
- **Emergenza**: nome + telefono contatto emergenza
- **Fisico**: altezza, peso attuale, livello, obiettivi (chip multi-select)
- **Bio / note libere** visibili anche all'atleta

Salvataggio per-sezione con pulsante "Salva". I dati vivono su `profiles` + `atleta_profiles` (campi nuovi dove servono).

### 2. Progressi (NUOVO)
- Grafico peso (Recharts, 6 mesi) da `progress_tracking`
- Tabella ultime misurazioni (peso, % grasso, circonferenze, energia, sonno) con possibilità per il PT di **aggiungere** una nuova rilevazione
- Sezione "Foto progressi" da `progress_photos` (già esistente) — galleria mensile con confronto Prima/Dopo
- Tutto già visibile all'atleta nella sua PWA (`AtletaProgressPage`)

### 3. Storico (potenziato)
- Lista completa allenamenti completati con: data, durata reale, % completamento, RPE medio, note atleta, badge stato
- Click → drawer con dettaglio set (esistente in PWA), riusato qui
- Filtri: periodo, programma, stato

### 4. Note PT (NUOVO, **private al PT**)
- Diario libero del PT sull'atleta (RTF/markdown semplice)
- Timeline di note datate (titolo + testo + tag: tecnica/comportamento/infortunio/obiettivo)
- **RLS**: visibili SOLO al PT autore, mai all'atleta
- Tabella nuova `pt_athlete_notes`

### 5. Documenti & Scadenze (NUOVO)
Modello: certificato medico di allenati, generalizzato.
- Upload file (PDF/JPG) con tipo: `visita_medica`, `certificato_agonistico`, `assicurazione`, `consenso_privacy`, `altro`
- Campi: titolo, tipo, data emissione, **data scadenza**, file
- Badge "Scaduto / In scadenza < 30gg / Valido"
- Bucket privato `athlete-documents` con signed URL
- L'atleta vede i propri documenti (e scadenze) nella sua PWA, sezione "Documenti"
- Notifica automatica all'atleta + PT 30/7/0 giorni prima della scadenza (tramite trigger + tabella `notifications` esistente)

### 6. Sincronizzazione PWA Atleta
- Anagrafica editata dal PT → riflessa subito in `AtletaProfilePage` e onboarding (Realtime su `profiles`/`atleta_profiles`)
- Progressi aggiunti dal PT → compaiono in `AtletaProgressPage`
- Documenti caricati dal PT → nuova pagina `/app/documenti` con elenco e scadenze
- Note PT: NON visibili all'atleta (intenzionale)

## Dettagli tecnici

### Migration DB
1. `ALTER TABLE profiles` aggiunge (se mancanti): `nickname`, `birth_date`, `gender`, `fiscal_code`, `address`, `city`, `postal_code`, `emergency_contact_name`, `emergency_contact_phone`
2. `ALTER TABLE atleta_profiles`: `height_cm`, `bio` (se mancanti)
3. Nuova `pt_athlete_notes` (`id`, `pt_user_id`, `atleta_user_id`, `title`, `body`, `tag`, `created_at`, `updated_at`) — RLS: solo il PT autore + admin
4. Nuova `athlete_documents` (`id`, `atleta_user_id`, `uploaded_by_user_id`, `doc_type` enum, `title`, `file_path`, `issued_date`, `expiry_date`, `created_at`) — RLS: atleta proprietario + PT connesso + admin
5. Nuovo bucket Storage **privato** `athlete-documents` con policy: insert/select per PT connesso o atleta proprietario
6. GRANT espliciti per ogni tabella nuova (authenticated + service_role)
7. Trigger `notify_expiring_documents` schedulato (o controllo lato app al login PT) — fase 2 se complesso

### Frontend
- Refactor `src/pages/pt/PTAthleteDetailPage.tsx` (tabs estesi)
- Nuovi componenti in `src/components/pt/athlete-detail/`:
  - `AnagraficaEditor.tsx`
  - `ProgressTab.tsx` (riusa Recharts, pattern già in `PTAnalyticsCharts`)
  - `PTNotesTab.tsx`
  - `DocumentsTab.tsx` + `UploadDocumentDialog.tsx`
- Riuso: `WorkoutHistoryList`, `ProgressPhotos`, `ImageUpload`
- Nuova pagina atleta: `src/pages/atleta/AtletaDocumentsPage.tsx` + voce nel menu mobile
- Mutation con React Query + invalidation; realtime opzionale per anagrafica

### Sicurezza
- Note PT: policy `USING (pt_user_id = auth.uid())`
- Documenti: policy `USING (atleta_user_id = auth.uid() OR are_connected(auth.uid(), atleta_user_id) OR is_admin(auth.uid()))`
- Storage: signed URL 60s, mai pubblico

### Memoria
A fine implementazione aggiorno `mem://features/pt-athlete-card-v2` con la struttura tabs, le nuove tabelle e la regola "Note PT mai visibili all'atleta".

## Roll-out in 3 step
1. **DB + Anagrafica editabile + sync PWA** (sblocca subito la richiesta principale)
2. **Note PT + Documenti & Scadenze** (con pagina atleta)
3. **Progressi avanzati** (grafici, foto, inserimento misure dal PT)

Confermi questa direzione e l'ordine dei 3 step? Vuoi che includa anche un alert in dashboard PT per documenti in scadenza (es. badge rosso su "Atleti")?
