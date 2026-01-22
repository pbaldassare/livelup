import { ReactNode } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DashboardStatusBadge, MatchBadge } from '@/components/dashboard/DashboardStatusBadge';
import { cn } from '@/lib/utils';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Star,
  Award,
  Target,
  User,
  X
} from 'lucide-react';

// =====================================================
// DETAIL SHEET - Pannello laterale per dettagli profilo
// Segue il design reference con sezioni, badge e azioni
// =====================================================

export interface ProfileInfo {
  id: string;
  userId: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  status: string;
  createdAt?: string;
  role: 'pt' | 'atleta';
}

export interface DetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: ProfileInfo | null;
  badges?: string[];
  tags?: string[];
  stats?: { label: string; value: string | number }[];
  extraInfo?: { label: string; value: ReactNode }[];
  actions?: ReactNode;
  children?: ReactNode;
}

export function DetailSheet({
  open,
  onOpenChange,
  profile,
  badges = [],
  tags = [],
  stats = [],
  extraInfo = [],
  actions,
  children,
}: DetailSheetProps) {
  if (!profile) return null;

  const initials = `${profile.firstName?.[0] || ''}${profile.lastName?.[0] || ''}`.toUpperCase() || 'U';
  const fullName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Utente';
  
  const roleColors = {
    pt: 'bg-role-pt/10 text-role-pt ring-role-pt/20',
    atleta: 'bg-role-atleta/10 text-role-atleta ring-role-atleta/20',
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="text-left pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Avatar className={cn('h-16 w-16 ring-2', roleColors[profile.role])}>
                <AvatarImage src={profile.avatarUrl || undefined} alt={fullName} />
                <AvatarFallback className={cn('text-lg font-semibold', roleColors[profile.role])}>
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <SheetTitle className="text-xl">{fullName}</SheetTitle>
                <div className="flex items-center gap-2 mt-1">
                  <DashboardStatusBadge status={profile.status} size="sm" />
                </div>
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6 py-4">
          {/* Contact Info */}
          <DetailSection title="Contatti" icon={<User className="h-4 w-4" />}>
            <div className="space-y-3">
              {profile.email && (
                <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={profile.email} />
              )}
              {profile.phone && (
                <InfoRow icon={<Phone className="h-4 w-4" />} label="Telefono" value={profile.phone} />
              )}
              {profile.createdAt && (
                <InfoRow 
                  icon={<Calendar className="h-4 w-4" />} 
                  label="Registrato" 
                  value={new Date(profile.createdAt).toLocaleDateString('it-IT', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })} 
                />
              )}
            </div>
          </DetailSection>

          {/* Stats */}
          {stats.length > 0 && (
            <DetailSection title="Statistiche" icon={<Star className="h-4 w-4" />}>
              <div className="grid grid-cols-2 gap-3">
                {stats.map((stat, index) => (
                  <div key={index} className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>
            </DetailSection>
          )}

          {/* Badges */}
          {badges.length > 0 && (
            <DetailSection title="Badge" icon={<Award className="h-4 w-4" />}>
              <div className="flex flex-wrap gap-2">
                {badges.map((badge, index) => (
                  <MatchBadge key={index} label={badge} matched />
                ))}
              </div>
            </DetailSection>
          )}

          {/* Tags / Specializations */}
          {tags.length > 0 && (
            <DetailSection title="Specializzazioni" icon={<Target className="h-4 w-4" />}>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, index) => (
                  <span 
                    key={index} 
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </DetailSection>
          )}

          {/* Extra Info */}
          {extraInfo.length > 0 && (
            <DetailSection title="Dettagli" icon={<Target className="h-4 w-4" />}>
              <div className="space-y-3">
                {extraInfo.map((info, index) => (
                  <div key={index} className="flex items-start justify-between">
                    <span className="text-sm text-muted-foreground">{info.label}</span>
                    <span className="text-sm font-medium text-right">{info.value}</span>
                  </div>
                ))}
              </div>
            </DetailSection>
          )}

          {/* Custom content */}
          {children}
        </div>

        {/* Actions */}
        {actions && (
          <>
            <Separator className="my-4" />
            <SheetFooter className="flex-col sm:flex-row gap-2">
              {actions}
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

// =====================================================
// DETAIL SECTION - Sezione interna del sheet
// =====================================================

interface DetailSectionProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

function DetailSection({ title, icon, children, className }: DetailSectionProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        {icon}
        <span>{title}</span>
      </div>
      {children}
    </div>
  );
}

// =====================================================
// INFO ROW - Riga informativa con icona
// =====================================================

interface InfoRowProps {
  icon: ReactNode;
  label: string;
  value: string | ReactNode;
}

function InfoRow({ icon, label, value }: InfoRowProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
      </div>
    </div>
  );
}

export default DetailSheet;
