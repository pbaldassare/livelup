import { createContext, useContext, useState, useCallback, useRef, ReactNode } from "react";
import { safeSet } from "@/lib/safeStorage";
import { supabase } from "@/integrations/supabase/client";

async function persistTourDismissed() {
  safeSet("livellapp_tour_done", "1");
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return;
    const { data } = await supabase
      .from("profiles")
      .select("notification_preferences")
      .eq("user_id", user.id)
      .maybeSingle();
    const current = (data?.notification_preferences as Record<string, unknown> | null) ?? {};
    await supabase
      .from("profiles")
      .update({ notification_preferences: { ...current, tour_dismissed: true } })
      .eq("user_id", user.id);
  } catch (e) {
    console.warn("[AppTour] failed to persist tour_dismissed", e);
  }
}

export type TourActionType = "navigate" | "scroll" | "wait";

export interface TourAction {
  type: TourActionType;
  target?: string;
  delay?: number;
}

export interface TourStep {
  selector: string;
  title: string;
  description: string;
  page?: string;
  position?: "top" | "bottom" | "left" | "right";
  action?: TourAction;
  duration?: number;
}

export type TourRole = "atleta" | "pt" | "admin";

interface TourContextType {
  isActive: boolean;
  currentStep: number;
  steps: TourStep[];
  startTour: (role?: TourRole) => void;
  stopTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  totalSteps: number;
}

const TourContext = createContext<TourContextType | null>(null);

export const useTour = () => {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used within TourProvider");
  return ctx;
};

/* ═══════════════ ATLETA TOUR ═══════════════ */
export const ATLETA_TOUR_STEPS: TourStep[] = [
  // Home (/app)
  { selector: "atleta-greeting", title: "Benvenuto su Livelapp! 🎉", description: "Questa è la tua home. Qui trovi workout, progressi, statistiche settimanali e il tuo PT a portata di tap.", page: "/app" },
  { selector: "atleta-week-calendar", title: "Calendario settimanale 📅", description: "Tieni traccia della tua settimana di allenamenti. I giorni completati sono evidenziati per motivarti!", page: "/app", action: { type: "scroll", target: "atleta-week-calendar" } },
  { selector: "atleta-today-workout", title: "Workout di oggi 💪", description: "Qui trovi la scheda di allenamento assegnata dal tuo PT. Tap per aprirla e iniziare ad allenarti!", page: "/app", action: { type: "scroll", target: "atleta-today-workout" } },
  { selector: "atleta-weekly-stats", title: "Statistiche settimanali 📊", description: "Monitora i tuoi progressi: allenamenti completati, streak e obiettivi raggiunti.", page: "/app", action: { type: "scroll", target: "atleta-weekly-stats" } },
  { selector: "atleta-teammates", title: "I tuoi compagni 👥", description: "Scopri chi si allena con te e mandagli un 'cheer' per motivarli!", page: "/app", action: { type: "scroll", target: "atleta-teammates" } },

  // Bottom Nav
  { selector: "nav-home", title: "Home 🏠", description: "Torna alla dashboard principale in qualsiasi momento.", page: "/app" },
  { selector: "nav-discover", title: "Scopri professionisti 🔍", description: "Cerca personal trainer e professionisti del fitness nella tua zona o online.", page: "/app" },
  { selector: "nav-workout", title: "Le tue attività 🏋️", description: "Tutte le tue schede di allenamento, passate e future, in un unico posto.", page: "/app" },
  { selector: "nav-booking", title: "Prenota sessioni 📋", description: "Prenota sessioni di allenamento con il tuo PT direttamente dall'app.", page: "/app" },
  { selector: "nav-profile", title: "Profilo ⚙️", description: "Gestisci il tuo profilo, impostazioni, abbonamento e supporto.", page: "/app" },

  // Discover page
  { selector: "discover-page", title: "Scopri i professionisti 🔎", description: "Cerca PT per specializzazione, posizione e recensioni. Puoi filtrare per tipo di allenamento e modalità (online/in persona).", page: "/app/discover", action: { type: "navigate", target: "/app/discover", delay: 500 } },

  // Workout page
  { selector: "workout-page", title: "Le tue schede 📋", description: "Qui trovi tutte le schede assegnate dal tuo PT. Puoi filtrare per stato e vedere i dettagli di ogni esercizio.", page: "/app/workout", action: { type: "navigate", target: "/app/workout", delay: 500 } },

  // Progress page
  { selector: "progress-page", title: "I tuoi progressi 📈", description: "Monitora peso, misurazioni e foto prima/dopo. Visualizza i trend nel tempo per restare motivato!", page: "/app/progress", action: { type: "navigate", target: "/app/progress", delay: 500 } },

  // Profile page
  { selector: "profile-page", title: "Il tuo profilo 👤", description: "Modifica i tuoi dati, foto, gestisci notifiche e abbonamento. Da qui puoi anche riavviare questo tour!", page: "/app/profile", action: { type: "navigate", target: "/app/profile", delay: 500 } },

  // Finale
  { selector: "atleta-greeting", title: "Sei pronto! 🎊", description: "Ora conosci tutte le funzionalità di Livelapp. Inizia collegandoti a un PT o esplorando i professionisti disponibili. Buon allenamento! 💪", page: "/app", action: { type: "navigate", target: "/app", delay: 400 } },
];

