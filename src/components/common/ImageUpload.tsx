import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Camera, ImagePlus, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ImageUploadProps {
  bucket: string;
  filePath: string;
  currentUrl?: string | null;
  onUploadComplete: (url: string) => void;
  maxSizeMB?: number;
  variant?: 'avatar' | 'cover' | 'gallery' | 'inline';
  className?: string;
  disabled?: boolean;
  uploadLabel?: string;
  children?: React.ReactNode;
}

export function ImageUpload({
  bucket,
  filePath,
  currentUrl,
  onUploadComplete,
  maxSizeMB = 5,
  variant = 'avatar',
  className,
  disabled = false,
  uploadLabel,
  children,
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleClick = () => {
    if (!disabled && !isUploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Per favore seleziona un'immagine");
      return;
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`L'immagine deve essere inferiore a ${maxSizeMB}MB`);
      return;
    }

    setIsUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = filePath.replace('{ext}', ext);

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);

      const url = `${publicUrl}?t=${Date.now()}`;
      onUploadComplete(url);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || "Errore durante l'upload");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // If children are provided, use them as the clickable element
  if (children) {
    return (
      <div onClick={handleClick} className={className}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        {children}
      </div>
    );
  }

  if (variant === 'avatar') {
    return (
      <>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          onClick={handleClick}
          disabled={disabled || isUploading}
          className={cn('relative group', className)}
        >
          {currentUrl ? (
            <div className="h-28 w-28 rounded-full overflow-hidden border-4 border-app-background">
              <img src={currentUrl} alt="Avatar" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="h-28 w-28 rounded-full border-4 border-app-background bg-app-muted flex items-center justify-center">
              <Camera className="h-8 w-8 text-app-muted-foreground" />
            </div>
          )}
          <div className={cn(
            'absolute inset-0 flex items-center justify-center rounded-full transition-all',
            'bg-black/50 opacity-0 group-hover:opacity-100',
            isUploading && 'opacity-100'
          )}>
            {isUploading ? (
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            ) : (
              <Camera className="h-8 w-8 text-white" />
            )}
          </div>
        </button>
      </>
    );
  }

  if (variant === 'cover') {
    return (
      <>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          onClick={handleClick}
          disabled={disabled || isUploading}
          className={cn(
            'absolute bottom-3 right-3 flex items-center gap-2 px-3 py-1.5 rounded-full transition-all',
            'bg-black/60 text-white text-sm font-medium',
            'opacity-0 group-hover:opacity-100',
            isUploading && 'opacity-100',
            className
          )}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Caricamento...
            </>
          ) : (
            <>
              <ImagePlus className="h-4 w-4" />
              Modifica cover
            </>
          )}
        </button>
      </>
    );
  }

  if (variant === 'gallery') {
    return (
      <>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          onClick={handleClick}
          disabled={disabled || isUploading}
          className={cn(
            'w-full h-full border-2 border-dashed border-muted-foreground/30 rounded-lg',
            'flex flex-col items-center justify-center gap-2',
            'hover:border-primary hover:bg-primary/5 transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-primary',
            className
          )}
        >
          {isUploading ? (
            <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
          ) : (
            <>
              <ImagePlus className="h-8 w-8 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{uploadLabel || 'Aggiungi'}</span>
            </>
          )}
        </button>
      </>
    );
  }

  // inline variant
  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        onClick={handleClick}
        disabled={disabled || isUploading}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors',
          'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
          className
        )}
      >
        {isUploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : currentUrl ? (
          <img src={currentUrl} alt="" className="h-6 w-6 rounded object-cover" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
        <span>{currentUrl ? 'Cambia foto' : 'Aggiungi foto'}</span>
      </button>
    </>
  );
}

export default ImageUpload;
