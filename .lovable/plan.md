## Obiettivo
Trasformare i commenti evento in un thread "domanda → risposta": ogni commento può avere una risposta nidificata sotto, visivamente collegata.

## Modello dati
- Aggiungere colonna `parent_comment_id uuid` su `event_comments` (FK self-ref, ON DELETE CASCADE).
- Indice su `parent_comment_id`.
- Le policy RLS esistenti rimangono valide (stesso `event_id`).

## Backend API (`src/lib/api/eventComments.ts`)
- `EventCommentRow` include `parent_comment_id`.
- `loadEventComments` ritorna struttura ad albero: array di root con `replies: EventCommentRow[]` (1 livello di profondità).
- `postEventComment(eventId, userId, content, parentId?)` accetta parent opzionale.

## UI (`EventCommentsPanel` su `PTEventDetailPage` + lato atleta `AtletaEventDetailPage`)
- Ogni commento root mostra:
  - Header autore + testo (come ora).
  - Pulsante "Rispondi" (solo organizzatore evento, oppure tutti — vedi domanda sotto).
  - Eventuali repliche annidate sotto, indentate con bordo sinistro accent, badge "Risposta".
- Cliccando "Rispondi" appare inline una textarea + bottoni Invia/Annulla; submit invia con `parent_comment_id`.
- Form principale in cima resta per nuovi commenti root.
- Limite: 1 livello di nesting (le repliche non possono essere ulteriormente risposte) per evitare thread profondi.

## Regole
- Eliminazione di un root cancella in cascade le repliche (DB).
- Notifiche: quando viene postata una risposta, notifica anche l'autore del commento parent (oltre al creatore evento) — riusare trigger esistente esteso.

## Domanda aperta
Chi può rispondere: **solo l'organizzatore** (PT creatore evento) come nello screenshot ("Scrivi una risposta come organizzatore"), o **tutti** gli utenti possono rispondere a qualunque commento? Procedo con: solo organizzatore può usare "Rispondi" su commenti altrui; tutti possono scrivere commenti root.
