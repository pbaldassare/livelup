

# Piano: Componente ImageUpload Riutilizzabile + Integrazione Upload Media

## Cosa viene implementato

Un componente `ImageUpload` generico e riutilizzabile che gestisce upload su diversi bucket storage, con preview, validazione e feedback. Verrà integrato in 3 contesti:
1. **Avatar** (atleta e PT) — già funzionante in `ProfileHeader`, verrà estratto nel componente comune
2. **Gallery PT** — `PTGalleryUpload` già funzionante, verrà refactorato per usare `ImageUpload`
3. **Foto esercizi** — nuovo upload per `image_url` nella gestione esercizi PT

## File da creare

### `src/components/common/ImageUpload.tsx` (Nuovo)
Componente riutilizzabile con queste props:
- `bucket`: nome del bucket storage (`avatars`, `pt-gallery`, `cover-images`, `exercise-images`)
- `filePath`: path nel bucket (es. `{userId}/avatar.jpg`)
- `currentUrl`: URL immagine attuale (per preview)
- `onUploadComplete(url: string)`: callback post-upload
- `maxSizeMB`: limite dimensione (default 5)
- `aspectRatio`: rapporto aspetto preview (default 1)
- `variant`: `avatar` | `cover` | `gallery` | `inline` — stili diversi
- `className`: personalizzazione

Funzionalità:
- Click per selezionare file
- Validazione tipo (solo immagini) e dimensione
- Preview con overlay di caricamento
- Upload su storage con `upsert: true`
- Ritorna URL pubblica con cache buster

## File da modificare

### `src/components/app/ProfileHeader.tsx`
- Sostituire la logica duplicata di upload avatar e cover con `<ImageUpload>` 
- Ridurre ~100 righe di codice duplicato

### `src/components/pt/PTGalleryUpload.tsx`
- Usare `ImageUpload` per il bottone "Aggiungi" nella griglia
- Mantenere logica griglia e delete esistente

### `src/components/pt/TemplateExerciseBuilder.tsx`
- Aggiungere campo upload immagine per ogni esercizio nel template
- Usa `ImageUpload variant="inline"` per caricare `image_url` su ogni esercizio

## Database

### Nuovo bucket storage: `exercise-images`
```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('exercise-images', 'exercise-images', true);
-- RLS: authenticated users can upload, public read
```

## Dettagli tecnici

Il componente `ImageUpload` internamente:
1. Usa `useRef<HTMLInputElement>` per il file picker
2. Valida tipo MIME e dimensione
3. Upload via `supabase.storage.from(bucket).upload(path, file, { upsert })`
4. Ottiene URL pubblica via `getPublicUrl` + cache buster `?t=Date.now()`
5. Chiama `onUploadComplete(url)` — il componente padre gestisce il salvataggio nel DB

Varianti di rendering:
- `avatar`: cerchio con overlay camera (come attuale ProfileHeader)
- `cover`: rettangolo pieno con overlay "Modifica cover"
- `gallery`: quadrato con bordo tratteggiato + icona "+"
- `inline`: bottone compatto con preview piccola

