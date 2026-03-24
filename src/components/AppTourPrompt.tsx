import { useState, useEffect } from "react";
import { useTour, TourRole } from "./AppTourContext";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, Map } from "lucide-react";
import { safeGet, safeSet } from "@/lib/safeStorage";

const AppTourPrompt = () => {
  const { startTour } = useTour();
  const { role } = useAuth();
  const [open, setOpen] = useState(false);
  const [dontShow, setDontShow] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem("livellapp_tour_done");
    if (!done && role) {
      const t = setTimeout(() => setOpen(true), 1200);
      return () => clearTimeout(t);
    }
  }, [role]);

  const handleStart = () => {
    setOpen(false);
    if (dontShow) localStorage.setItem("livellapp_tour_done", "1");
    startTour((role as TourRole) ?? "atleta");
  };

  const handleSkip = () => {
    setOpen(false);
    if (dontShow) localStorage.setItem("livellapp_tour_done", "1");
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
          <DialogTitle className="text-center text-lg">Benvenuto su Livellapp! 🎉</DialogTitle>
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
