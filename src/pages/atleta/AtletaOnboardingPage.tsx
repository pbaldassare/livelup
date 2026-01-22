import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Target, 
  Dumbbell, 
  Heart, 
  Zap, 
  ChevronRight, 
  ChevronLeft,
  Check,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =====================================================
// ATLETA ONBOARDING - Raccolta preferenze iniziali
// =====================================================

const GOALS = [
  { id: 'perdita_peso', label: 'Perdita peso', icon: Target },
  { id: 'massa_muscolare', label: 'Massa muscolare', icon: Dumbbell },
  { id: 'tonificazione', label: 'Tonificazione', icon: Zap },
  { id: 'salute', label: 'Salute generale', icon: Heart },
  { id: 'resistenza', label: 'Resistenza', icon: Sparkles },
  { id: 'flessibilita', label: 'Flessibilità', icon: Sparkles },
];

const LEVELS = [
  { id: 'principiante', label: 'Principiante', description: 'Nuovo al fitness o tornato da una pausa' },
  { id: 'intermedio', label: 'Intermedio', description: 'Alleno regolarmente da qualche mese' },
  { id: 'avanzato', label: 'Avanzato', description: 'Esperienza pluriennale e costante' },
];

const PREFERENCES = [
  { id: 'online', label: 'Allenamento online' },
  { id: 'in_persona', label: 'Allenamento in presenza' },
  { id: 'mattina', label: 'Preferenza mattina' },
  { id: 'pomeriggio', label: 'Preferenza pomeriggio' },
  { id: 'sera', label: 'Preferenza sera' },
];

export function AtletaOnboardingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<string>('intermedio');
  const [selectedPreferences, setSelectedPreferences] = useState<string[]>([]);

  const totalSteps = 3;

  const toggleGoal = (goalId: string) => {
    setSelectedGoals(prev => 
      prev.includes(goalId) 
        ? prev.filter(g => g !== goalId)
        : [...prev, goalId]
    );
  };

  const togglePreference = (prefId: string) => {
    setSelectedPreferences(prev => 
      prev.includes(prefId) 
        ? prev.filter(p => p !== prefId)
        : [...prev, prefId]
    );
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleComplete = async () => {
    if (!user?.id) return;

    setIsSubmitting(true);
    try {
      // Update atleta profile
      const { error } = await supabase
        .from('atleta_profiles')
        .upsert({
          user_id: user.id,
          goals: selectedGoals,
          fitness_level: selectedLevel,
          status: 'non_collegato',
        }, {
          onConflict: 'user_id',
        });

      if (error) throw error;

      toast.success('Profilo completato!');
      navigate('/app');
    } catch (error: any) {
      toast.error('Errore nel salvataggio: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = step === 1 
    ? selectedGoals.length > 0 
    : step === 2 
      ? !!selectedLevel 
      : true;

  return (
    <div className="min-h-screen bg-background flex flex-col" data-role="atleta">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-muted">
        <div 
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${(step / totalSteps) * 100}%` }}
        />
      </div>

      <div className="flex-1 p-4 pt-8 pb-24 max-w-lg mx-auto w-full">
        {/* Step 1: Goals */}
        {step === 1 && (
          <div className="space-y-6 animate-in">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold">Quali sono i tuoi obiettivi?</h1>
              <p className="text-muted-foreground">
                Seleziona uno o più obiettivi per personalizzare la tua esperienza
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {GOALS.map((goal) => {
                const isSelected = selectedGoals.includes(goal.id);
                const Icon = goal.icon;
                return (
                  <Card 
                    key={goal.id}
                    className={cn(
                      'cursor-pointer transition-all',
                      isSelected 
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                        : 'hover:border-primary/50'
                    )}
                    onClick={() => toggleGoal(goal.id)}
                  >
                    <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
                      <div className={cn(
                        'w-12 h-12 rounded-full flex items-center justify-center transition-colors',
                        isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      )}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className="text-sm font-medium">{goal.label}</span>
                      {isSelected && (
                        <Check className="h-4 w-4 text-primary absolute top-2 right-2" />
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Level */}
        {step === 2 && (
          <div className="space-y-6 animate-in">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold">Qual è il tuo livello?</h1>
              <p className="text-muted-foreground">
                Questo ci aiuta a consigliarti i PT più adatti
              </p>
            </div>

            <RadioGroup value={selectedLevel} onValueChange={setSelectedLevel}>
              <div className="space-y-3">
                {LEVELS.map((level) => (
                  <Card 
                    key={level.id}
                    className={cn(
                      'cursor-pointer transition-all',
                      selectedLevel === level.id 
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                        : 'hover:border-primary/50'
                    )}
                    onClick={() => setSelectedLevel(level.id)}
                  >
                    <CardContent className="p-4 flex items-center gap-4">
                      <RadioGroupItem value={level.id} id={level.id} />
                      <div className="flex-1">
                        <Label htmlFor={level.id} className="text-base font-medium cursor-pointer">
                          {level.label}
                        </Label>
                        <p className="text-sm text-muted-foreground">{level.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </RadioGroup>
          </div>
        )}

        {/* Step 3: Preferences */}
        {step === 3 && (
          <div className="space-y-6 animate-in">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold">Preferenze allenamento</h1>
              <p className="text-muted-foreground">
                Opzionale - puoi modificarle in seguito
              </p>
            </div>

            <div className="space-y-3">
              {PREFERENCES.map((pref) => {
                const isSelected = selectedPreferences.includes(pref.id);
                return (
                  <Card 
                    key={pref.id}
                    className={cn(
                      'cursor-pointer transition-all',
                      isSelected 
                        ? 'border-primary bg-primary/5' 
                        : 'hover:border-primary/50'
                    )}
                    onClick={() => togglePreference(pref.id)}
                  >
                    <CardContent className="p-4 flex items-center gap-4">
                      <Checkbox 
                        checked={isSelected}
                        onCheckedChange={() => togglePreference(pref.id)}
                      />
                      <Label className="cursor-pointer flex-1">{pref.label}</Label>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <p className="text-sm text-center">
                  <Sparkles className="inline h-4 w-4 mr-1" />
                  Puoi iniziare subito a cercare il tuo Personal Trainer ideale!
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border safe-bottom">
        <div className="flex gap-3 max-w-lg mx-auto">
          {step > 1 && (
            <Button variant="outline" onClick={handleBack} className="flex-1">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Indietro
            </Button>
          )}
          
          {step < totalSteps ? (
            <Button 
              onClick={handleNext} 
              disabled={!canProceed}
              className="flex-1"
            >
              Avanti
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button 
              onClick={handleComplete}
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Salvataggio...' : 'Inizia!'}
              <Check className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default AtletaOnboardingPage;
