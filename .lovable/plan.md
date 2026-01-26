

# Piano: Rimuovi Teammates + Aggiungi Sezione Allenamenti in Home

## Obiettivo
1. Rimuovere temporaneamente la sezione "Teammates Working Out" (dati mock che confondono)
2. Aggiungere una sezione "I tuoi prossimi allenamenti" con i workout assegnati dal PT

---

## Modifiche al File

### `src/pages/atleta/AtletaAppHome.tsx`

**Rimuovere:**
- Import di `TeammatesRow` (riga 13)
- Blocco JSX `<TeammatesRow>` (righe 229-237)

**Aggiungere:**

1. **Nuova query** per recuperare i prossimi allenamenti (non solo quello di oggi):

```typescript
const { data: upcomingWorkouts, isLoading: upcomingLoading } = useQuery({
  queryKey: ['atleta-upcoming-workouts', user?.id],
  queryFn: async () => {
    if (!user?.id) return [];
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('workouts')
      .select(`
        id, title, description, status, scheduled_date,
        workout_exercises(id)
      `)
      .eq('atleta_user_id', user.id)
      .eq('status', 'attivo')
      .gte('scheduled_date', today)
      .order('scheduled_date', { ascending: true })
      .limit(5);
    if (error) throw error;
    return data || [];
  },
  enabled: !!user?.id && isConnected,
});
```

2. **Nuova sezione UI** al posto di TeammatesRow:

```text
+------------------------------------------+
| I TUOI PROSSIMI ALLENAMENTI              |
+------------------------------------------+
| 📅 Lun 27 Gen                            |
| Full Body Principiante                   |
| 5 esercizi                               |
+------------------------------------------+
| 📅 Mer 29 Gen                            |
| HIIT Cardio Blast                        |
| 4 esercizi                               |
+------------------------------------------+
| [Vedi tutti gli allenamenti]             |
+------------------------------------------+
```

---

## Struttura UI Nuova Sezione

```typescript
{/* Prossimi Allenamenti */}
{upcomingWorkouts && upcomingWorkouts.length > 0 && (
  <div className="space-y-3">
    <h3 className="text-sm font-bold text-white uppercase tracking-wide">
      I tuoi prossimi allenamenti
    </h3>
    {upcomingWorkouts.slice(0, 3).map((workout) => (
      <div 
        key={workout.id}
        onClick={() => navigate(`/app/workout/${workout.id}`)}
        className="bg-gray-900/60 rounded-xl p-4 border border-white/10 
                   cursor-pointer hover:border-app-accent/30 transition-colors"
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-app-accent font-medium">
            {formatDate(workout.scheduled_date)}
          </span>
          <span className="text-xs text-white/40">
            {workout.workout_exercises?.length || 0} esercizi
          </span>
        </div>
        <h4 className="text-white font-semibold">{workout.title}</h4>
        {workout.description && (
          <p className="text-white/50 text-sm mt-1 line-clamp-1">
            {workout.description}
          </p>
        )}
      </div>
    ))}
    <Button 
      variant="ghost" 
      className="w-full text-app-accent"
      onClick={() => navigate('/app/workout')}
    >
      Vedi tutti gli allenamenti
    </Button>
  </div>
)}
```

---

## Helper per Formattazione Data

```typescript
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const days = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
  const months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 
                  'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
  return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
};
```

---

## Riepilogo Modifiche

| Azione | Dettaglio |
|--------|-----------|
| Rimuovi | Import `TeammatesRow` |
| Rimuovi | Blocco JSX TeammatesRow (righe 229-237) |
| Aggiungi | Query `upcomingWorkouts` per i prossimi 5 workout |
| Aggiungi | Funzione helper `formatDate()` |
| Aggiungi | Sezione "I tuoi prossimi allenamenti" con card cliccabili |
| Aggiungi | Bottone "Vedi tutti gli allenamenti" che porta a `/app/workout` |

---

## Dettagli Tecnici

- La query usa `gte('scheduled_date', today)` per prendere solo allenamenti futuri
- Include il conteggio esercizi tramite la relazione `workout_exercises(id)`
- Mostra massimo 3 workout nella home per non appesantire
- Il bottone finale porta alla pagina completa degli allenamenti
- Design coerente con il tema scuro (bg-gray-900/60, border-white/10, text-app-accent)

