# Deceased and Euthanized Status — Design Document

## Summary

Animals may be marked as **deceased** or **euthanized** via the **status** field. These statuses are coordinator-only: fosters must never see that an animal is deceased or euthanized. Deceased/euthanized animals are never assigned to a foster, never in a group, and never visible on the Fosters Needed page. The only place to set these statuses is the **Edit Animal** form; when either is selected, visibility is forced to **Not Visible** and the visibility dropdown is locked.

---

## Design Decisions

### 1. Status as the single source

- **Deceased** and **euthanized** are two new values on the existing **status** field (`AnimalStatus`).
- We do not introduce a separate “outcome” or “disposition” field. Status remains the single lifecycle field for filtering and reporting.

### 2. Visibility sync

- When status is **deceased** or **euthanized**, `foster_visibility` is always **not_visible**.
- This is implemented in `getFosterVisibilityFromStatus()` and enforced in the Edit Animal form (visibility locked when either status is selected).

### 3. Foster invisibility (RLS)

- **Row-level security**: Fosters must never see rows where `status IN ('deceased', 'euthanized')`.
- The animals **SELECT** policy is updated so that:
  - **Coordinators**: see all animals in the organization.
  - **Fosters**: see only animals where `status NOT IN ('deceased', 'euthanized')`.
- This guarantees fosters do not see deceased/euthanized animals on: Animals List, Animal Detail, Fosters Needed, assigned animals, or any other query.

### 4. Where deceased/euthanized can be selected

- **Edit Animal form only.** The status dropdown on the Edit Animal page includes “Deceased” and “Euthanized”.
- When either is selected:
  - **Visibility** is set to **Not Visible** and cannot be changed (dropdown is disabled/locked).
- **Not** added to:
  - New Animal form
  - Fosters Needed filters (these animals are never visible on that page; no need to offer these status options there)
  - Group form “Set all animals status”
  - Unassignment dialog
  - Assignment confirmation dialog
  - Bulk add animal rows

**Note on Animal Filters:** Deceased and euthanized **are** included in the status filter on the **Animals List** page so coordinators can filter to these statuses. They are **not** included in Fosters Needed filters.

### 5. Enforcement when saving deceased/euthanized

When a coordinator saves an animal with status **deceased** or **euthanized**:

1. Set **foster_visibility** to **not_visible** (form already does this; ensure persisted).
2. Set **current_foster_id** to **null** (unassign).
3. If the animal has a **group_id**:
   - Remove this animal from the group: update the group’s `animal_ids` to exclude this animal’s id.
   - Set the animal’s **group_id** to **null**.

So: no foster is ever assigned a deceased/euthanized animal, and no group (that a foster could see) contains one.

### 6. Assignment guards

- **assignAnimalToFoster**: Before assigning, reject if the animal’s status is **deceased** or **euthanized** (clear error message).
- **assignGroupToFoster**: Before assigning, reject if any animal in the group has status **deceased** or **euthanized**.

Unassign flows do not need to change; they never set status to deceased/euthanized.

### 7. Group form

- The “Set all animals status” dropdown on group create/edit does **not** include deceased or euthanized.
- The only way to mark an animal as deceased or euthanized is from the animal’s own Edit Animal page. When that is saved, the animal is removed from its group as above.

### 8. Group animal selection (New Group / Edit Group)

- Deceased and euthanized animals **must not** be addable to a group. When selecting animals for a group (New Group or Edit Group), the animal list excludes any animal with status deceased or euthanized.
- The status filter in the group animal-selection area does **not** include Deceased or Euthanized as options. This is done via `excludeStatusesFromAnimalFilter` on GroupForm and `excludeStatuses` on AnimalFilters.

### 9. Confirmation when saving as deceased/euthanized (Edit Animal)

- When the user submits the Edit Animal form with status **Deceased** or **Euthanized**, a confirmation dialog is shown before saving.
- The dialog explains what will happen: **[Name] will be removed from [group name]** (when the animal is in a group) and **[Name] will be unassigned from [foster name]** (when the animal has a current foster). Both lines are shown when both apply.
- On confirm, the save proceeds (removal from group and unassignment are performed as in §5). On cancel, the dialog closes and no save occurs.

---

## Implementation Checklist

| Area | Action |
|------|--------|
| Types | Add `deceased` \| `euthanized` to `AnimalStatus` in `src/types/index.ts` |
| DB | Migration: extend `animals.status` CHECK to include `'deceased'`, `'euthanized'` |
| RLS | New/animated SELECT policy so fosters never see `status IN ('deceased','euthanized')` |
| metadataUtils | `getFosterVisibilityFromStatus`: map deceased, euthanized → `not_visible`; ensure switch is exhaustive |
| Edit Animal | Add Deceased / Euthanized to status dropdown; when selected, set visibility to not_visible and lock visibility dropdown |
| Animal Filters (Animals List) | Add Deceased / Euthanized to status options (coordinators only see results) |
| Fosters Needed filters | Do **not** add deceased/euthanized to status options |
| New Animal | Do not add deceased/euthanized |
| Group form | Do not add deceased/euthanized to “Set all animals status” |
| Save (animal update) | When saving with status deceased/euthanized: clear `current_foster_id`, remove from group (`group_id` + group’s `animal_ids`) |
| assignAnimalToFoster | Reject if animal status is deceased or euthanized |
| assignGroupToFoster | Reject if any animal in group has status deceased or euthanized |
| Group animal selection (NewGroup, EditGroup) | Filter out deceased/euthanized from fetched animals; pass `excludeStatusesFromAnimalFilter={['deceased','euthanized']}` to GroupForm so status filter omits them |
| Edit Animal save as deceased/euthanized | Show confirmation dialog with removal/unassignment message; on confirm call performSubmit |

