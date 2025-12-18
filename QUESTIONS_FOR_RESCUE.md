# Questions for Rescue Team — Data & Workflow Clarification

## ⚠️ PRIORITY: Review Google Sheets Tables

**This should be done FIRST before answering other questions.**

1. **Table Review Session:**
    - We need to go through all Google Sheets tables with the coordinator to determine:
        - Which tables are necessary to include in the app
        - Which tables are rarely used or can be excluded
        - Which fields within each table are actually being used vs. left blank
    - This will answer many questions about what data to track and will help prioritize features
    - **Action:** Schedule a session to review each table and determine what's essential for MVP

---

## ⚠️ Important: Push Notifications Limitations

**This is a critical technical consideration that affects app functionality.**

2. **Push Notifications:**
    - **Important Note:** For push notifications to work perfectly (especially on iOS), the app needs to be a true native mobile app. As a Progressive Web App (PWA), notifications may have limitations:
        - iOS Safari has limited notification support
        - Notifications may not work when the app is closed
        - Full notification functionality requires wrapping the PWA in a native app (Expo/React Native)
    - **Question:** Are push notifications critical for the app's usability, or can the app function without perfect notification delivery?
    - If notifications are critical, we may need to prioritize native app development earlier in the roadmap

---

## Animal Status & Transfers

1. **Animal Status:**

    - Do you need a status for animals that aren't in your shelter yet? (e.g., "transferring" from another shelter, waiting to be picked up)
    - Are there other statuses we should include beyond: Needs Foster, In Foster, Adopted, Medical Hold, In Shelter?
    - **"Needs Foster" as status:** We're noticing that "Needs Foster" describes a need rather than a location/status. An animal could be "In Shelter" AND also need a foster, or "Transferring" AND also need a foster. Should "Needs Foster" be:
        - A separate status option (current approach)?
        - A separate field/tag that can be combined with location status (e.g., "In Shelter + Needs Foster")?
        - Something else?

2. **Transfer Process:**
    - When an animal is being transferred from another shelter, at what point do you add them to the system?
    - Do you track where they're coming from during the transfer?

## Dates & Timing

3. **Intake Date:**

    - Is there a difference between when an animal physically arrives ("incoming date") and when you add them to your system ("intake date")?
    - Or are these the same thing and we can just use one "intake date"?

4. **Age Tracking:**
    - How do you typically handle age when you don't have a date of birth?
    - Do you estimate in weeks/months/years, or just "kitten" vs "adult"?
    - Should "senior" be a separate category from "adult"?
    - Do you want to dynamically change the from "kitton" to "adult" to "senior" and what are the benchmarks for that? This could be tricky if the dob birth is not known but there could be a max time rollover from when the field was entered

## Medical & Behavioral Information

5. **Medical Needs:**

    - When you create a placement request, do the medical needs sometimes differ from the animal's general medical record? (e.g., "needs medication during foster period" vs "has ongoing condition")
    - Or are they usually the same?

6. **Behavioral Assessment:**

    - Do you assess socialization on a scale (like 1-5), or is it more like "needs socialization" vs "socialized"?
    - When do you typically do behavioral assessments? At intake or later?

7. **Spay/Neuter Status:**
    - Do you track this as: Fixed, Not Fixed, or Unknown/Not Set?
    - Is it important to distinguish between "spayed" (female) and "neutered" (male), or is "fixed" enough?

## Tags & Filtering

8. **Animal Tags:**

    - What tags/categories do you use most often for filtering? (e.g., "fine with dogs", "bottle fed", "kid friendly", "needs socialization")
    - Are there other important tags we should include?

9. **Missing Information:**
    - When viewing an animal profile, is it helpful to see a list of what information is still missing? (e.g., "needs: vaccines, photos, behavioral assessment")
    - Or is it obvious from the empty fields and we don't need to highlight/filter it separately?

## Placement Requests

