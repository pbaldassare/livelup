import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Camera, Plus, Trash2, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';

const CATEGORIES = [
  { value: 'fronte', label: 'Fronte' },
  { value: 'lato', label: 'Lato' },
  { value: 'retro', label: 'Retro' },
];

interface ProgressPhoto {
  id: string;
  atleta_user_id: string;
  photo_url: string;
  category: string;
  notes: string | null;
  taken_at: string;
  created_at: string;
}

export function ProgressPhotos() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showUpload, setShowUpload] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('fronte');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);

  const { data: photos = [] } = useQuery({
    queryKey: ['progress-photos', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('progress_photos')
        .select('*')
        .eq('atleta_user_id', user.id)
        .order('taken_at', { ascending: false });
      if (error) throw error;
      return data as ProgressPhoto[];
    },
    enabled: !!user?.id,
  });

  const filteredPhotos = useMemo(() => {
    if (filterCategory === 'all') return photos;
    return photos.filter(p => p.category === filterCategory);
  }, [photos, filterCategory]);

  const deleteMutation = useMutation({
    mutationFn: async (photo: ProgressPhoto) => {
      // Extract path from URL
      const urlParts = photo.photo_url.split('/progress-photos/');
      if (urlParts[1]) {
        await supabase.storage.from('progress-photos').remove([urlParts[1]]);
      }
      const { error } = await supabase.from('progress_photos').delete().eq('id', photo.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['progress-photos'] });
      toast.success('Foto eliminata');
    },
    onError: () => toast.error('Errore durante l\'eliminazione'),
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File troppo grande (max 5MB)');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('progress-photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('progress-photos')
        .getPublicUrl(fileName);

      // For private buckets, use signed URL instead
      const { data: signedData } = await supabase.storage
        .from('progress-photos')
        .createSignedUrl(fileName, 60 * 60 * 24 * 365); // 1 year

      const photoUrl = signedData?.signedUrl || publicUrl;

      const { error } = await supabase.from('progress_photos').insert({
        atleta_user_id: user.id,
        photo_url: photoUrl,
        category: selectedCategory,
        notes: notes || null,
        taken_at: new Date().toISOString().split('T')[0],
      });

      if (error) throw error;

      toast.success('Foto caricata!');
      setShowUpload(false);
      setNotes('');
      queryClient.invalidateQueries({ queryKey: ['progress-photos'] });
    } catch (err: any) {
      toast.error(err.message || 'Errore durante il caricamento');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-app-foreground">Foto Progresso</h2>
        <Sheet open={showUpload} onOpenChange={setShowUpload}>
          <SheetTrigger asChild>
            <Button size="sm" className="bg-app-accent text-app-accent-foreground hover:bg-app-accent/90">
              <Camera className="h-4 w-4 mr-2" />
              Aggiungi
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[50vh] bg-app-background border-app-border">
            <SheetHeader>
              <SheetTitle className="text-app-foreground">Carica foto progresso</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-app-foreground">Categoria</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="bg-app-muted border-app-border text-app-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-app-foreground">Note (opzionale)</Label>
                <Input
                  placeholder="Es: Dopo 4 settimane di allenamento"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="bg-app-muted border-app-border text-app-foreground"
                />
              </div>
              <div>
                <Label htmlFor="photo-upload" className="cursor-pointer">
                  <div className="flex items-center justify-center w-full h-32 border-2 border-dashed border-app-border rounded-xl bg-app-muted hover:bg-app-muted/80 transition-colors">
                    {uploading ? (
                      <span className="text-app-muted-foreground">Caricamento...</span>
                    ) : (
                      <div className="text-center">
                        <Plus className="h-8 w-8 mx-auto text-app-muted-foreground mb-1" />
                        <span className="text-sm text-app-muted-foreground">Tocca per selezionare foto</span>
                      </div>
                    )}
                  </div>
                </Label>
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleUpload}
                  disabled={uploading}
                />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={filterCategory === 'all' ? 'default' : 'outline'}
          onClick={() => setFilterCategory('all')}
          className={filterCategory === 'all' ? 'bg-app-accent text-app-accent-foreground' : ''}
        >
          Tutte
        </Button>
        {CATEGORIES.map(c => (
          <Button
            key={c.value}
            size="sm"
            variant={filterCategory === c.value ? 'default' : 'outline'}
            onClick={() => setFilterCategory(c.value)}
            className={filterCategory === c.value ? 'bg-app-accent text-app-accent-foreground' : ''}
          >
            {c.label}
          </Button>
        ))}
      </div>

      {/* Photo Grid */}
      {filteredPhotos.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {filteredPhotos.map((photo) => (
            <div key={photo.id} className="relative group rounded-xl overflow-hidden bg-app-muted">
              <img
                src={photo.photo_url}
                alt={`Progresso ${photo.category}`}
                className="w-full aspect-[3/4] object-cover"
                loading="lazy"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                <span className="text-xs text-white/80 capitalize">{photo.category}</span>
                <div className="flex items-center gap-1 text-xs text-white/60">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(photo.taken_at), 'd MMM yyyy', { locale: it })}
                </div>
                {photo.notes && (
                  <p className="text-xs text-white/60 mt-1 line-clamp-1">{photo.notes}</p>
                )}
              </div>
              <button
                onClick={() => deleteMutation.mutate(photo)}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Camera className="h-12 w-12 mx-auto text-app-muted-foreground mb-3" />
          <p className="text-app-muted-foreground">Nessuna foto di progresso</p>
          <p className="text-sm text-app-muted-foreground mt-1">
            Scatta foto regolari per monitorare i tuoi cambiamenti
          </p>
        </div>
      )}
    </div>
  );
}
