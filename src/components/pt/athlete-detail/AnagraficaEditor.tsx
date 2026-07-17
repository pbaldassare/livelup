import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { User, Phone, Heart, Dumbbell, FileText, Save, X, Plus, Link2 } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { z } from 'zod';

// =====================================================
// Anagrafica editor — sezioni salvabili separatamente.
// Il PT collegato (o l'atleta stesso) puo' modificare i dati.
// =====================================================

interface Props {
  atletaUserId: string;
  profile: any;
  atletaProfile: any;
  connectionAcceptedAt?: string | null;
}

const personalSchema = z.object({
  first_name: z.string().trim().max(60).optional().nullable(),
  last_name: z.string().trim().max(60).optional().nullable(),
  nickname: z.string().trim().max(40).optional().nullable(),
  birth_date: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  fiscal_code: z.string().trim().max(20).optional().nullable(),
  phone: z.string().trim().max(30).optional().nullable(),
});

const contactSchema = z.object({
  address: z.string().trim().max(200).optional().nullable(),
  city: z.string().trim().max(80).optional().nullable(),
  postal_code: z.string().trim().max(10).optional().nullable(),
  emergency_contact_name: z.string().trim().max(80).optional().nullable(),
  emergency_contact_phone: z.string().trim().max(30).optional().nullable(),
});

const fitnessSchema = z.object({
  level: z.string().optional().nullable(),
  height_cm: z.number().int().min(80).max(260).optional().nullable(),
  weight_kg: z.number().min(20).max(300).optional().nullable(),
  fitness_level: z.string().trim().max(80).optional().nullable(),
  goals: z.array(z.string()).optional().nullable(),
  injuries: z.array(z.string()).optional().nullable(),
  health_notes: z.string().trim().max(2000).optional().nullable(),
  bio: z.string().trim().max(2000).optional().nullable(),
});

function useSaver(
  table: 'profiles' | 'atleta_profiles',
  atletaUserId: string,
  invalidate: () => void,
) {
  return useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      const { error } = await supabase
        .from(table)
        .update(payload)
        .eq('user_id', atletaUserId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Modifiche salvate');
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message || 'Errore salvataggio'),
  });
}