10. **Placement Request Description:**

    -   What kind of information goes in the "description" field for a placement request?
    -   Is it different from the animal's general notes?

11. **Priority/Urgency:**

    -   When marking a placement request as "high priority," what makes it high priority?
    -   Is this the same as "urgent," or are they different?

12. **Medical Needs vs Special Care:**
    -   In placement requests, is there a difference between "medical needs" and "special care notes"?
    -   Or are they the same thing?

## Intake Types

13. **Intake Types:**
    -   What are the most common ways animals come in? (e.g., surrender, transfer from another shelter, rescue)
    -   Are there other intake types we should include?

## Petstablished Integration

14. **What information needs to sync with Petstablished?**

    -   Which are the fields that are in petstablished (e.g., name, breed, status, photos)

    -   What information changes require updating Petstablished? (e.g., status changes, new photos, medical updates)
    -   Would it be helpful to have a view that shows the fields in petstablished
    -   What about a toggle to show when those fields are out of date indicates when petstablished is out synce and shows the data needing changed.

## Photos

16. **Photo Organization:**
    -   Do photos need to be associated with specific animals or groups, or is it obvious from context?
    -   Do you need to add descriptions to photos, or is it clear what they show?

## Groups & Relationships

17. **Animal Groups:**

    -   When you have a litter or group, do you always create individual profiles for each animal, or sometimes just a group profile?
    -   Do group photos need to be separate from individual animal photos?

18. **Family Relationships:**
    -   How important is it to track parent/child or sibling relationships?
    -   Is this mainly for litters, or do you track other family connections?

## Foster Assignments

19. **Foster Tracking:**
    -   Do you need to track which foster is currently assigned to each animal in the animal record itself?
    -   Or is that tracked separately in assignments?

19.5. **Status Changes and Foster Assignments:** - When an animal's status changes from "in_foster" to another status (e.g., "adopted", "in_shelter", "medical_hold"), should the foster assignment be automatically cleared/removed? - Or should the foster assignment remain even after status changes (for historical tracking)? - Are there specific status transitions that should always clear foster assignments? (e.g., "in_foster" → "adopted" always clears, but "in_foster" → "medical_hold" might keep assignment) - When changing status TO "in_foster", should the system require a foster assignment, or can an animal be "in_foster" without an assigned foster? - If an animal is removed from a group (and the group was assigned to a foster), should the animal's individual foster assignment be cleared, or preserved?

## General Workflow

20. **Data Entry:**

    -   When you get a bulk intake (like a large rescue shipment), how much information do you typically have initially?
    -   What's the minimum information you need to create an animal profile? (e.g., just species and source?)

21. **Information Updates:**

    -   What information changes most frequently? (e.g., status, weight, medical notes)
    -   What information rarely changes once set? (e.g., breed, source)

22. **What information is most critical for day-to-day operations?**
    -   What do coordinators need to see immediately when viewing an animal?
    -   What can be hidden or shown at the bottom if it's missing?

## Data Display & Field Visibility

44. **Blank Field Display:**

    -   When viewing an animal detail page, should we:
        -   Show all fields and label blank ones as "Not set" or "N/A"?
        -   Only show fields that have data and hide blank fields entirely?
    -   Which approach is more useful for your workflow?

45. **Field Visibility for Fosters:**

    -   What fields/data should be visible to fosters when they view animals?
    -   Are there fields that should always be hidden from fosters? (e.g., internal notes, sensitive medical info, adoption fees, donor information)
    -   Should fosters see their own assigned animals' full records, or limited information?
    -   Should fosters see other animals' information, or only their assigned animals?

46. **Data Flexibility:**

    -   Some fields might need to be flexible in format. For example:
        -   A date field might need to include a note (e.g., "2024-01-15 (estimated)" or "2024-01-15 - vet confirmed")
        -   A dropdown field might need to allow custom text entries
    -   Which fields need this flexibility? (dates, dropdowns, etc.)
    -   Would it be acceptable to have separate "notes" fields for these, or do you need the flexibility within the field itself?

