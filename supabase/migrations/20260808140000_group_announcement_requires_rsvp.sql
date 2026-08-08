-- Optional "solo avviso" vs event with participation.
-- Default true keeps existing announcements RSVP-capable.
ALTER TABLE public.group_announcements
  ADD COLUMN IF NOT EXISTS requires_rsvp boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.group_announcements.requires_rsvp IS
  'If true, members can RSVP (Ci sono) from annunci dialog and chat card.';
