import {
  TRAINING_MODALITIES,
  TRAINING_MODALITY_LABELS,
  type TrainingModality,
  isTrainingModality,
  normalizeTrainingModality,
  trainingModalityLabel,
} from '@/lib/trainingModality';

/** Modalità di servizio del PT (profilo): In presenza / Online / Mix */
export type PtServiceModality = TrainingModality;

export const PT_SERVICE_MODALITIES: PtServiceModality[] = TRAINING_MODALITIES;

export const PT_SERVICE_MODALITY_LABELS = TRAINING_MODALITY_LABELS;

export const isPtServiceModality = isTrainingModality;
export const normalizePtServiceModality = normalizeTrainingModality;
export const ptServiceModalityLabel = trainingModalityLabel;

export function serviceModalityToFlags(modality: PtServiceModality): {
  offers_online: boolean;
  offers_in_person: boolean;
  online_only: boolean;
} {
  switch (modality) {
    case 'online':
      return { offers_online: true, offers_in_person: false, online_only: true };
    case 'in_presenza':
      return { offers_online: false, offers_in_person: true, online_only: false };
    default:
      return { offers_online: true, offers_in_person: true, online_only: false };
  }
}

/** Fallback se service_modality non è ancora in Cloud / row. */
export function flagsToServiceModality(input: {
  service_modality?: string | null;
  offers_online?: boolean | null;
  offers_in_person?: boolean | null;
  online_only?: boolean | null;
}): PtServiceModality {
  if (isTrainingModality(input.service_modality)) {
    return input.service_modality;
  }
  if (input.online_only) return 'online';
  const online = input.offers_online ?? true;
  const inPerson = input.offers_in_person ?? true;
  if (online && !inPerson) return 'online';
  if (inPerson && !online) return 'in_presenza';
  return 'mix';
}
