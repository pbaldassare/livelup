# App iOS (App Store)

Stessa app di `docs/ANDROID.md`, nel guscio Capacitor 8 per iOS: il sito
compilato sta nel pacchetto, si parte dall'accesso e ogni ruolo arriva sulla sua
home. Impaginazione e regole sono quelle di Android; qui solo le differenze.

| Voce | Valore |
|---|---|
| Bundle identifier | `it.livelapp.app` (come Android) |
| Nome visualizzato | LivelAPP |
| iOS minimo | 15.0 |
| Dispositivi | solo iPhone, solo verticale (niente screenshot iPad da preparare) |
| Permessi | fotocamera, libreria foto, microfono (video degli esercizi), posizione quando in uso; chiesti solo quando servono (`Info.plist`) |
| Team di firma | `TGGYZQZ529` |
| Progetto nativo | `ios/App/App.xcodeproj` |
| Dipendenze | Swift Package Manager: Capacitor arriva da GitHub, niente CocoaPods, niente Node |

---

## 1. Cosa cambia rispetto ad Android

- **Niente acquisti.** Apple (Review Guidelines 3.1.1) respinge le app che
  vendono servizi digitali senza In-App Purchase, e anche pulsanti, prezzi o
  inviti a comprare altrove. Su iOS `vendeAbbonamenti()` (`src/lib/native.ts`)
  è falso:
  - `/pt/app/payments` rimanda a `/pt/app` e la voce "Pagamenti" sparisce dal
    menu "Altro" del PT;
  - `PTBillingBanner` dice solo lo stato (bloccato, pagamento in ritardo, piano
    da aggiornare), senza prezzo e senza pulsanti verso Pagamenti;
  - la pagina Abbonamento dell'atleta (`/app/subscription`) mostra l'abbonamento
    in corso ma non i "Piani disponibili".
  Su Android e sul web non cambia niente.
- **Registrazione solo come atleta.** Con Cibarius Apple ha respinto la prima
  versione perché dall'app si poteva creare un account business, che ha piani
  a pagamento. Qui su iOS la registrazione non mostra la scelta del ruolo e crea
  solo atleti; i PT si registrano sul sito e nell'app accedono e basta.
- **Niente area Professionista.** Apple ha respinto la 1.0 (1) il 16/10/2026
  per le regole 3.1.1 e 3.1.3(c): i PT sono persone singole che comprano i
  piani sul sito, e usarli nell'app richiederebbe In-App Purchase. Su iOS
  `areaProfessionistaNellApp()` è falso: un PT che accede vede "Area
  Professionista non disponibile su iPhone" con il solo Esci (guardie
  `PTAppRoute`/`PTDashboardRoute` in `ProtectedRoute.tsx`), senza link al
  sito. L'app iOS è per gli atleti; i PT usano la web app installata da
  Safari (*Condividi › Aggiungi alla schermata Home*, provata il 21/10/2026)
  o Android.
- **Corsi.** Su iOS al posto del prezzo compare "Su assegnazione" e non si
  parla di "corso a pagamento".
- **Restano** i pacchetti dei PT verso gli atleti: sono una richiesta al
  trainer, senza pagamento in app, per allenamenti tra persone (3.1.3(d)/(e)).
- **Plugin nativi.** Stessi nomi e stesso JavaScript di Android, in Swift in
  `ios/App/App/LivelAPPNativo.swift`: `Salva` ("Salva in File" per CSV e PDF)
  e `Condividi` (pannello di condivisione). Li registra `ViewController`, che
  `SceneDelegate.swift` mette come radice della finestra: il template di
  Capacitor 8 lì crea un `CAPBridgeViewController` e ignora `Main.storyboard`,
  e con quello i plugin risultano "not implemented on ios".
- **Zoom.** Il viewport di `index.html` ha già `maximum-scale=1`: iOS non
  ingrandisce la pagina quando si tocca un campo.
