# FosterVisibility Design Decision

## Decision Summary

**FosterVisibility** is the single source of truth for whether an animal or group appears on the Fosters Needed page and what availability message is displayed.

### Type Definition

```typescript
type FosterVisibility =
	| "available_now" // Show on Fosters Needed as "Available Now"
	| "available_future" // Show as "Available Future"
	| "foster_pending" // Show as "Foster Pending"
	| "not_visible"; // Don't display on Fosters Needed page
```

### Key Principles

1. **Single Source of Truth**: `foster_visibility` field controls both visibility and message on Fosters Needed page
2. **Status Remains Separate**: The `status` field (`in_shelter`, `in_foster`, `adopted`, etc.) is kept for internal tracking and filtering only
3. **One-Directional Sync**: Changing `status` in create/edit forms can sync to `foster_visibility`, but `foster_visibility` changes do NOT sync back to `status`
4. **No Enforcement**: There is no enforcement that `status` and `foster_visibility` must match

### Status-to-FosterVisibility Sync Rules

When `status` is changed, `foster_visibility` is automatically set according to these rules (one-way only):

-   `in_shelter` → `available_now`
-   `medical_hold` → `available_future`
-   `transferring` → `available_future`
-   `in_foster` → `not_visible`
-   `adopted` → `not_visible`

**Important**: This sync only happens when status is changed. Changing `foster_visibility` does NOT change `status`.

### Group Rules

1. **FosterVisibility Must Match**: All animals in a group must have the same `foster_visibility` value
2. **Status Can Differ**: Animals in the same group are allowed to have different `status` values
3. **Group Display**: A group appears on Fosters Needed page if its animals have a non-`not_visible` `foster_visibility` value
4. **Group Message**: The group displays the same message as its animals' `foster_visibility` value

### Group Form Features

Group create/edit forms include two new dropdowns:

1. **"Set all animals status"** dropdown

    - Allows setting status for all animals in the group
    - Animals in a group can have different statuses
    - Triggers one-directional sync to `foster_visibility` for each animal

2. **"Set all animals Visibility on Fosters Needed page"** dropdown
    - Allows setting `foster_visibility` for all animals in the group
    - Animals in a group MUST have the same `foster_visibility`
    - Shows conflict message if animals have different values
    - Blocks form submission if conflicts exist

### Validation & User Experience

-   **Conflict Detection**: On form submission, if animals have different `foster_visibility` values, show alert:
    > **Alert: Animals in a group must have the same Visibility on Fosters Needed page**
-   **Form Blocking**: Alert blocks form submission and highlights the "Set all animals Visibility on Fosters Needed page" field

### Fosters Needed Page Display

-   `not_visible`: Animal/group does NOT appear on Fosters Needed page
-   `available_now`: Appears with "Available Now" badge
-   `available_future`: Appears with "Available Future" badge
-   `foster_pending`: Appears with "Foster Pending" badge

---

## Development Plan

### Phase 1: Database Schema & Types

**Goal:** Add non-nullable `foster_visibility` field to database and update TypeScript types.

**Decisions:**

-   `foster_visibility` is **NOT NULL** (required field, we depend on it)
-   Database default: `'available_now'`
-   TypeScript type: `FosterVisibility` (non-nullable)
-   Migration: Set all existing animals to `'available_now'` (ensures groups are consistent, dummy data can be reset)

**Tasks:**

1. **Create database migration:**

    - Add `foster_visibility` column to `animals` table:
        - Type: `TEXT` (or enum if supported)
        - Constraint: `NOT NULL`
        - Default: `'available_now'`
        - Values: `'available_now'`, `'available_future'`, `'foster_pending'`, `'not_visible'`
    - Migration sets all existing animals to `'available_now'`:
        ```sql
        UPDATE animals SET foster_visibility = 'available_now';
        ```
    - Keep `display_placement_request` column (will be deprecated, not removed yet)

2. **Update TypeScript types:**

    - Add `FosterVisibility` type to `src/types/index.ts`:
        ```typescript
        type FosterVisibility =
        	| "available_now"
        	| "available_future"
        	| "foster_pending"
        	| "not_visible";
        ```
    - Add `foster_visibility: FosterVisibility` to `Animal` type (non-nullable, not optional)
    - Keep `display_placement_request?: boolean` (marked as deprecated in comments)

3. **Update database queries:**
    - Update `animalQueries.ts` to include `foster_visibility` in field selections
    - Ensure `foster_visibility` is fetched in all animal queries
    - Remove any null checks (field is always present)

**Testing:**

