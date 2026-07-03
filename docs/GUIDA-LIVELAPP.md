# LIVEL APP — Guida completa al sistema

> Documento descrittivo per capire cosa fa la piattaforma, per chi la usa e come le parti si collegano tra loro. Linguaggio semplice, senza tecnicismi.

_Ultimo aggiornamento: giugno 2026_

---

## Cos’è LIVEL APP, in una frase

LIVEL APP è **un unico posto** dove un Personal Trainer gestisce atleti, schede, calendario, pagamenti e comunicazione — e dove l’atleta **si allena, segue il programma, chatta col coach e scopre eventi e professionisti** intorno a sé.

Non è solo un’app di allenamento: è **CRM + builder schede + calendario + chat + business** integrati.

---

## Tre mondi, tre porte d’ingresso

Il sistema ha **tre ruoli distinti**. Ognuno vede solo ciò che gli serve.

| Ruolo | Chi è | Dove entra | In sintesi |
|--------|--------|------------|------------|
| **Atleta** | Chi si allena | App sul telefono (`/app`) | Allenarsi, seguire il PT, scoprire, crescere |
| **Personal Trainer** | Il professionista | Dashboard web (`/pt`) + app mobile PT (`/pt/app`) | Gestire clienti, creare contenuti, fare business |
| **Admin** | Chi gestisce la piattaforma | Pannello web (`/admin`) | Approvare PT, abbonamenti, cataloghi globali, supporto |

C’è anche il **sito pubblico**: chi non è registrato può scoprire i trainer, leggere il blog, installare l’app.

---

## I “livelli” — cosa significano davvero

Nel sistema i **livelli** compaiono in posti diversi, ma l’idea è sempre la stessa: **capire a che punto è una persona o un contenuto**.

### Livello dell’atleta

Quando un atleta si iscrive, indica il proprio livello di forma (principiante, intermedio, avanzato, agonista). Serve al PT per **capire da dove partire** e filtrare chi ha davanti. Lo vedi nella scheda atleta e nelle richieste di collegamento.

### Livello delle schede ed esercizi

Ogni scheda o esercizio può avere un livello di difficoltà (principiante → agonista, oppure “non specificato”). Non è obbligatorio: serve a **organizzare l’archivio** e comunicare a chi è pensato quel lavoro.

### Livelli di stato (non di fitness)

- **PT:** registrato → in attesa approvazione → attivo → (eventualmente) premium o sospeso
- **Atleta:** non collegato → collegato a un PT → premium
- **Connessione PT–atleta:** richiesta in sospeso → attiva → terminata

Questi stati **aprono o chiudono funzioni**: ad esempio, senza un PT collegato l’atleta non ha schede assegnate; un PT non approvato non ha piena visibilità pubblica.

---

## Il filo che lega tutto: la connessione PT ↔ Atleta

È il **cuore relazionale** del sistema.

1. **Qualcuno fa una richiesta** (atleta cerca PT, o PT invita atleta).
2. **L’altra parte accetta o rifiuta.**
3. Quando la connessione è **attiva**, succede tutto il resto:
   - il PT può assegnare schede e programmi;
   - l’atleta vede i workout in app;
   - si apre la chat;
   - contano pacchetti e sessioni;
   - l’atleta può lasciare una recensione (dopo aver completato almeno un allenamento).

**Regola importante:** un atleta ha **un solo PT attivo** alla volta. Cambiare coach significa chiudere la connessione precedente.

---

## Flusso tipico — dalla creazione all’allenamento

Immagina la giornata tipo di un PT che usa tutto il sistema:

```
1. CREA nel catalogo (Assistente)
   → esercizio, scheda, protocollo, programma

2. ASSEGNA all’atleta (Assistente)
   → “Marco, scheda FORZA PURA, da lunedì a venerdì, lun/mer/ven”
   → nascono gli allenamenti sul calendario dell’atleta

3. L’atleta apre l’app
   → Home: “Allenamento di oggi” → Avvia
   → Logga set, peso, RPE, timer protocolli (EMOM, AMRAP, superset…)

4. Il PT monitora
   → Dashboard: chi ha allenato, richieste pendenti, eventi in arrivo
   → Dettaglio atleta: storico, badge, note

5. Comunicazione e business
   → Chat, notifiche, pacchetti sessioni, coupon, blog
```

