# Notifiche push native (impalcatura)

Le app Android e iOS sono **pronte** per le push ma **non le usano ancora**:
nessuna schermata chiede il permesso, nessun token viene salvato, il backend
non invia niente. Le web push della PWA (`push_subscriptions`, Edge Function
`send-push-notification`) restano come sono e nell'app nativa sono spente.

| Voce | Valore |
|---|---|
| Progetto Firebase | `livelapp` · ID `livelapp-db2ed` · numero (sender ID) `526395070538` |
| App Android in Firebase | `it.livelapp.app` · `1:526395070538:android:0bf6e2f23bea638649eeb3` |
| Google Analytics | spento (non serve a FCM, la scheda privacy resta semplice) |
| Bundle iOS / Team | `it.livelapp.app` / `TGGYZQZ529` |
| Chiave APNs | **LivelAPP APNs** `S7AK3ZLGM9`, vedi § 3 |

---

## 1. Cosa c'è già

**Android**
- `android/app/google-services.json`: configurazione Firebase (non è un
  segreto: la chiave dentro vale solo per questo pacchetto). Gradle applica il
  plugin `google-services` solo se il file c'è (`android/app/build.gradle`).
- `@capacitor/push-notifications` 8, copiato in `android/capacitor-libs/`.
- Manifest: FCM **spento all'avvio** (`firebase_messaging_auto_init_enabled`
  false, nessun token generato finché l'app non chiama `register()`), Analytics
  disattivato, permesso `POST_NOTIFICATIONS` dichiarato (Android 13+ lo chiede
  solo quando l'app lo richiede), icona `@drawable/ic_stat_livelapp` (sagoma
  bianca del logo) e colore `@color/livelapp_rosso`.

**iOS**
- `ios/App/App/App.entitlements` con `aps-environment` e
  `CODE_SIGN_ENTITLEMENTS` nel target: con la firma automatica Xcode attiva la
  capability Push sull'App ID, e l'archivio per l'App Store passa a production.
- `AppDelegate.swift` passa il token APNs (o l'errore) al plugin.
- Il pacchetto Swift del plugin è copiato in `ios/capacitor-libs/` da
  `scripts/vendor-capacitor-ios.mjs` (gira dentro `npm run ios:sync`): sul Mac
  basta ancora `git pull` e Xcode, senza Node.

**App (JavaScript)**
- `src/lib/native-push.ts` → `registraPushNativa()`: chiede il permesso e
  risolve col token del dispositivo (FCM su Android, APNs esadecimale su iOS),
  oppure `null`. Non la chiama nessuno.
- `capacitor.config.ts`: su iOS la notifica si vede anche con l'app aperta.

**Provato il 27/10/2026** sull'emulatore Android: permesso concesso, token FCM
ottenuto, notifica di prova dalla console Firebase (*Messaging › Invia
messaggio di prova*) arrivata con icona e colore giusti. iOS non è provato:
serve il Mac.

---

## 2. Per accenderle davvero

1. **Tabella dei token** (migration con GRANT + RLS + policy, regola 8 di
   `CLAUDE.md`): per esempio `device_push_tokens (user_id, token, platform
   'android'|'ios', updated_at)`, unica su `token`, ognuno vede e scrive solo
   le sue righe.
2. **Registrazione**: dopo l'accesso (atleta e PT) chiamare
   `registraPushNativa()` e fare upsert del token; all'uscita cancellarlo.
   Meglio chiederlo in un momento sensato (es. dal toggle notifiche nel
   profilo, che oggi nell'app è nascosto) che al primo avvio.
3. **Invio**, estendendo `send-push-notification`:
   - Android: FCM HTTP v1, `POST https://fcm.googleapis.com/v1/projects/livelapp-db2ed/messages:send`,
     con un token OAuth del service account. La chiave si genera in Firebase ›
     Impostazioni progetto › Account di servizio › *Genera nuova chiave
     privata* e va solo nei secret delle Edge Function (es.
     `FIREBASE_SERVICE_ACCOUNT`), mai nel repository.
   - iOS: il token del plugin è un token APNs, non FCM. Si invia direttamente
     ad APNs (`https://api.push.apple.com/3/device/<token>`, topic
     `it.livelapp.app`) con un JWT firmato dalla chiave `.p8` del § 3, oppure
     si aggiunge l'SDK Firebase su iOS per avere token FCM anche lì (la chiave
     APNs è già caricata su Firebase).
4. **Play Console e App Store Connect**: aggiornare la sicurezza dei dati /
   privacy nutrition label (identificativi del dispositivo per le notifiche).

---

## 3. Apple APNs

| Voce | Valore |
|---|---|
| Chiave | **LivelAPP APNs**, Key ID `S7AK3ZLGM9`, Team `TGGYZQZ529`, sandbox e produzione, Team Scoped (valida per tutte le app del team), creata il 27/10/2026 apposta per LivelAPP |
| File `.p8` | `AuthKey_S7AK3ZLGM9.p8`: Apple lo fa scaricare una volta sola, va conservato in un gestore password. Mai nel repository. Se si perde: si revoca e se ne crea un'altra |
| App ID | `it.livelapp.app`, capability **Push Notifications** attivata il 27/10/2026 |
| Firebase | app iOS `it.livelapp.app` (LivelAPP iOS) registrata; chiave caricata in Impostazioni progetto › Cloud Messaging › Configurazione app Apple, sia sviluppo sia produzione |

Attivare la capability ha invalidato i profili di provisioning dell'App ID: con
la firma automatica Xcode li rigenera alla prossima build, le versioni già
pubblicate non cambiano.

La chiave è dedicata a LivelAPP: si può revocare senza toccare le altre app
del team, che usano le loro (LEG SRL, Expo, ecc.).
