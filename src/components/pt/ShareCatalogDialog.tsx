import { useMemo, useState } from 'react';
import { Globe, Loader2, Search, Share2, UserMinus } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { searchPTColleagues, type PTColleague } from '@/lib/api/discovery';
import { useQuery } from '@tanstack/react-query';
import {
  type ExerciseCatalog,
  useCatalogShares,
  useExerciseCatalogs,
  useRevokeCatalogShare,
  useSetCatalogPublic,
  useShareExerciseCatalog,
} from '@/hooks/useExerciseCatalogs';

function colleagueName(c: PTColleague) {
  const n = [c.first_name, c.last_name].filter(Boolean).join(' ').trim();
  return n || 'PT';
}

interface ShareCatalogDialogProps {
  catalog: ExerciseCatalog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareCatalogDialog({ catalog, open, onOpenChange }: ShareCatalogDialogProps) {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const { data: catalogs = [] } = useExerciseCatalogs();
  const live = catalogs.find((c) => c.id === catalog?.id) ?? catalog;
  const sharesQ = useCatalogShares(open ? live?.id ?? null : null, open);
  const shareMut = useShareExerciseCatalog();
  const revokeMut = useRevokeCatalogShare();
  const publicMut = useSetCatalogPublic();

  const colleaguesQ = useQuery({
    queryKey: ['pt-colleagues-for-catalog-share', query],
    queryFn: () => searchPTColleagues(query),
    enabled: open,
    staleTime: 30_000,
  });

  const sharedIds = useMemo(
    () => new Set((sharesQ.data ?? []).map((s) => s.shared_with_user_id)),
    [sharesQ.data],
  );

  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    (colleaguesQ.data ?? []).forEach((c) => map.set(c.user_id, colleagueName(c)));
    return map;
  }, [colleaguesQ.data]);

  const candidates = useMemo(() => {
    return (colleaguesQ.data ?? []).filter(
      (c) => c.user_id !== user?.id && !sharedIds.has(c.user_id),
    );
  }, [colleaguesQ.data, sharedIds, user?.id]);

  if (!live) return null;

  const isPublic = !!live.is_public;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setQuery('');
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md w-[calc(100%-2rem)] max-h-[calc(100vh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-4 w-4" />
            Condividi «{live.name}»
          </DialogTitle>
          <DialogDescription>
            Chi riceve il catalogo lo vede in sola lettura (esercizi e video). Puoi revocare l&apos;accesso in qualsiasi momento.
            Pubblico = visibile a tutti i PT, non agli atleti.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-3 rounded-md border p-3">
          <div className="flex items-start gap-2 min-w-0">
            <Globe className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <Label htmlFor="catalog-public" className="text-sm font-medium">
                Catalogo pubblico
              </Label>
              <p className="text-xs text-muted-foreground">
                Tutti i PT lo vedono in Archivio esercizi.
              </p>
            </div>
          </div>
          <Switch
            id="catalog-public"
            checked={isPublic}
            disabled={publicMut.isPending}
            onCheckedChange={(v) =>
              publicMut.mutate({ catalogId: live.id, isPublic: v })
            }
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Condividi con un PT</p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cerca PT per nome..."
              className="pl-9"
            />
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1 rounded-md border p-1">
            {colleaguesQ.isLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : candidates.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                Nessun PT da aggiungere. Prova un altro nome.
              </p>
            ) : (
              candidates.slice(0, 20).map((c) => (
                <button
                  key={c.user_id}
                  type="button"
                  className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted/50"
                  disabled={shareMut.isPending}
                  onClick={() =>
                    shareMut.mutate({ catalogId: live.id, sharedWithUserId: c.user_id })
                  }
                >
                  <span className="truncate">{colleagueName(c)}</span>
                  <span className="text-xs text-muted-foreground shrink-0">Condividi</span>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Chi ha accesso</p>
          {sharesQ.isLoading ? (
            <p className="text-xs text-muted-foreground">Caricamento...</p>
          ) : (sharesQ.data ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Nessuna condivisione individuale. {isPublic ? 'Il catalogo è comunque pubblico.' : 'Solo tu lo vedi, finché non lo condividi o lo rendi pubblico.'}
            </p>
          ) : (
            <ul className="space-y-1">
              {(sharesQ.data ?? []).map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-sm"
                >
                  <span className="truncate">
                    {nameById.get(s.shared_with_user_id) || 'PT'}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 text-destructive hover:text-destructive shrink-0"
                    disabled={revokeMut.isPending}
                    onClick={() =>
                      revokeMut.mutate({ shareId: s.id, catalogId: live.id })
                    }
                  >
                    <UserMinus className="h-3.5 w-3.5 mr-1" />
                    Revoca
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {sharesQ.isError && (
          <p className="text-xs text-destructive">
            Tabella condivisioni non disponibile sul backend. Applica la migration exercise_catalog_sharing.
          </p>
        )}

        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Chiudi
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ShareCatalogDialog;
