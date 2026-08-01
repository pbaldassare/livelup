import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// =====================================================
// SIMULATION STATE — stato condiviso tra i test della
// simulazione E2E (stesso worker process, workers=1).
// Persistito su disco dopo ogni step per debug/report.
// =====================================================

const currentDir = path.dirname(fileURLToPath(import.meta.url));
export const ARTIFACTS_DIR = path.resolve(currentDir, '..', 'artifacts');
export const ARTIFACTS_FILE = path.join(ARTIFACTS_DIR, 'simulation-run.json');

export type StepStatus = 'PASS' | 'FAIL' | 'SKIP';

export interface StepResult {
  step: string;
  status: StepStatus;
  detail?: string;
  timestamp: string;
}

export interface SimulationRun {
  startedAt: string;
  finishedAt?: string;
  baseUrl?: string;
  ptEmail?: string;
  ptPassword?: string;
  ptUserId?: string;
  athleteEmail?: string;
  athletePassword?: string;
  athleteUserId?: string;
  templateId?: string;
  templateTitle?: string;
  workoutId?: string;
  workoutTitle?: string;
  groupId?: string;
  groupName?: string;
  eventId?: string;
  eventTitle?: string;
  stepResults: StepResult[];
  notCovered: string[];
}

function loadInitialState(): SimulationRun {
  // Playwright avvia un NUOVO worker process dopo un test fallito (per
  // isolamento da browser/contesto corrotti): senza questo hydrate, lo
  // stato in-memory del nuovo processo ripartirebbe vuoto e la successiva
  // persist() sovrascriverebbe il file perdendo i risultati già registrati
  // dai test precedenti nello stesso run.
  try {
    const raw = fs.readFileSync(ARTIFACTS_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as SimulationRun;
    if (parsed && Array.isArray(parsed.stepResults)) {
      return { ...parsed, finishedAt: undefined };
    }
  } catch {
    // Nessun file precedente (o non valido): si parte da uno stato vuoto.
  }
  return {
    startedAt: new Date().toISOString(),
    stepResults: [],
    notCovered: [],
  };
}

export const state: SimulationRun = loadInitialState();

export function persist(): void {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  fs.writeFileSync(ARTIFACTS_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

export function recordStep(step: string, status: StepStatus, detail?: string): void {
  state.stepResults.push({ step, status, detail, timestamp: new Date().toISOString() });
  persist();
  // Marker leggibile nell'output del terminale per sincronizzazione esterna
  // (es. conferma email via Lovable MCP) e per il report finale.
  // eslint-disable-next-line no-console
  console.log(`[SIM] ${status} — ${step}${detail ? ' :: ' + detail : ''}`);
}

export function markNotCovered(reason: string): void {
  if (!state.notCovered.includes(reason)) {
    state.notCovered.push(reason);
    persist();
  }
}

export function finalize(): void {
  state.finishedAt = new Date().toISOString();
  persist();
}
