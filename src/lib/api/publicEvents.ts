export type PublicEventCreatorKind = 'pt' | 'atleta';

export type PublicEventInsertInput = {
  creatorUserId: string;
  creatorKind: PublicEventCreatorKind;
  title: string;
  description: string | null;
  eventTypeId: string | null;
  startDatetime: string;
  endDatetime: string;
  location: string | null;
  locationLat: number | null;
  locationLng: number | null;
  visibility: string;
  isClosedNumber: boolean;
  maxParticipants: number | null;
  coverImageUrl: string | null;
};

/** Payload per un evento community (category evento). L'atleta non imposta pt_user_id. */
export function buildPublicEventInsert(input: PublicEventInsertInput) {
  const visibility =
    input.creatorKind === 'atleta' && input.visibility === 'connected_only'
      ? 'public'
      : input.visibility;

  return {
    creator_user_id: input.creatorUserId,
    pt_user_id: input.creatorKind === 'pt' ? input.creatorUserId : null,
    atleta_user_id: null,
    title: input.title,
    description: input.description,
    event_type: 'evento' as const,
    category: 'evento' as const,
    event_type_id: input.eventTypeId,
    start_datetime: input.startDatetime,
    end_datetime: input.endDatetime,
    location: input.location,
    location_lat: input.locationLat,
    location_lng: input.locationLng,
    is_public: true,
    visibility,
    is_closed_number: input.isClosedNumber,
    max_participants: input.isClosedNumber ? input.maxParticipants : null,
    cover_image_url: input.coverImageUrl,
  };
}
