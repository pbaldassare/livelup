import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  Sparkles,
  CalendarDays,
  GraduationCap,
  UsersRound,
  Briefcase,
  Star,
  ChevronRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useAtletaStatus } from '@/hooks/useAtletaStatus';
import { supabase } from '@/integrations/supabase/client';
import { getCoachInitials } from '@/lib/coachName';
import { listPublishedCoursesForAthlete } from '@/lib/api/courses';
import { getMyGroups } from '@/lib/api/groups';
import { listFollows, hydrateFollowedItems, type FollowTargetType } from '@/lib/api/follows';
import { FollowStarButton } from '@/components/app/FollowStarButton';
import { cn } from '@/lib/utils';

// =====================================================
// ATLETA ATTIVITÀ PAGE
// Hub "Iscritti" (eventi/corsi/gruppi/professionisti a cui l'atleta
// partecipa) + "Salvati" (preferiti salvati senza iscrizione).
// Sostituisce la vecchia lista Appuntamenti nella tab bar.
// =====================================================

type Category = 'tutti' | 'evento' | 'corso' | 'gruppo' | 'professionista';

const CATEGORY_CHIPS: { id: Category; label: string; icon: typeof CalendarDays }[] = [
  { id: 'tutti', label: 'Tutti', icon: Sparkles },
  { id: 'evento', label: 'Eventi', icon: CalendarDays },
  { id: 'corso', label: 'Corsi', icon: GraduationCap },
  { id: 'gruppo', label: 'Gruppi', icon: UsersRound },
  { id: 'professionista', label: 'Professionisti', icon: Briefcase },
];

interface HubItem {
  key: string;
  category: Exclude<Category, 'tutti'>;
  title: string;
  subtitle: string | null;
  coverUrl: string | null;
  href: string;
  badge?: string | null;
  isCoach?: boolean;
  followTargetType?: FollowTargetType;
  followTargetId?: string;
}

function categoryMeta(category: Exclude<Category, 'tutti'>) {
  switch (category) {
    case 'evento':
      return { icon: CalendarDays, label: 'Evento' };
    case 'corso':
      return { icon: GraduationCap, label: 'Corso' };
    case 'gruppo':
      return { icon: UsersRound, label: 'Gruppo' };
    case 'professionista':
      return { icon: Briefcase, label: 'Professionista' };
  }
}

