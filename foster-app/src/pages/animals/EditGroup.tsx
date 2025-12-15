import { useState } from "react";
import type { FormEvent } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { useProtectedAuth } from "../../hooks/useProtectedAuth";
import { useGroupForm } from "../../hooks/useGroupForm";
import NavLinkButton from "../../components/ui/NavLinkButton";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import ErrorMessage from "../../components/ui/ErrorMessage";
import GroupForm from "../../components/animals/GroupForm";
import ConfirmModal from "../../components/ui/ConfirmModal";
import { getErrorMessage, checkOfflineAndThrow } from "../../lib/errorUtils";
import {
	fetchGroupById,
	updateGroup,
	findGroupContainingAnimal,
} from "../../lib/groupQueries";
import { fetchAnimals } from "../../lib/animalQueries";
import type { Animal, TimestampedPhoto } from "../../types";
import { uploadGroupPhoto, deleteGroupPhoto } from "../../lib/photoUtils";

export default function EditGroup() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { user, profile, isCoordinator } = useProtectedAuth();

	// Fetch group data (must be before early return)
	const {
		data: group,
		isLoading: isLoadingGroup,
		isError: isErrorGroup,
		error: groupError,
	} = useQuery({
		queryKey: ["groups", user.id, profile.organization_id, id],
		queryFn: async () => {
			if (!id) {
				throw new Error("Group ID is required");
			}
			return fetchGroupById(id, profile.organization_id);
		},
		enabled: !!id && isCoordinator,
	});

	// Fetch all animals for selection
	const {
		data: animals = [],
		isLoading: isLoadingAnimals,
		isError: isErrorAnimals,
	} = useQuery<Animal[], Error>({
		queryKey: ["animals", user.id, profile.organization_id],
		queryFn: () => {
			return fetchAnimals(profile.organization_id, {
				fields: [
					"id",
					"name",
					"status",
					"sex_spay_neuter_status",
					"priority",
					"photos",
					"date_of_birth",
					"group_id",
				],
				orderBy: "created_at",
				orderDirection: "desc",
			});
		},
		enabled: !!group && isCoordinator,
	});

	// Use the form hook with existing group data (must be before early return)
	const {
		formState,
		setName,
		setDescription,
		setPriority,
		selectedAnimalIds,
		toggleAnimalSelection,
		validateForm,
		errors,
	} = useGroupForm({ initialGroup: group || null });

	const [loading, setLoading] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);
	const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
	const [photosToDelete, setPhotosToDelete] = useState<string[]>([]);
	const [photoUploadError, setPhotoUploadError] = useState<string | null>(
		null
	);

	// Duplicate detection modal state
	const [duplicateModal, setDuplicateModal] = useState<{
		isOpen: boolean;
		animalId: string;
		animalName: string;
		existingGroupId: string;
		existingGroupName: string;
	}>({
		isOpen: false,
		animalId: "",
		animalName: "",
		existingGroupId: "",
		existingGroupName: "",
	});

	// Handle photo removal - track photos to delete
	const handleRemovePhoto = (photoUrl: string) => {
		setPhotosToDelete((prev) => [...prev, photoUrl]);
	};

	// Handle animal selection with duplicate detection
	const handleAnimalSelection = async (animalId: string) => {
		// If deselecting, just toggle (no duplicate check needed)
		if (selectedAnimalIds.includes(animalId)) {
			toggleAnimalSelection(animalId);
			return;
		}

		// If selecting, check for duplicates
		try {
			const existingGroup = await findGroupContainingAnimal(
				animalId,
				profile.organization_id,
				id // Exclude current group from check
			);

			if (existingGroup) {
				// Animal is in another group - show modal
				const animal = animals.find((a) => a.id === animalId);
				const animalName = animal?.name || "This animal";
				setDuplicateModal({
					isOpen: true,
					animalId,
					animalName,
					existingGroupId: existingGroup.id,
					existingGroupName: existingGroup.name,
				});
			} else {
				// No duplicate - proceed with selection
				toggleAnimalSelection(animalId);
			}
		} catch (err) {
			console.error(
				"Error checking for duplicate group assignment:",
				err
			);
			// On error, proceed with selection (fail open)
			toggleAnimalSelection(animalId);
		}
	};

	// Handle "Move to new" action - add to selection (removal from old group happens on form submit)
	const handleMoveToNew = () => {
		const { animalId } = duplicateModal;

		// Just add animal to selection - don't update database yet
		// This allows user to change their mind before submitting
		// The handleSubmit function will handle removing from old group and updating group_id
		toggleAnimalSelection(animalId);

		// Close modal
		setDuplicateModal({
			isOpen: false,
			animalId: "",
			animalName: "",
			existingGroupId: "",
			existingGroupName: "",
		});
	};

	// Handle "Cancel" action - don't add animal
	const handleCancelMove = () => {
		setDuplicateModal({
			isOpen: false,
			animalId: "",
			animalName: "",
			existingGroupId: "",
			existingGroupName: "",
		});
	};

	// Redirect non-coordinators (after all hooks)
	if (!isCoordinator) {
		navigate("/groups", { replace: true });
		return null;
	}

	const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setSubmitError(null);

		if (!validateForm()) {
			return;
		}

		if (!id || !group) {
			setSubmitError("Group ID is required");
			return;
		}

		setLoading(true);

		try {
			checkOfflineAndThrow();

			if (!group) {
				setSubmitError("Group not found");
				return;
			}

			// Get the original animal_ids to compare
			const originalAnimalIds = group.animal_ids || [];
			const newAnimalIds = selectedAnimalIds;

			// Find animals that were added and removed
			const addedAnimalIds = newAnimalIds.filter(
				(id) => !originalAnimalIds.includes(id)
			);
			const removedAnimalIds = originalAnimalIds.filter(
				(id) => !newAnimalIds.includes(id)
			);

			// Prepare data for update
			const groupData: Record<string, unknown> = {
				name: formState.name.trim() || null,
				description: formState.description.trim() || null,
				priority: formState.priority,
				animal_ids: newAnimalIds,
			};

			// Delete photos from storage first
			if (photosToDelete.length > 0) {
				const deletePromises = photosToDelete.map((photoUrl) =>
					deleteGroupPhoto(photoUrl, profile.organization_id).catch(
						(err) => {
							console.error("Error deleting photo:", err);
							// Continue even if some deletions fail
							return null;
						}
					)
				);
				await Promise.all(deletePromises);
			}

			// Upload new photos if any
			const existingPhotos = (group.group_photos || []).filter(
				(photo) => !photosToDelete.includes(photo.url)
			);
			let photoMetadata: TimestampedPhoto[] = [...existingPhotos];

			if (selectedPhotos.length > 0) {
				setPhotoUploadError(null);

				try {
					// Upload all photos in parallel
					const uploadResults = await Promise.allSettled(
						selectedPhotos.map(async (file) => {
							try {
								const photoUrl = await uploadGroupPhoto(
									file,
									profile.organization_id,
									id
								);
								return {
									success: true,
									url: photoUrl,
									uploaded_at: new Date().toISOString(),
									uploaded_by: user.id,
								};
							} catch (err) {
								console.error("Error uploading photo:", err);
								return {
									success: false,
									error:
										err instanceof Error
											? err.message
											: "Unknown error",
								};
							}
						})
					);

					// Process upload results
					const successfulUploads: TimestampedPhoto[] = uploadResults
						.filter(
							(result) =>
								result.status === "fulfilled" &&
								result.value.success
						)
						.map((result) => {
							const value = (
								result as PromiseFulfilledResult<{
									success: true;
									url: string;
									uploaded_at: string;
									uploaded_by: string;
								}>
							).value;
							// Extract only the fields needed for photo metadata
							return {
								url: value.url,
								uploaded_at: value.uploaded_at,
								uploaded_by: value.uploaded_by,
							};
						});

					const failedUploads = uploadResults.filter(
						(result) =>
							result.status === "rejected" ||
							(result.status === "fulfilled" &&
								!result.value.success)
					).length;

					// Add successful uploads to metadata
					photoMetadata = [...photoMetadata, ...successfulUploads];

					// Show error message if some uploads failed
					if (failedUploads > 0) {
						setPhotoUploadError(
							`Group updated successfully. ${failedUploads} photo${
								failedUploads !== 1 ? "s" : ""
							} failed to upload.`
						);
					}
				} catch (err) {
					console.error("Error uploading photos:", err);
					setPhotoUploadError(
						"Group updated successfully, but photo upload failed."
					);
				}
			}

			// Include photos in group update
			groupData.group_photos = photoMetadata;

			await updateGroup(id, profile.organization_id, groupData);

			// Update animals' group_id field
			// Remove group_id from animals that were removed from the group
			if (removedAnimalIds.length > 0) {
				const { error: removeError } = await supabase
					.from("animals")
					.update({ group_id: null })
					.in("id", removedAnimalIds)
					.eq("organization_id", profile.organization_id);

				if (removeError) {
					console.error(
						"Error removing group_id from animals:",
						removeError
					);
					// Don't fail the whole operation, but log the error
				}
			}

			// Add group_id to animals that were added to the group
			// First, check if any of these animals are already in another group
			if (addedAnimalIds.length > 0) {
				// Get current group_id for animals being added
				const { data: animalsToAdd, error: fetchError } = await supabase
					.from("animals")
					.select("id, group_id")
					.in("id", addedAnimalIds)
					.eq("organization_id", profile.organization_id);

				if (fetchError) {
					console.error("Error fetching animals to add:", fetchError);
				} else if (animalsToAdd) {
					// Find animals that are in other groups
					const animalsInOtherGroups = animalsToAdd.filter(
						(a) => a.group_id && a.group_id !== id
					);

					// Remove these animals from their old groups
					if (animalsInOtherGroups.length > 0) {
						const oldGroupIds = [
							...new Set(
								animalsInOtherGroups
									.map((a) => a.group_id)
									.filter((gid): gid is string => !!gid)
							),
						];

						// Update each old group to remove the animal from animal_ids
						for (const oldGroupId of oldGroupIds) {
							const { data: oldGroup } = await supabase
								.from("animal_groups")
								.select("animal_ids")
								.eq("id", oldGroupId)
								.eq("organization_id", profile.organization_id)
								.single();

							if (oldGroup && oldGroup.animal_ids) {
								const updatedAnimalIds = (
									oldGroup.animal_ids as string[]
								).filter(
									(aid) =>
										!animalsInOtherGroups
											.map((a) => a.id)
											.includes(aid)
								);

								await supabase
									.from("animal_groups")
									.update({ animal_ids: updatedAnimalIds })
									.eq("id", oldGroupId)
									.eq(
										"organization_id",
										profile.organization_id
									);
							}
						}
					}

					// Update group_id for all added animals
					const { error: updateError } = await supabase
						.from("animals")
						.update({ group_id: id })
						.in("id", addedAnimalIds)
						.eq("organization_id", profile.organization_id);

					if (updateError) {
						console.error(
							"Error updating animals with group_id:",
							updateError
						);
						// Don't fail the whole operation, but log the error
					}
				}
			}

			// Invalidate queries to refresh data
			queryClient.invalidateQueries({
				queryKey: ["groups", user.id, profile.organization_id],
			});
			queryClient.invalidateQueries({
				queryKey: ["groups", user.id, profile.organization_id, id],
			});
			queryClient.invalidateQueries({
				queryKey: ["animals", user.id, profile.organization_id],
			});
			queryClient.invalidateQueries({
				queryKey: ["group-animals", user.id, profile.organization_id],
			});

			setSuccessMessage("Group updated successfully!");

			setTimeout(() => {
				navigate(`/groups/${id}`, { replace: true });
			}, 1500);
		} catch (err) {
			console.error("Unexpected error:", err);
			setSubmitError(
				getErrorMessage(
					err,
					"An unexpected error occurred. Please try again."
				)
			);
		} finally {
			setLoading(false);
		}
	};

	if (isLoadingGroup) {
		return (
			<div className="min-h-screen p-4 bg-gray-50 flex items-center justify-center">
				<LoadingSpinner />
			</div>
		);
	}

	if (isErrorGroup || !group) {
		return (
			<div className="min-h-screen p-4 bg-gray-50">
				<div className="max-w-4xl mx-auto">
					<div className="mb-6">
						<NavLinkButton to="/groups" label="Back to Groups" />
					</div>
					<div className="bg-white rounded-lg shadow-sm p-6">
						<ErrorMessage>
							{groupError
								? getErrorMessage(
										groupError,
										"Failed to load group. Please try again."
								  )
								: "Group not found."}
						</ErrorMessage>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen p-4 bg-gray-50">
			<div className="max-w-4xl mx-auto">
				<div className="mb-6">
					<NavLinkButton
						to={id ? `/groups/${id}` : "/groups"}
						label="Back to Group"
					/>
				</div>
				<div className="bg-white rounded-lg shadow-md p-6">
					<h1 className="text-2xl font-bold text-gray-900 mb-6">
						Edit Group
					</h1>

					<GroupForm
						formState={formState}
						setName={setName}
						setDescription={setDescription}
						setPriority={setPriority}
						errors={errors}
						animals={animals}
						isLoadingAnimals={isLoadingAnimals}
						isErrorAnimals={isErrorAnimals}
						selectedAnimalIds={selectedAnimalIds}
						toggleAnimalSelection={handleAnimalSelection}
						onPhotosChange={setSelectedPhotos}
						existingPhotos={group.group_photos || []}
						onRemovePhoto={handleRemovePhoto}
						photoError={photoUploadError}
						onSubmit={handleSubmit}
						loading={loading}
						submitError={submitError}
						successMessage={successMessage}
						submitButtonText="Update Group"
					/>
				</div>

				{/* Duplicate Group Assignment Modal */}
				<ConfirmModal
					isOpen={duplicateModal.isOpen}
					title="Animal Already in Group"
					message={
						<>
							<p className="mb-2">
								{duplicateModal.animalName} is already in group:{" "}
								<Link
									to={`/groups/${duplicateModal.existingGroupId}`}
									className="text-pink-600 hover:text-pink-700 underline"
									onClick={() => handleCancelMove()}
								>
									{duplicateModal.existingGroupName}
								</Link>
								.
							</p>
							<p>Move them to this group?</p>
						</>
					}
					confirmLabel="Move to new"
					cancelLabel="Cancel"
					onConfirm={handleMoveToNew}
					onCancel={handleCancelMove}
					variant="default"
				/>
			</div>
		</div>
	);
}
