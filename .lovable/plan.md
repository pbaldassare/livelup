

## Piano: Creare pagina Sitemap Admin con organigramma ruoli e mappa funzionale

Adatto la stessa logica del progetto Consulnet: una pagina che mostra la **gerarchia dei ruoli**, la **mappa di tutte le sezioni/pagine** con i ruoli che vi hanno accesso, e una **tabella permessi**.

### Struttura della pagina

**Sezione 1 — Gerarchia Ruoli** (3 livelli)
- Livello 1: **Admin** — accesso totale, gestione piattaforma
- Livello 2: **Personal Trainer** — dashboard web + app mobile, gestione atleti
- Livello 2: **Atleta** — app mobile, allenamenti, prenotazioni

Ogni card mostra icona, descrizione, mansioni espandibili.

**Sezione 2 — Mappa delle Sezioni** (card collassabili per area)
- Admin: Dashboard, PT, Abbonamenti, Pagamenti, Messaggi, Coupon, Corsi, Supporto, Impostazioni, Sitemap
- PT Dashboard: Dashboard, Atleti, Schede, Calendario, Messaggi, Pagamenti, Blog, Impostazioni
- PT App: Home, Atleti, Calendario, Schede, Chat, Profilo
- Atleta App: Home, Scopri, Attività, Prenota, Progressi, Chat, Profilo, Abbonamento, Corsi, Impostazioni
- Sito Pubblico: Landing, Scopri PT, Profilo PT, Blog, Installa App

**Sezione 3 — Tabella Permessi**
Chiavi permesso con descrizione e sezioni controllate (basate su `ROLE_ACCESS_MATRIX` da `types/roles.ts`).

### File coinvolti

1. **`src/pages/admin/AdminSitemapPage.tsx`** — Nuova pagina, stessa struttura di Consulnet adattata ai 3 ruoli LIVELLAPP
2. **`src/components/layouts/AdminLayout.tsx`** — Aggiungere voce "Sitemap" nella sidebar con icona `Map`
3. **`src/App.tsx`** — Aggiungere rotta `/admin/sitemap` protetta da `AdminRoute`

