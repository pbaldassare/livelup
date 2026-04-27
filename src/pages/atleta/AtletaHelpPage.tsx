import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Search, 
  MessageSquare, 
  Mail, 
  HelpCircle,
  Dumbbell,
  CreditCard,
  User,
  Shield,
  Smartphone,
  Send,
  Loader2
} from 'lucide-react';

// =====================================================
// ATLETA HELP PAGE - FAQ e contatto supporto
// =====================================================

const faqCategories = [
  {
    id: 'getting-started',
    title: 'Iniziare',
    icon: Smartphone,
    questions: [
      {
        q: 'Come trovo un Personal Trainer?',
        a: 'Vai nella sezione "Scopri" dalla barra di navigazione. Puoi cercare PT nella tua zona, filtrare per specializzazione, prezzo e vedere le recensioni di altri atleti.'
      },
      {
        q: 'Come mi collego a un PT?',
        a: 'Una volta trovato un PT che ti interessa, visita il suo profilo e clicca su "Richiedi collegamento". Il PT riceverà una notifica e potrà accettare la tua richiesta.'
      },
      {
        q: 'Come installo l\'app sul mio telefono?',
        a: 'LIVEL APP è una Progressive Web App (PWA). Su iPhone, apri Safari, tocca l\'icona di condivisione e seleziona "Aggiungi a Home". Su Android, il browser ti proporrà automaticamente l\'installazione.'
      },
    ]
  },
  {
    id: 'workouts',
    title: 'Allenamenti',
    icon: Dumbbell,
    questions: [
      {
        q: 'Come visualizzo le mie schede di allenamento?',
        a: 'Le tue schede sono nella sezione "Workout" accessibile dalla barra di navigazione. Troverai sia gli allenamenti attivi che quelli completati.'
      },
      {
        q: 'Come registro un allenamento completato?',
        a: 'Apri la scheda di allenamento e segui gli esercizi. Per ogni esercizio puoi segnare le serie completate, il peso usato e le ripetizioni. Al termine, clicca "Completa Workout".'
      },
      {
        q: 'Posso vedere i video degli esercizi?',
        a: 'Sì! Ogni esercizio può avere un video dimostrativo. Clicca sull\'esercizio per vedere il video e le istruzioni dettagliate.'
      },
    ]
  },
  {
    id: 'account',
    title: 'Account e Profilo',
    icon: User,
    questions: [
      {
        q: 'Come modifico i miei dati personali?',
        a: 'Vai nel tuo Profilo, clicca su "Modifica" nella sezione "I tuoi dati". Puoi aggiornare nome, cognome e numero di telefono.'
      },
      {
        q: 'Come cambio la foto profilo?',
        a: 'Nel tuo Profilo, tocca la tua foto attuale o l\'avatar con le iniziali. Si aprirà un selettore per scegliere una nuova immagine dalla tua galleria.'
      },
      {
        q: 'Come elimino il mio account?',
        a: 'Vai in Impostazioni > Zona Pericolosa > Elimina Account. Dovrai confermare inserendo la tua email. Attenzione: questa azione è irreversibile.'
      },
    ]
  },
  {
    id: 'payments',
    title: 'Abbonamenti e Pagamenti',
    icon: CreditCard,
    questions: [
      {
        q: 'Come funzionano gli abbonamenti con il PT?',
        a: 'Il tuo PT può offrirti diversi pacchetti (mensili, trimestrali, a sessioni). Puoi visualizzare e gestire i tuoi abbonamenti dalla sezione dedicata nel profilo.'
      },
      {
        q: 'Come vedo le sessioni rimanenti?',
        a: 'Se hai un pacchetto a sessioni, il conteggio delle sessioni usate e rimanenti è visibile nella sezione Abbonamenti del tuo profilo.'
      },
    ]
  },
  {
    id: 'privacy',
    title: 'Privacy e Sicurezza',
    icon: Shield,
    questions: [
      {
        q: 'Chi può vedere i miei dati?',
        a: 'I tuoi dati personali sono visibili solo a te e al PT con cui sei collegato. Le tue foto e statistiche non sono pubbliche.'
      },
      {
        q: 'Come gestisco le notifiche push?',
        a: 'Vai in Impostazioni > Privacy e usa l\'interruttore per attivare o disattivare le notifiche push.'
      },
    ]
  },
];