/* ═══════════════ PT TOUR ═══════════════ */
export const PT_TOUR_STEPS: TourStep[] = [
  // Home (/pt/app)
  { selector: "pt-greeting", title: "Benvenuto su Livelapp! 🎉", description: "Questa è la tua dashboard PT. Qui monitori atleti, schede, messaggi e calendario in un colpo d'occhio.", page: "/pt/app" },
  { selector: "pt-stats-section", title: "Le tue statistiche 📊", description: "Panoramica rapida: atleti attivi, schede assegnate, messaggi non letti e eventi in programma.", page: "/pt/app", action: { type: "scroll", target: "pt-stats-section" } },
  { selector: "pt-connection-requests", title: "Richieste di collegamento 🔗", description: "Qui vedi le richieste di collegamento dagli atleti. Accetta o rifiuta con un tap.", page: "/pt/app", action: { type: "scroll", target: "pt-connection-requests" } },
  { selector: "pt-today-events", title: "Eventi di oggi 📅", description: "Gli appuntamenti e sessioni di allenamento programmate per oggi.", page: "/pt/app", action: { type: "scroll", target: "pt-today-events" } },

  // Bottom Nav PT
  { selector: "nav-pt-home", title: "Home 🏠", description: "La tua dashboard con panoramica completa dell'attività.", page: "/pt/app" },
  { selector: "nav-pt-athletes", title: "I tuoi atleti 👥", description: "Lista completa degli atleti collegati. Gestisci schede, progressi e comunicazioni.", page: "/pt/app" },
  { selector: "nav-pt-calendar", title: "Calendario 📅", description: "Gestisci appuntamenti, sessioni e disponibilità settimanale.", page: "/pt/app" },
  { selector: "nav-pt-workouts", title: "Schede allenamento 🏋️", description: "Crea template, assegna schede personalizzate e monitora i progressi.", page: "/pt/app" },
  { selector: "nav-pt-profile", title: "Profilo PT ⚙️", description: "Gestisci profilo pubblico, galleria, certificazioni e impostazioni.", page: "/pt/app" },

  // Athletes page
  { selector: "pt-athletes-page", title: "Gestione atleti 👥", description: "Visualizza tutti i tuoi atleti, il loro stato e le schede assegnate. Tap su un atleta per i dettagli.", page: "/pt/app/athletes", action: { type: "navigate", target: "/pt/app/athletes", delay: 500 } },

  // Workouts page
  { selector: "pt-workouts-page", title: "Template e schede 📋", description: "Crea template riutilizzabili e assegna schede personalizzate. Ogni esercizio ha serie, ripetizioni e tempo di recupero.", page: "/pt/app/templates", action: { type: "navigate", target: "/pt/app/templates", delay: 500 } },

  // Calendar page
  { selector: "pt-calendar-page", title: "Il tuo calendario 📅", description: "Gestisci disponibilità, crea eventi e sessioni. Gli atleti possono prenotare nelle fasce libere.", page: "/pt/app/calendar", action: { type: "navigate", target: "/pt/app/calendar", delay: 500 } },

  // Profile page
  { selector: "pt-profile-page", title: "Il tuo profilo PT 👤", description: "Personalizza bio, specializzazioni, galleria foto e tariffe. Qui puoi anche riavviare questo tour!", page: "/pt/app/profile", action: { type: "navigate", target: "/pt/app/profile", delay: 500 } },

  // Finale
  { selector: "pt-greeting", title: "Sei pronto! 🎊", description: "Ora conosci tutte le funzionalità della tua app PT. Inizia creando il tuo profilo e accettando i primi atleti! 💪", page: "/pt/app", action: { type: "navigate", target: "/pt/app", delay: 400 } },
];

