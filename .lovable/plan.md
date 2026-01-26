
# Piano: Tema Scuro Coerente per Workout Page

## Problema Identificato
La pagina workout usa i colori standard light-mode (`bg-background`, `Card`, `text-muted-foreground`) mentre il resto dell'app PWA usa il tema scuro con le variabili `app-*`:
- `bg-app-background` (nero)
- `text-app-foreground` (bianco)
- `bg-app-card` (grigio scuro)
- `border-app-border`
- `text-app-accent` (lime)

## File da Modificare

### 1. AppLayout.tsx - Layout Base
Cambiare il container principale da tema light a tema scuro:

```text
Attuale: bg-background, border-border, bg-background/95
Nuovo:   bg-app-background, border-app-border, bg-app-card/95
```

Elementi da aggiornare:
- Container principale: `bg-app-background`
- Bottom navigation: `bg-app-card/95`, `border-app-border`
- Link attivi: `text-app-accent` invece di `text-primary`
- Link inattivi: `text-app-muted-foreground`

### 2. AtletaWorkoutPage.tsx - Lista Allenamenti
Applicare tema scuro a tutti i componenti:

**Header**
- Titolo: `text-app-foreground`
- Sottotitolo: `text-app-muted-foreground`

**Today's Workout Card (highlight)**
- Background: `bg-app-accent/10 border-app-accent/30`
- Badge: stile app-accent
- Button: `bg-app-accent text-app-accent-foreground`

**Tabs**
- TabsList: `bg-app-muted`
- TabsTrigger attivo: `bg-app-card text-app-foreground`

**WorkoutCard Component**
- Card: `bg-app-card border-app-border hover:bg-app-muted`
- Icone status: colori app-accent/success
- Testo: `text-app-foreground`, `text-app-muted-foreground`

**Empty States**
- Card dashed: `border-app-border bg-app-card/50`
- Icone: `text-app-muted-foreground`

### 3. Componenti UI Usati
Creare override inline per mantenere compatibilita:
- Badge: className override per tema scuro
- Card: className override per bg-app-card

## Dettaglio Modifiche

### AppLayout.tsx

```typescript
// Container
<div className="min-h-screen bg-app-background flex flex-col" ...>

// Main content  
<main className="flex-1 pb-20 safe-top text-app-foreground">

// Bottom nav
<nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-app-border bg-app-card/95 backdrop-blur safe-bottom">

// Links
className={cn(
  '...',
  isActive ? 'text-app-accent' : 'text-app-muted-foreground'
)}
```

### AtletaWorkoutPage.tsx

```typescript
// Container locked state
<div className="p-4 space-y-6 bg-app-background min-h-screen">
  <h1 className="text-2xl font-bold text-app-foreground">

// Card locked
<Card className="border-dashed bg-app-card border-app-border">
  <Lock className="text-app-muted-foreground" />
  <h3 className="font-semibold text-app-foreground">
  <p className="text-app-muted-foreground">
  <Button className="bg-app-accent text-app-accent-foreground">

// Main container
<div className="pb-4 bg-app-background min-h-screen">

// Header
<h1 className="text-2xl font-bold text-app-foreground">
<p className="text-sm text-app-muted-foreground">

// Today highlight card
<Card className="bg-app-accent/10 border-app-accent/20">
  <Badge className="bg-app-accent text-app-accent-foreground">
  <h2 className="text-lg font-bold text-app-foreground">
  <Button className="w-full bg-app-accent text-app-accent-foreground">

// Tabs
<TabsList className="w-full bg-app-muted">
  <TabsTrigger className="flex-1 data-[state=active]:bg-app-card data-[state=active]:text-app-foreground">

// Empty state cards
<Card className="border-dashed bg-app-card/50 border-app-border">

// WorkoutCard function
<Card className="bg-app-card border-app-border hover:bg-app-muted transition-colors">
  <div className="w-10 h-10 rounded-full bg-app-accent/20">
    <StatusIcon className="text-app-accent" />
  <h3 className="font-semibold text-app-foreground truncate">
  <ChevronRight className="text-app-muted-foreground" />
  <span className="text-app-muted-foreground">
  <Badge className="mt-2 text-xs bg-app-muted border-app-border text-app-muted-foreground">
```

## Risultato Atteso

```text
Prima (screenshot):
+---------------------------+
|  I miei allenamenti       |  <- bianco
|  [Programma] [Completati] |  <- tabs grigi
|  +---------------------+  |
|  | HIIT Cardio Blast   |  |  <- card bianca
|  | 29 gen - 4 esercizi |  |
|  +---------------------+  |
|  +---------------------+  |
|  | Full Body           |  |  <- card bianca
|  +---------------------+  |
+---------------------------+

Dopo:
+---------------------------+
|  I miei allenamenti       |  <- nero, testo bianco
|  [Programma] [Completati] |  <- tabs scuri, accent lime
|  +---------------------+  |
|  | HIIT Cardio Blast   |  |  <- card grigio scuro
|  | 29 gen - 4 esercizi |  |  <- testo grigio chiaro
|  +---------------------+  |
|  +---------------------+  |
|  | Full Body           |  |  <- card grigio scuro
|  +---------------------+  |
+---------------------------+
```

## Coerenza con Design System

Le variabili CSS `app-*` sono gia definite in index.css:
- `--app-accent: 66 100% 50%` (lime)
- `--app-background: 0 0% 0%` (nero puro)
- `--app-foreground: 0 0% 100%` (bianco)
- `--app-card: 0 0% 8%` (grigio scuro)
- `--app-muted: 0 0% 12%` (grigio medio)
- `--app-border: 0 0% 18%` (bordo grigio)

Questo corrisponde esattamente al design di AtletaWorkoutDetailPage e alle reference "Ladder-inspired" gia implementate.

## File Coinvolti

| File | Modifiche |
|------|-----------|
| `src/components/layouts/AppLayout.tsx` | Tema scuro container + nav |
| `src/pages/atleta/AtletaWorkoutPage.tsx` | Tutti i componenti con classi app-* |
