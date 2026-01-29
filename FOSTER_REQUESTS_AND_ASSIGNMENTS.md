# Foster Requests and Assignments Feature Specification

## Overview

This feature enables the complete foster request and assignment workflow, allowing fosters to request animals/groups and coordinators to manage requests and assign fosters to animals/groups. The feature includes request tracking, assignment management, unassignment capabilities, and UI improvements for better coordinator navigation.

## Prerequisites

**Note:** The following features must be implemented before starting this feature:

1. **Reusable Search & Filter Component** - Needed for foster selection, animal/group search, and filtering
2. **Message Tagging for Animals/Groups** - Needed for linking requests and assignments to animals/groups in messages

These prerequisites ensure that foster selection, search functionality, and message tagging are available when implementing the request and assignment flows.

---

## Design Decisions

### Data Model

-   **Foster Requests Table** (`foster_requests`):

    -   `id` (UUID, primary key)
    -   `organization_id` (UUID, foreign key)
    -   `foster_profile_id` (UUID, foreign key to profiles)
    -   `animal_id` (UUID, nullable, foreign key to animals)
    -   `group_id` (UUID, nullable, foreign key to animal_groups)
    -   `status` (TEXT): `pending`, `approved`, `denied`, `cancelled`
    -   `previous_foster_visibility` (TEXT): Stores the foster_visibility value before the request was made (for reversion on denial)
    -   `message` (TEXT, nullable): Custom message from foster
    -   `coordinator_message` (TEXT, nullable): Custom message from coordinator when approving/denying
    -   `created_at` (TIMESTAMP)
    -   `updated_at` (TIMESTAMP)
    -   `resolved_at` (TIMESTAMP, nullable): When request was approved/denied/cancelled
    -   `resolved_by` (UUID, nullable, foreign key to profiles): Coordinator who resolved the request
    -   Constraint: Either `animal_id` OR `group_id` must be set (not both, not neither)

-   **Assignment Consistency:**
    -   Both `animals.current_foster_id` and `animal_groups.current_foster_id` exist for query performance
    -   Consistency maintained through application logic
    -   When assigning a group, all animals in the group are automatically assigned
    -   Groups must be requested/assigned as a whole (cannot request/assign individual animals in a group separately)

### Group Assignment Rules

-   **Groups must be requested/assigned together**: Individual animals in a group cannot be requested or assigned separately
-   If a foster tries to request an animal that's in a group, they must request the entire group
-   If a coordinator tries to assign an animal that's in a group, they must assign the entire group
-   UI should block individual requests/assignments for grouped animals with clear messaging

### Status and Visibility Changes

-   **When foster requests an animal/group:**

    -   `foster_visibility` changes to `foster_pending`
    -   Request is created with status `pending`

-   **When coordinator approves request (assigns):**

    -   `status` changes to `in_foster`
    -   `foster_visibility` changes to `not_visible`
    -   `current_foster_id` is set
    -   Request status changes to `approved`

-   **When coordinator denies request:**

    -   `foster_visibility` reverts to `previous_foster_visibility` stored in the request record
    -   Request status changes to `denied`

-   **When multiple requests exist for the same animal/group:**

    -   When one request is approved, all other pending requests for the same animal/group are auto-denied
    -   Auto-denied requests receive a message: "Your request for [Animal/Group Name] has not been approved."

-   **When unassigning:**
    -   Coordinator can choose new `status` and `foster_visibility`
    -   `current_foster_id` is cleared

### Message Integration

-   All requests and assignments include messages with animal/group tags
-   Messages are sent to the foster's conversation (foster chat)
-   Messages are visible in coordinator group chat
-   Standard message templates are provided but can be customized
-   **Messages are optional** - if no custom message is provided, the default template is sent automatically

### Direct Assignment vs Request-Based Assignment

-   **Direct assignment** (Phase 1): Coordinator assigns without a request. No request record created - this is a simpler flow for urgent situations.
-   **Request-based assignment** (Phase 3): Foster requests → Coordinator approves. Request record tracks the full lifecycle.
-   Both flows result in the same end state (animal/group assigned to foster with message sent).

---

## Phase 0: Prerequisites

**Note:** These features should be completed before starting Phase 1. They are listed here for reference but implementation details are in other milestones.

### Prerequisite 1: Reusable Search & Filter Component

**Status:** Must be completed before Phase 1

**Requirements:**

-   Search component for animals, groups, and fosters
-   Filter components for various criteria
-   Used in foster selection, animal/group search, and request filtering

### Prerequisite 2: Message Tagging for Animals/Groups

**Status:** Must be completed before Phase 1

**Requirements:**

-   Ability to tag messages with animal or group links
-   Tags appear as clickable links in messages
-   Tags link to animal/group detail pages
-   Used in request and assignment messages

---

## Phase 1: Basic Assignment from Detail Pages

**Goal:** Enable coordinators to assign fosters to animals and groups from their detail pages.

**Dependencies:** Prerequisites (Search & Filter, Message Tagging)

### Task 1.1: Create Assignment Utilities

**File:** `src/lib/assignmentUtils.ts`

**Functions:**

-   `assignGroupToFoster(groupId, fosterId, organizationId, message?)` - Assigns group and all its animals
-   `assignAnimalToFoster(animalId, fosterId, organizationId, message?)` - Assigns individual animal (with group conflict checking)
-   `checkGroupAssignmentConflict(animalId, fosterId, organizationId)` - Checks if assigning animal would conflict with group
-   `validateGroupAssignment(groupId, organizationId)` - Ensures all animals in group can be assigned together
-   All functions handle database transactions/consistency
-   All functions send messages with animal/group tags (if message tagging is available)

**Implementation Notes:**

-   When assigning a group, automatically assign all animals in the group
-   When assigning an animal in a group, check if group is assigned to different foster → block with error
-   Update `status` to `in_foster` and `foster_visibility` to `not_visible` on assignment
-   Send message to foster's conversation with animal/group tag

### Task 1.2: Create Foster Selection Component

**File:** `src/components/fosters/FosterSelector.tsx`

**Note:** This component should follow the same pattern as the animal/group selector components used in the tagging modal (TagSelectionModal.tsx). Reuse the existing `SearchInput` component for search functionality.