47. **Dropdowns with Custom Entries:**
    -   For fields that commonly have repeated values, would it be helpful to have dropdowns that:
        -   Show previously entered values for quick selection
        -   Allow adding new custom entries that are saved for future use
        -   Allow removing entries that are no longer needed
    -   Which fields would benefit from this? (e.g., payment methods, medication names, primary breed, source/location, tags)
    -   How should we handle entries that are no longer used? (hide them, allow deletion, mark as inactive)

## Activity Logging & Recordkeeping

23. **Activity Logging & Change Tracking:**

    -   Do you need to track who performed what actions? (e.g., "John updated Fluffy's status", "Sarah assigned Mittens to Jane")
    -   Or is it enough to just show timestamps of when things changed? (e.g., "Updated 2 hours ago")
    -   Would an activity timeline showing who did what be useful, or is it unnecessary complexity?

24. **What Changes to Track:**

    -   What actions/changes are most important to track? (e.g., status changes, assignments, medical updates, adoption completion)
    -   Do you need to track ALL changes to all fields, or only specific important fields?
    -   Is tracking the "last edited" change sufficient, or do you need full history of all changes?
    -   Which fields require change tracking? (e.g., status, medical records, assignments, adoption info)

25. **Change Tracking Display:**
    -   How should change tracking be displayed? (e.g., "Last updated by John on Jan 15, 2024", activity timeline, change log)
    -   Where should this information appear? (on detail pages, in a separate history view, both)
    -   Do you need to see what the previous value was, or just that it changed?

## Medications & Medical Tracking

26. **Medication Information:**

    -   What information do you need to track for each medication? (e.g., medication name, dose, pharmacy, frequency, start date, end date)
    -   Do medications need additional notes/instructions?
    -   Are there multiple medications per animal that need to be tracked simultaneously?
    -   Do you need to track medication history (past medications, not just current ones)?

27. **Weight Tracking:**

    -   How often do you track animal weight? (e.g., weekly, monthly, per vet visit)
    -   Should weight be displayed as a timeline showing weight changes over time?
    -   Is weight tracking critical for day-to-day operations, or mainly for historical records?

28. **Medical Records:**
    -   Do you need to track which veterinarian provided care?
    -   Do vet visits need additional notes?
    -   Are there other medical records beyond medications and vaccines that need tracking?

## Foster Information (Additional Fields)

29. **Foster Contact Information:**

    -   What contact information is essential? (phone number, address, location/city)
    -   Should phone number be required during sign-up, or can it be added later?
    -   How do you want address/location stored? (full address, city/state, or just city?)

30. **Foster Status & History:**

    -   How do you determine if someone is a "repeat foster"? (count of animals fostered, count of groups fostered, or both?)
    -   Is "repeat foster" status automatically calculated, or manually set?
    -   Do you need to track foster history (all past assignments) or just current status?

31. **Foster Onboarding:**
    -   Do you need to track if a foster has signed a contract? (yes/no, date signed)
    -   Do you need to track home inspection? (date completed, who performed it)
    -   Are these required before a foster can be assigned animals, or just tracked for record-keeping?
    -   **Home Inspection Details:**
        -   What information is essential for home inspections? (date, inspector name, pass/fail status, notes)
        -   Do you need to track multiple home inspections per foster (e.g., annual re-inspections), or just the most recent one?
        -   Should home inspection status be visible to fosters, or only to coordinators?
        -   Is home inspection required before a foster can be assigned animals, or can assignments happen before inspection?

## Adoption Data

32. **Adoption Status:**

    -   Do you need to track if an animal is "posted online" for adoption? (yes/no toggle)
    -   What does "posted online" mean? (Petstablished, social media, website, or all of the above?)
    -   Is there an "Instagram" toggle/field? What does this track?

