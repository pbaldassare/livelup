import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Users, Lock, Globe } from 'lucide-react';
import type { GroupWithDetails } from '@/types/groups';
import { OfficialBadge } from './OfficialBadge';
import { formatGroupLocationLine } from '@/lib/groups/location';
import { cn } from '@/lib/utils';
import { FollowStarButton } from '@/components/app/FollowStarButton';

interface GroupCardProps {
  group: GroupWithDetails;
  basePath: string;
  className?: string;
  /** Mostra la stella "segui" (solo superficie atleta) */
  showFollowStar?: boolean;
}

export function GroupCard({ group, basePath, className, showFollowStar }: GroupCardProps) {
  const navigate = useNavigate();
  const locationLine = formatGroupLocationLine(group);
  const canOpenMembers = group.is_member || group.visibility === 'public';

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
          {showFollowStar && (
            <div className="absolute top-2 left-2 rounded-full bg-black/50 backdrop-blur">
              <FollowStarButton targetType="group" targetId={group.id} size="sm" />
            </div>
          )}
        </div>
        <CardContent className="p-3 space-y-2">
          <h3 className="font-semibold text-app-foreground line-clamp-1">{group.name}</h3>
          {locationLine && (
            <p className="text-xs text-app-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{locationLine}</span>
              {group.distance_km != null && (
                <span className="shrink-0">· {group.distance_km.toFixed(1)} km</span>
              )}
            </p>
          )}
          <div className="flex flex-wrap gap-1">
            {group.disciplines.slice(0, 3).map((d) => (
              <Badge
                key={d.id}
                variant="outline"
                className="text-[10px] border-app-accent/30 text-app-accent bg-app-accent/10"
              >
                {d.name}
              </Badge>
            ))}
            {group.disciplines.length > 3 && (
              <Badge
                variant="outline"
                className="text-[10px] border-app-border text-app-foreground"
              >
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
            {canOpenMembers && (
              <button
                type="button"
                className="text-app-accent ml-1 hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  navigate(`${basePath}/${group.id}?tab=members`);
                }}
              >
                · Vedi
              </button>
            )}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
