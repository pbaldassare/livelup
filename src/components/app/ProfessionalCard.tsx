import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  MapPin, 
  Star, 
  Euro, 
  Wifi, 
  ChevronRight,
  Stethoscope,
  Apple
} from 'lucide-react';

export interface Professional {
  id: string;
  user_id: string;
  profession_type: 'nutrizionista' | 'fisioterapista';
  first_name: string;
  last_name: string;
  bio: string | null;
  specializations: string[] | null;
  hourly_rate: number | null;
  rating_avg: number | null;
  review_count: number | null;
  offers_online: boolean | null;
  offers_in_person: boolean | null;
  location_city: string | null;
  experience_years: number | null;
  avatar_url: string | null;
}

interface ProfessionalCardProps {
  professional: Professional;
}

export function ProfessionalCard({ professional }: ProfessionalCardProps) {
  const Icon = professional.profession_type === 'nutrizionista' ? Apple : Stethoscope;
  const professionLabel = professional.profession_type === 'nutrizionista' ? 'Nutrizionista' : 'Fisioterapista';
  
  return (
    <Link to={`/app/professional/${professional.id}`}>
      <Card className="bg-app-card border-app-border hover:border-app-accent/50 transition-colors">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="relative">
              <Avatar className="h-16 w-16 border-2 border-app-border">
                <AvatarImage src={professional.avatar_url || undefined} />
                <AvatarFallback className="bg-app-muted text-app-foreground text-lg">
                  {(professional.first_name?.[0] || '') + (professional.last_name?.[0] || '')}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 p-1 bg-app-accent rounded-full">
                <Icon className="h-3 w-3 text-app-accent-foreground" />
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-app-foreground truncate">
                    {professional.first_name} {professional.last_name}
                  </h3>
                  <p className="text-xs text-app-accent">{professionLabel}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-app-muted-foreground flex-shrink-0" />
              </div>
              
              {/* Rating & Reviews */}
              {professional.rating_avg && professional.rating_avg > 0 && (
                <div className="flex items-center gap-1 text-sm mt-1">
                  <Star className="h-4 w-4 fill-app-accent text-app-accent" />
                  <span className="font-medium text-app-foreground">{professional.rating_avg.toFixed(1)}</span>
                  <span className="text-app-muted-foreground">({professional.review_count})</span>
                </div>
              )}
              
              {/* Location & Price */}
              <div className="flex items-center gap-3 text-sm text-app-muted-foreground mt-1">
                {professional.location_city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {professional.location_city}
                  </span>
                )}
                {professional.hourly_rate && (
                  <span className="flex items-center gap-1">
                    <Euro className="h-3 w-3" />
                    {professional.hourly_rate}/h
                  </span>
                )}
                {professional.offers_online && (
                  <Wifi className="h-3 w-3 text-app-accent" />
                )}
              </div>
              
              {/* Specializations */}
              {professional.specializations && professional.specializations.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {professional.specializations.slice(0, 2).map((spec, i) => (
                    <Badge 
                      key={i} 
                      variant="secondary" 
                      className="text-xs bg-app-muted text-app-foreground"
                    >
                      {spec}
                    </Badge>
                  ))}
                  {professional.specializations.length > 2 && (
                    <Badge variant="secondary" className="text-xs bg-app-muted text-app-foreground">
                      +{professional.specializations.length - 2}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