**Features:**

-   Modal-based selection (similar to animal/group selectors in tagging menu)
-   Search fosters by name (reuse SearchInput component)
-   Display foster name, availability status, current assignments count
-   List of fosters with click-to-select behavior
-   Returns selected foster ID and name

**Props:**

-   `isOpen: boolean`
-   `onClose: () => void`
-   `onSelect: (fosterId: string, fosterName: string) => void`
-   `excludeFosterIds?: string[]` - Optional: exclude certain fosters

### Task 1.3: Update AnimalDetail Page - Assignment UI

**File:** `src/pages/animals/AnimalDetail.tsx`

**Changes:**

-   Add "Assign Foster" button (coordinator only)
-   Display current foster assignment with link to foster detail page
-   If animal is in a group:
    -   Show group assignment info
    -   Block individual assignment with message: "This animal is in a group. Please assign the entire group instead."
    -   Link to group detail page
-   When "Assign Foster" clicked:
    -   Open foster selector (dropdown or navigate to page)
    -   On selection, show confirmation dialog with:
        -   Foster name
        -   Animal name
        -   Option to add custom message (pre-filled with standard template)
    -   On confirm, call `assignAnimalToFoster` utility
    -   Show success notification
    -   Refresh page data

### Task 1.4: Update GroupDetail Page - Assignment UI

**File:** `src/pages/animals/GroupDetail.tsx`

**Changes:**

-   Add "Assign Foster" button (coordinator only)
-   Display current foster assignment with link to foster detail page
-   Show count of animals in group
-   When "Assign Foster" clicked:
    -   Open foster selector (dropdown or navigate to page)
    -   On selection, show confirmation dialog with:
        -   Foster name
        -   Group name
        -   Number of animals in group
        -   Option to add custom message (pre-filled with standard template)
    -   On confirm, call `assignGroupToFoster` utility
    -   Show success notification: "Group and [X] animals assigned to [Foster Name]"
    -   Refresh page data

### Task 1.5: Create Assignment Confirmation Dialog

**File:** `src/components/animals/AssignmentConfirmationDialog.tsx`

**Features:**

-   Shows assignment details (foster name, animal/group name, count if group)
-   Text area for custom message (pre-filled with standard template)
-   Standard message template: "Hi [Foster Name], [Animal/Group Name] has been assigned to you. [Custom message]"
-   "Confirm" and "Cancel" buttons
-   Handles message tagging (if available)

**Testing:**

-   Can assign individual animal to foster
-   Can assign group to foster (all animals auto-assigned)
-   Assignment blocked for individual animals in groups
-   Status and visibility update correctly
-   Message sent to foster's conversation
-   React Query cache updates correctly

**Deliverable:** Coordinators can assign fosters to animals and groups from detail pages with proper validation and messaging.

---

## Phase 2: Foster Request Flow

**Goal:** Enable fosters to request animals/groups from the Fosters Needed page and detail pages.

**Dependencies:** Phase 1 (Assignment utilities), Prerequisites (Message Tagging)

### Task 2.1: Create Foster Request Utilities

**File:** `src/lib/fosterRequestUtils.ts`

**Functions:**

-   `createFosterRequest(animalId | groupId, fosterId, organizationId, message?)` - Creates a new request
-   `checkExistingRequest(animalId | groupId, fosterId, organizationId)` - Checks if foster already has pending request
-   `updateRequestStatus(requestId, status, coordinatorId, message?)` - Updates request status (approve/deny)
-   All functions handle database transactions
-   All functions update `foster_visibility` appropriately

**Implementation Notes:**

-   When creating request for animal in group, automatically create request for entire group
-   When creating request, set `foster_visibility` to `foster_pending`
-   Check for existing pending requests before creating new one
-   Send message to foster's conversation with animal/group tag

### Task 2.2: Update AnimalDetail Page - Request Button (Foster View)

**File:** `src/pages/animals/AnimalDetail.tsx`

**Changes:**

-   Add "Request to Foster" button (foster only, only visible if `foster_visibility != 'not_visible'` and `foster_visibility != 'foster_pending'`)
-   Button should be hidden/replaced with "Requested" badge if foster already has pending request
-   Button should be disabled if animal is already assigned to this foster
-   When clicked:
    -   Check if animal is in a group
    -   If in group, show dialog: "This animal is part of a group. You'll be requesting the entire group: [Group Name]. Continue?"
    -   Show request dialog with:
        -   Animal/group name
        -   Text area for optional custom message (placeholder shows standard template)
        -   Standard template: "Hi, I'm interested in fostering [Animal/Group Name]."
    -   On confirm, store `previous_foster_visibility`, create request and update visibility to `foster_pending`
    -   Show success notification
    -   Replace button with "Requested" badge (clickable to cancel)

### Task 2.3: Update GroupDetail Page - Request Button (Foster View)

**File:** `src/pages/animals/GroupDetail.tsx`

**Changes:**

-   Add "Request to Foster" button (foster only, only visible if group visibility != 'not_visible' and != 'foster_pending')
-   Button hidden/replaced with "Requested" badge if foster already has pending request for this group
-   Similar behavior to AnimalDetail request button
-   Show group name and animal count in request dialog
-   On success, replace button with "Requested" badge (clickable to cancel)

### Task 2.4: Update Cards - "Requested" Badge for Fosters

**Files:** `src/components/animals/AnimalCard.tsx`, `src/components/animals/GroupCard.tsx`

**Badge Visibility Logic:**

-   **"Requested" badge**: Only visible to the foster who has a pending request for that animal/group
-   **"Foster Pending" badge**: Visible to coordinators and other fosters (when `foster_visibility === 'foster_pending'`)
-   These badges are mutually exclusive from the requester's perspective (requester sees "Requested", others see "Foster Pending")

**Changes:**

-   Add "Requested" badge visible only to the foster who has a pending request for that animal/group
-   Badge appears in the same location as other visibility badges
-   Clicking the "Requested" badge opens a cancel confirmation dialog
-   Cancel dialog shows animal/group name and "Cancel Request" / "Keep Request" buttons
-   On cancel, request status changes to `cancelled` and visibility reverts to `previous_foster_visibility`

