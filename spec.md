## Foster Coordination Platform — Product Specification

### Overview

-   **Audience:** Foster coordinators (e.g., Arika) managing animals in rescue settings; foster parents providing day-to-day care.
-   **Problem:** Coordinators juggle spreadsheets, text chains, and notes, leading to administrative dificulties: hard to make updates, poor visibility into foster capacity, and delays.
-   **Mission:** Deliver a centralized, mobile-friendly workspace that streamlines foster assignments, captures animal updates, and surfaces actionable reminders so coordinators can focus on animal welfare instead of administration.

### Goals & Success Criteria

-   **Improve communication & coordination:** All messaging has full admin visibility. All messages and updates are timestamped for clear timelines.
-   **Reduce administrative load:** Replace manual spreadsheets and message threads with structured, searchable records.
-   **Maintain animal health visibility:** Track meds, check-ins, and red flags so no animal falls through the cracks. Timestamped timelines show what happened when.
-   **Increase foster engagement:** Make it easy for fosters to share updates and volunteer for new placements.

### User Roles & Permissions

-   **Foster Coordinators (Admin)**
    -   Manage full animal roster and assignments.
    -   Review and publish foster opportunities.
    -   **See all chat threads** across all foster households for full coordination visibility.
    -   Send announcements or direct messages to fosters.
    -   View timelines and activity logs across all animals and fosters.
-   **Foster Parent (User)**
    -   View animals currently assigned to them.
    -   Submit updates (text, photos, logs) with timestamps.
    -   Express interest in animals needing placement.
    -   Communicate with coordinators via household chat.

### MVP Feature Scope

#### Animal Profiles

-   Core attributes: name (optional), species, breed, sex, age, status (`Needs Foster`, `In Foster`, `Adopted`, `Medical Hold`, `In Shelter`).
-   **Primary breed:** Currently a single text field with dropdown. Might change to tags later for better filtering (e.g., "domestic shorthair", "siamese mix").
-   **Handle unnamed intakes:** Animals can be identified by characteristics (e.g., "Orange tabby"), location/source (e.g., "Rescue from Main St"), or group membership when name is unknown. System generates display identifiers when name is missing.
-   **Graceful handling of missing info:** All fields are optional. Missing information is expected and the system is designed to function with incomplete data. System tracks what information is missing and provides:
    -   "Info Missing" section/filter to identify animals needing data completion
    -   Tags to show what important information is still needed (e.g., "needs: vaccines, photos, behavioral assessment")
    -   Quick preview cards with shortened/truncated info for easy scanning
    -   Date added and intake source always recorded for identification
    -   **UI design:** Unknown/missing information is de-emphasized or shown at the bottom of detail views to avoid cluttering the screen. Only known information is prominently displayed.
    -   **No dependencies:** System functionality never depends on optional fields. All features work even when most information is missing.
-   **Smart data entry:** Dropdown fields (breed, intake type, rescue name, etc.) show recently added suggestions for faster data entry. Custom input allowed when needed.
-   **Group support:** Animals can be organized as groups (e.g., litter of kittens) or singles. Groups share common care needs, medical schedules, and foster assignments while maintaining individual profiles for tracking.
-   **Filters & search:** Filter by status, species, date added, missing info, location/source, group, or tags. Search by any identifier (name, characteristics, location).
-   **Tags for filtering:** Animals can have tags like "fine with dogs", "bottle fed", "kid friendly", "needs socialization", etc. Tags enable quick filtering and matching.
-   **Socialization level:** Track socialization on a scale (0-5) for animals needing socialization work. Can be null/unknown if not yet assessed.
-   **Medical & behavioral needs:** Stored as flexible text fields initially. Can be split into structured tags/arrays later for more granular filtering (e.g., separate medical conditions, behavioral traits).
-   Health & behavior notes (diet, medications details (doses, frequency) temperament).
-   **Timestamped media:** All photos are timestamped with upload date and uploader to track when information was added or changed.
-   **Timeline of updates:** Chronological, timestamped entries with weight, condition, photos, status changes, and medical events. All updates are timestamped to track when information changed.
-   **Field visibility & access control:** Some fields on animals or groups might need to be inaccessible to regular users (e.g., internal notes, sensitive medical information). Decision needed on how to implement this (separate fields, role-based field visibility, or separate tables).

#### Foster Management

