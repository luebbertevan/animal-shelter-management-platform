# Group Status & Display Settings Design Decision

## Background & Context

This document outlines a critical design decision regarding how animal status and display settings should work for animals that are part of groups (e.g., litters of kittens). The current system needs to determine:

1. **When should groups appear on the "Fosters Needed" page?**
2. **Should animals in the same group have synchronized status/display settings?**
3. **How should conflicts be resolved when animals in a group have different statuses?**

---

## Current Planned Policy for Individual Animals

### Display Setting (Master Control)

-   The **display setting** is the master control for whether an animal appears on the "Fosters Needed" page
-   When display is enabled, the system shows one of these statuses:
    -   **Available Now** - Animal is ready for foster placement immediately
    -   **Available Future** - Animal will be available for foster placement soon
    -   **Foster Pending** - Animal has an active foster request

### Status-to-Display Logic (Proposed)

-   **In Shelter** → Display as "Available Now"
-   **Medical Hold** or **Transferring** → Display as "Available Future"
-   **Has Foster Request** → Display as "Foster Pending"
-   **In Foster** or **Adopted** → Do NOT display on Fosters Needed page
    -   _Edge case:_ Animal in foster/adopted but needs to return to foster system → Should display as "Available Future"

### Automatic Status Updates (Proposed)

-   **Foster request accepted** → Set status to "In Foster" and display to false
-   **Animal adopted** → Set status to "Adopted" and unassign foster
-   **Returned to shelter** → Set status to "In Shelter" and unassign foster if relevant

---

## The Core Problem

When animals are grouped together (e.g., a litter of 3 kittens), we need to decide:

1. **Should all animals in a group have the same status and display settings?**
2. **What happens when one animal's status changes? Should it affect the group?**
3. **How do we determine the group's display status on the Fosters Needed page if animals have different statuses?**

### Current Challenge

-   Display on Fosters Needed page is currently based on individual animal settings
-   Groups may contain animals with different statuses (e.g., one kitten ready, one on medical hold)
-   No clear policy for how to handle these conflicts

---

## ⭐ Recommended Solution: Single "Foster Availability" Field

### Overview

**Replace the boolean `display_placement_request` with a single enum field that handles both visibility and the three display states.**

This approach simplifies the data model while maintaining full flexibility for coordinators and providing clear rules for groups.

### The Solution

**New Field: `foster_availability`**

```typescript
type FosterAvailability =
	| "available_now" // Show on Fosters Needed as "Available Now"
	| "available_future" // Show as "Available Future"
	| "foster_pending" // Show as "Foster Pending"
	| null; // Don't display on Fosters Needed page
```

### Key Principles

1. **One Field Controls Everything**: The `foster_availability` field is the single source of truth for the Fosters Needed page
2. **Status Remains Separate**: The `status` field (`in_shelter`, `in_foster`, `adopted`, etc.) is kept for internal tracking/filtering only
3. **Coordinator-Controlled**: Coordinators set `foster_availability` directly - no automatic derivation from status
4. **Simple Group Rules**: Clear priority logic when animals in a group have different values

### How It Works

#### For Individual Animals

-   Coordinator sets `foster_availability` directly via dropdown
-   Values: `"available_now"`, `"available_future"`, `"foster_pending"`, or `null`
-   Status field remains independent and used only for internal filtering/searching

#### For Groups

-   **Display Rule**: Show the group if ANY animal has a non-null `foster_availability`
-   **Status Priority**: When animals have different values, show the "most available" status:
    -   Priority: `available_now` > `foster_pending` > `available_future`
-   **Optional Sync Feature**: Add a "Sync availability" button in group edit UI that sets all animals in the group to the same value

### Example Group Logic

```typescript
function getGroupAvailability(animals: Animal[]): FosterAvailability | null {
	const availabilities = animals
		.map((a) => a.foster_availability)
		.filter((a) => a !== null);

	if (availabilities.length === 0) return null;

	// Priority: available_now > foster_pending > available_future
	if (availabilities.includes("available_now")) return "available_now";
	if (availabilities.includes("foster_pending")) return "foster_pending";
	return "available_future";
}
```

