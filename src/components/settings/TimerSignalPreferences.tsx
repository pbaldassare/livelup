import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Volume2, Smartphone, Gauge, Clock, Play } from 'lucide-react';
import {
  getTimerPreferences,
  setTimerPreferences,
  type TimerIntensity,
  type TimerLeadSeconds,
  type TimerPreferences,
} from '@/lib/timerPreferences';
import { previewTimerSignals, resumeTimerAudioContext } from '@/lib/timerEndSignals';
import { cn } from '@/lib/utils';

const INTENSITY_OPTIONS: Array<{ value: TimerIntensity; label: string }> = [
  { value: 'low', label: 'Leggera' },
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Forte' },
];

const LEAD_OPTIONS: Array<{ value: TimerLeadSeconds; label: string }> = [
  { value: 3, label: '3 s' },
  { value: 5, label: '5 s' },
  { value: 8, label: '8 s' },
];

export function TimerSignalPreferences({ compact = false }: { compact?: boolean }) {
  const [prefs, setPrefs] = useState<TimerPreferences>(() => getTimerPreferences());

  const update = (patch: Partial<TimerPreferences>) => {
    const next = setTimerPreferences(patch);
    setPrefs(next);
  };

  const playPreview = () => {
    void resumeTimerAudioContext();
    previewTimerSignals('rest');
  };

  return (
    <div className="bg-app-card rounded-xl overflow-hidden divide-y divide-app-border border border-app-border">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3 min-w-0">
          <Volume2 className="h-5 w-5 text-app-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="font-medium text-app-foreground">Suono timer</p>
            {!compact && (
              <p className="text-sm text-app-muted-foreground">
                Impulsi continui negli ultimi secondi di recupero e lavoro
              </p>
            )}
          </div>
        </div>
        <Switch
          checked={prefs.soundEnabled}
          onCheckedChange={(soundEnabled) => {
            update({ soundEnabled });
            if (soundEnabled) playPreview();
          }}
        />
      </div>
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3 min-w-0">
          <Smartphone className="h-5 w-5 text-app-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="font-medium text-app-foreground">Vibrazione timer</p>
            {!compact && (
              <p className="text-sm text-app-muted-foreground">
                Pattern ripetuto; su iOS Safari può essere limitata
              </p>
            )}
          </div>
        </div>
        <Switch
          checked={prefs.vibrationEnabled}
          onCheckedChange={(vibrationEnabled) => {
            update({ vibrationEnabled });
            if (vibrationEnabled) playPreview();
          }}
        />
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Gauge className="h-5 w-5 text-app-muted-foreground shrink-0" />
          <div>
            <p className="font-medium text-app-foreground">Intensità</p>
            <p className="text-sm text-app-muted-foreground">Più forte = beep e vibrazione più densi</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {INTENSITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                update({ intensity: opt.value });
                playPreview();
              }}
              className={cn(
                'h-11 rounded-lg text-sm font-medium border transition-colors',
                prefs.intensity === opt.value
                  ? 'bg-app-accent text-app-accent-foreground border-app-accent'
                  : 'bg-app-background text-app-foreground border-app-border',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Clock className="h-5 w-5 text-app-muted-foreground shrink-0" />
          <div>
            <p className="font-medium text-app-foreground">Avvisa da</p>
            <p className="text-sm text-app-muted-foreground">Quanto prima della fine partire gli impulsi</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {LEAD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => update({ leadSeconds: opt.value })}
              className={cn(
                'h-11 rounded-lg text-sm font-medium border transition-colors',
                prefs.leadSeconds === opt.value
                  ? 'bg-app-accent text-app-accent-foreground border-app-accent'
                  : 'bg-app-background text-app-foreground border-app-border',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div className="p-4">
        <Button
          type="button"
          variant="outline"
          className="w-full border-app-border"
          onClick={playPreview}
        >
          <Play className="h-4 w-4 mr-2" />
          Prova avviso
        </Button>
      </div>
    </div>
  );
}
