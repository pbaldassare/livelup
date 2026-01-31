
# Piano: Assistente IA con Ape Stilizzata nella Home

## Obiettivo

Aggiungere un componente "Assistente IA" sotto le card delle statistiche nella home atleta, con:
1. Un logo di ape stilizzata (icona SVG custom) in stile lime/dark theme
2. Interfaccia chat-like per ricevere info su attività, professionisti, eventi
3. Design coerente con lo stile dell'app (tema scuro + accento lime #D4FF00)

---

## Architettura della Soluzione

```text
ATLETA HOME PAGE
+-----------------------------------------------------------+
|  [Header + Week Calendar]                                 |
+-----------------------------------------------------------+
|  [CTA Banner / Achievement Banner]                        |
+-----------------------------------------------------------+
|  [Today's Workout Card]                                   |
+-----------------------------------------------------------+
|  [Weekly Stats Section]                                   |
|  +-------+  +-------+  +-------+                          |
|  | Stats |  | Stats |  | Stats |                          |
|  +-------+  +-------+  +-------+                          |
+-----------------------------------------------------------+
|                                                           |
|  ★ NUOVO: AI ASSISTANT CARD ★                             |
|  +-------------------------------------------------------+|
|  | [🐝 Ape Icon]  Ciao! Sono BeeBot, il tuo assistente   ||
|  |                Chiedimi info su allenamenti, eventi,  ||
|  |                professionisti o il tuo PT!            ||
|  |                                                       ||
|  |  [Input: "Chiedi qualcosa..."]              [Invia →] ||
|  +-------------------------------------------------------+|
|                                                           |
+-----------------------------------------------------------+
|  [Teammates Section]                                      |
+-----------------------------------------------------------+
|  [Progress Stats]                                         |
+-----------------------------------------------------------+
```

---

## File da Creare/Modificare

| File | Azione |
|------|--------|
| `src/components/app/AIAssistantCard.tsx` | **NUOVO** - Componente principale |
| `src/components/app/BeeIcon.tsx` | **NUOVO** - Icona SVG ape stilizzata |
| `src/pages/atleta/AtletaAppHome.tsx` | Modificare per includere AIAssistantCard |

---

## Nuovo Componente: BeeIcon.tsx

Creare un'icona SVG di ape stilizzata con:
- Corpo color lime (#D4FF00)
- Strisce nere
- Ali con effetto glow
- Design minimalista e moderno

```tsx
// Design dell'ape:
// - Corpo ovale lime con strisce nere
// - Due ali trasparenti con bordo lime
// - Antenne stilizzate
// - Animazione hover per le ali
```

---

## Nuovo Componente: AIAssistantCard.tsx

### Struttura UI

```tsx
<motion.div className="bg-gradient-to-br from-app-accent/10 to-transparent 
                        rounded-2xl p-4 border border-app-accent/30">
  {/* Header con icona ape */}
  <div className="flex items-center gap-3 mb-3">
    <BeeIcon className="h-10 w-10" />
    <div>
      <h3 className="font-bold text-white">BeeBot</h3>
      <p className="text-xs text-app-muted-foreground">Il tuo assistente AI</p>
    </div>
  </div>

  {/* Messaggio di benvenuto */}
  <p className="text-sm text-white/80 mb-4">
    Ciao! Posso aiutarti con info su allenamenti, eventi, 
    professionisti e molto altro. Cosa vuoi sapere?
  </p>

  {/* Quick actions */}
  <div className="flex flex-wrap gap-2 mb-4">
    <QuickActionButton label="Prossimi eventi" />
    <QuickActionButton label="Trova nutrizionista" />
    <QuickActionButton label="I miei progressi" />
  </div>

  {/* Input per messaggio */}
  <div className="flex items-center gap-2">
    <Input placeholder="Chiedi qualcosa..." />
    <Button><Send /></Button>
  </div>
</motion.div>
```

### Funzionalità

1. **Quick Actions**: Pulsanti rapidi per domande frequenti
2. **Input Chat**: Campo di testo per domande libere
3. **Animazioni**: Ingresso animato con framer-motion
4. **Stato Espanso**: Click sull'ape apre una chat più completa (futuro)

---

## Design dell'Ape Stilizzata

```text
    \\  //      <- Antenne (lime)
      ██        <- Testa (lime)
   ╔══████══╗   <- Ali (lime trasparente con glow)
   ║ ▓▓▓▓▓▓ ║   <- Corpo con strisce (lime + nero)
   ╚══════╝     
```

### Specifiche SVG

- **Colore primario**: hsl(66, 100%, 50%) - App Accent Lime
- **Colore strisce**: #000 (nero)
- **Ali**: Stroke lime con fill trasparente
- **Effetto glow**: drop-shadow con app-accent

---

## Integrazione nella Home

### Posizione

Inserire `<AIAssistantCard />` dopo `WeeklyStatsSection` e prima di `TeammatesSection`:

```tsx
{/* Weekly Stats */}
{weeklyStats && (
  <WeeklyStatsSection ... />
)}

{/* ★ NUOVO: AI Assistant ★ */}
<AIAssistantCard />

{/* Teammates Section */}
<TeammatesSection />
```

---

## Quick Actions Suggeriti

| Azione | Comportamento |
|--------|---------------|
| "Prossimi eventi" | Naviga a /app/discover con tab eventi |
| "Trova nutrizionista" | Naviga a /app/discover con tab professionisti |
| "I miei progressi" | Naviga a /app/progress |
| "Parla col PT" | Naviga a /app/chat |

---

## Stile e Animazioni

### Card Container
- Background: `from-app-accent/10 to-transparent` (gradient sottile lime)
- Border: `border-app-accent/30` (bordo lime tenue)
- Hover: Leggero scale e glow

### Ape Icon
- Animazione `hover`: Ali che vibrano leggermente
- Animazione `pulse`: Leggero pulsare quando "pensa"

### Input
- Stile: `bg-app-muted rounded-full`
- Placeholder: "Chiedi qualcosa..."
- Button: `bg-app-accent text-black rounded-full`

---

## Riepilogo Implementazione

| Fase | Dettaglio |
|------|-----------|
| 1 | Creare `BeeIcon.tsx` - SVG ape stilizzata |
| 2 | Creare `AIAssistantCard.tsx` - Card completa |
| 3 | Modificare `AtletaAppHome.tsx` - Inserire card |

**Totale file**: 2 nuovi + 1 modifica

---

## Note Tecniche

1. L'assistente AI è solo UI per ora (no backend AI collegato)
2. I quick actions navigano a pagine esistenti
3. L'input chat può essere esteso in futuro con integrazione AI vera
4. Il componente è visibile solo per atleti connessi (sotto le stats)
5. Lo stile segue il design system esistente (tema scuro + lime)
