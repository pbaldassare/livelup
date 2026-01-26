import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Package, Plus, Edit, Trash2, Star, Users, Calendar, Euro } from 'lucide-react';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

type PackageType = Database['public']['Enums']['package_type'];

interface PTPackage {
  id: string;
  pt_user_id: string;
  name: string;
  description: string | null;
  package_type: PackageType;
  price: number;
  currency: string;
  sessions_count: number | null;
  duration_days: number | null;
  includes_chat: boolean | null;
  includes_video_calls: boolean | null;
  max_workouts_per_week: number | null;
  is_active: boolean;
  is_featured: boolean | null;
  sort_order: number | null;
  created_at: string;
}

interface PackageFormData {
  name: string;
  description: string;
  package_type: PackageType;
  price: number;
  sessions_count: number | null;
  duration_days: number | null;
  includes_chat: boolean;
  includes_video_calls: boolean;
  max_workouts_per_week: number | null;
  is_active: boolean;
  is_featured: boolean;
}

const defaultFormData: PackageFormData = {
  name: '',
  description: '',
  package_type: 'mensile',
  price: 0,
  sessions_count: null,
  duration_days: 30,
  includes_chat: true,
  includes_video_calls: false,
  max_workouts_per_week: null,
  is_active: true,
  is_featured: false,
};

const packageTypeLabels: Record<PackageType, string> = {
  sessioni: 'Pacchetto Sessioni',
  mensile: 'Abbonamento Mensile',
  trimestrale: 'Abbonamento Trimestrale',
  semestrale: 'Abbonamento Semestrale',
  annuale: 'Abbonamento Annuale',
  custom: 'Personalizzato',
};

const packageTypeDurations: Record<PackageType, number | null> = {
  sessioni: null,
  mensile: 30,
  trimestrale: 90,
  semestrale: 180,
  annuale: 365,
  custom: null,
};

