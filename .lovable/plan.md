

## Piano: Coupon Admin per PT con tipo "mesi gratis" + link invito + seed coupon reali

### Problema attuale
La tabella `coupons` ha solo due tipi: `percentage` e `fixed_amount`. Manca il tipo `free_months` (mesi gratis). Inoltre non c'è un meccanismo per generare un link di invito PT con coupon allegato.

### 1. Migrazione DB

**Estendere l'enum `coupon_type`** aggiungendo `free_months`:
```sql
ALTER TYPE public.coupon_type ADD VALUE 'free_months';
```

**Aggiungere campo `free_months`** alla tabella coupons:
```sql
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS free_months INTEGER;
```

**Inserire 3 coupon reali** (scadenza 5 anni = 2031-04-01):
- `WELCOME1MESE` — 1 mese gratis, tipo `free_months`, free_months=1
- `WELCOME3MESI` — 3 mesi gratis, tipo `free_months`, free_months=3
- `SCONTO10` — 10% di sconto, tipo `percentage`, discount_value=10

Tutti con `is_active=true`, `valid_until='2031-04-01'`, `applicable_roles='{pt}'`.

### 2. Aggiornare AdminCouponsPage

- Aggiungere il tipo `free_months` (Mesi Gratis) nel select del form di creazione
- Mostrare campo "Mesi gratis" quando il tipo è `free_months`
- Aggiornare la colonna "Sconto" nella tabella per mostrare "X mesi gratis" per il tipo `free_months`

### 3. Aggiornare AdminPTsPage — Link invito con coupon

Dopo la creazione di un PT, mostrare un dialog con:
- Link di invito personalizzato: `{origin}/auth?ref={ptUserId}&coupon={codice}`
- Select per scegliere un coupon da allegare al link
- Bottone "Copia link" per copiare negli appunti

Aggiungere anche un'azione nel menu di ogni PT per "Genera link invito" con la stessa logica.

### 4. File da modificare

| File | Cosa |
|------|------|
| Migrazione SQL | Enum + colonna + seed 3 coupon |
| `src/pages/admin/AdminCouponsPage.tsx` | Tipo `free_months` nel form e nella tabella |
| `src/pages/admin/AdminPTsPage.tsx` | Dialog link invito con coupon dopo creazione + azione menu |

