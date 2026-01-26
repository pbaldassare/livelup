import { useState, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Zap, Camera, Loader2, ImagePlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// =====================================================
// PROFILE HEADER - Header profilo con cover image
// Design reference: Ladder_iOS_117.png
// =====================================================

interface ProfileHeaderProps {
  name: string;
  initials: string;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  streakCount?: number;
  subtitle?: string;
  onSendMessage?: () => void;
  className?: string;
  editable?: boolean;
  editableCover?: boolean;
}

export function ProfileHeader({
  name,
  initials,
  avatarUrl,
  coverUrl,
  streakCount = 0,
  subtitle,
  onSendMessage,
  className,
  editable = true,
  editableCover = true,
}: ProfileHeaderProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  const handleAvatarClick = () => {
    if (editable && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast.error('Per favore seleziona un\'immagine');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('L\'immagine deve essere inferiore a 5MB');
      return;
    }

    setIsUploading(true);
    try {
      // Generate unique filename
      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `${user.id}/avatar.${ext}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Add cache buster
      const urlWithCacheBuster = `${publicUrl}?t=${Date.now()}`;

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlWithCacheBuster })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Foto profilo aggiornata!');
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      toast.error(error.message || 'Errore durante l\'upload');
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCoverClick = () => {
    if (editableCover && coverInputRef.current) {
      coverInputRef.current.click();
    }
  };

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast.error('Per favore seleziona un\'immagine');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('L\'immagine deve essere inferiore a 10MB');
      return;
    }

    setIsUploadingCover(true);
    try {
      // Generate unique filename
      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `${user.id}/cover.${ext}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('cover-images')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('cover-images')
        .getPublicUrl(fileName);

      // Add cache buster
      const urlWithCacheBuster = `${publicUrl}?t=${Date.now()}`;

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ cover_url: urlWithCacheBuster })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Immagine di copertina aggiornata!');
    } catch (error: any) {
      console.error('Cover upload error:', error);
      toast.error(error.message || 'Errore durante l\'upload');
    } finally {
      setIsUploadingCover(false);
      // Reset input
      if (coverInputRef.current) {
        coverInputRef.current.value = '';
      }
    }
  };

  return (
    <div className={cn('relative', className)}>
      {/* Hidden cover file input */}
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        onChange={handleCoverChange}
        className="hidden"
      />
      
      {/* Cover Image */}
      <div className="h-48 w-full bg-app-muted overflow-hidden relative group">
        {coverUrl ? (
          <img 
            src={coverUrl} 
            alt="Cover" 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-app-muted to-app-background" />
        )}
        
        {/* Cover edit button */}
        {editableCover && (
          <button
            onClick={handleCoverClick}
            disabled={isUploadingCover}
            className={cn(
              "absolute bottom-3 right-3 flex items-center gap-2 px-3 py-1.5 rounded-full transition-all",
              "bg-black/60 text-white text-sm font-medium",
              "opacity-0 group-hover:opacity-100",
              isUploadingCover && "opacity-100"
            )}
          >
            {isUploadingCover ? (
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
        )}
      </div>

      {/* Avatar with streak badge */}
      <div className="relative -mt-16 ml-4">
        <div className="relative">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          
          {/* Avatar with camera overlay */}
          <button
            onClick={handleAvatarClick}
            disabled={!editable || isUploading}
            className="relative group"
          >
            <Avatar className="h-28 w-28 border-4 border-app-background">
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback className="text-3xl font-bold bg-app-muted text-app-accent">
                {initials}
              </AvatarFallback>
            </Avatar>
            
            {/* Camera overlay */}
            {editable && (
              <div className={cn(
                "absolute inset-0 flex items-center justify-center rounded-full transition-all",
                "bg-black/50 opacity-0 group-hover:opacity-100",
                isUploading && "opacity-100"
              )}>
                {isUploading ? (
                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                ) : (
                  <Camera className="h-8 w-8 text-white" />
                )}
              </div>
            )}
          </button>
          
          {/* Streak badge */}
          {streakCount > 0 && (
            <div className="absolute -bottom-1 right-0 bg-app-accent text-app-accent-foreground px-2 py-0.5 rounded-md flex items-center gap-1 text-sm font-bold">
              {streakCount}
              <Zap className="h-4 w-4" />
            </div>
          )}
        </div>
      </div>

      {/* Name and subtitle */}
      <div className="px-4 pt-3">
        <h1 className="text-2xl font-bold text-app-foreground">{name}</h1>
        {subtitle && (
          <p className="text-sm text-app-muted-foreground flex items-center gap-1 mt-0.5">
            <span className="w-3 h-3 bg-app-accent rounded-sm" />
            {subtitle}
          </p>
        )}
      </div>

      {/* Send message button */}
      {onSendMessage && (
        <div className="px-4 pt-4">
          <Button 
            variant="outline" 
            className="w-full bg-app-muted border-app-border text-app-foreground hover:bg-app-muted/80"
            onClick={onSendMessage}
          >
            SEND MESSAGE
          </Button>
        </div>
      )}
    </div>
  );
}

export default ProfileHeader;
