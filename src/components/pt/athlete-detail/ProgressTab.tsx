import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { TrendingUp, Plus, Activity, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

// =====================================================
// Progressi atleta: grafico peso + ultime rilevazioni +
// possibilita' per il PT di inserire una nuova rilevazione.
// I dati vengono mostrati anche all'atleta in AtletaProgressPage.
// =====================================================

interface Props { atletaUserId: string; }

export function ProgressTab({ atletaUserId }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

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
        .order('taken_date', { ascending: false })
        .limit(12);
      if (error) throw error;
      return data;
    },
  });

  const chartData = [...rows]
    .filter(r => r.weight_kg !== null && r.weight_kg !== undefined)
    .reverse()
    .map(r => ({
      date: format(new Date(r.tracked_date), 'dd MMM', { locale: it }),
      peso: Number(r.weight_kg),
    }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Andamento</h3>
          <p className="text-xs text-muted-foreground">Ultime rilevazioni dell'atleta</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" /> Nuova rilevazione</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nuova rilevazione</DialogTitle></DialogHeader>
            <NewMeasureForm
              atletaUserId={atletaUserId}
              onDone={() => {
                setOpen(false);
                qc.invalidateQueries({ queryKey: ['pt-athlete-progress-full', atletaUserId] });
                qc.invalidateQueries({ queryKey: ['pt-athlete-progress', atletaUserId] });
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4" /> Peso (kg)</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length < 2 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Servono almeno 2 rilevazioni per il grafico.</p>
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
        <CardHeader><CardTitle className="text-base">Ultime rilevazioni</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Caricamento…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nessuna rilevazione.</p>
          ) : (
            <div className="space-y-2">
              {rows.slice(0, 10).map((r: any) => (
                <div key={r.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">
                      {format(new Date(r.tracked_date), 'dd MMM yyyy', { locale: it })}
                    </p>
                    <div className="flex gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                      {r.weight_kg && <span>Peso: {r.weight_kg} kg</span>}
                      {r.body_fat_percentage && <span>Grasso: {r.body_fat_percentage}%</span>}
                      {r.energy_level && <span>Energia: {r.energy_level}/10</span>}
                      {r.sleep_hours && <span>Sonno: {r.sleep_hours}h</span>}
                    </div>
                    {r.notes && <p className="text-xs italic mt-1">{r.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><ImageIcon className="h-4 w-4" /> Foto progressi</CardTitle></CardHeader>
        <CardContent>
          {photos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nessuna foto caricata dall'atleta.</p>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
              {photos.map((p: any) => (
                <a key={p.id} href={p.image_url} target="_blank" rel="noopener noreferrer" className="block aspect-square rounded-lg overflow-hidden bg-muted">
                  <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
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
      const payload: any = {
        atleta_user_id: atletaUserId,
        tracked_date: form.tracked_date,
        weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
        body_fat_percentage: form.body_fat_percentage ? Number(form.body_fat_percentage) : null,
        energy_level: form.energy_level ? Number(form.energy_level) : null,
        sleep_hours: form.sleep_hours ? Number(form.sleep_hours) : null,
        notes: form.notes || null,
      };
      const { error } = await supabase.from('progress_tracking').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Rilevazione salvata');
      onDone();
    },
    onError: (e: any) => toast.error(e?.message || 'Errore'),
  });

  return (
    <div className="space-y-3">
      <div>
        <Label>Data</Label>
        <Input type="date" value={form.tracked_date} onChange={(e) => setForm({ ...form, tracked_date: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Peso (kg)</Label>
          <Input type="number" step="0.1" value={form.weight_kg} onChange={(e) => setForm({ ...form, weight_kg: e.target.value })} />
        </div>
        <div>
          <Label>% grasso</Label>
          <Input type="number" step="0.1" value={form.body_fat_percentage} onChange={(e) => setForm({ ...form, body_fat_percentage: e.target.value })} />
        </div>
        <div>
          <Label>Energia 1-10</Label>
          <Input type="number" min="1" max="10" value={form.energy_level} onChange={(e) => setForm({ ...form, energy_level: e.target.value })} />
        </div>
        <div>
          <Label>Ore sonno</Label>
          <Input type="number" step="0.5" value={form.sleep_hours} onChange={(e) => setForm({ ...form, sleep_hours: e.target.value })} />
        </div>
      </div>
      <div>
        <Label>Note</Label>
        <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </div>
      <Button className="w-full" onClick={() => save.mutate()} disabled={save.isPending}>
        Salva rilevazione
      </Button>
    </div>
  );
}

export default ProgressTab;
