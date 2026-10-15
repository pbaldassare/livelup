import { registerPlugin } from "@capacitor/core";

/** Plugin nativo in android/app/src/main/java/it/livelapp/app/SalvaPlugin.java */
const Salva = registerPlugin<{ salva(opzioni: { dati: string; nome: string; tipo: string }): Promise<void> }>("Salva");

/**
 * Nella WebView i link con `download` non scaricano niente. Le pagine
 * esportano CSV e PDF proprio cosi' (URL.createObjectURL + click su un <a>,
 * anche jsPDF.save), quindi qui si intercetta il click e il file passa al
 * "Salva come" di Android, senza toccare le pagine.
 *
 * I Blob vengono ricordati alla creazione dell'URL: le pagine lo revocano
 * subito dopo il click, prima che si possa rileggerlo.
 */
export function installaDownloadNativi() {
  const blob = new Map<string, Blob>();

  const crea = URL.createObjectURL.bind(URL);
  URL.createObjectURL = (oggetto: Blob | MediaSource) => {
    const url = crea(oggetto);
    if (oggetto instanceof Blob) blob.set(url, oggetto);
    return url;
  };
  const revoca = URL.revokeObjectURL.bind(URL);
  URL.revokeObjectURL = (url: string) => {
    blob.delete(url);
    revoca(url);
  };

  const salva = (a: HTMLAnchorElement) => {
    const file = blob.get(a.href);
    if (!a.download || !file) return false;
    const lettore = new FileReader();
    lettore.onload = () => {
      const dati = String(lettore.result).split(",")[1] ?? "";
      void Salva.salva({ dati, nome: a.download, tipo: file.type || "application/octet-stream" });
    };
    lettore.readAsDataURL(file);
    return true;
  };

  const click = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
    if (!salva(this)) click.call(this);
  };
  // jsPDF e FileSaver usano dispatchEvent(new MouseEvent("click")).
  const invia = HTMLAnchorElement.prototype.dispatchEvent;
  HTMLAnchorElement.prototype.dispatchEvent = function (this: HTMLAnchorElement, evento: Event) {
    if (evento.type === "click" && salva(this)) return false;
    return invia.call(this, evento);
  };
}