-   Migration runs successfully
-   All existing animals have `foster_visibility = 'available_now'`
-   All animals in groups have the same `foster_visibility` value
-   TypeScript types compile without errors
-   Animal queries return `foster_visibility` field (never null)
-   New animals created without explicit `foster_visibility` get default `'available_now'`

**Deliverable:** Database schema updated with non-nullable `foster_visibility`, types updated, migration complete.

---

### Phase 2: Animal Form Updates

**Goal:** Add `FosterVisibility` field to animal create/edit forms with one-directional sync from status.

**Decisions:**

-   Sync always happens when status changes (no tracking of manual vs automatic)
-   Dropdown label: "Visibility on Fosters Needed page"
-   Type names and database names stay the same (`FosterVisibility`, `foster_visibility`)

**Tasks:**

1. **Update `useAnimalForm.ts` hook:**

    - Add `fosterVisibility` state and setter
    - Add `setFosterVisibility` function
    - Implement one-directional sync logic:
        - Use `useEffect` to watch `status` changes
        - When `status` changes, automatically set `foster_visibility` based on sync rules:
            - `in_shelter` → `available_now`
            - `medical_hold` → `available_future`
            - `transferring` → `available_future`
            - `in_foster` → `not_visible`
            - `adopted` → `not_visible`
        - Sync happens automatically every time status changes (no manual tracking needed)
    - Update form state to include `foster_visibility`
    - Update validation if needed

2. **Update `AnimalForm.tsx` component:**

    - Add `FosterVisibility` dropdown field
    - Label: "Visibility on Fosters Needed page"
    - Options: "Available Now", "Available Future", "Foster Pending", "Not Visible"
    - Wire up to form state and handlers
    - Ensure dropdown is visible and functional

3. **Update `NewAnimal.tsx` and `EditAnimal.tsx`:**

    - Include `foster_visibility` in form submission
    - Ensure `foster_visibility` is saved to database
    - Handle initial values for edit mode

4. **Update `animalFormUtils.ts`:**
    - Update `animalToFormState` to include `foster_visibility`
    - Update `getEmptyFormState` to include default `foster_visibility = 'available_now'` (matches `in_shelter` status default)
    - Handle migration from `display_placement_request` if needed

**Testing:**

-   `FosterVisibility` dropdown appears in create/edit forms
-   Changing status automatically updates `foster_visibility` (one-way sync)
-   Manually changing `foster_visibility` does NOT change status
-   Form submission saves `foster_visibility` correctly
-   Edit form pre-populates `foster_visibility` correctly

**Deliverable:** Animal forms support `FosterVisibility` with one-directional sync from status.

---

### Phase 3: Group Form Updates

**Goal:** Add status and FosterVisibility dropdowns to group forms with validation.

**Tasks:**

1. **Update `useGroupForm.ts` hook:**

    - Add state for "Set all animals status" dropdown
    - Add state for "Set all animals Visibility on Fosters Needed page" dropdown
    - Add functions to set status for all selected animals
    - Add functions to set `foster_visibility` for all selected animals
    - Add validation to check for `foster_visibility` conflicts
    - Return conflict information for UI display

2. **Update `GroupForm.tsx` component:**

    - Add "Set all animals status" dropdown
        - Options: "Select..." (placeholder), then all status values
        - Default: "Select..." (empty/placeholder)
        - Helper text: "Animals in the same group are allowed to have different statuses"
        - On change: Update status for all selected animals (triggers one-way sync to `foster_visibility`)
    - Add "Set all animals Visibility on Fosters Needed page" dropdown
        - Options: "Select..." (placeholder), then all `FosterVisibility` values
        - Default: "Select..." (empty/placeholder)
        - Helper text: "Animals in a group must have the same Visibility on Fosters Needed page. This controls whether the group appears on the Fosters Needed page and what badge message is shown."
        - Show conflict warning if animals have different values
    - Add validation alert:
        - Display when `foster_visibility` conflicts exist
        - Message: "Alert: Animals in a group must have the same Visibility on Fosters Needed page"
        - Block form submission
        - Highlight the "Set all animals Visibility on Fosters Needed page" field
    - Add helper text explaining `foster_visibility` vs status

3. **Update `NewGroup.tsx` and `EditGroup.tsx`:**

    - Wire up new dropdowns to form handlers
    - On form submission, apply status and `foster_visibility` changes to all selected animals
    - Show validation errors before submission
    - Handle conflict detection and display

