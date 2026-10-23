import { registerPlugin } from "@capacitor/core";

/** Plugin nativo in android/app/src/main/java/it/livelapp/app/CondividiPlugin.java */
const Condividi = registerPlugin<{ condividi(opzioni: { titolo: string; testo: string }): Promise<void> }>("Condividi");

/**
 * Nella WebView navigator.share non c'e', e le pagine ripiegano sul
 * copia-link. Qui lo si definisce sopra il pannello di condivisione di
 * Android, cosi' le pagine che condividono funzionano senza toccarle.
 * Solo testo e link: nessuna pagina condivide file.
 */
export function installaCondivisioneNativa() {
  Object.defineProperty(navigator, "share", {
    configurable: true,
    value: (dati: ShareData = {}) =>
      Condividi.condividi({
        titolo: dati.title ?? "",
        testo: [dati.text, dati.url].filter(Boolean).join("\n"),
      }),
  });
}
