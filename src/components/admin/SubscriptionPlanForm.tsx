import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';

type SubscriptionType = Database['public']['Enums']['subscription_type'];
type AppRole = Database['public']['Enums']['app_role'];

export interface SubscriptionPlanFormData {
  name: string;
  description: string;
  target_role: AppRole;
  plan_type: SubscriptionType;
  price_monthly: number;
  price_yearly: number | null;
  trial_days: number;
  features: string[];
  max_athletes: number | null;
  includes_chat: boolean;
  includes_video_calls: boolean;
  includes_analytics: boolean;
  storage_gb: number;
  stripe_price_id: string;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
}

interface SubscriptionPlanFormProps {
  initialData?: Partial<SubscriptionPlanFormData>;
  onSubmit: (data: SubscriptionPlanFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const defaultFormData: SubscriptionPlanFormData = {
  name: '',
  description: '',
  target_role: 'pt',
  plan_type: 'pt_base',
  price_monthly: 0,
  price_yearly: null,
  trial_days: 14,
  features: [],
  max_athletes: null,
  includes_chat: true,
  includes_video_calls: false,
  includes_analytics: false,
  storage_gb: 1,
  stripe_price_id: '',
  is_active: true,
  is_featured: false,
  sort_order: 0,
};

export function SubscriptionPlanForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading,
}: SubscriptionPlanFormProps) {
  const [formData, setFormData] = useState<SubscriptionPlanFormData>({
    ...defaultFormData,
    ...initialData,
    features: initialData?.features || [],
  });
  const [newFeature, setNewFeature] = useState('');

  // Auto-update plan_type based on target_role
  useEffect(() => {
    if (formData.target_role === 'pt') {
      if (!formData.plan_type.startsWith('pt_')) {
        setFormData(prev => ({ ...prev, plan_type: 'pt_base' }));
      }
    } else if (formData.target_role === 'atleta') {
      if (!formData.plan_type.startsWith('atleta_')) {
        setFormData(prev => ({ ...prev, plan_type: 'atleta_free' }));
      }
    }
  }, [formData.target_role]);

  const handleAddFeature = () => {
    if (newFeature.trim()) {
      setFormData(prev => ({
        ...prev,
        features: [...prev.features, newFeature.trim()],
      }));
      setNewFeature('');
    }
  };

  const handleRemoveFeature = (index: number) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const suggestYearlyPrice = () => {
    if (formData.price_monthly > 0) {
      // 20% discount for yearly
      const yearly = Math.round(formData.price_monthly * 12 * 0.8);
      setFormData(prev => ({ ...prev, price_yearly: yearly }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome Piano *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Es: Premium Pro"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Descrizione</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Descrizione del piano..."
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Target</Label>
            <Select
              value={formData.target_role}
              onValueChange={(value: AppRole) => setFormData(prev => ({ ...prev, target_role: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pt">Personal Trainer</SelectItem>
                <SelectItem value="atleta">Atleta</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tipo Piano</Label>
            <Select
              value={formData.plan_type}
              onValueChange={(value: SubscriptionType) => setFormData(prev => ({ ...prev, plan_type: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {formData.target_role === 'pt' ? (
                  <>
                    <SelectItem value="pt_base">PT Base</SelectItem>
                    <SelectItem value="pt_premium">PT Premium</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="atleta_free">Atleta Free</SelectItem>
                    <SelectItem value="atleta_premium">Atleta Premium</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="space-y-4">
        <h4 className="font-medium">Prezzi</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="price_monthly">Prezzo Mensile (€) *</Label>
            <Input
              id="price_monthly"
              type="number"
              min="0"
              step="0.01"
              value={formData.price_monthly}
              onChange={(e) => setFormData(prev => ({ ...prev, price_monthly: parseFloat(e.target.value) || 0 }))}
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="price_yearly">Prezzo Annuale (€)</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={suggestYearlyPrice}
                className="text-xs h-6"
              >
                Suggerisci (-20%)
              </Button>
            </div>
            <Input
              id="price_yearly"
              type="number"
              min="0"
              step="0.01"
              value={formData.price_yearly ?? ''}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                price_yearly: e.target.value ? parseFloat(e.target.value) : null 
              }))}
              placeholder="Opzionale"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="trial_days">Giorni Trial</Label>
            <Input
              id="trial_days"
              type="number"
              min="0"
              value={formData.trial_days}
              onChange={(e) => setFormData(prev => ({ ...prev, trial_days: parseInt(e.target.value) || 0 }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sort_order">Ordine Visualizzazione</Label>
            <Input
              id="sort_order"
              type="number"
              min="0"
              value={formData.sort_order}
              onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
            />
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="space-y-4">
        <h4 className="font-medium">Features</h4>
        
        <div className="flex gap-2">
          <Input
            value={newFeature}
            onChange={(e) => setNewFeature(e.target.value)}
            placeholder="Aggiungi una feature..."
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddFeature())}
          />
          <Button type="button" variant="outline" onClick={handleAddFeature}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {formData.features.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {formData.features.map((feature, index) => (
              <Badge key={index} variant="secondary" className="gap-1">
                {feature}
                <button
                  type="button"
                  onClick={() => handleRemoveFeature(index)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Limits & Includes */}
      <div className="space-y-4">
        <h4 className="font-medium">Limiti e Funzionalità</h4>

        {formData.target_role === 'pt' && (
          <div className="space-y-2">
            <Label htmlFor="max_athletes">Max Atleti</Label>
            <Input
              id="max_athletes"
              type="number"
              min="0"
              value={formData.max_athletes ?? ''}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                max_athletes: e.target.value ? parseInt(e.target.value) : null 
              }))}
              placeholder="Illimitati"
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="storage_gb">Storage (GB)</Label>
          <Input
            id="storage_gb"
            type="number"
            min="1"
            value={formData.storage_gb}
            onChange={(e) => setFormData(prev => ({ ...prev, storage_gb: parseInt(e.target.value) || 1 }))}
          />
        </div>

        <div className="space-y-3">
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
            <Label>Include Analytics</Label>
            <Switch
              checked={formData.includes_analytics}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, includes_analytics: checked }))}
            />
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="space-y-4">
        <h4 className="font-medium">Stato</h4>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label>Attivo</Label>
              <p className="text-sm text-muted-foreground">Il piano è disponibile per l'acquisto</p>
            </div>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>In Evidenza</Label>
              <p className="text-sm text-muted-foreground">Mostra come piano consigliato</p>
            </div>
            <Switch
              checked={formData.is_featured}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_featured: checked }))}
            />
          </div>
        </div>
      </div>

      {/* Stripe Integration */}
      <div className="space-y-2">
        <Label htmlFor="stripe_price_id">Stripe Price ID</Label>
        <Input
          id="stripe_price_id"
          value={formData.stripe_price_id}
          onChange={(e) => setFormData(prev => ({ ...prev, stripe_price_id: e.target.value }))}
          placeholder="price_..."
        />
        <p className="text-xs text-muted-foreground">
          Per integrazione con Stripe (opzionale)
        </p>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Annulla
        </Button>
        <Button type="submit" disabled={isLoading || !formData.name}>
          {isLoading ? 'Salvataggio...' : initialData ? 'Aggiorna Piano' : 'Crea Piano'}
        </Button>
      </div>
    </form>
  );
}
