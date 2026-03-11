import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Award, 
  MapPin, 
  DollarSign, 
  ChevronRight, 
  ChevronLeft,
  Check,
  Briefcase,
  Globe,
  Users
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =====================================================
// PT ONBOARDING - Multi-step wizard for Personal Trainers
// =====================================================

const SPECIALIZATIONS = [
  'Forza', 'Ipertrofia', 'Dimagrimento', 'Calisthenics',
  'Functional Training', 'CrossFit', 'Yoga', 'Pilates',
  'Riabilitazione', 'Sport specifico', 'Bodybuilding', 'HIIT',
];

const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction < 0 ? 300 : -300, opacity: 0 }),
};

export function PTOnboardingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [bio, setBio] = useState('');
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [certifications, setCertifications] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [locationCity, setLocationCity] = useState('');
  const [offersOnline, setOffersOnline] = useState(true);
  const [offersInPerson, setOffersInPerson] = useState(true);
  const [hourlyRate, setHourlyRate] = useState('');

  const totalSteps = 4;

  const toggleSpec = (spec: string) => {
    setSpecializations(prev =>
      prev.includes(spec) ? prev.filter(s => s !== spec) : [...prev, spec]
    );
  };

  const handleNext = () => {
    if (step < totalSteps) { setDirection(1); setStep(step + 1); }
  };

  const handleBack = () => {
    if (step > 1) { setDirection(-1); setStep(step - 1); }
  };

  const handleComplete = async () => {
    if (!user?.id) return;
    setIsSubmitting(true);
    try {
      // Update profiles table
      await supabase.from('profiles').update({
        first_name: firstName,
        last_name: lastName,
      }).eq('user_id', user.id);

      // Update pt_profiles
      const { error } = await supabase.from('pt_profiles').update({
        bio: bio || null,
        specializations: specializations.length > 0 ? specializations : null,
        certifications: certifications ? certifications.split(',').map(c => c.trim()) : null,
        experience_years: experienceYears ? parseInt(experienceYears) : null,
        location_city: locationCity || null,
        offers_online: offersOnline,
        offers_in_person: offersInPerson,
        hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null,
        status: 'in_attesa_approvazione',
        is_discoverable: true,
      }).eq('user_id', user.id);

      if (error) throw error;

      toast.success('Profilo completato! In attesa di approvazione 🎉');
      navigate('/pt/app');
    } catch (error: any) {
      toast.error('Errore: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = step === 1
    ? firstName.trim().length > 0 && lastName.trim().length > 0
    : step === 2
      ? specializations.length > 0
      : true;

  return (
    <div className="min-h-screen bg-app-background flex flex-col" data-role="pt">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-app-muted">
        <motion.div className="h-full bg-app-accent" initial={{ width: 0 }} animate={{ width: `${(step / totalSteps) * 100}%` }} transition={{ duration: 0.3 }} />
      </div>

      <div className="pt-6 px-4 flex justify-center gap-2">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div key={i} className={cn('w-2 h-2 rounded-full transition-colors', i + 1 <= step ? 'bg-app-accent' : 'bg-app-muted')} />
        ))}
      </div>

      <div className="flex-1 p-4 pt-4 pb-24 max-w-lg mx-auto w-full overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          {/* Step 1: Personal info */}
          {step === 1 && (
            <motion.div key="step1" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }} className="space-y-6">
              <div className="text-center space-y-2">
                <Briefcase className="h-12 w-12 mx-auto text-app-accent" />
                <h1 className="text-2xl font-bold text-app-foreground">I tuoi dati</h1>
                <p className="text-app-muted-foreground">Presentati ai tuoi futuri atleti</p>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-app-foreground">Nome *</Label>
                    <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Mario" className="bg-app-muted border-app-border text-app-foreground" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-app-foreground">Cognome *</Label>
                    <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Rossi" className="bg-app-muted border-app-border text-app-foreground" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-app-foreground">Bio / Presentazione</Label>
                  <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Descrivi la tua esperienza e il tuo approccio..." rows={4} className="bg-app-muted border-app-border text-app-foreground" />
                </div>
                <div className="space-y-2">
                  <Label className="text-app-foreground">Anni di esperienza</Label>
                  <Input type="number" value={experienceYears} onChange={(e) => setExperienceYears(e.target.value)} placeholder="5" className="bg-app-muted border-app-border text-app-foreground" />
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Specializations */}
          {step === 2 && (
            <motion.div key="step2" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }} className="space-y-6">
              <div className="text-center space-y-2">
                <Award className="h-12 w-12 mx-auto text-app-accent" />
                <h1 className="text-2xl font-bold text-app-foreground">Specializzazioni</h1>
                <p className="text-app-muted-foreground">Seleziona le tue aree di competenza</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {SPECIALIZATIONS.map((spec) => {
                  const isSelected = specializations.includes(spec);
                  return (
                    <Card
                      key={spec}
                      className={cn('cursor-pointer transition-all border-2', isSelected ? 'border-app-accent bg-app-accent/10' : 'border-app-border bg-app-card hover:border-app-accent/50')}
                      onClick={() => toggleSpec(spec)}
                    >
                      <CardContent className="p-3 flex items-center gap-2">
                        <Checkbox checked={isSelected} className="border-app-accent data-[state=checked]:bg-app-accent" />
                        <span className="text-sm font-medium text-app-foreground">{spec}</span>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              <div className="space-y-2">
                <Label className="text-app-foreground">Certificazioni (separate da virgola)</Label>
                <Input value={certifications} onChange={(e) => setCertifications(e.target.value)} placeholder="ISSA, NASM, FIF..." className="bg-app-muted border-app-border text-app-foreground" />
              </div>
            </motion.div>
          )}

          {/* Step 3: Location & services */}
          {step === 3 && (
            <motion.div key="step3" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }} className="space-y-6">
              <div className="text-center space-y-2">
                <MapPin className="h-12 w-12 mx-auto text-app-accent" />
                <h1 className="text-2xl font-bold text-app-foreground">Dove lavori</h1>
                <p className="text-app-muted-foreground">Indica come e dove offri i tuoi servizi</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-app-foreground">Città</Label>
                  <Input value={locationCity} onChange={(e) => setLocationCity(e.target.value)} placeholder="Milano" className="bg-app-muted border-app-border text-app-foreground" />
                </div>
                <div className="space-y-3">
                  <Label className="text-app-foreground">Modalità</Label>
                  <Card
                    className={cn('cursor-pointer transition-all border-2', offersInPerson ? 'border-app-accent bg-app-accent/10' : 'border-app-border bg-app-card')}
                    onClick={() => setOffersInPerson(!offersInPerson)}
                  >
                    <CardContent className="p-4 flex items-center gap-3">
                      <Users className="h-5 w-5 text-app-accent" />
                      <div className="flex-1">
                        <p className="font-medium text-app-foreground">Di persona</p>
                        <p className="text-sm text-app-muted-foreground">Sessioni in palestra o a domicilio</p>
                      </div>
                      <Checkbox checked={offersInPerson} className="border-app-accent data-[state=checked]:bg-app-accent" />
                    </CardContent>
                  </Card>
                  <Card
                    className={cn('cursor-pointer transition-all border-2', offersOnline ? 'border-app-accent bg-app-accent/10' : 'border-app-border bg-app-card')}
                    onClick={() => setOffersOnline(!offersOnline)}
                  >
                    <CardContent className="p-4 flex items-center gap-3">
                      <Globe className="h-5 w-5 text-app-accent" />
                      <div className="flex-1">
                        <p className="font-medium text-app-foreground">Online</p>
                        <p className="text-sm text-app-muted-foreground">Coaching via videochiamata</p>
                      </div>
                      <Checkbox checked={offersOnline} className="border-app-accent data-[state=checked]:bg-app-accent" />
                    </CardContent>
                  </Card>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 4: Pricing */}
          {step === 4 && (
            <motion.div key="step4" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }} className="space-y-6">
              <div className="text-center space-y-2">
                <DollarSign className="h-12 w-12 mx-auto text-app-accent" />
                <h1 className="text-2xl font-bold text-app-foreground">Tariffa</h1>
                <p className="text-app-muted-foreground">Imposta la tua tariffa oraria</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-app-foreground">Tariffa oraria (€)</Label>
                  <Input type="number" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} placeholder="50" className="bg-app-muted border-app-border text-app-foreground text-lg" />
                  <p className="text-xs text-app-muted-foreground">Potrai creare pacchetti con prezzi personalizzati in seguito</p>
                </div>
              </div>

              {/* Summary */}
              <Card className="border-app-border bg-app-card">
                <CardContent className="p-4 space-y-2">
                  <h3 className="font-semibold text-app-foreground">Riepilogo</h3>
                  <div className="text-sm space-y-1">
                    <p className="text-app-muted-foreground">Nome: <span className="text-app-foreground">{firstName} {lastName}</span></p>
                    <p className="text-app-muted-foreground">Specializzazioni: <span className="text-app-foreground">{specializations.join(', ') || '—'}</span></p>
                    <p className="text-app-muted-foreground">Città: <span className="text-app-foreground">{locationCity || '—'}</span></p>
                    <p className="text-app-muted-foreground">Tariffa: <span className="text-app-foreground">{hourlyRate ? `€${hourlyRate}/h` : '—'}</span></p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-app-background/95 backdrop-blur border-t border-app-border">
        <div className="flex gap-3 max-w-lg mx-auto">
          {step > 1 && (
            <Button variant="outline" onClick={handleBack} className="border-app-border text-app-foreground hover:bg-app-muted">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Indietro
            </Button>
          )}
          {step < totalSteps ? (
            <Button onClick={handleNext} disabled={!canProceed} className="flex-1 bg-app-accent text-app-accent-foreground hover:bg-app-accent/90">
              Continua
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleComplete} disabled={isSubmitting} className="flex-1 bg-app-accent text-app-accent-foreground hover:bg-app-accent/90">
              {isSubmitting ? 'Salvataggio...' : 'Completa profilo'}
              <Check className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default PTOnboardingPage;