/* ═══════════════ ADMIN TOUR ═══════════════ */
export const ADMIN_TOUR_STEPS: TourStep[] = [
  { selector: "admin-dashboard", title: "Dashboard Admin 🎛️", description: "Panoramica completa della piattaforma: utenti, abbonamenti, pagamenti e ticket di supporto.", page: "/admin" },
  { selector: "admin-kpi-cards", title: "KPI principali 📊", description: "I numeri chiave della piattaforma: PT attivi, atleti totali, abbonamenti e ticket aperti.", page: "/admin", action: { type: "scroll", target: "admin-kpi-cards" } },
  { selector: "admin-nav-pts", title: "Gestione PT 👨‍🏫", description: "Approva, sospendi o gestisci i profili dei personal trainer sulla piattaforma.", page: "/admin" },
  { selector: "admin-nav-athletes", title: "Gestione atleti 🏃", description: "Monitora tutti gli atleti registrati, il loro stato e le connessioni con i PT.", page: "/admin" },
  { selector: "admin-nav-subscriptions", title: "Abbonamenti 💳", description: "Gestisci i piani di abbonamento, visualizza lo stato e le scadenze.", page: "/admin" },
  { selector: "admin-nav-payments", title: "Pagamenti 💰", description: "Monitora tutti i pagamenti, fatture e rimborsi della piattaforma.", page: "/admin" },
  { selector: "admin-nav-support", title: "Supporto 🎫", description: "Gestisci i ticket di supporto degli utenti con priorità e assegnazioni.", page: "/admin" },
  { selector: "admin-dashboard", title: "Tutto pronto! 🎊", description: "Ora conosci la dashboard admin. Monitora la piattaforma e gestisci utenti, pagamenti e supporto da qui!", page: "/admin" },
];

export function getTourSteps(role: TourRole): TourStep[] {
  switch (role) {
    case "pt": return PT_TOUR_STEPS;
    case "admin": return ADMIN_TOUR_STEPS;
    default: return ATLETA_TOUR_STEPS;
  }
}

export const TourProvider = ({ children }: { children: ReactNode }) => {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<TourStep[]>(ATLETA_TOUR_STEPS);
  const stepsRef = useRef(steps);
  stepsRef.current = steps;

  const startTour = useCallback((role?: TourRole) => {
    const tourSteps = getTourSteps(role ?? "atleta");
    setSteps(tourSteps);
    stepsRef.current = tourSteps;
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  const stopTour = useCallback(() => {
    setIsActive(false);
    setCurrentStep(0);
    void persistTourDismissed();
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep(prev => {
      if (prev >= stepsRef.current.length - 1) {
        setIsActive(false);
        void persistTourDismissed();
        return 0;
      }
      return prev + 1;
    });
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  }, []);

  const goToStep = useCallback((step: number) => {
    setCurrentStep(step);
  }, []);

  return (
    <TourContext.Provider value={{
      isActive, currentStep, steps, startTour, stopTour, nextStep, prevStep, goToStep,
      totalSteps: steps.length,
    }}>
      {children}
    </TourContext.Provider>
  );
};
