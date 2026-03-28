

## Piano: Seed piani abbonamento piattaforma + pacchetti PT standard

### Panoramica
Inserire 3 piani di abbonamento piattaforma nella tabella `subscription_plans` e creare pacchetti PT di default nella tabella `pt_packages` come template standard per ogni nuovo PT. Il tutto via migration SQL.

### 1. Migration SQL — Seed 3 piani piattaforma (`subscription_plans`)

Inserire 3 piani:

| Piano | Target | Tipo | Prezzo/mese | Prezzo/anno | Trial | Features |
|-------|--------|------|-------------|-------------|-------|----------|
| **Atleta Free** | atleta | atleta_free | €0 | - | 0 | Allenamenti base, 1 PT, chat |
| **Atleta Premium** | atleta | atleta_premium | €9.99 | €89.99 | 14gg | Allenamenti illimitati, analytics, video call, foto progresso |
| **PT Premium** | pt | pt_premium | €19.99 | €179.99 | 30gg | Fino a 50 atleti, chat, analytics, video call, 10GB storage |

Ogni piano con `is_active = true`, features come array JSON, e `sort_order` crescente.

### 2. Migration SQL — Seed 3 pacchetti PT standard (`pt_packages`)

Creare pacchetti "template" per ogni PT esistente. Per fare questo:
- Per ogni PT in `pt_profiles`, inserire 3 pacchetti default:

| Pacchetto | Tipo | Prezzo | Sessioni | Durata |
|-----------|------|--------|----------|--------|
| **Pacchetto Base** | sessioni | €99 | 8 sessioni | - |
| **Pacchetto Mensile** | temporale | €149 | - | 30gg |
| **Pacchetto Trimestrale** | temporale | €399 | - | 90gg |

- I pacchetti vengono creati come `is_active = true` e il PT potrà poi modificarli/eliminarli dalla sua dashboard.

### 3. Nessuna modifica UI necessaria
- La pagina admin `AdminSubscriptionsPage` ha già CRUD completo (crea, modifica, elimina, toggle attivo).
- Il componente `PTPackagesManager` ha già CRUD per i pacchetti PT.
- Dopo il seed, i piani compariranno immediatamente nelle rispettive pagine.

### File coinvolti
- **Migration SQL** — seed `subscription_plans` + seed `pt_packages` per tutti i PT esistenti

