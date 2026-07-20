// =====================================================
// API: Scoperta PT
// Ricerca e filtri per atleti
// =====================================================

import { supabase } from '@/integrations/supabase/client';
import type { PTProfile } from '@/types/database';

// =====================================================
// TIPI FILTRI
// =====================================================

export interface PTSearchFilters {
  specializations?: string[];
  minRating?: number;
  maxPrice?: number;
  minPrice?: number;
  offersOnline?: boolean;
  offersInPerson?: boolean;
  city?: string;
  country?: string;
  level?: 'junior' | 'senior' | 'elite';
  maxDistance?: number; // km
  userLat?: number;
  userLng?: number;
}

export interface PTSearchResult {
  id: string;
  user_id: string;
  bio: string | null;
  specializations: string[] | null;
  certifications: string[] | null;
  experience_years: number | null;
  hourly_rate: number | null;
  currency: string | null;
  location_city: string | null;
  location_country: string | null;
  offers_online: boolean;
  offers_in_person: boolean;
  rating_avg: number;
  review_count: number;
  level: string | null;
  // Profile info
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  // Calculated
  distance_km?: number;
}

// =====================================================
// RICERCA PT PUBBLICI
// =====================================================

export async function searchPTs(filters: PTSearchFilters = {}): Promise<PTSearchResult[]> {
  // Query base: solo PT attivi e visibili
  let query = supabase
    .from('pt_profiles')
    .select(`
      id,
      user_id,
      bio,
      specializations,
      certifications,
      experience_years,
      hourly_rate,
      currency,
      location_city,
      location_country,
      location_lat,
      location_lng,
      offers_online,
      offers_in_person,
      rating_avg,
      review_count,
      level,
      profiles!inner (
        first_name,
        last_name,
        avatar_url
      )
    `)
    .eq('is_discoverable', true)
    .eq('status', 'attivo');

  // Filtro specializzazioni
  if (filters.specializations && filters.specializations.length > 0) {
    query = query.overlaps('specializations', filters.specializations);
  }

  // Filtro rating
  if (filters.minRating) {
    query = query.gte('rating_avg', filters.minRating);
  }

  // Filtro prezzo
  if (filters.minPrice) {
    query = query.gte('hourly_rate', filters.minPrice);
  }
  if (filters.maxPrice) {
    query = query.lte('hourly_rate', filters.maxPrice);
  }

  // Filtro modalità
  if (filters.offersOnline !== undefined) {
    query = query.eq('offers_online', filters.offersOnline);
  }
  if (filters.offersInPerson !== undefined) {
    query = query.eq('offers_in_person', filters.offersInPerson);
  }

  // Filtro location
  if (filters.city) {
    query = query.ilike('location_city', `%${filters.city}%`);
  }
  if (filters.country) {
    query = query.eq('location_country', filters.country);
  }

  // Filtro livello
  if (filters.level) {
    query = query.eq('level', filters.level);
  }

  // Ordina per rating
  query = query.order('rating_avg', { ascending: false });

  const { data, error } = await query;

  if (error) {
    throw new Error('Errore ricerca PT: ' + error.message);
  }

  // Trasforma risultati
  let results: PTSearchResult[] = (data || []).map((pt: any) => ({
    id: pt.id,
    user_id: pt.user_id,
    bio: pt.bio,
    specializations: pt.specializations,
    certifications: pt.certifications,
    experience_years: pt.experience_years,
    hourly_rate: pt.hourly_rate,
    currency: pt.currency,
    location_city: pt.location_city,
    location_country: pt.location_country,
    offers_online: pt.offers_online,
    offers_in_person: pt.offers_in_person,
    rating_avg: pt.rating_avg || 0,
    review_count: pt.review_count || 0,
    level: pt.level,
    first_name: pt.profiles?.first_name,
    last_name: pt.profiles?.last_name,
    avatar_url: pt.profiles?.avatar_url,
    // Calcolo distanza se coordinate disponibili
    distance_km: filters.userLat && filters.userLng && pt.location_lat && pt.location_lng
      ? calculateDistance(
          filters.userLat,
          filters.userLng,
          pt.location_lat,
          pt.location_lng
        )
      : undefined,
  }));

  // Filtro distanza (post-query)
  if (filters.maxDistance && filters.userLat && filters.userLng) {
    results = results.filter(
      (pt) => pt.distance_km !== undefined && pt.distance_km <= filters.maxDistance!
    );
  }

  // Ordina per distanza se disponibile
  if (filters.userLat && filters.userLng) {
    results.sort((a, b) => {
      if (a.distance_km === undefined) return 1;
      if (b.distance_km === undefined) return -1;
      return a.distance_km - b.distance_km;
    });
  }

  return results;
}

