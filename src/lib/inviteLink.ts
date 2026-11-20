import { publicAppOrigin } from '@/lib/publicOrigin';

// =====================================================
// INVITE LINK — utility condivisa per generare e condividere
// il link di invito (download/installazione app + referral PT)
// Usato da: PTAppHome, AtletaAppHome (CTA "Invita un atleta")
// =====================================================

/**
 * Costruisce il link di invito che porta alla pagina pubblica di
 * installazione dell'app. Se `refUserId` è presente, viene propagato
 * come query param `ref` così che, una volta completata la registrazione,
 * il nuovo atleta possa essere collegato automaticamente al PT (vedi
 * AuthPage.tsx, che legge `?ref=` e crea la richiesta di connessione).
 */

export function buildInviteLink(options: { refUserId?: string | null } = {}): string {
  const origin = publicAppOrigin();
  const { refUserId } = options;
  if (!refUserId) return `${origin}/install`;

  const params = new URLSearchParams({ ref: refUserId });
  return `${origin}/install?${params.toString()}`;
}

/** Link PT «Copia link invito» verso la registrazione atleta. */
export function athleteSignupInviteUrl(ptUserId: string): string {
  return `${publicAppOrigin()}/auth?mode=signup&ref=${ptUserId}`;
}

const PT_REF_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** UUID del Professionista in `?ref=` (invito atleta). */
export function parsePtInviteRef(raw: string | null | undefined): string | null {
  const value = raw?.trim() ?? '';
  return PT_REF_UUID_RE.test(value) ? value : null;
}

/**
 * Link PT «Copia link invito»: `/auth?mode=signup&ref=<ptUserId>`.
 * Non copre i link admin `/auth?ref=…&coupon=…` (registrazione PT).
 */
export function isAthleteInviteSignup(
  search: Pick<URLSearchParams, 'get'>,
): boolean {
  return search.get('mode') === 'signup' && parsePtInviteRef(search.get('ref')) !== null;
}

export function resolveSignupRole(args: {
  isAthleteInvite: boolean;
  selectedRole: 'admin' | 'pt' | 'atleta';
}): 'pt' | 'atleta' {
  if (args.isAthleteInvite) return 'atleta';
  return args.selectedRole === 'pt' ? 'pt' : 'atleta';
}

export type ShareInviteLinkResult = 'shared' | 'copied' | 'error';

/**
 * Prova a condividere il link tramite l'API nativa di condivisione
 * (se disponibile) e in ogni caso copia il link negli appunti come
 * fallback affidabile su tutti i dispositivi.
 */
export async function shareInviteLink(
  link: string,
  options: { title?: string; text?: string } = {},
): Promise<ShareInviteLinkResult> {
  let copied = false;
  try {
    await navigator.clipboard.writeText(link);
    copied = true;
  } catch {
    copied = false;
  }

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: options.title, text: options.text, url: link });
      return 'shared';
    } catch (err) {
      // Utente ha annullato la condivisione: non è un errore, il link è comunque copiato
      if (err instanceof Error && err.name === 'AbortError') {
        return copied ? 'copied' : 'error';
      }
    }
  }

  return copied ? 'copied' : 'error';
}
