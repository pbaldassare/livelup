import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  Sparkles,
  Scale,
  Ruler,
  AlertTriangle,
  Activity,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =====================================================
// ATLETA ONBOARDING - Multi-step wizard
// Design: dark theme + lime accent (Ladder-inspired)
// =====================================================

const GOALS = [
  { id: 'perdita_peso', label: 'Perdita peso', icon: Scale, color: 'text-blue-400' },
  { id: 'massa_muscolare', label: 'Massa muscolare', icon: Dumbbell, color: 'text-red-400' },
  { id: 'tonificazione', label: 'Tonificazione', icon: Zap, color: 'text-yellow-400' },
  { id: 'salute', label: 'Salute generale', icon: Heart, color: 'text-pink-400' },
  { id: 'resistenza', label: 'Resistenza', icon: Activity, color: 'text-green-400' },
  { id: 'flessibilita', label: 'Flessibilità', icon: Sparkles, color: 'text-purple-400' },
];

const LEVELS = [
  { id: 'principiante', label: 'Principiante', description: "Nuovo all'allenamento o tornato da una pausa lunga", emoji: '🌱' },
  { id: 'intermedio', label: 'Intermedio', description: 'Mi alleno regolarmente da qualche mese', emoji: '💪' },
  { id: 'avanzato', label: 'Avanzato', description: 'Esperienza pluriennale e costante', emoji: '🔥' },
  { id: 'agonista', label: 'Agonista', description: 'Atleta competitivo o ex-professionista', emoji: '🏆' },
];

const COMMON_INJURIES = [
  'Problemi alla schiena',
  'Dolore alle ginocchia',
  'Spalla instabile',
  'Problemi al polso',
  'Tendiniti',
  'Ernia del disco',
  'Problemi cervicali',
  'Caviglia debole',
];

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
  }),
};

