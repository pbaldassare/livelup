
# Piano: Mostrare Tabs Scopri anche per Atleti Connessi

## Problema Identificato

L'utente non vede le nuove tabs (Personal Trainer, Eventi, Professionisti) perche e loggato come **atleta connesso** a un PT.

La logica attuale nella pagina `AtletaDiscoverPage.tsx` (righe 851-853) fa questo:

```typescript
if (isConnected) {
  return <ConnectedAthleteEventsView />;
}
```

Questo esclude completamente le nuove tabs per gli atleti gia collegati.

---

## Soluzione Proposta

Modificare la pagina `AtletaDiscoverPage.tsx` per mostrare le tabs categoria (PT, Eventi, Professionisti) anche agli atleti connessi, con queste logiche:

| Categoria | Atleta Libero | Atleta Connesso |
|-----------|---------------|-----------------|
| **Personal Trainer** | Ricerca completa PT | Banner "Gia connesso" + possibilita di esplorare altri PT (senza richiedere connessione) |
| **Eventi** | Eventi pubblici | Eventi pubblici (invariato) |
| **Professionisti** | Nutrizionisti/Fisioterapisti | Nutrizionisti/Fisioterapisti (invariato) |

---

## Modifiche Tecniche

### File: `src/pages/atleta/AtletaDiscoverPage.tsx`

1. **Rimuovere il blocco early return** che esclude gli atleti connessi (righe 851-853)

2. **Nella sezione PT (PTSearchSection)**: Aggiungere un banner informativo se l'atleta e gia connesso, mostrando comunque la lista dei PT per esplorazione

3. **Nella sezione Eventi**: Mostrare il banner "Sei collegato a un PT!" solo per atleti connessi, seguito dagli eventi pubblici

---

## Struttura Aggiornata

```text
SCOPRI PAGE (Per TUTTI gli atleti)
+-----------------------------------------------------------+
|  Header: "Scopri"                                         |
+-----------------------------------------------------------+
|  [Personal Trainer]  [Eventi]  [Professionisti]           |
+-----------------------------------------------------------+
|                                                           |
|  Se Atleta Connesso + Tab PT:                             |
|  +-------------------------------------------------------+|
|  |  Banner: "Sei gia connesso a [Nome PT]"               ||
|  +-------------------------------------------------------+|
|  |  Lista PT (solo esplorazione, no richiesta connessione)||
|  +-------------------------------------------------------+|
|                                                           |
|  Se Atleta Connesso + Tab Eventi:                         |
|  +-------------------------------------------------------+|
|  |  Banner: "Sei collegato! Partecipa agli eventi"       ||
|  +-------------------------------------------------------+|
|  |  Lista eventi pubblici                                ||
|  +-------------------------------------------------------+|
|                                                           |
|  Tab Professionisti: Invariato (per tutti)                |
|                                                           |
+-----------------------------------------------------------+
```

---

## Dettaglio Implementazione

### 1. Rimuovere Early Return

```typescript
// RIMUOVERE questo blocco:
if (isConnected) {
  return <ConnectedAthleteEventsView />;
}
```

### 2. Passare isConnected ai componenti

```typescript
{activeCategory === 'pt' && <PTSearchSection isConnected={isConnected} ptName={ptName} />}
{activeCategory === 'events' && <EventsSection isConnected={isConnected} />}
{activeCategory === 'professionals' && <ProfessionalsSection />}
```

### 3. Aggiungere Banner in PTSearchSection

```tsx
{isConnected && (
  <div className="bg-app-accent/20 rounded-xl p-4 border border-app-accent/30 mb-4">
    <p className="text-app-foreground">
      Sei gia connesso a <strong>{ptName}</strong>. 
      Esplora altri professionisti della community.
    </p>
  </div>
)}
```

### 4. Aggiungere Banner in EventsSection

```tsx
{isConnected && (
  <div className="bg-app-accent/20 rounded-xl p-4 border border-app-accent/30 mb-4">
    <PartyPopper className="h-5 w-5 text-app-accent" />
    <h2>Sei collegato a un PT!</h2>
    <p>Esplora gli eventi della community e partecipa!</p>
  </div>
)}
```

---

## File da Modificare

| File | Modifica |
|------|----------|
| `src/pages/atleta/AtletaDiscoverPage.tsx` | Rimuovere early return, passare props isConnected |
| `src/components/app/EventsSection.tsx` | Aggiungere prop isConnected e banner |

---

## Riepilogo

- **1 file principale** da modificare: `AtletaDiscoverPage.tsx`
- **1 componente** da aggiornare: `EventsSection.tsx`
- Nessuna modifica al database
- Modifica puramente di UI/UX

