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
const PUBLIC_ORIGIN = 'https://livelapp.iaconnect.it';

/**
 * Gli host di preview/editor Lovable richiedono un login Lovable: un link
 * generato da lì è inutilizzabile per l'atleta invitato (soprattutto da
 * iPhone, dove poi non è possibile installare la PWA). In quei casi usiamo
 * sempre l'origine pubblica di produzione.
 */
function isNonPublicOrigin(host: string): boolean {
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.startsWith('id-preview--') ||
    host.startsWith('preview--') ||
    host.endsWith('.lovableproject.com') ||
    host.endsWith('.lovableproject-dev.com') ||
    host.endsWith('.lovable.dev')
  );
}

export function buildInviteLink(options: { refUserId?: string | null } = {}): string {
  const host = typeof window !== 'undefined' ? window.location?.hostname ?? '' : '';
  const origin =
    typeof window !== 'undefined' && window.location?.origin && !isNonPublicOrigin(host)
      ? window.location.origin
      : PUBLIC_ORIGIN;

  const { refUserId } = options;
  if (!refUserId) return `${origin}/install`;

  const params = new URLSearchParams({ ref: refUserId });
  return `${origin}/install?${params.toString()}`;
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
