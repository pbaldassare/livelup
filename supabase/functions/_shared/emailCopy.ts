import { ctaButton, escapeHtml, loginUrl, wrapLivelappEmail } from './emailLayout.ts'
import { sendResendEmail, type MailResult } from './resendMail.ts'

export type AppMailRole = 'pt' | 'atleta' | 'admin' | null

function roleLabel(role: AppMailRole): string {
  if (role === 'pt') return 'Personal Trainer'
  if (role === 'admin') return 'amministratore'
  if (role === 'atleta') return 'atleta'
  return 'utente'
}

export function parseMailRole(raw: unknown): AppMailRole {
  const value = typeof raw === 'string' ? raw.toLowerCase() : ''
  if (value === 'pt' || value === 'atleta' || value === 'admin') return value
  return null
}

export function authEmailCopy(actionType: string, role: AppMailRole) {
  const who = roleLabel(role)
  switch (actionType) {
    case 'signup':
      if (role === 'pt') {
        return {
          subject: 'Conferma il tuo account Personal Trainer — Livelapp',
          headline: 'Benvenuto, Personal Trainer',
          intro:
            'Grazie per esserti registrato su Livelapp. Conferma l\'email per attivare la dashboard e l\'app PT: atleti, schede, calendario e chat.',
          cta: 'Conferma email e inizia',
          footer: 'Se non hai creato un account professionista su Livelapp, ignora questa email.',
        }
      }
      return {
        subject: 'Conferma registrazione Livelapp',
        headline: 'Conferma la tua registrazione',
        intro:
          'Grazie per esserti iscritto a Livelapp. Per attivare il tuo account atleta, conferma l\'indirizzo email con il pulsante qui sotto.',
        cta: 'Conferma email',
        footer: 'Se non hai creato un account su Livelapp, puoi ignorare questa email.',
      }
    case 'recovery':
      if (role === 'pt') {
        return {
          subject: 'Reimposta password PT — Livelapp',
          headline: 'Reimposta la password',
          intro:
            'Abbiamo ricevuto una richiesta di reset password per il tuo account Personal Trainer. Clicca il pulsante per sceglierne una nuova e tornare in dashboard.',
          cta: 'Reimposta password',
          footer: 'Se non hai richiesto tu il reset, ignora questa email: la password resterà invariata.',
        }
      }
      return {
        subject: 'Reimposta password Livelapp',
        headline: 'Reimposta la password',
        intro:
          'Abbiamo ricevuto una richiesta di reimpostazione password per il tuo account Livelapp. Clicca il pulsante qui sotto per sceglierne una nuova.',
        cta: 'Reimposta password',
        footer: 'Se non hai richiesto tu il reset, ignora questa email: la password resterà invariata.',
      }
    default:
      return {
        subject: 'Link di accesso Livelapp',
        headline: `Accedi a Livelapp`,
        intro: `Usa il link qui sotto per accedere in modo sicuro al tuo account ${who}. Il link scade dopo poco tempo.`,
        cta: 'Accedi ora',
        footer: 'Se non hai richiesto questo accesso, puoi ignorare questa email.',
      }
  }
}

export function buildAuthLinkEmail(params: {
  actionType: string
  confirmationUrl: string
  email: string
  role: AppMailRole
}): { subject: string; html: string; text: string } {
  const copy = authEmailCopy(params.actionType, params.role)
  const html = wrapLivelappEmail({
    title: copy.subject,
    headline: copy.headline,
    bodyHtml: `
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#333333;">${escapeHtml(copy.intro)}</p>
      <p style="margin:0 0 20px;font-size:13px;color:#666666;">Destinatario: <strong style="color:#111111;">${escapeHtml(params.email)}</strong></p>
      ${ctaButton(params.confirmationUrl, copy.cta)}
      <p style="margin:0;font-size:12px;line-height:1.5;color:#777777;">${escapeHtml(copy.footer)}</p>
    `,
  })
  const text = [
    'Livelapp',
    '',
    copy.headline,
    '',
    copy.intro,
    '',
    `Destinatario: ${params.email}`,
    '',
    `${copy.cta}:`,
    params.confirmationUrl,
    '',
    copy.footer,
    '',
    '© Livelapp — Email automatica, non rispondere a questo messaggio.',
  ].join('\n')
  return { subject: copy.subject, html, text }
}