export function AtletaOnboardingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<string>('intermedio');
  const [height, setHeight] = useState<string>('');
  const [weight, setWeight] = useState<string>('');
  const [dateOfBirth, setDateOfBirth] = useState<string>('');
  const [selectedInjuries, setSelectedInjuries] = useState<string[]>([]);
  const [customInjury, setCustomInjury] = useState('');
  const [healthNotes, setHealthNotes] = useState('');

  const totalSteps = 4;

  const toggleGoal = (goalId: string) => {
    setSelectedGoals(prev => 
      prev.includes(goalId) 
        ? prev.filter(g => g !== goalId)
        : [...prev, goalId]
    );
  };

  const toggleInjury = (injury: string) => {
    setSelectedInjuries(prev => 
      prev.includes(injury) 
        ? prev.filter(i => i !== injury)
        : [...prev, injury]
    );
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setDirection(1);
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setDirection(-1);
      setStep(step - 1);
    }
  };

  const handleComplete = async () => {
    if (!user?.id) return;

    setIsSubmitting(true);
    try {
      // Combine injuries
      const allInjuries = [...selectedInjuries];
      if (customInjury.trim()) {
        allInjuries.push(customInjury.trim());
      }

      // Update atleta profile
      const { error } = await supabase
        .from('atleta_profiles')
        .upsert({
          user_id: user.id,
          goals: selectedGoals,
          fitness_level: selectedLevel,
          level: selectedLevel as any,
          height_cm: height ? parseInt(height) : null,
          weight_kg: weight ? parseFloat(weight) : null,
          date_of_birth: dateOfBirth || null,
          injuries: allInjuries.length > 0 ? allInjuries : null,
          health_notes: healthNotes || null,
          status: 'non_collegato',
        }, {
          onConflict: 'user_id',
        });

      if (error) throw error;

      toast.success('Profilo completato! 🎉');
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
    <div className="min-h-screen bg-app-background flex flex-col" data-role="atleta">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-app-muted">
        <motion.div 
          className="h-full bg-app-accent"
          initial={{ width: 0 }}
          animate={{ width: `${(step / totalSteps) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Step indicator */}
      <div className="pt-6 px-4 flex justify-center gap-2">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div 
            key={i}
            className={cn(
              'w-2 h-2 rounded-full transition-colors',
              i + 1 <= step ? 'bg-app-accent' : 'bg-app-muted'
            )}
          />
        ))}
      </div>

      <div className="flex-1 p-4 pt-4 pb-24 max-w-lg mx-auto w-full overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          {/* Step 1: Goals */}
          {step === 1 && (
            <motion.div
              key="step1"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                >
                  <Target className="h-12 w-12 mx-auto text-app-accent" />
                </motion.div>
                <h1 className="text-2xl font-bold text-app-foreground">I tuoi obiettivi</h1>
                <p className="text-app-muted-foreground">
                  Seleziona uno o più obiettivi
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {GOALS.map((goal, i) => {
                  const isSelected = selectedGoals.includes(goal.id);
                  const Icon = goal.icon;
                  return (
                    <motion.div
                      key={goal.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Card 
                        className={cn(
                          'cursor-pointer transition-all border-2',
                          isSelected 
                            ? 'border-app-accent bg-app-accent/10' 
                            : 'border-app-border bg-app-card hover:border-app-accent/50'
                        )}
                        onClick={() => toggleGoal(goal.id)}
                      >
                        <CardContent className="p-4 flex flex-col items-center gap-2 text-center relative">
                          <div className={cn(
                            'w-12 h-12 rounded-full flex items-center justify-center transition-colors',
                            isSelected ? 'bg-app-accent/20' : 'bg-app-muted'
                          )}>
                            <Icon className={cn('h-6 w-6', isSelected ? 'text-app-accent' : goal.color)} />
                          </div>
                          <span className="text-sm font-medium text-app-foreground">{goal.label}</span>
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute top-2 right-2"
                            >
                              <Check className="h-4 w-4 text-app-accent" />
                            </motion.div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Step 2: Level */}
          {step === 2 && (
            <motion.div
              key="step2"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                >
                  <Dumbbell className="h-12 w-12 mx-auto text-app-accent" />
                </motion.div>
                <h1 className="text-2xl font-bold text-app-foreground">Il tuo livello</h1>
                <p className="text-app-muted-foreground">
                  Aiuta a consigliarti i PT più adatti
                </p>
              </div>

              <RadioGroup value={selectedLevel} onValueChange={setSelectedLevel}>
                <div className="space-y-3">
                  {LEVELS.map((level, i) => (
                    <motion.div
                      key={level.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <Card 
                        className={cn(
                          'cursor-pointer transition-all border-2',
                          selectedLevel === level.id 
                            ? 'border-app-accent bg-app-accent/10' 
                            : 'border-app-border bg-app-card hover:border-app-accent/50'
                        )}
                        onClick={() => setSelectedLevel(level.id)}
                      >
                        <CardContent className="p-4 flex items-center gap-4">
                          <span className="text-2xl">{level.emoji}</span>
                          <div className="flex-1">
                            <Label htmlFor={level.id} className="text-base font-medium cursor-pointer text-app-foreground">
                              {level.label}
                            </Label>
                            <p className="text-sm text-app-muted-foreground">{level.description}</p>
                          </div>
                          <RadioGroupItem 
                            value={level.id} 
                            id={level.id} 
                            className="border-app-accent text-app-accent"
                          />
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </RadioGroup>
            </motion.div>
          )}

          {/* Step 3: Body metrics */}
          {step === 3 && (
            <motion.div
              key="step3"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                >
                  <User className="h-12 w-12 mx-auto text-app-accent" />
                </motion.div>
                <h1 className="text-2xl font-bold text-app-foreground">I tuoi dati</h1>
                <p className="text-app-muted-foreground">
                  Opzionale - aiuta a personalizzare i programmi
                </p>
              </div>

              <div className="space-y-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="space-y-2"
                >
                  <Label className="text-app-foreground flex items-center gap-2">
                    <Ruler className="h-4 w-4" />
                    Altezza (cm)
                  </Label>
                  <Input
                    type="number"
                    placeholder="175"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="bg-app-muted border-app-border text-app-foreground placeholder:text-app-muted-foreground"
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="space-y-2"
                >
                  <Label className="text-app-foreground flex items-center gap-2">
                    <Scale className="h-4 w-4" />
                    Peso attuale (kg)
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="70"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="bg-app-muted border-app-border text-app-foreground placeholder:text-app-muted-foreground"
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-2"
                >
                  <Label className="text-app-foreground">Data di nascita</Label>
                  <Input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="bg-app-muted border-app-border text-app-foreground"
                  />
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* Step 4: Injuries & Health */}
          {step === 4 && (
            <motion.div
              key="step4"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                >
                  <AlertTriangle className="h-12 w-12 mx-auto text-app-accent" />
                </motion.div>
                <h1 className="text-2xl font-bold text-app-foreground">Infortuni & Salute</h1>
                <p className="text-app-muted-foreground">
                  Informazioni importanti per il tuo PT
                </p>
              </div>

              <div className="space-y-4">
                <Label className="text-app-foreground">Hai infortuni o limitazioni?</Label>
                <div className="grid grid-cols-2 gap-2">
                  {COMMON_INJURIES.map((injury, i) => {
                    const isSelected = selectedInjuries.includes(injury);
                    return (
                      <motion.div
                        key={injury}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.03 }}
                      >
                        <Card 
                          className={cn(
                            'cursor-pointer transition-all p-3',
                            isSelected 
                              ? 'border-app-accent bg-app-accent/10' 
                              : 'border-app-border bg-app-card hover:border-app-accent/50'
                          )}
                          onClick={() => toggleInjury(injury)}
                        >
                          <div className="flex items-center gap-2">
                            <Checkbox 
                              checked={isSelected}
                              className="border-app-accent data-[state=checked]:bg-app-accent"
                            />
                            <span className="text-sm text-app-foreground">{injury}</span>
                          </div>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-2"
                >
                  <Label className="text-app-foreground">Altro infortunio/problema</Label>
                  <Input
                    placeholder="Es: operazione al menisco..."
                    value={customInjury}
                    onChange={(e) => setCustomInjury(e.target.value)}
                    className="bg-app-muted border-app-border text-app-foreground placeholder:text-app-muted-foreground"
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="space-y-2"
                >
                  <Label className="text-app-foreground">Note aggiuntive sulla salute</Label>
                  <Textarea
                    placeholder="Allergie, condizioni mediche, farmaci..."
                    value={healthNotes}
                    onChange={(e) => setHealthNotes(e.target.value)}
                    className="bg-app-muted border-app-border text-app-foreground placeholder:text-app-muted-foreground min-h-[80px]"
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <Card className="bg-app-accent/10 border-app-accent/30">
                    <CardContent className="p-4">
                      <p className="text-sm text-center text-app-foreground">
                        <Sparkles className="inline h-4 w-4 mr-1 text-app-accent" />
                        Sei pronto! Inizia a cercare il tuo Personal Trainer ideale
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation buttons */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-app-background border-t border-app-border safe-bottom">
        <div className="flex gap-3 max-w-lg mx-auto">
          {step > 1 && (
            <Button 
              variant="outline" 
              onClick={handleBack} 
              className="flex-1 border-app-border text-app-foreground hover:bg-app-muted"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Indietro
            </Button>
          )}
          
          {step < totalSteps ? (
            <Button 
              onClick={handleNext} 
              disabled={!canProceed}
              className="flex-1 bg-app-accent text-app-accent-foreground hover:bg-app-accent/90"
            >
              Avanti
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button 
              onClick={handleComplete}
              disabled={isSubmitting}
              className="flex-1 bg-app-accent text-app-accent-foreground hover:bg-app-accent/90"
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
