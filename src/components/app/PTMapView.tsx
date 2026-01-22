import { useState, useMemo, useCallback } from 'react';
import { GoogleMap, LoadScript, Marker, InfoWindow, MarkerClusterer } from '@react-google-maps/api';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, MapPin, Euro, Wifi, Navigation, ChevronRight } from 'lucide-react';

// =====================================================
// PT MAP VIEW - Google Maps con marker clustering
// Design: dark theme + lime accent
// =====================================================

const GOOGLE_MAPS_API_KEY = 'AIzaSyA76iVcQpSnl76_G6bJVnEeOUmWVd7278I';

interface UserLocation {
  lat: number;
  lng: number;
}

interface PTWithDistance {
  id: string;
  user_id: string;
  bio: string | null;
  specializations: string[] | null;
  hourly_rate: number | null;
  rating_avg: number | null;
  review_count: number | null;
  offers_online: boolean | null;
  offers_in_person: boolean | null;
  location_city: string | null;
  location_lat: number | null;
  location_lng: number | null;
  experience_years: number | null;
  is_discoverable: boolean | null;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  } | null;
  distance?: number | null;
}

interface PTMapViewProps {
  pts: PTWithDistance[];
  userLocation: UserLocation | null;
  selectedPT: PTWithDistance | null;
  onPTSelect: (pt: PTWithDistance | null) => void;
}

// Dark theme map styles
const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a1a' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a1a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8a' }] },
  {
    featureType: 'administrative',
    elementType: 'geometry',
    stylers: [{ color: '#2a2a2a' }],
  },
  {
    featureType: 'administrative.country',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#6a6a6a' }],
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#a0a0a0' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#6a6a6a' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#1f2e1f' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#4a6a4a' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#2a2a2a' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1a1a1a' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#3a3a3a' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#2a2a2a' }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#2a2a2a' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0a1a2a' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#3a5a7a' }],
  },
];

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

// Default center (Italy)
const defaultCenter = {
  lat: 41.9028,
  lng: 12.4964,
};

// Cluster styles (lime theme)
const clusterStyles = [
  {
    textColor: '#1a1a1a',
    height: 40,
    width: 40,
    textSize: 14,
    fontWeight: 'bold',
  },
  {
    textColor: '#1a1a1a',
    height: 50,
    width: 50,
    textSize: 16,
    fontWeight: 'bold',
  },
  {
    textColor: '#1a1a1a',
    height: 60,
    width: 60,
    textSize: 18,
    fontWeight: 'bold',
  },
];