33. **Approved Adopters:**

    -   Do you need a separate list/table of approved adopters?
    -   What information is essential for each approved adopter? (name, phone number, email, date added)
    -   Can multiple adopters be approved for the same animal? (waitlist functionality)
    -   How do you track the order/priority of approved adopters? (first approved, second approved, etc.)

34. **Adoption Completion:**

    -   What information needs to be tracked when an adoption is completed?
    -   Do you need to track adoption date and time, or just date?
    -   Do you need to track adoption fee? (amount, whether paid, payment method)
    -   Do you need to track where the animal was adopted from? (location, event, etc.)
    -   Do you need to track if records were sent to the adopter? (yes/no, date sent)
    -   Is there a "moved to café" status? What does this mean?

34.5. **Adopter Information:** - What information is essential to track for adopters? (name, phone number, email, address, emergency contact) - Should adopter information be stored in the animal record, or in a separate adopters/adoptions table? - Can the same adopter adopt multiple animals? If so, should we link adoptions to a single adopter profile? - Do you need to track adopter contact information for follow-ups or future adoptions? - When an animal's status changes to "adopted", should the system: - Require adopter information to be entered before saving? - Allow saving "adopted" status without adopter info (to be added later)? - Automatically clear the foster assignment when status changes to "adopted"? - Should adopter information be visible to fosters, or only to coordinators?

35. **Adoption Display:**
    -   Do you need to view adoptions grouped by month? (e.g., "Total adoptions in January")
    -   Is monthly adoption reporting important for your workflow?

## Vaccines

36. **Vaccine Tracking:**

    -   Do you need to track all vaccines for each animal, or just whether they're up to date?
    -   What information is needed per vaccine? (vaccine type, date given, due date, who administered)
    -   Do vaccines need additional notes?
    -   Do you need to track vaccine history (past vaccines) or just current/upcoming?

37. **Vaccine Due Dates:**
    -   Is tracking upcoming due dates critical for day-to-day operations?
    -   Do you need reminders/notifications for vaccines that are due?

## Donations