-   Foster directory: contact info, experience level, household details (other pets, kids, allergies), preferred animal profiles, availability.
-   **Household details & preferred animal profiles:** Currently stored as text fields. Might be extracted into tags later for better filtering and matching.
-   **Availability:** Simple boolean toggle (available/not available) for MVP. Might change to calendar with specific date ranges later for more granular scheduling.
-   Assignment tracking: current and historical placements; surfacing open capacity.
-   Quick filters/search (e.g., "experienced bottle feeders", "available next week").
-   **Foster account confirmation:** Coordinators can generate confirmation codes/passwords for approved fosters. Codes are easily shareable via text/email. Fosters use code to create account (replaces open registration). Keeps application process in Petstablished while controlling platform access.

#### Communication Hub

-   **Admin visibility:** All coordinators/admins can see all chat threads across all foster households for full coordination visibility.
-   Household-level chat threads connecting coordinators with each foster household for real-time coordination.
-   **Timestamps:** All messages are timestamped. All information updates (animal status changes, medical notes, assignments) are timestamped when relevant.
-   Message tagging for specific animals or tasks so updates stay searchable and context-rich within the broader household conversation.
-   Coordinator broadcast messages (e.g., reminders, policy updates).
-   Notifications (in-app + email push) for new messages, assignment changes, reminder triggers.
-   **Timelines:** Chronological views of activity per animal, per foster, or organization-wide to track what happened when.
-   **Event reminders (MVP+):** Coordinators can configure SMS or email reminders for important events (e.g., spay/neuter appointments, medication schedules). Recipients can confirm receipt or completion. Reminders are timestamped and tracked.

#### Foster Opportunities Board

