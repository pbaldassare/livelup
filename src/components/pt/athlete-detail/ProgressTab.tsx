import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { TrendingUp, Plus, Activity, Image as ImageIcon, Dumbbell, Camera, Calendar, CheckCircle2 } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

// =====================================================
// Progressi atleta: grafico peso, foto, allenamenti +
// possibilita' per il PT di inserire rilevazioni e foto.
// =====================================================

const PHOTO_CATEGORIES = [
  { value: 'fronte', label: 'Fronte' },
  { value: 'lato', label: 'Lato' },
  { value: 'retro', label: 'Retro' },
];

interface Props {
  atletaUserId: string;
  ptUserId?: string;
}

type ProgressPhoto = {
  id: string;
  atleta_user_id: string;
  photo_url: string;
  category: string;
  notes: string | null;
  taken_at: string;
};

type WorkoutRow = {
  id: string;
  title: string;
  status: string;
  completed_at: string | null;
  scheduled_date: string | null;
  created_at: string;
};

export function ProgressTab({ atletaUserId, ptUserId }: Props) {
  const qc = useQueryClient();
  const [measureOpen, setMeasureOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['pt-athlete-progress-full', atletaUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('progress_tracking')
        .select('*')
        .eq('atleta_user_id', atletaUserId)
        .order('tracked_date', { ascending: false })
        .limit(60);
      if (error) throw error;
      return data;
    },
  });

  const { data: photos = [] } = useQuery({
    queryKey: ['pt-athlete-progress-photos', atletaUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('progress_photos')
        .select('*')
        .eq('atleta_user_id', atletaUserId)
        .order('taken_at', { ascending: false })
        .limit(24);
      if (error) throw error;
      return data as ProgressPhoto[];
    },
  });

  const { data: workouts = [] } = useQuery({
    queryKey: ['pt-athlete-workouts-progress', atletaUserId, ptUserId ?? 'all'],
    queryFn: async () => {
      let q = supabase
        .from('workouts')
        .select('id, title, status, completed_at, scheduled_date, created_at')
        .eq('atleta_user_id', atletaUserId);
      if (ptUserId) q = q.eq('pt_user_id', ptUserId);
      const { data, error } = await q.order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as WorkoutRow[];
    },
    enabled: !!atletaUserId,
  });

  const chartData = [...rows]
    .filter(r => r.weight_kg !== null && r.weight_kg !== undefined)
    .reverse()
    .map(r => ({
      date: format(new Date(r.tracked_date), 'dd MMM', { locale: it }),
      peso: Number(r.weight_kg),
    }));

  const completedWorkouts = workouts.filter(w => w.status === 'completato');
  const completionRate = workouts.length > 0
    ? Math.round((completedWorkouts.length / workouts.length) * 100)
    : 0;
  const last7DaysCompleted = completedWorkouts.filter(w => {
    const date = new Date(w.completed_at || w.scheduled_date || w.created_at);
    return date >= subDays(new Date(), 7);
  }).length;
  const recentCompleted = completedWorkouts
    .sort((a, b) => {
      const da = new Date(a.completed_at || a.created_at).getTime();
      const db = new Date(b.completed_at || b.created_at).getTime();
      return db - da;
    })
    .slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Andamento
          </h3>
          <p className="text-xs text-muted-foreground">Monitoraggio progressi dell'atleta</p>
        </div>
        <Dialog open={measureOpen} onOpenChange={setMeasureOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" /> Nuova rilevazione</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nuova rilevazione</DialogTitle></DialogHeader>
            <NewMeasureForm
              atletaUserId={atletaUserId}
              onDone={() => {
                setMeasureOpen(false);
                qc.invalidateQueries({ queryKey: ['pt-athlete-progress-full', atletaUserId] });
                qc.invalidateQueries({ queryKey: ['pt-athlete-progress', atletaUserId] });
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" /> Peso (kg)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length < 2 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Servono almeno 2 rilevazioni per il grafico.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis fontSize={11} domain={['dataMin - 2', 'dataMax + 2']} />
                <Tooltip />
                <Line type="monotone" dataKey="peso" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base flex items-center gap-2">
            <ImageIcon className="h-4 w-4" /> Foto progressi
          </CardTitle>
          <Dialog open={photoOpen} onOpenChange={setPhotoOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Camera className="h-4 w-4 mr-2" /> Carica foto
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Carica foto progresso</DialogTitle></DialogHeader>
              <PhotoUploadForm
                atletaUserId={atletaUserId}
                onDone={() => {
                  setPhotoOpen(false);
                  qc.invalidateQueries({ queryKey: ['pt-athlete-progress-photos', atletaUserId] });
                }}
              />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {photos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nessuna foto caricata. Puoi aggiungerne una per l'atleta.
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {photos.map((p) => (
                <a
                  key={p.id}
                  href={p.photo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block relative rounded-lg overflow-hidden bg-muted group"
                >
                  <img
                    src={p.photo_url}
                    alt={p.notes || p.category}
                    className="w-full aspect-[3/4] object-cover"
                    loading="lazy"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                    <span className="text-xs text-white/90 capitalize">
                      {PHOTO_CATEGORIES.find(c => c.value === p.category)?.label || p.category}
                    </span>
                    {p.notes && (
                      <p className="text-xs text-white/70 line-clamp-1">{p.notes}</p>
                    )}
                    <div className="flex items-center gap-1 text-[10px] text-white/60 mt-0.5">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(p.taken_at), 'd MMM yyyy', { locale: it })}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Dumbbell className="h-4 w-4" /> Progressi degli allenamenti
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border p-3 text-center">
              <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">
                {completedWorkouts.length}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Completati</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-2xl font-bold">{completionRate}%</p>
              <p className="text-xs text-muted-foreground mt-0.5">Tasso completamento</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-2xl font-bold">{last7DaysCompleted}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Ultimi 7 giorni</p>
            </div>
          </div>

          {recentCompleted.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nessun allenamento completato.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Ultimi completati
              </p>
              {recentCompleted.map((w) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-muted shrink-0">
                      <CheckCircle2 className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{w.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(
                          new Date(w.completed_at || w.scheduled_date || w.created_at),
                          'dd MMM yyyy',
                          { locale: it },
                        )}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-teal-600 dark:text-teal-400 border-teal-600/30">
                    Completato
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Accordion type="single" collapsible>
        <AccordionItem value="rilevazioni" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="text-base font-semibold">Ultime rilevazioni</span>
            {!isLoading && rows.length > 0 && (
              <Badge variant="secondary" className="ml-2 mr-2">
                {rows.length}
              </Badge>
            )}
          </AccordionTrigger>
          <AccordionContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Caricamento…</p>
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nessuna rilevazione.</p>
            ) : (
              <div className="space-y-2">
                {rows.slice(0, 10).map((r) => (
                  <div key={r.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium text-sm">
                        {format(new Date(r.tracked_date), 'dd MMM yyyy', { locale: it })}
                      </p>
                      <div className="flex gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                        {r.weight_kg != null && <span>Peso: {r.weight_kg} kg</span>}
                        {r.body_fat_percentage != null && <span>Grasso: {r.body_fat_percentage}%</span>}
                        {r.energy_level != null && <span>Energia: {r.energy_level}/10</span>}
                        {r.sleep_hours != null && <span>Sonno: {r.sleep_hours}h</span>}
                      </div>
                      {r.notes && <p className="text-xs italic mt-1">{r.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

function NewMeasureForm({ atletaUserId, onDone }: { atletaUserId: string; onDone: () => void }) {
  const [form, setForm] = useState({
    tracked_date: new Date().toISOString().slice(0, 10),
    weight_kg: '',
    body_fat_percentage: '',
    energy_level: '',
    sleep_hours: '',
    notes: '',
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.tracked_date) {
        throw new Error('La data è obbligatoria');
      }
      const weight = Number(form.weight_kg);
      if (!form.weight_kg || Number.isNaN(weight) || weight <= 0) {
        throw new Error('Il peso è obbligatorio e deve essere maggiore di zero');
      }

      const energy = form.energy_level ? Number(form.energy_level) : null;
      if (energy !== null && (Number.isNaN(energy) || energy < 1 || energy > 10)) {
        throw new Error('Energia deve essere tra 1 e 10');
      }

      const payload = {
        atleta_user_id: atletaUserId,
        tracked_date: form.tracked_date,
        weight_kg: weight,
        body_fat_percentage: form.body_fat_percentage ? Number(form.body_fat_percentage) : null,
        energy_level: energy,
        sleep_hours: form.sleep_hours ? Number(form.sleep_hours) : null,
        notes: form.notes.trim() || null,
      };

      const { error } = await supabase.from('progress_tracking').insert(payload);
      if (error) {
        if (error.code === '23505') {
          throw new Error('Esiste già una rilevazione per questa data');
        }
        throw error;
      }
    },
    onSuccess: () => {
      toast.success('Rilevazione salvata');
      onDone();
    },
    onError: (e: Error) => toast.error(e?.message || 'Errore'),
  });

  return (
    <div className="space-y-3">
      <div>
        <Label>Data *</Label>
        <Input
          type="date"
          value={form.tracked_date}
          onChange={(e) => setForm({ ...form, tracked_date: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Peso (kg) *</Label>
          <Input
            type="number"
            step="0.1"
            min="0"
            value={form.weight_kg}
            onChange={(e) => setForm({ ...form, weight_kg: e.target.value })}
          />
        </div>
        <div>
          <Label>% grasso <span className="text-muted-foreground font-normal">(opz.)</span></Label>
          <Input
            type="number"
            step="0.1"
            value={form.body_fat_percentage}
            onChange={(e) => setForm({ ...form, body_fat_percentage: e.target.value })}
          />
        </div>
        <div>
          <Label>Energia 1-10 <span className="text-muted-foreground font-normal">(opz.)</span></Label>
          <Input
            type="number"
            min="1"
            max="10"
            value={form.energy_level}
            onChange={(e) => setForm({ ...form, energy_level: e.target.value })}
          />
        </div>
        <div>
          <Label>Ore sonno <span className="text-muted-foreground font-normal">(opz.)</span></Label>
          <Input
            type="number"
            step="0.5"
            value={form.sleep_hours}
            onChange={(e) => setForm({ ...form, sleep_hours: e.target.value })}
          />
        </div>
      </div>
      <div>
        <Label>Note <span className="text-muted-foreground font-normal">(opz.)</span></Label>
        <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </div>
      <Button className="w-full" onClick={() => save.mutate()} disabled={save.isPending}>
        Salva rilevazione
      </Button>
    </div>
  );
}

function PhotoUploadForm({ atletaUserId, onDone }: { atletaUserId: string; onDone: () => void }) {
  const [category, setCategory] = useState('fronte');
  const [name, setName] = useState('');
  const [takenAt, setTakenAt] = useState(new Date().toISOString().slice(0, 10));
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File troppo grande (max 5MB)');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${atletaUserId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('progress-photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: signedData, error: signError } = await supabase.storage
        .from('progress-photos')
        .createSignedUrl(fileName, 60 * 60 * 24 * 365);

      if (signError) throw signError;

      const { error } = await supabase.from('progress_photos').insert({
        atleta_user_id: atletaUserId,
        photo_url: signedData.signedUrl,
        category,
        notes: name.trim() || null,
        taken_at: takenAt,
      });

      if (error) throw error;

      toast.success('Foto caricata');
      onDone();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Errore durante il caricamento';
      toast.error(message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <Label>Nome foto <span className="text-muted-foreground font-normal">(opz.)</span></Label>
        <Input
          placeholder="Es: Check-in settimana 4"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Categoria</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PHOTO_CATEGORIES.map(c => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Data</Label>
          <Input type="date" value={takenAt} onChange={(e) => setTakenAt(e.target.value)} />
        </div>
      </div>
      <div>
        <Label htmlFor="pt-photo-upload" className="cursor-pointer">
          <div className="flex items-center justify-center w-full h-32 border-2 border-dashed rounded-xl bg-muted hover:bg-muted/80 transition-colors">
            {uploading ? (
              <span className="text-muted-foreground">Caricamento…</span>
            ) : (
              <div className="text-center">
                <Camera className="h-8 w-8 mx-auto text-muted-foreground mb-1" />
                <span className="text-sm text-muted-foreground">Seleziona immagine</span>
              </div>
            )}
          </div>
        </Label>
        <input
          id="pt-photo-upload"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleUpload}
          disabled={uploading}
        />
      </div>
    </div>
  );
}

export default ProgressTab;
