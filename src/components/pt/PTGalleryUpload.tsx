import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Camera, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { ImageUpload } from '@/components/common/ImageUpload';

const MAX_PHOTOS = 8;

export function PTGalleryUpload() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [deletePhotoUrl, setDeletePhotoUrl] = useState<string | null>(null);

  const { data: ptProfile } = useQuery({
    queryKey: ['pt-profile-gallery', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('pt_profiles')
        .select('gallery_photos')
        .eq('user_id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const galleryPhotos = ptProfile?.gallery_photos || [];
  const canAddMore = galleryPhotos.length < MAX_PHOTOS;

  const handleGalleryUploadComplete = async (url: string) => {
    if (!user?.id) return;
    const newPhotos = [...galleryPhotos, url];
    const { error } = await supabase
      .from('pt_profiles')
      .update({ gallery_photos: newPhotos })
      .eq('user_id', user.id);

    if (error) {
      toast.error('Errore durante il salvataggio');
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['pt-profile-gallery', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['pt-profile', user?.id] });
    toast.success('Foto caricata con successo!');
  };

  const deleteMutation = useMutation({
    mutationFn: async (photoUrl: string) => {
      if (!user?.id) throw new Error('Non autenticato');
      const urlParts = photoUrl.split('/pt-gallery/');
      if (urlParts.length >= 2) {
        const filePath = urlParts[1].split('?')[0];
        await supabase.storage.from('pt-gallery').remove([filePath]);
      }
      const newPhotos = galleryPhotos.filter(p => p !== photoUrl);
      const { error } = await supabase
        .from('pt_profiles')
        .update({ gallery_photos: newPhotos })
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-profile-gallery', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['pt-profile', user?.id] });
      toast.success('Foto eliminata');
      setDeletePhotoUrl(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Errore durante l'eliminazione");
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Galleria Foto
        </CardTitle>
        <CardDescription>
          Aggiungi foto per mostrare il tuo lavoro e ambiente ({galleryPhotos.length}/{MAX_PHOTOS})
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <AnimatePresence mode="popLayout">
            {galleryPhotos.map((photo, index) => (
              <motion.div
                key={photo}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ delay: index * 0.05 }}
                className="relative group"
              >
                <AspectRatio ratio={4 / 3}>
                  <img src={photo} alt={`Gallery ${index + 1}`} className="w-full h-full object-cover rounded-lg" />
                </AspectRatio>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors rounded-lg flex items-center justify-center">
                  <Button
                    variant="destructive"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setDeletePhotoUrl(photo)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {canAddMore && user?.id && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <AspectRatio ratio={4 / 3}>
                <ImageUpload
                  bucket="pt-gallery"
                  filePath={`${user.id}/${Date.now()}.{ext}`}
                  onUploadComplete={handleGalleryUploadComplete}
                  variant="gallery"
                />
              </AspectRatio>
            </motion.div>
          )}
        </div>

        {/* Delete confirmation dialog */}
        <Dialog open={!!deletePhotoUrl} onOpenChange={(open) => !open && setDeletePhotoUrl(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Conferma eliminazione
              </DialogTitle>
            </DialogHeader>
            <p className="text-muted-foreground">
              Sei sicuro di voler eliminare questa foto? L'azione non può essere annullata.
            </p>
            <DialogFooter className="gap-2">
              <DialogClose asChild>
                <Button variant="outline">Annulla</Button>
              </DialogClose>
              <Button
                variant="destructive"
                onClick={() => deletePhotoUrl && deleteMutation.mutate(deletePhotoUrl)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Elimina
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

export default PTGalleryUpload;
