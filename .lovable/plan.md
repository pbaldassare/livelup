
# Piano: Implementare Creazione Utenti e Funzionalita Mancanti Admin

## Analisi dello Stato Attuale

Il pannello Admin presenta diverse lacune funzionali:

| Funzionalita | Stato |
|--------------|-------|
| Lista PT | Completa (con inline editing) |
| Lista Atleti | Completa |
| Crea PT/Atleta | Mancante |
| Impostazioni | Mock (non salva) |
| Piani Abbonamento | Placeholder |
| Pagine Dettaglio | Mancanti |
| Audit Log | Pulsante non funzionante |

---

## 1. Funzionalita Prioritaria: Creare Personal Trainer

### Componente: Dialog per creare nuovo PT

Aggiungere un pulsante "Nuovo PT" nell'header della pagina AdminPTsPage che apre un dialog con:

**Campi richiesti:**
- Email (validata)
- Password (minimo 8 caratteri)
- Nome
- Cognome
- Livello (junior/intermedio/senior/master)
- Citta
- Specializzazioni (multi-select)
- Stato iniziale (registrato/attivo)

**Flusso tecnico:**
1. Chiamata a una nuova Edge Function `create-user` che usa l'Admin API di Supabase
2. L'Edge Function crea: auth user, profilo base, ruolo, profilo PT
3. Refresh della lista dopo creazione

### File da modificare:
- `src/pages/admin/AdminPTsPage.tsx` - Aggiungere dialog e pulsante
- Creare `supabase/functions/create-user/index.ts` - Edge Function

---

## 2. Funzionalita Secondaria: Creare Atleta

### Stesso pattern per AdminAthletesPage

**Campi richiesti:**
- Email
- Password
- Nome
- Cognome
- Livello fitness
- Obiettivi (multi-select)
- Data di nascita (opzionale)
- Altezza/Peso (opzionale)

### File da modificare:
- `src/pages/admin/AdminAthletesPage.tsx` - Aggiungere dialog e pulsante

---

## 3. Edge Function: create-user

```text
POST /create-user
{
  "email": "nuovo.pt@email.com",
  "password": "Password123!",
  "firstName": "Mario",
  "lastName": "Rossi",
  "role": "pt" | "atleta",
  "profileData": { ... }
}
```

L'Edge Function:
1. Verifica che il chiamante sia admin (opzionale, RLS gestisce)
2. Usa `supabaseAdmin.auth.admin.createUser()`
3. Crea profilo in `profiles`
4. Crea ruolo in `user_roles`
5. Crea profilo specifico in `pt_profiles` o `atleta_profiles`
6. Ritorna il nuovo utente

---

## 4. Miglioramenti Addizionali

### 4.1 Pagina Dettaglio Atleta
Creare `src/pages/admin/AdminAthleteDetailPage.tsx`:
- Visualizza profilo completo atleta
- Connessioni attive/passate
- Storico allenamenti
- Azioni: modifica, sospendi

### 4.2 Pagina Dettaglio Ticket
Creare `src/pages/admin/AdminTicketDetailPage.tsx`:
- Thread completo messaggi
- Form risposta
- Cambio stato/priorita

### 4.3 Pagina Audit Log
Creare `src/pages/admin/AdminAuditLogPage.tsx`:
- Tabella con filtri
- Ricerca per utente/azione
- Export CSV

---

## Schema Implementazione Progressiva

| Fase | Componente | Priorita |
|------|------------|----------|
| 1 | Edge Function create-user | Alta |
| 2 | Dialog Crea PT in AdminPTsPage | Alta |
| 3 | Dialog Crea Atleta in AdminAthletesPage | Alta |
| 4 | Pagina Dettaglio Atleta | Media |
| 5 | Pagina Dettaglio Ticket | Media |
| 6 | Pagina Audit Log | Bassa |

---

## Dettaglio Tecnico: Dialog Crea PT

```tsx
// Struttura del form nel dialog
<Dialog>
  <DialogContent className="max-w-2xl">
    <DialogHeader>
      <DialogTitle>Nuovo Personal Trainer</DialogTitle>
      <DialogDescription>
        Crea un nuovo account PT sulla piattaforma
      </DialogDescription>
    </DialogHeader>
    
    <div className="grid grid-cols-2 gap-4">
      <Input label="Email" type="email" required />
      <Input label="Password" type="password" required />
      <Input label="Nome" required />
      <Input label="Cognome" required />
      <Select label="Livello" options={LEVEL_OPTIONS} />
      <Input label="Citta" />
      <TagInput label="Specializzazioni" suggestions={SPECS} />
      <Select label="Stato" options={['registrato', 'attivo']} />
    </div>
    
    <DialogFooter>
      <Button variant="outline">Annulla</Button>
      <Button onClick={handleCreate}>Crea PT</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## Riepilogo Files

**Nuovi file:**
- `supabase/functions/create-user/index.ts`
- `src/pages/admin/AdminAthleteDetailPage.tsx`
- `src/pages/admin/AdminTicketDetailPage.tsx`
- `src/pages/admin/AdminAuditLogPage.tsx`

**File modificati:**
- `src/pages/admin/AdminPTsPage.tsx` (dialog crea PT)
- `src/pages/admin/AdminAthletesPage.tsx` (dialog crea Atleta)
- `src/App.tsx` (nuove routes)
