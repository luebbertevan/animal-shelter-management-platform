# Bug list & backlog

## Bug fixes

- **Remove additional notes (completed)** – Remove the additional-notes field if no longer needed.
- **Pending group request photo (completed)** – On the coordinator homepage, pending foster requests show no photo when the group has no group photo (e.g. only split animal photos). Use first group photo or first animal photo as fallback; if there are no photos for the group or animals, show the same no-photo icon used elsewhere in the app.
- **Assignment sync (completed)** – When a foster is assigned to a group, animals added later to that group are not assigned to the foster, and removing an animal from an assigned group does not clear its assignment. Implement sync so new members get assigned and removed members get unassigned. See `ASSIGNMENT_SYNC_PLAN.md`.
- **Sign up name autofill (completed)** – Sign-up name field suggests animal names; fix autofill/attributes so it does not suggest animal names.
- **Long messages → info icon (completed)** – Move long helper text (e.g. “Animals in the same group are allowed to have different statuses”) into a hoverable info icon next to the field label instead of full-width message.

---

## Improvements & polish

- **Unassignment flow when groups change (completed)** – Clarify in UI that deleting a group leaves all its animals unassigned from the foster. When an animal is removed from an assigned group, add a modal offering to unassign from the current foster; reuse the existing assignment/unassignment flow (messages, tagging). On submit: remove animal from group and run unassignment logic. For group deletion, add a simple option in the confirm-delete modal: “Unassign all animals from current foster”; we can add the full unassignment flow there later if it becomes a pain point.
- **Form formatting & layout** – Revise form layout for a cleaner, more aesthetic look: reduce excess space (e.g. high-priority toggle on create/edit group forms), optimize spacing for different screen sizes (mobile especially), improve how details are displayed, and condense fields/dropdowns to cut white space and avoid an awkward spaced-out layout. Consider reordering fields to improve layout and a more intuitive flow.
- **Pasted image / showcase zoom** – Copy-pasted image from Excel (or similar) and the photo showcase zoomed view display incorrectly; fix image handling and showcase zoom UI.
- **Responsive breakpoints** – Headers and chat list layout break on mid-sized screens; test and fix responsive crossover points.
- **Mobile swipe in showcase** – Enable swipe-through for photos in the showcase on mobile.
- **Animals page cleanup** – Improve formatting and layout of the animals page for a cleaner view.
- **Built-in back button** – Add an in-app back control, especially for mobile PWA where there is no browser back button.
- **Visibility/status feedback in groups** – When editing an animal’s visibility and that animal is in a group, the app correctly updates the other animals in the group to avoid conflicts; show a clear message that this is happening. For status: changing one animal’s status in a group currently affects only that animal. Consider adding an option to apply the status change to all animals in the group, since that may be the common case.
- **Code quality pass** – Scan the codebase for duplicated logic and code smells; refactor to eliminate them. Consider a DevOps/lint or analysis tool to flag code smells.

---

## Features (new behavior or larger scope)

- **Quick add animals to groups (completed)** – Quick-add flow for name, sex, life stage when adding animals to groups (aligns with bulk-add work).
- **Delete all animals in group (delayed for user feedback)** – In the delete-group flow, add an option to delete all animals in the group (not only remove them from the group).
- **Deceased / euthanized status** – Proper handling and display of deceased and euthanized in animal status (and any downstream logic).
- **Sheets-style view** – Table/sheets-style view for coordinators to quickly scan animals and key info without opening each animal.
- **Metrics** – Add or surface metrics (e.g. euthanized, deceased counts) where useful.
- **Standardize color palette** – Use a single source of truth for all colors (e.g. theme/tokens) so palette changes apply globally.
- **Bulk/max delete for animals** – Bulk delete animals with an optional max cap (e.g. “delete up to N”) for safety.
- **Concurrent edit / version control** – Define behavior when two users edit the same animal or group, or when one user’s action (e.g. group creation with visibility rules) conflicts with another’s (e.g. someone else changed an animal’s visibility). Prefer a simple approach: last-write-wins for normal fields; block or reject the action when it would violate critical rules (e.g. group visibility consistency). Confirm whether this is the only place such conflicts matter and add detection or error handling as needed.

---

## Future bugs / notes

- _Use this section for bugs or ideas to triage later._
- _e.g. Edge cases, rare bugs, or “nice to have” UX notes._

