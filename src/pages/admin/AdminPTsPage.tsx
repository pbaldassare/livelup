import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { KPICard } from '@/components/dashboard/KPICard';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { DashboardStatusBadge } from '@/components/dashboard/DashboardStatusBadge';
import { DetailSheet, ProfileInfo } from '@/components/dashboard/DetailSheet';
import { TablePagination } from '@/components/dashboard/TablePagination';
import { InlineEditText, InlineEditSelect, InlineEditTags } from '@/components/dashboard/InlineEditCells';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  TableRow 
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  UserCog, 
  MoreHorizontal, 
  Check, 
  Eye,
  Ban,
  RefreshCw,
  Search,
  Users,
  Clock,
  UserX,
  Star,
  CheckSquare
} from 'lucide-react';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';

// =====================================================
// ADMIN PTS PAGE - Gestione Personal Trainers
// Con bulk actions, paginazione e inline editing
// =====================================================

interface PTListItem {
  id: string;
  user_id: string;
  status: string;
  level: string | null;
  specializations: string[] | null;
  location_city: string | null;
  rating_avg: number;
  review_count: number;
  created_at: string;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    avatar_url: string | null;
    phone: string | null;
  } | null;
}

type PTStatus = 'registrato' | 'in_attesa_approvazione' | 'attivo' | 'sospeso' | 'premium';
type PTLevel = 'junior' | 'intermedio' | 'senior' | 'master';

const LEVEL_OPTIONS: { value: PTLevel; label: string }[] = [
  { value: 'junior', label: 'Junior' },
  { value: 'intermedio', label: 'Intermedio' },
  { value: 'senior', label: 'Senior' },
  { value: 'master', label: 'Master' },
];

const SPECIALIZATION_SUGGESTIONS = [
  'Bodybuilding',
  'Crossfit',
  'Powerlifting',
  'Yoga',
  'Pilates',
  'Cardio',
  'HIIT',
  'Functional Training',
  'Weight Loss',
  'Muscle Gain',
  'Rehabilitation',
  'Sports Performance',
  'Nutrition',
  'Senior Fitness',
  'Pre/Post Natal',
];

