# Foster Editing: Adoption Photos & Bio (Design Plan)

## 1. Goal
Enable users with the `foster` role to update **only two** adoption-facing fields for animals currently assigned to them:
1. Adoption photos (add + remove **their own** photos)
2. Adoption bio (edit)

This feature must feel natural and intuitive: fosters should experience it as “updating this animal’s adoption materials,” not as a restricted admin form.

## 2. Roles & Permissions (UX-level)
### 2.1 Foster capabilities
Fosters can:
- View all adoption photos for the animal
- Add adoption photos to the animal
- Remove only photos that they personally uploaded
- Edit the animal’s `bio` (Adoption Bio)

Fosters cannot:
- Remove photos uploaded by other people
- Edit any other animal fields (status, visibility, medical needs, etc.)

### 2.2 Coordinator capabilities
Coordinators can:
- View who uploaded each photo and when (to distinguish current vs older uploads and foster vs coordinator uploads)

Coordinators keep the existing full “Edit Animal” flow (`/animals/:id/edit`) for any broader edits.

## 3. UX Design
### 3.1 Entry point on Animal Details page
On `AnimalDetail` (top header area), when the logged-in user is a foster and the animal is assigned to them (`animal.current_foster_id === user.id`), show a primary button:
`Update Adoption Photos & Bio`

Clicking the button opens a small foster editor **modal**.  
Non-assigned fosters do not see this button.

### 3.2 Editor scope (what the foster can edit)
The foster editor contains exactly two sections:
1. Photos
2. Adoption Bio (`bio`)

No additional edit fields are shown in this editor.

### 3.3 Photos: unified gallery + ownership affordance
Inside the editor, display **all** animal photos in a single unified gallery (no “Adoption Photos” vs “Other Photos” section).

Ownership + permissions UX:
- Photos uploaded by the current foster:
  - Show an `×` remove button
- Photos uploaded by someone else:
  - Hide the `×` remove button
  - Show a subtle “View-only” hover label on the thumbnail (no “Your photo” badge needed)

This keeps the gallery visually simple while still communicating why certain actions are unavailable.

### 3.4 Coordinator photo metadata in fullscreen viewer (“lightbox”)
The photo fullscreen viewer is the **lightbox** (`PhotoLightbox` in the codebase).

When a coordinator views a photo in the lightbox, show an overlay/caption with:
- Who uploaded the photo (name when possible; otherwise fallback to identifier)
- When it was uploaded (formatted `uploaded_at`)
- The uploader’s role (foster vs coordinator) so coordinators can distinguish “foster-uploaded current images” from older images

Non-coordinator users do not need this metadata in the lightbox (unless later desired).

### 3.5 Adoption Bio editor UX
The foster edits the existing `bio` field:
- Pre-filled with current adoption bio value
- Supports clearing (empty textarea should persist as empty/`null` per your existing DB convention)

### 3.6 Filtering
No filter chips for “Your photos” vs “All photos” in this milestone.
The unified gallery is the single source of truth.

## 4. Component/Code Reuse Strategy
### 4.1 Reuse existing PhotoUpload UI
Reuse the existing `PhotoUpload` component pattern for:
- selection/upload flow
- unified grid of thumbnails
- immediate preview thumbnails

Adjustments needed for foster rules (plan-level requirement):
- `PhotoUpload` currently shows remove buttons for all existing photos whenever `onRemovePhoto` exists.
- For foster mode, remove affordances must be conditional per-photo based on ownership (`uploaded_by`).

### 4.2 Reuse lightbox viewer (PhotoLightbox)
Reuse the existing `PhotoLightbox` for fullscreen viewing.

Plan-level requirement:
- Extend lightbox inputs so it can also display photo metadata (uploaded_by, uploaded_at) for coordinator overlay/caption.

