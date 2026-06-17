## Cosa ho verificato

**1. Allineamento dati PT ↔ Atleta (Francesca Biazzi)**
- Connessione PT `Laura Bianchi (pt2@fitplatform.com)` ↔ Francesca: **attiva** in `pt_atleta_connections` ✅
- La PT vede correttamente l'atleta, storico allenamenti (10 totali, 6 completati, 4 attivi), anagrafica, obiettivi e telefono — coincidono con i dati del profilo atleta. ✅

**2. Sincronizzazione appuntamenti**
- Tabella `calendar_events` contiene 5 appuntamenti per Francesca, tutti con `pt_user_id = Laura Bianchi` e `category='appuntamento'`. ✅
- L'appuntamento "Sessione di allenamento" del 18/06 mostrato nel Calendario Appuntamenti PT è lo stesso letto da `AtletaAppuntamentiPage` lato atleta (stessa tabella, stesso filtro). **La sincronizzazione funziona correttamente.** ✅
- Entrambe le viste (PT `PTCalendarPage` e Atleta `AtletaAppuntamentiPage`) leggono da `calendar_events` filtrando per `pt_user_id`/`atleta_user_id` e `category='appuntamento'`.

**3. PDF documenti non visibili — causa identificata**
Query su `athlete_documents` per Francesca:

| Titolo | file_path |
|---|---|
| Visita medica sportiva non agonistica | **NULL** |
| Certificato agonistico | **NULL** |
| Consenso privacy firmato | **NULL** |
| ter | presente (PDF reale) |

→ 3 documenti su 4 sono **record di metadata seed senza file allegato**. Il componente `DocumentsTab` mostra correttamente "Nessun file allegato" perché lo storage è vuoto per quei record. **Non è un bug del codice**, è data seeding incompleto. L'unico PDF reale ("ter") infatti si vede come anteprima nello screenshot.

## Cosa propongo di fare

**Opzione A (consigliata)** — Pulire i 3 record-fantasma:
- Eliminare i 3 documenti senza `file_path` da `athlete_documents`, così Francesca/Laura vedono solo il documento reale ("ter") e possono ricaricare i veri PDF da UI.

**Opzione B** — Generare e caricare 3 PDF placeholder reali nello storage `athlete-documents` e collegarli ai 3 record (più "demo-friendly" ma falsi).

**Opzione C** — Lasciare tutto com'è (i record sono validi come promemoria di scadenza; mancano solo i file allegati).

Dimmi quale preferisci e procedo. Nessun fix di codice è necessario: PT, atleta e appuntamenti sono allineati.