export function PTPackagesManager() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<PTPackage | null>(null);
  const [deletePackageId, setDeletePackageId] = useState<string | null>(null);
  const [formData, setFormData] = useState<PackageFormData>(defaultFormData);

  // Fetch packages
  const { data: packages, isLoading } = useQuery({
    queryKey: ['pt-packages', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('pt_packages')
        .select('*')
        .eq('pt_user_id', user.id)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as PTPackage[];
    },
    enabled: !!user?.id,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: PackageFormData) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('pt_packages')
        .insert({
          pt_user_id: user.id,
          ...data,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-packages'] });
      toast.success('Pacchetto creato con successo');
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error('Errore: ' + error.message);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: PackageFormData }) => {
      const { error } = await supabase
        .from('pt_packages')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-packages'] });
      toast.success('Pacchetto aggiornato');
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error('Errore: ' + error.message);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('pt_packages')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-packages'] });
      toast.success('Pacchetto eliminato');
      setDeletePackageId(null);
    },
    onError: (error) => {
      toast.error('Errore: ' + error.message);
    },
  });

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('pt_packages')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-packages'] });
      toast.success('Stato aggiornato');
    },
  });

  const handleOpenCreate = () => {
    setEditingPackage(null);
    setFormData(defaultFormData);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (pkg: PTPackage) => {
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name,
      description: pkg.description || '',
      package_type: pkg.package_type,
      price: pkg.price,
      sessions_count: pkg.sessions_count,
      duration_days: pkg.duration_days,
      includes_chat: pkg.includes_chat ?? true,
      includes_video_calls: pkg.includes_video_calls ?? false,
      max_workouts_per_week: pkg.max_workouts_per_week,
      is_active: pkg.is_active,
      is_featured: pkg.is_featured ?? false,
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingPackage(null);
    setFormData(defaultFormData);
  };

  const handleSubmit = () => {
    if (!formData.name || formData.price <= 0) {
      toast.error('Compila nome e prezzo');
      return;
    }

    if (editingPackage) {
      updateMutation.mutate({ id: editingPackage.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleTypeChange = (type: PackageType) => {
    const duration = packageTypeDurations[type];
    setFormData(prev => ({
      ...prev,
      package_type: type,
      duration_days: type === 'sessioni' ? null : duration,
      sessions_count: type === 'sessioni' ? (prev.sessions_count || 10) : null,
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Package className="h-5 w-5" />
            I Miei Pacchetti
          </h3>
          <p className="text-sm text-muted-foreground">
            Crea pacchetti personalizzati per i tuoi atleti
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nuovo Pacchetto
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-24 bg-muted/50" />
              <CardContent className="h-32 bg-muted/30" />
            </Card>
          ))}
        </div>
      ) : packages && packages.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg) => (
            <Card key={pkg.id} className={`relative ${!pkg.is_active ? 'opacity-60' : ''}`}>
              {pkg.is_featured && (
                <Badge className="absolute -top-2 -right-2 bg-warning text-warning-foreground">
                  <Star className="h-3 w-3 mr-1" />
                  In Evidenza
                </Badge>
              )}
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{pkg.name}</CardTitle>
                    <CardDescription>
                      {packageTypeLabels[pkg.package_type]}
                    </CardDescription>
                  </div>
                  <Switch
                    checked={pkg.is_active}
                    onCheckedChange={(checked) =>
                      toggleActiveMutation.mutate({ id: pkg.id, isActive: checked })
                    }
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">€{pkg.price}</span>
                  {pkg.package_type !== 'sessioni' && (
                    <span className="text-muted-foreground">
                      /{pkg.package_type === 'mensile' ? 'mese' : 
                        pkg.package_type === 'trimestrale' ? '3 mesi' :
                        pkg.package_type === 'semestrale' ? '6 mesi' :
                        pkg.package_type === 'annuale' ? 'anno' : 'periodo'}
                    </span>
                  )}
                </div>

                {pkg.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {pkg.description}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 text-xs">
                  {pkg.package_type === 'sessioni' && pkg.sessions_count && (
                    <Badge variant="outline">
                      <Users className="h-3 w-3 mr-1" />
                      {pkg.sessions_count} sessioni
                    </Badge>
                  )}
                  {pkg.duration_days && (
                    <Badge variant="outline">
                      <Calendar className="h-3 w-3 mr-1" />
                      {pkg.duration_days} giorni
                    </Badge>
                  )}
                  {pkg.includes_chat && (
                    <Badge variant="outline">Chat</Badge>
                  )}
                  {pkg.includes_video_calls && (
                    <Badge variant="outline">Video</Badge>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleOpenEdit(pkg)}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Modifica
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeletePackageId(pkg.id)}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">Nessun pacchetto creato</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Crea pacchetti personalizzati per offrirli ai tuoi atleti
            </p>
            <Button onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Crea Primo Pacchetto
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg w-[calc(100%-2rem)] max-h-[calc(100vh-2rem)] !left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2 overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editingPackage ? 'Modifica Pacchetto' : 'Nuovo Pacchetto'}
            </DialogTitle>
            <DialogDescription>
              {editingPackage
                ? 'Modifica i dettagli del pacchetto'
                : 'Crea un nuovo pacchetto per i tuoi atleti'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto space-y-4 py-4 pr-2">
            <div className="space-y-2">
              <Label htmlFor="pkg-name">Nome Pacchetto *</Label>
              <Input
                id="pkg-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Es: Percorso Trasformazione"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pkg-desc">Descrizione</Label>
              <Textarea
                id="pkg-desc"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descrivi cosa include il pacchetto..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={formData.package_type}
                  onValueChange={(value: PackageType) => handleTypeChange(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sessioni">Pacchetto Sessioni</SelectItem>
                    <SelectItem value="mensile">Mensile</SelectItem>
                    <SelectItem value="trimestrale">Trimestrale</SelectItem>
                    <SelectItem value="semestrale">Semestrale</SelectItem>
                    <SelectItem value="annuale">Annuale</SelectItem>
                    <SelectItem value="custom">Personalizzato</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pkg-price">Prezzo (€) *</Label>
                <Input
                  id="pkg-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>

            {formData.package_type === 'sessioni' && (
              <div className="space-y-2">
                <Label htmlFor="pkg-sessions">Numero Sessioni</Label>
                <Input
                  id="pkg-sessions"
                  type="number"
                  min="1"
                  value={formData.sessions_count ?? ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    sessions_count: parseInt(e.target.value) || null 
                  }))}
                  placeholder="Es: 10"
                />
              </div>
            )}

            {formData.package_type === 'custom' && (
              <div className="space-y-2">
                <Label htmlFor="pkg-duration">Durata (giorni)</Label>
                <Input
                  id="pkg-duration"
                  type="number"
                  min="1"
                  value={formData.duration_days ?? ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    duration_days: parseInt(e.target.value) || null 
                  }))}
                  placeholder="Es: 45"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="pkg-workouts">Max Allenamenti/Settimana</Label>
              <Input
                id="pkg-workouts"
                type="number"
                min="1"
                value={formData.max_workouts_per_week ?? ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  max_workouts_per_week: parseInt(e.target.value) || null 
                }))}
                placeholder="Illimitati"
              />
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <Label>Include Chat</Label>
                <Switch
                  checked={formData.includes_chat}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, includes_chat: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Include Video Call</Label>
                <Switch
                  checked={formData.includes_video_calls}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, includes_video_calls: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>In Evidenza</Label>
                <Switch
                  checked={formData.is_featured}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_featured: checked }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t">
            <Button variant="outline" onClick={handleCloseDialog}>
              Annulla
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingPackage ? 'Salva Modifiche' : 'Crea Pacchetto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletePackageId} onOpenChange={() => setDeletePackageId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare il pacchetto?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione è irreversibile. Il pacchetto verrà eliminato permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePackageId && deleteMutation.mutate(deletePackageId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
