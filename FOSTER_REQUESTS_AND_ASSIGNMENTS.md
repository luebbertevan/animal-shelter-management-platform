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

    -   `foster_visibility` reverts to previous value (or `available_now` if no previous value)
    -   Request status changes to `denied`

-   **When unassigning:**
    -   Coordinator can choose new `status` and `foster_visibility`
    -   `current_foster_id` is cleared

### Message Integration

-   All requests and assignments include messages with animal/group tags
-   Messages are sent to the foster's conversation (foster chat)
-   Messages are visible in coordinator group chat
-   Standard message templates are provided but can be customized

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

**Features:**

-   Search/filter fosters by name, availability, experience level
-   Display foster name, availability status, current assignments count
-   Can be used as dropdown or navigate to selection page
-   Returns selected foster ID

**Props:**

-   `onSelect: (fosterId: string) => void`
-   `excludeFosterIds?: string[]` - Optional: exclude certain fosters
-   `mode?: 'dropdown' | 'page'` - How to display selector

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

-   Add "Request to Foster" button (foster only, only visible if `foster_visibility != 'not_visible'`)
-   Button should be disabled if:
    -   Animal is already assigned to this foster
    -   Foster already has pending request for this animal/group
-   When clicked:
    -   Check if animal is in a group
    -   If in group, show dialog: "This animal is part of a group. You'll be requesting the entire group: [Group Name]. Continue?"
    -   Show request dialog with:
        -   Animal/group name
        -   Text area for custom message (pre-filled with standard template)
        -   Standard template: "Hi, I'm interested in fostering [Animal/Group Name]. [Custom message]"
    -   On confirm, create request and update visibility
    -   Show success notification
    -   Update button state (disable, show "Request Pending")

### Task 2.3: Update GroupDetail Page - Request Button (Foster View)

**File:** `src/pages/animals/GroupDetail.tsx`

**Changes:**

-   Add "Request to Foster" button (foster only, only visible if group visibility != 'not_visible')
-   Similar behavior to AnimalDetail request button
-   Show group name and animal count in request dialog

### Task 2.4: Update FostersNeeded Page - Request from Cards

**File:** `src/pages/fosters/FostersNeeded.tsx`

**Changes:**

-   Add "Request" button/icon on AnimalCard and GroupCard (foster only)
-   Button opens same request dialog as detail pages
-   After request, update card to show "Request Pending" state
-   "Foster Pending" badge should be clickable and link to foster's conversation or request status

### Task 2.5: Create Request Dialog Component

**File:** `src/components/fosters/FosterRequestDialog.tsx`

**Features:**

-   Shows animal/group information
-   Text area for custom message (pre-filled with standard template)
-   "Submit Request" and "Cancel" buttons
-   Handles group detection and confirmation
-   Creates request via `createFosterRequest` utility
-   Updates visibility to `foster_pending`

**Testing:**

-   Fosters can request individual animals
-   Fosters can request groups
-   Requesting animal in group automatically requests entire group
-   Duplicate requests are prevented
-   Visibility updates to `foster_pending`
-   Message sent to foster's conversation
-   Button states update correctly

**Deliverable:** Fosters can request animals/groups from Fosters Needed page and detail pages with proper validation and messaging.

---

## Phase 3: Coordinator Request Management

**Goal:** Enable coordinators to view, manage, and respond to foster requests.

**Dependencies:** Phase 2 (Foster Requests)

### Task 3.1: Create Foster Requests Page

**File:** `src/pages/fosters/FosterRequests.tsx`

**Features:**

-   List of all pending foster requests
-   Display as cards (similar to FostersNeeded page)
-   Each card shows:
    -   Animal/group card (reuse AnimalCard/GroupCard)
    -   "Requested by" badge with foster name (link to foster detail)
    -   Request date
    -   Custom message from foster (if provided)
    -   "Approve" and "Deny" buttons
-   Filter by status (pending, approved, denied)
-   Sort by request date (oldest first) or priority
-   Empty state when no requests

**Layout:**

-   Grid layout similar to FostersNeeded page
-   Coordinator-only access
-   Link from navigation bar

### Task 3.2: Create Request Card Component

**File:** `src/components/fosters/FosterRequestCard.tsx`

**Features:**

-   Wraps AnimalCard or GroupCard
-   Adds "Requested by [Foster Name]" badge
-   Shows request message (if provided)
-   Shows request date
-   Action buttons: "Approve" and "Deny"
-   Clicking card navigates to animal/group detail page

### Task 3.3: Update AnimalDetail Page - Request Management

**File:** `src/pages/animals/AnimalDetail.tsx`

**Changes:**

-   Display pending requests for this animal (coordinator only)
-   Show list of fosters who have requested this animal
-   For each request:
    -   Foster name (link to foster detail)
    -   Request date
    -   Custom message (if provided)
    -   "Approve" and "Deny" buttons
-   If animal is in a group, show requests for the group
-   "Approve" button:
    -   Opens assignment confirmation dialog (reuse from Phase 1)
    -   Pre-selects the requesting foster
    -   Allows custom message
    -   On confirm, assigns foster and approves request
