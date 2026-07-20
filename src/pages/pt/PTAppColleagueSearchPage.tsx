import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { PTAppPageShell } from '@/components/app/PTAppPageShell';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ListSkeleton } from '@/components/skeletons';
import {
  searchPTColleagues,
  searchDiscoverableProfessionals,
  type PTColleague,
  type ProfessionalColleague,
} from '@/lib/api/discovery';
import { buildCoachFullName, getCoachInitials } from '@/lib/coachName';
import {
  Search,
  MapPin,
  Star,
  Wifi,
  Users,
  Dumbbell,
  Apple,
  Stethoscope,
  ExternalLink,
  Clock,
} from 'lucide-react';

// =====================================================
// CERCA PT E PROFESSIONISTI (PT App)
// Ricerca colleghi (altri PT) e professionisti (nutrizionisti,
// fisioterapisti) della community, con scheda info in un Sheet.
// =====================================================

type SelectedColleague =
  | { kind: 'pt'; data: PTColleague }
  | { kind: 'professional'; data: ProfessionalColleague };

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

export function PTAppColleagueSearchPage() {
  const [category, setCategory] = useState<'pt' | 'professionisti'>('pt');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebouncedValue(searchTerm, 300);
  const [selected, setSelected] = useState<SelectedColleague | null>(null);

  const { data: pts, isLoading: isLoadingPts } = useQuery({
    queryKey: ['pt-colleagues', debouncedSearch],
    queryFn: () => searchPTColleagues(debouncedSearch),
    enabled: category === 'pt',
  });

  const { data: professionals, isLoading: isLoadingProfessionals } = useQuery({
    queryKey: ['colleague-professionals'],
    queryFn: () => searchDiscoverableProfessionals(),
    enabled: category === 'professionisti',
  });

  const filteredProfessionals = useMemo(() => {
    if (!professionals) return [];
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return professionals;
    return professionals.filter((p) => {
      const name = `${p.first_name} ${p.last_name}`.toLowerCase();
      const city = (p.location_city || '').toLowerCase();
      const specs = (p.specializations || []).join(' ').toLowerCase();
      return name.includes(q) || city.includes(q) || specs.includes(q);
    });
  }, [professionals, debouncedSearch]);

  const isLoading = category === 'pt' ? isLoadingPts : isLoadingProfessionals;

  return (
    <PTAppPageShell
      title="Cerca colleghi"
      description="Trova PT e professionisti della community"
      showBack
      backTo="/pt/app"
    >
      <div className="space-y-4">
        <Tabs value={category} onValueChange={(v) => setCategory(v as 'pt' | 'professionisti')}>
          <TabsList className="w-full bg-app-muted">
            <TabsTrigger
              value="pt"
              className="flex-1 data-[state=active]:bg-app-accent data-[state=active]:text-app-accent-foreground gap-1.5"
            >
              <Dumbbell className="h-4 w-4" />
              Personal Trainer
            </TabsTrigger>
            <TabsTrigger
              value="professionisti"
              className="flex-1 data-[state=active]:bg-app-accent data-[state=active]:text-app-accent-foreground gap-1.5"
            >
              <Stethoscope className="h-4 w-4" />
              Professionisti
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-app-muted-foreground" />
          <Input
            placeholder="Nome, città o specializzazione..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-app-muted border-app-border text-app-foreground placeholder:text-app-muted-foreground"
          />
        </div>

        {isLoading ? (
          <ListSkeleton count={4} type="pt" />
        ) : category === 'pt' ? (
          <ColleagueList
            items={pts ?? []}
            emptyLabel="Nessun PT trovato"
            onSelect={(data) => setSelected({ kind: 'pt', data })}
          />
        ) : (
          <ProfessionalList
            items={filteredProfessionals}
            emptyLabel="Nessun professionista trovato"
            onSelect={(data) => setSelected({ kind: 'professional', data })}
          />
        )}
      </div>

      <ColleagueScheda selected={selected} onOpenChange={(open) => !open && setSelected(null)} />
    </PTAppPageShell>
  );
}

// =====================================================
// LISTA PT
// =====================================================

