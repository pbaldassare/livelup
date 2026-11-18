import { safeGet, safeRemove, safeSet } from '@/lib/safeStorage';

const SESSION_META_PREFIX = 'livelapp-workout-session-meta:';
const FLOW_SNAPSHOT_PREFIX = 'livelapp-workout-flow-snapshot:';
const PHASE_SNAPSHOT_PREFIX = 'livelapp-workout-phase-snapshot:';

export type WorkoutSessionMeta = {
  sessionStartedAt: string;
};

export type GuidedFlowSnapshot = {
  flow: 'ready' | 'input' | 'rest' | 'next' | 'finished';
  exerciseIndex: number;
  setNumber: number;
  reps: number;
  duration: number;
  weight: number;
  rpe: number;
  restSeconds: number;
  restTotal: number;
  restEndsAt: number | null;
  extraSets: Record<string, number>;
  skipped: Record<string, boolean>;
  completed: Record<string, number[]>;
  transitionMessage: string | null;
  protocolTransition: boolean;
  pendingExerciseIndex: number | null;
  phaseKey: string;
  savedAt: string;
};

export type PhasedWorkoutSnapshot = {
  phaseIndex: number;
  introDismissedByPhase: Record<string, boolean>;
};

function metaKey(workoutId: string) {
  return `${SESSION_META_PREFIX}${workoutId}`;
}

function flowKey(workoutId: string) {
  return `${FLOW_SNAPSHOT_PREFIX}${workoutId}`;
}

function phaseKey(workoutId: string) {
  return `${PHASE_SNAPSHOT_PREFIX}${workoutId}`;
}

export function getWorkoutSessionMeta(workoutId: string): WorkoutSessionMeta | null {
  const raw = safeGet(metaKey(workoutId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as WorkoutSessionMeta;
  } catch {
    return null;
  }
}

export function ensureWorkoutSessionStarted(workoutId: string): WorkoutSessionMeta {
  const existing = getWorkoutSessionMeta(workoutId);
  if (existing?.sessionStartedAt) return existing;
  const meta: WorkoutSessionMeta = { sessionStartedAt: new Date().toISOString() };
  safeSet(metaKey(workoutId), JSON.stringify(meta));
  return meta;
}

export function clearWorkoutSessionLocal(workoutId: string) {
  safeRemove(metaKey(workoutId));
  safeRemove(flowKey(workoutId));
  safeRemove(phaseKey(workoutId));
}

export function saveGuidedFlowSnapshot(workoutId: string, snapshot: Omit<GuidedFlowSnapshot, 'savedAt'>) {
  const payload: GuidedFlowSnapshot = { ...snapshot, savedAt: new Date().toISOString() };
  safeSet(flowKey(workoutId), JSON.stringify(payload));
}

export function loadGuidedFlowSnapshot(workoutId: string, phaseKeyFilter?: string): GuidedFlowSnapshot | null {
  const raw = safeGet(flowKey(workoutId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as GuidedFlowSnapshot;
    if (phaseKeyFilter && parsed.phaseKey !== phaseKeyFilter) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function savePhasedWorkoutSnapshot(workoutId: string, snapshot: PhasedWorkoutSnapshot) {
  safeSet(phaseKey(workoutId), JSON.stringify(snapshot));
}

export function loadPhasedWorkoutSnapshot(workoutId: string): PhasedWorkoutSnapshot | null {
  const raw = safeGet(phaseKey(workoutId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PhasedWorkoutSnapshot;
  } catch {
    return null;
  }
}