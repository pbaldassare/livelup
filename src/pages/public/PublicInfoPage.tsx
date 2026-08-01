import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PublicLayout } from '@/components/layouts/PublicLayout';

type PublicInfoPageProps = {
  title: string;
  eyebrow?: string;
  lead: string;
  paragraphs?: string[];
  bullets?: string[];
  ctaLabel?: string;
  ctaTo?: string;
};

export function PublicInfoPage({
  title,
  eyebrow,
  lead,
  paragraphs = [],
  bullets = [],
  ctaLabel = 'Inizia ora',
  ctaTo = '/auth?mode=signup',
}: PublicInfoPageProps) {
  return (
    <PublicLayout>
      <div className="container-wide py-12 md:py-20">
        <div className="mx-auto max-w-3xl">
          {eyebrow && (
            <p className="text-xs font-bold uppercase tracking-widest text-primary">{eyebrow}</p>
          )}
          <h1 className="mt-2 font-[Space_Grotesk,system-ui,sans-serif] text-3xl font-bold md:text-5xl">
            {title}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">{lead}</p>

          {paragraphs.map((p) => (
            <p key={p.slice(0, 40)} className="mt-4 text-muted-foreground leading-relaxed">
              {p}
            </p>
          ))}

          {bullets.length > 0 && (
            <ul className="mt-6 space-y-2 text-muted-foreground">
              {bullets.map((b) => (
                <li key={b} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" className="rounded-xl" asChild>
              <Link to={ctaTo}>
                {ctaLabel}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="rounded-xl" asChild>
              <Link to="/">Torna alla home</Link>
            </Button>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

export function AboutPage() {
  return (
    <PublicInfoPage
      eyebrow="Chi siamo"
      title="Livelapp, pensata per PT e atleti italiani"
      lead="Uniamo schede, chat, calendario e progressi in un’unica piattaforma fitness."
      paragraphs={[
        'Livelapp nasce per sostituire fogli Excel, chat sparse e strumenti scollegati. Il Personal Trainer gestisce gli atleti da web e da app; l’atleta si allena dalla PWA con player guidati e protocolli avanzati.',
        'Stiamo costruendo il prodotto insieme ai Professionisti: priorità a flussi reali, privacy e qualità dell’esperienza mobile.',
      ]}
      bullets={[
        'Ruoli chiari: Admin, PT, Atleta',
        'Schede, protocolli, chat e gruppi',
        'Profilo pubblico PT e discovery',
      ]}
    />
  );
}

export function PricingPage() {
  return (
    <PublicInfoPage
      eyebrow="Prezzi"
      title="Ancora da definire"
      lead="I piani saranno basati sul numero di atleti che un Personal Trainer gestisce."
      paragraphs={[
        'Stiamo definendo i pacchetti commerciali. L’idea è semplice: paghi in base alla dimensione del tuo roster — pochi atleti, piano più leggero; tanti atleti, piano proporzionato.',
        'Nel frattempo puoi registrarti e usare la piattaforma in anteprima. Ti aggiorneremo appena i prezzi ufficiali saranno online.',
      ]}
      bullets={[
        'Tariffazione legata al numero di atleti collegati',
        'Nessun listino definitivo al momento',
        'Contattaci se gestisci già molti atleti e vuoi un’anteprima',
      ]}
      ctaLabel="Registrati gratis"
      ctaTo="/auth?mode=signup"
    />
  );
}

export function HelpPage() {
  return (
    <PublicInfoPage
      eyebrow="Supporto"
      title="Centro assistenza"
      lead="Trova risposte rapide o contattaci per problemi su account, schede e app."
      paragraphs={[
        'Questa sezione è in aggiornamento. Per ora puoi scrivere dalla pagina Contatti oppure aprire un ticket dall’area autenticata quando disponibile.',
      ]}
      ctaLabel="Contattaci"
      ctaTo="/contact"
    />
  );
}

export function ContactPage() {
  return (
    <PublicInfoPage
      eyebrow="Contatti"
      title="Parliamone"
      lead="Hai domande su Livelapp, partnership o onboarding PT? Siamo qui."
      paragraphs={[
        'Scrivici dall’email del tuo account oppure registrati e usa l’assistenza in-app. Rispondiamo di norma entro pochi giorni lavorativi.',
        'Per segnalazioni tecniche indica browser, dispositivo e cosa stavi facendo.',
      ]}
      ctaLabel="Inizia ora"
    />
  );
}

export function FaqPage() {
  return (
    <PublicInfoPage
      eyebrow="FAQ"
      title="Domande frequenti"
      lead="Risposte sintetiche alle domande più comuni su Livelapp."
      bullets={[
        'Posso essere PT e atleta? No: i ruoli sono separati.',
        'L’app è installabile? Sì, come PWA da mobile.',
        'I prezzi? Ancora da definire, in base al numero di atleti del PT.',
        'Come collego un atleta? Via invito o richiesta di connessione.',
      ]}
      ctaLabel="Vedi i prezzi"
      ctaTo="/pricing"
    />
  );
}

export function PrivacyPage() {
  return (
    <PublicInfoPage
      eyebrow="Legale"
      title="Privacy"
      lead="Trattiamo i dati personali per erogare il servizio Livelapp, con misure di sicurezza e ruolo-based access."
      paragraphs={[
        'Questa è una pagina informativa generica. Il testo legale completo sarà pubblicato a breve. Per richieste privacy usa Contatti.',
      ]}
      ctaLabel="Contatti"
      ctaTo="/contact"
    />
  );
}

export function TermsPage() {
  return (
    <PublicInfoPage
      eyebrow="Legale"
      title="Termini di servizio"
      lead="Usando Livelapp accetti le condizioni d’uso della piattaforma."
      paragraphs={[
        'Pagina generica in attesa del testo legale definitivo. Continua a usare il servizio in modo corretto e rispettoso degli altri utenti.',
      ]}
    />
  );
}

export function CookiesPage() {
  return (
    <PublicInfoPage
      eyebrow="Legale"
      title="Cookie"
      lead="Usiamo cookie tecnici necessari al funzionamento e, dove previsto, strumenti di misurazione."
      paragraphs={[
        'Informativa cookie sintetica: i dettagli completi arriveranno a breve. Puoi gestire le preferenze del browser in qualsiasi momento.',
      ]}
    />
  );
}
