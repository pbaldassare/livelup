# Prompt Lovable — export Auth + chiavi per cutover

Incolla questo nel progetto **vecchio** Livelapp (backend `uiowzycolsmgcsvihmhy`).

```text
Ciao, stiamo migrando Livelapp sul nuovo backend (ref kxgaqnksylntokyrpaxp).
Lo schema e i dati public sono già stati importati. Mancano SOLO questi pezzi che da Lovable Cloud non possiamo leggere noi:

1) Export Auth (obbligatorio per il login)
   Esporta le tabelle auth.users e auth.identities (SQL o CSV) con gli UUID originali.
   Senza questo i 34 profili sul nuovo DB non possono accedere (password bcrypt restano le stesse solo se gli UUID coincidono).
   Non esporre le password in chat: allega un file o un download.

2) Service role del VECCHIO progetto
   Serve SOLO per copiare i file Storage (avatar, video esercizi, allegati chat) verso il nuovo bucket.
   Mandala in privato / secret, non nel repo. La ruoteremo dopo la copia.

3) Elenco secret Edge Function già impostati sul vecchio progetto (nomi sì, valori in privato):
   RESEND_API_KEY, RESEND_FROM_EMAIL, SEND_EMAIL_HOOK_SECRET,
   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
   e conferma Site URL / hook Send Email.

Non toccare il database nuovo. Non cambiare il codice frontend.
Riporta: export Auth pronto sì/no, service role consegnata sì/no, secret elencati.
```
