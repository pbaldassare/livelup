import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import {
  fetchOwnBillingEvents,
  fetchOwnPayments,
  fetchPTBillingOverview,
  startPTCheckout,
} from '@/lib/api/ptBilling';

export function usePTBilling(ptUserId?: string) {
  const { user } = useAuth();
  const id = ptUserId ?? user?.id;

  return useQuery({
    queryKey: ['pt-billing-overview', id],
    queryFn: () => fetchPTBillingOverview(id),
    enabled: !!id,
  });
}

export function usePTPayments(ptUserId?: string) {
  const { user } = useAuth();
  const id = ptUserId ?? user?.id;

  return useQuery({
    queryKey: ['pt-payments', id],
    queryFn: () => fetchOwnPayments(id!),
    enabled: !!id,
  });
}

export function usePTBillingEvents(ptUserId?: string) {
  const { user } = useAuth();
  const id = ptUserId ?? user?.id;

  return useQuery({
    queryKey: ['pt-billing-events', id],
    queryFn: () => fetchOwnBillingEvents(id!),
    enabled: !!id,
  });
}

export function useStartPTCheckout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: startPTCheckout,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-billing-overview'] });
      queryClient.invalidateQueries({ queryKey: ['pt-payments'] });
      queryClient.invalidateQueries({ queryKey: ['pt-billing-events'] });
    },
  });
}
