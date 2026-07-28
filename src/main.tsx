import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerServiceWorker } from "@/lib/pwa/registerSW";

/**
 * Emergency recovery: if the URL contains ?reset=1 we wipe all local
 * state, unregister service workers, clear caches and hard-reload.
 * This gives users a way out of persistent white-screen issues.
 */
async function emergencyReset() {
  try {
    // Unregister all service workers
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    // Clear all caches
    if ('caches' in window) {
      const names = await caches.keys();
      await Promise.all(names.map((n) => caches.delete(n)));
    }
    // Clear storage
    try { localStorage.clear(); } catch {}
    try { sessionStorage.clear(); } catch {}
  } catch {}
  // Reload without ?reset param
  window.location.replace(window.location.pathname);
}

// Check for reset flag
if (new URLSearchParams(window.location.search).has('reset')) {
  emergencyReset();
} else {
  void registerServiceWorker();

  const root = document.getElementById("root")!;


  try {
    createRoot(root).render(<App />);
  } catch (err) {
    console.error('[LIVEL APP] Bootstrap error:', err);
    // Show minimal fallback UI
    root.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100dvh;padding:2rem;font-family:system-ui,sans-serif;text-align:center;background:#0a0a0a;color:#fff">
        <h1 style="font-size:1.5rem;margin-bottom:.5rem">Ops! Qualcosa è andato storto</h1>
        <p style="color:#888;margin-bottom:1.5rem;font-size:.9rem">L'app non è riuscita a caricarsi. Prova a ripristinarla.</p>
        <button onclick="window.location.href='?reset=1'" style="padding:.75rem 1.5rem;border-radius:12px;border:none;background:#6d28d9;color:#fff;font-size:1rem;cursor:pointer">
          Ripristina app
        </button>
      </div>`;
  }
}
