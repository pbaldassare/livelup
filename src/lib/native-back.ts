/** Da qui il tasto indietro manda l'app in secondo piano invece di tornare all'accesso. */
const RADICI = ['/', '/auth', '/app', '/pt/app'];

/** Sheet, dialog, drawer, menu e select di Radix/vaul aperti: si chiudono tutti con Esc. */
const APERTO = ['dialog', 'alertdialog', 'menu', 'listbox'].map((r) => `[role="${r}"][data-state="open"]`).join(',');

/**
 * Tasto indietro di Android. Lo chiama MainActivity.java: true se la pagina
 * l'ha gestito, altrimenti l'app va in secondo piano.
 */
export function installaTastoIndietro() {
  (window as unknown as { livelappIndietro: () => boolean }).livelappIndietro = () => {
    if (document.querySelector(APERTO)) {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      return true;
    }
    if (RADICI.includes(location.pathname) || history.length <= 1) return false;
    history.back();
    return true;
  };
}
