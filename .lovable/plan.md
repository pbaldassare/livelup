

## Piano: Aggiornare la Sitemap

La sitemap non è aggiornata. Confrontando `AdminSitemapPage.tsx` con le route reali in `App.tsx`, mancano diverse pagine e alcuni path sono sbagliati.

### Differenze trovate

**Admin Dashboard** — mancano:
- Esercizi `/admin/exercises` (c'è nella sidebar ma non nella sitemap)
- Audit Log `/admin/audit-log`
- Ticket Detail `/admin/support/:ticketId`

**PT Dashboard** — mancano:
- Dettaglio Atleta `/pt/athletes/:atletaId`
- Dettaglio Template `/pt/templates/:templateId`
- Coupon `/pt/coupons`

**PT App** — manca:
- Chat Dettaglio `/pt/app/chat/:atletaId`

**Atleta App** — mancano:
- Onboarding `/app/onboarding`
- Profilo PT `/app/pt/:userId`
- Dettaglio Workout `/app/workout/:workoutId`
- Chat con destinatario `/app/chat/:recipientId`
- Dettaglio Evento `/app/events/:eventId`
- Profilo Professionista `/app/professional/:professionalId`
- Prenotazioni `/app/booking`

**Sito Pubblico** — path sbagliati:
- Scopri PT reale: `/pts` (non `/discover`)
- Profilo PT reale: `/pts/:userId` (non `/pt/:slug`)
- Manca: Autenticazione `/auth`

### Modifica
**`src/pages/admin/AdminSitemapPage.tsx`** — aggiornare l'array `sections` con tutte le pagine mancanti e correggere i path errati.

