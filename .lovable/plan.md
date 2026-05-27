
## Goal

Make the "non mostrare più" choice persist across sessions and devices by storing it in `profiles.notification_preferences.tour_dismissed` instead of `localStorage`.

## Changes

### 1. `src/components/AppTourPrompt.tsx`
- Replace the `safeGet("livellapp_tour_done")` check with a Supabase query:
  - When `user` is available, `select('notification_preferences').from('profiles').eq('user_id', user.id).maybeSingle()`.
  - If `notification_preferences.tour_dismissed === true`, do not open the dialog.
  - Keep the existing 1.2s delay before opening when not dismissed.
- On both "Salta" and "Fai il tour", if `dontShow` is checked, write to the DB:
  - Fetch current `notification_preferences`, merge `{ ...current, tour_dismissed: true }`, update the row by `user_id`.
  - Do this fire-and-forget (don't block UI); also keep a `safeSet` fallback so the prompt doesn't re-open in the same session if the write fails.
- Pull `user` from `useAuth` (already imported for `role`).
- Remove the now-unused `safeGet` import; keep `safeSet` only as the session-local fallback.

### 2. `src/components/AppTourContext.tsx`
- In `stopTour` and at the natural end of `nextStep`, also persist `tour_dismissed: true` to the DB for the current user (same merge pattern). Keep the existing `safeSet` line as a defensive same-session guard.
- Read `supabase.auth.getUser()` inside the handlers (the context is render-prop free and shouldn't depend on `useAuth` to avoid provider-order issues).

### 3. `src/pages/atleta/AtletaSettingsPage.tsx`
- "Rifai il tour" button: in addition to clearing the two localStorage keys, update the current user's `profiles.notification_preferences` to `{ ...current, tour_dismissed: false }` before calling `startTour()`. Otherwise the prompt would never reappear once the DB flag is set.

## Out of scope
- Tour steps, tour overlay UI, dialog copy, the checkbox label — unchanged.
- No other keys in `notification_preferences` are read, written, or removed (always merge-spread the existing object).
- No schema migration: `notification_preferences` jsonb already exists with appropriate RLS (users update their own profile).

## Technical notes
- Merge pattern to preserve other keys:
  ```ts
  const { data } = await supabase
    .from('profiles')
    .select('notification_preferences')
    .eq('user_id', user.id)
    .maybeSingle();
  const next = { ...(data?.notification_preferences ?? {}), tour_dismissed: true };
  await supabase.from('profiles').update({ notification_preferences: next }).eq('user_id', user.id);
  ```
- The `AppTourPrompt` effect will depend on `user?.id` and `role` so it re-checks once auth resolves.
- A short in-component `checked` ref prevents double-firing in React Strict Mode.
