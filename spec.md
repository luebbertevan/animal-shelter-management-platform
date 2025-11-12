## Foster Coordination Platform — Product Specification

### Overview

-   **Audience:** Foster coordinators (e.g., Arika) managing animals in rescue settings; foster parents providing day-to-day care.
-   **Problem:** Coordinators juggle spreadsheets, text chains, and notes, leading to administrative dificulties: hard to make updates, poor visibility into foster capacity, and delays.
-   **Mission:** Deliver a centralized, mobile-friendly workspace that streamlines foster assignments, captures animal updates, and surfaces actionable reminders so coordinators can focus on animal welfare instead of administration.

### Goals & Success Criteria

-   **Reduce administrative load:** Replace manual spreadsheets and message threads with structured, searchable records.
-   **Improve communication:** Keep every update, note, and task tied to the relevant animal or foster.
-   **Maintain animal health visibility:** Track meds, check-ins, and red flags so no animal falls through the cracks.
-   **Increase foster engagement:** Make it easy for fosters to share updates, log care tasks, and volunteer for new placements.

### User Roles & Permissions

-   **Foster Coordinators (Admin)**
    -   Manage full animal roster and assignments.
    -   Review and publish foster opportunities.
    -   Send announcements or direct messages to fosters.
    -   Configure reminders and monitor compliance.
-   **Foster Parent (User)**
    -   View animals currently assigned to them.
    -   Submit updates (text, photos, logs) and acknowledge tasks/reminders.
    -   Express interest in animals needing placement.

### MVP Feature Scope

#### Animal Profiles

-   Core attributes: name, species, breed, sex, age, status (`Needs Foster`, `In Foster`, `Adopted`, `Medical Hold`).
-   Health & behavior notes (diet, medications details (doses, frequency) temperament).
-   Media uploads: photos, bios.
-   Timeline of updates (timestamped entries with weight, condition, photos).

#### Foster Management

-   Foster directory: contact info, experience level, household details (other pets, kids, allergies), preferred animal profiles, availability.
-   Assignment tracking: current and historical placements; surfacing open capacity.
-   Quick filters/search (e.g., “experienced bottle feeders”, “available next week”).

#### Communication Hub

-   Household-level chat threads connecting coordinators with each foster household for real-time coordination.
-   Message tagging for specific animals or tasks so updates stay searchable and context-rich within the broader household conversation.
-   Coordinator broadcast messages (e.g., reminders, policy updates).
-   Notifications (in-app + email push) for new messages, assignment changes, reminder triggers.

#### Foster Opportunities Board

-   Coordinator posts animals needing placement with urgency, duration, special care notes.
-   Built to handle bulk intakes (e.g., large rescue shipments) where information arrives in batches or remains incomplete.
-   Fosters browse opportunities, mark interest, or request assignment.
-   Coordinator dashboard: pending interest requests and recommended matches (manual selection in MVP).
-   Post-MVP: leverage AI to ingest spreadsheets or PDFs from rescues, auto-creating draft profiles for rapid triage.

#### Task & Reminder Engine

-   Create recurring or one-off tasks (medications, vet appointments, weigh-ins).
-   Assign tasks to fosters or coordinators; track completion status.
-   Automated reminder delivery via email; optional SMS integration in later iteration.
-   Calendar-style view for coordinators; simplified checklist for fosters.

#### MVP+ Optional AI Assist (if resources permit)

-   Voice-to-text update submissions (mobile microphone input).
-   LLM-generated structured summaries from free-form notes.
-   Suggested follow-ups (e.g., “3 cats reported reduced appetite this week”).
-   Intake automations that parse spreadsheets, forms, or email attachments to populate animal records and update the Foster Opportunities Board.

### Product Experience

#### Coordinator Flow

1. Logs in (mobile app or web portal) to a dashboard showing animal statuses, pending tasks, and foster capacity.
2. Adds a new intake via form (basic info, medical notes, photo upload). Status defaults to `Needs Foster`.
3. Publishes foster opportunity or assigns directly to a known foster.
4. Communicates instructions through household chat; schedules medication reminders.
5. Reviews incoming updates, marks tasks complete, and adjusts care plans as needed.

#### Foster Flow

1. Logs in (mobile-friendly) and sees cards for current animals.
2. Taps an animal to view care instructions, upcoming tasks, and message history.
3. Posts update (text, weight, meds given, photo) which appends to animal log.
4. Receives reminder notifications; marks tasks done or requests help.
5. Browses foster opportunities when available; signals interest to coordinator.

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

### Stretch Roadmap (Post-MVP)

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