export function AnagraficaEditor({
  atletaUserId,
  profile,
  atletaProfile,
  connectionAcceptedAt,
}: Props) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['pt-athlete-detail', atletaUserId] });
    qc.invalidateQueries({ queryKey: ['profile', atletaUserId] });
  };

  const saveProfile = useSaver('profiles', atletaUserId, invalidate);
  const saveAtleta = useSaver('atleta_profiles', atletaUserId, invalidate);

  // ---------------- Personal ----------------
  const [personal, setPersonal] = useState({
    first_name: profile?.first_name ?? '',
    last_name: profile?.last_name ?? '',
    nickname: profile?.nickname ?? '',
    birth_date: profile?.birth_date ?? '',
    gender: profile?.gender ?? '',
    fiscal_code: profile?.fiscal_code ?? '',
    phone: profile?.phone ?? '',
  });
  useEffect(() => {
    setPersonal({
      first_name: profile?.first_name ?? '',
      last_name: profile?.last_name ?? '',
      nickname: profile?.nickname ?? '',
      birth_date: profile?.birth_date ?? '',
      gender: profile?.gender ?? '',
      fiscal_code: profile?.fiscal_code ?? '',
      phone: profile?.phone ?? '',
    });
  }, [profile]);

  // ---------------- Contact ----------------
  const [contact, setContact] = useState({
    address: profile?.address ?? '',
    city: profile?.city ?? '',
    postal_code: profile?.postal_code ?? '',
    emergency_contact_name: profile?.emergency_contact_name ?? '',
    emergency_contact_phone: profile?.emergency_contact_phone ?? '',
  });
  useEffect(() => {
    setContact({
      address: profile?.address ?? '',
      city: profile?.city ?? '',
      postal_code: profile?.postal_code ?? '',
      emergency_contact_name: profile?.emergency_contact_name ?? '',
      emergency_contact_phone: profile?.emergency_contact_phone ?? '',
    });
  }, [profile]);

  // ---------------- Fitness ----------------
  const [fitness, setFitness] = useState({
    level: atletaProfile?.level ?? 'intermedio',
    height_cm: atletaProfile?.height_cm ?? '',
    weight_kg: atletaProfile?.weight_kg ?? '',
    fitness_level: atletaProfile?.fitness_level ?? '',
    goals: (atletaProfile?.goals ?? []) as string[],
    injuries: (atletaProfile?.injuries ?? []) as string[],
    health_notes: atletaProfile?.health_notes ?? '',
    bio: atletaProfile?.bio ?? '',
  });
  useEffect(() => {
    setFitness({
      level: atletaProfile?.level ?? 'intermedio',
      height_cm: atletaProfile?.height_cm ?? '',
      weight_kg: atletaProfile?.weight_kg ?? '',
      fitness_level: atletaProfile?.fitness_level ?? '',
      goals: (atletaProfile?.goals ?? []) as string[],
      injuries: (atletaProfile?.injuries ?? []) as string[],
      health_notes: atletaProfile?.health_notes ?? '',
      bio: atletaProfile?.bio ?? '',
    });
  }, [atletaProfile]);

  const [newGoal, setNewGoal] = useState('');
  const [newInjury, setNewInjury] = useState('');

  const handleSavePersonal = () => {
    const parsed = personalSchema.safeParse({
      ...personal,
      birth_date: personal.birth_date || null,
    });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? 'Dati non validi');
      return;
    }
    saveProfile.mutate(parsed.data as any);
  };

  const handleSaveContact = () => {
    const parsed = contactSchema.safeParse(contact);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? 'Dati non validi');
      return;
    }
    saveProfile.mutate(parsed.data as any);
  };

  const handleSaveFitness = () => {
    const payload = {
      ...fitness,
      height_cm: fitness.height_cm === '' ? null : Number(fitness.height_cm),
      weight_kg: fitness.weight_kg === '' ? null : Number(fitness.weight_kg),
    };
    const parsed = fitnessSchema.safeParse(payload);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? 'Dati non validi');
      return;
    }
    saveAtleta.mutate(parsed.data as any);
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* PERSONALE */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" /> Dati personali
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Nome</Label>
              <Input value={personal.first_name} onChange={(e) => setPersonal({ ...personal, first_name: e.target.value })} />
            </div>
            <div>
              <Label>Cognome</Label>
              <Input value={personal.last_name} onChange={(e) => setPersonal({ ...personal, last_name: e.target.value })} />
            </div>
            <div>
              <Label>Soprannome</Label>
              <Input value={personal.nickname} onChange={(e) => setPersonal({ ...personal, nickname: e.target.value })} />
            </div>
            <div>
              <Label>Telefono</Label>
              <Input value={personal.phone} onChange={(e) => setPersonal({ ...personal, phone: e.target.value })} />
            </div>
            <div>
              <Label>Data di nascita</Label>
              <Input type="date" value={personal.birth_date ?? ''} onChange={(e) => setPersonal({ ...personal, birth_date: e.target.value })} />
            </div>
            <div>
              <Label>Genere</Label>
              <Select value={personal.gender || ''} onValueChange={(v) => setPersonal({ ...personal, gender: v })}>
                <SelectTrigger><SelectValue placeholder="Seleziona" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Maschio</SelectItem>
                  <SelectItem value="F">Femmina</SelectItem>
                  <SelectItem value="X">Altro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Codice fiscale</Label>
              <Input value={personal.fiscal_code} onChange={(e) => setPersonal({ ...personal, fiscal_code: e.target.value.toUpperCase() })} />
            </div>
            <div className="col-span-2">
              <Label className="flex items-center gap-1.5">
                <Link2 className="h-3.5 w-3.5" />
                Connesso da
              </Label>
              <Input
                readOnly
                disabled
                value={
                  connectionAcceptedAt
                    ? format(new Date(connectionAcceptedAt), 'dd MMM yyyy', { locale: it })
                    : 'N/A'
                }
              />
            </div>
          </div>
          <Button onClick={handleSavePersonal} disabled={saveProfile.isPending} className="w-full">
            <Save className="h-4 w-4 mr-2" /> Salva dati personali
          </Button>
        </CardContent>
      </Card>

      {/* CONTATTI */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Phone className="h-4 w-4" /> Contatti & Emergenza
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Indirizzo</Label>
            <Input value={contact.address} onChange={(e) => setContact({ ...contact, address: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Città</Label>
              <Input value={contact.city} onChange={(e) => setContact({ ...contact, city: e.target.value })} />
            </div>
            <div>
              <Label>CAP</Label>
              <Input value={contact.postal_code} onChange={(e) => setContact({ ...contact, postal_code: e.target.value })} />
            </div>
          </div>
          <div className="pt-2 border-t">
            <Label className="flex items-center gap-1.5"><Heart className="h-3.5 w-3.5" /> Contatto di emergenza</Label>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <Input placeholder="Nome" value={contact.emergency_contact_name} onChange={(e) => setContact({ ...contact, emergency_contact_name: e.target.value })} />
              <Input placeholder="Telefono" value={contact.emergency_contact_phone} onChange={(e) => setContact({ ...contact, emergency_contact_phone: e.target.value })} />
            </div>
          </div>
          <Button onClick={handleSaveContact} disabled={saveProfile.isPending} className="w-full">
            <Save className="h-4 w-4 mr-2" /> Salva contatti
          </Button>
        </CardContent>
      </Card>

      {/* FITNESS / OBIETTIVI */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Dumbbell className="h-4 w-4" /> Profilo fitness
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Label>Livello</Label>
              <Select value={fitness.level} onValueChange={(v) => setFitness({ ...fitness, level: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="principiante">Principiante</SelectItem>
                  <SelectItem value="intermedio">Intermedio</SelectItem>
                  <SelectItem value="avanzato">Avanzato</SelectItem>
                  <SelectItem value="atleta">Atleta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Altezza (cm)</Label>
              <Input type="number" value={fitness.height_cm} onChange={(e) => setFitness({ ...fitness, height_cm: e.target.value as any })} />
            </div>
            <div>
              <Label>Peso (kg)</Label>
              <Input type="number" step="0.1" value={fitness.weight_kg} onChange={(e) => setFitness({ ...fitness, weight_kg: e.target.value as any })} />
            </div>
            <div>
              <Label>Esperienza</Label>
              <Input placeholder="es. 3 anni palestra" value={fitness.fitness_level} onChange={(e) => setFitness({ ...fitness, fitness_level: e.target.value })} />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Obiettivi</Label>
              <div className="flex flex-wrap gap-1.5 mt-2 min-h-[28px]">
                {fitness.goals.map((g, i) => (
                  <Badge key={i} variant="secondary" className="gap-1">
                    {g}
                    <button onClick={() => setFitness({ ...fitness, goals: fitness.goals.filter((_, j) => j !== i) })}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="Aggiungi obiettivo"
                  value={newGoal}
                  onChange={(e) => setNewGoal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newGoal.trim()) {
                      setFitness({ ...fitness, goals: [...fitness.goals, newGoal.trim()] });
                      setNewGoal('');
                    }
                  }}
                />
                <Button variant="outline" size="icon" onClick={() => {
                  if (newGoal.trim()) {
                    setFitness({ ...fitness, goals: [...fitness.goals, newGoal.trim()] });
                    setNewGoal('');
                  }
                }}><Plus className="h-4 w-4" /></Button>
              </div>
            </div>

            <div>
              <Label>Infortuni / limitazioni</Label>
              <div className="flex flex-wrap gap-1.5 mt-2 min-h-[28px]">
                {fitness.injuries.map((g, i) => (
                  <Badge key={i} variant="destructive" className="gap-1">
                    {g}
                    <button onClick={() => setFitness({ ...fitness, injuries: fitness.injuries.filter((_, j) => j !== i) })}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="Aggiungi infortunio"
                  value={newInjury}
                  onChange={(e) => setNewInjury(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newInjury.trim()) {
                      setFitness({ ...fitness, injuries: [...fitness.injuries, newInjury.trim()] });
                      setNewInjury('');
                    }
                  }}
                />
                <Button variant="outline" size="icon" onClick={() => {
                  if (newInjury.trim()) {
                    setFitness({ ...fitness, injuries: [...fitness.injuries, newInjury.trim()] });
                    setNewInjury('');
                  }
                }}><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>

          <div>
            <Label className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> Note di salute (visibili all'atleta)</Label>
            <Textarea rows={3} value={fitness.health_notes} onChange={(e) => setFitness({ ...fitness, health_notes: e.target.value })} />
          </div>

          <div>
            <Label>Bio / presentazione</Label>
            <Textarea rows={3} value={fitness.bio} onChange={(e) => setFitness({ ...fitness, bio: e.target.value })} />
          </div>

          <Button onClick={handleSaveFitness} disabled={saveAtleta.isPending} className="w-full">
            <Save className="h-4 w-4 mr-2" /> Salva profilo fitness
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default AnagraficaEditor;
