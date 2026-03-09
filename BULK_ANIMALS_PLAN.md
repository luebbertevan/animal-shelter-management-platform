# Bulk Animals Plan

## Overview

This plan covers two related features:

1. **Bulk Add to Group (Phase 1)** — Add a "Bulk Add Animals" section to the group creation and edit forms so coordinators can create multiple animals inline with minimal fields and have them added to the group on submit.
2. **Standalone Bulk Add Animals (Phase 2)** — A dedicated flow to create multiple animals at once without a group (e.g. from the Animals list). Shares UI and logic with Phase 1 per clean-code policy.

**Development order:** Phase 1 first, then Phase 2. Phase 1 addresses the main pain point (group intakes); Phase 2 reuses the row component and creation logic built in Phase 1.

---

# Phase 1: Bulk Add to Group

## User Flow

1. Coordinator navigates to **New Group** (or **Edit Group**).
2. Fills in group name, description, priority.
3. Uploads group photos (if any).
4. If at least one animal is "staged" for the group (see below), the **Set all animals status** and **Set all animals Visibility on Fosters Needed page** dropdowns appear. Staged = either at least one bulk-add row OR at least one existing animal selected in the grid. If the group is empty (no bulk-add rows and no selected animals), these dropdowns do not appear.
5. The **Bulk Add Animals** section is always visible (not collapsible). Coordinator uses a number stepper (or "+ Add another") to add rows, up to a maximum of **30**.
6. Each row has: **Name** (text, optional), **Sex** (dropdown: blank, Male, Female, Spayed Female, Neutered Male), **Life Stage** (dropdown: blank, Kitten, Adult, Senior). No row numbers.
7. Coordinator can also select existing animals from the "Select Animals" grid. Bulk-add rows and selected existing animals combine; both count as "staged" for the group.
8. On form submit, bulk-add animals are **created only then** (not before). They are created with the status and visibility from the dropdowns (defaults: `in_shelter`, `available_now`), then their IDs are added to the group's `animal_ids` and each animal's `group_id` is set. Existing selected animals are linked to the group as today. Same sync rules as before for status/visibility across all animals in the group.

## Form Order

1. Group info fields (name, description, priority)
2. Photo upload
3. Set all animals status / Set all animals Visibility (only when at least one animal is staged: bulk-add rows or selected existing animals)
4. Bulk Add Animals section (always visible)
5. Select Existing Animals (search, filters, animal card grid)

## Status and Visibility Rules

- **When to show:** The two dropdowns appear only when there is at least one animal "in the group" / staged to be added: i.e. `bulkAddRows.length > 0 || selectedAnimalIds.length > 0`. If the group is empty (no bulk-add rows, no selected animals), do not show the dropdowns.
- **Sync:** Same rules as today. All animals in the group (existing selected + newly created from bulk add) must share the same visibility; conflict detection and blocking submit apply. Status/visibility from the dropdowns apply to all staged animals; for bulk-add rows, those values are used at creation time.

## UI Design — Bulk Add Section (Phase 1)

- **Placement:** Below status/visibility dropdowns, above "Select Animals" grid.
- **Always open:** No collapse/expand; the section is always visible.
- **Max rows:** 30 (enforced in code). When the user hits 30 and "+ Add another" is disabled, show an in-context message: "Maximum 30 animals per bulk add."
- **No row numbers.** Table columns: Name | Sex | Life Stage | (remove button).
- **Sex dropdown:** Blank, Male, Female, Spayed Female, Neutered Male (same as full animal form; store as `sex_spay_neuter_status` or equivalent).
- **Life Stage:** Blank, Kitten, Adult, Senior.
- **Controls:** "+ Add another" button to add one row. Each row has an X to remove that row.
- **Responsive:** See "Responsive design" section below. On small screens, stack rows as cards (name, sex, life stage, remove) instead of a table.