function ColleagueList({
  items,
  emptyLabel,
  onSelect,
}: {
  items: PTColleague[];
  emptyLabel: string;
  onSelect: (item: PTColleague) => void;
}) {
  if (items.length === 0) {
    return <EmptyResult label={emptyLabel} />;
  }

  return (
    <AnimatePresence mode="popLayout">
      <div className="space-y-3">
        {items.map((pt, index) => {
          const fullName = buildCoachFullName(pt.first_name, pt.last_name) ?? 'PT';
          return (
            <motion.div
              key={pt.user_id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ delay: index * 0.03 }}
            >
              <button
                type="button"
                onClick={() => onSelect(pt)}
                className="w-full text-left flex gap-4 p-4 rounded-2xl bg-app-card border border-app-border hover:border-app-accent/50 active:scale-[0.99] transition-all"
              >
                <Avatar className="h-14 w-14 border-2 border-app-border shrink-0">
                  <AvatarImage src={pt.avatar_url || undefined} />
                  <AvatarFallback className="bg-app-muted text-app-foreground">
                    {getCoachInitials(pt.first_name, pt.last_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-app-foreground truncate">{fullName}</p>
                  <div className="flex items-center gap-3 text-xs text-app-muted-foreground mt-1 flex-wrap">
                    {pt.rating_avg && pt.rating_avg > 0 && (
                      <span className="flex items-center gap-1 text-app-accent">
                        <Star className="h-3 w-3 fill-app-accent" />
                        {pt.rating_avg.toFixed(1)}
                      </span>
                    )}
                    {pt.location_city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {pt.location_city}
                      </span>
                    )}
                    {pt.offers_online && <Wifi className="h-3 w-3 text-app-accent" />}
                  </div>
                  {pt.specializations && pt.specializations.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {pt.specializations.slice(0, 2).map((spec) => (
                        <Badge key={spec} variant="secondary" className="text-xs bg-app-muted text-app-foreground">
                          {spec}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </button>
            </motion.div>
          );
        })}
      </div>
    </AnimatePresence>
  );
}

// =====================================================
// LISTA PROFESSIONISTI
// =====================================================

function ProfessionalList({
  items,
  emptyLabel,
  onSelect,
}: {
  items: ProfessionalColleague[];
  emptyLabel: string;
  onSelect: (item: ProfessionalColleague) => void;
}) {
  if (items.length === 0) {
    return <EmptyResult label={emptyLabel} />;
  }

  return (
    <AnimatePresence mode="popLayout">
      <div className="space-y-3">
        {items.map((professional, index) => {
          const Icon = professional.profession_type === 'nutrizionista' ? Apple : Stethoscope;
          const label = professional.profession_type === 'nutrizionista' ? 'Nutrizionista' : 'Fisioterapista';
          return (
            <motion.div
              key={professional.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ delay: index * 0.03 }}
            >
              <button
                type="button"
                onClick={() => onSelect(professional)}
                className="w-full text-left flex gap-4 p-4 rounded-2xl bg-app-card border border-app-border hover:border-app-accent/50 active:scale-[0.99] transition-all"
              >
                <div className="relative shrink-0">
                  <Avatar className="h-14 w-14 border-2 border-app-border">
                    <AvatarImage src={professional.avatar_url || undefined} />
                    <AvatarFallback className="bg-app-muted text-app-foreground">
                      {(professional.first_name?.[0] || '') + (professional.last_name?.[0] || '')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 p-1 bg-app-accent rounded-full">
                    <Icon className="h-3 w-3 text-app-accent-foreground" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-app-foreground truncate">
                    {professional.first_name} {professional.last_name}
                  </p>
                  <p className="text-xs text-app-accent">{label}</p>
                  <div className="flex items-center gap-3 text-xs text-app-muted-foreground mt-1 flex-wrap">
                    {professional.rating_avg && professional.rating_avg > 0 && (
                      <span className="flex items-center gap-1 text-app-accent">
                        <Star className="h-3 w-3 fill-app-accent" />
                        {professional.rating_avg.toFixed(1)}
                      </span>
                    )}
                    {professional.location_city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {professional.location_city}
                      </span>
                    )}
                    {professional.offers_online && <Wifi className="h-3 w-3 text-app-accent" />}
                  </div>
                </div>
              </button>
            </motion.div>
          );
        })}
      </div>
    </AnimatePresence>
  );
}

function EmptyResult({ label }: { label: string }) {
  return (
    <div className="text-center py-12">
      <Search className="h-10 w-10 mx-auto text-app-muted-foreground mb-3" />
      <p className="font-medium text-app-foreground">{label}</p>
      <p className="text-sm text-app-muted-foreground mt-1">Prova a modificare la ricerca</p>
    </div>
  );
}

// =====================================================
// SCHEDA INFO (Sheet)
// =====================================================

function ColleagueScheda({
  selected,
  onOpenChange,
}: {
  selected: SelectedColleague | null;
  onOpenChange: (open: boolean) => void;
}) {
  const isPt = selected?.kind === 'pt';
  const pt = isPt ? (selected?.data as PTColleague) : null;
  const professional = !isPt ? (selected?.data as ProfessionalColleague | null) : null;

  const fullName = isPt
    ? buildCoachFullName(pt?.first_name, pt?.last_name) ?? 'PT'
    : `${professional?.first_name ?? ''} ${professional?.last_name ?? ''}`.trim();

  const initials = isPt
    ? getCoachInitials(pt?.first_name, pt?.last_name)
    : (professional?.first_name?.[0] || '') + (professional?.last_name?.[0] || '');

  const roleLabel = isPt
    ? 'Personal Trainer'
    : professional?.profession_type === 'nutrizionista'
      ? 'Nutrizionista'
      : 'Fisioterapista';

  const common = isPt
    ? pt
    : professional
      ? {
          avatar_url: professional.avatar_url,
          bio: professional.bio,
          specializations: professional.specializations,
          location_city: professional.location_city,
          experience_years: professional.experience_years,
          offers_online: professional.offers_online,
          offers_in_person: professional.offers_in_person,
          rating_avg: professional.rating_avg,
          review_count: professional.review_count,
        }
      : null;

  return (
    <Sheet open={!!selected} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="z-[60] bg-app-card border-app-border text-app-foreground rounded-t-3xl max-h-[85vh] overflow-y-auto pb-10 safe-bottom"
      >
        {common && (
          <>
            <SheetHeader className="text-left pr-10">
              <SheetTitle className="sr-only">{fullName}</SheetTitle>
              <div className="flex items-start gap-4">
                <Avatar className="h-20 w-20 border-2 border-app-border">
                  <AvatarImage src={common.avatar_url || undefined} />
                  <AvatarFallback className="bg-app-muted text-app-foreground text-xl">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-lg font-bold text-app-foreground">{fullName}</p>
                  <p className="text-sm text-app-accent flex items-center gap-1">
                    {isPt ? <Dumbbell className="h-3.5 w-3.5" /> : <Stethoscope className="h-3.5 w-3.5" />}
                    {roleLabel}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-app-muted-foreground mt-1 flex-wrap">
                    {common.rating_avg && common.rating_avg > 0 && (
                      <span className="flex items-center gap-1 text-app-accent">
                        <Star className="h-3.5 w-3.5 fill-app-accent" />
                        {Number(common.rating_avg).toFixed(1)}
                        <span className="text-app-muted-foreground">({common.review_count ?? 0})</span>
                      </span>
                    )}
                    {common.location_city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {common.location_city}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </SheetHeader>

            <div className="mt-5 space-y-4">
              <div className="flex flex-wrap gap-2">
                {common.offers_in_person && (
                  <Badge variant="secondary" className="bg-app-muted text-app-foreground gap-1">
                    <Users className="h-3 w-3" />
                    In presenza
                  </Badge>
                )}
                {common.offers_online && (
                  <Badge variant="secondary" className="bg-app-muted text-app-foreground gap-1">
                    <Wifi className="h-3 w-3" />
                    Online
                  </Badge>
                )}
                {common.experience_years ? (
                  <Badge variant="secondary" className="bg-app-muted text-app-foreground gap-1">
                    <Clock className="h-3 w-3" />
                    {common.experience_years} anni exp.
                  </Badge>
                ) : null}
              </div>

              {common.bio && (
                <div>
                  <p className="text-xs font-medium text-app-muted-foreground uppercase tracking-wider mb-1">
                    Chi è
                  </p>
                  <p className="text-sm text-app-foreground leading-relaxed whitespace-pre-line">{common.bio}</p>
                </div>
              )}

              {common.specializations && common.specializations.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-app-muted-foreground uppercase tracking-wider mb-2">
                    Specializzazioni
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {common.specializations.map((spec) => (
                      <Badge key={spec} variant="outline" className="border-app-border text-app-foreground">
                        {spec}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {isPt && pt && (
                <Button asChild variant="outline" className="w-full border-app-border text-app-foreground">
                  <a href={`/pts/${pt.user_id}`} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Vedi profilo pubblico
                  </a>
                </Button>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default PTAppColleagueSearchPage;
