import { useState } from 'react';
import { 
  Shield, UserCog, Users, ChevronDown, ChevronRight, 
  ExternalLink, Map, LayoutDashboard, CreditCard, Receipt, 
  MessageSquare, Tag, HeadphonesIcon, Settings, Dumbbell,
  Calendar, FileText, Home, Search, Activity, BookOpen,
  Camera, Bell, HelpCircle, Globe, Smartphone, Monitor,
  ClipboardList, ScrollText, TicketIcon, UserCheck, Layers,
  MapPin, Eye, LogIn
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ROLE_ACCESS_MATRIX } from '@/types/roles';

// =====================================================
// ADMIN SITEMAP PAGE
// Gerarchia ruoli + mappa sezioni + tabella permessi
// =====================================================

const roles = [
  {
    name: 'Admin',
    icon: Shield,
    level: 1,
    color: 'bg-red-100 text-red-700 border-red-200',
    iconColor: 'text-red-600',
    description: 'Accesso totale alla piattaforma. Gestione PT, abbonamenti, pagamenti, supporto e configurazione globale.',
    capabilities: [
      'Gestione completa Personal Trainers (approva, sospendi, elimina)',
      'Gestione piani abbonamento e pagamenti',
      'Invio messaggi broadcast a tutti gli utenti',
      'Configurazione impostazioni piattaforma',
      'Gestione coupon e corsi',
      'Supporto tecnico e ticket',
      'Audit log e monitoraggio',
    ],
  },
  {
    name: 'Personal Trainer',
    icon: UserCog,
    level: 2,
    color: 'bg-teal-100 text-teal-700 border-teal-200',
    iconColor: 'text-teal-600',
    description: 'Dashboard web per gestione atleti + App mobile per operatività quotidiana. Due interfacce complementari.',
    capabilities: [
      'Dashboard web: gestione atleti, schede, calendario, pagamenti, blog',
      'App mobile: chat, calendario, assegnazione workout in mobilità',
      'Creazione e gestione pacchetti/abbonamenti per atleti',
      'Profilo pubblico con specializzazioni, galleria, recensioni',
      'Gestione disponibilità e prenotazioni',
      'Libreria contenuti (video, PDF, immagini)',
    ],
  },
  {
    name: 'Atleta',
    icon: Users,
    level: 2,
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    iconColor: 'text-blue-600',
    description: 'App mobile dedicata. Allenamenti, progressi, prenotazioni, chat con il proprio PT e scoperta nuovi professionisti.',
    capabilities: [
      'Visualizzazione e esecuzione workout assegnati',
      'Tracking progressi: peso, misure, foto, benessere',
      'Scoperta e connessione con Personal Trainers',
      'Chat diretta con il proprio PT',
      'Prenotazione sessioni e eventi',
      'Gestione abbonamenti PT e corsi',
      'Sistema gamification: badge e punti',
    ],
  },
];

interface SectionPage {
  name: string;
  path: string;
  icon: React.ElementType;
}

interface Section {
  area: string;
  icon: React.ElementType;
  platform: string;
  roles: string[];
  pages: SectionPage[];
}

