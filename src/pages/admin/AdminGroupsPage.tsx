import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  adminListGroups,
  adminSetGroupOfficial,
  adminSetGroupStatus,
} from '@/lib/api/groups';
import type { GroupStatus } from '@/types/groups';
import { OfficialBadge } from '@/components/groups/OfficialBadge';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, ShieldCheck, Ban, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const STATUS_LABELS: Record<GroupStatus, string> = {
  active: 'Attivo',
  suspended: 'Sospeso',
  pending_review: 'In revisione',
};

export default function AdminGroupsPage() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<GroupStatus | 'all'>('all');

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['admin-groups', query, statusFilter],
    queryFn: () =>
      adminListGroups({
        query: query || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
      }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: GroupStatus }) =>
      adminSetGroupStatus(id, status),
    onSuccess: () => {
      toast.success('Stato aggiornato');
      queryClient.invalidateQueries({ queryKey: ['admin-groups'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const officialMutation = useMutation({
    mutationFn: ({ id, official }: { id: string; official: boolean }) =>
      adminSetGroupOfficial(id, official),
    onSuccess: () => {
      toast.success('Badge ufficiale aggiornato');
      queryClient.invalidateQueries({ queryKey: ['admin-groups'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Gruppi"
        subtitle="Gestisci, sospendi e qualifica i gruppi della piattaforma"
      />

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca per nome..."
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as GroupStatus | 'all')}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Stato" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti gli stati</SelectItem>
            <SelectItem value="active">Attivi</SelectItem>
            <SelectItem value="suspended">Sospesi</SelectItem>
            <SelectItem value="pending_review">In revisione</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Località</TableHead>
              <TableHead>Discipline</TableHead>
              <TableHead>Membri</TableHead>
              <TableHead>Visibilità</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead>Creato</TableHead>
              <TableHead className="text-right">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Caricamento...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && groups.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Nessun gruppo trovato
                </TableCell>
              </TableRow>
            )}
            {groups.map((g) => (
              <TableRow key={g.id}>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">{g.name}</span>
                    {g.is_official && <OfficialBadge className="w-fit" />}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {g.location_name || '—'}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1 max-w-[200px]">
                    {g.disciplines.slice(0, 2).map((d) => (
                      <Badge key={d.id} variant="outline" className="text-[10px]">
                        {d.name}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>{g.members_count}</TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {g.visibility === 'public' ? 'Pubblico' : 'Privato'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={g.status === 'active' ? 'default' : 'destructive'}
                  >
                    {STATUS_LABELS[g.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(new Date(g.created_at), 'dd MMM yyyy', { locale: it })}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {g.status === 'active' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          statusMutation.mutate({ id: g.id, status: 'suspended' })
                        }
                      >
                        <Ban className="h-3 w-3 mr-1" />
                        Sospendi
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          statusMutation.mutate({ id: g.id, status: 'active' })
                        }
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Riattiva
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant={g.is_official ? 'secondary' : 'outline'}
                      onClick={() =>
                        officialMutation.mutate({
                          id: g.id,
                          official: !g.is_official,
                        })
                      }
                    >
                      <ShieldCheck className="h-3 w-3 mr-1" />
                      {g.is_official ? 'Rimuovi badge' : 'Ufficiale'}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