### Benefits

✅ **Solves the Core Problem**: One field handles all three display states  
✅ **No Synchronization Conflicts**: Each animal has its own value - no forced syncing  
✅ **Maximum Flexibility**: Coordinators have full control over what appears  
✅ **Simple Group Logic**: Clear priority rule resolves mixed statuses  
✅ **Status Preserved**: Internal status tracking remains for filtering/searching  
✅ **Future-Proof**: Easy to add automation later if needed

### Optional Future Automation

If automation is desired later, add simple event-based rules:

-   **Foster request accepted** → Set `foster_availability = null`
-   **Animal adopted** → Set `foster_availability = null`
-   **Returned to shelter** → Coordinator manually sets to `"available_now"` or `"available_future"`

### Data Model Change

**BEFORE (Complex):**

```typescript
{
  status: "in_shelter" | "in_foster" | "adopted" | ...
  display_placement_request?: boolean  // Just show/hide
  // Need complex logic to derive display status from status
}
```

**AFTER (Simple):**

```typescript
{
  status: "in_shelter" | "in_foster" | "adopted" | ...  // For internal use only
  foster_availability: "available_now" | "available_future" | "foster_pending" | null
  // This field controls everything for Fosters Needed page
}
```

### Migration Path

1. Add `foster_availability` field to animals table (nullable enum)
2. Migrate existing data:
    - If `display_placement_request = true` → Set based on status or let coordinator set manually
    - If `display_placement_request = false` → Set to `null`
3. Update UI: Replace checkbox with dropdown (Available Now / Available Future / Foster Pending / Not Displayed)
4. Update group display logic to use priority rule
5. Remove `display_placement_request` field after migration

### Why This Is Better Than Other Options

-   **Simpler than Option 1** (Full Sync): No forced synchronization, more flexible
-   **Clearer than Option 2** (No Sync): Has explicit priority rules for groups
-   **More Complete than Option 3** (Partial Sync): Handles all three display states, not just show/hide
-   **More Direct than Option 4** (Group-Level): Single field per animal, simpler data model
-   **More Flexible than Option 5** (Status-Only): Keeps status separate for internal use
-   **Cleaner than Option 6** (Separate Fields): One field instead of two
-   **More Complete than Option 7** (Display Only): Preserves status for internal tracking

---

## Options Considered

### Option 1: Full Synchronization (Enforced)

**Approach:** All animals in a group must have identical status and display settings. When one changes, all change.

**Pros:**

-   Simple to implement and understand
-   Easy to resolve display status (all animals have same status)
-   Automates updates across the group
-   Reduces manual work

**Cons:**