**Props changes:**

-   Add optional `hasPendingRequest?: boolean` prop to indicate if current user has a pending request
-   Add optional `onCancelRequest?: () => void` callback for cancel action
-   Add optional `requestId?: string` prop to identify the request for cancellation

### Task 2.5: Create Request Dialog Component

**File:** `src/components/fosters/FosterRequestDialog.tsx`

**Features:**

-   Shows animal/group information
-   Text area for optional custom message (placeholder shows default template)
-   "Submit Request" and "Cancel" buttons
-   Handles group detection and confirmation
-   Creates request via `createFosterRequest` utility
-   Stores `previous_foster_visibility` in request record before updating to `foster_pending`
-   Updates visibility to `foster_pending`

### Task 2.6: Create Cancel Request Dialog Component

**File:** `src/components/fosters/CancelRequestDialog.tsx`

**Features:**

-   Shows animal/group name
-   Confirmation message: "Are you sure you want to cancel your request for [Animal/Group Name]?"
-   "Cancel Request" and "Keep Request" buttons
-   On cancel, updates request status to `cancelled` and reverts visibility to `previous_foster_visibility`

**Testing:**

-   Fosters can request individual animals from detail pages
-   Fosters can request groups from detail pages
-   Requesting animal in group automatically requests entire group
-   Duplicate requests are prevented
-   `previous_foster_visibility` stored in request record
-   Visibility updates to `foster_pending`
-   Message sent to foster's conversation (default if no custom message)
-   "Requested" badge appears on cards/detail pages for foster who requested
-   "Foster Pending" badge appears for coordinators and other fosters
-   Clicking "Requested" badge opens cancel dialog
-   Fosters can cancel pending requests via badge click
-   Cancelled requests revert visibility to `previous_foster_visibility`

**Deliverable:** Fosters can request animals/groups from detail pages with proper validation and messaging. Fosters can cancel requests by clicking the "Requested" badge on cards or detail pages.

---

## Phase 3: Coordinator Request Management

**Goal:** Enable coordinators to view, manage, and respond to foster requests in a way that keeps assignments, visibility, and messaging consistent and auditable.

**Dependencies:** Phase 2 (Foster Requests), Phase 1 (Assignment utilities)

### Additional Design Decisions for Phase 3

-   **Single source of truth for request state-changes:**  
    All approve/deny operations should go through **server-side functions (RPCs)** so that:
    -   Assignment, request status, visibility, and messaging stay in sync
    -   RLS is respected and concurrency is handled atomically

-   **MVP scope - pending requests only:**
    -   Phase 3 focuses on **pending requests only** (no history/audit views)
    -   Detail pages (Animal/Group) show **pending requests** at the top for direct action
    -   Foster Requests page shows **pending requests** with search/filter/pagination

-   **Group vs single animal behavior:**
    -   If an animal is in a group, requests are managed **at the group level**
    -   Animal detail surfaces that group requests exist but does not duplicate actions that belong on the group

-   **Dashboard behavior:**
    -   Fosters see **their own** pending requests (implemented in Phase 2+)
    -   Coordinators see an **org-wide Pending Foster Requests** summary with a link to the full Foster Requests page

-   **Message patterns:**
    -   Approval and denial dialogs follow the same 2-line helper text pattern as request and assignment dialogs:
        -   Line 1: Context-specific hint about what to include
        -   Line 2: "If no message is provided, the default message will be sent."

-   **Detail page layout:**
    -   **Coordinator view:** "Placement & Requests" section at top showing:
        -   Current foster assignment (if assigned) with link to FosterDetail
        -   Pending requests below (if any): Foster name (link), Request date, Accept/Deny buttons
    -   **Foster view:** Request actions moved to top:
        -   "Request to Foster" button (smaller, less prominent)
        -   "You have a pending request..." message/cancel link in same area

-   **Foster Requests page:**
    -   Uses `AnimalCard` / `GroupCard` directly (no wrapper component)
    -   Cards show badge: "Requested by [Foster Name]" or "X pending requests" if multiple
    -   Clicking card navigates to detail page where actions occur

-   **Global filter naming:**
    -   Replace ambiguous "Sort: Oldest First/Newest First" with clearer labels:
        -   **"Date created: newest first"** / **"Date created: oldest first"** (for animals/groups/fosters lists)
        -   **"Request date: newest first"** / **"Request date: oldest first"** (for Foster Requests page)
    -   Apply consistently across all list pages

-   **"Has pending request" filter (coordinator-only):**
    -   Optional filter chip/toggle available to coordinators on:
        -   Animals list page
        -   Groups list page
        -   Fosters Needed page
        -   Tag selection modal (future enhancement)
    -   Shows only animals/groups with ≥1 pending foster request
    -   Implemented via helper query that returns IDs with pending requests, then filters main list queries

---

### Task 3.1: Backend Request State-Change Utilities (RPCs)

**File:** `supabase/migrations/*_foster_request_transitions.sql`  
**Backend functions (Postgres, exposed via Supabase RPC):**

-   `approve_foster_request(p_organization_id, p_request_id, p_coordinator_id, p_message TEXT DEFAULT NULL)`

    -   Preconditions:
        -   Request exists, belongs to `p_organization_id`, and has `status = 'pending'`
        -   Caller is a coordinator in the same organization (enforced via function body / RLS-safe wrapper)
    -   Behavior:
        -   If request is for an **animal**:
            -   **Implements assignment logic directly in SQL** (cannot call TypeScript functions):
                -   Updates `animals.current_foster_id = foster_profile_id`
                -   Updates `animals.status = 'in_foster'`
                -   Updates `animals.foster_visibility = 'not_visible'`
                -   Validates animal is not in a group (or if in group, handles group assignment)
        -   If request is for a **group**:
            -   **Implements group assignment logic directly in SQL**:
                -   Updates `animal_groups.current_foster_id = foster_profile_id`
                -   Updates all animals in the group:
                    -   `animals.current_foster_id = foster_profile_id`
                    -   `animals.status = 'in_foster'`
                    -   `animals.foster_visibility = 'not_visible'`
        -   Updates the approved request:
            -   `status = 'approved'`
            -   `resolved_at = NOW()`
            -   `resolved_by = p_coordinator_id`
            -   `coordinator_message = NULLIF(BTRIM(COALESCE(p_message, '')), '')`
        -   **Auto-denies other pending requests** for the same animal/group:
            -   Sets `status = 'denied'`, `resolved_at = NOW()`, `resolved_by = p_coordinator_id`
            -   Leaves `previous_foster_visibility` unchanged (already holds the pre-request visibility)
            -   **Note:** Message sending for auto-denials is handled by the frontend after RPC returns (see implementation notes)
        -   **Returns request data** including animal/group info and foster info for frontend message sending
        -   **Note:** Assignment message is sent by the frontend after RPC succeeds (using existing `sendAssignmentMessage` pattern from `assignmentUtils`)

