# Fix Roster Saving + Button Audit

## Root cause of lost rosters

Two bugs are stacking:

1. **No RLS write policy on `class_configs`** — the store calls `supabase.from('class_configs').upsert(...)` on every roster change, but the table has RLS enabled with **zero policies**. Every upsert silently fails. Rosters only ever existed in React state, so a refresh wipes them.
2. **Auto-save races class switching** — In `ConfigModal.tsx`, the debounced `useEffect` watching `rosterText` fires on:
   - First mount (with whatever `roster` happens to be at that instant — often `[]` before `loadFromDatabase` resolves)
   - Every class switch (the sync effect rewrites `rosterText`, retriggering the save effect 500ms later)
   
   This overwrites the just-loaded roster with the stale text.

## Plan

### 1. Backend: make `class_configs` actually writable

Add RLS policies via migration so upserts succeed. Since the app has no auth, allow public read/write for now (matches the current "anyone can read" pattern on `questions`/`curriculum_facts`):

```sql
CREATE POLICY "Anyone can read class configs"  ON public.class_configs FOR SELECT USING (true);
CREATE POLICY "Anyone can insert class configs" ON public.class_configs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update class configs" ON public.class_configs FOR UPDATE USING (true);
```

Also add `PRIMARY KEY (class_id)` if missing, so `upsert` has a real conflict target. Confirm via `\d class_configs` and add `ON CONFLICT (class_id) DO UPDATE` semantics.

### 2. Store: hydration guard + safer upserts

In `src/store/boardStore.ts`:
- Add `isHydrated: boolean` (false initially, set true after first `loadFromDatabase` for each class).
- `setRoster` should only upsert when called from a real user action — separate the local state update (`setRosterLocal`) from the persisted commit (`saveRoster`).
- On `switchClass`, clear hydration flag for new class, call `loadFromDatabase`, then mark hydrated.
- Surface `loadFromDatabase` errors via thrown promise so UI can toast.

### 3. ConfigModal: explicit Save, no silent overwrites

In `src/components/ConfigModal.tsx`:
- Remove the debounced auto-save `useEffect` entirely.
- Track a `dirty` flag — true only when the user types in the textarea (set in `onChange`), reset after Save or class switch.
- The sync effect that mirrors store `roster` → `rosterText` only runs when `!dirty` (so we don't blow away unsaved edits).
- Make **Save Roster** the single commit path: call new `saveRoster(parsed)` action, await it, then:
  - On success: `toast.success("Roster saved (N students)")`, `SFX.confirm()`, clear dirty.
  - On error: `toast.error("Save failed — try again")`, `SFX.error()`.
  - Show a `Loader2` spinner while saving and disable the button.
- Show an "Unsaved changes" pill next to the Save button when `dirty`.
- Warn on close (Dialog `onOpenChange`) if `dirty`.
- Add `<DialogDescription>` to silence the a11y warning.

### 4. Button audit (BoardHeader, ConfigModal, InventoryPanel, LottoWheel, ReaganGame)

Walk every button and verify:
- Has an `onClick` wired to a real action (no dead handlers).
- Has appropriate `disabled` state (e.g. Lotto already disables when `spins < 1`; verify Lucky Strike disables when no empty tiles, Save Topic disables when input unchanged, AI Generate disables while generating).
- Provides feedback — toast or SFX on success/failure for any state-changing action.
- Loading buttons show `Loader2` spinner during async work.

Findings & fixes in scope:
- **Save Topic** (`handleSaveTopic`) — add toast + disable when `topicInput === curriculumTopic`.
- **AI Theme Generate** — already shows spinner; add success/error toast.
- **Reset Board** in ConfigModal footer — wrap in `AlertDialog` confirm (currently destroys without confirmation).
- **Lucky Strike** — disable + toast "No empty tiles left" when board is full.
- **Class switcher buttons** — already wired; verify they trigger `loadFromDatabase` (they do via `switchClass`).

### 5. Smoke test after build

In default mode, run a quick check:
1. Open Config → add roster → Save → reload page → roster persists.
2. Switch class → add roster → switch back → original roster intact.
3. Type in roster, switch class without saving → confirm warning prompt fires.

## Technical notes

- Files touched: `src/store/boardStore.ts`, `src/components/ConfigModal.tsx`, `src/components/BoardHeader.tsx` (minor), one new migration in `supabase/migrations/`.
- Toast library: use `sonner` (`import { toast } from "sonner"`).
- No new dependencies.
- `loadFromDatabase` already handles `PGRST116` (no row); after RLS fix the first save will create the row and subsequent loads will hydrate it.

## Out of scope

- Per-teacher auth & user-scoped configs (would replace public RLS with `auth.uid()`-based policies). Flag for follow-up if you want true per-account persistence across devices.
