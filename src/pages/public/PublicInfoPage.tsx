import { ReactNode } from 'react';
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
  children?: ReactNode;
};

export function PublicInfoPage({
  title,
  eyebrow,
  lead,
  paragraphs = [],
  bullets = [],
  ctaLabel = 'Inizia ora',
  ctaTo = '/auth?mode=signup',
  children,
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

          {children}

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
      title="Paghi in base agli atleti"
      lead="Il Personal Trainer paga Livelapp in base a quanti atleti attivi gestisce. Fino a 5 è gratis."
      paragraphs={[
        'Non è l’atleta a pagare la piattaforma: sei tu, in base al roster. I pacchetti che vendi ai tuoi atleti restano un flusso separato.',
        'Stripe verrà collegato a breve. Nel frattempo puoi registrarti e usare Starter.',
      ]}
      bullets={[
        'Starter — fino a 5 atleti: 0 € / mese',
        'Growth — da 6 a 20 atleti: 19,90 € / mese',
        'Pro — da 21 a 50 atleti: 49,90 € / mese',
        'Unlimited — da 51 atleti in poi: 99,90 € / mese',
        '7 giorni di grazia se un rinnovo fallisce, poi account in sola lettura su nuovi atleti',
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
        'I prezzi? Il PT paga in base agli atleti attivi (fino a 5 gratis).',
        'Come collego un atleta? Via invito o richiesta di connessione.',
      ]}
      ctaLabel="Vedi i prezzi"
      ctaTo="/pricing"
    />
  );
}

function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8 space-y-3 text-muted-foreground leading-relaxed break-words">
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

const privacyEmail = 'paolo.baldassare@gmail.com';

function PrivacyContact() {
  return <a href={`mailto:${privacyEmail}`} className="text-primary underline underline-offset-4 break-all">{privacyEmail}</a>;
}

