# Assignment Sync Plan

## Overview

When a foster is assigned to a group, only the animals currently in the group at assignment time get their `current_foster_id`, `status`, and `foster_visibility` updated. If a coordinator later adds an animal to that group, the new animal is not assigned to the foster. Similarly, removing an animal from an assigned group does not clear that animal's assignment. This plan fixes both directions.

---

## Milestone: Assignment Sync When Adding or Removing Animals from a Group

**Goal:** When a group is assigned to a foster, any animal added to that group is automatically assigned to that foster. When an animal is removed from an assigned group, that animal's assignment is cleared.

**Current behavior:**

- Assignment to a group sets `animal_groups.current_foster_id` and updates only the animals currently in `animal_ids` (in the approve-request RPC and in `assignGroupToFoster`).
- Adding an animal to the group (via Edit Group) only updates `animal_ids` and the animal's `group_id`; it does not set the animal's `current_foster_id`.
- Removing an animal from the group does not clear that animal's assignment.

---

### Tasks

1. **Sync when adding an animal to a group**
    - In the Edit Group (and New Group) submission flow, after updating `animal_ids` and the animal's `group_id`, check if `animal_groups.current_foster_id` is set.
    - If it is, update the newly added animal(s): set `current_foster_id` to the group's foster, set `status` to `in_foster`, and set `foster_visibility` to `not_visible` (consistent with other animals in an assigned group).
    - This requires fetching the group's `current_foster_id` during the save flow (it may already be fetched in the edit flow).

2. **Sync when removing an animal from a group**
    - In the Edit Group submission flow, for animals that were previously in the group but are no longer selected, after clearing their `group_id`, check if the group has a `current_foster_id`.
    - If the group is assigned and the animal's `current_foster_id` matches the group's foster, clear the animal's assignment: set `current_foster_id` to null and set `status` and `foster_visibility` to unassigned defaults (e.g. `in_shelter` and `available_now`, matching the existing `unassignAnimal` semantics).

3. **Moving an animal between groups**
    - When an animal is moved from one assigned group to another, treat it as remove-from-source then add-to-destination, so both sync rules apply.
    - The animal should end up assigned to the destination group's foster (if any) and no longer to the source group's foster.

4. **Edge case: adding animals to a group that has no foster**
    - If the group does not have a `current_foster_id`, no assignment sync is needed — just update `group_id` and `animal_ids` as today.

5. **Foster request RPCs (no change expected)**
    - The existing RPCs that approve/deny requests already handle assignment at approval time. This milestone only adds sync for membership changes after assignment. Confirm the RPCs don't need changes.

---

### Testing

- Assign a group (with at least one animal) to a foster; add a new animal to that group via Edit Group; confirm the new animal has `current_foster_id`, `status = in_foster`, and `foster_visibility = not_visible`.
- Remove an animal from an assigned group via Edit Group; confirm that animal's `current_foster_id` is cleared and status/visibility reflect unassigned state.
- Move an animal from one assigned group to another; confirm the animal ends up assigned to the destination group's foster only.
- Unassign a group; add an animal to that group; confirm the new animal is not assigned (group has no foster).
- Edit a group that has no foster: adding/removing animals works as before with no assignment side effects.

**Deliverable:** Adding an animal to an assigned group automatically assigns that animal to the group's foster. Removing an animal from an assigned group clears that animal's assignment. No conflicting assignments for in-group animals.
