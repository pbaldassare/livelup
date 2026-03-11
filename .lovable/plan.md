

# Piano: Punto 6 — Badge Predefiniti, Trigger e Visualizzazione Profilo

## Stato Attuale

**Già implementato:**
- 13 badge predefiniti nel DB (workout count, streak, social)
- Trigger `check_and_award_badges` su tabella `workouts` (assegna badge automaticamente al completamento)
- Trigger `check_cheer_badges` su tabella `cheers`
- Query `atleta-badges` in `AtletaProfilePage` che recupera i badge guadagnati

**Problema:** Il tab "Badges" nel profilo atleta (righe 312-331) mostra dati mock/statici (stats generiche) invece dei badge reali dal DB. I badge guadagnati vengono fetchati ma mai renderizzati.

## Modifiche

### 1. `src/pages/atleta/AtletaProfilePage.tsx`
Riscrivere il `TabsContent` "badges" per:
- Fetchare **tutti i badge attivi** (non solo quelli guadagnati) per mostrare locked/unlocked
- Mostrare griglia con badge guadagnati (colorati) e non guadagnati (grigi/locked)
- Badge grande principale = prossimo traguardo con progress bar
- Sezioni raggruppate per categoria: "Allenamento", "Streak", "Social"

### 2. `src/components/app/BadgeCard.tsx`
Aggiornare il componente per supportare:
- Prop `earned: boolean` — se false, mostra versione grigia/locked
- Prop `earnedAt?: string` — data conseguimento
- Prop `emoji?: string` — usa emoji come icona (il DB usa `icon_url` con emoji)
- Prop `description?: string` — tooltip/sottotitolo

### 3. Nuova query: tutti i badge disponibili
Aggiungere query per fetchare `badges` (tutti attivi) e fare join client-side con `atleta_badges` per determinare stato earned/locked.

## Nessuna modifica DB necessaria
Badge e trigger sono già configurati correttamente. I 4 badge vecchi (seed iniziale) con criteri diversi (`workout_count`, `workout_streak`, `connection_count`) non matchano i criteri del trigger (`workouts_completed`, `streak_weeks`, `first_cheer`), ma non causano problemi — semplicemente non verranno mai assegnati. Si possono pulire in futuro.

