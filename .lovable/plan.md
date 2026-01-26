
# Piano: Coordinamento Colori AtletaPTProfilePage

## Problema Identificato
Dalla screenshot, la pagina profilo PT vista dall'atleta usa il tema chiaro standard invece del tema scuro "Ladder-inspired" usato nel resto dell'app PWA:

- Header: `bg-background`, `border-border` (bianco)
- Testi: `text-muted-foreground` (grigio chiaro su bianco)
- Card: stile light con `bg-primary/5`
- Fixed CTA: `bg-background` (bianco)

## Variabili Tema Scuro da Usare

Le variabili CSS `app-*` definite:
- `bg-app-background` → nero puro (#000)
- `bg-app-card` → grigio scuro (8%)
- `text-app-foreground` → bianco
- `text-app-muted-foreground` → grigio chiaro
- `border-app-border` → grigio bordo (18%)
- `bg-app-accent`, `text-app-accent` → lime (#D4FF00)

---

## File da Modificare

### 1. AtletaPTProfilePage.tsx

| Sezione | Attuale | Nuovo |
|---------|---------|-------|
| Container | `pb-24` | `pb-24 bg-app-background min-h-screen` |
| Header sticky | `bg-background border-b border-border` | `bg-app-card border-b border-app-border` |
| Back button | `variant="ghost"` | `variant="ghost" className="text-app-foreground hover:bg-app-muted"` |
| Nome PT | default | `text-app-foreground` |
| Rating text | `text-muted-foreground` | `text-app-muted-foreground` |
| Location/exp | `text-muted-foreground` | `text-app-muted-foreground` |
| Badges | `variant="secondary"` | `className="bg-app-muted border-app-border text-app-foreground"` |
| Cards (Bio, Metodo, etc.) | `Card` default | `className="bg-app-card border-app-border"` |
| CardTitle | default | `text-app-foreground` |
| Card text | `text-muted-foreground` | `text-app-muted-foreground` |
| Separator | default | `className="bg-app-border"` |
| Fixed CTA bar | `bg-background border-t border-border` | `bg-app-card border-t border-app-border` |
| CTA Button "Già collegato" | default | `bg-app-accent text-app-accent-foreground` |

### 2. PTPackagesSection.tsx

| Sezione | Attuale | Nuovo |
|---------|---------|-------|
| Active subscription card | `bg-primary/5 border-primary/20` | `bg-app-accent/10 border-app-accent/20` |
| CardTitle icon | `text-primary` | `text-app-accent` |
| Active badge | `bg-primary/10 text-primary` | `bg-app-accent text-app-accent-foreground` |
| Progress bar | default | aggiungere classe per accento lime |
| Card disponibili | default | `className="bg-app-card border-app-border"` |
| Package item border | `border rounded-lg` | `border border-app-border bg-app-card/50 rounded-xl` |
| Featured badge | `bg-warning text-warning-foreground` | `bg-app-accent text-app-accent-foreground` |
| Package title | default | `text-app-foreground` |
| Package price | default | `text-app-foreground` |
| Package description | `text-muted-foreground` | `text-app-muted-foreground` |
| Badge outline | `variant="outline"` | `className="border-app-border text-app-muted-foreground"` |
| CTA Button | default | `bg-app-accent text-app-accent-foreground hover:bg-app-accent/90` |
| Empty state | `border-dashed` | `border-dashed border-app-border bg-app-card/50` |
| Empty state icon/text | `text-muted-foreground` | `text-app-muted-foreground` |

---

## Mapping Visivo

```text
PRIMA (tema light):
+------------------------------------------+
| ← Indietro                               |  <- header bianco
+------------------------------------------+
|  [Avatar] Marco Rossi                    |  <- sfondo bianco
|          ⭐ 4.8 (15 recensioni)          |
|  📍 Milano  🏆 5 anni exp                |
|                                          |
|  [€50/ora] [Online] [In presenza]        |  <- badge grigi
+------------------------------------------+
|  ┌─────────────────────────────────────┐ |
|  │ ✓ Il tuo abbonamento attivo         │ |  <- card bianca bordo blu
|  │   Percorso Trasformazione   Attivo  │ |
|  │   [====█████------] 3/10            │ |
|  └─────────────────────────────────────┘ |
+------------------------------------------+

DOPO (tema scuro):
+------------------------------------------+
| ← Indietro                               |  <- header grigio scuro
+------------------------------------------+
|  [Avatar] Marco Rossi                    |  <- sfondo nero
|          ⭐ 4.8 (15 recensioni)          |  <- testo bianco
|  📍 Milano  🏆 5 anni exp                |  <- testo grigio
|                                          |
|  [€50/ora] [Online] [In presenza]        |  <- badge scuri
+------------------------------------------+
|  ┌─────────────────────────────────────┐ |
|  │ ✓ Il tuo abbonamento attivo         │ |  <- card nera bordo lime
|  │   Percorso Trasformazione   Attivo  │ |  <- badge lime
|  │   [████████████-----] 3/10          │ |  <- barra lime
|  └─────────────────────────────────────┘ |
+------------------------------------------+
```

---

## Dettaglio Modifiche

### AtletaPTProfilePage.tsx

```typescript
// Container principale
<div className="pb-24 bg-app-background min-h-screen">

// Header sticky
<div className="sticky top-0 z-40 bg-app-card border-b border-app-border p-4">
  <Button variant="ghost" size="sm" onClick={() => navigate(-1)} 
          className="text-app-foreground hover:bg-app-muted">

// Profile section
<h1 className="text-xl font-bold text-app-foreground">
<span className="text-app-muted-foreground">({pt.review_count} recensioni)</span>
<div className="flex flex-wrap gap-2 mt-2 text-sm text-app-muted-foreground">

// Badges
<Badge className="gap-1 bg-app-muted border-app-border text-app-foreground">

// Specializations
<Badge variant="outline" className="border-app-border text-app-muted-foreground">

// Separator
<Separator className="bg-app-border" />

// Cards
<Card className="m-4 bg-app-card border-app-border">
  <CardTitle className="text-base text-app-foreground">
  <p className="text-sm text-app-muted-foreground whitespace-pre-wrap">

// Reviews card
// Avatar fallback
<AvatarFallback className="bg-app-muted text-app-foreground">

// Fixed CTA
<div className="fixed bottom-20 left-0 right-0 p-4 bg-app-card border-t border-app-border safe-bottom">
  <Button className="w-full bg-app-accent text-app-accent-foreground" disabled>
```

### PTPackagesSection.tsx

```typescript
// Active subscription card
<Card className="bg-app-accent/10 border-app-accent/20">
  <CardTitle className="text-base flex items-center gap-2 text-app-foreground">
    <CheckCircle2 className="h-4 w-4 text-app-accent" />
  <Badge className="bg-app-accent text-app-accent-foreground">Attivo</Badge>
  <span className="text-app-muted-foreground">Sessioni utilizzate</span>
  <span className="font-medium text-app-foreground">
  <Progress className="h-2 bg-app-muted [&>div]:bg-app-accent" />
  <p className="text-xs text-app-muted-foreground mt-1">

// Available packages card
<Card className="bg-app-card border-app-border">
  <CardTitle className="text-base flex items-center gap-2 text-app-foreground">
  
// Package item
<div className="border border-app-border bg-app-muted/50 rounded-xl p-4 space-y-3 relative">
  <Badge className="absolute -top-2 -right-2 bg-app-accent text-app-accent-foreground">
  <h4 className="font-semibold text-app-foreground">{pkg.name}</h4>
  <p className="text-sm text-app-muted-foreground">
  <span className="text-xl font-bold text-app-foreground">€{pkg.price}</span>
  <p className="text-xs text-app-muted-foreground">
  <Badge variant="outline" className="text-xs border-app-border text-app-muted-foreground">
  <Button className="w-full bg-app-accent text-app-accent-foreground hover:bg-app-accent/90">

// Empty state
<Card className="border-dashed border-app-border bg-app-card/50">
  <Package className="h-10 w-10 mx-auto text-app-muted-foreground mb-3" />
  <p className="text-sm text-app-muted-foreground">
```

---

## Avatar Styling Coerente

Aggiungere classe consistente per AvatarFallback:

```typescript
<AvatarFallback className="bg-app-muted text-app-foreground text-2xl">
```

---

## Risultato Atteso

La pagina profilo PT vista dall'atleta sara visivamente coerente con:
- Home atleta
- Pagina workout
- Pagina profilo atleta
- Tutte le altre sezioni PWA

Tema scuro con:
- Sfondo nero puro
- Card grigio scuro
- Accenti lime per elementi attivi/primari
- Testi bianchi per contenuti principali
- Testi grigi per contenuti secondari

---

## File Coinvolti

| File | Modifiche |
|------|-----------|
| `src/pages/atleta/AtletaPTProfilePage.tsx` | Migrazione completa a classi app-* |
| `src/components/atleta/PTPackagesSection.tsx` | Migrazione completa a classi app-* |
