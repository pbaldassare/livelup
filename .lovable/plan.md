
Obiettivo
- Centrare correttamente (verticalmente) il popup “Crea Nuovo Template” su desktop, senza tornare al problema del taglio su viewport piccoli.

Cosa sta succedendo ora (perché “è troppo basso”)
- In `PTWorkoutsPage.tsx` abbiamo forzato il posizionamento “mobile-safe” con:
  - `top-[5%] translate-y-0` (default)
  - `sm:top-[50%] sm:translate-y-[-50%]` (da 640px in su)
- Nella preview di Lovable, spesso la larghezza utile del riquadro è inferiore a 640px anche “da desktop” (perché la UI è in split-screen). Quindi la variante `sm:` non entra e rimane attivo `top-[5%] translate-y-0`.
- Inoltre c’è un doppio scroll (DialogContent overflow + ScrollArea interno) che può dare percezione di “posizione sbagliata” e layout non pulito.

Soluzione proposta (robusta)
1) Rendere il dialog sempre centrato (anche sotto i 640px) ma “safe” rispetto all’altezza:
   - Tornare a `top-[50%] translate-y-[-50%]` come base (così è centrato sempre).
   - Mantenere un’altezza massima calcolata e scroll interno per evitare il taglio:
     - `max-h-[calc(100vh-2rem)] overflow-y-auto`
   - Impostare anche una larghezza “safe” su viewport stretti:
     - `w-[calc(100%-2rem)] sm:w-full`
   In pratica: centro sempre + “margine” di 1rem sopra/sotto + scroll interno.

2) Eliminare il doppio scroll:
   - Rimuovere (o ridurre) lo `ScrollArea` interno nel dialog per evitare:
     - scroll del dialog + scroll dell’area interna
   - Passare a layout “header + body scrollabile + footer fisso”:
     - `DialogContent` in `flex flex-col`
     - Body con `flex-1 min-h-0 overflow-y-auto`
     - Footer resta visibile, senza spingere il popup in posizioni strane

Modifiche puntuali
A) `src/pages/pt/PTWorkoutsPage.tsx`
- Sostituire la className attuale:
  - DA:
    - `max-w-xl max-h-[80vh] overflow-y-auto top-[5%] translate-y-0 sm:top-[50%] sm:translate-y-[-50%]`
  - A (centrato sempre + safe height + safe width):
    - `max-w-xl w-[calc(100%-2rem)] sm:w-full max-h-[calc(100vh-2rem)] top-[50%] translate-y-[-50%] overflow-hidden flex flex-col`
- Gestire lo scroll del contenuto in modo pulito:
  - Rimuovere `ScrollArea` (consigliato) e usare un wrapper:
    - `<div className="flex-1 min-h-0 overflow-y-auto pr-4"> ...form... </div>`
  - Oppure (se vogliamo mantenere ScrollArea):
    - togliere `overflow-y-auto` dal DialogContent
    - far gestire a ScrollArea tutta l’altezza con `flex-1 min-h-0`

B) (Opzionale ma consigliato) Uniformare pattern anche per altri dialog “lunghi”
- Se esistono altri popup simili, applicare lo stesso pattern (header + body scrollabile + footer fisso), per coerenza UX.

Criteri di accettazione (come verifichiamo che è risolto)
- Su desktop (anche con preview stretta) il popup risulta centrato verticalmente.
- Il popup non viene tagliato in basso su schermi piccoli: se il contenuto è lungo, scorre internamente.
- C’è un solo scroll (non doppio), e il footer con i pulsanti resta sempre raggiungibile.

Note tecniche
- Questo approccio evita di dipendere dai breakpoint `sm:` che nella preview possono non scattare “anche da desktop”.
- `max-h-[calc(100vh-2rem)]` garantisce margine costante rispetto ai bordi del viewport e previene il taglio.