-   **Placement requests:** Coordinator creates placement requests for animals or groups needing foster homes. Each request includes:
    -   Name/names (for single animals or groups)
    -   Description of what's needed
    -   Timestamped photos (track when photos were added)
    -   Medical needs (placement-specific, may differ from animal's general medical record)
    -   Behavioral needs (placement-specific)
    -   Status (pending, approved, rejected, fulfilled, cancelled)
    -   Priority (high or normal)
    -   Urgency, duration, special care notes
    -   Location (e.g., "in shelter" or specific location)
-   **Display as groups or singles:** Opportunities show as groups (e.g., "Litter of 4 kittens") or individual animals, allowing fosters to see what they're committing to at a glance.
-   Built to handle bulk intakes (e.g., large rescue shipments) where information arrives in batches or remains incomplete.
-   Fosters browse opportunities, mark interest, or request assignment.
-   Coordinator dashboard: pending interest requests and recommended matches (manual selection in MVP).
-   Post-MVP: leverage AI to ingest spreadsheets or PDFs from rescues, auto-creating draft profiles for rapid triage.

#### MVP+ Optional AI Assist (if resources permit)

-   Voice-to-text update submissions (mobile microphone input).
-   LLM-generated structured summaries from free-form notes.
-   Suggested follow-ups (e.g., “3 cats reported reduced appetite this week”).
-   Intake automations that parse spreadsheets, forms, or email attachments to populate animal records and update the Foster Opportunities Board.

### Product Experience

#### Coordinator Flow

1. Logs in (mobile app or web portal) to a dashboard showing animal statuses, foster capacity, and recent activity.
2. Adds a new intake via form (basic info, medical notes, photo upload). Can create as single animal or group (e.g., "Litter of 4 kittens"). All fields optional—can use characteristics, location, or group for identification when name/info missing. Status defaults to `Needs Foster`.
3. Generates confirmation codes for approved fosters (shareable via text/email) to enable account creation.
4. Publishes foster opportunity or assigns directly to a known foster. Groups appear as single opportunities with count (e.g., "4 kittens").
5. Communicates instructions through household chat (all admins can see all chats for coordination).
6. Reviews incoming updates, views timelines of activity, filters by missing info, and adjusts care plans as needed.
7. Configures event reminders (spay/neuter, meds) with SMS/email notifications and confirmation tracking.

#### Foster Flow

1. Receives confirmation code from coordinator (via text/email) and uses it to create account.
2. Logs in (mobile-friendly) and sees cards for current animals (groups shown as single cards with count, e.g., "4 kittens").
3. Taps a card to view group or individual animal details, care instructions, and message history.
4. **Note:** Fosters cannot update animal records directly for now. This will be changed later to allow updates only for specific fields (e.g., weight, condition updates, photos) but not core animal data. Updates will be submitted through the communication hub or a dedicated update form.
5. Receives notifications for new messages, assignment changes, and event reminders (spay/neuter, meds). Can confirm receipt/completion.
6. Browses foster opportunities when available; sees groups and singles clearly labeled; signals interest to coordinator.

### Technical Approach (MVP)

-   **Mobile Apps:** React Native with Expo, targeting iOS and Android. Expo manages native builds, OTA updates, and push notifications while keeping the developer experience close to familiar React tooling.
-   **Coordinator Web Portal:** Next.js (React) client for desktop oversight; shares UI primitives and business logic with the mobile apps through a shared TypeScript component library.
-   **State Management:** React Query for API data fetching/caching plus lightweight Zustand or Context for local UI state; keeps client code predictable without heavy boilerplate.
-   **Backend-as-a-Service:** Supabase providing PostgreSQL, authentication, storage, and real-time subscriptions. Row-level security policies enforce coordinator vs. foster permissions without custom auth plumbing.
-   **Custom Logic:** Supabase Edge Functions (TypeScript) for server-side workflows (bulk intake parsing, scheduled reminders); can later be complemented by Next.js API routes if specialized processing is needed.
-   **Media & Files:** Supabase storage buckets for photos and documents with signed URL access; optional function to generate thumbnails when images are uploaded.
-   **Notifications:** Expo push notifications for mobile; transactional email via Resend or SendGrid (wrapped in a notification service so SMS providers like Twilio can be added later).
-   **AI/Voice (Optional):** AWS Transcribe for speech-to-text ingestion and OpenAI/Anthropic APIs for LLM summarization and data extraction pipelines.

### Tech Stack Rationale

-   **All-in TypeScript:** React Native, Next.js, and Supabase Edge Functions keep the entire stack in TypeScript, lowering the learning curve while still teaching modern mobile/web patterns.
-   **Managed Infrastructure:** Supabase bundles Postgres, auth, storage, and serverless functions so you can ship features quickly without standing up and operating custom infrastructure on day one.
-   **Progressive Enhancement:** Start with Supabase capabilities; introduce dedicated microservices or message queues later only if scale or compliance demands it.
-   **Shared Design System:** Reuse UI primitives between mobile and web for consistency and faster delivery; Expo + Next.js support shared component libraries.
-   **Extensible Notifications:** Abstract notification delivery now to enable email and push immediately, with an easy path to add SMS/MMS when fosters request it.

### Integration & Data Considerations

-   **Imports:** CSV template for migrating existing spreadsheets.
-   **Bulk Intake Automation (Post-MVP):** Pipeline for uploading semi-structured rescue manifests (spreadsheets, PDFs, email dumps) and converting them into animal profiles using AI-assisted extraction.
-   **Exports:** PDF or CSV report for animal summaries and task compliance.
-   **Audit Trail:** Store immutable event history for compliance and debugging.
-   **Media Handling:** Limit upload sizes; auto-generate thumbnails; ensure secure signed URLs.
-   **Petstablished Compatibility:** App designed to work alongside Petstablished. Application process remains in Petstablished; app handles day-to-day coordination. Future integration will enable data sync (see Stretch Roadmap).

### Stretch Roadmap (Post-MVP)

-   **Task & Assignment System:**
    -   Create and assign tasks to coordinators or fosters (e.g., check up on a cat, handle a problem, hand off supplies or meds).
    -   Track task completion status.
    -   Calendar view for coordinators to see upcoming tasks and events.
    -   Google Calendar integration for scheduling and reminders.
    -   Automated reminder delivery via email/push notifications.
-   **Petstablished Integration:**
    -   Data transfer and synchronization between app and Petstablished.
    -   Bidirectional updates (animal records, foster assignments, medical records).
    -   Keeps detailed records in Petstablished while using app for day-to-day coordination.
-   Adoption workflow (applications, approvals, contracts).
-   Public-facing adoptable animal listings with shareable profiles and social media integrations.
-   Advanced analytics (foster success metrics, medical trends).
-   QR codes on kennels leading to read-only animal snapshots.
-   Automated document generation (adoption agreements, medical summaries).

### 11. Open Questions

-   What existing tools (if any) must the platform integrate with on day one?
-   Are there compliance or regulatory constraints (e.g., HIPAA-like requirements for vet records)?
-   How critical is offline support versus real-time sync?
-   Preferred notification channels for fosters (email, SMS, in-app only)?
-   Appetite for AI-assisted features in the pilot, or should they wait until after core adoption?