```
┌─────────────────────────────────────────────────────────┐
│  Group Name: [_________________________________]         │
│  Description: [________________________________]         │
│  High Priority: [toggle]                                │
│                                                          │
│  ── Group Photos ──                                     │
│  [photo upload area]                                     │
│                                                          │
│  (only if bulkAddRows.length > 0 || selectedIds.length > 0)
│  ── Set all animals status ──                            │
│  [Select... ▼]                                           │
│  ── Set all animals Visibility on Fosters Needed page ── │
│  [Select... ▼]                                           │
│  (helper text / conflict warning)                        │
│                                                          │
│  ── Bulk Add Animals ──                                  │
│  ┌────────────┬──────────────────┬─────────────┬──┐     │
│  │ Name       │ Sex               │ Life Stage   │  │     │
│  ├────────────┼──────────────────┼─────────────┼──┤     │
│  │ [________] │ [Select...    ▼] │ [Select... ▼] │ X│     │
│  │ [________] │ [Select...    ▼] │ [Select... ▼] │ X│     │
│  │ [________] │ [Select...    ▼] │ [Select... ▼] │ X│     │
│  │ [________] │ [Select...    ▼] │ [Select... ▼] │ X│     │
│  └────────────┴──────────────────┴─────────────┴──┘     │
│  [+ Add another]                                        │
│                                                          │
│  ── Select Existing Animals ──                           │
│  (search, filters, animal card grid)                    │
│  X animals selected                                     │
│                                                          │
│  [Create Group]  [Delete Group]                         │
└─────────────────────────────────────────────────────────┘
```

## Implementation Tasks — Phase 1

### 1. Shared types and row model (for reuse in Phase 2)

- Define a minimal row type for Phase 1: `BulkAddAnimalRow { id: string; name: string; sex: string; lifeStage: string }` (id is client-only for React keys). Phase 2 extends this with per-row `status` and `foster_visibility` (see Phase 2).
- Sex values align with existing `sex_spay_neuter_status` options: Male, Female, Spayed Female, Neutered Male (and blank).

### 2. Bulk-add state in group form

- In `useGroupForm` (or equivalent), add state: `bulkAddRows: BulkAddAnimalRow[]`, with functions: `addBulkRow`, `removeBulkRow(id)`, `updateBulkRow(id, field, value)`, `setBulkRowCount(n)` (capped at 30), `clearBulkRows`.
- Expose `bulkAddRows` and these handlers.

### 3. Status/visibility visibility condition

- Show "Set all animals status" and "Set all animals Visibility" when `selectedAnimalIds.length > 0 || bulkAddRows.length > 0`.
- When applying "set for all", apply to both selected existing animals (staged maps) and treat bulk-add rows as receiving the same status/visibility on create.

### 4. GroupForm layout and order

- Reorder sections: group info → photos → status/visibility dropdowns (conditional) → Bulk Add Animals section → Select Animals grid.
- Bulk Add section: always visible; number stepper (0–30) and table/list of rows (no row numbers). Columns: Name, Sex, Life Stage, remove (X). "+ Add another" when count < 30.
- Pass bulk-add state and handlers into `GroupForm` via props.

### 5. Submission (New Group / Edit Group)

- On submit: create all bulk-add animals first (using status and visibility from dropdowns; defaults `in_shelter`, `available_now`). Collect new animal IDs.
- Build `animal_ids` = new IDs + selected existing animal IDs. Create or update group with this list; set `group_id` on all those animals.
- Apply staged status/visibility to existing selected animals as today. Handle partial failure (e.g. some animal inserts fail): still create/update group with successful IDs; show a clear message (e.g. "X animals created, Y failed") and optionally which rows failed (by position or name if provided).

### 6. Testing Phase 1