// =====================================================
// OTTIENI DETTAGLIO PT PUBBLICO
// =====================================================

export async function getPTPublicProfile(ptUserId: string) {
  const { data, error } = await supabase
    .from('pt_profiles')
    .select(`
      *,
      profiles!inner (
        first_name,
        last_name,
        avatar_url,
        bio
      )
    `)
    .eq('user_id', ptUserId)
    .eq('is_discoverable', true)
    .eq('status', 'attivo')
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found or not visible
    }
    throw new Error('Errore recupero profilo: ' + error.message);
  }

  return data;
}

// =====================================================
// OTTIENI RECENSIONI PT
// =====================================================

export async function getPTReviews(ptUserId: string, limit = 10) {
  const { data, error } = await supabase
    .from('pt_reviews')
    .select(`
      *,
      profiles:atleta_user_id (
        first_name,
        last_name,
        avatar_url
      )
    `)
    .eq('pt_user_id', ptUserId)
    .eq('is_visible', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error('Errore recupero recensioni: ' + error.message);
  }

  return data;
}

// =====================================================
// OTTIENI DISPONIBILITÀ PT
// =====================================================

export async function getPTAvailability(ptUserId: string) {
  const { data, error } = await supabase
    .from('pt_availability')
    .select('*')
    .eq('pt_user_id', ptUserId)
    .eq('is_available', true)
    .order('day_of_week', { ascending: true });

  if (error) {
    throw new Error('Errore recupero disponibilità: ' + error.message);
  }

  return data;
}

// =====================================================
// RICERCA COLLEGHI (PT app — "Cerca PT e professionisti")
// =====================================================

export interface PTColleague {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  specializations: string[] | null;
  location_city: string | null;
  experience_years: number | null;
  offers_online: boolean | null;
  offers_in_person: boolean | null;
  rating_avg: number | null;
  review_count: number | null;
}

// pt_profiles non consente a un PT di leggere il profilo di un altro PT via
// RLS diretta: la ricerca passa per la RPC SECURITY DEFINER dedicata.
export async function searchPTColleagues(query?: string): Promise<PTColleague[]> {
  const { data, error } = await supabase.rpc('search_pt_colleagues', {
    _query: query?.trim() || null,
  });

  if (error) {
    throw new Error('Errore ricerca colleghi: ' + error.message);
  }

  return (data ?? []) as PTColleague[];
}

export interface ProfessionalColleague {
  id: string;
  user_id: string;
  profession_type: 'nutrizionista' | 'fisioterapista';
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  bio: string | null;
  specializations: string[] | null;
  location_city: string | null;
  experience_years: number | null;
  offers_online: boolean | null;
  offers_in_person: boolean | null;
  rating_avg: number | null;
  review_count: number | null;
}

// professional_profiles ha già una policy pubblica per le righe discoverable,
// quindi qui basta una select diretta (nessuna RPC necessaria).
export async function searchDiscoverableProfessionals(): Promise<ProfessionalColleague[]> {
  const { data, error } = await supabase
    .from('professional_profiles')
    .select(
      'id, user_id, profession_type, first_name, last_name, avatar_url, bio, specializations, location_city, experience_years, offers_online, offers_in_person, rating_avg, review_count'
    )
    .eq('is_discoverable', true)
    .eq('status', 'attivo')
    .order('rating_avg', { ascending: false });

  if (error) {
    throw new Error('Errore ricerca professionisti: ' + error.message);
  }

  return (data ?? []) as ProfessionalColleague[];
}

// =====================================================
// OTTIENI SPECIALIZZAZIONI DISPONIBILI
// =====================================================

export async function getAvailableSpecializations(): Promise<string[]> {
  const { data, error } = await supabase
    .from('pt_profiles')
    .select('specializations')
    .eq('is_discoverable', true)
    .eq('status', 'attivo');

  if (error) {
    throw new Error('Errore recupero specializzazioni: ' + error.message);
  }

  // Estrai e deduplicizza specializzazioni
  const allSpecs = new Set<string>();
  data?.forEach((pt) => {
    pt.specializations?.forEach((spec: string) => allSpecs.add(spec));
  });

  return Array.from(allSpecs).sort();
}

// =====================================================
// HELPER: Calcola distanza tra coordinate (Haversine)
// =====================================================

function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Raggio Terra in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10; // Arrotonda a 1 decimale
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
