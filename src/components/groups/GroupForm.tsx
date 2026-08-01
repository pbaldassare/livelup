import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ImageUpload } from '@/components/common/ImageUpload';
import { PlacesAutocomplete } from '@/components/app/PlacesAutocomplete';
import { GroupDisciplinePicker } from './GroupDisciplinePicker';
import type { GroupFormInput, GroupVisibility } from '@/types/groups';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';

const GROUP_POLICY_TEXT = `Creando un gruppo su Livelapp accetti di:
• rispettare le regole della community e non pubblicare contenuti offensivi;
• moderare le conversazioni e segnalare abusi alla piattaforma;
• non usare il gruppo per spam, truffe o attività illegali;
• consentire a Livelapp di sospendere o rimuovere gruppi che violano le policy.`;

export interface GroupFormInitialValues {
  name?: string;
  description?: string;
  imageUrl?: string | null;
  placeLabel?: string;
  addressLine?: string;
  locationName?: string;
  latitude?: number | null;
  longitude?: number | null;
  visibility?: GroupVisibility;
  disciplineIds?: string[];
}

interface GroupFormProps {
  userId: string;
  mode: 'create' | 'edit';
  groupId?: string;
  initialValues?: GroupFormInitialValues;
  onSubmit: (input: GroupFormInput) => Promise<void>;
  isSubmitting?: boolean;
}

