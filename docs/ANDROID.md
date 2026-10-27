# App Android (Play Store)

L'app Android è il sito compilato dentro un guscio [Capacitor](https://capacitorjs.com) 8.
Non è un browser che apre il sito: i file stanno nel pacchetto, e all'avvio si
parte dalla pagina di accesso invece che dal sito pubblico. Chi ha già la
sessione finisce sulla home del suo ruolo: atleta su `/app`, PT su `/pt/app`.
Admin e dashboard PT web restano solo da browser.

| Voce | Valore |
|---|---|
| applicationId | `it.livelapp.app` (non si cambia dopo la prima pubblicazione) |
| Nome visualizzato | LivelAPP |
| minSdk / targetSdk | 24 / 36 |
| Permessi | `INTERNET`, posizione (Scopri, eventi e gruppi vicini; chiesta solo quando serve) |
| Progetto nativo | `android/` |
| Configurazione | `capacitor.config.ts` |

---

## 1. Cosa cambia nel codice quando gira nell'app

Tutto passa da `isNativeApp()` in `src/lib/native.ts`:

- **Rotte**: le pagine del sito pubblico (`soloSito` in `src/App.tsx`) e la home
  `/` rimandano a `/auth`. Restano profili PT pubblici, inviti ai gruppi e
  pagine legali.
- **PT**: `usePTSurface` dà sempre `app`, anche sul tablet: la dashboard web
  `/pt/*` nell'app non c'è.
- **Admin**: `AdminRoute` mostra "Area admin solo da browser" con il pulsante Esci.
- **Service worker**: non viene registrato (`src/lib/pwa/registerSW.ts`), i file
  sono già locali.
- **Installa l'app**: banner e voci spariscono (`useInstallPrompt`).
- **Notifiche push**: le web push nella WebView non arrivano, il toggle sparisce
  (`usePushNotifications`, `PushNotificationToggle`). Restano le notifiche in app.
- **Link condivisi**: inviti e coupon usano `publicAppOrigin()`, non
  `window.location.origin`, che nell'app vale `https://localhost`.
- **Download**: la WebView ignora i link con `download`, quindi gli export CSV e
  il PDF della scheda non partirebbero. `src/lib/native-download.ts` intercetta il
  click e passa il file a `SalvaPlugin.java`, che apre il "Salva come" di Android.
- **Tasto indietro**: `MainActivity.java` chiede alla pagina
  (`src/lib/native-back.ts`): chiude sheet, drawer e dialog aperti, poi torna alla
  pagina prima. Da `/app`, `/pt/app` e dall'accesso l'app va in secondo piano.
- **Condividi**: nella WebView non c'è `navigator.share`. `src/lib/native-share.ts`
  lo definisce sopra `CondividiPlugin.java`, che apre il pannello di condivisione
  di Android (solo testo e link).
- **Barra di stato**: icone chiare sul tema scuro, scure sul tema chiaro
  (`BarreDiSistema` in `src/lib/native.ts`, montato in `App.tsx`).

**Barre di sistema.** Da Android 15 l'app disegna sotto barra di stato e barra
dei gesti. Capacitor inietta le misure in `--safe-area-inset-*`, e
`src/index.css` le espone come `--sat` (alto) e `--sab` (basso). Regole per chi
scrive UI nuova:

- dentro `AppLayout` non serve niente in alto: `main` ha `safe-top` e
  `overflow-x-hidden`, quindi le intestazioni `sticky top-0` partono già sotto
  il suo padding, e `<BarraDiStato />` copre la fascia della barra di stato.
  Non aggiungere `safe-top` alle intestazioni: raddoppia il margine;
- una pagina a schermo pieno senza `AppLayout` va avvolta in `<SchermoPieno>`
  (`src/components/app/BarraDiStato.tsx`), come onboarding, allenamento,
  abbonamento e prenotazione: lì le `sticky top-0` si fermano sotto la barra
  di stato grazie alla regola `.schermo-pieno` in `index.css`;
- un elemento fisso in basso aggiunge `var(--sab)`: `pb-[calc(1rem+var(--sab))]`
  per le barre, `bottom-[calc(6rem+var(--sab))]` per i FAB sopra la bottom nav.
  Non mettere `safe-bottom` insieme a un `p-*`: uno dei due vince e l'altro sparisce;
- sheet (`ui/sheet.tsx`), drawer (`ui/drawer.tsx`) e toast (`ui/toast.tsx`,
  `ui/sonner.tsx`) lo fanno da soli;
- non usare `env(safe-area-inset-*)` da solo: su Android prima di Chrome 140 vale 0.

