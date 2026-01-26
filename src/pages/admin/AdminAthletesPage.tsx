import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { DataTable, Column } from '@/components/dashboard/DataTable';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Users, MoreHorizontal, Eye, Plus, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Link, useSearchParams } from 'react-router-dom';

interface AtletaListItem {
  id: string;
  user_id: string;
  status: string;
  fitness_level: string | null;
  goals: string[] | null;
  created_at: string;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
}

const FITNESS_LEVELS = [
  { value: 'principiante', label: 'Principiante' },
  { value: 'intermedio', label: 'Intermedio' },
  { value: 'avanzato', label: 'Avanzato' },
  { value: 'agonista', label: 'Agonista' },
];

const GOAL_OPTIONS = [
  'Perdita peso',
  'Aumento massa',
  'Tonificazione',
  'Resistenza',
  'Forza',
  'Flessibilità',
  'Salute generale',
  'Sport specifico',
];

export function AdminAthletesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get('status') || 'all';
  const queryClient = useQueryClient();
  
  // Create Athlete Dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newAtleta, setNewAtleta] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    fitness_level: 'intermedio',
    goals: [] as string[],
  });
  
  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [atletaToDelete, setAtletaToDelete] = useState<AtletaListItem | null>(null);

  // Fetch Athletes
  const { data: athletes, isLoading } = useQuery({
    queryKey: ['admin-athletes', statusFilter],
    queryFn: async () => {
      const { data: atletaData, error } = await supabase
        .from('atleta_profiles')
        .select('id, user_id, status, fitness_level, goals, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const userIds = atletaData?.map(a => a.user_id) || [];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email')
        .in('user_id', userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);

      let result = atletaData?.map(a => ({
        ...a,
        profiles: profilesMap.get(a.user_id) || null
      })) || [];

      if (statusFilter !== 'all') {
        result = result.filter(a => a.status === statusFilter);
      }

      return result as AtletaListItem[];
    },
  });

  // Create Athlete mutation
  const createAtletaMutation = useMutation({
    mutationFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error('Non autenticato');

      const response = await supabase.functions.invoke('create-user', {
        body: {
          email: newAtleta.email,
          password: newAtleta.password,
          firstName: newAtleta.firstName,
          lastName: newAtleta.lastName,
          role: 'atleta',
          profileData: {
            fitness_level: newAtleta.fitness_level,
            goals: newAtleta.goals
          }
        }
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-athletes'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success('Atleta creato con successo');
      setCreateDialogOpen(false);
      setNewAtleta({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        fitness_level: 'intermedio',
        goals: [],
      });
    },
    onError: (error) => toast.error('Errore: ' + error.message)
  });

  // Delete Atleta mutation
  const deleteAtletaMutation = useMutation({
    mutationFn: async (atleta: AtletaListItem) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error('Non autenticato');

      const response = await supabase.functions.invoke('delete-user', {
        body: { userId: atleta.user_id, role: 'atleta' }
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-athletes'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success('Atleta eliminato con successo');
      setDeleteDialogOpen(false);
      setAtletaToDelete(null);
    },
    onError: (error) => toast.error('Errore: ' + error.message)
  });

  const handleCreateAtleta = () => {
    if (!newAtleta.email || !newAtleta.password || !newAtleta.firstName || !newAtleta.lastName) {
      toast.error('Compila tutti i campi obbligatori');
      return;
    }
    if (newAtleta.password.length < 8) {
      toast.error('La password deve avere almeno 8 caratteri');
      return;
    }
    createAtletaMutation.mutate();
  };

  const columns: Column<AtletaListItem>[] = [
    {
      key: 'name',
      header: 'Nome',
      cell: (atleta) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-role-atleta/10 text-role-atleta text-sm font-medium">
            {atleta.profiles?.first_name?.[0] || 'A'}
          </div>
          <div>
            <p className="font-medium">
              {atleta.profiles?.first_name} {atleta.profiles?.last_name}
            </p>
            <p className="text-xs text-muted-foreground">{atleta.profiles?.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Stato',
      cell: (atleta) => <StatusBadge status={atleta.status} />,
    },
    {
      key: 'level',
      header: 'Livello',
      cell: (atleta) => atleta.fitness_level || '-',
    },
    {
      key: 'goals',
      header: 'Obiettivi',
      cell: (atleta) => (
        <div className="flex flex-wrap gap-1">
          {atleta.goals?.slice(0, 2).map((goal, i) => (
            <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded">
              {goal}
            </span>
          )) || '-'}
        </div>
      ),
    },
    {
      key: 'created_at',
      header: 'Registrato',
      cell: (atleta) => new Date(atleta.created_at).toLocaleDateString('it-IT'),
    },
  ];

  const actions = (atleta: AtletaListItem) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link to={`/admin/athletes/${atleta.user_id}`}>
            <Eye className="mr-2 h-4 w-4" />
            Visualizza
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={() => {
            setAtletaToDelete(atleta);
            setDeleteDialogOpen(true);
          }}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Elimina Atleta
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestione Atleti"
        description="Visualizza e gestisci gli atleti della piattaforma"
        icon={Users}
        actions={
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nuovo Atleta
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Nuovo Atleta</DialogTitle>
                <DialogDescription>
                  Crea un nuovo account atleta sulla piattaforma
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="atleta-email">Email *</Label>
                    <Input
                      id="atleta-email"
                      type="email"
                      placeholder="email@esempio.com"
                      value={newAtleta.email}
                      onChange={(e) => setNewAtleta({ ...newAtleta, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="atleta-password">Password *</Label>
                    <Input
                      id="atleta-password"
                      type="password"
                      placeholder="Min. 8 caratteri"
                      value={newAtleta.password}
                      onChange={(e) => setNewAtleta({ ...newAtleta, password: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="atleta-firstName">Nome *</Label>
                    <Input
                      id="atleta-firstName"
                      placeholder="Marco"
                      value={newAtleta.firstName}
                      onChange={(e) => setNewAtleta({ ...newAtleta, firstName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="atleta-lastName">Cognome *</Label>
                    <Input
                      id="atleta-lastName"
                      placeholder="Bianchi"
                      value={newAtleta.lastName}
                      onChange={(e) => setNewAtleta({ ...newAtleta, lastName: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="atleta-level">Livello Fitness</Label>
                  <Select
                    value={newAtleta.fitness_level}
                    onValueChange={(value) => setNewAtleta({ ...newAtleta, fitness_level: value })}
                  >
                    <SelectTrigger id="atleta-level">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FITNESS_LEVELS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Annulla
                </Button>
                <Button onClick={handleCreateAtleta} disabled={createAtletaMutation.isPending}>
                  {createAtletaMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Crea Atleta
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setSearchParams(value === 'all' ? {} : { status: value });
          }}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtra per stato" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti</SelectItem>
            <SelectItem value="non_collegato">Non collegati</SelectItem>
            <SelectItem value="collegato">Collegati</SelectItem>
            <SelectItem value="premium">Premium</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={athletes || []}
        isLoading={isLoading}
        searchPlaceholder="Cerca atleta..."
        emptyMessage="Nessun atleta trovato"
        actions={actions}
      />

      {/* Delete Atleta Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Elimina Atleta</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Stai per eliminare definitivamente <strong>{atletaToDelete?.profiles?.first_name} {atletaToDelete?.profiles?.last_name}</strong>.
              </p>
              <p className="text-destructive font-medium">
                Questa azione è irreversibile e cancellerà tutti i dati associati:
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground">
                <li>Profilo e credenziali</li>
                <li>Allenamenti e progressi</li>
                <li>Connessioni con PT</li>
                <li>Chat e messaggi</li>
                <li>Recensioni inviate</li>
                <li>Badge e achievement</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteAtletaMutation.isPending}>Annulla</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => atletaToDelete && deleteAtletaMutation.mutate(atletaToDelete)}
              disabled={deleteAtletaMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteAtletaMutation.isPending ? (
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
    </div>
  );
}

export default AdminAthletesPage;
