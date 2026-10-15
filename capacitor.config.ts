import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Guscio nativo di LivelAPP. Il sito compilato viaggia dentro il pacchetto:
 * l'app si apre senza scaricare la pagina e parte dall'accesso, non dal sito
 * pubblico (vedi `isNativeApp` in src/lib/native.ts).
 *
 * `appId` e' l'identificativo su Play Store e App Store: una volta pubblicata
 * l'app non si cambia piu'.
 */
const config: CapacitorConfig = {
  appId: "it.livelapp.app",
  appName: "LivelAPP",
  webDir: "dist",
  // Colore di fondo della WebView mentre la pagina si carica: lo stesso di
  // --app-background (tema scuro) in src/index.css, cosi' non lampeggia il bianco.
  backgroundColor: "#000000",
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SystemBars: {
      // Il tema di partenza e' scuro: icone e orologio della barra di stato
      // chiari. Col tema chiaro li scurisce useBarreDiSistema (src/lib/native.ts).
      style: "DARK",
      // Inietta --safe-area-inset-* che src/index.css usa per --sat e --sab.
      insetsHandling: "css",
    },
  },
};

export default config;