// Create custom cluster icon with SVG
const createClusterIcon = (count: number): string => {
  const size = count < 10 ? 40 : count < 50 ? 50 : 60;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="#D4FF00" stroke="#1a1a1a" stroke-width="2"/>
      <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" 
            font-family="system-ui, sans-serif" font-size="${size < 50 ? 14 : 16}" font-weight="bold" fill="#1a1a1a">
        ${count}
      </text>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

export function PTMapView({ pts, userLocation, selectedPT, onPTSelect }: PTMapViewProps) {
  const [mapLoaded, setMapLoaded] = useState(false);

  // Calculate map center and zoom
  const mapCenter = useMemo(() => {
    if (userLocation) {
      return { lat: userLocation.lat, lng: userLocation.lng };
    }
    // If we have PTs with locations, center on first one
    const ptWithLocation = pts.find(pt => pt.location_lat && pt.location_lng);
    if (ptWithLocation) {
      return { lat: ptWithLocation.location_lat!, lng: ptWithLocation.location_lng! };
    }
    return defaultCenter;
  }, [userLocation, pts]);

  // Filter PTs with valid coordinates
  const ptsWithCoords = useMemo(() => 
    pts.filter(pt => pt.location_lat && pt.location_lng),
  [pts]);

  const onLoad = useCallback(() => {
    setMapLoaded(true);
  }, []);

  const mapOptions = useMemo(() => ({
    styles: darkMapStyle,
    disableDefaultUI: true,
    zoomControl: true,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
  }), []);

  // Clusterer options
  const clusterOptions = useMemo(() => ({
    gridSize: 60,
    minimumClusterSize: 2,
    maxZoom: 15,
    averageCenter: true,
    calculator: (markers: any[]) => {
      const count = markers.length;
      let index = 0;
      if (count >= 50) index = 2;
      else if (count >= 10) index = 1;
      return { text: String(count), index };
    },
  }), []);

  return (
    <div className="h-full w-full relative">
      <LoadScript 
        googleMapsApiKey={GOOGLE_MAPS_API_KEY}
        loadingElement={
          <div className="h-full w-full flex items-center justify-center bg-app-muted">
            <div className="text-center space-y-4">
              <Skeleton className="h-12 w-12 rounded-full mx-auto bg-app-border" />
              <p className="text-app-muted-foreground text-sm">Caricamento mappa...</p>
            </div>
          </div>
        }
      >
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={mapCenter}
          zoom={userLocation ? 12 : 6}
          options={mapOptions}
          onLoad={onLoad}
          onClick={() => onPTSelect(null)}
        >
          {mapLoaded && (
            <>
              {/* User location marker */}
              {userLocation && (
                <Marker
                  position={{ lat: userLocation.lat, lng: userLocation.lng }}
                  icon={{
                    path: google.maps.SymbolPath.CIRCLE,
                    fillColor: '#3B82F6',
                    fillOpacity: 1,
                    strokeColor: '#1E40AF',
                    strokeWeight: 3,
                    scale: 10,
                  }}
                  title="La tua posizione"
                  zIndex={1000}
                />
              )}

              {/* Clustered PT markers */}
              <MarkerClusterer
                options={clusterOptions}
                styles={clusterStyles.map((style, i) => ({
                  ...style,
                  url: createClusterIcon((i + 1) * 10),
                }))}
              >
                {(clusterer) => (
                  <>
                    {ptsWithCoords.map((pt) => (
                      <Marker
                        key={pt.id}
                        position={{ lat: pt.location_lat!, lng: pt.location_lng! }}
                        onClick={() => onPTSelect(pt)}
                        clusterer={clusterer}
                        icon={{
                          path: google.maps.SymbolPath.CIRCLE,
                          fillColor: selectedPT?.id === pt.id ? '#FFFFFF' : '#D4FF00',
                          fillOpacity: 1,
                          strokeColor: '#1a1a1a',
                          strokeWeight: 2,
                          scale: selectedPT?.id === pt.id ? 14 : 10,
                        }}
                        title={`${pt.profiles?.first_name || ''} ${pt.profiles?.last_name || ''}`}
                        zIndex={selectedPT?.id === pt.id ? 999 : 1}
                      />
                    ))}
                  </>
                )}
              </MarkerClusterer>

              {/* InfoWindow for selected PT */}
              {selectedPT && selectedPT.location_lat && selectedPT.location_lng && (
                <InfoWindow
                  position={{ lat: selectedPT.location_lat, lng: selectedPT.location_lng }}
                  onCloseClick={() => onPTSelect(null)}
                  options={{
                    pixelOffset: new google.maps.Size(0, -15),
                  }}
                >
                  <div className="bg-[#1a1a1a] text-white p-3 rounded-lg min-w-[220px] max-w-[280px]">
                    <div className="flex items-center gap-3 mb-2">
                      <Avatar className="h-12 w-12 border-2 border-[#D4FF00]">
                        <AvatarImage src={selectedPT.profiles?.avatar_url || undefined} />
                        <AvatarFallback className="bg-[#2a2a2a] text-white">
                          {(selectedPT.profiles?.first_name?.[0] || '') + (selectedPT.profiles?.last_name?.[0] || '')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white truncate text-sm">
                          {selectedPT.profiles?.first_name} {selectedPT.profiles?.last_name}
                        </h3>
                        {selectedPT.rating_avg && selectedPT.rating_avg > 0 && (
                          <div className="flex items-center gap-1 text-xs">
                            <Star className="h-3 w-3 fill-[#D4FF00] text-[#D4FF00]" />
                            <span className="text-white">{selectedPT.rating_avg.toFixed(1)}</span>
                            <span className="text-gray-400">({selectedPT.review_count})</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 text-xs text-gray-400 mb-2">
                      {selectedPT.location_city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {selectedPT.location_city}
                        </span>
                      )}
                      {selectedPT.distance !== undefined && selectedPT.distance !== null && (
                        <span className="flex items-center gap-1 text-[#D4FF00]">
                          <Navigation className="h-3 w-3" />
                          {selectedPT.distance.toFixed(1)} km
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs mb-3">
                      {selectedPT.hourly_rate && (
                        <span className="flex items-center gap-1 text-white">
                          <Euro className="h-3 w-3 text-[#D4FF00]" />
                          {selectedPT.hourly_rate}€/h
                        </span>
                      )}
                      {selectedPT.offers_online && (
                        <span className="flex items-center gap-1 text-[#D4FF00]">
                          <Wifi className="h-3 w-3" />
                          Online
                        </span>
                      )}
                    </div>

                    {selectedPT.specializations && selectedPT.specializations.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {selectedPT.specializations.slice(0, 3).map((spec: string, i: number) => (
                          <span
                            key={i}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-[#2a2a2a] text-gray-300"
                          >
                            {spec}
                          </span>
                        ))}
                        {selectedPT.specializations.length > 3 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2a2a2a] text-gray-300">
                            +{selectedPT.specializations.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    <Link 
                      to={`/app/pt/${selectedPT.user_id}`}
                      className="flex items-center justify-center gap-1 w-full py-2 rounded-lg bg-[#D4FF00] text-[#1a1a1a] font-medium text-sm hover:bg-[#c4ef00] transition-colors"
                    >
                      Vedi profilo
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                </InfoWindow>
              )}
            </>
          )}
        </GoogleMap>
      </LoadScript>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-app-background/90 backdrop-blur px-3 py-2 rounded-lg border border-app-border">
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#D4FF00]" />
            <span className="text-app-muted-foreground">PT</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-[#D4FF00] flex items-center justify-center text-[8px] font-bold text-[#1a1a1a]">5+</div>
            <span className="text-app-muted-foreground">Cluster</span>
          </div>
          {userLocation && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-app-muted-foreground">Tu</span>
            </div>
          )}
        </div>
      </div>

      {/* No PTs message */}
      {ptsWithCoords.length === 0 && mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-app-background/90 backdrop-blur px-6 py-4 rounded-xl border border-app-border text-center">
            <MapPin className="h-8 w-8 mx-auto text-app-muted-foreground mb-2" />
            <p className="text-app-foreground font-medium">Nessun PT in quest'area</p>
            <p className="text-app-muted-foreground text-sm">Prova ad ampliare la ricerca</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default PTMapView;