38. **Donation Tracking:**
    -   Do you need to track donations in the system?
    -   What information is essential? (donor name, amount, what it's for, contact information)
    -   For contact information, are you tracking both email AND payment method (PayPal, Venmo, Zelle, Chewy)?
    -   Should email and payment method be separate fields, or combined?
    -   Do you need donation history/reports?

## Volunteers

39. **Volunteer Tracking:**
    -   Do you need to track volunteers separately from fosters?
    -   What information is essential? (name, title/role, what they do)
    -   Is volunteer tracking critical for day-to-day operations, or mainly for record-keeping?

## Inventory Tracking

40. **Inventory Management:**
    -   Do you need to track inventory/supplies in the system? (e.g., food, medications, supplies, equipment)
    -   What types of items do you track? (e.g., cat food, litter, medications, cleaning supplies, medical equipment)
    -   What information is essential for each inventory item? (name, quantity, location, expiration date, supplier, cost)
    -   Is inventory tracking critical for day-to-day operations, or mainly for record-keeping?
    -   Do you need to track inventory usage/consumption, or just current quantities?
    -   Do you need low-stock alerts/notifications?
    -   Would it be helpful to tag inventory items in messages? (e.g., "We need more @cat-food" or "Running low on @litter")

## Field Customization & Organization Settings

41. **Customizable Fields:**

    -   Should organizations be able to toggle which fields they want to use? (e.g., some orgs might not track "Instagram" field)
    -   Is this a priority feature, or can we start with a standard set of fields?
    -   Would field customization be a stretch goal/post-MVP feature?
    -   Should organizations be able to control which fields are visible to fosters? (see also question 45)

42. **Unused Fields:**
    -   In your current tracking system, are there fields/tabs that are mostly blank or unused?
    -   Are there fields you track but rarely use? (e.g., "logins", "prescription details")
    -   Should we exclude rarely-used fields from MVP, or include them for completeness?

## Additional Notes

43. **Notes Fields:**
    -   Which entities need "additional notes" fields? (medications, vaccines, vets, fosters, animals, adoptions, etc.)
    -   Are notes critical for all of these, or only some?
    -   Should notes be searchable?

---

# Technical Design Decisions

## Database Schema & Relationships

### Medications

**Questions:**

-   Should medications be stored in a separate `medications` table, or as JSONB array in `animals` table?
-   What fields are required for each medication? (name, dose, frequency, start_date, end_date, notes, weight_at_time?)
-   Do we need to track medication history (past medications) or just current medications?
-   Should weight be tracked separately in a `weight_history` table with timeline, or just as part of medication records?

**Design Options:**

-   **Option 1:** Separate `medications` table with foreign key to `animals`
-   **Option 2:** JSONB array in `animals.medications` field
-   **Option 3:** Hybrid: current medications in JSONB, history in separate table

### Foster Information

**Questions:**

-   Should additional foster fields (phone, address, contract_signed, home_inspection_date, home_inspection_by) be added to existing `profiles` table or separate `foster_details` table?
-   How to calculate "repeat foster" status? (query count of assignments, or store as boolean/flag?)
-   Should foster history be tracked in a separate `foster_assignments` table with start/end dates?

**Design Options:**

-   Add fields directly to `profiles` table (simpler, but mixes user auth data with foster-specific data)
-   Create `foster_profiles` table with foreign key to `profiles` (better separation, but more complex)

### Adoption Data

**Questions:**

-   Should adoption data be stored in `animals` table (adoption_date, adoption_fee_paid, etc.) or separate `adoptions` table?
-   Should `approved_adopters` be a separate table with foreign key to `animals`?
-   How to handle waitlist/priority order for approved adopters? (sequence number, created_at timestamp, or separate priority field?)
-   How to track "location adopted from"? (separate field, or part of adoption record?)

**Design Options:**

-   **Option 1:** Add adoption fields to `animals` table (simpler, but mixes adoption data with animal data)
-   **Option 2:** Separate `adoptions` table (better for tracking multiple adoption attempts, history)
-   **Option 3:** Separate `approved_adopters` table + adoption fields in `animals` (tracks both approved list and completed adoption)

### Vaccines

**Questions:**

-   Should vaccines be stored in separate `vaccines` table or JSONB array in `animals` table?
-   Do we need to track vaccine history (past vaccines) or just current/upcoming?
-   How to track due dates? (calculated field based on last vaccine date + interval, or stored explicitly?)

**Design Options:**

-   **Option 1:** Separate `vaccines` table with foreign key to `animals` (better for querying due dates, history)
-   **Option 2:** JSONB array in `animals.vaccines` (simpler, but harder to query)

### Donations

**Questions:**

-   Should donations be a separate `donations` table?
-   Should contact information be split into separate fields (email, payment_method) or combined?
-   Do donations need to be linked to specific animals, or just tracked generally?

**Design Options:**

-   Separate `donations` table with optional `animal_id` foreign key (allows both general and animal-specific donations)

### Volunteers

**Questions:**

-   Should volunteers be stored in `profiles` table with a `role` field, or separate `volunteers` table?
-   Do volunteers need accounts/login, or just contact information?

**Design Options:**

-   If volunteers need accounts: add to `profiles` with `role = 'volunteer'`
-   If just contact info: separate `volunteers` table

## Data Display & UI

### Table/Spreadsheet View

**Questions:**

-   Should we implement a data table component (like react-table or similar) for viewing many animals at once?
-   Which fields should be visible by default in table view? (see also question 22)
-   Should table columns be customizable/hideable by users?
-   Do we need sorting and filtering in table view?

**Design Options:**

-   Use a data table library (react-table, ag-grid, etc.) for performance with large datasets
-   Implement custom table with pagination for mobile-friendly experience

### Field Visibility & Customization

**Questions:**

-   Should field visibility be controlled at organization level (all fosters in org see same fields) or per-field basis?
-   How to store organization-level field preferences? (JSONB field in `organizations` table, or separate `organization_field_settings` table?)
-   Should field customization be a feature flag or always available?
-   How to store dropdown custom entries? (separate table per field type, or JSONB array in organization settings?)

**Design Options:**

-   **Option 1:** JSONB field in `organizations` table: `field_visibility: { "instagram": false, "adoption_fee": true }`
-   **Option 2:** Separate `organization_field_settings` table (more normalized, but more complex)
-   **Option 3:** Role-based visibility (simpler, but less flexible)
-   **For dropdown entries:** Separate `field_options` table with `field_name` and `organization_id` for custom entries

## Timeline & History Tracking

**Questions:**

-   Should weight tracking be a timeline (separate `weight_history` table with dates) or just current weight?
-   Should medication history be tracked (past medications) or just current?
-   Should vaccine history be tracked (past vaccines) or just current/upcoming?
-   Do we need a general `animal_history` or `activity_log` table to track all changes? (see also questions 23-25)
-   What level of detail is needed for change tracking? (who changed, when changed, what changed from/to, or just "last updated by X on Y date"?)

**Design Options:**

-   Timeline approach: Separate history tables for weight, medications, vaccines (better for reporting, but more complex)
-   Current-state approach: Only track current values (simpler, but loses history)
-   Hybrid: Track current state + last change info (who, when) without full history

## Data Types & Validation

**Questions:**

-   For dates with times (adoption_date), should we use `TIMESTAMPTZ` or separate `DATE` and `TIME` fields?
-   For phone numbers, should we store as TEXT or validate format?
-   For addresses, should we store as single TEXT field or separate fields (street, city, state, zip)?
-   For payment methods, should we use ENUM type or TEXT with validation?
-   For fields that need flexibility (dates with notes, dropdowns with custom entries), should we:
    -   Use separate fields (e.g., `adoption_date` + `adoption_date_notes`)?
    -   Use TEXT fields that allow free-form input?
    -   Use JSONB to store structured data with optional notes?

## Performance & Scalability

**Questions:**

-   If we implement table views with many rows, do we need pagination, virtual scrolling, or both?
-   Should we implement database indexes for frequently queried fields (adoption_date, vaccine_due_date, etc.)?
-   For monthly adoption reports, should we pre-calculate aggregates or calculate on-demand?


Main question is narrow the problem to a small solvable mvp.
Don't try to remodel their entire workflow.
Current plan is chatting, and foster facing animal data, foster details(maybe)

not replacing the entire google sheets data
do we want to track animals? (details are in multiple places)
do we want to replace teh foster placement requests


user sign up/login with codes

Fosters
dashboard with their animals



expected pain points 
notifications
adding another system into your workflow
lots of information tracking and some duplications
migration!!!!
fosters all have to download an app and they have to use it for communication with you.
might be bugs which will make migration more difficult

I want to avoid a situation where I make an app that you don't use or makes your lives more difficult adds more complexity to your workflow



notifications 
and videos

when will weeks roll to months
life stage roll over
we need clarification on status, and display



future feature might be favoriting a photo it apear first (photo for the preview)


sign in with google

don't do codes. whitelist approved foster emails.

custom message build for 

auto message foster updates (photos and bios)

auto messages for foster animal/group requests


There are a lot of queries that we might want the refactor into reusable dry code. what do you think. 
@AnimalDetail.tsx (149-171)  is an example. if we were to do this again or have this duplicated in multiple places it would be good to refactor. identify other reused logic in our code that we should refactor. 
Recommendations:
Create a shared helper function to reduce duplication
Add staleTime to reduce unnecessary refetches
Consider a separate cached query for groups that can be shared across pages
Only fetch group names when needed (e.g., not in GroupDetail where we already know the group)
pagination approach might be good to avoid mass loading. we should consider this for search/filter also
we need to think about performance for animals list, and group list. and sublists. pagination. if there are a bunch of animals/groups we need to make sure that theperformance is not going to be substantially bad. this might also effect search/filter




if an animal with high priority is added to a group the priority of the group should toggle to high. this should not be enforced though so it can be changed by the user its just a toggle when the animal is added.

evntually we will need an add to group from the create and edit animal page



I have a design question for the rescue. I need to resolve a complex issue about how to resolve conflicts in animal: status and display as foster needed setting when it comes to groups
Planed Policy for animals: display setting is master for if displayed on fosters needed page
if set the display status options are available now, available, future and foster pending. our planned logic 
if in shelter display avaiable now
if medical hold or transferring display avaiable future
if the animal has a foster request display foster pending.
if animal is in foster, or adopted, do not display on fosters needed page  (edge case where the animal is in foster or adopted and actually needs to go back into the foster system and available future)

design decisions need to be made about how we want to handle status changes for animals in groups. should they be removed? should they remain and just status is displayed? example if an animal's status in changed and they are in a group should all the animals in the group status change. should we hava a group status change? (we don't track group status rn). should we allow animals in group to have differnet status or enforce same status? display in fosters needed page is based on individual animal page rn soooo this could be an issue. 
main decision is when should the group be displayed in the fosters needed page. 
options: 
1. synchornize and enforce status and display fields of animals in group and display with same rule as animals 
2. do not synchronize anything and display the entire group if any animal in the group is marked as display
3. have a display field in group(edit and create) this might be a ui only and synchronizes all displays for animals when toggled
think about the flow for creation and also edge cases and trade offs
if animal status and display values(probably more important) match then no issues to resolve display to enforcing might be easiest. requires logic for group creation, editing, and status changes that update display setting(in foster, adoptions, etc.)
if animals are grouped but differnt statuses and display settings allowed then difficult to resolve in group. 
easiest option i think is to control in the group creation and editing. if an animal is added with display setting on then all animals get display toggled on 
tricky to resolve different group statuses in the fosters needed status (available now, available future, foster pending)
options for group enforcment of animal status and display settings
enforcement is complex and not easy to customize but more automation for foster needed status. 
enforcment with cutomizabiltiy allows for edge cases and difficulty resolving foster needed status.
no enformecemt means animals status and display settings are customizable but automatic tracking logic is complex to resolve and also 
available incoming????
I think we synchronize display settings and animal status for animals in the same group. easy to resolve foster needed status. downside is enforcement  (nice for automation but not customizeable and might have undesired effects) that grouped animals cannot have different statuses and display settings
edge cases might be rare. example. 3 kittens. 

