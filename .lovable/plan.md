
# Piano: Collegare la KPI card "Messaggi" alla route esistente

## Problema
La KPI card "Messaggi" (riga 182-187) non ha un `onClick` handler, quindi non naviga da nessuna parte quando cliccata.

## Soluzione
Aggiungere `onClick={() => navigate('/pt/messages')}` alla KPI card "Messaggi" a riga 182. La route `/pt/messages` è già usata dalla sidebar e dalle azioni rapide (riga 352).

Una sola riga aggiunta, zero duplicazioni.