-   `deny_foster_request(p_organization_id, p_request_id, p_coordinator_id, p_message TEXT DEFAULT NULL)`

    -   Preconditions:
        -   Request exists, belongs to `p_organization_id`, and has `status = 'pending'`
        -   Caller is a coordinator in the same organization
    -   Behavior:
        -   Sets:
            -   `status = 'denied'`
            -   `resolved_at = NOW()`
            -   `resolved_by = p_coordinator_id`
            -   `coordinator_message = NULLIF(BTRIM(COALESCE(p_message, '')), '')`
        -   Reverts `foster_visibility` for the underlying animal/group back to `previous_foster_visibility`
            -   If animal: updates `animals.foster_visibility = previous_foster_visibility`
            -   If group: updates all animals in group to `previous_foster_visibility`
        -   **Returns request data** including animal/group info and foster info for frontend message sending
        -   **Note:** Denial message is sent by the frontend after RPC succeeds (using existing message sending pattern)

**Implementation Notes:**

-   **RPCs cannot call TypeScript functions**: RPCs are server-side SQL functions and must implement assignment logic directly in PLpgSQL, following the same patterns as `assignmentUtils.ts` but in SQL.
-   **Message sending pattern**: RPCs return success with request data (including animal/group names and foster info). The frontend then sends messages using the existing `sendAssignmentMessage` / `sendRequestMessage` pattern from `assignmentUtils.ts` and `fosterRequestUtils.ts`. This keeps message logic in TypeScript where it can reuse existing utilities.
-   **Race condition handling**: Both functions check `status = 'pending'` at the start and raise a clear error if the request is no longer pending. The frontend catches this error and shows "This request is no longer pending" with a refetch option.
-   **Security**: Both functions are `SECURITY DEFINER` with checks that:
    -   The caller (`auth.uid()`) belongs to the organization
    -   The caller has `role = 'coordinator'` in their profile
-   **Return value**: Both functions return the updated `foster_requests` record with joined animal/group data (via `RETURNS TABLE` or JSON) so the frontend can access names for message templates.

---

### Task 3.2: Create Foster Requests Page (Coordinator View)

**File:** `src/pages/fosters/FosterRequests.tsx`

**Page Title:** "Foster Requests"

**Features:**

-   Coordinator-only page listing **pending** foster requests for the organization
-   Follows same pattern as `FostersNeeded` page:
    -   Same search bar (`SearchInput` component)
    -   Same filter chips system
    -   Same pagination defaults and controls
    -   Mixed grid of animals and groups (reuses `AnimalCard` / `GroupCard`)
-   Filters:
    -   Status: Only `pending` (no history filters for MVP)
    -   Priority: Optional "High priority only" filter
    -   **"Has pending request"** filter: Coordinator-only filter option to show only animals/groups with pending requests (can be added to Animals list, Groups list, Fosters Needed, etc.)
-   Sorting:
    -   Default: **Request date: newest first**
    -   Option: **Request date: oldest first**
    -   Filter label: Use "Request date: newest first/oldest first" (not ambiguous "Sort: newest/oldest")
-   Cards:
    -   Uses `AnimalCard` / `GroupCard` directly
    -   Each card shows a badge overlay:
        -   If single request: "Requested by [Foster Name]" (clickable, links to FosterDetail)
        -   If multiple requests: "X pending requests"
    -   Clicking card navigates to animal/group detail page where Accept/Deny actions occur
-   Empty state when no matching requests:
    -   Example: "No pending foster requests."

**Data utilities:**

-   Add `fetchFosterRequests` and `fetchFosterRequestsCount` to `src/lib/fosterRequestQueries.ts`:
    -   Accept filters `{ sortBy?, sortDirection?, limit?, offset? }` (status always `pending` for MVP)
    -   Returns requests with animal/group data joined for card rendering:
        -   Use Supabase `.select()` with joins to fetch:
            -   Request data (`foster_requests.*`)
            -   Animal data (`animals!foster_requests_animal_id_fkey(id, name, photos, status, priority, date_of_birth, group_id, foster_visibility, created_at)`)
            -   Group data (`animal_groups!foster_requests_group_id_fkey(id, name, group_photos, animal_ids, priority, created_at)`)
            -   Foster profile data (`profiles!foster_requests_foster_profile_id_fkey(id, full_name, email)`)
    -   **For coordinators only** (RLS enforces org/role)
    -   Returns a combined list where each item has:
        -   Request metadata (id, status, created_at, foster_profile_id, etc.)
        -   Either `animal` OR `group` data (not both)
        -   Foster name for badge display
    -   Sort by `created_at` (newest first by default, oldest first if specified)

**Layout:**

-   Grid layout identical to `FostersNeeded` page
-   Coordinator-only route and navigation entry

---

---

### Task 3.3: Update AnimalDetail Page – Placement & Requests (Coordinator View)

**File:** `src/pages/animals/AnimalDetail.tsx`

**Changes (coordinator-only UI):**

