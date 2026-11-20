export function describeAuthError(message: string | undefined | null): {
  title: string;
  description: string;
} {
  const m = (message || '').toLowerCase();

  if (
    m.includes('email not confirmed') ||
    m.includes('not confirmed') ||
    m.includes('email_not_confirmed')
  ) {
    return {
      title: 'Email non confermata',
      description:
        'Apri l’ultima email di conferma e tocca Continua. I link inoltrati su WhatsApp o più vecchi di un nuovo invio non funzionano.',
    };
  }

  if (
    m.includes('expired') ||
    (m.includes('invalid') && (m.includes('link') || m.includes('otp') || m.includes('token')))
  ) {
    return {
      title: 'Link non valido o scaduto',
      description:
        'Usa solo l’ultima email di Livelapp, aperta da Mail/Gmail (non da anteprima WhatsApp). Se hai chiesto un nuovo invio, i link precedenti sono già invalidi.',
    };
  }

  if (m.includes('invalid login') || m.includes('invalid credentials')) {
    return {
      title: 'Accesso non riuscito',
      description:
        'Email o password non corretti. Se ti sei appena registrato, conferma prima l’email (controlla anche spam) e non usare un link vecchio.',
    };
  }

  if (m.includes('already registered') || m.includes('already been registered') || m.includes('user already')) {
    return {
      title: 'Utente già registrato',
      description: 'Questa email è già stata utilizzata. Prova ad accedere, oppure conferma l’email se non l’hai ancora fatto.',
    };
  }

  return {
    title: 'Errore',
    description: message?.trim() || 'Riprova tra poco.',
  };
}