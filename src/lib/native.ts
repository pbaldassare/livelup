import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Capacitor, SystemBars, SystemBarsStyle, SystemBarType } from '@capacitor/core';

/**
 * Vero dentro l'app Android (e domani iOS) costruita con Capacitor.
 *
 * Li' il sito viaggia dentro il pacchetto: il sito pubblico non serve, il
 * service worker nemmeno, e non ha senso proporre di installare l'app.
 * Vedi docs/ANDROID.md.
 */
export const isNativeApp = (): boolean => Capacitor.isNativePlatform();

/**
 * Icone della barra di stato leggibili sul tema in uso: chiare sul tema
 * scuro (il default, vedi capacitor.config.ts), scure sul tema chiaro.
 * Va montato una volta dentro il ThemeProvider.
 */
export function BarreDiSistema() {
  const { resolvedTheme } = useTheme();
  useEffect(() => {
    if (!isNativeApp() || !resolvedTheme) return;
    // DARK = fondo scuro, quindi icone chiare.
    const style = resolvedTheme === 'light' ? SystemBarsStyle.Light : SystemBarsStyle.Dark;
    void SystemBars.setStyle({ style, bar: SystemBarType.StatusBar });
  }, [resolvedTheme]);
  return null;
}