-   Add **"Placement & Requests"** section at the **top** of the page (above animal details):
    -   **Current Foster** (if assigned):
        -   Shows: "Current foster: [Foster Name]" (clickable link to `/fosters/${current_foster_id}`)
        -   Fetch foster name using existing `fetchFosterById` query pattern
    -   **Pending Requests** (if any):
        -   Shows **pending requests** for:
            -   This animal directly, if it is **not in a group** (use `fetchAllPendingRequestsForAnimal`)
            -   The **group** instead, if the animal is in a group (use `fetchAllPendingRequestsForGroup` with note: "Requests for this animal are managed at the group level.")
        -   For each request (simple list):
            -   Fetch foster name using `fetchFosterById(request.foster_profile_id)` query
            -   Display: Foster name (clickable link to `/fosters/${request.foster_profile_id}`)
            -   Request date (formatted using `formatDateForDisplay`)
            -   "Accept Request" button → opens `RequestApprovalDialog`
            -   "Deny" button → opens `RequestDenialDialog`
-   Actions:
    -   "Accept Request":
        -   Opens `RequestApprovalDialog`:
            -   Pre-selects the requesting foster and animal/group
            -   Shows default approval/assignment message template with optional custom text
            -   Follows same 2-line helper text pattern as assignment dialogs
        -   On confirm:
            -   Calls the `approve_foster_request` RPC via `supabase.rpc()`
            -   On success, sends assignment message using `sendAssignmentMessage` from `assignmentUtils.ts` (reuse existing pattern)
            -   Handles race condition errors (request no longer pending) gracefully
    -   "Deny":
        -   Opens `RequestDenialDialog`:
            -   Shows animal/group + foster info
            -   Uses default denial template with optional custom text
            -   Follows same 2-line helper text pattern as other dialogs
        -   On confirm:
            -   Calls the `deny_foster_request` RPC via `supabase.rpc()`
            -   On success, sends denial message using `sendRequestMessage` pattern (similar to `fosterRequestUtils.ts`)
            -   Handles race condition errors gracefully
-   After any approve/deny:
    -   Invalidate relevant React Query caches using `queryClient.invalidateQueries()`:
        -   Animal detail: `["animals", user.id, organizationId, animalId]`
        -   Group detail (if applicable): `["groups", user.id, organizationId, groupId]`
        -   Foster detail for the affected foster: `["fosters", user.id, organizationId, fosterId]`
        -   Foster Requests page queries: `["foster-requests", ...]`
        -   Dashboard coordinator pending requests: `["org-pending-requests", ...]`
        -   Pending requests for animal/group: `["pending-requests-animal", ...]` / `["pending-requests-group", ...]`

**Changes (foster view):**

-   Move **request actions to top** of page:
    -   "Request to Foster" button (smaller, less prominent styling)
    -   "You have a pending request for this animal. Cancel request" message/link in same area
    -   Both positioned near top, above animal details

---

### Task 3.4: Update GroupDetail Page – Placement & Requests (Coordinator View)

**File:** `src/pages/animals/GroupDetail.tsx`

**Changes (coordinator-only UI):**

-   Add **"Placement & Requests"** section at the **top** of the page (above group details):
    -   **Current Foster** (if assigned):
        -   Shows: "Current foster: [Foster Name]" (clickable link to `/fosters/${current_foster_id}`)
        -   Fetch foster name using existing `fetchFosterById` query pattern
    -   **Pending Requests** (if any):
        -   Lists all **pending requests** for the group (use `fetchAllPendingRequestsForGroup`)
        -   For each request (simple list):
            -   Fetch foster name using `fetchFosterById(request.foster_profile_id)` query
            -   Display: Foster name (clickable link to `/fosters/${request.foster_profile_id}`)
            -   Request date (formatted using `formatDateForDisplay`)
            -   "Accept Request" button → opens `RequestApprovalDialog`
            -   "Deny" button → opens `RequestDenialDialog`
-   Actions:
    -   "Accept Request":
        -   Opens `RequestApprovalDialog` with the group + requesting foster
        -   On confirm:
            -   Calls `approve_foster_request` RPC via `supabase.rpc()`
            -   On success, sends assignment message using `sendAssignmentMessage` from `assignmentUtils.ts`
            -   Handles race condition errors gracefully
    -   "Deny":
        -   Opens `RequestDenialDialog`
        -   On confirm:
            -   Calls `deny_foster_request` RPC via `supabase.rpc()`
            -   On success, sends denial message using `sendRequestMessage` pattern
            -   Handles race condition errors gracefully
-   Cache invalidation identical to AnimalDetail (group, animals, foster, requests page, dashboard)

**Changes (foster view):**

-   Move **request actions to top** of page:
    -   "Request to Foster" button (smaller, less prominent styling)
    -   "You have a pending request for this group. Cancel request" message/link in same area
    -   Both positioned near top, above group details

---

### Task 3.5: Create Request Approval/Denial Dialogs

**Files:**

-   `src/components/fosters/RequestApprovalDialog.tsx`
-   `src/components/fosters/RequestDenialDialog.tsx`

**RequestApprovalDialog Features:**

-   Reuses the assignment confirmation dialog pattern from Phase 1 (`AssignmentConfirmationDialog.tsx`):
    -   Shows foster name, animal/group name, and group animal count (if applicable)
    -   Textarea for optional custom message:
        -   Placeholder shows the **standard assignment/approval template**: "Hi [Foster Name], [Animal/Group Name] has been assigned to you."
        -   Helper text (2-line pattern, consistent with request/assignment dialogs):
            -   Line 1: "Add any additional context or next steps for the foster (optional)."
            -   Line 2: "If no message is provided, the default message will be sent."
    -   On confirm:
        -   Calls `approve_foster_request` RPC via `supabase.rpc('approve_foster_request', { ... })`
        -   On success, sends assignment message using `sendAssignmentMessage` from `assignmentUtils.ts` with animal/group tag
        -   Handles errors (including race conditions) and shows appropriate error messages
        -   Shows success notification on completion
        -   Parent component handles cache invalidation

**RequestDenialDialog Features:**

-   Shows:
    -   Animal/group name
    -   Foster name
    -   Request date (formatted using `formatDateForDisplay`)
-   Textarea for optional custom message:
    -   Placeholder uses the standard denial template:
        -   "Thank you for your interest in fostering [Animal/Group Name]. Unfortunately, we're unable to assign them to you at this time."
    -   Helper text (2-line pattern, consistent with other dialogs):
        -   Line 1: "Add any information about why you're denying this request (optional)."
        -   Line 2: "If no message is provided, the default message will be sent."
