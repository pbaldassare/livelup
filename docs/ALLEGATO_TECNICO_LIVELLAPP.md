# Allegato — Elenco delle funzioni di LIVELLAPP

**Prodotto:** LIVELLAPP  
**Ambito:** piattaforma digitale per Personal Trainer, Atleti e Amministrazione  
**Ambiente di riferimento:** https://livelapp.iaconnect.it  
**Data:** 20 luglio 2026

---

## Premessa

Questo allegato descrive, in forma di elenco, **tutte le funzioni principali** disponibili nel sistema LIVELLAPP.  
Il linguaggio è volutamente chiaro e orientato al contenuto funzionale (cosa si può fare), non agli aspetti tecnici di implementazione.

Il sistema è organizzato in tre ruoli distinti:

1. **Amministratore** — gestisce la piattaforma  
2. **Personal Trainer (PT)** — gestisce atleti, allenamenti, comunicazione e attività professionali  
3. **Atleta** — si allena, comunica col PT, segue progressi e servizi  

Il PT può lavorare da **computer (dashboard web)** e da **telefono (app / PWA)**.  
L’Atleta usa principalmente l’**app / PWA**.  
Esiste anche un’**area pubblica** (sito) per scoprire i PT, leggere contenuti e installare l’app.

---

## 1. Area pubblica (sito)

- Accesso alla piattaforma e installazione dell’app  
- Registrazione e accesso (login)  
- Scoperta dei Personal Trainer (elenco e scheda pubblica)  
- Lettura degli articoli / contenuti blog pubblici  
- Possibilità di arrivare tramite invito o codice coupon del PT  

---

## 2. Funzioni Amministratore

### 2.1 Panoramica e controllo

- Dashboard di sintesi sulla piattaforma  
- Consultazione delle attività e degli indicatori principali  
- Impostazioni generali della piattaforma  
- Mappa / panoramica delle sezioni del sistema  

### 2.2 Gestione Personal Trainer

- Elenco e gestione dei PT iscritti  
- Verifica dello stato / readiness dei PT  
- Supervisione dei profili professionali  

### 2.3 Cataloghi e contenuti

- Gestione del catalogo esercizi della piattaforma  
- Gestione corsi (struttura, sessioni, iscrizioni)  
- Gestione e moderazione Blog & Q&A (pubblicazione, nascondere, eliminare contenuti)  
- Gestione gruppi community a livello piattaforma  

### 2.4 Aspetti commerciali e operativi

- Gestione abbonamenti / piani  
- Gestione pagamenti  
- Gestione coupon e modelli di coupon  
- Supporto utenti (ticket e conversazioni di assistenza)  
- Messaggistica / comunicazioni di piattaforma  
- Registro delle operazioni rilevanti (audit)  

---

## 3. Funzioni Personal Trainer (computer e telefono)

Salvo diversa indicazione, le funzioni sotto sono disponibili sia da **dashboard web** sia da **app mobile** del PT (con interfaccia adattata).

### 3.1 Home e panoramica

- Visualizzazione della dashboard / home con sintesi attività  
- Accesso rapido alle sezioni principali  
- Invito di un atleta (link di installazione / referral)  

### 3.2 Gestione atleti

- Elenco degli atleti collegati  
- Ricerca e filtri sugli atleti  
- Scheda dettaglio atleta (anagrafica e informazioni operative)  
- Note private sull’atleta  
- Visualizzazione progressi dell’atleta  
- Gestione badge dell’atleta  
- Visualizzazione / gestione programmi assegnati  
- Impostazione della modalità di allenamento (in presenza, online, mista)  
- Attivazione / disattivazione del PT rispetto all’atleta  
- Creazione di un nuovo atleta  
- Trasferimento / cessione di atleti ad altri PT  
- Visualizzazione atleti ceduti / storico relativo  

### 3.3 Allenamenti e schede

- Creazione e modifica di schede / template di allenamento  
- Tre tipologie di scheda:
  - **Libera**
  - **Propedeutica**
  - **Progressiva**