export function AtletaHelpPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showContactSheet, setShowContactSheet] = useState(false);
  const [contactForm, setContactForm] = useState({ subject: '', message: '' });
  const [isSending, setIsSending] = useState(false);

  const filteredCategories = faqCategories.map(cat => ({
    ...cat,
    questions: cat.questions.filter(
      q => q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
           q.a.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(cat => cat.questions.length > 0);

  const handleSendMessage = async () => {
    if (!contactForm.subject.trim() || !contactForm.message.trim()) {
      toast.error('Compila tutti i campi');
      return;
    }

    setIsSending(true);
    try {
      const { error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user?.id,
          subject: contactForm.subject,
          description: contactForm.message,
          category: 'general',
          priority: 'medium',
        });

      if (error) throw error;

      toast.success('Messaggio inviato! Ti risponderemo presto.');
      setShowContactSheet(false);
      setContactForm({ subject: '', message: '' });
    } catch (error: any) {
      toast.error(error.message || 'Errore durante l\'invio');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-app-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-app-background/95 backdrop-blur-sm border-b border-app-border">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 hover:bg-app-muted rounded-full transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-app-foreground" />
            </button>
            <h1 className="text-xl font-bold text-app-foreground">Aiuto</h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowContactSheet(true)}
            className="text-app-accent hover:text-app-accent hover:bg-app-accent/10"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Contattaci
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-app-muted-foreground" />
          <Input
            placeholder="Cerca nelle FAQ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-app-muted border-app-border text-app-foreground placeholder:text-app-muted-foreground"
          />
        </div>
      </div>

      {/* Quick Contact */}
      <div className="px-4 mb-6">
        <div className="bg-app-card rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-app-accent/20 rounded-full flex items-center justify-center">
              <HelpCircle className="h-5 w-5 text-app-accent" />
            </div>
            <div>
              <h3 className="font-semibold text-app-foreground">Hai bisogno di aiuto?</h3>
              <p className="text-sm text-app-muted-foreground">Siamo qui per te</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowContactSheet(true)}
              className="flex-1 bg-app-muted border-app-border text-app-foreground hover:bg-app-muted/80"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Apri ticket
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = 'mailto:supporto@livellapp.com'}
              className="flex-1 bg-app-muted border-app-border text-app-foreground hover:bg-app-muted/80"
            >
              <Mail className="h-4 w-4 mr-2" />
              Email
            </Button>
          </div>
        </div>
      </div>

      {/* FAQ Categories */}
      <div className="px-4 space-y-4">
        <h2 className="text-sm font-semibold text-app-muted-foreground uppercase tracking-wider">
          Domande Frequenti
        </h2>
        
        {filteredCategories.length === 0 ? (
          <div className="text-center py-8 text-app-muted-foreground">
            <p>Nessun risultato per "{searchQuery}"</p>
          </div>
        ) : (
          filteredCategories.map((category) => (
            <div key={category.id} className="bg-app-card rounded-xl overflow-hidden">
              <div className="flex items-center gap-3 p-4 border-b border-app-border">
                <category.icon className="h-5 w-5 text-app-accent" />
                <h3 className="font-semibold text-app-foreground">{category.title}</h3>
              </div>
              <Accordion type="single" collapsible className="px-2">
                {category.questions.map((faq, idx) => (
                  <AccordionItem 
                    key={idx} 
                    value={`${category.id}-${idx}`}
                    className="border-b border-app-border last:border-0"
                  >
                    <AccordionTrigger className="text-left text-app-foreground hover:no-underline py-4 px-2">
                      {faq.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-app-muted-foreground px-2 pb-4">
                      {faq.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))
        )}
      </div>

      {/* Contact Sheet */}
      <Sheet open={showContactSheet} onOpenChange={setShowContactSheet}>
        <SheetContent side="bottom" className="h-auto max-h-[80vh] bg-app-background border-app-border">
          <SheetHeader>
            <SheetTitle className="text-app-foreground">Contatta il supporto</SheetTitle>
          </SheetHeader>
          <div className="py-6 space-y-4">
            <div>
              <Label htmlFor="subject" className="text-app-foreground">Oggetto</Label>
              <Input
                id="subject"
                value={contactForm.subject}
                onChange={(e) => setContactForm(f => ({ ...f, subject: e.target.value }))}
                placeholder="Come possiamo aiutarti?"
                className="mt-1 bg-app-muted border-app-border text-app-foreground placeholder:text-app-muted-foreground"
              />
            </div>
            <div>
              <Label htmlFor="message" className="text-app-foreground">Messaggio</Label>
              <Textarea
                id="message"
                value={contactForm.message}
                onChange={(e) => setContactForm(f => ({ ...f, message: e.target.value }))}
                placeholder="Descrivi il tuo problema o la tua domanda..."
                rows={5}
                className="mt-1 bg-app-muted border-app-border text-app-foreground placeholder:text-app-muted-foreground resize-none"
              />
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={isSending}
              className="w-full bg-app-accent text-app-accent-foreground hover:bg-app-accent/90"
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Invio in corso...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Invia messaggio
                </>
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default AtletaHelpPage;
