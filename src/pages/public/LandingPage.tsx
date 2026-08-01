import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Calendar,
  Check,
  ChevronRight,
  CreditCard,
  Download,
  Dumbbell,
  MessageSquare,
  Smartphone,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { PWAUpdatePrompt } from '@/components/pwa/PWAUpdatePrompt';
import { supabase } from '@/integrations/supabase/client';
import { normalizeBlogPost, BLOG_POST_TYPE_LABELS, type BlogPost } from '@/types/database';
import { cn } from '@/lib/utils';

import ptDashboard from '@/assets/marketing/pt-athletes-dashboard.png';
import ptBuilder from '@/assets/marketing/pt-template-builder.png';
import atletaPlayer from '@/assets/marketing/atleta-workout-player.png';

// =====================================================
// LANDING — design da Google Stitch (MCP)
// project: projects/8950936584627667537
// =====================================================

const features = [
  {
    icon: Users,
    title: 'Gestione Atleti',
    description: 'Database completo, profili dettagliati e storico attività in tempo reale.',
  },
  {
    icon: Dumbbell,
    title: 'Programmi',
    description: 'Crea allenamenti personalizzati con protocolli, set e libreria esercizi.',
  },
  {
    icon: Calendar,
    title: 'Calendario',
    description: 'Sincronizza sessioni e workout. Niente più appuntamenti persi.',
  },
  {
    icon: MessageSquare,
    title: 'Chat',
    description: 'Comunicazione diretta e protetta: addio WhatsApp di lavoro.',
  },
  {
    icon: TrendingUp,
    title: 'Progressi',
    description: 'Analisi di performance, volume e andamento nel tempo.',
  },
  {
    icon: CreditCard,
    title: 'Pagamenti',
    description: 'Abbonamenti e incassi senza burocrazia.',
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.45 },
};

