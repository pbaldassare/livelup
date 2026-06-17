# Predisposizione completa per i Personal Trainer

Tre interventi coordinati: report di stato, PWA installabile anche per i PT, onboarding guidato al primo accesso.

---

## 1) Audit completo stato PT (pagina admin "Stato PT")

Pagina `/admin/pt-readiness` con report in tempo reale che dimostra che cosa è già predisposto e cosa manca.

Sezioni:
- **Rotte e accesso**: elenco di tutte le `/pt/*` registrate in `src/App.tsx`, con guard di ruolo verificato (`RoleRoute` + `has_role`). Mostra ✓/✗ per ciascuna.
- **Feature PT vs Atleta**: tabella di parità funzionale (Workout, Calendario/Appuntamenti, Chat, Atleti, Esercizi, Template, Pacchetti, Coupons, Eventi, Blog, Recensioni, Documenti, Notifiche, Export). Per ognuna: pagina PT presente, endpoint usato, RLS verificata.
- **Permessi backend**: chiama l'edge function `admin-audit` (action `pt_readiness` nuova) che verifica per ogni PT: ruolo `pt` in `user_roles`, riga in `pt_profiles`, stato (`registrato` / `attivo` / `sospeso`), numero atleti attivi vs `max_athletes`, pacchetti attivi.
- **PWA**: stato manifest, scope, presenza icone, ultimo build SW.
- **Onboarding**: per ogni PT mostra completamento profilo (bio, certificazioni, location, gallery, pacchetti) con percentuale.

Ogni riga "non conforme" ha un link diretto alla pagina di fix.

---

## 2) Abilitare la PWA anche per i PT

Oggi la PWA è ottimizzata per l'atleta (`/app`). Estendere all'area `/pt`:

- **Manifest dinamico per ruolo**: due manifest separati
  - `public/manifest.webmanifest` (atleta — già esistente, nero/lime)
  - `public/manifest-pt.webmanifest` (PT — teal `#0d4f4f`, `start_url: /pt`, `scope: /pt`, `name: "LIVELLAPP PT"`, `short_name: "LIVELLAPP PT"`)
- **Tag manifest condizionale**: componente `<DynamicManifest />` montato in `RootLayout` che, in base al ruolo dell'utente loggato e al path, inietta `<link rel="manifest">` corretto e aggiorna `theme-color`.
- **Icone PT** (`public/icons/pt-*.png`): 192/512/maskable in palette teal.
- **Service worker**: già gestito dal wrapper guarded — verificare che il navigation fallback NON cachi `/auth/*` e `/~oauth`, e che `/pt` sia nello scope precache.
- **Install prompt PT**: il banner "Installa l'app" oggi presente solo in `/app` viene mostrato anche su `/pt` quando l'utente loggato ha ruolo `pt` e non è già in standalone.

Risultato: un PT che apre `/pt` da mobile può installare l'app come icona separata con identità teal "LIVELLAPP PT".

---

## 3) Onboarding/Setup iniziale PT

Wizard al primo login del PT (quando `pt_profiles.status = 'registrato'`), ispirato all'`AthleteOnboardingWizard` esistente.

Componente `src/components/pt/onboarding/PTOnboardingWizard.tsx` con 6 step (Framer Motion):

1. **Benvenuto** — video/illustrazione, breve presentazione di cosa potrà fare.
2. **Profilo professionale** — nome, foto, bio (min 80 caratteri), tipologia (`pt_types`).
3. **Specializzazioni & Certificazioni** — multiselect da catalogo (`pt_specializations`, `pt_certifications`), upload PDF certificato opzionale.
4. **Dove lavori** — Google Places autocomplete → salva città, indirizzo, lat/lng, raggio operativo, modalità (online/in presenza/entrambi).
5. **Pacchetti e disponibilità** — proposta di 3 pacchetti template (single session / 4 sessioni / mensile), modificabili. Slot settimanali base (`pt_availability`).
6. **Pronto!** — riepilogo + CTA "Vai alla dashboard". Lo status passa a `in_attesa_approvazione` (o `attivo` se admin ha disattivato la moderazione in `platform_settings`).

Gate: in `PTLayout`, se `pt_profiles.status === 'registrato'` ridirigi a `/pt/onboarding`. Il wizard è skippabile solo per gli step opzionali (3 e 5); 2 e 4 obbligatori per pubblicare il profilo.

Persistenza: ogni step salva subito su DB (autosave) così l'utente può riprendere dove ha lasciato.

---

## Dettagli tecnici

**Nuovi file**
- `src/pages/admin/AdminPTReadinessPage.tsx`
- `supabase/functions/admin-audit/index.ts` (aggiunta action `pt_readiness`)
- `src/components/pwa/DynamicManifest.tsx`
- `public/manifest-pt.webmanifest` + `public/icons/pt-{192,512,maskable}.png` (generate via imagegen)
- `src/components/pt/onboarding/PTOnboardingWizard.tsx` + step files
- `src/pages/pt/PTOnboardingPage.tsx` (rotta `/pt/onboarding`)

**File modificati**
- `src/App.tsx` — registra `/admin/pt-readiness` e `/pt/onboarding`
- `src/components/layouts/AdminLayout.tsx` — voce sidebar "Stato PT"
- `src/components/layouts/PTLayout.tsx` — redirect onboarding su status `registrato`
- `src/components/InstallPrompt.tsx` — abilita anche su `/pt`

**DB**: nessuna nuova tabella. Si riusano `pt_profiles`, `pt_profile_specializations`, `pt_profile_certifications`, `pt_availability`, `pt_packages`, `platform_settings`.

**Sicurezza**: tutte le letture audit passano dall'edge function `admin-audit` con check admin server-side (già esistente). Il wizard PT scrive solo su tabelle dell'utente loggato, protette da RLS `auth.uid() = user_id`.

---

## Cosa vedrai a fine implementazione

- Admin: una pagina che dimostra in un colpo d'occhio che ogni PT ha rotte, permessi, profilo e PWA allineati.
- PT su mobile: pulsante "Installa app" e icona LIVELLAPP PT teal sulla home dello smartphone.
- Nuovo PT al primo login: percorso guidato di 6 step che lo porta da "registrato" a profilo pubblicabile in meno di 5 minuti.