export function AtletaAttivitaPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isConnected, ptName, ptInitials, ptAvatarUrl, connection } = useAtletaStatus();
  const [tab, setTab] = useState<'iscritti' | 'seguiti'>('iscritti');
  const [category, setCategory] = useState<Category>('tutti');

  // ---- ISCRITTI: eventi ----
  const { data: enrolledEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['atleta-attivita-events', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data: participations, error: pErr } = await supabase
        .from('event_participants')
        .select('event_id, status')
        .eq('user_id', user.id)
        .in('status', ['registered', 'waitlist']);
      if (pErr) throw pErr;

      const eventIds = (participations || []).map((p) => p.event_id);
      if (eventIds.length === 0) return [];

      const { data: events, error: eErr } = await supabase
        .from('calendar_events')
        .select('id, title, start_datetime, location, is_cancelled')
        .in('id', eventIds)
        .eq('is_cancelled', false)
        .order('start_datetime', { ascending: true });
      if (eErr) throw eErr;

      const statusByEvent = new Map((participations || []).map((p) => [p.event_id, p.status]));

      return (events || []).map((ev) => ({
        ...ev,
        status: statusByEvent.get(ev.id) as 'registered' | 'waitlist',
      }));
    },
    enabled: !!user?.id,
  });

  // ---- ISCRITTI: corsi ----
  const { data: courseData, isLoading: coursesLoading } = useQuery({
    queryKey: ['atleta-attivita-courses', user?.id],
    queryFn: () => listPublishedCoursesForAthlete(user!.id),
    enabled: !!user?.id,
  });
  const enrolledCourses = useMemo(() => courseData?.enrolled ?? [], [courseData]);

  // ---- ISCRITTI: gruppi ----
  const { data: myGroups = [], isLoading: groupsLoading } = useQuery({
    queryKey: ['atleta-attivita-groups', user?.id],
    queryFn: () => getMyGroups(user!.id),
    enabled: !!user?.id,
  });

  // ---- SEGUITI ----
  const { data: follows = [], isLoading: followsLoading } = useQuery({
    queryKey: ['atleta-follows-list', user?.id],
    queryFn: () => listFollows(user!.id),
    enabled: !!user?.id,
  });

  const { data: followedItems = [], isLoading: followedHydrating } = useQuery({
    queryKey: ['atleta-follows-hydrated', user?.id, follows.map((f) => f.id).join(',')],
    queryFn: () => hydrateFollowedItems(follows),
    enabled: !!user?.id && follows.length > 0,
  });

  const enrolledEventIds = useMemo(() => new Set(enrolledEvents.map((e) => e.id)), [enrolledEvents]);
  const enrolledCourseIds = useMemo(() => new Set(enrolledCourses.map((c) => c.id)), [enrolledCourses]);
  const enrolledGroupIds = useMemo(() => new Set(myGroups.map((g) => g.id)), [myGroups]);

  const iscrittiItems: HubItem[] = useMemo(() => {
    const items: HubItem[] = [];

    for (const ev of enrolledEvents) {
      items.push({
        key: `event-${ev.id}`,
        category: 'evento',
        title: ev.title,
        subtitle: [
          format(parseISO(ev.start_datetime), "d MMM 'alle' HH:mm", { locale: it }),
          ev.location,
        ]
          .filter(Boolean)
          .join(' · '),
        coverUrl: null,
        href: `/app/events/${ev.id}`,
        badge: ev.status === 'waitlist' ? "Lista d'attesa" : 'Iscritto',
      });
    }

    for (const course of enrolledCourses) {
      items.push({
        key: `course-${course.id}`,
        category: 'corso',
        title: course.title,
        subtitle: course.pt_name ? `con ${course.pt_name}` : null,
        coverUrl: course.cover_image_url,
        href: `/app/courses/${course.id}`,
        badge:
          course.enrollment?.status === 'completed'
            ? 'Completato'
            : `${course.enrollment?.progress_pct ?? 0}%`,
      });
    }

    for (const group of myGroups) {
      items.push({
        key: `group-${group.id}`,
        category: 'gruppo',
        title: group.name,
        subtitle: `${group.members_count} ${group.members_count === 1 ? 'membro' : 'membri'}`,
        coverUrl: group.image_url,
        href: `/app/groups/${group.id}`,
        badge: group.my_role === 'owner' ? 'Admin' : null,
      });
    }

    if (isConnected && connection?.pt_user_id) {
      items.push({
        key: `coach-${connection.pt_user_id}`,
        category: 'professionista',
        title: ptName || 'Il tuo coach',
        subtitle: 'Il mio coach',
        coverUrl: ptAvatarUrl,
        href: `/app/pt/${connection.pt_user_id}`,
        badge: 'Collegato',
        isCoach: true,
      });
    }

    return items;
  }, [enrolledEvents, enrolledCourses, myGroups, isConnected, connection, ptName, ptAvatarUrl]);

  const seguitiItems: HubItem[] = useMemo(() => {
    return followedItems
      .filter((f) => {
        if (f.targetType === 'event' && enrolledEventIds.has(f.targetId)) return false;
        if (f.targetType === 'course' && enrolledCourseIds.has(f.targetId)) return false;
        if (f.targetType === 'group' && enrolledGroupIds.has(f.targetId)) return false;
        if (f.targetType === 'pt' && f.targetId === connection?.pt_user_id) return false;
        return true;
      })
      .map((f) => ({
        key: `follow-${f.followId}`,
        category: (f.targetType === 'pt' || f.targetType === 'professional'
          ? 'professionista'
          : f.targetType) as Exclude<Category, 'tutti'>,
        title: f.title,
        subtitle: f.subtitle,
        coverUrl: f.coverUrl,
        href: f.href,
        followTargetType: f.targetType,
        followTargetId: f.targetId,
      }));
  }, [followedItems, enrolledEventIds, enrolledCourseIds, enrolledGroupIds, connection]);

  const activeItems = tab === 'iscritti' ? iscrittiItems : seguitiItems;
  const filteredItems = useMemo(
    () => (category === 'tutti' ? activeItems : activeItems.filter((i) => i.category === category)),
    [activeItems, category],
  );

  const isLoading =
    tab === 'iscritti'
      ? eventsLoading || coursesLoading || groupsLoading
      : followsLoading || followedHydrating;

  const countsByCategory = (items: HubItem[]) => {
    const counts: Record<Category, number> = {
      tutti: items.length,
      evento: 0,
      corso: 0,
      gruppo: 0,
      professionista: 0,
    };
    for (const it of items) counts[it.category] += 1;
    return counts;
  };
  const counts = countsByCategory(activeItems);

  return (
    <div className="min-h-screen bg-app-background text-app-foreground pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-app-background/95 backdrop-blur border-b border-app-border">
        <div className="px-4 py-3">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-app-accent" />
            Attività
          </h1>
          <p className="text-xs text-app-muted-foreground">
            Eventi, corsi, gruppi e professionisti: iscrizioni e salvati
          </p>
        </div>

        <div className="px-4 pb-3">
          <Tabs value={tab} onValueChange={(v) => setTab(v as 'iscritti' | 'seguiti')}>
            <TabsList className="w-full bg-app-muted/50">
              <TabsTrigger
                value="iscritti"
                className="flex-1 data-[state=active]:bg-app-accent data-[state=active]:text-app-accent-foreground"
              >
                Iscritti
                {counts.tutti > 0 && tab !== 'iscritti' ? null : null}
              </TabsTrigger>
              <TabsTrigger
                value="seguiti"
                className="flex-1 data-[state=active]:bg-app-accent data-[state=active]:text-app-accent-foreground gap-1.5"
              >
                <Star className="h-3.5 w-3.5" />
                Salvati
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Category chips */}
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
          {CATEGORY_CHIPS.map((chip) => {
            const ChipIcon = chip.icon;
            const active = category === chip.id;
            const count = counts[chip.id];
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setCategory(chip.id)}
                className={cn(
                  'shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                  active
                    ? 'bg-app-accent text-app-accent-foreground border-app-accent'
                    : 'bg-app-card border-app-border text-app-muted-foreground hover:text-app-foreground',
                )}
              >
                <ChipIcon className="h-3.5 w-3.5" />
                {chip.label}
                {chip.id !== 'tutti' && count > 0 && (
                  <span className={cn('text-[10px]', active ? 'opacity-90' : 'opacity-70')}>
                    ({count})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 pt-4 space-y-3">
        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-20 rounded-xl bg-app-muted/20 border border-app-border animate-pulse"
              />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <EmptyHub tab={tab} category={category} onDiscover={() => navigate('/app/discover')} />
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-2">
              {filteredItems.map((item, i) => (
                <HubItemCard key={item.key} item={item} index={i} />
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

function HubItemCard({ item, index }: { item: HubItem; index: number }) {
  const meta = categoryMeta(item.category);
  const Icon = meta.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ delay: Math.min(index, 8) * 0.03 }}
    >
      <Link
        to={item.href}
        className="flex items-center gap-3 rounded-xl border border-app-border bg-app-card hover:border-app-accent/40 transition-colors p-3"
      >
        <div className="h-12 w-12 rounded-lg overflow-hidden shrink-0 bg-app-accent/10 flex items-center justify-center">
          {item.coverUrl ? (
            <img src={item.coverUrl} alt={item.title} className="h-full w-full object-cover" />
          ) : item.isCoach ? (
            <Avatar className="h-12 w-12">
              <AvatarImage src={item.coverUrl || undefined} />
              <AvatarFallback className="bg-app-muted text-app-foreground text-xs">
                {getCoachInitials(item.title?.split(' ')[0], item.title?.split(' ')[1])}
              </AvatarFallback>
            </Avatar>
          ) : (
            <Icon className="h-5 w-5 text-app-accent" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Badge
              variant="outline"
              className="text-[9px] px-1.5 py-0 h-4 border-app-border text-app-muted-foreground uppercase tracking-wide"
            >
              {meta.label}
            </Badge>
            {item.badge && (
              <Badge
                variant="outline"
                className={cn(
                  'text-[9px] px-1.5 py-0 h-4',
                  item.isCoach
                    ? 'border-app-accent/40 text-app-accent'
                    : 'border-app-border text-app-muted-foreground',
                )}
              >
                {item.badge}
              </Badge>
            )}
          </div>
          <p className="text-sm font-semibold text-app-foreground truncate mt-0.5">{item.title}</p>
          {item.subtitle && (
            <p className="text-xs text-app-muted-foreground truncate">{item.subtitle}</p>
          )}
        </div>

        {item.followTargetType && item.followTargetId ? (
          <FollowStarButton targetType={item.followTargetType} targetId={item.followTargetId} />
        ) : (
          <ChevronRight className="h-4 w-4 text-app-muted-foreground shrink-0" />
        )}
      </Link>
    </motion.div>
  );
}

function EmptyHub({
  tab,
  category,
  onDiscover,
}: {
  tab: 'iscritti' | 'seguiti';
  category: Category;
  onDiscover: () => void;
}) {
  const categoryLabel =
    category === 'tutti' ? '' : ` in ${CATEGORY_CHIPS.find((c) => c.id === category)?.label.toLowerCase()}`;

  return (
    <div className="rounded-xl border border-dashed border-app-border bg-app-card text-center py-12 px-4">
      {tab === 'iscritti' ? (
        <CalendarDays className="h-10 w-10 mx-auto text-app-muted-foreground mb-3" />
      ) : (
        <Star className="h-10 w-10 mx-auto text-app-muted-foreground mb-3" />
      )}
      <h3 className="text-sm font-semibold text-app-foreground mb-1">
        {tab === 'iscritti'
          ? `Nessuna iscrizione${categoryLabel}`
          : `Nessun elemento salvato${categoryLabel}`}
      </h3>
      <p className="text-xs text-app-muted-foreground mb-4">
        {tab === 'iscritti'
          ? 'Iscriviti a eventi, corsi e gruppi da Scopri'
          : 'Tocca la stella su eventi, corsi, gruppi e professionisti per salvarli qui'}
      </p>
      <button
        onClick={onDiscover}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-app-accent hover:underline"
      >
        Vai a Scopri
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default AtletaAttivitaPage;
