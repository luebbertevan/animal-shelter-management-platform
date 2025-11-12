## Foster Coordination Platform — Product Specification

### Overview

-   **Audience:** Foster coordinators (e.g., Arika) managing animals in rescue settings; foster parents providing day-to-day care.
-   **Problem:** Coordinators juggle spreadsheets, text chains, and ad-hoc notes, leading to missed updates, poor visibility into foster capacity, and delayed medical attention.
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
-   Health & behavior notes (diet, medications details (doses, fequency) temperament).
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


-   **Mobile Apps:** React Native (Expo) targeting iOS and Android with role-aware interfaces for coordinators and fosters; supports offline drafts and push notifications.
-   **Coordinator Web Portal:** Lightweight React web client (Next.js or Vite) optimized for desktop oversight and bulk data entry, sharing core logic with mobile via a shared component library.
-   **State Management:** React Query or Redux Toolkit for server state synchronization across mobile and web clients.
-   **Backend:** Spring Boot REST API (leveraging existing Java expertise) with modular services (animals, fosters, tasks).
-   **Database:** PostgreSQL (RDS or Render managed service). Core tables: `animals`, `fosters`, `assignments`, `tasks`, `updates`, `media_assets`, `messages`.
-   **Authentication:** JWT-based auth with refresh tokens; roles encoded in token claims.
-   **Hosting:** Managed mobile build pipelines (Expo EAS) plus Firebase Hosting or Render for the web portal; AWS Elastic Beanstalk / Render for backend; S3-compatible storage for media.
-   **Notifications:** Push notifications via Expo for mobile, plus email delivery via SendGrid; abstraction layer to add SMS (Twilio) later.
-   **AI/Voice (Optional):** Integrate third-party speech-to-text (e.g., AWS Transcribe) + LLM API (OpenAI, Anthropic) for note structuring.

### Integration & Data Considerations

-   **Imports:** CSV template for migrating existing spreadsheets.
-   **Bulk Intake Automation (Post-MVP):** Pipeline for uploading semi-structured rescue manifests (spreadsheets, PDFs, email dumps) and converting them into animal profiles using AI-assisted extraction.
-   **Exports:** PDF or CSV report for animal summaries and task compliance.
-   **Audit Trail:** Store immutable event history for compliance and debugging.
-   **Media Handling:** Limit upload sizes; auto-generate thumbnails; ensure secure signed URLs.

### Non-Functional Requirements

-   **Accessibility:** Responsive layout, large touch targets, WCAG AA contrast, offline-friendly drafts for updates.
-   **Security & Privacy:** Enforce role-based access; encrypt PII at rest; audit log for data changes; comply with relevant local data-protection policies.
-   **Reliability:** Cloud-hosted with automated backups; target 99.5% uptime; graceful degradation for media uploads.
-   **Scalability:** Architecture should support expansion to adoption modules without rework.

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
