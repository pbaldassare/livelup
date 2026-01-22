import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious
} from '@/components/ui/carousel';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Camera, X, ZoomIn } from 'lucide-react';
import { motion } from 'framer-motion';

// =====================================================
// PT PHOTO GALLERY - Gallery foto per profilo PT
// Con lightbox e carousel
// =====================================================

interface PTPhotoGalleryProps {
  photos: string[];
  ptName: string;
}

export function PTPhotoGallery({ photos, ptName }: PTPhotoGalleryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Placeholder images se non ci sono foto
  const displayPhotos = photos.length > 0 
    ? photos 
    : [
        'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&h=400&fit=crop',
        'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=600&h=400&fit=crop',
        'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=600&h=400&fit=crop',
        'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&h=400&fit=crop',
      ];

  const handlePhotoClick = (index: number) => {
    setSelectedIndex(index);
    setIsOpen(true);
  };

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Camera className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Galleria</h3>
          <span className="text-sm text-muted-foreground">({displayPhotos.length} foto)</span>
        </div>

        {/* Grid Gallery */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {displayPhotos.slice(0, 4).map((photo, index) => (
            <motion.button
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => handlePhotoClick(index)}
              className="relative group overflow-hidden rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <AspectRatio ratio={4 / 3}>
                <img
                  src={photo}
                  alt={`${ptName} - Foto ${index + 1}`}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
              </AspectRatio>
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 flex items-center justify-center">
                <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>

              {/* More photos indicator */}
              {index === 3 && displayPhotos.length > 4 && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-white text-lg font-bold">+{displayPhotos.length - 4}</span>
                </div>
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Lightbox Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl p-0 bg-black border-none">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="absolute right-2 top-2 z-50 text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </Button>

          <Carousel
            opts={{
              startIndex: selectedIndex,
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent>
              {displayPhotos.map((photo, index) => (
                <CarouselItem key={index}>
                  <div className="flex items-center justify-center min-h-[60vh]">
                    <img
                      src={photo}
                      alt={`${ptName} - Foto ${index + 1}`}
                      className="max-w-full max-h-[80vh] object-contain"
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-2 bg-white/10 border-none text-white hover:bg-white/20" />
            <CarouselNext className="right-2 bg-white/10 border-none text-white hover:bg-white/20" />
          </Carousel>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
            {selectedIndex + 1} / {displayPhotos.length}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default PTPhotoGallery;
