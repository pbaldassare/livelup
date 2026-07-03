import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Users, Lock, Globe } from 'lucide-react';
import type { GroupWithDetails } from '@/types/groups';
import { OfficialBadge } from './OfficialBadge';
import { cn } from '@/lib/utils';

interface GroupCardProps {
  group: GroupWithDetails;
  basePath: string;
  className?: string;
}

export function GroupCard({ group, basePath, className }: GroupCardProps) {
  return (
    <Link to={`${basePath}/${group.id}`}>
      <Card
        className={cn(
          'overflow-hidden border-app-border bg-app-card hover:border-app-accent/40 transition-colors',
          className,
        )}
      >
        <div className="aspect-[2/1] bg-app-muted relative">
          {group.image_url ? (
            <img
              src={group.image_url}
              alt={group.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-app-muted-foreground text-sm">
              Nessuna immagine
            </div>
          )}
          <div className="absolute top-2 right-2 flex gap-1">
            {group.is_official && <OfficialBadge />}
            {group.visibility === 'private' ? (
              <Badge variant="secondary" className="gap-1">
                <Lock className="h-3 w-3" /> Privato
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <Globe className="h-3 w-3" /> Pubblico
              </Badge>
            )}
          </div>
        </div>
        <CardContent className="p-3 space-y-2">
          <h3 className="font-semibold text-app-foreground line-clamp-1">{group.name}</h3>
          {group.location_name && (
            <p className="text-xs text-app-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{group.location_name}</span>
              {group.distance_km != null && (
                <span className="shrink-0">· {group.distance_km.toFixed(1)} km</span>
              )}
            </p>
          )}
          <div className="flex flex-wrap gap-1">
            {group.disciplines.slice(0, 3).map((d) => (
              <Badge key={d.id} variant="outline" className="text-[10px]">
                {d.name}
              </Badge>
            ))}
            {group.disciplines.length > 3 && (
              <Badge variant="outline" className="text-[10px]">
                +{group.disciplines.length - 3}
              </Badge>
            )}
          </div>
          <p className="text-xs text-app-muted-foreground flex items-center gap-1">
            <Users className="h-3 w-3" />
            {group.members_count} {group.members_count === 1 ? 'membro' : 'membri'}
            {group.is_member && (
              <span className="text-app-accent ml-1">· Iscritto</span>
            )}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