- Empty group: no status/visibility dropdowns; can submit empty group (if allowed) or add via bulk add / select.
- Bulk-add only: 1–30 rows; submit creates animals and group; all get same status/visibility.
- Mix of bulk-add and selected existing; conflict detection if existing have different visibility.
- Edit group: add more bulk-add rows; submit creates new animals and appends to group.
- Max 30 rows enforced; remove row updates count; no row numbers shown.
- Mobile: stacked cards.

---

## Defaults for Bulk-Add Animals

**Phase 1 (Bulk Add to Group):** Status and visibility come from the "Set all animals status" / "Set all animals Visibility" dropdowns (defaults `in_shelter`, `available_now` if not set).

**Phase 2 (Standalone):** Each row has its own Status and Visibility dropdowns; each is auto-set to `in_shelter` and `available_now`; user can change per row.

| Field | Default |
|-------|---------|
| `species` | `"cat"` |
| `status` | Phase 1: from dropdown; Phase 2: per-row, default `in_shelter` |
| `foster_visibility` | Phase 1: from dropdown; Phase 2: per-row, default `available_now` |
| `name` | `null` |
| `sex_spay_neuter_status` | `null` (options: male, female, spayed_female, neutered_male) |
| `life_stage` | `null` |
| `organization_id` | Coordinator's profile |
| `created_by` | Coordinator's user ID |
| Other fields | `null` / not set |

---

# Phase 2: Standalone Bulk Add Animals

## Goal

Allow coordinators to create multiple animals at once **without** a group (e.g. from the Animals list). Same minimal identity fields (name, sex, life stage; all optional). Each row has its own **Status** and **Visibility** dropdowns, auto-set to defaults; logic and UI components are shared with Phase 1 where possible.

## User Flow

1. From **Animals list**, coordinator clicks **"Bulk Add Animals"** (e.g. next to "Add Animal"). Navigate to a dedicated page at `/animals/bulk-add`.
2. Page shows a row table: each row has **Name**, **Sex**, **Life Stage**, **Status**, **Visibility** (and remove). No row numbers. Max 30 rows; "+ Add another" button. When limit hit, show "Maximum 30 animals per bulk add."
3. **Status** and **Visibility** are **per-row** dropdowns, each auto-set to defaults (`in_shelter`, `available_now`). User can change any row individually.
4. On submit, create each animal with that row's status and visibility; no group. Redirect to Animals list (or show success with link). On partial failure, show clear messaging (e.g. how many succeeded/failed and which rows failed if useful).

## Per-row status and visibility (Phase 2 only)

- Each bulk-add row includes `status` and `foster_visibility` fields (defaults: `in_shelter`, `available_now`).
- Row type for Phase 2: extend to `BulkAddAnimalRowStandalone { id; name; sex; lifeStage; status; fosterVisibility }` or pass defaults in the shared row type with optional overrides.
- Shared row component should support an optional "per-row status/visibility" mode (Phase 2) vs. "use parent-set values" (Phase 1).

## Shared Logic (Clean Code)

- **Row component:** Reusable component that renders the table/cards. Phase 1: columns Name | Sex | Life Stage | remove; Phase 2: same plus Status | Visibility per row. Use a prop or variant to switch between "group" (no per-row status/visibility) and "standalone" (per-row dropdowns with defaults).
- **Row state:** Shared `useBulkAddRows` (or equivalent) with optional `status`/`foster_visibility` per row for Phase 2.
- **Creation helper:** Shared function that takes rows plus either (a) a single status/visibility for all (Phase 1 / group) or (b) per-row status/visibility (Phase 2). Returns created IDs and any errors for partial-failure messaging.

## Implementation Tasks — Phase 2

1. **Route and entry point**
   - Add route `/animals/bulk-add` (coordinator-only). Add "Bulk Add Animals" button on Animals list; placement and styling must fit existing layout without awkward spacing (see Responsive design).

2. **Standalone page**
   - Use shared row component in "standalone" mode: per-row Status and Visibility dropdowns, defaulted to `in_shelter` and `available_now`. No group context; no "Select existing animals" section. Layout responsive.