**Creazione e assegnazione sono separate ma nella stessa pagina (Assistente):** prima costruisci il materiale, poi lo mandi alle persone giuste.

---

## Parte ATLETA — l’app sul telefono

L’atleta vive quasi tutto in **PWA mobile** (tema scuro, accent lime). Navigazione principale in basso:

| Sezione | Cosa fa |
|---------|---------|
| **Home** | Focus sul workout del giorno o su quello lasciato a metà. Pulsante per allenarsi subito. |
| **Programma** | Vista calendario/settimana degli allenamenti assegnati dal PT. |
| **Appuntamenti** | Sessioni e appuntamenti col PT o in palestra. |
| **Scopri** | Mappa e lista: PT vicini, eventi pubblici, nutrizionisti/fisioterapisti, filtri per specializzazione e distanza. |
| **Profilo** | Dati personali, badge, progressi, impostazioni. |

### Allenamento guidato

Quando l’atleta avvia un workout:

- vede esercizio per esercizio, con timer e pause;
- registra **serie, ripetizioni, peso, sensazione (RPE)**;
- protocolli speciali (EMOM, AMRAP, Tabata, superset…) hanno **player dedicati**;
- può **riprendere** un allenamento interrotto;
- al termine: aggiornamento progressi, badge, conteggio sessioni pacchetto.

### Scoperta e community

- **Trova un PT:** ricerca per città, mappa, recensioni, specializzazioni (Calisthenics, Functional, ecc.).
- **Eventi:** corsi, bootcamp, open day — iscrizione, lista d’attesa se i posti sono finiti, commenti.
- **Professionisti:** profili oltre al PT (nutrizione, fisioterapia…) con possibilità di prenotazione.
- **Corsi:** contenuti formativi della piattaforma (gestiti lato admin).

### Altro lato atleta

- **Chat** con il PT (messaggi in tempo reale, notifiche).
- **Progressi:** metriche e storico allenamenti.
- **Documenti:** file condivisi dal PT.
- **Coupon:** sconti ricevuti via link o dal coach.
- **Abbonamento / pacchetti:** sessioni rimanenti col PT.
- **Recensioni:** valutazione del PT dopo allenamenti completati.
- **Badge e gamification:** traguardi automatici + badge assegnati manualmente dal PT.
- **Notifiche push:** nuova scheda, messaggio, iscrizione evento, ecc.

---

## Parte PERSONAL TRAINER — due superfici

Il PT ha **due modi di lavorare**, pensati per contesti diversi.

### Dashboard web (`/pt`) — “ufficio”

Su computer: sidebar con tutte le aree operative.

| Area | Opportunità per il PT |
|------|------------------------|
| **Dashboard** | Numeri chiave: atleti attivi, allenamenti della settimana, incassi, richieste di collegamento, prossimi eventi. Grafici e report del giorno. |
| **Atleti** | Lista clienti, filtri, scheda dettaglio: obiettivi, livello, workout attivi/completati, badge, note private, assegnazione programmi. |
| **Allenamenti** | Libreria schede (template), modifica blocchi/esercizi, protocolli, duplicazione. |
| **Assistente** | **Crea nel catalogo:** scheda, programma, esercizio, protocollo — con frase guidata campo per campo. **Assegna ad atleta:** scheda o programma con date e giorni attivi, anteprima e salvataggio reale. |
| **Archivio esercizi** | Libreria personale + esercizi globali piattaforma, filtri muscoli/difficoltà. |
| **Gestione eventi** | Lista eventi con iscritti e commenti — “cosa succede, chi c’è, cosa dicono”. |
| **Cal. Eventi** | Vista calendario: quando hai roba in agenda (bootcamp, open gym…). |
| **Cal. Appuntamenti** | Sessioni 1:1, consulenze, slot in studio. |
| **Messaggi** | Chat con tutti gli atleti collegati. |
| **Pagamenti** | Proprio abbonamento a LIVEL + storico; gestione pacchetti venduti agli atleti. |
| **Coupon** | Codici sconto per acquisizione clienti (es. link con `ref` + `coupon` in registrazione). |
| **Blog** | Articoli sul profilo pubblico — marketing e autorità. |
| **Impostazioni** | Profilo, tipologie PT, galleria, certificati, push, slug pubblico. |

