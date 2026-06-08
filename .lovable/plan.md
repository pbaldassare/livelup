# Fix: athlete names across the app

The project already has the right helper: `src/lib/athleteName.ts` exposes `getAthleteDisplayName(first, last, email, fallback)` and `getAthleteInitials(...)`. Today several places ignore it and render `"Atleta"`, just the email, or `first_name + ' ' + last_name` without an email fallback. We will route every athlete-rendering surface through these helpers and ensure every query already pulls `first_name, last_name, email, avatar_url` from `profiles`.

No DB / RLS changes. UI/data-shape only.

## Files to update

1. **`src/components/pt/AssignWorkoutDialog.tsx`**
   - In the athletes query (line ~134), already selects from `profiles` — extend select to `first_name, last_name, avatar_url, email`.
   - In the `<Select>` item (line ~486-498): render `<Avatar>` (avatar_url or initials) + `getAthleteDisplayName(...)`. Drop the `|| 'Atleta'` literal.
   - Same for `selectedAthlete` trigger label.

2. **`src/components/pt/AssignProgramDialog.tsx`** (lines ~100-230)
   - Ensure profile select includes `first_name, last_name, email, avatar_url`.
   - SelectItem: render Avatar + `getAthleteDisplayName(...)`, remove `'Atleta'` literal and the bare `first_name || 'Atleta'` pattern.

3. **`src/pages/pt/PTAthletesPage.tsx`** (PT dashboard `/pt/athletes`)
   - Confirm the profiles fetch returns `first_name, last_name, email, avatar_url`.
   - Replace every inline name composition with `getAthleteDisplayName` and initials with `getAthleteInitials`. Ensure avatar + full name are shown side by side in every row (table + cards).

4. **`src/pages/pt/PTAppAthletesPage.tsx`** (PT PWA `/pt/app/athletes`)
   - `AthleteCard` currently does `first_name + last_name || email || 'Atleta'` inline — replace with helper. Same for initials.
   - Already shows avatar — keep, just route name + initials through helpers.

5. **Other athlete-rendering surfaces** — sweep and apply the same helpers (avatar + full name, email fallback):
   - `src/components/pt/dashboard/PTTodayReport.tsx` (today list)
   - `src/pages/pt/PTAppCalendarPage.tsx` (athlete labels on calendar items)
   - `src/pages/pt/PTAppHome.tsx` (recent athletes / quick lists)
   - `src/pages/pt/PTMessagesPage.tsx` and `src/pages/pt/PTAppChatPage.tsx` / `PTAppChatDetailPage.tsx` (chat list peer names)
   - `src/pages/pt/PTWorkoutsPage.tsx` (athlete column)
   - `src/pages/pt/PTAthleteDetailPage.tsx` (header)
   - `src/components/pt/AthleteSubscriptionsTab.tsx` (athlete column)
   - `src/components/pt/PTAvailabilityCalendar.tsx` / `PTAvailabilityManager.tsx` if they render booked-athlete names
   - `src/components/pt/PTAthleteHistoryTab.tsx`, `PTAthleteTrainNowTab.tsx` (headers)
   - Admin views that list athletes (`AdminMessagesPage`, `AdminPaymentsPage`, `AdminSupportPage`, `AdminTicketDetailPage`) — same helper.

For each: ensure the Supabase select on `profiles` includes `first_name, last_name, email, avatar_url`; replace inline name/initials logic with the helpers; show a small `<Avatar>` (24-32px) next to the name in lists and dropdowns.

## Conventions to enforce

- Display name: `getAthleteDisplayName(p.first_name, p.last_name, p.email)` (fallback `"Atleta"` only inside the helper).
- Initials: `getAthleteInitials(p.first_name, p.last_name, p.email)`.
- Avatar component: existing `@/components/ui/avatar` with `AvatarImage src={p.avatar_url ?? undefined}` and `AvatarFallback>{initials}`.
- Never render bare `email` or `'Atleta'` as the primary label when a profile object is available.

## Out of scope

- GuidedWorkoutFlow, Esercizi section, PT dashboard structural components, DB schema, RLS, and any non-athlete name rendering (PT / professional cards keep their existing logic).

## Validation

- Visit `/pt/athletes`, `/pt/app/athletes`, open AssignWorkoutDialog and AssignProgramDialog: full names with avatars; email used only when both names empty; never see the literal `"Atleta"` unless profile is genuinely empty.
- Quick build + targeted view of each touched file.