3. **Submit**
   - Call shared creation helper with per-row status/visibility; no `group_id`. Redirect to `/animals` on success. On partial failure, show clear message (e.g. "X created, Y failed") and optionally which rows failed.

4. **Testing**
   - Create 1, 5, 30 animals with mixed status/visibility; verify in list. Partial failure handling; offline handling. Responsive layout on multiple breakpoints.

---

# Design Decisions (Resolved)

- **Sex options:** Male, Female, Spayed Female, Neutered Male (same as full form).
- **Form order (group):** Group info → Photos → Status/visibility dropdowns → Bulk Add section → Select existing animals.
- **Status/visibility visibility:** Only when at least one animal is staged (bulk-add rows or selected existing); empty group = no dropdowns. Same sync rules as before.
- **No row numbers** in the table.
- **Max 30 rows** for bulk add (enforced in code; show "Maximum 30 animals per bulk add" message when limit is hit and "+ Add another" is disabled).
- **Bulk add section always open** (not collapsible).
- **Animals created on submit only** (bulk add to this group on form submit).
- **Phase 2 shares logic and UI** with Phase 1; develop Phase 1 first, then Phase 2.
- **Standalone entry:** Dedicated page at `/animals/bulk-add` with a button on the Animals list (e.g. "Bulk Add Animals" next to "Add Animal").
- **Partial failure messaging:** Show a clear message (e.g. how many succeeded, how many failed) and optionally which rows failed (by position or name if provided).
- **Edit Group — initial bulk-add:** When opening Edit Group with no bulk-add rows yet, show 0 rows; user adds rows via "+ Add another" or stepper (no default of 1 row).
- **Phase 2 per-row status/visibility:** Standalone bulk add has Status and Visibility as individual dropdowns on each row, auto-set to defaults (`in_shelter`, `available_now`). No "set for all" dropdowns in Phase 2; only per-row controls.
- **Animals list button:** Add a "Bulk Add" button on the Animals list page, using a space-efficient / UX-friendly approach on small screens (e.g. compact secondary button or combined action menu on mobile).

---

# Responsive Design

Both bulk-add features (Phase 1 and Phase 2) must adapt to different screen sizes so the app UI looks natural and never cramped or awkward.

**Form layout and spacing**
- Use responsive spacing (e.g. Tailwind breakpoints) so that padding and gaps optimize for screen space: tighter on small screens, comfortable on larger ones. Avoid fixed min-heights or excessive padding that cause cramped or sparse layouts.
- Form inputs (text fields, dropdowns) should have consistent, touch-friendly sizing on mobile; on desktop they can remain compact. Ensure labels and controls don’t wrap awkwardly.

**Bulk-add table vs cards**
- **Desktop/tablet:** Show the bulk-add rows in a table (Name | Sex | Life Stage [| Status | Visibility for Phase 2] | remove). Use responsive column widths (e.g. min-width on columns, overflow-x auto only if truly necessary) so the table doesn’t feel cramped.
- **Small screens (mobile):** Switch to a stacked card layout per row: each animal is a card with fields stacked vertically (Name, Sex, Life Stage, and for Phase 2 Status and Visibility), plus remove button. Cards stack with consistent gap; no horizontal scroll for the form itself.

**Buttons on existing pages**
- The **"Bulk Add"** button on the Animals list (Phase 2) must fit the existing header/action area without breaking layout. Use a compact secondary button (e.g. outline style, shorter label like "Bulk Add") next to "Add Animal." On narrow screens ensure no overflow or awkward wrap — keep labels short and use responsive sizing.
- Any stepper or "+ Add another" in the bulk-add section should remain usable and clearly tappable on mobile (adequate touch target size and spacing).

**Consistency**
- Reuse the same responsive rules for the bulk-add section inside the group form (Phase 1) and on the standalone bulk-add page (Phase 2) so behavior and appearance are consistent across screen sizes.
