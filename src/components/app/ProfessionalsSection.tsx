import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ListSkeleton } from '@/components/skeletons';
import { supabase } from '@/integrations/supabase/client';
import { ProfessionalCard, Professional } from './ProfessionalCard';
import { Search, Apple, Stethoscope } from 'lucide-react';

export function ProfessionalsSection() {
  const [professionType, setProfessionType] = useState<'nutrizionista' | 'fisioterapista'>('nutrizionista');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch professionals
  const { data: professionals, isLoading } = useQuery({
    queryKey: ['professionals', professionType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('professional_profiles')
        .select('*')
        .eq('profession_type', professionType)
        .eq('is_discoverable', true)
        .eq('status', 'attivo')
        .order('rating_avg', { ascending: false });

      if (error) throw error;
      return data as Professional[];
    },
  });

  // Filter professionals by search
  const filteredProfessionals = useMemo(() => {
    if (!professionals) return [];
    if (!searchQuery) return professionals;

    const lowerQuery = searchQuery.toLowerCase();
    return professionals.filter(p => {
      const name = `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase();
      const specs = (p.specializations || []).join(' ').toLowerCase();
      const city = (p.location_city || '').toLowerCase();
      return name.includes(lowerQuery) || specs.includes(lowerQuery) || city.includes(lowerQuery);
    });
  }, [professionals, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Sub-tabs for profession type */}
      <Tabs 
        value={professionType} 
        onValueChange={(v) => setProfessionType(v as 'nutrizionista' | 'fisioterapista')}
        className="w-full"
      >
        <TabsList className="w-full bg-app-muted">
          <TabsTrigger 
            value="nutrizionista" 
            className="flex-1 data-[state=active]:bg-app-accent data-[state=active]:text-app-accent-foreground gap-2"
          >
            <Apple className="h-4 w-4" />
            Nutrizionisti
          </TabsTrigger>
          <TabsTrigger 
            value="fisioterapista" 
            className="flex-1 data-[state=active]:bg-app-accent data-[state=active]:text-app-accent-foreground gap-2"
          >
            <Stethoscope className="h-4 w-4" />
            Fisioterapisti
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-app-muted-foreground" />
        <Input
          placeholder="Cerca per nome, città o specializzazione..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 bg-app-muted border-app-border text-app-foreground placeholder:text-app-muted-foreground"
        />
      </div>

      {/* Results count */}
      <p className="text-sm text-app-muted-foreground">
        {filteredProfessionals.length} {professionType === 'nutrizionista' ? 'nutrizionisti' : 'fisioterapisti'} trovati
      </p>

      {/* Results list */}
      <AnimatePresence mode="popLayout">
        {isLoading ? (
          <ListSkeleton count={4} type="pt" />
        ) : filteredProfessionals.length > 0 ? (
          <div className="space-y-3">
            {filteredProfessionals.map((professional, index) => (
              <motion.div
                key={professional.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
              >
                <ProfessionalCard professional={professional} />
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Search className="h-12 w-12 mx-auto text-app-muted-foreground mb-4" />
            <h3 className="font-semibold text-app-foreground mb-2">
              Nessun {professionType === 'nutrizionista' ? 'nutrizionista' : 'fisioterapista'} trovato
            </h3>
            <p className="text-app-muted-foreground text-sm">
              Prova a modificare la ricerca
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