Sul web `--sat` e `--sab` valgono 0 (o il notch dell'iPhone), quindi non cambia niente.

---

## 2. Cosa serve sul PC

- **Android Studio** recente, con Android SDK 36.
- **JDK**: va bene quello incluso in Android Studio (provato il 15/10/2026 con
  JBR 25.0.3 e Gradle 8.14.3) oppure un JDK 21. Se Gradle si ferma su
  `Unsupported class file major version` o `invalid source release`, scegli un
  JDK 21 in *Settings › Build Tools › Gradle › Gradle JDK*; da riga di comando
  passa `JAVA_HOME` (per esempio `~/.jdks/jbr-21.*`).

Node non serve sul PC dove costruisci: il sito compilato e la libreria di
Capacitor sono versionati in `android/`. Serve solo dove si rigenera (punto 6).

---

## 3. Aprire il progetto

In Android Studio **Open** sulla cartella `android/`, non sulla radice del
repository, e aspetta il Gradle sync.

Questi file sono generati, non scritti a mano, e sono versionati apposta:

- `android/app/src/main/assets/public/`: il sito compilato
- `android/app/src/main/assets/capacitor.config.json` e `capacitor.plugins.json`
- `android/capacitor-cordova-android-plugins/`
- `android/capacitor-libs/`: la libreria Android di Capacitor, copiata da
  `node_modules` da `scripts/vendor-capacitor-android.mjs`
- `android/app/src/main/res/xml/config.xml`

---

## 4. Chiave di firma e App Bundle

Serve una sola volta. Se perdi la chiave non puoi più aggiornare l'app pubblicata.

**Build › Generate Signed App Bundle / APK › Android App Bundle › Create new…**

Conserva il `.jks` e le password in un gestore di password. Il repository
ignora `*.jks`, `*.keystore` e `android/keystore.properties`: non committarli.
Attiva **Play App Signing** al primo caricamento: Google custodisce la chiave di
distribuzione e quella di upload, se la perdi, si può sostituire.

Variante **release**, il file esce in `android/app/release/app-release.aab`.

A ogni caricamento il `versionCode` deve crescere, in `android/app/build.gradle`:

```gradle
versionCode 1      // intero, +1 a ogni upload
versionName "1.0"  // stringa mostrata agli utenti
```

---

## 5. Provare senza Android Studio

```sh
cd android
JAVA_HOME=~/.jdks/jbr-21.0.11 ANDROID_HOME=$LOCALAPPDATA/Android/Sdk ./gradlew assembleDebug
# → android/app/build/outputs/apk/debug/app-debug.apk
```

Va bene per provare sull'emulatore o sul telefono, non per Play Store (è
firmato con la chiave di debug).

---

## 6. Aggiornare l'app

Ogni modifica al sito arriva sull'app solo con una nuova pubblicazione. Sulla
macchina con Node:

```sh
git pull
npm run android:sync
git add android && git commit && git push
```

Poi in Android Studio: alza il `versionCode`, rigenera il bundle firmato e caricalo.

---

## 7. Icona e avvio

I sorgenti stanno in `assets/` e sono ricavati da `public/livelapp-icon.png`:
il simbolo "LA" è ritagliato dal nero e rimesso alla misura giusta per l'icona
adattiva, cioè dentro il cerchio che Android non taglia mai. Fondo nero.

```sh
npm run android:assets -- --iconBackgroundColor '#000000' --iconBackgroundColorDark '#000000' --splashBackgroundColor '#000000' --splashBackgroundColorDark '#000000'
```

Il comando usa `sharp`, autorizzato in `allowScripts` di `package.json`. Riscrive
`mipmap-anydpi-v26/ic_launcher*.xml` e **toglie il blocco `<monochrome>`**
(l'icona a tema di Android 13+): rimettilo a mano, è lo stesso `inset` del foreground.

Su Android 12+ l'avvio lo disegna il sistema: l'icona dell'app su
`@color/livelapp_nero` (`values/styles.xml`).

---

## 8. Punti aperti

- **Notifiche push native.** L'impalcatura c'è (Firebase `livelapp-db2ed`,
  `google-services.json`, plugin, icona), ma l'app non le usa ancora: passi
  mancanti in `docs/PUSH.md`.
- **Link delle email e inviti.** Conferma, reimpostazione password e inviti
  aprono il browser, non l'app. Servono gli App Links (`assetlinks.json` sul
  dominio più un `intent-filter` nel manifest).
- **Pagamenti.** Stripe non è ancora collegato. Quando lo sarà, vendere servizi
  digitali dentro l'app Android con un pagamento esterno richiede il programma
  di Google per i link esterni / billing choice (vedi docs/ANDROID.md di Cibarius).
- **Foto.** Gli input file aprono il selettore di Android (galleria e file), non
  direttamente la fotocamera.
