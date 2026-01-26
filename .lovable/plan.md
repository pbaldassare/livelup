
# Piano: Completamento Profilo Atleta

## Problema Identificato
Dalla screenshot emergono diverse funzionalità mancanti nella pagina profilo:

1. **Nessun upload foto profilo** - L'avatar mostra solo iniziali "LF"
2. **Dati personali assenti** - Email, cellulare, indirizzo non visualizzati
3. **Notifiche → 404** - Route `/app/notifications` non esiste
4. **Privacy → 404** - Route `/app/privacy` non esiste
5. **Elimina account assente** - Nessuna opzione per cancellare l'account

---

## Parte 1: Storage Bucket per Avatar

### Migrazione Database
Creare bucket `avatars` per upload foto profilo:

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);

-- RLS policy: utenti possono gestire la propria cartella
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');
```

---

## Parte 2: Pagina Notifiche

### Nuovo File: `src/pages/atleta/AtletaNotificationsPage.tsx`

Pagina dedicata per visualizzare e gestire le notifiche:

```text
+------------------------------------------+
|  ← Notifiche                   Mark All  |
+------------------------------------------+
| [🔔] Nuovo allenamento                   |
|     Il tuo PT ha preparato una scheda    |
|     2 ore fa                        •    |
+------------------------------------------+
| [💬] Nuovo messaggio                     |
|     Marco ti ha scritto                  |
|     Ieri                                 |
+------------------------------------------+
| [🏆] Badge guadagnato!                   |
|     Hai completato 10 workout            |
|     3 giorni fa                          |
+------------------------------------------+
```

Componenti:
- Header con back button e "Segna tutto letto"
- Lista notifiche con icone per tipo
- Indicatore unread (pallino colorato)
- Swipe to delete (mobile)
- Empty state quando vuoto

---

## Parte 3: Pagina Settings (Privacy + Elimina Account)

### Nuovo File: `src/pages/atleta/AtletaSettingsPage.tsx`

Pagina impostazioni con sezioni:

```text
+------------------------------------------+
|  ← Impostazioni                          |
+------------------------------------------+
| ACCOUNT                                  |
| [👤] Modifica profilo              →     |
| [📧] Email: luca@example.com       →     |
| [📱] Telefono: +39 333...          →     |
+------------------------------------------+
| PRIVACY                                  |
| [🔒] Visibilità profilo            →     |
| [📊] Condivisione dati             →     |
| [🔔] Notifiche push          [switch]    |
+------------------------------------------+
| ACCOUNT PERICOLOSO                       |
| [🗑️] Elimina account          [rosso]   |
+------------------------------------------+
```

### Funzionalità Elimina Account
- Dialog di conferma con input email per verifica
- Chiama edge function `delete-user` esistente
- Logout automatico dopo eliminazione

---

## Parte 4: Upload Foto Profilo

### Aggiornamento ProfileHeader

Aggiungere icona camera sopra l'avatar:

```text
       +--------+
       |   LF   |  ← Avatar attuale
       |  [📷]  |  ← Overlay con camera icon
       +--------+
```

Al click:
1. Apre file picker (solo immagini)
2. Mostra preview in dialog
3. Upload su storage `avatars/{user_id}/avatar.{ext}`
4. Aggiorna `profiles.avatar_url`

---

## Parte 5: Sezione Dati Personali

### Aggiornamento AtletaProfilePage

Aggiungere sezione sopra il menu:

```text
+------------------------------------------+
| I TUOI DATI                              |
+------------------------------------------+
| 📧 Email                                 |
|    luca.ferrari@email.com                |
+------------------------------------------+
| 📱 Telefono                              |
|    +39 333 1234567                       |
+------------------------------------------+
| 📍 Città                                 |
|    Milano                                |
+------------------------------------------+
|        [Modifica dati]                   |
+------------------------------------------+
```

Cliccando "Modifica dati":
- Sheet bottom con form campi editabili
- Salvataggio su tabella `profiles`

---

## File da Creare/Modificare

| File | Azione |
|------|--------|
| `src/pages/atleta/AtletaNotificationsPage.tsx` | **Nuovo** - Pagina notifiche |
| `src/pages/atleta/AtletaSettingsPage.tsx` | **Nuovo** - Impostazioni + privacy + elimina |
| `src/components/app/ProfileHeader.tsx` | **Modifica** - Aggiungere upload foto |
| `src/pages/atleta/AtletaProfilePage.tsx` | **Modifica** - Sezione dati personali |
| `src/App.tsx` | **Modifica** - Aggiungere route mancanti |

---

## Route da Aggiungere

```typescript
// App.tsx - Nuove route atleta
<Route path="/app/notifications" element={
  <AtletaRoute>
    <AppLayout>
      <AtletaNotificationsPage />
    </AppLayout>
  </AtletaRoute>
} />

<Route path="/app/settings" element={
  <AtletaRoute>
    <AppLayout>
      <AtletaSettingsPage />
    </AppLayout>
  </AtletaRoute>
} />
```

---

## Migrazione Storage

```sql
-- Bucket per avatar utenti
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);

-- Policy: upload propria cartella
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: update propri file
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: delete propri file
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: lettura pubblica
CREATE POLICY "Public avatar access"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');
```

---

## Flusso Elimina Account

```text
1. Atleta clicca "Elimina account"
   |
   v
2. Dialog: "Sei sicuro? Scrivi la tua email per confermare"
   |
   v
3. Input email verificato
   |
   v
4. Chiamata edge function delete-user
   |
   v
5. Cleanup cascata:
   - atleta_profiles
   - atleta_badges
   - workouts
   - progress_tracking
   - chats/messages
   - notifications
   - pt_atleta_connections
   - atleta_pt_subscriptions
   |
   v
6. Eliminazione auth.users
   |
   v
7. Redirect a /auth
```

---

## Criteri di Accettazione

1. ✅ Avatar cliccabile per upload nuova foto
2. ✅ Sezione "I tuoi dati" mostra email, telefono, città
3. ✅ Form modifica dati personali funzionante
4. ✅ Pagina /app/notifications funzionante con lista notifiche
5. ✅ Pagina /app/settings con opzioni privacy
6. ✅ Pulsante "Elimina account" con doppia conferma
7. ✅ Tutte le pagine con tema scuro coerente (app-*)

---

## Stile Consistente

Tutte le nuove pagine useranno le variabili tema scuro:
- `bg-app-background` (nero)
- `bg-app-card` (grigio scuro)
- `text-app-foreground` (bianco)
- `text-app-muted-foreground` (grigio chiaro)
- `border-app-border` (bordo grigio)
- `text-app-accent` / `bg-app-accent` (lime per accenti)
