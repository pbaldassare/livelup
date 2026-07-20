// =====================================================
// Training modality (PT ↔ athlete connection)
// DB: in_presenza | online | mix — UI labels in Italian
// =====================================================

export type TrainingModality = 'in_presenza' | 'online' | 'mix';

export const TRAINING_MODALITIES: TrainingModality[] = ['in_presenza', 'online', 'mix'];

export const TRAINING_MODALITY_LABELS: Record<TrainingModality, string> = {
  in_presenza: 'In presenza',
  online: 'Online',
  mix: 'Mix',
};

export function isTrainingModality(value: unknown): value is TrainingModality {
  return value === 'in_presenza' || value === 'online' || value === 'mix';
}

export function normalizeTrainingModality(value: unknown): TrainingModality {
  return isTrainingModality(value) ? value : 'mix';
}

export function trainingModalityLabel(value: unknown): string {
  return TRAINING_MODALITY_LABELS[normalizeTrainingModality(value)];
}
