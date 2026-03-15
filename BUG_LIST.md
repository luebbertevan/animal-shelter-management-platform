# Bug list & backlog

## Bug fixes

- **Remove additional notes** – Remove the additional-notes field if no longer needed.
- **Pending group request photo** – On the coordinator homepage, pending foster requests show no photo when the group has no group photo (e.g. only split animal photos). Use first group photo or first animal photo as fallback; if there are no photos for the group or animals, show the same no-photo icon used elsewhere in the app.
- **Assignment sync** – When a foster is assigned to a group, animals added later to that group are not assigned to the foster, and removing an animal from an assigned group does not clear its assignment. Implement sync so new members get assigned and removed members get unassigned. See `ASSIGNMENT_SYNC_PLAN.md`.

---

## Improvements & polish

- **Form formatting & layout** – Revise form layout for a cleaner, more aesthetic look: reduce excess space (e.g. high-priority toggle on create/edit group forms), optimize spacing for different screen sizes (mobile especially), improve how details are displayed, and condense fields/dropdowns to cut white space and avoid an awkward spaced-out layout. Consider reordering fields to improve layout and a more intuitive flow.
- **Pasted image / showcase zoom** – Copy-pasted image from Excel (or similar) and the photo showcase zoomed view display incorrectly; fix image handling and showcase zoom UI.
- **Responsive breakpoints** – Headers and chat list layout break on mid-sized screens; test and fix responsive crossover points.
- **Sign up name autofill** – Sign-up name field suggests animal names; fix autofill/attributes so it does not suggest animal names.
- **Mobile swipe in showcase** – Enable swipe-through for photos in the showcase on mobile.
- **Long messages → info icon** – Move long helper text (e.g. “Animals in the same group are allowed to have different statuses”) into a hoverable info icon next to the field label instead of full-width message.
- **Animals page cleanup** – Improve formatting and layout of the animals page for a cleaner view.
- **Sheets-style view** – Table/sheets-style view for coordinators to quickly scan animals and key info without opening each animal.
- **Metrics** – Add or surface metrics (e.g. euthanized, deceased counts) where useful.
- **Standardize color palette** – Use a single source of truth for all colors (e.g. theme/tokens) so palette changes apply globally.
- **Built-in back button** – Add an in-app back control, especially for mobile PWA where there is no browser back button.
- **Visibility/status feedback in groups** – When editing an animal’s visibility and that animal is in a group, the app correctly updates the other animals in the group to avoid conflicts; show a clear message that this is happening. For status: changing one animal’s status in a group currently affects only that animal. Consider adding an option to apply the status change to all animals in the group, since that may be the common case.
- **Code quality pass** – Scan the codebase for duplicated logic and code smells; refactor to eliminate them. Consider a DevOps/lint or analysis tool to flag code smells.

---

## Features (new behavior or larger scope)

- **Quick add animals to groups** – Quick-add flow for name, sex, life stage when adding animals to groups (aligns with bulk-add work).
- **Delete all animals in group** – In the delete-group flow, add an option to delete all animals in the group (not only remove them from the group).
- **Deceased / euthanized status** – Proper handling and display of deceased and euthanized in animal status (and any downstream logic).
- **Bulk/max delete for animals** – Bulk delete animals with an optional max cap (e.g. “delete up to N”) for safety.
- **Concurrent edit / version control** – Define behavior when two users edit the same animal or group, or when one user’s action (e.g. group creation with visibility rules) conflicts with another’s (e.g. someone else changed an animal’s visibility). Prefer a simple approach: last-write-wins for normal fields; block or reject the action when it would violate critical rules (e.g. group visibility consistency). Confirm whether this is the only place such conflicts matter and add detection or error handling as needed.

---

## Future bugs / notes

- _Use this section for bugs or ideas to triage later._
- _e.g. Edge cases, rare bugs, or “nice to have” UX notes._

- We might want a request unassignment button for when a group is adopted for example and the coordinators have not unassigned the group yet.

---

## MVP next features

- Bug fixing
- Foster photos and bio editing
- Sign up / sign in restructure (whitelist emails or sign in with Google)
- MVP UX
- Landing page
- Web notifications (Firebase)

## MVP+

- Redesign; UI and UX polish
- Expo wrapping for mobile app (dev accounts)
