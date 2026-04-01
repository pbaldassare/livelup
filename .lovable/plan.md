

## Piano: Sostituire "Tipologia" con selezione Coupon nel form creazione PT

### Problema
Nel form di creazione PT c'è il campo "Tipologia" (che nello screenshot appare come "Livello") che non serve. Al suo posto serve la selezione del coupon direttamente nel form di creazione, così quando il PT viene creato il link invito include già il coupon scelto.

### Modifiche in `src/pages/admin/AdminPTsPage.tsx`

1. **Rimuovere il campo "Tipologia"** (righe 679-695) dal form di creazione PT
2. **Aggiungere al suo posto un select "Coupon"** che usa la stessa lista `ptCoupons` già caricata, con le opzioni "Nessun coupon" + lista coupon attivi per PT
3. **Aggiungere `selectedCouponForCreate`** allo state del form (o riutilizzare `selectedCouponCode`) per passare il coupon scelto direttamente al dialog invito quando si apre dopo la creazione
4. **Rimuovere `pt_type_id`** dallo state `newPT` e dal body inviato a `create-user`
5. **Pre-selezionare il coupon nel dialog invito** con il valore scelto nel form di creazione, così il link generato è già completo

### Risultato
L'admin sceglie il coupon direttamente durante la creazione del PT, e il dialog invito si apre con il coupon già selezionato.

