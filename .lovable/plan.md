

## Piano: Rimuovere piani Atleta dalla pagina Abbonamenti Admin

L'Admin gestisce solo i PT, non gli atleti direttamente. La pagina Piani e Abbonamenti deve mostrare solo i piani PT.

### Modifiche in `src/pages/admin/AdminSubscriptionsPage.tsx`

1. **Filtrare i piani** — aggiungere `.eq('target_role', 'pt')` alla query `subscription_plans` per caricare solo piani PT
2. **Filtrare le stats** — le subscription attive filtrate solo per piani PT
3. **Rimuovere colonna Target** — non serve più mostrare "PT/Atleta" se sono tutti PT
4. **Aggiornare titolo e descrizione** — "Piani PT" / "Gestisci i piani di abbonamento per i Personal Trainer"
5. **Form: forzare target_role='pt'** — nel `SubscriptionPlanForm`, pre-impostare e nascondere il campo target_role (o rimuoverlo)

### Modifiche in `src/components/admin/SubscriptionPlanForm.tsx`

- Rimuovere il selettore target_role o forzarlo a `'pt'` come default fisso

### Risultato
L'Admin vede solo piani PT, coerente con l'architettura dove gli atleti sono gestiti dai rispettivi PT.

