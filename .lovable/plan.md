## Problema
Sulla pagina `/pt/coupons` il PT non vede le tipologie: oggi compaiono solo dentro il dialog dopo aver cliccato "Nuovo Coupon". Nel DB esistono 6 tipologie standard create dall'Admin (Benvenuto, Promo Pacchetto, Mese Omaggio, Sessione Bonus, Riattivazione, Referral) ma rimangono nascoste finché non si apre il flusso di creazione.

## Soluzione
Rendere il catalogo tipologie visibile direttamente nella pagina PT Coupons, sopra la lista coupon, con due sezioni: **Tipologie standard** (dall'Admin) e **Le mie tipologie** (personali). Da qui il PT può:
- vedere subito cosa può emettere (icona, nome, descrizione, limiti)
- cliccare una card standard per aprire direttamente lo Step 2 (form coupon precompilato con la tipologia scelta)
- creare/modificare/eliminare le proprie tipologie personali senza passare dal dialog "Nuovo Coupon"

Il dialog Step 1 (scelta tipologia da "Nuovo Coupon") resta come oggi, per chi preferisce il flusso guidato.

## Modifiche
- `src/pages/pt/PTCouponsPage.tsx`
  - Nuova `SectionCard` "Catalogo tipologie" sopra "Lista Coupon"
  - Grid responsive (2/3 colonne) con card cliccabili per standard + personali
  - Pulsanti "Crea tipologia" / "Modifica" / "Elimina" sulle card personali (riusano `tplForm`/`saveTplMutation`/`deleteTplMutation` già esistenti)
  - Click su card standard → `pickTemplate(t)` (già esistente) che apre lo Step 2
  - Badge "Standard" / "Personale" + chip con limiti (es. "max 30%", "max 30 gg")

Nessuna modifica DB, nessun cambio RLS, nessun nuovo componente.