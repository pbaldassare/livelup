

## Piano: Tipologia PT — tabella database + gestione admin + integrazione nel form di creazione

### Cosa cambia

1. **Nuova tabella `pt_types`** nel database con valori iniziali (Fitness, Calisthenics, Yoga, Pilates, Powerlifting, Functional Training, CrossFit, Bodybuilding, Riabilitazione, Sport Performance).
   - Colonne: `id`, `name`, `description`, `is_active`, `sort_order`, `created_at`
   - RLS: admin CRUD completo, lettura per utenti autenticati
   - Colonna `pt_type_id` aggiunta alla tabella `pt_profiles` (FK opzionale verso `pt_types`)

2. **Form creazione PT** (`AdminPTsPage.tsx`)
   - Rimuovo il campo "Livello" dal dialog di creazione
   - Aggiungo un select "Tipologia" che carica le opzioni dalla tabella `pt_types`
   - Il valore scelto viene salvato in `pt_profiles.pt_type_id`
   - Aggiorno anche la tabella lista PT per mostrare la tipologia al posto del livello

3. **Nuova sezione in Impostazioni Admin** (`AdminSettingsPage.tsx`)
   - Aggiungo un tab "Categorie" con gestione CRUD delle tipologie PT
   - Possibilità di aggiungere, modificare nome/descrizione, attivare/disattivare, riordinare

4. **Edge function `create-user`**
   - Sostituisco `level` con `pt_type_id` nei dati del profilo PT

### Dettagli tecnici

**Migration SQL:**
```sql
CREATE TABLE public.pt_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pt_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage pt_types" ON public.pt_types FOR ALL TO public USING (is_admin(auth.uid()));
CREATE POLICY "Authenticated can view active pt_types" ON public.pt_types FOR SELECT TO authenticated USING (is_active = true);

-- Populate
INSERT INTO public.pt_types (name, sort_order) VALUES
  ('Fitness', 1), ('Calisthenics', 2), ('Yoga', 3), ('Pilates', 4),
  ('Powerlifting', 5), ('Functional Training', 6), ('CrossFit', 7),
  ('Bodybuilding', 8), ('Riabilitazione', 9), ('Sport Performance', 10);

-- Add FK column to pt_profiles
ALTER TABLE public.pt_profiles ADD COLUMN pt_type_id uuid REFERENCES public.pt_types(id);
```

**File modificati:**
- `AdminPTsPage.tsx` — rimuovo "Livello", aggiungo "Tipologia" nel form e nella tabella
- `AdminSettingsPage.tsx` — nuovo tab "Categorie" con CRUD tipologie
- `create-user/index.ts` — accetta `pt_type_id` al posto di `level`