we could handle with prioritasaion logic. lets say that display setting (for the fosters needed page) must be the same for all animals in a group an is enforced but status is not. we need to resolve the status in the fosters needed page (available now, available future, foster pending). 
the proposed rules for animals
in shelter -> available now
medical hold, transferring  -> available future
in foster, adopted -> not displayed (but what if display setting is set?? maybe setting is locked in this case??) 
on certain events this settings were to be auto set: foster requests accepted(in foster set and disply false), animal adopted (adopted set and foster unassigned), in shelter set (foster unassigned if relevent)

maybe the best way to do this is remove display setting and handle everything is status? add new statuses to handle edge cases/clear up the display behavior? 
in shelter(available now), transferring(avaiable future) on hold(available future), in foster (not available) adopted(not available) should status still be synchronized in groups. this might be the best way

or no enforcment whatsoever and group status and animals status is NOT synced and has to be manually updated (no automation and manually updating. this kinda sucks)

maybe its just up to me and they deal with the trade offs. we might be over complicating things to handle edge cases and should just deliver a simple solution with no synchornization. maybe we have two seperate statuses:
animal status: in shelter, medical hold, transferring, adopted, in foster
foster request message: available now, available future, foster pending, not displayed
this still requires logic for resolving groups statuses. if animal in group all foster request messages are synced?? maybe certain events sync all grouped animals status ad request messages? are synced? group adoptions? group foster requests accepted?