export function GroupForm({
  userId,
  mode,
  groupId,
  initialValues,
  onSubmit,
  isSubmitting,
}: GroupFormProps) {
  const [name, setName] = useState(initialValues?.name ?? '');
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [imageUrl, setImageUrl] = useState<string | null>(initialValues?.imageUrl ?? null);
  const [placeLabel, setPlaceLabel] = useState(initialValues?.placeLabel ?? '');
  const [addressLine, setAddressLine] = useState(initialValues?.addressLine ?? '');
  const [locationName, setLocationName] = useState(initialValues?.locationName ?? '');
  const [latitude, setLatitude] = useState<number | null | undefined>(
    initialValues?.latitude ?? undefined,
  );
  const [longitude, setLongitude] = useState<number | null | undefined>(
    initialValues?.longitude ?? undefined,
  );
  const [visibility, setVisibility] = useState<GroupVisibility>(
    initialValues?.visibility ?? 'public',
  );
  const [disciplineIds, setDisciplineIds] = useState<string[]>(
    initialValues?.disciplineIds ?? [],
  );
  const [policyAccepted, setPolicyAccepted] = useState(mode === 'edit');
  const [nameTouched, setNameTouched] = useState(false);

  const uploadPath = useMemo(() => {
    const folder = groupId ?? `draft-${userId}`;
    return `${userId}/${folder}/cover-{ext}`;
  }, [userId, groupId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setNameTouched(true);
      return;
    }
    await onSubmit({
      name,
      description,
      imageUrl,
      placeLabel,
      addressLine,
      locationName,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      visibility,
      disciplineIds,
      ...(mode === 'create' ? { policyAccepted } : {}),
    });
  };

  const clearCoords = () => {
    setLatitude(null);
    setLongitude(null);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="group-name">Nome gruppo *</Label>
        <Input
          id="group-name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (e.target.value.trim()) setNameTouched(false);
          }}
          onBlur={() => setNameTouched(true)}
          placeholder="Es. Calisthenics Milano Nord"
          maxLength={80}
          className="bg-app-muted border-app-border text-app-foreground placeholder:text-app-muted-foreground"
        />
        {nameTouched && !name.trim() && (
          <p className="text-xs text-destructive">Il nome del gruppo è obbligatorio</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Immagine copertina</Label>
        <div className="relative aspect-[2/1] rounded-xl overflow-hidden border border-app-border bg-app-muted group">
          {imageUrl ? (
            <img src={imageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-app-muted-foreground">
              <ImagePlus className="h-8 w-8 opacity-50" />
              <span className="text-sm">Nessuna immagine</span>
            </div>
          )}
          <div className="absolute bottom-3 right-3 flex gap-2">
            {imageUrl && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-8 bg-black/60 text-white border-0 hover:bg-black/80"
                onClick={() => setImageUrl(null)}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Rimuovi
              </Button>
            )}
            <ImageUpload
              bucket="group-images"
              filePath={uploadPath}
              currentUrl={imageUrl}
              onUploadComplete={setImageUrl}
              variant="inline"
              className="bg-black/60 text-white border-0 hover:bg-black/80 h-8"
            />
          </div>
        </div>
        <p className="text-[11px] text-app-muted-foreground">Opzionale · JPG/PNG fino a 5 MB</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="place-label">Nome del luogo</Label>
        <Input
          id="place-label"
          value={placeLabel}
          onChange={(e) => setPlaceLabel(e.target.value)}
          placeholder="Es. Parco Michelangelo, Spiaggia centrale, Palestra X..."
          maxLength={120}
          className="bg-app-muted border-app-border text-app-foreground placeholder:text-app-muted-foreground"
        />
        <p className="text-[11px] text-app-muted-foreground">
          Come vuoi che appaia il punto d&apos;incontro (opzionale)
        </p>
      </div>

      <div className="space-y-2">
        <Label>Zona / città</Label>
        <PlacesAutocomplete
          value={locationName}
          onChange={(v) => {
            setLocationName(v);
            if (!v.trim()) clearCoords();
          }}
          onPlaceSelect={(place) => {
            const label =
              place.name && place.name !== place.formatted_address
                ? place.name
                : place.formatted_address;
            setLocationName(label);
            setLatitude(place.geometry.location.lat);
            setLongitude(place.geometry.location.lng);
          }}
          placeholder="Cerca città o zona..."
          types={['(cities)']}
        />
        <p className="text-[11px] text-app-muted-foreground">Opzionale · utile per la ricerca per distanza</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address-line">Via / indirizzo</Label>
        <PlacesAutocomplete
          value={addressLine}
          onChange={setAddressLine}
          onPlaceSelect={(place) => {
            setAddressLine(place.formatted_address || place.name);
            if (!locationName.trim()) {
              setLocationName(place.formatted_address || place.name);
            }
            if (latitude == null) {
              setLatitude(place.geometry.location.lat);
              setLongitude(place.geometry.location.lng);
            }
          }}
          placeholder="Via, numero civico... (opzionale)"
          types={['geocode']}
        />
        <p className="text-[11px] text-app-muted-foreground">Non obbligatorio</p>
      </div>

      <div className="space-y-2">
        <Label>Discipline *</Label>
        <GroupDisciplinePicker value={disciplineIds} onChange={setDisciplineIds} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="group-desc">Descrizione</Label>
        <Textarea
          id="group-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Di cosa si occupa il gruppo?"
          rows={3}
          className="bg-app-muted border-app-border text-app-foreground placeholder:text-app-muted-foreground"
        />
      </div>

      <div className="space-y-2">
        <Label>Visibilità</Label>
        <RadioGroup
          value={visibility}
          onValueChange={(v) => setVisibility(v as GroupVisibility)}
          className="space-y-2"
        >
          <div className="flex items-start gap-2 rounded-lg border border-app-border p-3">
            <RadioGroupItem value="public" id="vis-public" className="mt-1" />
            <div>
              <Label htmlFor="vis-public" className="font-medium cursor-pointer">
                Pubblico
              </Label>
              <p className="text-xs text-app-muted-foreground">
                Visibile in ricerca per nome, zona e disciplina
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-lg border border-app-border p-3">
            <RadioGroupItem value="private" id="vis-private" className="mt-1" />
            <div>
              <Label htmlFor="vis-private" className="font-medium cursor-pointer">
                Privato
              </Label>
              <p className="text-xs text-app-muted-foreground">
                Accesso solo tramite link di invito generato
              </p>
            </div>
          </div>
        </RadioGroup>
      </div>

      {mode === 'create' && (
        <div className="rounded-lg border border-app-border bg-app-muted/30 p-3 space-y-3">
          <p className="text-xs text-app-muted-foreground whitespace-pre-line">
            {GROUP_POLICY_TEXT}
          </p>
          <div className="flex items-start gap-2">
            <Checkbox
              id="policy"
              checked={policyAccepted}
              onCheckedChange={(c) => setPolicyAccepted(c === true)}
            />
            <Label htmlFor="policy" className="text-sm cursor-pointer leading-tight">
              Accetto le policy di Livelapp per la creazione e gestione del gruppo *
            </Label>
          </div>
        </div>
      )}

      <Button
        type="submit"
        className="w-full bg-app-accent text-black hover:bg-app-accent/90"
        disabled={
          isSubmitting ||
          !name.trim() ||
          disciplineIds.length === 0 ||
          (mode === 'create' && !policyAccepted)
        }
      >
        {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        {mode === 'create' ? 'Crea gruppo' : 'Salva modifiche'}
      </Button>
    </form>
  );
}
