

## Piano: Fix login bloccato su "Verifica credenziali..."

### Causa root
In `useAuth.tsx`, `handleSession` è un `useCallback` che dipende da `role` (linea 145). Ma il `useEffect` che registra `onAuthStateChange` ha `[]` come dependencies (linea 202), quindi cattura sempre la versione iniziale di `handleSession` dove `role = null`.

Il check a linea 117:
```ts
if (roleResolvedRef.current && role !== null) {
```
Non funziona perché `role` nella closure è SEMPRE `null`. Quindi ogni evento auth (TOKEN_REFRESHED, ecc.) ri-esegue la risoluzione del ruolo, rimettendo `isLoading=true` e bloccando la UI.

### Soluzione
**`src/hooks/useAuth.tsx`**:
1. Rimuovere `role` dalle dipendenze di `handleSession`
2. Usare un **ref** (`roleRef`) invece dello state `role` per il check di guardia dentro `handleSession`
3. Il check diventa: `if (roleResolvedRef.current && roleRef.current !== null)` — usando il ref che è sempre aggiornato, non la closure stale
4. Aggiornare sia `roleRef.current` che `setRole()` quando il ruolo viene risolto

### File
- `src/hooks/useAuth.tsx` — aggiungere `roleRef = useRef(role)`, sincronizzarlo con `setRole`, usarlo in `handleSession` al posto di `role` nella closure

### Risultato
Il login non si blocca più. `handleSession` non ri-risolve il ruolo inutilmente, `isLoading` torna `false` correttamente, e il redirect a `/pt` avviene.