Do we need a status for in cafe (similair rules for in foster? or different rules???)
maybe we just go super simple and remove animal status complelty have only display setting available now, available future, foster pending, not displayed (group display setting still needs synchronized)
or maybe animal status is kept but not synced and is only interanl




Decision: Foster History Handling
We will use snapshot records for foster group assignments instead of fully tracking historical group state.
When a group is assigned to a foster, we store a snapshot of the group’s presentation data (group info, photos, animals in the group at that time). This snapshot represents historical experience, not live state, and does not update based on later animal status changes (adoptions, moves, group edits).
Animals remain first-class records and will continue to track foster history relationally (no snapshots). This allows animal foster history to remain accurate and correctable without duplicating data.
This approach avoids a full schema rework, preserves meaningful foster history, and accepts that group snapshots may occasionally immortalize assignment mistakes as a deliberate UX trade-off.


we might want a tinder style veiw for needs foster page. (fixes the photo text sizing too idk maybe not)

found a bug with page auto scrolling to bottom on repeat navigation back to the animal details page. does not happen first time but navigation back to it caused this 


bug the app only subscribes to real time messages when the chat is opened and this might be a bug for when we want to have notifications or unread messages (we will need to have read on unread added to the messaging)

Consider a useUnsavedChanges hook to warn before canceling with unsaved changes