export function AdminPTsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get('status') || 'all';
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPT, setSelectedPT] = useState<PTListItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<'approve' | 'suspend' | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  // Fetch PTs
  const { data: pts = [], isLoading } = useQuery({
    queryKey: ['admin-pts', statusFilter],
    queryFn: async () => {
      const { data: ptData, error } = await supabase
        .from('pt_profiles')
        .select('id, user_id, status, level, specializations, location_city, rating_avg, review_count, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const userIds = ptData?.map(p => p.user_id) || [];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, avatar_url, phone')
        .in('user_id', userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);

      let result = ptData?.map(pt => ({
        ...pt,
        profiles: profilesMap.get(pt.user_id) || null
      })) || [];

      if (statusFilter === 'pending') {
        result = result.filter(pt => pt.status === 'in_attesa_approvazione');
      } else if (statusFilter !== 'all') {
        result = result.filter(pt => pt.status === statusFilter);
      }

      return result as PTListItem[];
    },
  });

  // Filter and paginate
  const filteredPTs = useMemo(() => {
    return pts.filter((pt) => {
      const fullName = `${pt.profiles?.first_name || ''} ${pt.profiles?.last_name || ''}`.toLowerCase();
      return fullName.includes(searchTerm.toLowerCase()) || 
             pt.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
             pt.location_city?.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [pts, searchTerm]);

  const totalPages = Math.ceil(filteredPTs.length / pageSize);
  const paginatedPTs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPTs.slice(start, start + pageSize);
  }, [filteredPTs, currentPage, pageSize]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  // Stats
  const totalPTs = pts.length;
  const activePTs = pts.filter(pt => pt.status === 'attivo').length;
  const pendingPTs = pts.filter(pt => pt.status === 'in_attesa_approvazione').length;
  const suspendedPTs = pts.filter(pt => pt.status === 'sospeso').length;

  // Bulk selection handlers
  const isAllSelected = paginatedPTs.length > 0 && paginatedPTs.every(pt => selectedIds.has(pt.user_id));
  const isSomeSelected = paginatedPTs.some(pt => selectedIds.has(pt.user_id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      const newSelected = new Set(selectedIds);
      paginatedPTs.forEach(pt => newSelected.delete(pt.user_id));
      setSelectedIds(newSelected);
    } else {
      const newSelected = new Set(selectedIds);
      paginatedPTs.forEach(pt => newSelected.add(pt.user_id));
      setSelectedIds(newSelected);
    }
  };

  const toggleSelect = (userId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedIds(newSelected);
  };

  const clearSelection = () => setSelectedIds(new Set());

  // Single update mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ userId, newStatus }: { userId: string; newStatus: PTStatus }) => {
      const { error } = await supabase
        .from('pt_profiles')
        .update({ status: newStatus })
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pts'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success('Stato PT aggiornato');
      setDetailOpen(false);
    },
    onError: (error) => toast.error('Errore: ' + error.message),
  });

  // Inline field update mutation
  const updateFieldMutation = useMutation({
    mutationFn: async ({ userId, field, value }: { userId: string; field: string; value: unknown }) => {
      const { error } = await supabase
        .from('pt_profiles')
        .update({ [field]: value })
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pts'] });
      toast.success('Campo aggiornato');
    },
    onError: (error) => toast.error('Errore: ' + error.message),
  });

  // Bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ userIds, newStatus }: { userIds: string[]; newStatus: PTStatus }) => {
      const { error } = await supabase
        .from('pt_profiles')
        .update({ status: newStatus })
        .in('user_id', userIds);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pts'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success(`${selectedIds.size} PT aggiornati`);
      clearSelection();
    },
    onError: (error) => toast.error('Errore: ' + error.message),
  });

  const handleBulkAction = (action: 'approve' | 'suspend') => {
    setBulkAction(action);
    setConfirmDialogOpen(true);
  };

  const executeBulkAction = () => {
    const userIds = Array.from(selectedIds);
    const newStatus: PTStatus = bulkAction === 'approve' ? 'attivo' : 'sospeso';
    bulkUpdateMutation.mutate({ userIds, newStatus });
    setConfirmDialogOpen(false);
  };

  const handleApprove = (userId: string) => updateStatusMutation.mutate({ userId, newStatus: 'attivo' });
  const handleSuspend = (userId: string) => updateStatusMutation.mutate({ userId, newStatus: 'sospeso' });
  const handleReactivate = (userId: string) => updateStatusMutation.mutate({ userId, newStatus: 'attivo' });

  const handleUpdateField = (userId: string, field: string, value: unknown) => {
    updateFieldMutation.mutate({ userId, field, value });
  };

  const handleViewDetail = (pt: PTListItem) => {
    setSelectedPT(pt);
    setDetailOpen(true);
  };

  const getProfileInfo = (pt: PTListItem): ProfileInfo => ({
    id: pt.id,
    userId: pt.user_id,
    firstName: pt.profiles?.first_name,
    lastName: pt.profiles?.last_name,
    email: pt.profiles?.email,
    phone: pt.profiles?.phone,
    avatarUrl: pt.profiles?.avatar_url,
    status: pt.status,
    createdAt: pt.created_at,
    role: 'pt',
  });

  return (
    <div className="space-y-6 animate-in">
      <DashboardPageHeader
        title="Gestione Personal Trainers"
        subtitle="Approva, sospendi e gestisci i Personal Trainer"
        icon={<UserCog className="h-6 w-6" />}
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Personal Trainers' },
        ]}
      />

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <KPICard title="Totale PT" value={totalPTs} icon={Users} iconColor="primary" />
        <KPICard title="PT Attivi" value={activePTs} icon={Check} iconColor="success" />
        <KPICard title="In Attesa" value={pendingPTs} icon={Clock} iconColor="warning" />
        <KPICard title="Sospesi" value={suspendedPTs} icon={UserX} iconColor="danger" />
      </div>

      {/* Table Section */}
      <SectionCard
        title="Lista Personal Trainers"
        subtitle="Gestisci tutti i PT registrati — clicca sui campi per modificarli"
        icon={UserCog}
        iconColor="primary"
      >
        <div className="space-y-4">
          {/* Filters + Bulk Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cerca PT per nome, email o città..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setSearchParams(value === 'all' ? {} : { status: value });
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filtra per stato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli stati</SelectItem>
                <SelectItem value="pending">In attesa</SelectItem>
                <SelectItem value="attivo">Attivi</SelectItem>
                <SelectItem value="sospeso">Sospesi</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bulk Actions Bar */}
          {selectedIds.size > 0 && (
            <div className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-3 border">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{selectedIds.size} PT selezionati</span>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => handleBulkAction('approve')} disabled={bulkUpdateMutation.isPending}>
                  <Check className="h-4 w-4 mr-1 text-success" />
                  Approva tutti
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBulkAction('suspend')} disabled={bulkUpdateMutation.isPending}>
                  <Ban className="h-4 w-4 mr-1 text-destructive" />
                  Sospendi tutti
                </Button>
                <Button size="sm" variant="ghost" onClick={clearSelection}>Annulla</Button>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Seleziona tutti"
                      className={isSomeSelected && !isAllSelected ? 'opacity-50' : ''}
                    />
                  </TableHead>
                  <TableHead>Personal Trainer</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Livello</TableHead>
                  <TableHead>Città</TableHead>
                  <TableHead>Specializzazioni</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        Caricamento...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : paginatedPTs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nessun Personal Trainer trovato
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedPTs.map((pt) => (
                    <TableRow 
                      key={pt.id}
                      className="hover:bg-muted/50"
                      data-state={selectedIds.has(pt.user_id) ? 'selected' : undefined}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(pt.user_id)}
                          onCheckedChange={() => toggleSelect(pt.user_id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleViewDetail(pt)}>
                          <Avatar className="h-10 w-10 ring-2 ring-role-pt/20">
                            <AvatarImage src={pt.profiles?.avatar_url || undefined} />
                            <AvatarFallback className="bg-role-pt/10 text-role-pt font-medium">
                              {pt.profiles?.first_name?.[0] || 'P'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{pt.profiles?.first_name} {pt.profiles?.last_name}</p>
                            <p className="text-sm text-muted-foreground">{pt.profiles?.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <DashboardStatusBadge 
                          status={pt.status === 'in_attesa_approvazione' ? 'pending' : pt.status} 
                          size="sm" 
                        />
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <InlineEditSelect
                          value={pt.level}
                          options={LEVEL_OPTIONS}
                          onSave={(value) => handleUpdateField(pt.user_id, 'level', value)}
                          placeholder="Seleziona livello"
                        />
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <InlineEditText
                          value={pt.location_city || ''}
                          onSave={(value) => handleUpdateField(pt.user_id, 'location_city', value)}
                          placeholder="Inserisci città"
                        />
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <InlineEditTags
                          value={pt.specializations || []}
                          onSave={(value) => handleUpdateField(pt.user_id, 'specializations', value)}
                          suggestions={SPECIALIZATION_SUGGESTIONS}
                          placeholder="Aggiungi spec."
                          maxDisplay={2}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-warning fill-warning" />
                          <span className="font-medium">{pt.rating_avg?.toFixed(1) || '0.0'}</span>
                          <span className="text-muted-foreground text-xs">({pt.review_count})</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewDetail(pt)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Visualizza
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {pt.status === 'in_attesa_approvazione' && (
                                <DropdownMenuItem onClick={() => handleApprove(pt.user_id)}>
                                  <Check className="mr-2 h-4 w-4 text-success" />
                                  Approva
                                </DropdownMenuItem>
                              )}
                              {pt.status === 'attivo' && (
                                <DropdownMenuItem onClick={() => handleSuspend(pt.user_id)}>
                                  <Ban className="mr-2 h-4 w-4 text-destructive" />
                                  Sospendi
                                </DropdownMenuItem>
                              )}
                              {pt.status === 'sospeso' && (
                                <DropdownMenuItem onClick={() => handleReactivate(pt.user_id)}>
                                  <RefreshCw className="mr-2 h-4 w-4 text-success" />
                                  Riattiva
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={filteredPTs.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={handlePageSizeChange}
          />
        </div>
      </SectionCard>

      {/* Detail Sheet */}
      <DetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        profile={selectedPT ? getProfileInfo(selectedPT) : null}
        tags={selectedPT?.specializations || []}
        stats={[
          { label: 'Rating', value: selectedPT?.rating_avg?.toFixed(1) || '0.0' },
          { label: 'Recensioni', value: selectedPT?.review_count || 0 },
        ]}
        extraInfo={[
          { label: 'Livello', value: selectedPT?.level || 'N/A' },
          { label: 'Città', value: selectedPT?.location_city || 'Non specificata' },
        ]}
        actions={
          selectedPT?.status === 'in_attesa_approvazione' ? (
            <>
              <Button className="flex-1" variant="outline" onClick={() => handleSuspend(selectedPT.user_id)}>
                <Ban className="h-4 w-4 mr-2" />Rifiuta
              </Button>
              <Button className="flex-1" onClick={() => handleApprove(selectedPT.user_id)}>
                <Check className="h-4 w-4 mr-2" />Approva
              </Button>
            </>
          ) : selectedPT?.status === 'attivo' ? (
            <Button className="w-full" variant="outline" onClick={() => handleSuspend(selectedPT.user_id)}>
              <Ban className="h-4 w-4 mr-2" />Sospendi PT
            </Button>
          ) : selectedPT?.status === 'sospeso' ? (
            <Button className="w-full" onClick={() => handleReactivate(selectedPT.user_id)}>
              <RefreshCw className="h-4 w-4 mr-2" />Riattiva PT
            </Button>
          ) : null
        }
      />

      {/* Bulk Action Confirmation */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkAction === 'approve' ? 'Approva PT selezionati' : 'Sospendi PT selezionati'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Stai per {bulkAction === 'approve' ? 'approvare' : 'sospendere'} {selectedIds.size} Personal Trainer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={executeBulkAction}>Conferma</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default AdminPTsPage;