- Organizzazione della scheda in blocchi ed esercizi  
- Supporto a protocolli di allenamento (standard, EMOM, AMRAP, superset, HIIT/Tabata, ecc.)  
- Assegnazione della scheda all’atleta  
- Assegnazione a più atleti  
- Programmi multi-settimana (pianificazione e assegnazione)  
- Consultazione storico allenamenti e risultati  
- Possibilità, dove previsto, di registrare l’allenamento per conto dell’atleta  
- Assistente per supportare la creazione delle schede  

### 3.4 Archivio esercizi e cataloghi

- Consultazione dell’archivio esercizi pubblico  
- Gestione degli esercizi personali del PT  
- Preferiti  
- Filtri per difficoltà, categoria, muscoli e ricerca testuale  
- Creazione di **cataloghi** personalizzati  
- Rinomina di un catalogo  
- Eliminazione di un catalogo  
- Apertura di un catalogo per vedere gli esercizi contenuti  
- Aggiunta e rimozione di esercizi da un catalogo  
- Assegnazione rapida di un esercizio a uno o più cataloghi  

### 3.5 Calendario, eventi e appuntamenti

- Gestione eventi  
- Calendario appuntamenti 1 a 1 con gli atleti  
- Creazione di un nuovo appuntamento  
- Gestione della disponibilità settimanale  
- Opzione per rendere la disponibilità prenotabile dagli atleti  
- Collegamento a Google Calendar  
- Sincronizzazione degli appuntamenti con Google Calendar (quando configurato)  

### 3.6 Messaggi e comunicazione

- Chat individuale con gli atleti collegati  
- Creazione e gestione di **gruppi chat** con più atleti  
- Visualizzazione e interazione nei **gruppi community**:
  - gruppi creati dal PT  
  - gruppi creati dai propri atleti  
- Invio e ricezione messaggi  
- Allegati (immagini / video, nei limiti previsti)  
- Indicatori di messaggi non letti  
- Gestione membri / impostazioni del gruppo (dove consentito)  

### 3.7 Gruppi community

- Creazione di un gruppo  
- Modifica del gruppo  
- Ingresso tramite invito / token  
- Chat di gruppo  
- Gestione membri e canali (incluso canale staff, dove previsto)  

### 3.8 Rete professionale

- Ricerca di altri Personal Trainer  
- Ricerca di professionisti (es. figure collegate / discoverable)  
- Visualizzazione scheda sintetica e profilo pubblico  

### 3.9 Blog & Q&A

- Creazione di contenuti (articolo, curiosità, Q&A)  
- Bozza / pubblicazione / gestione stato del contenuto  
- Elenco e modifica dei propri contenuti  
- (Lato admin) possibilità di moderazione  

### 3.10 Coupon, pagamenti e impostazioni

- Gestione coupon  
- Area pagamenti / pacchetti  
- Impostazioni profilo e preferenze  
- Notifiche  
- Logout  

---

## 4. Funzioni Atleta (app)

### 4.1 Accesso e avvio

- Onboarding  
- Home personale  
- Installazione / uso come app  
- Profilo e impostazioni  
- Aiuto / supporto  
- Notifiche  

### 4.2 Relazione con il Personal Trainer

- Scoperta e scelta del PT  
- Richiesta / gestione collegamento col PT  
- Visualizzazione del PT di riferimento  
- Prenotazione appuntamenti (se il PT ha reso disponibili gli slot)  
- Consultazione appuntamenti  

### 4.3 Allenamento

- Visualizzazione scheda / attività assegnate  
- Visualizzazione programma multi-settimana  
- Avvio e svolgimento dell’allenamento guidato  
- Registrazione serie per serie (ripetizioni, carico, durata, sforzo percepito)  
- Supporto ai diversi protocolli di allenamento  
- Possibilità di mettere in pausa / riprendere  
- Anteprima del prossimo esercizio  
- Su scheda **libera**: possibilità di riordinare gli esercizi prima di iniziare  
- Completamento allenamento con riepilogo (durata, serie, ripetizioni, volume)  
- Consultazione storico allenamenti  