- **Barre di sistema.** La WebView va da bordo a bordo e `--sat`/`--sab`
  prendono i valori dalle safe area, come su Android. `BarreDiSistema` cambia
  il colore delle icone col tema.
- **Tasto indietro.** Su iPhone non c'è: si torna con le frecce delle
  intestazioni, come nella PWA.

---

## 2. Compilare su Xcode

Serve un Mac con Xcode 26 o successivo (lo chiede Capacitor 8) e l'account
Apple Developer del Team.

```sh
git pull
open ios/App/App.xcodeproj
```

1. Al primo avvio Xcode scarica il pacchetto Swift di Capacitor
   (`capacitor-swift-pm`): aspetta che finisca "Resolving Package Graph".
2. Prova su simulatore o iPhone collegato (▶).
3. Per App Store Connect: destinazione *Any iOS Device (arm64)*,
   **Product › Archive**, poi **Distribute App › App Store Connect**.

A ogni caricamento alza **Build** (`CURRENT_PROJECT_VERSION`) nel target; la
**Version** (`MARKETING_VERSION`) è quella che vedono gli utenti.

Sul simulatore la prima schermata arriva dopo qualche secondo di nero: il sito
è un unico file JavaScript da 4 MB. Su un iPhone vero è molto più rapido.

---

## 3. Aggiornare l'app

Come per Android, sulla macchina con Node:

```sh
npm run ios:sync      # sito compilato in ios/App/App/public
npm run ios:assets    # solo se cambiano icona o schermata di avvio
git add ios && git commit && git push
```

`App/App/public`, `capacitor.config.json`, `config.xml` e
`capacitor-cordova-ios-plugins` sono versionati apposta (vedi `ios/.gitignore`).
`CapApp-SPM/Package.swift` lo riscrive `cap sync`: non modificarlo a mano.

Icona e schermata di avvio vengono da `assets/`, gli stessi sorgenti di
Android, su fondo nero.

---

## 4. App Store Connect

- **Accesso per la revisione:** l'account atleta demo; la password si
  inserisce su App Store Connect, mai nel repository.
- **Privacy:** l'URL dell'informativa e le etichette sulla privacy (email,
  nome, foto, posizione approssimativa, dati di allenamento). La cancellazione
  dell'account è raggiungibile dall'app, come chiede Apple.
- **Crittografia:** `ITSAppUsesNonExemptEncryption` è `false` in `Info.plist`,
  quindi niente documentazione per l'esportazione.
- **Screenshot:** solo lato atleta (le tavole `05`–`08` del PT non vanno
  caricate dalla 1.0 (2)). App Store Connect chiede iPhone 6,3" (1206×2622), in
  `store-assets/app-store/6.3/`; in `6.9/` le stesse a 1320×2868. Le catture
  sono quelle del simulatore iPhone 18 Pro (`store-assets/app-store/raw/`,
  account demo PT e atleta, barra di stato con `xcrun simctl status_bar …
  override --time 9:41`); le tavole le genera `node scripts/app-store-assets.mjs`.
- **Note per la revisione:** testo in `store-assets/app-store/note-revisione.txt`
  (la password dell'account demo non va scritta nel repository).
- **URL:** il sito risponde su `livelapp.iaconnect.it` (privacy, contatti,
  elimina account); `livelapp.it` al 16/10/2026 dava errore SSL.
- **Prima versione:** 1.0 (1) inviata in revisione il 16/10/2026, rilascio
  manuale, età 18+, gratuita, operatore commerciale ai sensi del DSA.
  Respinta per 3.1.1/3.1.3(c) (vedi sopra); la 1.0 (2) toglie l'area
  Professionista e ha come account demo l'atleta.

---

## 5. Punti aperti

- **Notifiche push native.** Come su Android non ci sono: servono APNs e
  `@capacitor/push-notifications`.
- **Link delle email e inviti.** Conferma, reset password e inviti aprono
  Safari: servono gli Universal Links (`apple-app-site-association` su
  livelapp.it).
- **Da provare su un iPhone vero:** fotocamera, video, posizione, schermata di
  avvio.
