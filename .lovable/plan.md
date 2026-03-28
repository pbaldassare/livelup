

## Piano: Fix Coupon Dialog, Rimuovere Atleti residui, Espandere Dettaglio PT Admin

### Problemi identificati

1. **"Atleti" ancora nella sidebar** — Il codice di `AdminLayout.tsx` NON ha più la voce "Atleti". Probabilmente è un problema di cache del preview. Tuttavia verifico e confermo che è già pulito.

2. **Coupon dialog non centrato** — Il `DialogContent` in `AdminCouponsPage.tsx` usa il default senza classi di centraggio forzato. Bisogna aggiungere le classi `!left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2` come usato negli altri dialog del progetto.

3. **PT Detail Sheet troppo scarno** — Attualmente il pannello laterale mostra solo nome, email, stato, rating e specializzazioni. L'admin deve poter vedere e modificare TUTTI i dati del PT: bio, esperienza, tariffa, gallery, certificazioni caricate, disponibilità, contatti, ecc.

4. **Impostazioni: cataloghi non visibili** — Il codice delle Impostazioni ha GIÀ i tab Categorie con Tipologie PT, Specializzazioni, Certificazioni e Tipi Evento. Probabilmente l'utente non li vede perché è nel tab sbagliato, oppure c'è un problema di query/RLS. Verifico le RLS sulle tabelle catalog.

---

### Modifiche

#### 1. Fix Coupon Dialog centraggio (`AdminCouponsPage.tsx`)
- Aggiungere classi di centraggio forzato al `DialogContent`: `!left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2`
- Aggiungere `max-h-[85vh] overflow-y-auto` per sicurezza su schermi piccoli

#### 2. Espandere PT Detail Sheet in AdminPTsPage
Sostituire il generico `DetailSheet` con un **pannello dettaglio PT completo** (Sheet custom) che mostra:
- **Sezione Profilo**: avatar, nome, email, telefono, stato — modificabili
- **Sezione Professionale**: tipologia, specializzazioni, certificazioni, bio, esperienza, tariffa — modificabili inline
- **Sezione Galleria**: mostrare le foto dalla gallery PT (bucket `pt-gallery`)
- **Sezione Certificazioni**: mostrare i file caricati dal PT (bucket `pt-certificates`)
- **Sezione Contatto/Località**: indirizzo, coordinate, città — modificabile
- **Azioni**: Approva / Sospendi / Riattiva / Elimina

Query aggiuntive nel detail: `pt_profiles` completo + `pt_gallery_photos` + `pt_certificates` (se tabella esiste) + conteggio atleti/allenamenti.

#### 3. Fix RLS cataloghi (migration SQL)
Aggiungere policy `SELECT` per admin su `pt_types`, `pt_specializations`, `pt_certifications`, `event_types` nel caso manchino. Verifico e aggiungo solo se necessario.

#### 4. Refresh sidebar (no-op nel codice)
"Atleti" è già stato rimosso dal codice. Se il problema persiste, un semplice refresh del preview lo risolverà.

---

### File modificati
- **`AdminCouponsPage.tsx`** — fix centraggio dialog
- **`AdminPTsPage.tsx`** — espandere DetailSheet con pannello PT completo e modificabile
- **Migration SQL** — eventuale fix RLS su tabelle catalogo