export function PrivacyPage() {
  return (
    <PublicInfoPage
      eyebrow="Legale"
      title="Informativa privacy LivelAPP"
      lead="Informativa sul trattamento dei dati personali ai sensi dell’articolo 13 del Regolamento (UE) 2016/679 (GDPR), relativa al sito e all’app LivelAPP."
      ctaLabel="Elimina il tuo account"
      ctaTo="/elimina-account"
    >
      <p className="mt-4 text-sm text-muted-foreground">Ultimo aggiornamento: <time dateTime="2026-10-15">15 ottobre 2026</time></p>

      <LegalSection title="1. Titolare del trattamento">
        <p>Il titolare del trattamento e sviluppatore di LivelAPP è <strong className="text-foreground">LEG S.R.L.</strong>. Per informazioni sulla privacy, esercitare i tuoi diritti o richiedere la cancellazione dei dati, scrivi a <PrivacyContact />.</p>
      </LegalSection>

      <LegalSection title="2. Dati personali raccolti">
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Dati dell’account:</strong> nome, email e, se forniti, telefono, data di nascita e genere.</li>
          <li><strong>Allenamento e progressi:</strong> schede, esercizi, serie, ripetizioni, carichi, peso corporeo e misurazioni inseriti per seguire l’attività e i progressi.</li>
          <li><strong>Contenuti caricati:</strong> foto e documenti che scegli di caricare.</li>
          <li><strong>Comunicazioni:</strong> messaggi e contenuti scambiati nelle chat tra Personal Trainer e atleti e nelle conversazioni a cui partecipi.</li>
          <li><strong>Posizione approssimativa e precisa:</strong> solo quando utilizzi Scopri o cerchi eventi e gruppi vicini, con richiesta del permesso al momento dell’utilizzo.</li>
          <li><strong>Dati tecnici e di utilizzo:</strong> informazioni necessarie al funzionamento, come indirizzo IP, dispositivo, browser, sessione e registri tecnici di accesso ed errore.</li>
        </ul>
        <p>I dati provengono da te, dall’utilizzo del servizio e, per le schede e le informazioni di coaching, dai Personal Trainer con cui sei collegato. Foto, documenti e misurazioni possono contenere informazioni sulla salute: evita di caricare informazioni non necessarie.</p>
      </LegalSection>

      <LegalSection title="3. Finalità e basi giuridiche">
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Erogazione del servizio — articolo 6, paragrafo 1, lettera b, GDPR:</strong> creazione e gestione dell’account, schede e progressi, caricamento di contenuti, chat e organizzazione delle attività, per eseguire il contratto o le misure precontrattuali richieste.</li>
          <li><strong>Ricerca nelle vicinanze — articolo 6, paragrafo 1, lettera a, GDPR:</strong> uso della posizione sulla base del tuo consenso. Puoi negare o revocare il permesso nelle impostazioni del dispositivo o del browser; la ricerca basata sulla tua posizione non sarà disponibile, ma potrai continuare a usare le altre funzioni.</li>
          <li><strong>Obblighi di legge — articolo 6, paragrafo 1, lettera c, GDPR:</strong> adempimenti normativi e risposte a richieste legittime delle autorità, inclusi gli obblighi fiscali ove applicabili.</li>
          <li><strong>Sicurezza — articolo 6, paragrafo 1, lettera f, GDPR:</strong> prevenzione di abusi e accessi non autorizzati, tutela del servizio e gestione degli incidenti, sulla base del legittimo interesse del titolare, nel rispetto dei tuoi diritti e delle tue libertà.</li>
        </ul>
        <p>Qualora i contenuti o le misurazioni costituiscano dati relativi alla salute, il loro trattamento richiede anche una condizione prevista dall’articolo 9 GDPR, in particolare il tuo consenso esplicito ai sensi dell’articolo 9, paragrafo 2, lettera a. Il solo utilizzo dell’app non equivale a consenso esplicito al trattamento di dati sanitari.</p>
        <p>Il conferimento dei dati necessari all’account e al servizio è richiesto per poterlo erogare. Gli altri dati sono facoltativi; non fornirli può limitare le sole funzioni che ne dipendono. LivelAPP non utilizza i dati per pubblicità né per decisioni esclusivamente automatizzate che producano effetti giuridici o analogamente significativi.</p>
      </LegalSection>

      <LegalSection title="4. Posizione e permessi del dispositivo">
        <p>La posizione viene utilizzata solo su tua iniziativa per Scopri, eventi e gruppi vicini. Il permesso viene richiesto al momento, non è obbligatorio per creare un account e non viene usato per monitorarti continuativamente in background o per pubblicità. La precisione dipende dal dispositivo e dal permesso che concedi.</p>
        <p>Le foto e i documenti sono acquisiti quando scegli di caricarli. Eventuali permessi per accedere a funzionalità del dispositivo sono richiesti in relazione all’azione scelta e sono gestibili nelle impostazioni del dispositivo.</p>
      </LegalSection>

      <LegalSection title="5. Condivisione tra utenti e destinatari">
        <p>I dati dell’atleta necessari al coaching, comprese schede, progressi, foto e documenti condivisi, sono visibili ai propri Personal Trainer collegati. Se sei collegato a più Personal Trainer, i dati di coaching condivisi sono accessibili ai Professionisti autorizzati dalla relazione di collegamento. I messaggi sono visibili ai destinatari e ai partecipanti della relativa conversazione. I contenuti che scegli di rendere pubblici sono visibili secondo la loro destinazione.</p>
        <p>Il personale autorizzato del titolare può accedere ai dati nella misura necessaria all’assistenza, alla gestione e alla sicurezza del servizio. I dati possono essere comunicati alle autorità quando richiesto dalla legge.</p>
        <p><strong>LivelAPP non contiene pubblicità, non vende i dati personali e non li condivide con terzi per finalità di marketing.</strong></p>
      </LegalSection>

      <LegalSection title="6. Fornitori, infrastruttura e sicurezza">
        <p>Ci avvaliamo di fornitori tecnici che operano come responsabili del trattamento, ove applicabile, sulla base di accordi conformi all’articolo 28 GDPR. Hosting dei dati e database sono su infrastruttura cloud nell’Unione europea (Supabase, regione eu-central-1). Lovable fornisce l’hosting del sito.</p>
        <p>I dati sono cifrati in transito tramite HTTPS/TLS. L’accesso è limitato agli utenti e al personale autorizzati in funzione del ruolo e delle necessità del servizio.</p>
        <p>Qualora le attività dei fornitori comportino trasferimenti di dati fuori dallo Spazio economico europeo, questi devono avvenire nel rispetto del capo V GDPR, sulla base di una decisione di adeguatezza o di garanzie appropriate, come le clausole contrattuali standard. Puoi richiedere informazioni sui fornitori e sulle garanzie applicabili al contatto privacy.</p>
      </LegalSection>

      <LegalSection title="7. Conservazione dei dati">
        <p>I dati sono conservati per la durata dell’account e per le finalità del servizio. Alla cancellazione dell’account, i dati personali associati vengono eliminati entro 30 giorni, salvo gli obblighi di conservazione previsti dalla legge.</p>
        <p>Gli eventuali dati da conservare per obblighi di legge, ad esempio documenti fiscali relativi a pagamenti, sono conservati solo per il periodo previsto dalla normativa applicabile e non sono utilizzati per altre finalità incompatibili.</p>
      </LegalSection>

      <LegalSection title="8. I tuoi diritti">
        <p>Nei limiti e alle condizioni previsti dagli articoli 15–22 GDPR, puoi richiedere:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>accesso ai tuoi dati e una copia delle informazioni trattate;</li>
          <li>rettifica dei dati inesatti e integrazione di quelli incompleti;</li>
          <li>cancellazione e limitazione del trattamento;</li>
          <li>portabilità dei dati nei casi previsti dal GDPR;</li>
          <li>opposizione ai trattamenti fondati sul legittimo interesse;</li>
          <li>revoca del consenso in qualsiasi momento, senza pregiudicare la liceità del trattamento effettuato prima della revoca.</li>
        </ul>
        <p>Per esercitare i diritti scrivi a <PrivacyContact />, preferibilmente dall’indirizzo associato all’account. Potremmo chiedere le sole informazioni necessarie a verificare la tua identità. Rispondiamo entro un mese dal ricevimento della richiesta; nei casi complessi previsti dal GDPR il termine può essere prorogato fino a ulteriori due mesi, informandoti entro il primo mese.</p>
        <p>Puoi inoltre presentare un reclamo al Garante per la protezione dei dati personali (<a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-4">www.garanteprivacy.it</a>) o all’autorità di controllo competente, senza rinunciare agli altri mezzi di tutela.</p>
      </LegalSection>

      <LegalSection title="9. Minori">
        <p>LivelAPP è destinata esclusivamente a persone maggiorenni, di almeno 18 anni. Il servizio non è rivolto ai minori. Se ritieni che un minore abbia fornito dati personali, contatta il titolare per le opportune verifiche e la cancellazione.</p>
      </LegalSection>

      <LegalSection title="10. Eliminazione dell’account">
        <p>Puoi eliminare l’account dall’app oppure richiederne la cancellazione via email senza accedere all’app. Consulta la pagina <Link to="/elimina-account" className="text-primary underline underline-offset-4">Elimina il tuo account LivelAPP</Link> per le istruzioni, i dati eliminati e le eventuali conservazioni obbligatorie. Disinstallare l’app non elimina l’account.</p>
      </LegalSection>
    </PublicInfoPage>
  );
}

export function DeleteAccountPage() {
  return (
    <PublicInfoPage
      eyebrow="Privacy e account"
      title="Elimina il tuo account LivelAPP"
      lead="LivelAPP — sviluppatore e titolare del trattamento: LEG S.R.L. Puoi richiedere l’eliminazione del tuo account e dei dati associati anche senza usare l’app."
      ctaLabel="Richiedi eliminazione via email"
      ctaTo={`mailto:${privacyEmail}?subject=Eliminazione%20account%20LivelAPP`}
    >
      <p className="mt-4 text-sm text-muted-foreground">Ultimo aggiornamento: <time dateTime="2026-10-15">15 ottobre 2026</time></p>
      <LegalSection title="Dall’app, per atleta e Personal Trainer">
        <ol className="list-decimal pl-5 space-y-2">
          <li>Accedi al tuo account LivelAPP.</li>
          <li>Apri <strong>Impostazioni</strong> e raggiungi la sezione <strong>Zona pericolosa</strong>.</li>
          <li>Seleziona <strong>Elimina account</strong> e conferma la richiesta seguendo le indicazioni mostrate.</li>
        </ol>
        <p>La procedura è disponibile sia per gli atleti sia per i Personal Trainer. La cancellazione è definitiva: perderai l’accesso all’account e ai dati eliminati. Disinstallare l’app o uscire dall’account non equivale a cancellarlo.</p>
      </LegalSection>
      <LegalSection title="Senza app o senza accesso all’account">
        <p>Invia un’email a <PrivacyContact /> dall’indirizzo associato all’account, con oggetto <strong className="text-foreground">Eliminazione account LivelAPP</strong>, indicando che desideri eliminare l’account e i dati associati.</p>
        <p>Non inviare la tua password. Per tutelare i tuoi dati, potremmo richiedere una verifica dell’identità limitata alle informazioni necessarie. Se non hai più accesso all’indirizzo associato, contattaci allo stesso recapito per concordare la verifica.</p>
        <p>La richiesta viene evasa entro <strong className="text-foreground">30 giorni</strong>. Non è necessario reinstallare l’app per richiedere la cancellazione.</p>
      </LegalSection>
      <LegalSection title="Quali dati vengono eliminati">
        <p>Alla cancellazione vengono eliminati entro 30 giorni i dati personali associati all’account:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>profilo e dati dell’account;</li>
          <li>dati di allenamento e progressi, comprese schede, serie, peso corporeo e misurazioni;</li>
          <li>foto e documenti caricati;</li>
          <li>messaggi e relativi contenuti associati all’account;</li>
          <li>eventuali dati di posizione associati all’account.</li>
        </ul>
      </LegalSection>
      <LegalSection title="Quali dati possono essere conservati">
        <p>Sono conservati soltanto i dati richiesti per obblighi di legge, ad esempio i dati fiscali relativi a pagamenti, per il periodo previsto dalla normativa applicabile. Questa eccezione non consente di mantenere attivo il tuo profilo né di utilizzare i dati per marketing.</p>
      </LegalSection>
      <LegalSection title="Informazioni sulla privacy">
        <p>Per conoscere finalità, basi giuridiche, destinatari e diritti, consulta l’<Link to="/privacy" className="text-primary underline underline-offset-4">Informativa privacy LivelAPP</Link>. Per domande sulla cancellazione scrivi a <PrivacyContact />.</p>
      </LegalSection>
    </PublicInfoPage>
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
