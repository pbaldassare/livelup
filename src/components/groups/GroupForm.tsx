import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ImageUpload } from '@/components/common/ImageUpload';
import { PlacesAutocomplete } from '@/components/app/PlacesAutocomplete';
import { GroupDisciplinePicker } from './GroupDisciplinePicker';
import type { CreateGroupInput, GroupVisibility } from '@/types/groups';
import { Loader2 } from 'lucide-react';

const GROUP_POLICY_TEXT = `Creando un gruppo su LivelApp accetti di:
• rispettare le regole della community e non pubblicare contenuti offensivi;
• moderare le conversazioni e segnalare abusi alla piattaforma;
• non usare il gruppo per spam, truffe o attività illegali;
• consentire a LivelApp di sospendere o rimuovere gruppi che violano le policy.`;

interface GroupFormProps {
  userId: string;
  onSubmit: (input: CreateGroupInput) => Promise<void>;
  isSubmitting?: boolean;
}

export function GroupForm({ userId, onSubmit, isSubmitting }: GroupFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [locationName, setLocationName] = useState('');
  const [latitude, setLatitude] = useState<number | undefined>();
  const [longitude, setLongitude] = useState<number | undefined>();
  const [visibility, setVisibility] = useState<GroupVisibility>('public');
  const [disciplineIds, setDisciplineIds] = useState<string[]>([]);
  const [policyAccepted, setPolicyAccepted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      name,
      description,
      imageUrl: imageUrl || undefined,
      locationName,
      latitude,
      longitude,
      visibility,
      disciplineIds,
      policyAccepted,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="group-name">Nome gruppo *</Label>
        <Input
          id="group-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Es. Calisthenics Milano Nord"
          maxLength={80}
          required
          className="bg-app-muted border-app-border text-app-foreground placeholder:text-app-muted-foreground"
        />
      </div>

      <div className="space-y-2">
        <Label>Immagine copertina</Label>
        <ImageUpload
          bucket="group-images"
          filePath={`${userId}/group-{ext}`}
          currentUrl={imageUrl}
          onUploadComplete={setImageUrl}
          variant="cover"
        />
      </div>

      <div className="space-y-2">
        <Label>Località</Label>
        <PlacesAutocomplete
          value={locationName}
          onChange={setLocationName}
          onPlaceSelect={(place) => {
            setLocationName(place.formatted_address || place.name);
            setLatitude(place.geometry.location.lat);
            setLongitude(place.geometry.location.lng);
          }}
          placeholder="Cerca indirizzo, città o zona..."
          types={['geocode']}
        />
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
            Accetto le policy di LivelApp per la creazione e gestione del gruppo *
          </Label>
        </div>
      </div>

      <Button
        type="submit"
        className="w-full bg-app-accent text-black hover:bg-app-accent/90"
        disabled={isSubmitting || !policyAccepted || !name.trim() || disciplineIds.length === 0}
      >
        {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Crea gruppo
      </Button>
    </form>
  );
}
