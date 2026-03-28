import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MapPin, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// =====================================================
// PLACES AUTOCOMPLETE - Google Places API Integration
// Design: dark theme + lime accent
// =====================================================

const GOOGLE_MAPS_API_KEY = 'AIzaSyA76iVcQpSnl76_G6bJVnEeOUmWVd7278I';

interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

interface PlaceDetails {
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

interface PlacesAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (place: PlaceDetails) => void;
  placeholder?: string;
  className?: string;
  types?: string[];
}

// Declare google types
declare global {
  interface Window {
    google: typeof google;
    initGooglePlaces: () => void;
  }
}

let isScriptLoaded = false;
let isScriptLoading = false;
const loadCallbacks: (() => void)[] = [];

function loadGoogleMapsScript(): Promise<void> {
  return new Promise((resolve) => {
    if (isScriptLoaded && window.google?.maps?.places) {
      resolve();
      return;
    }

    if (isScriptLoading) {
      loadCallbacks.push(resolve);
      return;
    }

    // Check if script already exists
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      const checkLoaded = setInterval(() => {
        if (window.google?.maps?.places) {
          clearInterval(checkLoaded);
          isScriptLoaded = true;
          resolve();
        }
      }, 100);
      return;
    }

    isScriptLoading = true;

    window.initGooglePlaces = () => {
      isScriptLoaded = true;
      isScriptLoading = false;
      resolve();
      loadCallbacks.forEach(cb => cb());
      loadCallbacks.length = 0;
    };

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&callback=initGooglePlaces`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  });
}

export function PlacesAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  placeholder = 'Cerca città...',
  className,
  types = ['(cities)'],
}: PlacesAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isApiLoaded, setIsApiLoaded] = useState(false);
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Load Google Maps script
  useEffect(() => {
    loadGoogleMapsScript().then(() => {
      setIsApiLoaded(true);
      autocompleteService.current = new window.google.maps.places.AutocompleteService();
      // Create a dummy div for PlacesService
      const dummyDiv = document.createElement('div');
      placesService.current = new window.google.maps.places.PlacesService(dummyDiv);
    });
  }, []);

  // Fetch predictions
  const fetchPredictions = useCallback(async (input: string) => {
    if (!autocompleteService.current || !input.trim()) {
      setPredictions([]);
      return;
    }

    setIsLoading(true);

    try {
      const request: google.maps.places.AutocompletionRequest = {
        input,
        types,
        componentRestrictions: { country: 'it' },
      };

      autocompleteService.current.getPlacePredictions(request, (results, status) => {
        setIsLoading(false);
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
          setPredictions(results.map(r => ({
            place_id: r.place_id,
            description: r.description,
            structured_formatting: {
              main_text: r.structured_formatting.main_text,
              secondary_text: r.structured_formatting.secondary_text || '',
            },
          })));
          setOpen(true);
        } else {
          setPredictions([]);
        }
      });
    } catch (error) {
      setIsLoading(false);
      setPredictions([]);
    }
  }, []);

  // Debounced search
  const handleInputChange = useCallback((newValue: string) => {
    onChange(newValue);
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (newValue.length >= 2) {
      debounceRef.current = setTimeout(() => {
        fetchPredictions(newValue);
      }, 300);
    } else {
      setPredictions([]);
      setOpen(false);
    }
  }, [onChange, fetchPredictions]);

  // Handle place selection
  const handlePlaceSelect = useCallback((prediction: PlacePrediction) => {
    if (!placesService.current) return;

    onChange(prediction.structured_formatting.main_text);
    setOpen(false);
    setPredictions([]);

    // Fetch place details for coordinates
    if (onPlaceSelect) {
      const request: google.maps.places.PlaceDetailsRequest = {
        placeId: prediction.place_id,
        fields: ['name', 'formatted_address', 'geometry'],
      };

      placesService.current.getDetails(request, (place, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
          onPlaceSelect({
            name: place.name || prediction.structured_formatting.main_text,
            formatted_address: place.formatted_address || prediction.description,
            geometry: {
              location: {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng(),
              },
            },
          });
        }
      });
    }
  }, [onChange, onPlaceSelect]);

  const handleClear = useCallback(() => {
    onChange('');
    setPredictions([]);
    setOpen(false);
  }, [onChange]);

  return (
    <Popover open={open && predictions.length > 0} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className={cn("relative", className)}>
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-app-muted-foreground" />
          <Input
            value={value}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={placeholder}
            className="pl-9 pr-8 bg-app-muted border-app-border text-app-foreground placeholder:text-app-muted-foreground"
            disabled={!isApiLoaded}
          />
          {isLoading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-app-muted-foreground" />
          )}
          {value && !isLoading && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 text-app-muted-foreground hover:text-app-foreground"
              onClick={handleClear}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[var(--radix-popover-trigger-width)] p-0 bg-app-card border-app-border" 
        align="start"
        sideOffset={4}
      >
        <Command className="bg-transparent">
          <CommandList>
            <CommandEmpty className="py-3 text-center text-sm text-app-muted-foreground">
              Nessun risultato trovato
            </CommandEmpty>
            <CommandGroup>
              {predictions.map((prediction) => (
                <CommandItem
                  key={prediction.place_id}
                  value={prediction.description}
                  onSelect={() => handlePlaceSelect(prediction)}
                  className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-app-muted text-app-foreground"
                >
                  <MapPin className="h-4 w-4 text-app-accent flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {prediction.structured_formatting.main_text}
                    </p>
                    {prediction.structured_formatting.secondary_text && (
                      <p className="text-xs text-app-muted-foreground truncate">
                        {prediction.structured_formatting.secondary_text}
                      </p>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default PlacesAutocomplete;