-   Less flexibility for edge cases
-   Cannot handle situations where animals in a group legitimately have different statuses
-   May cause unintended side effects (e.g., changing one animal's status affects entire group)

**Implementation:**

-   Enforce synchronization during group creation/editing
-   When status changes, update all animals in group
-   Display setting changes propagate to all group members

---

### Option 2: No Synchronization (Manual Control)

**Approach:** Animals in groups can have independent status and display settings. No automatic synchronization.

**Pros:**

-   Maximum flexibility
-   Handles edge cases naturally
-   No unintended side effects

**Cons:**

-   Complex logic needed to resolve group display status
-   More manual work required
-   Difficult to determine when group should appear on Fosters Needed page
-   Risk of inconsistent data

**Implementation:**

-   Display entire group if ANY animal in group is marked for display
-   Need prioritization logic to determine which status to show (Available Now vs Available Future vs Foster Pending)

---

### Option 3: Partial Synchronization (Display Only)

**Approach:** Display settings are synchronized and enforced, but status can differ between animals in a group.

**Pros:**

-   Balances automation with flexibility
-   Clear display rules (all animals in group have same display setting)
-   Allows different statuses for legitimate cases

**Cons:**

-   Still need prioritization logic to resolve display status when statuses differ
-   More complex than full synchronization
-   May be confusing (same display but different statuses)

**Implementation:**

-   Enforce display setting synchronization
-   Allow different statuses
-   Use prioritization logic: Available Now > Foster Pending > Available Future

---

### Option 4: Group-Level Display Setting

**Approach:** Add a display setting at the group level (in group create/edit UI). This setting synchronizes all animals' display settings when toggled.

**Pros:**

-   Clear control point for coordinators
-   Can be UI-only (synchronizes underlying animal settings)
-   Intuitive workflow

**Cons:**

-   Still need to resolve conflicts if statuses differ
-   Adds complexity to group management
-   May not solve the core conflict resolution problem

---

### Option 5: Simplify to Status-Only

**Approach:** Remove separate display setting. Use only animal status to determine visibility on Fosters Needed page.

**Pros:**

-   Simpler data model
-   One source of truth
-   Clearer logic

**Cons:**

-   May need additional statuses to handle edge cases
-   Less granular control
-   Still need to decide on synchronization

**Proposed Statuses:**

-   In Shelter (Available Now)
-   Transferring (Available Future)
-   On Hold/Medical Hold (Available Future)
-   In Foster (Not Available)
-   Adopted (Not Available)

---

### Option 6: Separate Status and Display Fields

**Approach:** Keep both fields but make them independent:

-   **Animal Status:** Internal operational status (In Shelter, Medical Hold, Transferring, Adopted, In Foster)
-   **Foster Request Message:** Display status (Available Now, Available Future, Foster Pending, Not Displayed)

**Pros:**

-   Clear separation of concerns
-   Operational status separate from display needs
-   Handles edge cases

**Cons:**

-   More complex data model
-   Still need synchronization decisions
-   Two fields to maintain

---

### Option 7: Ultra-Simple (Display Only)

**Approach:** Remove animal status entirely. Only track display setting: Available Now, Available Future, Foster Pending, Not Displayed.

**Pros:**

-   Simplest possible solution
-   One field to manage
-   Clear purpose

**Cons:**

-   Loses operational status tracking
-   May not meet all needs
-   Less automation possible

---

## Edge Cases to Consider

1. **Group with Mixed Statuses:** 3 kittens, one ready, one on medical hold, one being transferred
2. **Status Change During Group Membership:** Animal's status changes while in a group
3. **Group Adoption:** Entire group adopted together
4. **Partial Group Foster:** Some animals in group go to foster, others stay in shelter
5. **Return to Foster System:** Animal in foster/adopted needs to return to foster system
6. **"In Cafe" Status:** Do we need a separate status similar to "In Foster" but with different rules?

---

## Decision Questions for the Rescue Team

### 1. Group Display on Fosters Needed Page

**Question:** When should a group appear on the "Fosters Needed" page?

-   [ ] **A)** Only if ALL animals in the group are marked for display
-   [ ] **B)** If ANY animal in the group is marked for display
-   [ ] **C)** Only if a group-level display setting is enabled
-   [ ] **D)** Other (please specify): ********\_********

---

### 2. Status Synchronization

**Question:** Should animals in the same group be required to have the same status?

-   [ ] **A)** Yes, always synchronized (when one changes, all change)
-   [ ] **B)** No, animals can have different statuses independently
-   [ ] **C)** Synchronized only for certain statuses (please specify which): ********\_********
-   [ ] **D)** Other (please specify): ********\_********

**Follow-up:** If statuses can differ, how should we handle the group's display status on Fosters Needed page?

-   [ ] Show the "most available" status (Available Now > Foster Pending > Available Future)
-   [ ] Show the "least available" status
-   [ ] Show all statuses somehow
-   [ ] Other: ********\_********

---

### 3. Display Setting Synchronization

**Question:** Should the display setting (whether to show on Fosters Needed page) be synchronized for all animals in a group?

-   [ ] **A)** Yes, always synchronized (enforced)
-   [ ] **B)** No, can differ between animals
-   [ ] **C)** Synchronized by default, but can be overridden per animal
-   [ ] **D)** Other (please specify): ********\_********

---

### 4. Data Model Preference

**Question:** Which approach do you prefer for tracking status and display?