-   On confirm:
    -   Calls `deny_foster_request` RPC via `supabase.rpc('deny_foster_request', { ... })`
    -   On success, sends denial message using `sendRequestMessage` pattern (similar to `fosterRequestUtils.ts`) with animal/group tag
    -   Handles errors (including race conditions) and shows appropriate error messages
    -   Shows success notification
    -   Parent component handles cache invalidation

---

### Task 3.6: Update Dashboard – Coordinator Pending Requests Section

**File:** `src/pages/Dashboard.tsx`

**Changes (coordinator-only view):**

-   Add an **org-wide "Pending Foster Requests" section** (only when `isCoordinator`):
    -   Shows:
        -   Total count of pending requests (e.g., "5 pending foster requests")
        -   Up to 5 most recent pending requests as compact cards:
            -   Animal/group name + photo
            -   Foster name who requested
            -   Request date
    -   Includes a "View All Requests" link to the full `FosterRequests` page
-   Data:
    -   Uses a coordinator-only query (e.g., `fetchOrgPendingRequests({ limit: 5 })`) added to `fosterRequestQueries.ts`:
        -   Similar to `fetchFosterRequests` but with `limit: 5` and no pagination
        -   Returns requests with animal/group data and foster names joined
        -   Query key: `["org-pending-requests", user.id, organizationId]`
    -   Behavior:
    -   Section is hidden when there are **no pending requests** and not loading
    -   On approve/deny from any entry point, this section refreshes via React Query cache invalidation
    -   Each compact card shows:
        -   Animal/group photo (first photo from `photos` or `group_photos`)
        -   Animal/group name (link to detail page)
        -   Foster name who requested (link to `/fosters/${foster_profile_id}`)
        -   Request date (formatted, e.g., "2 days ago" or date)

**Note:**  
For foster users, keep the existing **"Pending Requests"** (my requests) and **"Currently Fostering"** sections added in Phase 2+. Coordinators see the org-wide section instead of the foster-centric pending list.

---

**Testing (Phase 3):**

-   Coordinators can:
    -   View all pending requests on the Foster Requests page (animals and groups mixed)
    -   Search and filter requests (priority, etc.)
    -   Sort by request date (newest first / oldest first)
    -   See request badges on cards ("Requested by [Name]" or "X pending requests")
    -   Navigate to detail pages from cards to take action
    -   Approve a request from AnimalDetail / GroupDetail and see:
        -   Animal/group assignment updated
        -   Request status → `approved`
        -   Other pending requests for that animal/group auto-denied with messages
    -   Deny a request and see:
        -   Request status → `denied`
        -   `foster_visibility` reverted to `previous_foster_visibility`
        -   Denial message sent
    -   See "Placement & Requests" section at top of detail pages
    -   See concise pending-requests summary on Dashboard (coordinator-only)
-   Fosters can:
    -   See request actions moved to top of detail pages
    -   "Request to Foster" button is smaller and less prominent
-   Messages:
    -   All approvals/denials send messages with appropriate animal/group tags
    -   Default templates are used when no custom message is provided
    -   Approval/denial dialogs follow same 2-line helper text pattern as request/assignment dialogs

**Deliverable:**  
Coordinators can reliably view, approve, and deny foster requests using a single, consistent backend for request state-changes, with clear messaging and accurate assignment/visibility updates. All actions occur on detail pages; the Foster Requests page serves as a discovery/navigation tool.

**Implementation Patterns & Key Decisions:**

1. **RPC Pattern**: 
   - RPCs handle database state changes (assignment, visibility, request status) atomically
   - RPCs return request data with animal/group/foster info for frontend message sending
   - Frontend sends messages after RPC succeeds using existing `sendAssignmentMessage` / `sendRequestMessage` utilities
   - This separation keeps message logic in TypeScript where it can reuse existing patterns

2. **Query Pattern**:
   - Use Supabase `.select()` with foreign key joins to fetch related data in one query
   - Query keys follow pattern: `["resource-type", userId, organizationId, ...specificIds]`
   - Cache invalidation uses `queryClient.invalidateQueries()` with matching query key patterns

3. **Error Handling**:
   - RPCs raise clear errors for race conditions (request no longer pending)
   - Frontend catches errors and shows user-friendly messages with refetch option
   - Use try/catch blocks around RPC calls and message sending

4. **Component Patterns**:
   - Dialogs follow the same pattern as `AssignmentConfirmationDialog` and `FosterRequestDialog`
   - Use 2-line helper text pattern consistently across all dialogs
   - Reuse existing UI components (`Button`, `Textarea`, etc.)

5. **Data Fetching**:
   - Use React Query `useQuery` for fetching pending requests
   - Fetch foster names separately using `fetchFosterById` when needed for display
   - Consider batching foster name fetches if displaying many requests

---

## Phase 4: Unassignment Functionality

**Goal:** Enable coordinators to unassign animals/groups from fosters with status and visibility control.

**Dependencies:** Phase 1 (Assignment) - Can be developed in parallel with Phases 2-3

### Task 4.1: Create Unassignment Utilities

**File:** `src/lib/assignmentUtils.ts` (add to existing file)

**Functions:**

-   `unassignGroup(groupId, organizationId, newStatus?, newVisibility?, message?)` - Unassigns group and all animals
-   `unassignAnimal(animalId, organizationId, newStatus?, newVisibility?, message?)` - Unassigns individual animal
-   Both functions:
    -   Clear `current_foster_id`
    -   Update `status` and `foster_visibility` (if provided)
    -   Send message to foster's conversation (if message provided)
    -   Handle group consistency (if unassigning animal in group)

### Task 4.2: Create Unassignment Dialog

**File:** `src/components/animals/UnassignmentDialog.tsx`

**Features:**

-   Shows current assignment information (foster name, animal/group name)
-   Status dropdown (pre-selected with `in_shelter` as default)
-   Visibility dropdown (pre-selected with `available_now` as default)
-   Text area for optional custom message (placeholder shows default template)
-   Default message sent if no custom message: "Hi [Foster Name], [Animal/Group Name] is no longer assigned to you."
-   "Confirm Unassignment" and "Cancel" buttons
-   Warning if unassigning animal in group: "This will unassign the entire group. Continue?"

