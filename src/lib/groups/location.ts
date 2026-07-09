// =====================================================
// Formattazione località gruppi per UI
// =====================================================

export interface GroupLocationFields {
  place_label?: string | null;
  address_line?: string | null;
  location_name?: string | null;
}

export function formatGroupLocation(g: GroupLocationFields): {
  primary: string | null;
  secondary: string | null;
} {
  const place = g.place_label?.trim() || null;
  const address = g.address_line?.trim() || null;
  const zone = g.location_name?.trim() || null;

  if (place) {
    const secondaryParts = [address, zone].filter(
      (p) => p && !place.toLowerCase().includes(p.toLowerCase()),
    );
    return {
      primary: place,
      secondary: secondaryParts.length > 0 ? secondaryParts.join(' · ') : null,
    };
  }

  if (address && zone) {
    return { primary: zone, secondary: address };
  }

  if (zone) return { primary: zone, secondary: null };
  if (address) return { primary: address, secondary: null };

  return { primary: null, secondary: null };
}

export function formatGroupLocationLine(g: GroupLocationFields): string | null {
  const { primary, secondary } = formatGroupLocation(g);
  if (!primary) return null;
  return secondary ? `${primary} · ${secondary}` : primary;
}
