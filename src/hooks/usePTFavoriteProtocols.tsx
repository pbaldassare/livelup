import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  listFavoriteProtocolIds,
  listMineProtocols,
  listStandardProtocols,
  personalizeStandardProtocol,
  toggleFavoriteProtocol,
  type PtProtocol,
  type StandardProtocol,
} from '@/lib/api/ptProtocols';

/** Solo protocolli personalizzati del PT loggato */
export function useMineProtocols() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['pt-protocols-mine', user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as PtProtocol[];
      return listMineProtocols(user.id);
    },
    enabled: !!user?.id,
  });
}

/** @deprecated alias di useMineProtocols */
export function usePtProtocols() {
  return useMineProtocols();
}

/** Standard di piattaforma (immutabili) */
export function useStandardProtocols() {
  return useQuery({
    queryKey: ['pt-protocols-standard'],
    queryFn: () => listStandardProtocols(),
  });
}

export function useFavoriteProtocolIds() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['pt-favorite-protocol-ids', user?.id],
    queryFn: async () => {
      if (!user?.id) return new Set<string>();
      return listFavoriteProtocolIds(user.id);
    },
    enabled: !!user?.id,
  });
}

export function useToggleFavoriteProtocol() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      protocolId,
      isFavorite,
      /** Se true e protocollo standard senza id DB, personalizza da tipo */
      standard,
    }: {
      protocolId: string | null;
      isFavorite: boolean;
      standard?: StandardProtocol;
    }) => {
      if (!user?.id) throw new Error('Non autenticato');

      // Standard solo da registry: crea subito copia privata preferita
      if (!protocolId && standard && !isFavorite) {
        const copy = await personalizeStandardProtocol(user.id, {
          type: standard.type,
          name: standard.name,
          favorite: true,
        });
        return { action: 'added' as const, copyId: copy.id };
      }

      if (!protocolId) throw new Error('Protocollo non valido');
      const result = await toggleFavoriteProtocol(user.id, protocolId, isFavorite);
      if (typeof result === 'object') {
        return { action: 'added' as const, copyId: result.copyId };
      }
      return { action: result };
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Errore aggiornamento preferiti');
    },
    onSuccess: (res) => {
      toast.success(
        res.action === 'removed'
          ? 'Rimosso dai preferiti'
          : res.copyId
            ? 'Copia personale creata e aggiunta ai preferiti'
            : 'Protocollo aggiunto ai preferiti',
      );
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['pt-favorite-protocol-ids', user?.id] });
      qc.invalidateQueries({ queryKey: ['pt-protocols-mine', user?.id] });
      qc.invalidateQueries({ queryKey: ['pt-protocols', user?.id] });
    },
  });
}