### Task 4.3: Update AnimalDetail Page - Unassignment UI

**File:** `src/pages/animals/AnimalDetail.tsx`

**Changes:**

-   Add "Unassign" button (coordinator only, only visible if animal is assigned)
-   If animal is in a group:
    -   Show warning: "This animal is in a group. Unassigning will unassign the entire group."
    -   Block individual unassignment
-   When clicked:
    -   Open unassignment dialog
    -   On confirm, call `unassignAnimal` or `unassignGroup` utility
    -   Show success notification
    -   Refresh page data

### Task 4.4: Update GroupDetail Page - Unassignment UI

**File:** `src/pages/animals/GroupDetail.tsx`

**Changes:**

-   Add "Unassign" button (coordinator only, only visible if group is assigned)
-   When clicked:
    -   Open unassignment dialog
    -   Show confirmation: "This will unassign the group and all [X] animals. Continue?"
    -   On confirm, call `unassignGroup` utility
    -   Show success notification
    -   Refresh page data

**Testing:**

-   Can unassign individual animals
-   Can unassign groups (all animals unassigned)
-   Status and visibility update correctly
-   Individual unassignment blocked for animals in groups
-   Messages sent to foster's conversation
-   React Query cache updates correctly

**Deliverable:** Coordinators can unassign animals/groups with control over status, visibility, and messaging.

---

## Phase 5: UI Improvements

**Goal:** Improve coordinator navigation and request visibility.

**Dependencies:** Phases 2-4 (all core functionality complete)

### Task 5.1: Update NavigationBar - Hamburger Menu for Coordinators

**File:** `src/components/NavigationBar.tsx`

**Changes:**

-   For coordinators on small screens (mobile/tablet):
    -   Replace horizontal nav links with hamburger menu icon
    -   Hamburger menu opens dropdown/sidebar with all navigation links
    -   Include: Animals, Groups, Fosters Needed, Fosters, Foster Requests
-   For larger screens: Keep horizontal navigation (current behavior)
-   Use responsive breakpoints (e.g., `md:` for desktop, below for mobile)
-   Hamburger icon: Use Heroicons `Bars3Icon`

**Implementation:**

-   Add state for menu open/closed
-   Use Tailwind responsive classes: `hidden md:flex` for desktop nav, `md:hidden` for hamburger
-   Dropdown/sidebar should overlay or slide in from side
-   Close menu when link is clicked or outside click

### Task 5.2: Add Foster Requests Link to Navigation

**File:** `src/components/NavigationBar.tsx`

**Changes:**

-   Add "Foster Requests" link (coordinator only)
-   Link to `/foster-requests`
-   Show request count badge if there are pending requests (optional enhancement)
-   Include in hamburger menu for mobile

### Task 5.3: Add Route for Foster Requests Page

**File:** `src/App.tsx`

**Changes:**

-   Add route `/foster-requests` (coordinator only)
-   Use `CoordinatorOnlyRoute` wrapper
-   Connect to `FosterRequests` component

### Task 5.4: Update Badge Links

**Files:** `src/components/animals/AnimalCard.tsx`, `src/components/animals/GroupCard.tsx`

**Changes:**

-   **"Requested" badge** (for foster who requested): Already clickable to open cancel dialog (implemented in Phase 2)
-   **"Foster Pending" badge** (for coordinators): Make clickable, link to `/foster-requests`
-   Add hover state to indicate clickability on both badges

**Testing:**

-   Hamburger menu appears on small screens for coordinators
-   All navigation links accessible in hamburger menu
-   Foster Requests link visible to coordinators
-   Badge links work correctly
-   Responsive behavior works on various screen sizes

**Deliverable:** Improved coordinator navigation with hamburger menu and Foster Requests access.

---

## Database Schema

### New Table: `foster_requests`

```sql
CREATE TABLE foster_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    foster_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    animal_id UUID REFERENCES animals(id) ON DELETE CASCADE,
    group_id UUID REFERENCES animal_groups(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'denied', 'cancelled')),
    previous_foster_visibility TEXT NOT NULL CHECK (previous_foster_visibility IN ('available_now', 'available_future', 'foster_pending', 'not_visible')),
    message TEXT,
    coordinator_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES profiles(id),
    CONSTRAINT foster_requests_animal_or_group CHECK (
        (animal_id IS NOT NULL AND group_id IS NULL) OR
        (animal_id IS NULL AND group_id IS NOT NULL)
    )
);

-- Indexes for query performance
CREATE INDEX idx_foster_requests_organization ON foster_requests(organization_id);
CREATE INDEX idx_foster_requests_foster ON foster_requests(foster_profile_id);
CREATE INDEX idx_foster_requests_animal ON foster_requests(animal_id) WHERE animal_id IS NOT NULL;
CREATE INDEX idx_foster_requests_group ON foster_requests(group_id) WHERE group_id IS NOT NULL;
CREATE INDEX idx_foster_requests_status ON foster_requests(status);

-- Partial unique index: only one pending request per foster per animal/group
-- Note: UNIQUE constraint syntax with WHERE clause is not valid in PostgreSQL.
-- Must use CREATE UNIQUE INDEX with WHERE clause instead.
CREATE UNIQUE INDEX idx_foster_requests_unique_pending_animal
    ON foster_requests(organization_id, foster_profile_id, animal_id)
    WHERE status = 'pending' AND animal_id IS NOT NULL;

CREATE UNIQUE INDEX idx_foster_requests_unique_pending_group
    ON foster_requests(organization_id, foster_profile_id, group_id)
    WHERE status = 'pending' AND group_id IS NOT NULL;
```

### RLS Policies

