
# Piano: Sistema Multi-Categoria "Scopri" con PT, Eventi e Professionisti

## Obiettivo

Ristrutturare la pagina "Scopri" per atleti non connessi aggiungendo:
1. Una selezione a tabs/segmented control per categoria (PT, Eventi, Professionisti)
2. Nuova categoria "Professionisti" con sottocategorie (Nutrizionisti, Fisioterapisti)
3. Dati fake per i nuovi professionisti
4. Layout grafico coerente con il design esistente (tema scuro + lime)

---

## Architettura della Soluzione

```text
SCOPRI PAGE (Atleta non connesso)
┌─────────────────────────────────────────────────────────────────┐
│  Header: "Scopri"                                               │
├─────────────────────────────────────────────────────────────────┤
│  [Personal Trainer]  [Eventi]  [Professionisti]   <- Tabs       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Tab "Personal Trainer" → Vista esistente (ricerca PT)          │
│                                                                 │
│  Tab "Eventi" → Lista eventi pubblici                           │
│                                                                 │
│  Tab "Professionisti" → Sottocategorie:                         │
│     • Nutrizionisti                                             │
│     • Fisioterapisti                                            │
│     (Card simili ai PT ma con dati specifici)                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Modifiche Previste

### 1. Database (Nuova Tabella)

Creare una nuova tabella `professional_profiles` per gestire i professionisti:

```sql
CREATE TABLE professional_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  profession_type TEXT NOT NULL, -- 'nutrizionista', 'fisioterapista'
  bio TEXT,
  specializations TEXT[],
  hourly_rate DECIMAL(10,2),
  rating_avg DECIMAL(3,2),
  review_count INTEGER DEFAULT 0,
  offers_online BOOLEAN DEFAULT false,
  offers_in_person BOOLEAN DEFAULT true,
  location_city TEXT,
  location_lat DECIMAL(10,7),
  location_lng DECIMAL(10,7),
  experience_years INTEGER,
  is_discoverable BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'attivo',
  certifications TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

### 2. Dati Fake (Seed Function)

Aggiungere al file `seed-platform-data/index.ts` dati demo per:

| Tipo | Quantita | Esempio |
|------|----------|---------|
| Nutrizionisti | 4 | "Dott.ssa Giulia Verdi - Nutrizione sportiva" |
| Fisioterapisti | 4 | "Dott. Marco Bianchi - Riabilitazione muscolare" |

Specializzazioni Nutrizionisti:
- Nutrizione Sportiva
- Diete Personalizzate
- Integrazione Alimentare
- Disturbi Alimentari
- Nutrizione Vegana

Specializzazioni Fisioterapisti:
- Riabilitazione Sportiva
- Terapia Manuale
- Posturale
- Massoterapia
- Recupero Infortuni

---

### 3. Frontend - AtletaDiscoverPage.tsx

#### 3.1 Nuovo State per Categoria

```typescript
const [activeCategory, setActiveCategory] = useState<'pt' | 'events' | 'professionals'>('pt');
const [professionalType, setProfessionalType] = useState<'nutrizionista' | 'fisioterapista'>('nutrizionista');
```

#### 3.2 Nuovo Header con Tabs Categoria

Aggiungere sotto l'header principale:

```tsx
<Tabs value={activeCategory} onValueChange={setActiveCategory}>
  <TabsList className="w-full bg-app-muted">
    <TabsTrigger value="pt">Personal Trainer</TabsTrigger>
    <TabsTrigger value="events">Eventi</TabsTrigger>
    <TabsTrigger value="professionals">Professionisti</TabsTrigger>
  </TabsList>
</Tabs>
```

#### 3.3 Rendering Condizionale

```tsx
{activeCategory === 'pt' && <PTSearchView />}
{activeCategory === 'events' && <EventsListView />}
{activeCategory === 'professionals' && <ProfessionalsView />}
```

---

### 4. Nuovo Componente: ProfessionalsView

Creare `src/components/app/ProfessionalsSection.tsx`:

- Sottotabs per tipo (Nutrizionisti / Fisioterapisti)
- Card professionista simile a PT card
- Filtri per specializzazione e citta
- Link al profilo dettaglio (futuro)

---

### 5. Nuovo Componente: ProfessionalCard

Creare `src/components/app/ProfessionalCard.tsx`:

Design identico a PT card con:
- Avatar + nome
- Rating e recensioni
- Specializzazioni badge
- Citta e tariffa
- Icona specifica per tipo (Stethoscope per fisio, Apple per nutrizionista)

---

### 6. Eventi per Atleti Non Connessi

Modificare la logica per mostrare gli eventi anche agli atleti non connessi nella tab "Eventi".

---

## File da Modificare/Creare

| File | Azione |
|------|--------|
| Nuova migrazione SQL | Creare tabella `professional_profiles` |
| `supabase/functions/seed-platform-data/index.ts` | Aggiungere dati fake professionisti |
| `src/pages/atleta/AtletaDiscoverPage.tsx` | Ristrutturare con tabs categoria |
| `src/components/app/ProfessionalsSection.tsx` | NUOVO - Vista professionisti |
| `src/components/app/ProfessionalCard.tsx` | NUOVO - Card singolo professionista |
| `src/integrations/supabase/types.ts` | Aggiornato automaticamente |

---

## Struttura Grafica

```text
┌─────────────────────────────────────────────────────────────────┐
│  SCOPRI                                           [⬤ PT attivo] │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┬────────────┬───────────────┐                   │
│  │  PT         │   Eventi   │ Professionisti│   <- Tabs lime    │
│  └─────────────┴────────────┴───────────────┘                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Se "Professionisti" selezionato:                               │
│                                                                 │
│  ┌──────────────────┬───────────────────┐                       │
│  │  🍎 Nutrizionisti │  🩺 Fisioterapisti│   <- Sottotabs       │
│  └──────────────────┴───────────────────┘                       │
│                                                                 │
│  ┌─────────────────────────────────────┐                        │
│  │  [Avatar]  Dott.ssa Giulia Verdi    │                        │
│  │            ⭐ 4.8 (12 recensioni)   │                        │
│  │            📍 Milano | €80/h        │                        │
│  │            [Nutrizione Sportiva]    │                        │
│  └─────────────────────────────────────┘                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Dati Fake da Inserire

### Nutrizionisti (4)

1. Dott.ssa Giulia Verdi - Milano - Nutrizione Sportiva, Diete Personalizzate - €80/h
2. Dott. Alessandro Rossi - Roma - Integrazione Alimentare, Nutrizione Vegana - €70/h
3. Dott.ssa Francesca Neri - Brescia - Disturbi Alimentari, Diete Personalizzate - €90/h
4. Dott. Luca Marino - Torino - Nutrizione Sportiva, Integrazione - €75/h

### Fisioterapisti (4)

1. Dott. Marco Bianchi - Milano - Riabilitazione Sportiva, Terapia Manuale - €60/h
2. Dott.ssa Sara Conti - Roma - Posturale, Massoterapia - €55/h
3. Dott. Andrea Ferraro - Brescia - Recupero Infortuni, Riabilitazione - €65/h
4. Dott.ssa Elena Galli - Bologna - Terapia Manuale, Posturale - €58/h

---

## Note Tecniche

1. La tabella `professional_profiles` e separata da `pt_profiles` per mantenere la modularita
2. I professionisti NON usano il sistema di connessione atleta-PT esistente
3. Per ora i profili professionisti sono solo visualizzabili (no booking/chat)
4. Le RLS policies permetteranno la lettura pubblica dei profili discoverable
5. Il seed inserisce dati con `user_id` fittizi (UUID generati) - non collegati a utenti reali

---

## Riepilogo Operazioni

| Categoria | File | Modifiche |
|-----------|------|-----------|
| Database | 1 migrazione | Nuova tabella |
| Edge Function | 1 file | Seed dati fake |
| Frontend | 3-4 file | Ristrutturazione + nuovi componenti |
| **Totale** | **~5-6 file** | - |