function excerptFromHtml(html: string, max = 120): string {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}…`;
}

export function LandingPage() {
  const { isInstallable, isInstalled, isIOS, install } = useInstallPrompt();
  const showInstallButton = (isInstallable || isIOS) && !isInstalled;

  const { data: blogPosts = [] } = useQuery({
    queryKey: ['public-landing-blog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(3);
      if (error) throw error;
      return ((data || []) as Record<string, unknown>[]).map(normalizeBlogPost);
    },
    staleTime: 60_000,
  });

  const handleInstall = () => {
    if (isIOS) window.location.href = '/install';
    else install();
  };

  return (
    <div className="flex flex-col bg-[hsl(220_33%_98%)] text-[hsl(222_33%_12%)] font-[Manrope,system-ui,sans-serif]">
      <PWAUpdatePrompt />

      {/* Hero — Stitch structure */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(359_79%_55%/0.12),transparent_55%)]" />
        <div className="container-wide relative py-16 md:py-24 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <motion.div {...fadeUp} className="flex flex-col gap-6">
              <p className="font-[Space_Grotesk,system-ui,sans-serif] text-3xl font-bold tracking-tight md:text-4xl">
                Livelapp
              </p>
              <h1 className="font-[Space_Grotesk,system-ui,sans-serif] text-4xl font-bold leading-[1.08] tracking-tight md:text-5xl lg:text-6xl">
                Il tuo ecosistema che sostituisce{' '}
                <span className="text-primary">tutto il resto</span>
              </h1>
              <p className="max-w-xl text-lg text-muted-foreground md:text-xl">
                Dimentica Excel, WhatsApp e i pagamenti dispersi. Gestisci atleti, allenamenti,
                calendario e chat in un&apos;unica piattaforma.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button size="lg" className="rounded-xl h-12 px-8" asChild>
                  <Link to="/auth?mode=signup">
                    Inizia gratis
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="rounded-xl h-12 px-8" asChild>
                  <Link to="/pts">Trova un Professionista</Link>
                </Button>
                {showInstallButton && (
                  <Button size="lg" variant="secondary" className="rounded-xl h-12 gap-2" onClick={handleInstall}>
                    <Download className="h-4 w-4" />
                    Installa
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                <span className="inline-flex h-2 w-2 rounded-full bg-primary" />
                Scelto dai PT italiani
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 32 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55 }}
              className="relative"
            >
              <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-primary/10 blur-3xl" />
              <div className="overflow-hidden rounded-2xl border border-border/60 bg-background shadow-2xl shadow-primary/10">
                <div className="flex items-center gap-1.5 border-b border-border/50 bg-muted/40 px-3 py-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                  <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                  <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                  <span className="ml-3 text-[11px] text-muted-foreground">Dashboard PT · Atleti</span>
                </div>
                <img
                  src={ptDashboard}
                  alt="Dashboard PT Livelapp con lista atleti"
                  className="w-full object-cover object-top"
                  loading="eager"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="funzionalita" className="bg-muted/40 py-20 md:py-24">
        <div className="container-wide">
          <motion.div {...fadeUp} className="mb-12 text-center">
            <h2 className="font-[Space_Grotesk,system-ui,sans-serif] text-3xl font-bold md:text-4xl">
              Tutto in un&apos;unica piattaforma
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              Strumenti potenti per lavorare meglio — senza saltare tra app.
            </p>
          </motion.div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
                whileHover={{ y: -6 }}
                className="group rounded-3xl border border-border/50 bg-background p-7 shadow-sm transition-shadow hover:shadow-lg"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="font-[Space_Grotesk,system-ui,sans-serif] text-xl font-semibold">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
                <div className="mt-6 h-1 w-0 bg-primary transition-all duration-300 group-hover:w-full" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* PT split */}
      <section className="py-20 md:py-24">
        <div className="container-wide">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <motion.div {...fadeUp} className="order-2 lg:order-1">
              <div className="overflow-hidden rounded-2xl border border-border/60 shadow-xl">
                <img
                  src={ptBuilder}
                  alt="Builder schede allenamento Livelapp"
                  className="w-full object-cover"
                  loading="lazy"
                />
              </div>
            </motion.div>
            <motion.div {...fadeUp} className="order-1 lg:order-2">
              <span className="text-xs font-bold uppercase tracking-widest text-primary">
                Per Personal Trainer
              </span>
              <h2 className="mt-3 font-[Space_Grotesk,system-ui,sans-serif] text-3xl font-bold md:text-4xl">
                L&apos;unico assistente che non dorme mai
              </h2>
              <ul className="mt-6 space-y-3">
                {[
                  'Schede e protocolli in pochi tap',
                  'Dashboard web + app mobile',
                  'Chat, pagamenti e profilo pubblico',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm md:text-base">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Button className="mt-8 rounded-xl" asChild>
                <Link to="/auth?mode=signup">Registrati come PT</Link>
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Athlete dark split */}
      <section className="bg-[hsl(222_33%_12%)] py-20 text-white md:py-24">
        <div className="container-wide">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <motion.div {...fadeUp}>
              <span className="text-xs font-bold uppercase tracking-widest text-[hsl(75_100%_50%)]">
                Per Atleti
              </span>
              <h2 className="mt-3 font-[Space_Grotesk,system-ui,sans-serif] text-3xl font-bold md:text-4xl">
                L&apos;allenamento al massimo livello
              </h2>
              <p className="mt-4 max-w-lg text-white/70">
                App mobile immersiva: segui i programmi, registra i set e resta in contatto col tuo PT.
              </p>
              <div className="mt-8 grid max-w-md grid-cols-2 gap-3">
                <div className="rounded-xl bg-white/10 p-4">
                  <p className="text-2xl font-bold text-[hsl(75_100%_50%)]">Guidato</p>
                  <p className="text-sm text-white/60">Player set-by-set</p>
                </div>
                <div className="rounded-xl bg-white/10 p-4">
                  <p className="text-2xl font-bold text-[hsl(75_100%_50%)]">Sempre</p>
                  <p className="text-sm text-white/60">Collegato al PT</p>
                </div>
              </div>
              <Button
                className="mt-8 rounded-xl bg-[hsl(75_100%_50%)] text-[hsl(222_33%_12%)] hover:bg-[hsl(75_100%_45%)]"
                asChild
              >
                <Link to="/auth?mode=signup">Registrati come Atleta</Link>
              </Button>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="flex justify-center"
            >
              <div className="relative w-full max-w-[280px] sm:max-w-[320px]">
                <div className="absolute inset-0 rounded-full bg-primary/30 blur-3xl" />
                <div className="relative overflow-hidden rounded-[2.5rem] border-[6px] border-white/20 shadow-2xl">
                  <img
                    src={atletaPlayer}
                    alt="Player allenamento atleta Livelapp"
                    className="w-full object-cover"
                    loading="lazy"
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Blog */}
      <section id="blog" className="py-20 md:py-24">
        <div className="container-wide">
          <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h2 className="font-[Space_Grotesk,system-ui,sans-serif] text-3xl font-bold md:text-4xl">
                Dal blog
              </h2>
              <p className="mt-2 text-muted-foreground">
                Consigli, curiosità e aggiornamenti dal mondo Livelapp.
              </p>
            </div>
            <Button variant="ghost" className="self-start text-primary" asChild>
              <Link to="/blog">
                Vedi tutti
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          {blogPosts.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-3">
              {blogPosts.map((post: BlogPost, i) => (
                <motion.article
                  key={post.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06 }}
                >
                  <Link
                    to={post.slug ? `/blog/${post.slug}` : `/blog/${post.id}`}
                    className="group block"
                  >
                    <div className="mb-4 aspect-[16/10] overflow-hidden rounded-2xl bg-muted">
                      {post.cover_image_url ? (
                        <img
                          src={post.cover_image_url}
                          alt=""
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-primary/5 text-primary/40">
                          <Dumbbell className="h-10 w-10" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs font-bold uppercase tracking-wider text-primary">
                      {BLOG_POST_TYPE_LABELS[post.post_type]}
                    </p>
                    <h3 className="mt-2 font-[Space_Grotesk,system-ui,sans-serif] text-xl font-semibold leading-snug transition-colors group-hover:text-primary">
                      {post.title}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {excerptFromHtml(post.content)}
                    </p>
                  </Link>
                </motion.article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center">
              <p className="text-muted-foreground">
                Presto nuovi articoli. Nel frattempo esplora i Professionisti.
              </p>
              <Button className="mt-4 rounded-xl" variant="outline" asChild>
                <Link to="/pts">Trova un PT</Link>
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Final CTA */}
      <section className="pb-28 pt-4 md:pb-20">
        <div className="container-wide">
          <motion.div
            {...fadeUp}
            className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background px-6 py-12 text-center md:px-12"
          >
            <h2 className="font-[Space_Grotesk,system-ui,sans-serif] text-3xl font-bold md:text-4xl">
              Pronto a rivoluzionare il tuo business?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              Unisciti ai Personal Trainer che gestiscono atleti, schede e pagamenti con Livelapp.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button size="lg" className="rounded-xl" asChild>
                <Link to="/auth?mode=signup">Inizia gratuitamente</Link>
              </Button>
              <Button size="lg" variant="outline" className="rounded-xl" asChild>
                <Link to="/contact">Contattaci</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {showInstallButton && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:hidden">
          <div className="flex items-center gap-3 rounded-2xl bg-primary p-4 text-primary-foreground shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
              <Smartphone className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold">Installa Livelapp</p>
              <p className="text-xs text-primary-foreground/80">Accesso rapido dalla home</p>
            </div>
            <Button
              size="sm"
              onClick={handleInstall}
              className={cn('shrink-0 bg-white text-primary hover:bg-white/90')}
            >
              Installa
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default LandingPage;