Make the nav bar responsive: horizontal on desktop, hamburger menu on mobile

problem. if I click on currenlty fostered animal or group from dashboard or from the foster menu the navigation from that group goes to groups and not back to the currently fostered page. (so we might actually want a back button in certain cases)

what does SHELTER-6 mean in the foster name column in co kitty coalition tracker.



next features:
fosters needed page
request and assignment handeling for animals and groups. 
navigation
ui polish and branding for co kitty coalition
copy animal
search & filter
tagging in messages


foster details?? do we want that I can't remeber
we need delete foster option. should unassign animals and groups from them on deletion


finalizing the schema (removing unused fields)

The photos load in strange on animals pages. Maybe lowering resilution would help?
1. takes a awhile to load pics (paint them in the browser maybe??) longer on first load (faster when cached)
2. scrolling the page also is weird and photos take a second to load. (paint issue too?)


I want similiar functionality for the groups form for the set all... fields 
@GROUP_STATUS_DESIGN_DECISION.md (149-157) 
I think that if all the foster_visability status of the animals in group are the same the group field "set all animals Visibility on Fosters Needed page" should indicate that in some way like have a green check at says "no conflicts" or "all grouped animals visability matches"  and the foster_visability drop down should be set to the groups shared foster_visability. 



Q: should foster see status on animal details? pro: more info, won't ask you about it. Con: might be annoying to maintain might result in more questions actually (were are they transferring from and when(they might ask that anyway tbh) if conflicts/stale "why does it say in_shelter when I am fostering them?")

Q: if on medical hold should auto sync to available future or not visable? no a critical decision but what is more common?

Recommendation: Add a useUnsavedChanges hook and warn on navigation (not on reload, since reload resets everything anyway). This is a common UX pattern for forms.

also I just realized that if we try to update an animal in the edit animal form and they are in a group we need to somehow enforce that we are not breaking the rule that all animals in a group foste visibility matches. the best was to do this is proably 
if animal is in group. and visiability is changed Alert (<animal_name> is in group: <group_name>, all animals in a group must have the same viability. button: change all animals in group to (selected visability) button: cancel 

The group details needs to show visability on foster needed page

Lets show the name and not email addres of however is logged in