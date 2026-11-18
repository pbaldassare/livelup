import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Volume2, Smartphone } from 'lucide-react';
import { getTimerPreferences, setTimerPreferences } from '@/lib/timerPreferences';
import { fireTimerEndSignal } from '@/lib/timerEndSignals';

export function TimerSignalPreferences() {
  const [prefs, setPrefs] = useState(() => getTimerPreferences());

  const update = (patch: Partial<typeof prefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    setTimerPreferences(next);
  };

  return (
  <div className="bg-app-card rounded-xl overflow-hidden divide-y divide-app-border">
    <div className="flex items-center justify-between p-4">
      <div className="flex items-center gap-3">
        <Volume2 className="h-5 w-5 text-app-muted-foreground" />
        <div>
          <p className="font-medium text-app-foreground">Suono timer</p>
          <p className="text-sm text-app-muted-foreground">
            Beep negli ultimi secondi di recupero e lavoro
          </p>
        </div>
      </div>
      <Switch
        checked={prefs.soundEnabled}
        onCheckedChange={(soundEnabled) => {
          update({ soundEnabled });
          if (soundEnabled) fireTimerEndSignal('rest', 1);
        }}
      />
    </div>
    <div className="flex items-center justify-between p-4">
      <div className="flex items-center gap-3">
        <Smartphone className="h-5 w-5 text-app-muted-foreground" />
        <div>
          <p className="font-medium text-app-foreground">Vibrazione timer</p>
          <p className="text-sm text-app-muted-foreground">
            Richiede supporto del dispositivo; con schermo spento può non funzionare nel browser
          </p>
        </div>
      </div>
      <Switch
        checked={prefs.vibrationEnabled}
        onCheckedChange={(vibrationEnabled) => {
          update({ vibrationEnabled });
          if (vibrationEnabled) fireTimerEndSignal('rest', 1);
        }}
      />
    </div>
  </div>
  );
}