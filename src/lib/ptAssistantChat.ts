// =====================================================
// PT ASSISTANT CHAT — messaggi selezione + sequenza
// =====================================================

import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import type { AssignmentMode } from '@/lib/ptAssistantParse';
import { WEEKDAY_LABELS } from '@/lib/ptAssistantParse';
import { PROTOCOL_REGISTRY } from '@/lib/protocols/registry';

export type ChatSelectionType =
  | 'mode'
  | 'athlete'
  | 'program'
  | 'template'
  | 'startDate'
  | 'endDate'
  | 'activeDays'
  | 'exercise'
  | 'protocol';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  selectionType?: ChatSelectionType;
  /** Chiave per sostituire messaggi dello stesso slot (es. un solo atleta) */
  slotKey?: string;
  text: string;
  createdAt: number;
};

/** Slot singolo: sostituisce il messaggio precedente dello stesso tipo */
const SINGLE_SLOT_KEYS: Record<string, string> = {
  mode: 'mode',
  athlete: 'athlete',
  program: 'program',
  template: 'template',
  startDate: 'startDate',
  endDate: 'endDate',
  activeDays: 'activeDays',
};

export function upsertChatMessage(
  messages: ChatMessage[],
  msg: Omit<ChatMessage, 'id' | 'createdAt'> & { id?: string },
): ChatMessage[] {
  const slotKey = msg.slotKey ?? (msg.selectionType ? SINGLE_SLOT_KEYS[msg.selectionType] : undefined);
  const full: ChatMessage = {
    id: msg.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: Date.now(),
    ...msg,
    slotKey,
  };

  if (slotKey) {
    const filtered = messages.filter((m) => m.slotKey !== slotKey);
    return [...filtered, full];
  }

  // Esercizi/protocolli: evita duplicati per testo uguale
  if (messages.some((m) => m.text === full.text && m.selectionType === full.selectionType)) {
    return messages;
  }
  return [...messages, full];
}

export function removeChatBySlot(messages: ChatMessage[], slotKey: string): ChatMessage[] {
  return messages.filter((m) => m.slotKey !== slotKey);
}

export type SequenceInput = {
  mode: AssignmentMode;
  athleteName: string | null;
  programName: string | null;
  templateName: string | null;
  programSchedules: string[];
  startDate: Date;
  endDate: Date | null;
  activeDays: number[];
  exerciseNames: string[];
  protocolLabels: string[];
  sessionCount: number;
  rotationPreview?: string;
};

export function buildSequenceText(input: SequenceInput): string {
  const steps: string[] = [];

  if (input.athleteName) {
    steps.push(`👤 Atleta: ${input.athleteName}`);
  }

  if (input.mode === 'program' && input.programName) {
    steps.push(`📋 Programma: ${input.programName}`);
    if (input.programSchedules.length > 0) {
      steps.push(`📑 Schede: ${input.programSchedules.join(' → ')}`);
    }
    if (input.rotationPreview) {
      steps.push(`🔄 Rotazione: ${input.rotationPreview}`);
    }
  } else if (input.templateName) {
    steps.push(`📄 Scheda: ${input.templateName}`);
  }

  steps.push(`📅 Inizio: ${format(input.startDate, 'PPP', { locale: it })}`);
  if (input.endDate) {
    steps.push(`📅 Fine: ${format(input.endDate, 'PPP', { locale: it })}`);
  }

  if (input.activeDays.length > 0) {
    steps.push(`📆 Giorni: ${input.activeDays.map((d) => WEEKDAY_LABELS[d]).join(', ')}`);
  }

  if (input.exerciseNames.length > 0) {
    steps.push(`🏋️ Esercizi (${input.exerciseNames.length}): ${input.exerciseNames.join(', ')}`);
  }

  if (input.protocolLabels.length > 0) {
    steps.push(`⚡ Protocolli: ${input.protocolLabels.join(', ')}`);
  }

  if (input.sessionCount > 1) {
    steps.push(`✅ ${input.sessionCount} sessioni programmate`);
  }

  return steps.join('\n');
}

export function protocolLabel(type: string): string {
  return PROTOCOL_REGISTRY[type as keyof typeof PROTOCOL_REGISTRY]?.label ?? type;
}