**Dettaglio evento** (3 tab): Panoramica | Iscritti (gestione, lista d’attesa, export) | Commenti (leggi e rispondi come organizzatore).

### App mobile PT (`/pt/app`) — “in palestra”

Su telefono: navigazione rapida — Home, Atleti, Calendario, Schede, Profilo. Nel menu “Altro”: esercizi, template, coupon, pagamenti, blog, impostazioni.

Su mobile la **dashboard web reindirizza automaticamente** all’app PT, salvo override `?view=web` per test.

### Profilo pubblico PT

Ogni trainer ha una **pagina pubblica**: bio, specializzazioni, recensioni, gallery, eventi, blog, link registrazione con coupon. È la **vetrina commerciale** collegata all’app.

### Protocolli di allenamento

Oltre alle serie classiche, il PT può costruire blocchi con logiche avanzate: EMOM, AMRAP, superset, Tabata, HIIT, ladder, top set + backoff, ecc. L’atleta li vive con **timer e istruzioni guidate** — non solo un PDF.

---

## Parte BUSINESS — soldi, crescita, piattaforma

### Lato PT (guadagnare e fidelizzare)

- **Pacchetti sessioni:** es. “10 sedute”, “mensile illimitato” — le sessioni **si scalano** quando l’atleta completa un workout.
- **Coupon personali:** promozioni per nuovi iscritti.
- **Blog + profilo pubblico:** acquisizione organica.
- **Eventi:** riempire bootcamp, open day, workshop — con gestione iscritti e comunicazione.
- **Recensioni:** reputazione visibile in Scopri.
- **Abbonamento a LIVEL:** il PT paga la piattaforma (piani gestiti da admin).

### Lato Admin (far girare il business della piattaforma)

| Area | Cosa controlla |
|------|----------------|
| **Dashboard** | KPI piattaforma: PT attivi, atleti, revenue, trend. |
| **Personal Trainers** | Approvazione nuovi PT, stati, sospensioni. |
| **Abbonamenti** | Piani piattaforma per i PT. |
| **Pagamenti** | Storico transazioni (integrazione Stripe in evoluzione). |
| **Coupon** | Coupon globali + catalogo template per i PT. |
| **Archivio esercizi** | Libreria condivisa da tutti i trainer. |
| **Corsi** | Contenuti formativi vendibili/distribuibili. |
| **Supporto** | Ticket assistenza PT/atleti. |
| **Audit & coerenza** | Controllo qualità dati e readiness PT. |
| **Sitemap / impostazioni** | Configurazione piattaforma. |

L’admin **non allena nessuno**: governa l’ecosistema in cui PT e atleti operano.

---

## Sito pubblico — prima che qualcuno si registri

- **Landing:** presentazione LIVEL, installazione PWA.
- **Scopri PT** (`/pts`): directory trainer.
- **Profilo PT** pubblico.
- **Blog** articoli.
- **Registrazione** con ruolo (PT o atleta), Google OAuth, parametri `ref` + `coupon` per tracciare chi ha portato l’utente.

---

## Come si collegano le parti — mappa mentale

```
Sito pubblico (Landing, Scopri, Blog)
        │
        ▼
   Registrazione ──► Admin approva PT (se trainer)
        │
        ▼
   Connessione PT ↔ Atleta (richiesta → attiva)
        │
        ├──► PT: Assistente (Crea catalogo → Assegna)
        │         │
        │         ▼
        │    Workout sull’atleta
        │         │
        │         ▼
        └──► Atleta: Home → Allenamento guidato → Progressi/Badge
                  │
                  ├── Chat, Notifiche
                  ├── Eventi (Scopri → Iscrizione)
                  └── Pacchetti / Coupon / Recensioni

Admin: piani abbonamento, catalogo globale, corsi, supporto, audit
```

