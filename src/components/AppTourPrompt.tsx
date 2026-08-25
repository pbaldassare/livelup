import { useState, useEffect, useRef } from "react";
import { useTour, TourRole, isTourDismissed, persistTourDismissed } from "./AppTourContext";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Map } from "lucide-react";

const AppTourPrompt = () => {
  const { startTour } = useTour();
  const { role, user } = useAuth();
  const [open, setOpen] = useState(false);
  const startingTourRef = useRef(false);
  const userId = user?.id;

  useEffect(() => {
    if (!role || !userId) return;

    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    (async () => {
      const dismissed = await isTourDismissed(userId);
      if (cancelled || dismissed) return;
      timeout = setTimeout(() => {
        if (!cancelled) setOpen(true);
      }, 1200);
    })();

    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
    };
  }, [role, userId]);

  const dismissForever = () => {
    setOpen(false);
    void persistTourDismissed(userId);
  };

  const handleStart = () => {
    startingTourRef.current = true;
    setOpen(false);
    startTour((role as TourRole) ?? "atleta");
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && !startingTourRef.current) {
      void persistTourDismissed(userId);
    }
    startingTourRef.current = false;
    setOpen(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex justify-center mb-2">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Map className="h-7 w-7 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center text-lg">Benvenuto su Livelapp! 🎉</DialogTitle>
          <DialogDescription className="text-center text-[13px] leading-relaxed">
            Vuoi fare un tour guidato dell'app? Ti mostreremo tutte le funzionalità in pochi minuti.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={dismissForever} className="flex-1">
            Non mostrare più
          </Button>
          <Button type="button" onClick={handleStart} className="flex-1 gap-1.5">
            <Sparkles className="h-4 w-4" />
            Fai il tour
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AppTourPrompt;
