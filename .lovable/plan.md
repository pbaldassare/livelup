

## Piano: Risolvere il blocco del ruolo al login

### Problema
Il `resolveRole()` viene chiamato **dentro** il callback `onAuthStateChange`, che è un pattern problematico con Supabase v2. Le chiamate async a Supabase (RPC, query) dentro quel callback possono causare deadlock perché il client auth mantiene un lock interno durante l'esecuzione del callback.

Il risultato: il login va a buon fine (status 200), il SIGNED_IN event arriva, ma `resolveRole` non completa mai → lo spinner resta bloccato.

### Soluzione
Separare la risoluzione del ruolo dal callback `onAuthStateChange`:

**`src/hooks/useAuth.tsx`**

1. Il callback `onAuthStateChange` diventa **sincrono** — imposta solo `user`, `session` e un flag `needsRoleResolution`
2. Un **secondo `useEffect`** che dipende da `user` gestisce la risoluzione asincrona del ruolo chiamando `resolveRole()` fuori dal callback auth
3. Rimuovere l'`await resolveRole()` dal callback di `onAuthStateChange`

```text
Prima:
  onAuthStateChange → set user/session → await resolveRole() [DEADLOCK]

Dopo:
  onAuthStateChange → set user/session (sincrono)
  useEffect([user]) → await resolveRole() [OK, fuori dal lock]
```

### Dettaglio tecnico

```typescript
// 1) onAuthStateChange — SOLO sincrono
onAuthStateChange((event, newSession) => {
  if (event === 'SIGNED_OUT' || !newSession?.user) {
    setUser(null); setSession(null); setRole(null);
    setIsLoading(false);
    return;
  }
  setSession(newSession);
  setUser(newSession.user);
  // NON chiamare resolveRole qui
});

// 2) Nuovo useEffect per risolvere il ruolo
useEffect(() => {
  if (!user || roleRef.current !== null) {
    setIsLoading(false);
    return;
  }
  setIsRoleLoading(true);
  resolveRole(user.id).then(resolved => {
    if (isMountedRef.current) {
      setRole(resolved);
      setIsRoleLoading(false);
      setIsLoading(false);
    }
  });
}, [user?.id]);
```

### Risultato
Il login sblocca immediatamente, il ruolo si risolve senza deadlock, e il redirect avviene in millisecondi.