4. **Update group submission logic:**
    - When "Set all animals status" is used, update all selected animals' status (which triggers sync to `foster_visibility`)
    - When "Set all animals Visibility on Fosters Needed page" is used, update all selected animals' `foster_visibility` directly
    - Ensure all animals in group have same `foster_visibility` before allowing submission

**Testing:**

-   Both dropdowns appear in group create/edit forms
-   "Set all animals status" updates status for all selected animals
-   "Set all animals Visibility on Fosters Needed page" updates `foster_visibility` for all selected animals
-   Conflict detection works correctly
-   Alert appears when conflicts exist
-   Form submission is blocked when conflicts exist
-   Helper text is clear and helpful

**Deliverable:** Group forms support status and FosterVisibility bulk updates with validation.

---

### Phase 4: Cleanup & Deprecation

**Goal:** Remove or deprecate `display_placement_request` usage throughout codebase.

**Tasks:**

1. **Remove `display_placement_request` from forms:**

    - Remove from `AnimalForm.tsx` if still present
    - Remove from `useAnimalForm.ts` hook
    - Remove from `animalFormUtils.ts`

2. **Update all references:**

    - Search codebase for `display_placement_request`
    - Replace with `foster_visibility` where appropriate
    - Remove unused code

3. **Update database (optional - can be done later):**

    - Create migration to remove `display_placement_request` column (or leave unused)
    - Document that field is deprecated

4. **Update types:**
    - Mark `display_placement_request` as deprecated in TypeScript types
    - Add migration notes in comments

**Testing:**

-   No references to `display_placement_request` in active code
-   All functionality works with `foster_visibility` only
-   TypeScript compiles without errors

**Deliverable:** `display_placement_request` removed/deprecated, codebase uses `foster_visibility` exclusively.

---

### Phase 5: Update Fosters Needed Page (Deferred)

**Note:** The Fosters Needed page is not yet implemented. This phase's design decisions will need to be merged into the main development plan when the Fosters Needed page is implemented. For now, this phase is documented but deferred.

**Goal:** Update Fosters Needed page to use `foster_visibility` instead of `display_placement_request`.

**Tasks:**

1. **Find and update Fosters Needed page:**

    - Locate the page/component that displays animals needing fosters
    - Update query to filter by `foster_visibility != 'not_visible'` instead of `display_placement_request = true`
    - Update display logic to show correct badge based on `foster_visibility` value:
        - `available_now` → "Available Now" badge
        - `available_future` → "Available Future" badge
        - `foster_pending` → "Foster Pending" badge

2. **Update group display logic:**

    - Groups appear if any animal has non-`not_visible` `foster_visibility`
    - Since we enforce same `foster_visibility` for all animals in group, use that value for badge
    - Display group with appropriate badge message

3. **Update any related queries:**

    - Update `animalQueries.ts` or related query functions
    - Ensure Fosters Needed queries use `foster_visibility` field
    - Remove references to `display_placement_request` in Fosters Needed logic

4. **Update `AnimalDetail.tsx`:**
    - Remove or update any `display_placement_request` checks
    - Update to use `foster_visibility` if displaying Fosters Needed information

**Testing:**

-   Fosters Needed page shows animals with non-`not_visible` `foster_visibility`
-   Correct badges are displayed based on `foster_visibility` value
-   Groups appear correctly with appropriate badges
-   Animals with `not_visible` do not appear on Fosters Needed page

**Deliverable:** Fosters Needed page uses `foster_visibility` for display logic.

---

## Migration Notes

### Data Migration Strategy

The initial migration sets all existing animals to `'available_now'`:

```sql
UPDATE animals SET foster_visibility = 'available_now';
```

**Rationale:**

-   Simple and safe for dummy data (can be reset/modified as needed)
-   Ensures all animals in groups have the same `foster_visibility` value (satisfies group consistency requirement)
-   Matches the default status (`in_shelter`) and form default
-   Coordinators can adjust values as needed after migration

### Backward Compatibility

-   `display_placement_request` field remains in database (can be removed later)
-   Code is updated to use `foster_visibility` exclusively
-   No breaking changes to existing functionality

---

## Review Checkpoints

After each phase:

-   ✅ Code compiles without errors
-   ✅ Database migrations run successfully
-   ✅ Forms work correctly
-   ✅ Validation works as expected
-   ✅ No regressions in existing functionality
-   ✅ (Phase 5 deferred - Fosters Needed page not yet implemented)

---

## Notes

-   This change affects core functionality of the Fosters Needed page
-   Group creation/editing workflows are significantly enhanced
-   One-directional sync provides automation while maintaining flexibility
-   Enforcement of same `foster_visibility` for groups ensures consistent display