-   "Deny" button:
    -   Opens denial dialog with:
        -   Option to add custom message (pre-filled with standard template)
        -   Standard template: "Thank you for your interest in fostering [Animal/Group Name]. Unfortunately, we're unable to assign them to you at this time. [Custom message]"
    -   On confirm, denies request and updates visibility

### Task 3.4: Update GroupDetail Page - Request Management

**File:** `src/pages/animals/GroupDetail.tsx`

**Changes:**

-   Similar to AnimalDetail request management
-   Shows requests for the group
-   Approve/deny functionality for group requests

### Task 3.5: Create Request Approval/Denial Dialogs

**File:** `src/components/fosters/RequestApprovalDialog.tsx`
**File:** `src/components/fosters/RequestDenialDialog.tsx`

**Features:**

-   Approval dialog: Reuses assignment confirmation dialog with pre-selected foster
-   Denial dialog:
    -   Shows animal/group and foster information
    -   Text area for custom message (pre-filled with standard denial template)
    -   "Confirm Denial" and "Cancel" buttons
    -   Updates request status and visibility on confirm

### Task 3.6: Update Dashboard - Pending Requests Section

**File:** `src/pages/Dashboard.tsx`

**Changes:**

-   Add "Pending Foster Requests" section (coordinator only)
-   Show count of pending requests
-   Display up to 5 most recent/urgent requests as cards
-   Each card shows:
    -   Animal/group name and photo
    -   Foster name who requested
    -   Request date
    -   Link to full requests page
-   "View All Requests" link to Foster Requests page

**Testing:**

-   Coordinators can view all pending requests
-   Can approve requests (assigns foster and updates status/visibility)
-   Can deny requests (updates status and visibility)
-   Messages sent with animal/group tags
-   Dashboard shows pending requests
-   Request cards display correctly

**Deliverable:** Coordinators can view, approve, and deny foster requests with proper messaging and assignment integration.

---

## Phase 4: Unassignment Functionality

**Goal:** Enable coordinators to unassign animals/groups from fosters with status and visibility control.

**Dependencies:** Phase 1 (Assignment)

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
-   Status dropdown (pre-selected with current status, can change)
-   Visibility dropdown (pre-selected with current visibility, can change)
-   Text area for custom message (pre-filled with standard template)
-   Standard template: "Hi [Foster Name], [Animal/Group Name] is no longer assigned to you. [Custom message]"
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

**Dependencies:** Phase 3 (Request Management)

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

-   Make "Foster Pending" badge clickable (when `foster_visibility === 'foster_pending'`)
-   Link to `/foster-requests` (for coordinators) or foster's conversation (for fosters)
-   Add hover state to indicate clickability

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
    message TEXT,
    coordinator_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES profiles(id),
    CONSTRAINT foster_requests_animal_or_group CHECK (
        (animal_id IS NOT NULL AND group_id IS NULL) OR
        (animal_id IS NULL AND group_id IS NOT NULL)
    ),
    CONSTRAINT foster_requests_unique_pending UNIQUE (organization_id, foster_profile_id, animal_id, group_id, status)
        WHERE status = 'pending'
);

CREATE INDEX idx_foster_requests_organization ON foster_requests(organization_id);
CREATE INDEX idx_foster_requests_foster ON foster_requests(foster_profile_id);
CREATE INDEX idx_foster_requests_animal ON foster_requests(animal_id) WHERE animal_id IS NOT NULL;
CREATE INDEX idx_foster_requests_group ON foster_requests(group_id) WHERE group_id IS NOT NULL;
CREATE INDEX idx_foster_requests_status ON foster_requests(status);
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

-   [ ] Fosters can request individual animals
-   [ ] Fosters can request groups
-   [ ] Requesting animal in group automatically requests entire group
-   [ ] Duplicate requests are prevented
-   [ ] Visibility updates to `foster_pending` on request
-   [ ] Message sent to foster's conversation
-   [ ] Button states update correctly

### Phase 3: Coordinator Request Management

-   [ ] Coordinators can view all pending requests
-   [ ] Can approve requests (assigns foster and updates status/visibility)
-   [ ] Can deny requests (updates status and visibility)
-   [ ] Messages sent with animal/group tags
-   [ ] Dashboard shows pending requests
-   [ ] Request cards display correctly

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

1. **Prerequisites** (Complete before Phase 1):

    - Reusable Search & Filter Component
    - Message Tagging for Animals/Groups

2. **Phase 1: Basic Assignment** (Foundation)

    - Assignment utilities
    - Foster selection
    - Assignment UI on detail pages

3. **Phase 2: Foster Requests** (Builds on Phase 1)

    - Request utilities
    - Request UI for fosters
    - Request creation flow

4. **Phase 3: Coordinator Request Management** (Builds on Phase 2)

    - Requests page
    - Approval/denial workflows
    - Dashboard integration

5. **Phase 4: Unassignment** (Builds on Phase 1)

    - Unassignment utilities
    - Unassignment UI

6. **Phase 5: UI Improvements** (Enhancement)
    - Hamburger menu
    - Navigation updates
    - Badge links

---

## Notes

-   All phases assume message tagging is implemented and available
-   All phases assume search/filter components are available for foster selection
-   Group assignment rules are strictly enforced throughout
-   All messages include animal/group tags for context
-   Status and visibility changes are handled consistently across all operations
-   React Query cache invalidation ensures UI stays in sync
