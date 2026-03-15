# Unassignment flow when groups change

## Overview

When animals are removed from a group or a group is deleted, any animals that were assigned to a foster via that group should have a clear path to unassignment and (optionally) foster notification. This plan reuses the existing unassignment flow (messages, tagging) and avoids duplicated logic.

---

## Scenarios

### 1. Animal(s) removed from a group (Edit Group)

**When:** User edits a group and deselects one or more animals, then saves.

**Current behavior:** `syncUnassignAnimalsRemovedFromGroup` runs: animals’ `current_foster_id`, `status`, and `foster_visibility` are cleared silently (no message to foster).

**New behavior:**

1. Before submitting, if there are removed animals and the group has a `current_foster_id`, show a **choice modal**:
   - **Cancel** – abort save.
   - **Just remove from group** – save as today: update group membership and run silent sync (clear assignment in DB only).
   - **Unassign and notify foster** – open the existing **UnassignmentDialog** (same as Animal/Group detail unassign).

2. If the user chooses **Unassign and notify foster**:
   - Show **UnassignmentDialog** with:
     - Foster name (from `group.current_foster_id` via `fetchFosterById`).
     - Label like “N animal(s)” for the removed set.
     - Same fields: new status, visibility, message, include tag.
   - On confirm:
     - Run the normal group save (update `animal_ids`, set removed animals’ `group_id` to null, etc.) but **do not** call `syncUnassignAnimalsRemovedFromGroup`.
     - For each removed animal, call **`unassignAnimal(animalId, orgId, newStatus, newVisibility, message, includeTag)`** (same as Animal detail unassign). Order matters: group save first so animals no longer have `group_id`, then `unassignAnimal` (which blocks if animal is still in a group).
   - Reuse existing invalidation (animals, group, foster, fosters-needed, requests, etc.).

**Implementation notes:**

- `performSubmit` gets an optional argument, e.g. `{ skipSyncUnassignForRemoved?: boolean }`. When `true`, the existing call to `syncUnassignAnimalsRemovedFromGroup` is skipped; the caller runs the full unassign flow (message + tag) per removed animal via `unassignAnimal`.
- No new assignment utils are required; only the existing `unassignAnimal` and `UnassignmentDialog` are reused.

---

### 2. Group deleted (Edit Group → Delete group)

**When:** User deletes a group from the Edit Group page.

**Current behavior:** Delete confirm text says animals will remain but will no longer be grouped. `deleteGroup` clears animals’ `group_id` and deletes the group; it does **not** clear `current_foster_id` or notify the foster.

**New behavior:**

1. **Clarify in UI:** The delete confirm already states that animals remain but are no longer grouped. Add one short line: *“If the group was assigned to a foster, those animals will no longer be assigned to that foster.”*

2. **Optional unassign before delete:** In the same confirm block, when the group has a `current_foster_id`, show a checkbox:
   - **“Unassign all animals from current foster”**
   - If checked, before calling `deleteGroup`, call **`unassignGroup(groupId, organizationId)`** (with default status/visibility and default message). That clears the group’s and all its animals’ assignment and sends one message to the foster with the existing tagging. Then call `deleteGroup` as today.

**Implementation notes:**

- Reuse `unassignGroup` from `assignmentUtils`. No new backend or dialog for delete; we can add the full UnassignmentDialog for delete later if needed.
- `GroupForm` receives optional props: `groupHasFoster?: boolean`, `unassignBeforeDelete?: boolean`, `onUnassignBeforeDeleteChange?: (value: boolean) => void`. The parent (EditGroup) passes these and, in `handleDelete`, if `unassignBeforeDelete` is true, runs `unassignGroup` then `deleteGroup`.

---

## Reuse summary

| Piece                    | Where used                                      |
|--------------------------|--------------------------------------------------|
| `unassignAnimal`         | EditGroup (after removing animals), AnimalDetail |
| `unassignGroup`          | EditGroup (before delete), GroupDetail           |
| `UnassignmentDialog`     | EditGroup (removed-animals flow), AnimalDetail, GroupDetail |
| `syncUnassignAnimalsRemovedFromGroup` | EditGroup only when user chooses “Just remove from group” |

No duplicated unassignment logic; only one place for “silent” sync when user opts out of notifying.

---

## Testing

- **Remove from group – Just remove:** Edit group, remove an animal that is in an assigned group, choose “Just remove from group”. Animal’s assignment is cleared in DB; no message.
- **Remove from group – Unassign and notify:** Same edit, choose “Unassign and notify foster”, fill dialog, confirm. Group saves, animal is removed, then unassign runs (message + tag). Foster sees message.
- **Delete group – no foster:** Delete a group with no assignee; checkbox is hidden; delete works as today.
- **Delete group – with foster, no unassign:** Delete group with assignee, leave checkbox unchecked. Animals keep `group_id` cleared by delete; their `current_foster_id` is unchanged (current behavior).
- **Delete group – with foster, unassign:** Check “Unassign all animals from current foster”, confirm. `unassignGroup` runs (message + tag), then `deleteGroup`. Animals unassigned and group removed.
