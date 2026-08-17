import { useState, useMemo, useEffect } from 'react';
import { PlacesAutocomplete } from '@/components/app/PlacesAutocomplete';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { KPICard } from '@/components/dashboard/KPICard';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { DashboardStatusBadge } from '@/components/dashboard/DashboardStatusBadge';
import { TablePagination } from '@/components/dashboard/TablePagination';
import { DataTableSkeleton } from '@/components/skeletons';
import { InlineEditText, InlineEditSelect, InlineEditTags } from '@/components/dashboard/InlineEditCells';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  CheckSquare,
  Plus,
  Loader2,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Image,
  FileText,
  DollarSign,
  Briefcase,
  Save,
  Link,
  Copy,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';
import {
  PT_SERVICE_MODALITIES,
  PT_SERVICE_MODALITY_LABELS,
  flagsToServiceModality,
  normalizePtServiceModality,
  serviceModalityToFlags,
  type PtServiceModality,
} from '@/lib/ptServiceModality';

// =====================================================
// ADMIN PTS PAGE - Gestione Personal Trainers
// Con bulk actions, paginazione e inline editing
// =====================================================

interface PTListItem {
  id: string;
  user_id: string;
  status: string;
  level: string | null;
  pt_type_id: string | null;
  specializations: string[] | null;
  certifications: string[] | null;
  location_city: string | null;
  location_address: string | null;
  location_country: string | null;
  location_lat: number | null;
  location_lng: number | null;
  bio: string | null;
  method_description: string | null;
  experience_years: number | null;
  hourly_rate: number | null;
  currency: string | null;
  offers_online: boolean | null;
  offers_in_person: boolean | null;
  service_modality?: string | null;
  is_discoverable: boolean | null;
  max_athletes: number | null;
  gallery_photos: string[] | null;
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

interface PTType {
  id: string;
  name: string;
  is_active: boolean;
}

type PTStatus = 'registrato' | 'in_attesa_approvazione' | 'attivo' | 'sospeso' | 'premium';

const SPECIALIZATION_SUGGESTIONS = [
  'Bodybuilding',
  'Calisthenics',
  'Cardio',
  'Functional Training',
  'HIIT',
  'Kettlebell Training',
  'Muscle Gain',
  'Nutrition',
  'Over 60',
  'Pilates',
  'Posturale',
  'Powerlifting',
  'Pre/Post Natal',
  'Rehabilitation',
  'Sports Performance',
  'Stretching',
  'Weight Loss',
  'Yoga',
];

export function AdminPTsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get('status') || 'all';
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [modalityFilter, setModalityFilter] = useState<PtServiceModality | 'all'>('all');
  const [selectedPT, setSelectedPT] = useState<PTListItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<'approve' | 'suspend' | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  
  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ptToDelete, setPtToDelete] = useState<PTListItem | null>(null);
  
  // Create PT Dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  // Invite link dialog state
  const [inviteLinkDialogOpen, setInviteLinkDialogOpen] = useState(false);
  const [invitePTUserId, setInvitePTUserId] = useState<string | null>(null);
  const [selectedCouponCode, setSelectedCouponCode] = useState('');
  const [selectedCouponForCreate, setSelectedCouponForCreate] = useState('');
  const [newPT, setNewPT] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    location_city: '',
    location_address: '',
    location_lat: null as number | null,
    location_lng: null as number | null,
    specializations: [] as string[],
    status: 'attivo' as 'registrato' | 'attivo',
    service_modality: 'mix' as PtServiceModality,
  });

  // Fetch PT types
  const { data: ptTypes = [] } = useQuery({
    queryKey: ['pt-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pt_types')
        .select('id, name, is_active')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return (data || []) as PTType[];
    },
  });

  const ptTypesMap = useMemo(() => {
    const map = new Map<string, string>();
    ptTypes.forEach(t => map.set(t.id, t.name));
    return map;
  }, [ptTypes]);

  // Fetch PT coupons for invite links
  const { data: ptCoupons = [] } = useQuery({
    queryKey: ['pt-coupons-for-invite'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coupons')
        .select('id, code, coupon_type, discount_value, free_months, description')
        .eq('is_active', true)
        .contains('applicable_roles', ['pt'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const inviteLink = useMemo(() => {
    if (!invitePTUserId) return '';
    const base = `${window.location.origin}/auth?ref=${invitePTUserId}`;
    return selectedCouponCode ? `${base}&coupon=${selectedCouponCode}` : base;
  }, [invitePTUserId, selectedCouponCode]);

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
    toast.success('Link copiato negli appunti');
  };

  const openInviteDialog = (ptUserId: string) => {
    setInvitePTUserId(ptUserId);
    setSelectedCouponCode('');
    setInviteLinkDialogOpen(true);
  };

  // Fetch PTs
  const { data: pts = [], isLoading } = useQuery({
    queryKey: ['admin-pts', statusFilter],
    queryFn: async () => {
      const { data: ptData, error } = await supabase
        .from('pt_profiles')
        .select('*')
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
      const matchesSearch =
        fullName.includes(searchTerm.toLowerCase()) ||
        pt.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pt.location_city?.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;
      if (modalityFilter === 'all') return true;
      return flagsToServiceModality(pt) === modalityFilter;
    });
  }, [pts, searchTerm, modalityFilter]);

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const patch: Record<string, unknown> =
        field === 'service_modality'
          ? {
              service_modality: normalizePtServiceModality(value),
              ...serviceModalityToFlags(normalizePtServiceModality(value)),
            }
          : { [field]: value };

      const { error } = await (supabase.from('pt_profiles') as any)
        .update(patch)
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

  // Create PT mutation
  const createPTMutation = useMutation({
    mutationFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error('Non autenticato');

      const response = await supabase.functions.invoke('create-user', {
        body: {
          email: newPT.email,
          password: newPT.password,
          firstName: newPT.firstName,
          lastName: newPT.lastName,
          role: 'pt',
          profileData: {
            location_city: newPT.location_city || null,
            location_address: newPT.location_address || null,
            location_lat: newPT.location_lat,
            location_lng: newPT.location_lng,
            specializations: newPT.specializations,
            status: newPT.status,
            service_modality: newPT.service_modality,
          }
        }
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-pts'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success('Personal Trainer creato con successo');
      setCreateDialogOpen(false);
      // Open invite link dialog for the newly created PT with pre-selected coupon
      const newUserId = data?.userId || data?.user_id;
      if (newUserId) {
        setInvitePTUserId(newUserId);
        setSelectedCouponCode(selectedCouponForCreate === 'none' ? '' : selectedCouponForCreate);
        setInviteLinkDialogOpen(true);
      }
      setSelectedCouponForCreate('');
      setNewPT({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        location_city: '',
        location_address: '',
        location_lat: null,
        location_lng: null,
        specializations: [],
        status: 'attivo',
        service_modality: 'mix',
      });
    },
    onError: (error) => toast.error('Errore: ' + error.message)
  });

  // Delete PT mutation
  const deletePTMutation = useMutation({
    mutationFn: async (pt: PTListItem) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error('Non autenticato');

      const response = await supabase.functions.invoke('delete-user', {
        body: { userId: pt.user_id, role: 'pt' }
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pts'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success('Personal Trainer eliminato con successo');
      setDeleteDialogOpen(false);
      setPtToDelete(null);
      setDetailOpen(false);
    },
    onError: (error) => toast.error('Errore: ' + error.message)
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

  const handleCreatePT = () => {
    if (!newPT.email || !newPT.password || !newPT.firstName || !newPT.lastName) {
      toast.error('Compila tutti i campi obbligatori');
      return;
    }
    if (!newPT.service_modality) {
      toast.error('Seleziona la modalità di servizio');
      return;
    }
    if (newPT.password.length < 8) {
      toast.error('La password deve avere almeno 8 caratteri');
      return;
    }
    createPTMutation.mutate();
  };

  // PT detail editing state
  const [editingPTData, setEditingPTData] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (selectedPT) {
      setEditingPTData({
        bio: selectedPT.bio || '',
        method_description: selectedPT.method_description || '',
        experience_years: selectedPT.experience_years || 0,
        hourly_rate: selectedPT.hourly_rate || 0,
        currency: selectedPT.currency || 'EUR',
        max_athletes: selectedPT.max_athletes || 50,
        offers_online: selectedPT.offers_online ?? true,
        offers_in_person: selectedPT.offers_in_person ?? true,
        service_modality: flagsToServiceModality(selectedPT),
        is_discoverable: selectedPT.is_discoverable ?? true,
        location_city: selectedPT.location_city || '',
        location_address: selectedPT.location_address || '',
        location_country: selectedPT.location_country || '',
      });
    }
  }, [selectedPT]);

  // Fetch PT certificates
  const { data: ptCertificates = [] } = useQuery({
    queryKey: ['admin-pt-certificates', selectedPT?.user_id],
    queryFn: async () => {
      if (!selectedPT) return [];
      const { data, error } = await supabase
        .from('pt_certificates')
        .select('*')
        .eq('pt_user_id', selectedPT.user_id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedPT,
  });

  // Fetch PT specializations from catalog
  const { data: ptSpecCatalog = [] } = useQuery({
    queryKey: ['admin-pt-specializations-catalog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pt_specializations')
        .select('id, name')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data || [];
    },
  });

  // Save PT detail edits
  const savePTDetailMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPT) return;
      const { error } = await (supabase.from('pt_profiles') as any)
        .update({
          bio: editingPTData.bio as string || null,
          method_description: editingPTData.method_description as string || null,
          experience_years: editingPTData.experience_years as number,
          hourly_rate: editingPTData.hourly_rate as number || null,
          currency: editingPTData.currency as string,
          max_athletes: editingPTData.max_athletes as number,
          is_discoverable: editingPTData.is_discoverable as boolean,
          location_city: editingPTData.location_city as string || null,
          location_address: editingPTData.location_address as string || null,
          location_country: editingPTData.location_country as string || null,
          service_modality: normalizePtServiceModality(editingPTData.service_modality),
          ...serviceModalityToFlags(normalizePtServiceModality(editingPTData.service_modality)),
        })
        .eq('user_id', selectedPT.user_id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pts'] });
      toast.success('Profilo PT aggiornato');
    },
    onError: (error) => toast.error('Errore: ' + error.message),
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
        actions={
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nuovo PT
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl w-[calc(100%-2rem)] sm:w-full max-h-[calc(100vh-2rem)] !left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2 overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>Nuovo Personal Trainer</DialogTitle>
                <DialogDescription>
                  Crea un nuovo account Personal Trainer sulla piattaforma
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 min-h-0 overflow-y-auto pr-2">
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pt-email">Email *</Label>
                    <Input
                      id="pt-email"
                      type="email"
                      placeholder="email@esempio.com"
                      value={newPT.email}
                      onChange={(e) => setNewPT({ ...newPT, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pt-password">Password *</Label>
                    <Input
                      id="pt-password"
                      type="password"
                      placeholder="Min. 8 caratteri"
                      value={newPT.password}
                      onChange={(e) => setNewPT({ ...newPT, password: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pt-firstName">Nome *</Label>
                    <Input
                      id="pt-firstName"
                      placeholder="Mario"
                      value={newPT.firstName}
                      onChange={(e) => setNewPT({ ...newPT, firstName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pt-lastName">Cognome *</Label>
                    <Input
                      id="pt-lastName"
                      placeholder="Rossi"
                      value={newPT.lastName}
                      onChange={(e) => setNewPT({ ...newPT, lastName: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pt-coupon">Coupon</Label>
                    <Select
                      value={selectedCouponForCreate}
                      onValueChange={setSelectedCouponForCreate}
                    >
                      <SelectTrigger id="pt-coupon">
                        <SelectValue placeholder="Nessun coupon" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nessun coupon</SelectItem>
                        {ptCoupons.map((c) => (
                          <SelectItem key={c.id} value={c.code}>
                            {c.code} — {c.coupon_type === 'free_months' ? `${c.free_months} mesi gratis` : c.coupon_type === 'percentage' ? `${c.discount_value}%` : `€${c.discount_value}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Indirizzo / Città</Label>
                    <PlacesAutocomplete
                      value={newPT.location_address || newPT.location_city}
                      onChange={(val) => setNewPT({ ...newPT, location_address: val, location_city: val })}
                      onPlaceSelect={(place) => {
                        // Extract city from formatted address
                        const parts = place.formatted_address.split(',').map(s => s.trim());
                        const city = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
                        setNewPT(prev => ({
                          ...prev,
                          location_city: city,
                          location_address: place.formatted_address,
                          location_lat: place.geometry.location.lat,
                          location_lng: place.geometry.location.lng,
                        }));
                      }}
                      placeholder="Cerca indirizzo o città..."
                      types={['geocode']}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pt-service-modality">Modalità *</Label>
                    <Select
                      value={newPT.service_modality}
                      onValueChange={(value) =>
                        setNewPT({ ...newPT, service_modality: normalizePtServiceModality(value) })
                      }
                    >
                      <SelectTrigger id="pt-service-modality">
                        <SelectValue placeholder="Seleziona modalità" />
                      </SelectTrigger>
                      <SelectContent>
                        {PT_SERVICE_MODALITIES.map((m) => (
                          <SelectItem key={m} value={m}>
                            {PT_SERVICE_MODALITY_LABELS[m]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pt-status">Stato iniziale</Label>
                    <Select
                      value={newPT.status}
                      onValueChange={(value) => setNewPT({ ...newPT, status: value as 'registrato' | 'attivo' })}
                    >
                      <SelectTrigger id="pt-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="registrato">Registrato (da approvare)</SelectItem>
                        <SelectItem value="attivo">Attivo (già approvato)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              </div>
              <DialogFooter className="pt-4 border-t">
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Annulla
                </Button>
                <Button onClick={handleCreatePT} disabled={createPTMutation.isPending}>
                  {createPTMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Crea Personal Trainer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
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
            <Select
              value={modalityFilter}
              onValueChange={(value) => {
                setModalityFilter(value === 'all' ? 'all' : normalizePtServiceModality(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filtra modalità" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le modalità</SelectItem>
                {PT_SERVICE_MODALITIES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {PT_SERVICE_MODALITY_LABELS[m]}
                  </SelectItem>
                ))}
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
                  <TableHead>Modalità</TableHead>
                  <TableHead>Tipologia</TableHead>
                  <TableHead>Città</TableHead>
                  <TableHead>Specializzazioni</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="p-0 border-0">
                      <DataTableSkeleton rows={5} columns={5} showSearch={false} />
                    </TableCell>
                  </TableRow>
                ) : paginatedPTs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
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
                          value={flagsToServiceModality(pt)}
                          options={PT_SERVICE_MODALITIES.map((m) => ({
                            value: m,
                            label: PT_SERVICE_MODALITY_LABELS[m],
                          }))}
                          onSave={(value) => handleUpdateField(pt.user_id, 'service_modality', value)}
                          placeholder="Modalità"
                        />
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <InlineEditSelect
                          value={pt.pt_type_id}
                          options={ptTypes.map(t => ({ value: t.id, label: t.name }))}
                          onSave={(value) => handleUpdateField(pt.user_id, 'pt_type_id', value)}
                          placeholder="Seleziona tipologia"
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
                              <DropdownMenuItem onClick={() => openInviteDialog(pt.user_id)}>
                                <Link className="mr-2 h-4 w-4 text-primary" />
                                Genera link invito
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => {
                                  setPtToDelete(pt);
                                  setDeleteDialogOpen(true);
                                }}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Elimina PT
                              </DropdownMenuItem>
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

      {/* PT Detail Sheet - Full editable panel */}
      {selectedPT && (
        <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
          <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
            <SheetHeader className="text-left pb-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 ring-2 ring-role-pt/20">
                  <AvatarImage src={selectedPT.profiles?.avatar_url || undefined} />
                  <AvatarFallback className="bg-role-pt/10 text-role-pt text-lg font-semibold">
                    {selectedPT.profiles?.first_name?.[0] || 'P'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <SheetTitle className="text-xl">
                    {selectedPT.profiles?.first_name} {selectedPT.profiles?.last_name}
                  </SheetTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <DashboardStatusBadge status={selectedPT.status === 'in_attesa_approvazione' ? 'pending' : selectedPT.status} size="sm" />
                    {selectedPT.pt_type_id && ptTypesMap.get(selectedPT.pt_type_id) && (
                      <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{ptTypesMap.get(selectedPT.pt_type_id)}</span>
                    )}
                  </div>
                </div>
              </div>
            </SheetHeader>

            <div className="space-y-6 py-4">
              {/* Contatti */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Mail className="h-4 w-4" /> Contatti</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="font-medium">{selectedPT.profiles?.email || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Telefono</span><span className="font-medium">{selectedPT.profiles?.phone || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Registrato</span><span className="font-medium">{new Date(selectedPT.created_at).toLocaleDateString('it-IT')}</span></div>
                </div>
              </div>

              <Separator />

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold flex items-center justify-center gap-1"><Star className="h-4 w-4 text-warning fill-warning" />{selectedPT.rating_avg?.toFixed(1) || '0.0'}</p>
                  <p className="text-xs text-muted-foreground">Rating</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold">{selectedPT.review_count || 0}</p>
                  <p className="text-xs text-muted-foreground">Recensioni</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold">{selectedPT.experience_years || 0}</p>
                  <p className="text-xs text-muted-foreground">Anni Exp.</p>
                </div>
              </div>

              <Separator />

              {/* Bio & Metodo */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Briefcase className="h-4 w-4" /> Profilo Professionale</h4>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Bio</Label>
                    <Textarea
                      value={(editingPTData.bio as string) || ''}
                      onChange={(e) => setEditingPTData(prev => ({ ...prev, bio: e.target.value }))}
                      placeholder="Bio del PT..."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Metodo di lavoro</Label>
                    <Textarea
                      value={(editingPTData.method_description as string) || ''}
                      onChange={(e) => setEditingPTData(prev => ({ ...prev, method_description: e.target.value }))}
                      placeholder="Descrizione del metodo..."
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Anni Exp.</Label>
                      <Input
                        type="number"
                        value={(editingPTData.experience_years as number) || 0}
                        onChange={(e) => setEditingPTData(prev => ({ ...prev, experience_years: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Tariffa (€/h)</Label>
                      <Input
                        type="number"
                        value={(editingPTData.hourly_rate as number) || ''}
                        onChange={(e) => setEditingPTData(prev => ({ ...prev, hourly_rate: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Max Atleti</Label>
                      <Input
                        type="number"
                        value={(editingPTData.max_athletes as number) || 50}
                        onChange={(e) => setEditingPTData(prev => ({ ...prev, max_athletes: parseInt(e.target.value) || 50 }))}
                      />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Modalità *</Label>
                      <Select
                        value={normalizePtServiceModality(editingPTData.service_modality)}
                        onValueChange={(value) => {
                          const modality = normalizePtServiceModality(value);
                          setEditingPTData((prev) => ({
                            ...prev,
                            service_modality: modality,
                            ...serviceModalityToFlags(modality),
                          }));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PT_SERVICE_MODALITIES.map((m) => (
                            <SelectItem key={m} value={m}>
                              {PT_SERVICE_MODALITY_LABELS[m]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <label className="flex items-center gap-2 text-sm pt-5">
                      <Switch
                        checked={(editingPTData.is_discoverable as boolean) ?? true}
                        onCheckedChange={(checked) => setEditingPTData(prev => ({ ...prev, is_discoverable: checked }))}
                      />
                      Visibile
                    </label>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Località */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2"><MapPin className="h-4 w-4" /> Località</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Città</span><span className="font-medium">{selectedPT.location_city || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Indirizzo</span><span className="font-medium text-right max-w-[60%] truncate">{selectedPT.location_address || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Paese</span><span className="font-medium">{selectedPT.location_country || '—'}</span></div>
                  {selectedPT.location_lat && (
                    <div className="flex justify-between"><span className="text-muted-foreground">Coordinate</span><span className="font-medium text-xs">{selectedPT.location_lat?.toFixed(4)}, {selectedPT.location_lng?.toFixed(4)}</span></div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Specializzazioni */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Specializzazioni</h4>
                <div className="flex flex-wrap gap-2">
                  {(selectedPT.specializations || []).length > 0 ? (
                    selectedPT.specializations!.map((spec, i) => (
                      <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">{spec}</span>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">Nessuna specializzazione</span>
                  )}
                </div>
              </div>

              <Separator />

              {/* Gallery */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Image className="h-4 w-4" /> Galleria ({(selectedPT.gallery_photos || []).length} foto)</h4>
                {(selectedPT.gallery_photos || []).length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {selectedPT.gallery_photos!.slice(0, 9).map((url, i) => (
                      <div key={i} className="aspect-square rounded-lg overflow-hidden bg-muted">
                        <img src={url} alt={`Gallery ${i + 1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nessuna foto caricata</p>
                )}
              </div>

              <Separator />

              {/* Certificati caricati */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2"><FileText className="h-4 w-4" /> Certificati ({ptCertificates.length})</h4>
                {ptCertificates.length > 0 ? (
                  <div className="space-y-2">
                    {ptCertificates.map((cert: any) => (
                      <div key={cert.id} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{cert.name}</span>
                        </div>
                        <a href={cert.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">Apri</a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nessun certificato caricato</p>
                )}
              </div>

              <Separator />

              {/* Save button */}
              <Button className="w-full" onClick={() => savePTDetailMutation.mutate()} disabled={savePTDetailMutation.isPending}>
                {savePTDetailMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Salva Modifiche Profilo
              </Button>

              {/* Status Actions */}
              <div className="flex gap-2 w-full">
                {selectedPT.status === 'in_attesa_approvazione' && (
                  <>
                    <Button className="flex-1" variant="outline" onClick={() => handleSuspend(selectedPT.user_id)}>
                      <Ban className="h-4 w-4 mr-2" />Rifiuta
                    </Button>
                    <Button className="flex-1" onClick={() => handleApprove(selectedPT.user_id)}>
                      <Check className="h-4 w-4 mr-2" />Approva
                    </Button>
                  </>
                )}
                {selectedPT.status === 'attivo' && (
                  <Button className="flex-1" variant="outline" onClick={() => handleSuspend(selectedPT.user_id)}>
                    <Ban className="h-4 w-4 mr-2" />Sospendi PT
                  </Button>
                )}
                {selectedPT.status === 'sospeso' && (
                  <Button className="flex-1" onClick={() => handleReactivate(selectedPT.user_id)}>
                    <RefreshCw className="h-4 w-4 mr-2" />Riattiva PT
                  </Button>
                )}
              </div>
              <Button 
                variant="destructive" 
                className="w-full"
                onClick={() => {
                  setPtToDelete(selectedPT);
                  setDeleteDialogOpen(true);
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />Elimina PT
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      )}

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

      {/* Delete PT Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Elimina Personal Trainer</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Stai per eliminare definitivamente <strong>{ptToDelete?.profiles?.first_name} {ptToDelete?.profiles?.last_name}</strong>.
              </p>
              <p className="text-destructive font-medium">
                Questa azione è irreversibile e cancellerà tutti i dati associati:
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground">
                <li>Profilo e credenziali</li>
                <li>Allenamenti e template creati</li>
                <li>Connessioni con atleti</li>
                <li>Chat e messaggi</li>
                <li>Recensioni ricevute</li>
                <li>Eventi calendario</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePTMutation.isPending}>Annulla</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => ptToDelete && deletePTMutation.mutate(ptToDelete)}
              disabled={deletePTMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletePTMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Eliminazione...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Elimina definitivamente
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Invite Link Dialog */}
      <Dialog open={inviteLinkDialogOpen} onOpenChange={setInviteLinkDialogOpen}>
        <DialogContent className="max-w-lg w-[calc(100%-2rem)] !left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2">
          <DialogHeader>
            <DialogTitle>Link di Invito PT</DialogTitle>
            <DialogDescription>
              Genera un link di invito con un coupon opzionale da inviare al Personal Trainer
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Coupon (opzionale)</Label>
              <Select
                value={selectedCouponCode}
                onValueChange={(v) => setSelectedCouponCode(v === 'none' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nessun coupon" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nessun coupon</SelectItem>
                  {ptCoupons.map((c) => (
                    <SelectItem key={c.id} value={c.code}>
                      {c.code} — {c.coupon_type === 'free_months' 
                        ? `${c.free_months} ${c.free_months === 1 ? 'mese' : 'mesi'} gratis` 
                        : c.coupon_type === 'percentage' 
                          ? `${c.discount_value}%` 
                          : `€${c.discount_value}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Link di invito</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={inviteLink}
                  className="font-mono text-xs"
                />
                <Button size="icon" variant="outline" onClick={copyInviteLink}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteLinkDialogOpen(false)}>
              Chiudi
            </Button>
            <Button onClick={copyInviteLink}>
              <Copy className="h-4 w-4 mr-2" />
              Copia Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AdminPTsPage;
