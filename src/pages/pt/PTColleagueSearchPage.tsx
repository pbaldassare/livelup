import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
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
  LayoutDashboard,
} from 'lucide-react';

// =====================================================
// CERCA PT E PROFESSIONISTI (PT web dashboard)
// Stessa logica/API della PWA: colleghi PT via RPC
// search_pt_colleagues + professionisti discoverable.
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

function isMissingColleagueSearchRpc(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const message = String((error as { message?: string }).message ?? '').toLowerCase();
  const code = (error as { code?: string }).code;
  return (
    code === 'PGRST202' ||
    message.includes('search_pt_colleagues') ||
    message.includes('could not find the function') ||
    message.includes('does not exist')
  );
}

export function PTColleagueSearchPage() {
  const [category, setCategory] = useState<'pt' | 'professionisti'>('pt');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebouncedValue(searchTerm, 300);
  const [selected, setSelected] = useState<SelectedColleague | null>(null);

  const {
    data: pts,
    isLoading: isLoadingPts,
    isError: isErrorPts,
    error: ptsError,
    refetch: refetchPts,
  } = useQuery({
    queryKey: ['pt-colleagues', debouncedSearch],
    queryFn: () => searchPTColleagues(debouncedSearch),
    enabled: category === 'pt',
    retry: 1,
  });

  const {
    data: professionals,
    isLoading: isLoadingProfessionals,
    isError: isErrorProfessionals,
    error: professionalsError,
    refetch: refetchProfessionals,
  } = useQuery({
    queryKey: ['colleague-professionals'],
    queryFn: () => searchDiscoverableProfessionals(),
    enabled: category === 'professionisti',
    retry: 1,
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
  const isError = category === 'pt' ? isErrorPts : isErrorProfessionals;
  const activeError = category === 'pt' ? ptsError : professionalsError;
  const rpcMissing = category === 'pt' && isErrorPts && isMissingColleagueSearchRpc(ptsError);

  return (
    <div className="space-y-6 animate-in">
      <DashboardPageHeader
        title="Cerca PT e professionisti"
        subtitle="Trova PT e professionisti della community"
        icon={<Search className="h-6 w-6" />}
        breadcrumbs={[
          { label: 'Dashboard', href: '/pt', icon: <LayoutDashboard className="h-3.5 w-3.5" /> },
          { label: 'Cerca PT e professionisti' },
        ]}
      />

      <SectionCard
        title="Community"
        subtitle="Cerca altri PT o professionisti (nutrizionisti, fisioterapisti)"
        icon={Search}
      >
        <div className="space-y-4">
          <Tabs value={category} onValueChange={(v) => setCategory(v as 'pt' | 'professionisti')}>
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="pt" className="gap-1.5">
                <Dumbbell className="h-4 w-4" />
                Personal Trainer
              </TabsTrigger>
              <TabsTrigger value="professionisti" className="gap-1.5">
                <Stethoscope className="h-4 w-4" />
                Professionisti
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Nome, città o specializzazione..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {isError ? (
            <div className="text-center py-12 space-y-3">
              <Search className="h-10 w-10 mx-auto text-muted-foreground" />
              <h3 className="text-lg font-semibold">
                {rpcMissing
                  ? 'Ricerca colleghi non ancora disponibile'
                  : 'Impossibile caricare i risultati'}
              </h3>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                {rpcMissing
                  ? 'La funzione di ricerca colleghi non risulta ancora applicata sul backend. Applica la migration pt_colleague_search su Lovable Cloud, poi riprova.'
                  : (activeError as Error)?.message ||
                    'Si è verificato un errore durante il caricamento. Riprova tra poco.'}
              </p>
              <Button
                variant="outline"
                onClick={() =>
                  category === 'pt' ? refetchPts() : refetchProfessionals()
                }
              >
                Riprova
              </Button>
            </div>
          ) : isLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
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
      </SectionCard>

      <ColleagueScheda
        selected={selected}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </div>
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
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((pt) => {
        const fullName = buildCoachFullName(pt.first_name, pt.last_name) ?? 'PT';
        return (
          <button
            key={pt.user_id}
            type="button"
            onClick={() => onSelect(pt)}
            className="w-full text-left flex gap-4 p-4 rounded-xl border bg-card hover:border-primary/40 hover:bg-accent/30 transition-colors"
          >
            <Avatar className="h-14 w-14 border shrink-0">
              <AvatarImage src={pt.avatar_url || undefined} />
              <AvatarFallback>
                {getCoachInitials(pt.first_name, pt.last_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{fullName}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                {pt.rating_avg && pt.rating_avg > 0 && (
                  <span className="flex items-center gap-1 text-primary">
                    <Star className="h-3 w-3 fill-primary" />
                    {pt.rating_avg.toFixed(1)}
                  </span>
                )}
                {pt.location_city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {pt.location_city}
                  </span>
                )}
                {pt.offers_online && <Wifi className="h-3 w-3 text-primary" />}
              </div>
              {pt.specializations && pt.specializations.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {pt.specializations.slice(0, 2).map((spec) => (
                    <Badge key={spec} variant="secondary" className="text-xs">
                      {spec}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
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
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((professional) => {
        const Icon = professional.profession_type === 'nutrizionista' ? Apple : Stethoscope;
        const label =
          professional.profession_type === 'nutrizionista' ? 'Nutrizionista' : 'Fisioterapista';
        return (
          <button
            key={professional.id}
            type="button"
            onClick={() => onSelect(professional)}
            className="w-full text-left flex gap-4 p-4 rounded-xl border bg-card hover:border-primary/40 hover:bg-accent/30 transition-colors"
          >
            <div className="relative shrink-0">
              <Avatar className="h-14 w-14 border">
                <AvatarImage src={professional.avatar_url || undefined} />
                <AvatarFallback>
                  {(professional.first_name?.[0] || '') + (professional.last_name?.[0] || '')}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 p-1 bg-primary rounded-full">
                <Icon className="h-3 w-3 text-primary-foreground" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">
                {professional.first_name} {professional.last_name}
              </p>
              <p className="text-xs text-primary">{label}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                {professional.rating_avg && professional.rating_avg > 0 && (
                  <span className="flex items-center gap-1 text-primary">
                    <Star className="h-3 w-3 fill-primary" />
                    {professional.rating_avg.toFixed(1)}
                  </span>
                )}
                {professional.location_city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {professional.location_city}
                  </span>
                )}
                {professional.offers_online && <Wifi className="h-3 w-3 text-primary" />}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function EmptyResult({ label }: { label: string }) {
  return (
    <div className="text-center py-12">
      <Search className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
      <p className="font-medium">{label}</p>
      <p className="text-sm text-muted-foreground mt-1">Prova a modificare la ricerca</p>
    </div>
  );
}

// =====================================================
// SCHEDA INFO (Sheet laterale desktop)
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
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        {common && (
          <>
            <SheetHeader className="text-left pr-8">
              <SheetTitle className="sr-only">{fullName}</SheetTitle>
              <div className="flex items-start gap-4">
                <Avatar className="h-20 w-20 border">
                  <AvatarImage src={common.avatar_url || undefined} />
                  <AvatarFallback className="text-xl">{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-lg font-bold">{fullName}</p>
                  <p className="text-sm text-primary flex items-center gap-1">
                    {isPt ? <Dumbbell className="h-3.5 w-3.5" /> : <Stethoscope className="h-3.5 w-3.5" />}
                    {roleLabel}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                    {common.rating_avg && common.rating_avg > 0 && (
                      <span className="flex items-center gap-1 text-primary">
                        <Star className="h-3.5 w-3.5 fill-primary" />
                        {Number(common.rating_avg).toFixed(1)}
                        <span className="text-muted-foreground">({common.review_count ?? 0})</span>
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
                  <Badge variant="secondary" className="gap-1">
                    <Users className="h-3 w-3" />
                    In presenza
                  </Badge>
                )}
                {common.offers_online && (
                  <Badge variant="secondary" className="gap-1">
                    <Wifi className="h-3 w-3" />
                    Online
                  </Badge>
                )}
                {common.experience_years ? (
                  <Badge variant="secondary" className="gap-1">
                    <Clock className="h-3 w-3" />
                    {common.experience_years} anni exp.
                  </Badge>
                ) : null}
              </div>

              {common.bio && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                    Chi è
                  </p>
                  <p className="text-sm leading-relaxed whitespace-pre-line">{common.bio}</p>
                </div>
              )}

              {common.specializations && common.specializations.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Specializzazioni
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {common.specializations.map((spec) => (
                      <Badge key={spec} variant="outline">
                        {spec}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {isPt && pt && (
                <Button asChild variant="outline" className="w-full">
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

export default PTColleagueSearchPage;
