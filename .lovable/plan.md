## Add Workout Quality Checklist to project memory

Save the checklist as a permanent project rule so future agent loops apply it automatically whenever workout-related components are touched.

### Files to create / update

1. **New memory file** — `mem://features/workout-quality-checklist`
   Stores the full 4-section checklist verbatim (Next exercise preview, Notes & protocol badge, PT guided execution in athlete context, Athlete training history) plus the General rules block. Frontmatter:
   - `type: feature`
   - `description: Mandatory QA checks after any change to workout flow components (GuidedWorkoutFlow, SetTracker, AtletaTimedRoundsPlayer, AtletaEmomPlayer, workout_logs queries, PT athlete history).`

2. **Update** `mem://index.md`
   - Add a one-liner under **Core** so it applies to every action:
     `Workout changes: run mem://features/workout-quality-checklist (next-exercise preview, athlete notes/badge, PT-on-behalf athleteUserId, history with ko/delta).`
   - Add a Memories entry pointing to the new file with a specific description so retrieval matches when the user touches `GuidedWorkoutFlow`, `SetTracker`, `AtletaTimedRoundsPlayer`, `AtletaEmomPlayer`, `workout_logs`, or the athlete history tab.

### Out of scope (no code changes)

- No edits to any `.tsx` components, edge functions, or DB.
- This is a knowledge-only change: the rules will be surfaced in future loops so the agent self-verifies before claiming a workout-related task done.

### After approval

Switch to build mode, write the two memory files, confirm to the user.