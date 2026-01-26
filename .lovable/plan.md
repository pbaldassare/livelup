
# Piano: Standardizzazione Pulsante Indietro nelle Pagine Atleta

## Problema Identificato
Analizzando il codice, il pulsante "indietro" è implementato in modo **inconsistente** nelle pagine Atleta:

| Pagina | Implementazione | Funziona? |
|--------|-----------------|-----------|
| AtletaSettingsPage | `<button className="p-2 -ml-2 hover:bg-app-muted rounded-lg">` | ✅ |
| AtletaHelpPage | `<button className="p-2 -ml-2 hover:bg-app-muted rounded-full">` | ✅ |
| AtletaNotificationsPage | `<Button variant="ghost" size="icon">` | ❌ |
| AtletaSubscriptionPage | `<Button variant="ghost" size="icon" className="text-white/60">` | ❓ |
| AtletaWorkoutDetailPage | `<Button variant="ghost" size="icon">` | ❓ |
| AtletaPTProfilePage | `<Button variant="ghost" size="sm">` con testo | ❓ |

### Cause del Malfunzionamento
1. **Stile ghost**: Il `Button variant="ghost"` usa `hover:bg-accent` che nel tema scuro potrebbe non essere visibile o avere conflitti
2. **Area cliccabile**: Il bottone nativo con `p-2` ha un'area touch migliore
3. **Feedback visivo**: `hover:bg-app-muted` dà feedback chiaro nel tema scuro, mentre `hover:bg-accent` potrebbe non essere percepibile

---

## Soluzione

Standardizzare TUTTE le pagine Atleta con lo stesso pattern funzionante:

```typescript
<button 
  onClick={() => navigate(-1)}
  className="p-2 -ml-2 hover:bg-app-muted rounded-lg transition-colors"
>
  <ArrowLeft className="h-5 w-5 text-app-foreground" />
</button>
```

---

## File da Modificare

### 1. AtletaNotificationsPage.tsx
**Da:**
```typescript
<Button
  variant="ghost"
  size="icon"
  onClick={() => navigate(-1)}
  className="text-app-foreground"
>
  <ArrowLeft className="h-5 w-5" />
</Button>
```

**A:**
```typescript
<button 
  onClick={() => navigate(-1)}
  className="p-2 -ml-2 hover:bg-app-muted rounded-lg transition-colors"
>
  <ArrowLeft className="h-5 w-5 text-app-foreground" />
</button>
```

### 2. AtletaSubscriptionPage.tsx
**Da:**
```typescript
<Button
  variant="ghost"
  size="icon"
  onClick={() => navigate(-1)}
  className="text-white/60"
>
  <ChevronLeft className="h-6 w-6" />
</Button>
```

**A:**
```typescript
<button 
  onClick={() => navigate(-1)}
  className="p-2 -ml-2 hover:bg-app-muted rounded-lg transition-colors"
>
  <ArrowLeft className="h-5 w-5 text-app-foreground" />
</button>
```
Nota: Cambiare anche `ChevronLeft` → `ArrowLeft` per coerenza visiva.

### 3. AtletaWorkoutDetailPage.tsx
**Da:**
```typescript
<Button
  variant="ghost"
  size="icon"
  onClick={() => navigate('/app/workout')}
  className="text-app-foreground hover:bg-app-muted"
>
  <ChevronLeft className="h-6 w-6" />
</Button>
```

**A:**
```typescript
<button 
  onClick={() => navigate('/app/workout')}
  className="p-2 -ml-2 hover:bg-app-muted rounded-lg transition-colors"
>
  <ArrowLeft className="h-5 w-5 text-app-foreground" />
</button>
```

### 4. AtletaPTProfilePage.tsx
**Da:**
```typescript
<Button 
  variant="ghost" 
  size="sm" 
  onClick={() => navigate(-1)}
  className="text-app-foreground hover:bg-app-muted"
>
  <ArrowLeft className="h-4 w-4 mr-2" />
  Indietro
</Button>
```

**A:**
```typescript
<button 
  onClick={() => navigate(-1)}
  className="p-2 -ml-2 hover:bg-app-muted rounded-lg transition-colors"
>
  <ArrowLeft className="h-5 w-5 text-app-foreground" />
</button>
```
Nota: Rimuovere il testo "Indietro" per uniformità con le altre pagine.

---

## Pattern Standardizzato

Per tutte le pagine Atleta PWA:

```typescript
// Header con pulsante indietro
<div className="sticky top-0 z-10 bg-app-background/95 backdrop-blur-sm border-b border-app-border">
  <div className="flex items-center gap-3 p-4">
    <button 
      onClick={() => navigate(-1)}  // oppure path specifico se necessario
      className="p-2 -ml-2 hover:bg-app-muted rounded-lg transition-colors"
    >
      <ArrowLeft className="h-5 w-5 text-app-foreground" />
    </button>
    <h1 className="text-xl font-bold text-app-foreground">Titolo Pagina</h1>
  </div>
</div>
```

---

## Riepilogo Modifiche

| File | Modifica |
|------|----------|
| `src/pages/atleta/AtletaNotificationsPage.tsx` | Button → button nativo |
| `src/pages/atleta/AtletaSubscriptionPage.tsx` | Button → button nativo + ArrowLeft |
| `src/pages/atleta/AtletaWorkoutDetailPage.tsx` | Button → button nativo + ArrowLeft |
| `src/pages/atleta/AtletaPTProfilePage.tsx` | Button con testo → button nativo solo icona |

---

## Risultato Atteso

- Pulsante indietro funzionante su tutte le pagine
- Stile visivo coerente (icona ArrowLeft 20x20)
- Hover state visibile nel tema scuro (bg-app-muted)
- Area touch ottimale (padding p-2)
- Animazione smooth (transition-colors)