## 5. Data & Backend Design (Plan-Level Decisions)
This section lists the security/consistency design decisions required to ensure:
- fosters can only upload to animals they’re assigned to
- fosters can only delete photos they uploaded
- coordinators remain unrestricted

### 5.1 Photo metadata in `animals.photos`
Today, `animals.photos` stores photo metadata objects including:
- `url`
- `uploaded_at`
- `uploaded_by` (optional in the type, but required for ownership rules in this feature)

Plan-level requirement:
- Ensure **new uploads** always include `uploaded_by` and `uploaded_at`.
- Define behavior for legacy photos missing `uploaded_by`:
  - treat them as non-owned (no foster remove button, foster uploads allowed to coexist)

### 5.2 Ownership enforcement must be backend-backed (not UI-only)
Even if the UI hides deletion controls, a malicious client could attempt unauthorized deletions.

Therefore, this milestone must enforce ownership at the backend for:
- Upload permission (who can insert storage objects)
- Delete permission (who can delete storage objects)
- Database update permission (who can update `animals.bio` and `animals.photos`)

## 6. Recommended Backend Approach (Ownership + Assignment)
### 6.1 Storage: restrict upload/delete using path + assignment rules
Use Supabase storage RLS policies so that:
- Coordinators can upload/delete photos in `animals` storage
- Fosters can only upload/delete photos for animals where they are the current foster
- Fosters can only delete photos they uploaded

Implementation detail may require one of these approaches:
1. **Best option (recommended)**: include enough info in the storage object path (or store `storage_path` in `animals.photos`) so storage policies can confirm ownership by matching:
   - the storage object’s `animal_id`
   - the corresponding photo metadata element in `animals.photos`
   - that element’s `uploaded_by` equals `auth.uid()`
2. If path-based matching isn’t feasible with current data, use an RPC/Edge Function that:
   - verifies ownership against `animals.photos`
   - performs storage deletion with elevated privileges

Tradeoff:
- Path-based RLS is generally simpler long-term once the structure is correct.
- RPC/Edge Functions are more flexible but add operational complexity.

### 6.2 Animals table: restrict foster updates to `bio` and allowed photo changes
Update RLS policies (or use RPC) so fosters can update only:
- `bio`
- `photos` (but only in ways consistent with foster upload/delete ownership rules)

Plan-level requirement:
- Fosters must not be able to change other animal fields.

Recommended strategy:
- Prefer RPC for `photos` updates to avoid complex JSONB-diff constraints inside pure RLS expressions.
- If using pure RLS, the policy must guarantee:
  - `NEW.bio` changes are allowed
  - other critical fields remain unchanged
  - `photos` modifications cannot remove or mutate other owners’ photos

## 7. UX Error Handling (Plan-Level)
For the foster editor:
- Upload failures should show a clear inline error (without making the whole editor unusable).
- If some uploads fail (partial success), persist the successful ones and show how many failed.
- If deletion fails due to permissions, display a “You can only delete your own photos” message (and keep UI state consistent).

## 8. Acceptance Criteria
1. A foster assigned to an animal sees the “Update Adoption Photos & Bio” button.
2. Fosters can upload photos to their assigned animal.
3. In the foster editor, fosters can remove only photos where `photo.uploaded_by === foster_profile_id`.
4. Fosters can edit and save the animal `bio`.
5. Coordinators can view `uploaded_by` and `uploaded_at` in the fullscreen lightbox overlay.
6. No other animal fields are editable from the foster editor.
7. Backend enforcement prevents unauthorized photo deletion and unauthorized animal field updates.

## 9. Open Questions (To Confirm in Next Iteration)
1. For legacy photos without `uploaded_by`:
   - Should they be non-removable for fosters (safe default), or should we attempt a migration?
2. For coordinator lightbox metadata display:
   - Do we show uploader **name**, **email**, or **id** when profile lookup is missing?
3. Backend implementation choice:
   - Do we prefer storage/RLS ownership enforcement via path + metadata matching, or via RPC/Edge Function?

