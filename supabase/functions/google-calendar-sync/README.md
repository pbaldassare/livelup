# google-calendar-sync

Best-effort sync of LIVELLAPP `calendar_events` (appuntamenti) ↔ Google Calendar.

## Actions (POST, JWT required)

```json
{ "action": "create" | "update" | "delete", "calendar_event_id": "<uuid>" }
```

- Returns `{ synced: false, reason: "not_connected" }` if the PT has not linked Google Calendar.
- Stores Google event id on `calendar_events.google_event_id`.

## Secrets

Same as `google-calendar-oauth`: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.

## Frontend

Use `syncAppointmentToGoogleCalendar(eventId, action)` from `src/lib/api/googleCalendarSync.ts` (fire-and-forget).
