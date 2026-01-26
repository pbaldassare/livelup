
# Piano: Sistema Abbonamenti Completo con Piani Personalizzabili

## Panoramica

Implementazione di un sistema di abbonamenti a due livelli:
1. **Piani Piattaforma (Admin)**: Piani standard gestiti dall'amministratore (es. PT Base, PT Premium, Atleta Free, Atleta Premium)
2. **Pacchetti PT Personalizzati**: Ogni Personal Trainer puo creare pacchetti specifici per i propri atleti (es. 10 sedute, mensile, trimestrale)

## Architettura del Sistema

```text
+------------------------+
|   ADMIN DASHBOARD      |
|------------------------|
|  Gestione Piani        |
|  Piattaforma           |
|  (subscription_plans)  |
+----------+-------------+
           |
           v
+------------------------+       +------------------------+
|   PT DASHBOARD         |       |   ATLETA APP           |
|------------------------|       |------------------------|
|  - Vede piano attivo   |       |  - Vede abbonamento    |
|  - Crea pacchetti      |       |    piattaforma         |
|    personalizzati      |       |  - Vede pacchetti PT   |
|  (pt_packages)         |       |  - Acquista/Rinnova    |
+------------------------+       +------------------------+
```

---

## Parte 1: Completamento Gestione Admin

### 1.1 Database (Nessuna Modifica)
La tabella `subscription_plans` esiste gia con tutti i campi necessari.

### 1.2 AdminSubscriptionsPage.tsx - Funzionalita Complete

Implementare:
- **Creazione Piano**: Form completo con tutti i campi (nome, descrizione, target, tipo, prezzi, features, trial, ecc.)
- **Modifica Piano**: Dialog per modificare piani esistenti
- **Eliminazione Piano**: Conferma e soft-delete (disattivazione)
- **Ordinamento**: Drag and drop per sort_order
- **Statistiche Migliorate**: Calcolo entrate stimate basato su abbonamenti attivi

Campi del form di creazione:
- Nome piano (obbligatorio)
- Descrizione
- Target: PT o Atleta
- Tipo piano: atleta_free, atleta_premium, pt_base, pt_premium
- Prezzo mensile (obbligatorio)
- Prezzo annuale (opzionale, con sconto automatico suggerito)
- Giorni trial (default 14)
- Features (array dinamico con aggiunta/rimozione)
- Max atleti (solo per PT)
- Include chat, video call, analytics
- Storage GB
- Stripe Price ID (per integrazione futura)
- Attivo / In evidenza

---

## Parte 2: Pacchetti Personalizzati PT

### 2.1 Nuova Tabella Database: pt_packages

Creare una nuova tabella per i pacchetti personalizzati dei PT:

```sql
CREATE TYPE package_type AS ENUM ('sessioni', 'mensile', 'trimestrale', 'semestrale', 'annuale', 'custom');

CREATE TABLE public.pt_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pt_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Info base
  name TEXT NOT NULL,
  description TEXT,
  package_type package_type NOT NULL,
  
  -- Pricing
  price DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  
  -- Per pacchetti a sessioni
  sessions_count INTEGER, -- NULL per abbonamenti temporali
  
  -- Per abbonamenti temporali
  duration_days INTEGER, -- NULL per pacchetti a sessioni
  
  -- Features e limiti
  includes_chat BOOLEAN DEFAULT true,
  includes_video_calls BOOLEAN DEFAULT false,
  max_workouts_per_week INTEGER,
  
  -- Visibilita
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  
  -- Metadata
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.pt_packages ENABLE ROW LEVEL SECURITY;

-- PT puo gestire i propri pacchetti
CREATE POLICY "PT can manage own packages"
  ON public.pt_packages FOR ALL
  USING (auth.uid() = pt_user_id AND is_pt(auth.uid()));

-- Atleti collegati possono vedere i pacchetti del loro PT
CREATE POLICY "Connected atleti can view PT packages"
  ON public.pt_packages FOR SELECT
  USING (is_atleta(auth.uid()) AND are_connected(pt_user_id, auth.uid()) AND is_active = true);

-- Admin puo vedere tutti
CREATE POLICY "Admins can view all packages"
  ON public.pt_packages FOR SELECT
  USING (is_admin(auth.uid()));
```

### 2.2 Nuova Tabella: atleta_pt_subscriptions

Per tracciare gli acquisti di pacchetti PT da parte degli atleti:

```sql
CREATE TYPE pt_subscription_status AS ENUM ('attivo', 'completato', 'scaduto', 'cancellato');

CREATE TABLE public.atleta_pt_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atleta_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pt_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  package_id UUID REFERENCES public.pt_packages(id) ON DELETE SET NULL,
  
  -- Status
  status pt_subscription_status NOT NULL DEFAULT 'attivo',
  
  -- Per pacchetti a sessioni
  sessions_total INTEGER,
  sessions_used INTEGER DEFAULT 0,
  sessions_remaining INTEGER GENERATED ALWAYS AS (sessions_total - sessions_used) STORED,
  
  -- Per abbonamenti temporali
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  
  -- Pricing info (snapshot al momento dell'acquisto)
  price_paid DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.atleta_pt_subscriptions ENABLE ROW LEVEL SECURITY;

-- Atleta vede i propri abbonamenti
CREATE POLICY "Atleta can view own subscriptions"
  ON public.atleta_pt_subscriptions FOR SELECT
  USING (auth.uid() = atleta_user_id AND is_atleta(auth.uid()));

-- PT vede abbonamenti dei propri atleti
CREATE POLICY "PT can view and manage subscriptions"
  ON public.atleta_pt_subscriptions FOR ALL
  USING (auth.uid() = pt_user_id AND is_pt(auth.uid()));

-- Admin vede tutto
CREATE POLICY "Admins can manage all"
  ON public.atleta_pt_subscriptions FOR ALL
  USING (is_admin(auth.uid()));
```

---

## Parte 3: Interfacce Utente

### 3.1 PT Dashboard - Nuova Sezione "I Miei Pacchetti"

Aggiungere in PTSettingsPage.tsx o creare una nuova pagina dedicata:

**Lista Pacchetti:**
- Card per ogni pacchetto con nome, tipo, prezzo, sessioni/durata
- Badge "In evidenza" per pacchetti consigliati
- Toggle attivo/disattivo inline
- Pulsanti modifica/elimina

**Dialog Creazione/Modifica:**
- Nome pacchetto
- Tipo (sessioni / mensile / trimestrale / semestrale / annuale / custom)
- Se tipo = sessioni: numero sessioni
- Se tipo temporale: durata automatica in giorni
- Prezzo
- Descrizione
- Include chat / video call
- Max allenamenti/settimana

### 3.2 Atleta App - Visualizzazione Pacchetti PT

Nella pagina di dettaglio PT o in una sezione dedicata:
- Lista pacchetti offerti dal PT connesso
- Card con prezzo, descrizione, features
- Pulsante "Acquista" (per ora toast, integrazione Stripe futura)

### 3.3 PT Dashboard - Gestione Abbonamenti Atleti

Nuova sezione per vedere:
- Quali atleti hanno acquistato pacchetti
- Stato (attivo, sessioni rimanenti, scadenza)
- Possibilita di aggiungere sessioni bonus
- Storico acquisti

---

## File da Creare/Modificare

### Database (Migration)
1. `supabase/migrations/xxx_pt_packages.sql` - Nuove tabelle e policies

### Frontend
1. `src/pages/admin/AdminSubscriptionsPage.tsx` - Completare CRUD piani
2. `src/pages/pt/PTSettingsPage.tsx` - Aggiungere tab "I Miei Pacchetti"
3. `src/components/pt/PTPackagesManager.tsx` - Nuovo componente gestione pacchetti
4. `src/pages/atleta/AtletaPTProfilePage.tsx` - Mostrare pacchetti PT
5. `src/pages/pt/PTAthletesPage.tsx` - Sezione abbonamenti atleti

---

## Dettaglio Implementazione Step-by-Step

### Step 1: Admin - Completare Gestione Piani
- Form state con useState per tutti i campi
- Mutation per INSERT/UPDATE/DELETE
- Validazione campi obbligatori
- Dialog separato per modifica vs creazione
- Calcolo entrate stimate: somma(prezzo * abbonamenti attivi per tipo)

### Step 2: Database - Nuove Tabelle
- Creare migration con enum, tabelle, RLS
- Trigger per updated_at

### Step 3: PT - Gestione Pacchetti
- Query per fetch pacchetti del PT
- CRUD mutations
- UI con DataTable o Cards
- Dialog creazione simile ad Admin

### Step 4: Atleta - Visualizzazione
- Query pacchetti del PT connesso
- Cards con info e CTA acquisto

### Step 5: PT - Monitoraggio Abbonamenti
- Dashboard abbonamenti attivi
- Azioni: estendi, aggiungi sessioni

---

## Criteri di Accettazione

1. Admin puo creare, modificare, disattivare piani piattaforma con tutti i campi
2. PT puo creare pacchetti personalizzati (sessioni o temporali)
3. Atleti connessi vedono i pacchetti del proprio PT
4. Sistema traccia abbonamenti atleta-PT con sessioni rimanenti o scadenza
5. RLS impedisce accessi non autorizzati
6. UI coerente con design system esistente (teal per admin/PT, dark+lime per atleta)