**In parole semplici:** l’admin prepara il terreno → il PT crea contenuti e clienti → la connessione attiva sblocca assegnazioni e chat → l’atleta esegue e genera dati → il PT e la piattaforma monetizzano e fidelizzano.

---

## Notifiche — il collante invisibile

Il sistema avvisa quando succede qualcosa di rilevante:

- nuova richiesta di collegamento;
- nuovo messaggio;
- scheda o programma assegnato;
- iscrizione a un evento;
- commento su un evento;
- recensione ricevuta.

Così PT e atleta **non devono stare dentro l’app** per non perdere opportunità.

---

## Gamification — motivazione senza complicazioni

- **Badge automatici** al completamento traguardi (es. numero workout).
- **Badge manuali** dal PT (“Campione del mese”).
- **Cheers** tra atleti (con limiti giornalieri).
- **Progressi** e foto (dove abilitato).

Tutto alimenta il **senso di progresso** che tiene l’atleta attivo — e quindi il business del PT.

---

## Cosa è già solido vs cosa è in arrivo

| Già operativo | In evoluzione / pending |
|---------------|-------------------------|
| Creazione catalogo + assegnazione (Assistente) | Pagamenti Stripe live (oggi in parte mock) |
| Workout guidato + protocolli | Email transazionali automatiche |
| Chat, calendario, eventi, gestione iscritti | Push automatici su ogni trigger (parzialmente manuali) |
| Scoperta PT con mappa, recensioni, coupon | Test automatici E2E su tutti i flussi |
| Admin, corsi, supporto, audit | Feature wishlist (feed squadra, diario alimentare…) |

---

## Opportunità di valore — per ruolo

### Se sei Atleta

Un solo posto per **sapere cosa fare oggi**, registrare il lavoro, parlare col coach, trovare eventi e specialisti, vedere i progressi e sentirti motivato — senza PDF sparsi e chat su WhatsApp.

### Se sei Personal Trainer

Sostituisci fogli Excel, app separate per schede/chat/pagamenti/calendario. **Crei una volta, assegni in pochi click**, segui chi si iscrive agli eventi, costruisci reputazione online e vendi pacchetti con sessioni che si contano da sole.

### Se sei Admin / business

Hai **visibilità e controllo** su chi entra, quanto paga, quali contenuti globali esistono, supporto e qualità — un unico prodotto SaaS fitness invece di tool frammentati.

---

## Riferimento rapido percorsi

| Percorso | Chi |
|----------|-----|
| `/` `/auth` `/pts` `/blog` | Pubblico |
| `/app/*` | Atleta |
| `/pt/*` | PT dashboard web |
| `/pt/app/*` | PT mobile |
| `/admin/*` | Admin |

---

## Assistente PT — riepilogo funzioni

Due macro-aree nella stessa pagina (`/pt/assistant`):

**CREA NEL CATALOGO**

- Crea scheda
- Crea programma
- Crea esercizio
- Crea protocollo

**ASSEGNA AD ATLETA**

- Assegna scheda (atleta + scheda + date + giorni attivi → N workout)
- Assegna programma (atleta + programma + inizio + giorni → rotazione schede)

Ogni azione usa una **frase guidata** (campi inline) e un’**anteprima** prima del salvataggio.

---

## Gestione eventi vs Calendario eventi

| Strumento | Domanda a cui risponde |
|-----------|------------------------|
| **Cal. Eventi** | *Quando* ho roba in agenda? (vista temporale) |
| **Gestione eventi** | *Cosa succede, chi c’è, cosa dicono?* (lista, iscritti, commenti, modifica) |

---

_Documento di riferimento per team, onboarding e presentazioni. Per dettagli tecnici e regole di sviluppo, vedi `CLAUDE.md` e `CURSOR.md`._