const sections: Section[] = [
  {
    area: 'Admin Dashboard',
    icon: Monitor,
    platform: 'Web',
    roles: ['admin'],
    pages: [
      { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
      { name: 'Personal Trainers', path: '/admin/pts', icon: UserCog },
      { name: 'Abbonamenti', path: '/admin/subscriptions', icon: CreditCard },
      { name: 'Pagamenti', path: '/admin/payments', icon: Receipt },
      { name: 'Messaggi', path: '/admin/messages', icon: MessageSquare },
      { name: 'Coupon', path: '/admin/coupons', icon: Tag },
      { name: 'Corsi', path: '/admin/courses', icon: BookOpen },
      { name: 'Supporto', path: '/admin/support', icon: HeadphonesIcon },
      { name: 'Impostazioni', path: '/admin/settings', icon: Settings },
      { name: 'Sitemap', path: '/admin/sitemap', icon: Map },
    ],
  },
  {
    area: 'PT Dashboard',
    icon: Monitor,
    platform: 'Web',
    roles: ['pt'],
    pages: [
      { name: 'Dashboard', path: '/pt', icon: LayoutDashboard },
      { name: 'Atleti', path: '/pt/athletes', icon: Users },
      { name: 'Schede Workout', path: '/pt/workouts', icon: Dumbbell },
      { name: 'Calendario', path: '/pt/calendar', icon: Calendar },
      { name: 'Messaggi', path: '/pt/messages', icon: MessageSquare },
      { name: 'Pagamenti', path: '/pt/payments', icon: Receipt },
      { name: 'Blog', path: '/pt/blog', icon: FileText },
      { name: 'Impostazioni', path: '/pt/settings', icon: Settings },
    ],
  },
  {
    area: 'PT App',
    icon: Smartphone,
    platform: 'Mobile/PWA',
    roles: ['pt'],
    pages: [
      { name: 'Home', path: '/pt/app', icon: Home },
      { name: 'Atleti', path: '/pt/app/athletes', icon: Users },
      { name: 'Calendario', path: '/pt/app/calendar', icon: Calendar },
      { name: 'Schede', path: '/pt/app/workouts', icon: Dumbbell },
      { name: 'Chat', path: '/pt/app/chat', icon: MessageSquare },
      { name: 'Profilo', path: '/pt/app/profile', icon: UserCog },
    ],
  },
  {
    area: 'Atleta App',
    icon: Smartphone,
    platform: 'Mobile/PWA',
    roles: ['atleta'],
    pages: [
      { name: 'Home', path: '/app', icon: Home },
      { name: 'Scopri PT', path: '/app/discover', icon: Search },
      { name: 'Allenamenti', path: '/app/workouts', icon: Dumbbell },
      { name: 'Progressi', path: '/app/progress', icon: Activity },
      { name: 'Chat', path: '/app/chat', icon: MessageSquare },
      { name: 'Profilo', path: '/app/profile', icon: Users },
      { name: 'Abbonamento', path: '/app/subscription', icon: CreditCard },
      { name: 'Corsi', path: '/app/courses', icon: BookOpen },
      { name: 'Notifiche', path: '/app/notifications', icon: Bell },
      { name: 'Impostazioni', path: '/app/settings', icon: Settings },
      { name: 'Aiuto', path: '/app/help', icon: HelpCircle },
    ],
  },
  {
    area: 'Sito Pubblico',
    icon: Globe,
    platform: 'Web',
    roles: ['tutti'],
    pages: [
      { name: 'Landing Page', path: '/', icon: Home },
      { name: 'Scopri PT', path: '/discover', icon: Search },
      { name: 'Profilo PT', path: '/pt/:slug', icon: UserCog },
      { name: 'Blog Post', path: '/blog/:slug', icon: FileText },
      { name: 'Installa App', path: '/install', icon: Smartphone },
    ],
  },
];

const permissionRows = [
  { key: 'dashboard_admin', label: 'Dashboard Admin', description: 'Accesso completo al pannello amministrativo', sections: 'Admin Dashboard' },
  { key: 'dashboard_pt', label: 'Dashboard PT', description: 'Pannello gestione web per Personal Trainer', sections: 'PT Dashboard' },
  { key: 'app_pt', label: 'App PT', description: 'App mobile per operatività PT', sections: 'PT App' },
  { key: 'app_atleta', label: 'App Atleta', description: 'App mobile per atleti', sections: 'Atleta App' },
  { key: 'sito_pubblico', label: 'Sito Pubblico', description: 'Pagine accessibili senza autenticazione', sections: 'Sito Pubblico' },
];

function RoleCard({ role }: { role: typeof roles[0] }) {
  const [open, setOpen] = useState(false);
  const Icon = role.icon;

  return (
    <Card className={`border ${role.color.split(' ')[2]} transition-shadow hover:shadow-md`}>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-lg ${role.color.split(' ')[0]}`}>
            <Icon className={`h-5 w-5 ${role.iconColor}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">{role.name}</CardTitle>
              <Badge variant="outline" className="text-[10px]">Livello {role.level}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{role.description}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            {role.capabilities.length} mansioni
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="mt-2 space-y-1">
              {role.capabilities.map((cap, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <span className="mt-1.5 h-1 w-1 rounded-full bg-muted-foreground/50 flex-shrink-0" />
                  {cap}
                </li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

function SectionCard({ section }: { section: Section }) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="transition-shadow hover:shadow-sm">
        <CollapsibleTrigger className="w-full">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <section.icon className="h-4 w-4 text-muted-foreground" />
                <div className="text-left">
                  <CardTitle className="text-sm">{section.area}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {section.platform} · {section.pages.length} pagine
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {section.roles.map(r => (
                  <Badge key={r} variant="secondary" className="text-[10px]">{r}</Badge>
                ))}
                {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="grid gap-1">
              {section.pages.map((page) => (
                <div key={page.path} className="flex items-center gap-2.5 py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors">
                  <page.icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm flex-1">{page.name}</span>
                  <code className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">{page.path}</code>
                  <ExternalLink className="h-3 w-3 text-muted-foreground/40" />
                </div>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export default function AdminSitemapPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sitemap & Ruoli</h1>
        <p className="text-muted-foreground mt-1">
          Organigramma dei ruoli, mappa completa delle sezioni e matrice dei permessi.
        </p>
      </div>

      {/* Sezione 1 — Gerarchia Ruoli */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Gerarchia Ruoli
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {roles.map((role) => (
            <RoleCard key={role.name} role={role} />
          ))}
        </div>
      </div>

      {/* Sezione 2 — Mappa Sezioni */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Map className="h-5 w-5 text-primary" />
          Mappa delle Sezioni
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          {sections.map((section) => (
            <SectionCard key={section.area} section={section} />
          ))}
        </div>
      </div>

      {/* Sezione 3 — Tabella Permessi */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          Matrice Permessi
        </h2>
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Permesso</TableHead>
                <TableHead>Descrizione</TableHead>
                <TableHead>Sezioni</TableHead>
                <TableHead className="text-center">Admin</TableHead>
                <TableHead className="text-center">PT</TableHead>
                <TableHead className="text-center">Atleta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {permissionRows.map((row) => {
                const key = row.key as keyof typeof ROLE_ACCESS_MATRIX.admin;
                return (
                  <TableRow key={row.key}>
                    <TableCell className="font-mono text-xs">{row.key}</TableCell>
                    <TableCell className="text-sm">{row.description}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{row.sections}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {ROLE_ACCESS_MATRIX.admin[key] ? '✅' : '❌'}
                    </TableCell>
                    <TableCell className="text-center">
                      {ROLE_ACCESS_MATRIX.pt[key] ? '✅' : '❌'}
                    </TableCell>
                    <TableCell className="text-center">
                      {ROLE_ACCESS_MATRIX.atleta[key] ? '✅' : '❌'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
