import { useEffect, useMemo, useRef, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

import type { PhotoMetadata } from "../../types";
import { supabase } from "../../lib/supabase";
import { uploadAnimalPhoto, deleteAnimalPhoto } from "../../lib/photoUtils";
import { getErrorMessage, checkOfflineAndThrow } from "../../lib/errorUtils";

import Button from "../ui/Button";
import ErrorMessage from "../ui/ErrorMessage";
import PhotoUpload from "./PhotoUpload";
import Textarea from "../ui/Textarea";
import LoadingSpinner from "../ui/LoadingSpinner";

interface FosterAdoptionEditorModalProps {
	isOpen: boolean;
	onClose: () => void;

	animalId: string;
	organizationId: string;
	/** The current foster profile id (auth uid == profile id). */
	fosterProfileId: string;

	initialBio?: string | null;
	initialPhotos?: PhotoMetadata[];

	onSaved: () => void;
}

export default function FosterAdoptionEditorModal({
	isOpen,
	onClose,
	animalId,
	organizationId,
	fosterProfileId,
	initialBio,
	initialPhotos,
	onSaved,
}: FosterAdoptionEditorModalProps) {
	const [bioDraft, setBioDraft] = useState(initialBio ?? "");
	const [displayPhotos, setDisplayPhotos] = useState<PhotoMetadata[]>(
		initialPhotos ?? []
	);
	const [photosToDelete, setPhotosToDelete] = useState<string[]>([]);

	const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
	const [uploadingPhotos, setUploadingPhotos] = useState(false);
	const [photoUploadError, setPhotoUploadError] = useState<string | null>(null);
	const [deletionError, setDeletionError] = useState<string | null>(null);
	const [submitError, setSubmitError] = useState<string | null>(null);

	const [isSaving, setIsSaving] = useState(false);
	const [resetSignal, setResetSignal] = useState(0);
	const hasInitializedForAnimalRef = useRef<string | null>(null);

	const existingPhotosForUi = useMemo(() => {
		return displayPhotos.filter(
			(photo) => !photosToDelete.includes(photo.url)
		);
	}, [displayPhotos, photosToDelete]);

	// Reset modal state when opening / when a new animal is loaded.
	useEffect(() => {
		if (!isOpen) {
			hasInitializedForAnimalRef.current = null;
			return;
		}

		// Prevent parent refetches (which may change initialPhotos identity)
		// from wiping the user's in-modal edits/errors.
		if (hasInitializedForAnimalRef.current === animalId) return;
		hasInitializedForAnimalRef.current = animalId;

		setBioDraft(initialBio ?? "");
		setDisplayPhotos(initialPhotos ?? []);
		setPhotosToDelete([]);
		setSelectedPhotos([]);
		setUploadingPhotos(false);
		setPhotoUploadError(null);
		setDeletionError(null);
		setSubmitError(null);
		setIsSaving(false);
		setResetSignal((n) => n + 1);
	}, [isOpen, animalId, initialBio, initialPhotos]);

	const handleRemoveExistingPhoto = (photoUrl: string) => {
		setPhotosToDelete((prev) => {
			if (prev.includes(photoUrl)) return prev;
			return [...prev, photoUrl];
		});
	};

	const handleSubmit = async () => {
		setSubmitError(null);
		setPhotoUploadError(null);
		setDeletionError(null);
		setIsSaving(true);

		try {
			checkOfflineAndThrow();

			// 1) Delete photos (storage first)
			const deleteCandidates = photosToDelete;

			const deleteSettled = await Promise.allSettled(
				deleteCandidates.map(async (photoUrl) => {
					await deleteAnimalPhoto(photoUrl, organizationId);
					return photoUrl;
				})
			);

			const failedDeleteUrls: string[] = [];
			let hadPermissionFailure = false;

			deleteSettled.forEach((result, index) => {
				const photoUrl = deleteCandidates[index];
				if (result.status === "fulfilled") {
					// Successful deletions are removed from the final in-modal photo list below.
				} else {
					failedDeleteUrls.push(photoUrl);
					const msg =
						result.reason instanceof Error
							? result.reason.message
							: String(result.reason);
					if (msg.toLowerCase().includes("permission denied")) {
						hadPermissionFailure = true;
					}
				}
			});

			if (failedDeleteUrls.length > 0) {
				if (hadPermissionFailure) {
					setDeletionError("You can only delete your own photos.");
				} else {
					setDeletionError(
						`Some photos could not be deleted (${failedDeleteUrls.length} failed).`
					);
				}
			}

			// Apply deletions to the in-modal photo list:
			// - successful deletions removed
			// - failed deletions remain
			const photosAfterDeletions = displayPhotos.filter(
				(photo) =>
					!deleteCandidates.includes(photo.url) ||
					failedDeleteUrls.includes(photo.url)
			);

			// 2) Upload new photos
			setUploadingPhotos(true);
			const uploadResults = await Promise.allSettled(
				selectedPhotos.map(async (file) => {
					const url = await uploadAnimalPhoto(
						file,
						organizationId,
						animalId
					);
					return url;
				})
			);

			const successfulUploads: Array<{
				url: string;
				uploaded_at: string;
				uploaded_by: string;
			}> = [];
			let failedUploads = 0;

			uploadResults.forEach((result) => {
				if (result.status === "fulfilled") {
					successfulUploads.push({
						url: result.value,
						uploaded_at: new Date().toISOString(),
						uploaded_by: fosterProfileId,
					});
				} else {
					failedUploads += 1;
				}
			});

			setUploadingPhotos(false);

			if (failedUploads > 0) {
				setPhotoUploadError(
					`Saved adoption bio, but ${failedUploads} photo${
						failedUploads !== 1 ? "s" : ""
					} failed to upload.`
				);
			}

			const finalPhotos: PhotoMetadata[] = [
				...photosAfterDeletions,
				...successfulUploads,
			];

			// 3) Update bio + photos with backend enforcement (RPC)
			const finalBio =
				bioDraft.trim().length > 0 ? bioDraft.trim() : null;

			const { error: rpcError } = await supabase.rpc(
				"update_animal_adoption_materials",
				{
					p_animal_id: animalId,
					p_bio: finalBio,
					p_photos: finalPhotos,
				}
			);

			if (rpcError) {
				throw new Error(getErrorMessage(rpcError, "Failed to save."));
			}

			// Update in-modal state to keep UI consistent, then ask parent to refetch.
			setDisplayPhotos(finalPhotos);
			setPhotosToDelete([]);
			setResetSignal((n) => n + 1);

			onSaved();

			const hasAnyPhotoIssues =
				failedUploads > 0 || failedDeleteUrls.length > 0;

			if (!hasAnyPhotoIssues) {
				onClose();
			}
		} catch (err) {
			setSubmitError(
				getErrorMessage(
					err,
					"Failed to update adoption photos and bio. Please try again."
				)
			);
		} finally {
			setUploadingPhotos(false);
			setIsSaving(false);
		}
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 overflow-y-auto">
			{/* Backdrop */}
			<div
				className="fixed inset-0 bg-black/50 transition-opacity"
				onClick={onClose}
				aria-hidden="true"
			/>

			{/* Dialog */}
			<div className="flex min-h-full items-center justify-center p-4">
				<div className="relative w-full max-w-md transform rounded-lg bg-white shadow-xl transition-all">
					{/* Header */}
					<div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
						<h3 className="text-lg font-semibold text-gray-900">
							Update Adoption Photos & Bio
						</h3>
						<button
							type="button"
							onClick={onClose}
							disabled={isSaving}
							className="rounded-md p-1 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500"
						>
							<XMarkIcon className="h-5 w-5" />
						</button>
					</div>

					{/* Content */}
					<div className="px-4 py-4 space-y-4">
						{submitError && <ErrorMessage>{submitError}</ErrorMessage>}
						{deletionError && <ErrorMessage>{deletionError}</ErrorMessage>}

						<PhotoUpload
							maxPhotos={10}
							onPhotosChange={setSelectedPhotos}
							existingPhotos={existingPhotosForUi}
							onRemovePhoto={handleRemoveExistingPhoto}
							canRemoveExistingPhoto={(photo) =>
								(photo.uploaded_by ?? null) === fosterProfileId
							}
							viewOnlyHoverLabel="View-only"
							disabled={isSaving || uploadingPhotos}
							error={photoUploadError}
							resetSignal={resetSignal}
						/>

						<Textarea
							label="Adoption Bio"
							value={bioDraft}
							onChange={(e) => setBioDraft(e.target.value)}
							placeholder="Enter adoption bio (optional)"
							rows={4}
							disabled={isSaving || uploadingPhotos}
						/>
					</div>

					{/* Footer */}
					<div className="flex justify-end gap-3 border-t border-gray-200 px-4 py-3">
						<Button
							type="button"
							variant="outline"
							onClick={onClose}
							disabled={isSaving}
						>
							Cancel
						</Button>
						<Button type="button" onClick={handleSubmit} disabled={isSaving}>
							{isSaving ? (
								<span className="inline-flex items-center gap-2">
									<LoadingSpinner message="Saving..." />
								</span>
							) : (
								"Save"
							)}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}