---

## Validation and Testing

Use this list to validate behavior and catch regressions.

### Visibility and access (foster must never see deceased/euthanized)

- [ ] **RLS – Animals List:** As a **foster**, open Animals List; animals with status deceased or euthanized do not appear. As a **coordinator**, they do appear.
- [ ] **RLS – Animal Detail:** As a **foster**, open the direct URL to an animal that is deceased or euthanized; result is 404 or “not found” (no row returned). As a **coordinator**, the detail page loads and shows the status.
- [ ] **RLS – Fosters Needed:** As a **foster**, Fosters Needed page never shows deceased or euthanized animals (they are not in the result set). As a **coordinator**, Fosters Needed still filters by visibility; deceased/euthanized are not_visible so they don’t appear there (expected).
- [ ] **Assigned animals:** As a **foster**, “Currently Fostering” (or equivalent) never lists an animal that was later marked deceased/euthanized (RLS hides it). As a **coordinator**, assigned-animal lists behave as expected.

### Edit Animal form (only place to set deceased/euthanized)

- [ ] **Status options:** Edit Animal status dropdown includes “Deceased” and “Euthanized” (in addition to existing statuses).
- [ ] **Visibility lock:** When status is set to **Deceased** or **Euthanized**, the “Visibility on Fosters Needed page” dropdown is set to **Not Visible** and is **disabled/locked** (user cannot change it).
- [ ] **Visibility unlock:** When status is changed from Deceased or Euthanized back to another status, the visibility dropdown becomes editable again and syncs per existing rules (e.g. in_shelter → Available Now).
- [ ] **Save:** Saving an animal with status Deceased or Euthanized persists status and not_visible; on reload (as coordinator), the animal shows as Deceased or Euthanized and visibility is Not Visible.

### Enforcement on save (unassign and remove from group)

- [ ] **Unassign:** When saving with status Deceased or Euthanized, the animal’s `current_foster_id` is cleared (animal is unassigned). If the foster views “Currently Fostering,” that animal no longer appears (RLS).
- [ ] **Remove from group:** When saving with status Deceased or Euthanized, if the animal was in a group: animal’s `group_id` is cleared and the group’s `animal_ids` no longer contains this animal. Group detail (as coordinator) no longer lists this animal in the group.

### Assignment guards

- [ ] **Assign animal:** As coordinator, attempt to assign an animal that has status Deceased or Euthanized; assignment is rejected with a clear error (e.g. cannot assign deceased/euthanized animal).
- [ ] **Assign group:** As coordinator, attempt to assign a group that contains an animal with status Deceased or Euthanized; assignment is rejected with a clear error.

### Group animal selection

- [ ] **New Group / Edit Group – list:** When adding animals to a group, the list of selectable animals does not include any animal with status Deceased or Euthanized.
- [ ] **New Group / Edit Group – status filter:** The status filter in the group animal-selection area does not offer Deceased or Euthanized as options.

### Confirmation dialog (Edit Animal)

- [ ] **Save as deceased/euthanized:** When submitting Edit Animal with status Deceased or Euthanized, a confirmation dialog appears before save.
- [ ] **Dialog content:** The dialog shows “will be removed from [group name]” when the animal is in a group, and “will be unassigned from [foster name]” when the animal has a current foster; both lines when both apply.
- [ ] **Confirm/Cancel:** On Confirm, the save runs (animal is removed from group and unassigned as applicable). On Cancel, the dialog closes and no save occurs.

### Filters and other forms

- [ ] **Animals List – status filter:** Coordinator can filter by status “Deceased” or “Euthanized” and only those animals appear. Foster does not see deceased/euthanized animals at all (RLS), so filter is irrelevant for them.
- [ ] **Fosters Needed – status filter:** Deceased and Euthanized are **not** options in the Fosters Needed status filter.
- [ ] **New Animal:** Status dropdown does **not** include Deceased or Euthanized.
- [ ] **Group form – Set all animals status:** Dropdown does **not** include Deceased or Euthanized.
- [ ] **Unassignment / Assignment dialogs:** Status options do not include Deceased or Euthanized (no change from current behavior).

### Sync and display

- [ ] **getFosterVisibilityFromStatus:** For status `deceased` and `euthanized`, return `not_visible`. TypeScript switch is exhaustive (no fallback needed for new statuses).
- [ ] **Display labels:** Anywhere status is displayed (e.g. Animal Detail, Animals List), “Deceased” and “Euthanized” show with correct, human-readable labels.

### Edge cases

- [ ] **Foster has detail open, then coordinator marks deceased:** After coordinator saves, foster’s next load or refetch of that animal returns no row (404/not found).
- [ ] **Group ends up with zero animals:** If marking the last animal in a group as deceased/euthanized, the group’s `animal_ids` becomes empty; coordinator can still open the group and edit/add animals as defined elsewhere.

### Lint and build

- [ ] No TypeScript errors; `AnimalStatus` is updated everywhere necessary (exhaustive switches, option arrays).
- [ ] No new lint warnings or errors in touched files.
- [ ] Database migration runs successfully; RLS policy is correct and tested with coordinator vs foster roles.

---

## Edge Cases (Reference)

- **Foster has Animal Detail open; coordinator marks animal deceased:** Next fetch for that animal by foster returns no row → 404. Acceptable.
- **Coordinator marks animal deceased while it’s in a group:** Save logic removes animal from group and clears assignment. Group may have fewer animals or become empty; coordinators can edit group membership as needed.
- **Direct URL to deceased animal (foster):** RLS prevents load → 404.
