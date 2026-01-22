import { useState, useRef } from 'react';
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
  DialogTrigger,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { 
  Camera, 
  Upload, 
  X, 
  Loader2, 
  Trash2, 
  ImagePlus,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// =====================================================
// PT GALLERY UPLOAD - Gestione upload foto gallery PT
// =====================================================

const MAX_PHOTOS = 8;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function PTGalleryUpload() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [deletePhotoUrl, setDeletePhotoUrl] = useState<string | null>(null);

  // Fetch current gallery photos
  const { data: ptProfile, isLoading } = useQuery({
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

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!user?.id) throw new Error('Non autenticato');

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('pt-gallery')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('pt-gallery')
        .getPublicUrl(uploadData.path);

      const publicUrl = urlData.publicUrl;

      // Update pt_profiles with new photo
      const newPhotos = [...galleryPhotos, publicUrl];

      const { error: updateError } = await supabase
        .from('pt_profiles')
        .update({ gallery_photos: newPhotos })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      return publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-profile-gallery', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['pt-profile', user?.id] });
      toast.success('Foto caricata con successo!');
      setSelectedFile(null);
      setPreview(null);
    },
    onError: (error: Error) => {
      console.error('Upload error:', error);
      toast.error(error.message || 'Errore durante il caricamento');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (photoUrl: string) => {
      if (!user?.id) throw new Error('Non autenticato');

      // Extract file path from URL
      const urlParts = photoUrl.split('/pt-gallery/');
      if (urlParts.length < 2) throw new Error('URL foto non valido');
      const filePath = urlParts[1];

      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from('pt-gallery')
        .remove([filePath]);

      if (deleteError) throw deleteError;

      // Update pt_profiles
      const newPhotos = galleryPhotos.filter(p => p !== photoUrl);

      const { error: updateError } = await supabase
        .from('pt_profiles')
        .update({ gallery_photos: newPhotos })
        .eq('user_id', user.id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-profile-gallery', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['pt-profile', user?.id] });
      toast.success('Foto eliminata');
      setDeletePhotoUrl(null);
    },
    onError: (error: Error) => {
      console.error('Delete error:', error);
      toast.error(error.message || 'Errore durante l\'eliminazione');
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Seleziona un file immagine');
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error('L\'immagine deve essere inferiore a 5MB');
      return;
    }

    setSelectedFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  const handleDelete = () => {
    if (deletePhotoUrl) {
      deleteMutation.mutate(deletePhotoUrl);
    }
  };

  const cancelUpload = () => {
    setSelectedFile(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Galleria Foto
            </CardTitle>
            <CardDescription>
              Aggiungi foto per mostrare il tuo lavoro e ambiente ({galleryPhotos.length}/{MAX_PHOTOS})
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Photo grid */}
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
                  <img
                    src={photo}
                    alt={`Gallery ${index + 1}`}
                    className="w-full h-full object-cover rounded-lg"
                  />
                </AspectRatio>
                
                {/* Delete button overlay */}
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

          {/* Upload button */}
          {canAddMore && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              <AspectRatio ratio={4 / 3}>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "w-full h-full border-2 border-dashed border-muted-foreground/30 rounded-lg",
                    "flex flex-col items-center justify-center gap-2",
                    "hover:border-primary hover:bg-primary/5 transition-colors",
                    "focus:outline-none focus:ring-2 focus:ring-primary"
                  )}
                >
                  <ImagePlus className="h-8 w-8 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Aggiungi</span>
                </button>
              </AspectRatio>
            </motion.div>
          )}
        </div>

        {/* Upload preview dialog */}
        <Dialog open={!!preview} onOpenChange={(open) => !open && cancelUpload()}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Anteprima foto</DialogTitle>
            </DialogHeader>

            {preview && (
              <div className="space-y-4">
                <AspectRatio ratio={4 / 3}>
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full h-full object-cover rounded-lg"
                  />
                </AspectRatio>

                <DialogFooter className="gap-2">
                  <DialogClose asChild>
                    <Button variant="outline" onClick={cancelUpload}>
                      Annulla
                    </Button>
                  </DialogClose>
                  <Button 
                    onClick={handleUpload}
                    disabled={uploadMutation.isPending}
                  >
                    {uploadMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    Carica
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

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
                onClick={handleDelete}
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