export type CredentialsWelcomeKind = 'athlete_by_pt' | 'created_by_admin'

export async function sendCredentialsWelcomeEmail(params: {
  to: string
  firstName: string
  lastName: string
  role: 'pt' | 'atleta'
  temporaryPassword: string
  kind: CredentialsWelcomeKind
  ptName?: string
}): Promise<MailResult> {
  const fullName = [params.firstName, params.lastName].filter(Boolean).join(' ').trim()
  const url = loginUrl()
  const isPt = params.role === 'pt'

  const headline = isPt ? 'Benvenuto, Personal Trainer' : 'Benvenuto su Livelapp'
  const subject = isPt
    ? 'Benvenuto su Livelapp — account Personal Trainer'
    : 'Benvenuto su Livelapp — credenziali di accesso'

  const intro =
    params.kind === 'athlete_by_pt'
      ? `<strong>${escapeHtml(params.ptName || 'Il tuo Personal Trainer')}</strong> ha creato il tuo account atleta su Livelapp.`
      : isPt
        ? 'Il tuo account Personal Trainer su Livelapp è pronto. Da qui gestisci atleti, schede, calendario e chat.'
        : 'Il tuo account atleta su Livelapp è pronto.'

  const footer =
    params.kind === 'athlete_by_pt'
      ? 'Se non ti aspettavi questa email, contatta il tuo Personal Trainer.'
      : 'Se non ti aspettavi questa email, contatta il supporto Livelapp.'

  const html = wrapLivelappEmail({
    title: subject,
    headline,
    bodyHtml: `
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Ciao ${escapeHtml(fullName || (isPt ? 'Coach' : 'Atleta'))},</p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">${intro}</p>
      <p style="margin:0 0 12px;font-size:15px;line-height:1.6;">Accedi con queste credenziali temporanee:</p>
      <ul style="margin:0 0 16px;padding-left:20px;font-size:15px;line-height:1.6;">
        <li><strong>Email:</strong> ${escapeHtml(params.to)}</li>
        <li><strong>Password temporanea:</strong> ${escapeHtml(params.temporaryPassword)}</li>
      </ul>
      <p style="margin:0 0 20px;font-size:14px;color:#b45309;font-weight:bold;">Per la tua sicurezza, cambia la password subito dopo il primo accesso.</p>
      ${ctaButton(url, 'Accedi a Livelapp')}
      <p style="margin:0;font-size:12px;color:#777777;">${escapeHtml(footer)}</p>
    `,
  })

  const text = [
    'Livelapp',
    '',
    headline,
    '',
    `Ciao ${fullName || (isPt ? 'Coach' : 'Atleta')},`,
    '',
    params.kind === 'athlete_by_pt'
      ? `${params.ptName || 'Il tuo Personal Trainer'} ha creato il tuo account atleta su Livelapp.`
      : isPt
        ? 'Il tuo account Personal Trainer su Livelapp è pronto.'
        : 'Il tuo account atleta su Livelapp è pronto.',
    '',
    'Credenziali temporanee:',
    `Email: ${params.to}`,
    `Password temporanea: ${params.temporaryPassword}`,
    '',
    'Per la tua sicurezza, cambia la password subito dopo il primo accesso.',
    '',
    `Accedi: ${url}`,
    '',
    footer,
    '',
    '© Livelapp — Email automatica, non rispondere a questo messaggio.',
  ].join('\n')

  return sendResendEmail({ to: params.to, subject, html, text })
}
