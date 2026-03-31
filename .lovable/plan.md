

## Piano: Fix definitivo login bloccato

### Causa root
Dai console log si vede chiaramente:
1. `SIGNED_IN` scatta **2 volte** (normale con React StrictMode)
2. `[Auth] resolved role:` **non appare MAI** → `resolveRole` non viene mai eseguita
3. Dopo 8s scatta il safety timeout

Il problema è il `setTimeout(0)` combinato con `isMountedRef`. In StrictMode, React smonta e rimonta il componente. Il cleanup del primo mount imposta `isMountedRef.current = false` **prima** che il `setTimeout(0)` esegua il suo callback. Quando il callback finalmente parte, trova `isMountedRef.current === false` e fa `return` senza mai chiamare `resolveRole`. Il secondo mount ricrea la subscription ma potrebbe avere lo stesso problema di timing.

### Soluzione
**`src/hooks/useAuth.tsx`** — 2 modifiche chirurgiche:

1. **Rimuovere `setTimeout(0)`** — la callback di `onAuthStateChange` è già `async`, quindi basta fare `await resolveRole(...)` direttamente. Non serve il setTimeout per "dare tempo al token" perché il token è già nel `newSession` che Supabase passa al callback.

2. **Rimuovere il check `isMountedRef` prima di resolveRole** — tenerlo solo prima di fare `setState`. Così la risoluzione del ruolo parte sempre, e solo il settaggio dello state viene protetto dal check di mount.

Il blocco attuale (linee 106-121):
```ts
setIsRoleLoading(true);
setTimeout(async () => {
  if (!isMountedRef.current) return;
  const resolved = await resolveRole(newSession.user.id);
  if (isMountedRef.current) {
    setRole(resolved);
    setIsRoleLoading(false);
    setIsLoading(false);
  }
}, 0);
```

Diventa:
```ts
setIsRoleLoading(true);
const resolved = await resolveRole(newSession.user.id);
console.log('[Auth] resolved role:', resolved);
if (isMountedRef.current) {
  setRole(resolved);
  setIsRoleLoading(false);
  setIsLoading(false);
}
```

### File coinvolto
- `src/hooks/useAuth.tsx` — rimuovere setTimeout(0) e il check isMountedRef pre-resolveRole (linee 106-121)

### Risultato
`resolveRole` viene chiamata immediatamente dopo SIGNED_IN, il ruolo si risolve in millisecondi, e il redirect a `/pt` avviene subito. Zero attesa, zero timeout.