-   [ ] **A)** Single "Status" field that controls both operational status and display
-   [ ] **B)** Separate "Status" (operational) and "Display Setting" (for Fosters Needed page)
-   [ ] **C)** Only "Display Setting" field (remove status tracking)
-   [ ] **D)** Other (please specify): ********\_********

---

### 5. Automation vs. Manual Control

**Question:** How much automation do you want for status/display updates?

-   [ ] **A)** Maximum automation (system updates status/display based on events like foster assignments, adoptions)
-   [ ] **B)** Moderate automation (some automatic updates, but manual override always available)
-   [ ] **C)** Minimal automation (mostly manual control, system only updates in clear cases)
-   [ ] **D)** No automation (all updates manual)

**Follow-up:** Which events should trigger automatic updates?

-   [ ] Foster request accepted → Set to "In Foster", display off
-   [ ] Animal adopted → Set to "Adopted", display off, unassign foster
-   [ ] Returned to shelter → Set to "In Shelter", display on, unassign foster
-   [ ] Other: ********\_********

---

### 6. Group Creation/Editing Behavior

**Question:** When creating or editing a group, what should happen if you add an animal with display setting enabled?

-   [ ] **A)** Automatically enable display for all animals in the group
-   [ ] **B)** Keep each animal's display setting as-is
-   [ ] **C)** Warn coordinator but don't auto-sync
-   [ ] **D)** Other (please specify): ********\_********

---

### 7. Edge Case: Mixed Statuses in Group

**Question:** If animals in a group have different statuses (e.g., one "In Shelter", one "Medical Hold"), how should this be handled?

-   [ ] **A)** Prevent this situation (enforce same status)
-   [ ] **B)** Allow it, show group with "most available" status
-   [ ] **C)** Allow it, show group with "least available" status
-   [ ] **D)** Allow it, don't show group on Fosters Needed page if statuses conflict
-   [ ] **E)** Other (please specify): ********\_********

---

### 8. Edge Case: Return to Foster System

**Question:** If an animal is "In Foster" or "Adopted" but needs to return to the foster system, how should this be handled?

-   [ ] **A)** Change status back to "In Shelter" and enable display
-   [ ] **B)** Keep status but allow display to be manually enabled
-   [ ] **C)** Create a new status like "Needs Re-Foster"
-   [ ] **D)** Other (please specify): ********\_********

---

### 9. "In Cafe" Status

**Question:** Do you need a separate status for animals that are "In Cafe" (similar to "In Foster" but different location/rules)?

-   [ ] **A)** Yes, we need "In Cafe" as a separate status
-   [ ] **B)** No, "In Cafe" can be handled as "In Foster" or another existing status
-   [ ] **C)** Other (please specify): ********\_********

**If yes:** Should "In Cafe" follow the same display rules as "In Foster" (not displayed on Fosters Needed page)?

---

### 10. Group Adoption/Foster Assignment

**Question:** When an entire group is adopted or assigned to foster, should this automatically update all animals in the group?

-   [ ] **A)** Yes, automatically update all animals' status and display
-   [ ] **B)** No, update each animal individually
-   [ ] **C)** Prompt coordinator to confirm before updating all
-   [ ] **D)** Other (please specify): ********\_********

---

### 11. Priority Recommendation

**Question:** Based on the options above, which approach do you think would work best for your workflow?

**Please rank your top 3 preferences:**

1. ***
2. ***
3. ***

**Why?** (What factors are most important: simplicity, flexibility, automation, etc.?)

---

---

## Recommended Next Steps

1. **Review the recommended solution** (⭐ section above) with the rescue team
2. **Discuss if the recommendation meets your needs** or if modifications are needed
3. **Review alternative options** if the recommendation doesn't fit your workflow
4. **Answer the decision questions** below to finalize details
5. **Discuss edge cases** that are common in your operations
6. **Finalize the approach** before implementation begins
7. **Document the decision** for future reference

---

## Notes

-   This decision affects core functionality of the Fosters Needed page
-   The chosen approach will impact group creation, editing, and status change workflows
-   Consider both current needs and future scalability
-   Simpler solutions may be better than complex ones that handle rare edge cases