### 4.4 Progressi e motivazione

- Monitoraggio progressi  
- Caricamento / consultazione foto progresso  
- Badge e riconoscimenti  
- Cheers / interazioni di incoraggiamento (nei limiti previsti)  
- Recensione del PT (quando maturati i requisiti)  

### 4.5 Comunicazione e community

- Chat con il proprio PT  
- Partecipazione ai gruppi chat  
- Creazione e partecipazione a gruppi community  
- Chat di gruppo  
- Eventi (dettaglio e partecipazione)  

### 4.6 Servizi aggiuntivi

- Area corsi  
- Coupon  
- Abbonamento / subscription  
- Documenti personali  
- Scheda professionista (dove applicabile)  

---

## 5. Funzioni trasversali (valide per più ruoli)

- Autenticazione sicura e gestione sessione  
- Separazione netta dei permessi per ruolo (ciascuno vede solo ciò che gli compete)  
- Notifiche in app  
- Notifiche push (dove attivate / consentite dal dispositivo)  
- Funzionamento da browser e come applicazione installabile (PWA)  
- Aggiornamento dell’app con avviso all’utente  
- Conservazione della pagina corrente dopo salvataggi / ripresa dell’app (esperienza mobile)  
- Interfaccia in italiano  

---

## 6. Flussi principali (in sintesi narrativa)

### Collegamento PT – Atleta

L’atleta e il PT possono avviare una richiesta di collegamento. Dopo l’accettazione il rapporto diventa attivo: l’atleta risulta collegato e può ricevere schede, messaggi e servizi dal PT. Un atleta ha un solo PT attivo alla volta.

### Assegnazione e svolgimento di un allenamento

Il PT prepara la scheda e la assegna. L’atleta la riceve in app, esegue l’allenamento guidato, registra i risultati e completa la sessione. Il PT può consultare lo storico e i progressi.

### Comunicazione

PT e atleta si scrivono in chat privata; possono anche comunicare in gruppi creati dal PT o nella community. Il PT, nella propria area messaggi, vede le conversazioni individuali e i gruppi rilevanti (propri e dei propri atleti).

### Appuntamenti

Il PT definisce disponibilità e crea appuntamenti. Se abilita la prenotazione, l’atleta può prenotare. Con Google Calendar collegato, gli appuntamenti possono sincronizzarsi sul calendario esterno.

### Contenuti e crescita professionale

Il PT può pubblicare Blog & Q&A, gestire coupon, cercare colleghi e professionisti, e organizzare esercizi in cataloghi riutilizzabili.

---

## 7. Cosa resta fuori o in evoluzione

Le funzioni seguenti possono essere parziali, in attivazione o da completare a seconda dell’ambiente e degli accordi commerciali:

- Pagamenti con addebito reale completo (es. Stripe in modalità piena)  
- Email automatiche su tutti gli eventi della piattaforma  
- Notifiche push completamente automatiche su ogni evento  
- Alcune integrazioni esterne (es. Google Calendar) richiedono configurazione e autorizzazioni  
- Funzioni di roadmap / evolutive (es. editor avanzato, feed sociale, diario alimentare, staff multi-collaboratore) non incluse come obbligo salvo diverso accordo  

---

## 8. Criteri di accettazione funzionali (checklist)

Si considera il sistema utilizzabile per i ruoli previsti quando risultano operativi, a campione, i seguenti punti:

**Amministratore:** accesso dashboard, gestione PT, esercizi, blog, supporto.  

**Personal Trainer:** gestione atleti, creazione e assegnazione schede, cataloghi, messaggi (individuali e gruppi), appuntamenti/disponibilità, blog, ricerca colleghi.  

**Atleta:** collegamento al PT, esecuzione allenamento, chat, progressi, prenotazione (se attiva).  

**Trasversale:** login corretto per ruolo, navigazione coerente su web e mobile.

---

*Fine elenco funzioni — Allegato LIVELLAPP.*
