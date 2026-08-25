# Prompt Lovable — zip di tutto lo Storage

Incolla questo nel progetto **vecchio** Livelapp (backend `uiowzycolsmgcsvihmhy`).

```text
Ciao. Serve UN SOLO output: uno (o più) ZIP scaricabile con TUTTI i file dello Storage del progetto VECCHIO.

Contesto:
- Stiamo migrando Livelapp sul nuovo backend (ref kxgaqnksylntokyrpaxp).
- Schema, dati public e Auth sono già sul nuovo DB.
- NON toccare il database nuovo. NON cancellare nulla sul vecchio. NON modificare il frontend. NON cambiare URL nel DB.

Cosa fare:
1) Elenca tutti i bucket Storage (attesi: avatars, cover-images, pt-gallery, pt-certificates, exercise-images, exercise-videos, event-covers, progress-photos, athlete-documents, chat-attachments, group-chat-attachments, group-images). Includi anche eventuali bucket extra.
2) Scarica OGNI oggetto di OGNI bucket, anche i bucket privati (progress-photos, athlete-documents, chat-attachments, group-chat-attachments, group-images).
3) Crea uno ZIP scaricabile. Dentro lo zip i path devono essere:
   <bucket>/<path-originale>
   Esempio: avatars/<user_id>/foto.jpg
   NON appiattire i nomi. NON rinominare i file. Path originali invariati.
4) Aggiungi nel zip un file manifest.json (o manifest.csv) con: bucket, path, size, mime, updated_at.
5) Se lo zip unico è troppo grande, fai UNO zip per bucket (stessa struttura path) + un manifest globale.
6) Alla fine dammi il LINK per scaricare lo zip (o gli zip). Non incollare file binari in chat. Non committare lo zip nel repo.

Vincoli:
- Non usare il progetto nuovo.
- Non esporre service_role in chat.
- Non saltare i file privati: servono per foto progressi, documenti atleta, allegati chat.
- Alla fine riporta: quanti file per bucket, peso totale, link download.

Quando lo zip è pronto, dimmi solo: link + conteggi. Io lo scarico e lo passo all'altro ambiente per l'import.
```
