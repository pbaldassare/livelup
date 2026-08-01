import { useState, useEffect, useRef } from "react";
import { useTour, TourRole, isTourDismissed, persistTourDismissed } from "./AppTourContext";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, Map } from "lucide-react";

const AppTourPrompt = () => {
  const { startTour } = useTour();
  const { role, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [dontShow, setDontShow] = useState(false);
  const checkedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!role || !user?.id) return;
    if (checkedRef.current === user.id) return;
    checkedRef.current = user.id;

    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    (async () => {
      const dismissed = await isTourDismissed(user.id);
      if (cancelled || dismissed) return;
      timeout = setTimeout(() => setOpen(true), 1200);
    })();

    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
    };
  }, [role, user?.id]);

  const handleStart = () => {
    setOpen(false);
    if (dontShow) void persistTourDismissed(user?.id);
    startTour((role as TourRole) ?? "atleta");
  };

  const handleSkip = () => {
    setOpen(false);
    if (dontShow) void persistTourDismissed(user?.id);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next && dontShow) void persistTourDismissed(user?.id);
  };


  return (
    <Dialog open={open} onOpenChange={setOpen}>
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

        <div className="flex items-center gap-2 px-1 py-1">
          <Checkbox
            id="dont-show"
            checked={dontShow}
            onCheckedChange={(v) => setDontShow(v === true)}
          />
          <label htmlFor="dont-show" className="text-[12px] text-muted-foreground cursor-pointer">
            Non mostrare più
          </label>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button variant="outline" onClick={handleSkip} className="flex-1">
            Salta
          </Button>
          <Button onClick={handleStart} className="flex-1 gap-1.5">
            <Sparkles className="h-4 w-4" />
            Fai il tour
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AppTourPrompt;