```sql
-- Coordinators can see all requests in their organization
CREATE POLICY "Coordinators can view all requests in organization"
    ON foster_requests FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'coordinator'
        )
    );

-- Fosters can view their own requests
CREATE POLICY "Fosters can view their own requests"
    ON foster_requests FOR SELECT
    USING (
        foster_profile_id = auth.uid()
        AND organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Coordinators can create requests (for testing/admin purposes)
CREATE POLICY "Coordinators can create requests"
    ON foster_requests FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'coordinator'
        )
    );

-- Fosters can create their own requests
CREATE POLICY "Fosters can create their own requests"
    ON foster_requests FOR INSERT
    WITH CHECK (
        foster_profile_id = auth.uid()
        AND organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Coordinators can update requests (approve/deny)
CREATE POLICY "Coordinators can update requests"
    ON foster_requests FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'coordinator'
        )
    );

-- Fosters can update their own pending requests (cancel)
CREATE POLICY "Fosters can cancel their own requests"
    ON foster_requests FOR UPDATE
    USING (
        foster_profile_id = auth.uid()
        AND status = 'pending'
        AND organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    )
    WITH CHECK (
        status = 'cancelled'
    );
```

---

## Message Templates

### Standard Request Message (Foster → Coordinator)

```
Hi, I'm interested in fostering [Animal/Group Name]. [Custom message]
```

### Standard Assignment Message (Coordinator → Foster)

```
Hi [Foster Name], [Animal/Group Name] has been assigned to you. [Custom message]
```

### Standard Denial Message (Coordinator → Foster)

```
Thank you for your interest in fostering [Animal/Group Name]. Unfortunately, we're unable to assign them to you at this time. [Custom message]
```

### Standard Unassignment Message (Coordinator → Foster)

```
Hi [Foster Name], [Animal/Group Name] is no longer assigned to you. [Custom message]
```

### Auto-Denial Message (System → Foster)

```
Your request for [Animal/Group Name] has not been approved.
```

---

## Testing Checklist

### Phase 1: Basic Assignment

-   [ ] Can assign individual animal to foster from detail page
-   [ ] Can assign group to foster from detail page
-   [ ] Assignment blocked for individual animals in groups
-   [ ] Status and visibility update correctly on assignment
-   [ ] Message sent to foster's conversation with animal/group tag
-   [ ] React Query cache updates correctly

### Phase 2: Foster Requests

-   [ ] Fosters can request individual animals from detail pages
-   [ ] Fosters can request groups from detail pages
-   [ ] Requesting animal in group automatically requests entire group
-   [ ] Duplicate requests are prevented
-   [ ] `previous_foster_visibility` stored in request record
-   [ ] Visibility updates to `foster_pending` on request
-   [ ] Message sent to foster's conversation (default if no custom message)
-   [ ] "Requested" badge appears on cards for foster who requested
-   [ ] Clicking "Requested" badge opens cancel dialog
-   [ ] Fosters can cancel pending requests via badge
-   [ ] Cancelled requests revert visibility to `previous_foster_visibility`

### Phase 3: Coordinator Request Management

-   [ ] Coordinators can view all pending requests on Foster Requests page
-   [ ] Foster Requests page uses AnimalCard/GroupCard with request badges
-   [ ] Badges show "Requested by [Name]" or "X pending requests" correctly
-   [ ] Search and filter work on Foster Requests page (same as FostersNeeded)
-   [ ] Sorting by "Request date: newest first/oldest first" works
-   [ ] "Placement & Requests" section appears at top of AnimalDetail/GroupDetail (coordinator view)
-   [ ] Current foster info shown at top when assigned
-   [ ] Pending requests list shows foster name (link), request date, Accept/Deny buttons
-   [ ] Can approve requests from detail pages (assigns foster and updates status/visibility)
-   [ ] Can deny requests from detail pages (reverts visibility to `previous_foster_visibility`)
-   [ ] Approval/denial dialogs follow 2-line helper text pattern
-   [ ] Messages sent with animal/group tags (default if no custom message)
-   [ ] Dashboard shows pending requests summary (coordinator-only)
-   [ ] Approving one request auto-denies other pending requests for same animal/group
-   [ ] Auto-denied requests receive denial message
-   [ ] Request actions moved to top of detail pages (foster view)
-   [ ] "Request to Foster" button is smaller and less prominent (foster view)

### Phase 4: Unassignment

-   [ ] Can unassign individual animals
-   [ ] Can unassign groups (all animals unassigned)
-   [ ] Status and visibility update correctly
-   [ ] Individual unassignment blocked for animals in groups
-   [ ] Messages sent to foster's conversation
-   [ ] React Query cache updates correctly

### Phase 5: UI Improvements

-   [ ] Hamburger menu appears on small screens for coordinators
-   [ ] All navigation links accessible in hamburger menu
-   [ ] Foster Requests link visible to coordinators
-   [ ] Badge links work correctly
-   [ ] Responsive behavior works on various screen sizes

---

## Implementation Order Summary

1. **Prerequisites** (Complete before Phase 1): ✅ DONE

    - Reusable Search & Filter Component
    - Message Tagging for Animals/Groups

2. **Phase 1: Basic Assignment** (Foundation)

    - Assignment utilities
    - Foster selection
    - Assignment UI on detail pages

3. **Phase 2: Foster Requests** (Builds on Phase 1)

    - Request utilities
    - Request UI on detail pages for fosters
    - "Requested" badge on cards with cancel functionality
    - Request creation flow

4. **Phase 3: Coordinator Request Management** (Builds on Phase 2)

    - Requests page
    - Approval/denial workflows
    - Dashboard integration
    - Auto-deny conflicting requests on approval

5. **Phase 4: Unassignment** (Can be done in parallel with Phases 2-3, only depends on Phase 1)

    - Unassignment utilities
    - Unassignment UI

6. **Phase 5: UI Improvements** (Enhancement, after Phases 2-4)
    - Hamburger menu
    - Navigation updates
    - Badge links

**Parallel Development Note:** Phase 4 only depends on Phase 1, so it can be developed in parallel with Phases 2-3 to speed up overall delivery.

---

## Notes

-   All phases assume message tagging is implemented and available
-   All phases assume search/filter components are available for foster selection
-   Group assignment rules are strictly enforced throughout
-   All messages include animal/group tags for context
-   Status and visibility changes are handled consistently across all operations
-   React Query cache invalidation ensures UI stays in sync