- We might want a request unassignment button for when a group is adopted for example and the coordinators have not unassigned the group yet.
- We should check for phrasing, grammer and typos. ex. capitalization in Visability (and everything tbh, the wording could use some work)
- we probably want to give options to set status and visability on assinment dialog (and unassinment to) with the options set to the defualt
- On group deletion the group list returns 406 console error becuase we try to fetch the deleted group. Same in other places like if an animal is unassigned from a foster and we go the that fosters page. I assume this is happening elsewhere. unassigning groups, deleting animals etc.
- We might want a message all for mass alerts. ability to filter for certain things like all fosters currently fostering for example.
- we need better offline handeling. it is impossible to tell when you are offline and changes are not being saved
- we might want to change the ordering of the status as they appear in the dropdown by a more intuitive ordering, most to leaset used for example
- deceased and euthanized animal do not follow the unassingment flow if they when their status changes (fine for now but might add later for consistancy)
- might be nice to have a way to favorite a photo so that one is shown on cards (helps if they want the most recent photo of the cat and not an old photo)
- We should consider someone might want to use the photos on the app for something and need to download them (for adding to the adoption website for example) how might they do that?
- On the animals details page the "This animal is currently assigned to you." looks kinda weird
- Fosters can so the visability on the fosters needed page on the animals details page and we should hide that field from them.
- If an animal is foster pending on the visability, the tag on the animal details page should be foster pending and not ex. in shelter
- on small screens some modal are not scrollable so if there is content that does not fit on the screen They cannot scroll to it, and sometimes the scroll is set to the page behind it and not to the model. Confirm assignment and confirm unassignment modals are an example.
- We have no working filter for status for groups, which might be relevant on the fosters needed page and we might wanna put it on the groups page. We would have to choose whether we want to match status if all members of group match that status or if one member of the group match that status

- We should put badges like in foster to the right of the animal name instead of underneath it
- It would be nice to be able to reorder the pictures easier or to choose which one displays on the card
- We need a search and filter in the chat list 
- the filter dropdown for oldest first/newest first should be set to oldest first by default but is set to newest first by
- The empty chat for fosters says 
No messages yet
Start the conversation!
Add something to indicate the chat is for the rescue staff at CKC
- if an animal is in a group and the foster has requested that group all animals in that group should have a badge that shows requested (currently shows nothing)
- copy animal button is vague and confusing
- requests should have a indicator of the pending requests
-on mobile(madrid) editing an animal the primary breed drowpdown was auto focused which is a bug itseld but also it prevented scrolling which the real issue. scrolling on mobile is buggy on modals also
-multiple people cannot request a foster at the same time. 
-the foster perspective does not see current group: group name on the animals details page 
- call to actions (primary, seconday, etc.) should all go in the same place (same line, etc.)
- A global UI component is applying full-width styling by default, which causes layout bugs and forces teams to sprinkle one-off CSS overrides across the app instead of controlling width intentionally per usage
- we should improve photo loading optimization. In light boxes we should preload related photos in background on nav to the animals details page or more conservativly on click into the lightbox other photos should load. Or Use a progressive approach: in the lightbox, render the already-loaded thumbnail immediately, then swap to the full-size when it arrives.
-pasted photos are bugged in the lightbox. the dimensions are wrong, too small and does not fill the lightbox.

## Hackathon 
- change the request cancel flow. not x on tag like for animals. group cancel is better
- Fonts
- logos should be clickable to return to homepage
- fill the dashboard. Fosters get a fosters needed preview
- 
- standerdize button patterns and styles. Call to action buttons should go in the same places. primary, secondary etc.
- spacing on messages is confusing (especially the grouped request tags. when the message is not clear it looks like )
- messageing auto scroll to recent messageing
- chat ux improvments, emoji reactions (maybe read recents, deliverd)
- add the badges to the animals and groups list pages for coordinators to see information clearly
- drop down arrow (on the create forms for stuff like lifestage) is too far too the right and looks cramped. needs moved to the left (the month imput is a good padding example)
- entering the create or edit pages should nav to the details page. (animals create does not, check the others)
- when you assing to yourself you don't really need to go through the assignment dialog to send a message to yourself
-modal scrolling on mobile is a problem
-placeholder image can be cuter, like a generic cat icon or something
- the bulk add name input is vertically spaced awkwardly (touching eachother)
- the chat conversation side bar currently has buttonish look to it and it should not (check chat gpt to see a better design)

## Ask skye again.
- Request placeholder text seems to encourage typing a message which is probably good, reasoning: we want them to actually be commited and spend time on the request. Auto fill makes the defualt message behavior more intuiative but we might actualy want the friction in the flow to encoure commitment. 

---

## Questions For CKC 

- Should multiple people be able to request an animal at the same time? Currently if there is one request no one else has the option to rquest that animals (marked as foster pending). If so we will need handling for the fostered needed page and for the 

---

## MVP next features

- Bug fixing
- Foster photos and bio editing
- Foster info updateing (phone number) and coordinator deletion option
- Sign up / sign in restructure (whitelist emails or sign in with Google)
- basic unread message alerts
- MVP UX
- Landing page
- Web notifications (Firebase or whatever)

## MVP+

- Previously fostered
- Redesign; UI and UX polish
- Expo wrapping for mobile app (dev accounts)
