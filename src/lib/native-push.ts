import { PushNotifications } from '@capacitor/push-notifications';
import { isNativeApp } from '@/lib/native';

/**
 * Notifiche push native: FCM su Android (progetto Firebase livelapp-db2ed),
 * APNs su iOS. Per ora e' solo impalcatura e non la chiama nessuno: quando il
 * backend sapra' inviarle, si chiama dopo l'accesso e si salva il token sul
 * profilo. I passi mancanti sono in docs/PUSH.md.
 *
 * Chiede il permesso (Android 13+ e iOS mostrano il dialogo di sistema) e
 * risolve col token del dispositivo: FCM su Android, APNs su iOS. Null fuori
 * dall'app nativa, se l'utente rifiuta o se la registrazione fallisce.
 */
export async function registraPushNativa(): Promise<string | null> {
  if (!isNativeApp()) return null;

  let { receive } = await PushNotifications.checkPermissions();
  if (receive === 'prompt' || receive === 'prompt-with-rationale') {
    ({ receive } = await PushNotifications.requestPermissions());
  }
  if (receive !== 'granted') return null;

  // ponytail: un ascoltatore in piu' a ogni chiamata; basta chiamarla una volta per sessione.
  const token = new Promise<string | null>((resolve) => {
    void PushNotifications.addListener('registration', ({ value }) => resolve(value));
    void PushNotifications.addListener('registrationError', () => resolve(null));
  });
  await PushNotifications.register();
  return token;
}
