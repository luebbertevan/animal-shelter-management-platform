import { useState, useMemo } from "react";
import type { FormEvent } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { useProtectedAuth } from "../../hooks/useProtectedAuth";
import { useGroupForm } from "../../hooks/useGroupForm";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import ErrorMessage from "../../components/ui/ErrorMessage";
import GroupForm from "../../components/animals/GroupForm";
import Button from "../../components/ui/Button";
import ConfirmModal from "../../components/ui/ConfirmModal";
import { getErrorMessage, checkOfflineAndThrow } from "../../lib/errorUtils";
import {
	fetchGroupById,
	updateGroup,
	findGroupContainingAnimal,
	deleteGroup,
} from "../../lib/groupQueries";
import { fetchAnimals, fetchAnimalsCount } from "../../lib/animalQueries";
import { getGroupFosterVisibility } from "../../lib/groupUtils";
import type { Animal, TimestampedPhoto } from "../../types";
import { uploadGroupPhoto, deleteGroupPhoto } from "../../lib/photoUtils";
import type { AnimalFilters } from "../../components/animals/AnimalFilters";
import { PAGE_SIZES } from "../../lib/paginationConfig";

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

	// Search and filter state for animal selection
	const [animalSearchTerm, setAnimalSearchTerm] = useState("");
	const [animalFilters, setAnimalFilters] = useState<AnimalFilters>({});

	// Pagination state for animal selection
	const [animalPage, setAnimalPage] = useState(1);
	const animalPageSize = PAGE_SIZES.GROUP_ANIMAL_SELECTION;

	// If filters or search are active, we need all animals for client-side filtering
	// Otherwise, use server-side pagination
	const needsAllAnimals = !!(
		animalSearchTerm ||
		Object.keys(animalFilters).some((key) => {
			const value = animalFilters[key as keyof AnimalFilters];
			return value !== undefined && value !== "" && value !== false;
		})
	);

	const animalOffset = needsAllAnimals
		? 0
		: (animalPage - 1) * animalPageSize;
	const animalLimit = needsAllAnimals ? undefined : animalPageSize;

	// Fetch all animals for selection with pagination, filters, and search
	const {
		data: animals = [],
		isLoading: isLoadingAnimals,
		isError: isErrorAnimals,
	} = useQuery<Animal[], Error>({
		queryKey: [
			"animals",
			user.id,
			profile.organization_id,
			needsAllAnimals ? "all" : animalPage,
			needsAllAnimals ? "all" : animalPageSize,
			animalFilters,
			animalSearchTerm,
		],
		queryFn: async () => {
			const animalsData = await fetchAnimals(profile.organization_id, {
				fields: [
					"id",
					"name",
					"status",
					"sex_spay_neuter_status",
					"priority",
					"photos",
					"date_of_birth",
					"group_id",
					"foster_visibility",
					"life_stage",
				],
				orderBy: "created_at",
				orderDirection: "desc",
				limit: animalLimit,
				offset: animalOffset,
				filters: animalFilters,
				searchTerm: animalSearchTerm,
			});

			// Fetch group names for animals that are in groups
			const groupIds = [
				...new Set(
					animalsData
						.map((a) => a.group_id)
						.filter((id): id is string => !!id)
				),
			];

			const groupsMap = new Map<string, string>();
			if (groupIds.length > 0) {
				try {
					const { data: groups, error: groupsError } = await supabase
						.from("animal_groups")
						.select("id, name")
						.in("id", groupIds);

					if (groupsError) {
						console.error("Error fetching groups:", groupsError);
					} else {
						if (groups) {
							groups.forEach((group) => {
								if (group.id && group.name) {
									groupsMap.set(group.id, group.name);
								}
							});
						}
					}
				} catch (error) {
					console.error("Error fetching groups:", error);
				}
			}

			// Map animals with their group names
			return animalsData.map((animal) => {
				if (animal.group_id) {
					const groupName = groupsMap.get(animal.group_id);
					return {
						...animal,
						group_name: groupName,
					};
				}
				return animal;
			});
		},
		enabled: !!group && isCoordinator,
	});

	// Filter animals client-side when filters/search are active
	// Now showing animals in groups to allow transferring between groups
	const filteredAnimals = useMemo(() => {
		let filtered = animals;

		// Apply search filter if active (already applied server-side, but apply again for consistency)
		if (animalSearchTerm) {
			const searchLower = animalSearchTerm.toLowerCase();
			filtered = filtered.filter((animal) => {
				const animalName = animal.name?.toLowerCase() || "";
				return animalName.includes(searchLower);
			});
		}

		// Apply filters client-side if needed (already applied server-side, but apply again for consistency)
		// This ensures consistency when we switch between server-side and client-side filtering
		if (animalFilters.priority === true) {
			filtered = filtered.filter((animal) => animal.priority === true);
		}
		if (animalFilters.sex) {
			filtered = filtered.filter(
				(animal) => animal.sex_spay_neuter_status === animalFilters.sex
			);
		}
		if (animalFilters.life_stage) {
			filtered = filtered.filter(
				(animal) => animal.life_stage === animalFilters.life_stage
			);
		}
		if (animalFilters.status) {
			filtered = filtered.filter(
				(animal) => animal.status === animalFilters.status
			);
		}
		if (animalFilters.inGroup === false) {
			filtered = filtered.filter((animal) => !animal.group_id);
		}

		return filtered;
	}, [animals, animalSearchTerm, animalFilters]);

	// Paginate filtered animals client-side when filters/search are active
	const paginatedAnimals = useMemo(() => {
		if (needsAllAnimals) {
			const startIndex = (animalPage - 1) * animalPageSize;
			const endIndex = startIndex + animalPageSize;
			return filteredAnimals.slice(startIndex, endIndex);
		}
		return filteredAnimals;
	}, [filteredAnimals, needsAllAnimals, animalPage, animalPageSize]);

	// Fetch total count of animals for pagination (when using server-side pagination)
	const { data: totalAnimalCount = 0 } = useQuery({
		queryKey: [
			"animals-count",
			profile.organization_id,
			animalFilters,
			animalSearchTerm,
		],
		queryFn: () =>
			fetchAnimalsCount(
				profile.organization_id,
				animalFilters,
				animalSearchTerm
			),
		enabled: !!group && isCoordinator && !needsAllAnimals,
	});

	const finalAnimalCount = needsAllAnimals
		? filteredAnimals.length
		: totalAnimalCount;
	const totalAnimalPages = Math.ceil(finalAnimalCount / animalPageSize);

	// Handle page change for animal selection
	const handleAnimalPageChange = (newPage: number) => {
		setAnimalPage(newPage);
	};

	// Handle search for animal selection
	const handleAnimalSearch = (term: string) => {
		setAnimalSearchTerm(term);
		setAnimalPage(1); // Reset to first page on search
	};

	// Handle filter change for animal selection
	const handleAnimalFiltersChange = (newFilters: AnimalFilters) => {
		setAnimalFilters(newFilters);
		setAnimalPage(1); // Reset to first page on filter change
	};

	// Use the form hook with existing group data (must be before early return)
	const {
		formState,
		setName,
		setDescription,
		setPriority,
		selectedAnimalIds,
		toggleAnimalSelection,
		setStagedStatusForAll,
		setStagedFosterVisibilityForAll,
		stagedStatusChanges,
		stagedFosterVisibilityChanges,
		validateForm,
		errors,
	} = useGroupForm({ initialGroup: group || null });

	// Get selected animals for conflict detection (after animals are fetched)
	const selectedAnimals = useMemo(() => {
		return animals.filter((animal) =>
			selectedAnimalIds.includes(animal.id)
		);
	}, [animals, selectedAnimalIds]);

	// Compute conflict detection for foster_visibility using reusable utility
	const {
		sharedValue: sharedFosterVisibilityComputed,
		hasConflict: hasFosterVisibilityConflictComputed,
	} = useMemo(
		() =>
			getGroupFosterVisibility(
				selectedAnimals,
				stagedFosterVisibilityChanges
			),
		[selectedAnimals, stagedFosterVisibilityChanges]
	);

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

	// Empty group confirmation modal state
	const [showEmptyGroupConfirm, setShowEmptyGroupConfirm] = useState(false);

	// Delete group confirmation modal state
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [deleteError, setDeleteError] = useState<string | null>(null);

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

	// Handle empty group confirmation
	const handleConfirmEmptyGroup = () => {
		setShowEmptyGroupConfirm(false);
		performSubmit();
	};

	const handleCancelEmptyGroup = () => {
		setShowEmptyGroupConfirm(false);
	};

	// Handle delete group
	const handleDelete = async () => {
		if (!id || !group) {
			setDeleteError("Group ID is required");
			return;
		}

		// Confirm deletion
		if (!showDeleteConfirm) {
			setShowDeleteConfirm(true);
			return;
		}

		setDeleting(true);
		setDeleteError(null);

		try {
			checkOfflineAndThrow();

			await deleteGroup(id, profile.organization_id, group.group_photos);

			// Remove the deleted group from cache and invalidate the list
			// Don't invalidate the specific group query as it no longer exists (would cause 406 error)
			queryClient.removeQueries({
				queryKey: ["groups", user.id, profile.organization_id, id],
			});
			queryClient.invalidateQueries({
				queryKey: ["groups", user.id, profile.organization_id],
			});
			queryClient.invalidateQueries({
				queryKey: ["animals", user.id, profile.organization_id],
			});

			// Navigate to groups list
			navigate("/groups", { replace: true });
		} catch (err) {
			console.error("Error deleting group:", err);
			setDeleteError(
				getErrorMessage(
					err,
					"Failed to delete group. Please try again."
				)
			);
			setDeleting(false);
			setShowDeleteConfirm(false);
		}
	};

	// Redirect non-coordinators (after all hooks)
	if (!isCoordinator) {
		navigate("/groups", { replace: true });
		return null;
	}

	const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setSubmitError(null);

		// Check for foster_visibility conflicts
		if (hasFosterVisibilityConflictComputed) {
			setSubmitError(
				"Animals in a group must have the same Visibility on Fosters Needed page"
			);
			return;
		}

		if (!validateForm()) {
			return;
		}

		if (!id || !group) {
			setSubmitError("Group ID is required");
			return;
		}

		// Check for empty group and show confirmation modal
		if (selectedAnimalIds.length === 0) {
			setShowEmptyGroupConfirm(true);
			return;
		}

		// Proceed with submission
		await performSubmit();
	};

	// Perform the actual group update
	const performSubmit = async () => {
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

			// Auto-update default name if it matches the pattern "Group of X"
			let groupName = formState.name.trim() || null;
			const defaultNamePattern = /^Group of \d+$/;
			if (groupName && defaultNamePattern.test(groupName)) {
				// Update to reflect the new number of animals
				groupName = `Group of ${newAnimalIds.length}`;
			}

			// Prepare data for update
			const groupData: Record<string, unknown> = {
				name: groupName,
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

			// Handle photo updates (additions and deletions)
			const existingPhotos = group.group_photos || [];
			const remainingPhotos = existingPhotos.filter(
				(photo) => !photosToDelete.includes(photo.url)
			);
			const photoMetadata: TimestampedPhoto[] = [...remainingPhotos];

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
					if (successfulUploads.length > 0) {
						photoMetadata.push(...successfulUploads);
					}

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

			// Include photos in group update (always update to ensure consistency)
			groupData.group_photos = photoMetadata;

			await updateGroup(id, profile.organization_id, groupData);

			// Apply staged changes to animals: status and foster_visibility
			// Collect all animals that need updates (removed, added, or have staged changes)
			const allAnimalIdsToUpdate = new Set<string>([
				...removedAnimalIds,
				...addedAnimalIds,
				...Array.from(stagedStatusChanges.keys()),
				...Array.from(stagedFosterVisibilityChanges.keys()),
			]);

			// Update animals with staged changes and group_id changes
			if (allAnimalIdsToUpdate.size > 0) {
				const updatePromises = Array.from(allAnimalIdsToUpdate).map(
					(animalId) => {
						const update: Record<string, unknown> = {};

						// Handle group_id changes
						if (removedAnimalIds.includes(animalId)) {
							update.group_id = null;
						} else if (addedAnimalIds.includes(animalId)) {
							update.group_id = id;
						}

						// Apply staged status change if any
						const stagedStatus = stagedStatusChanges.get(animalId);
						if (stagedStatus) {
							update.status = stagedStatus;
						}

						// Apply staged foster_visibility change if any
						const stagedVisibility =
							stagedFosterVisibilityChanges.get(animalId);
						if (stagedVisibility) {
							update.foster_visibility = stagedVisibility;
						}

						// Only update if there are changes
						if (Object.keys(update).length > 0) {
							return supabase
								.from("animals")
								.update(update)
								.eq("id", animalId)
								.eq("organization_id", profile.organization_id);
						}
						return Promise.resolve({ error: null });
					}
				);

				const updateResults = await Promise.all(updatePromises);
				const updateError = updateResults.find(
					(result) => result.error
				)?.error;
				if (updateError) {
					console.error("Error updating animals:", updateError);
					// Don't fail the whole operation, but log the error
				}
			}

			// Handle animals being moved from other groups (for added animals)
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

					// Remove these animals from their old groups' animal_ids array
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
					<div className="mb-6"></div>
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
				<div className="bg-white rounded-lg shadow-md p-6">
					<div className="flex items-center justify-between mb-6">
						<h1 className="text-2xl font-bold text-gray-900">
							Edit Group
						</h1>
						<div className="flex items-center gap-2">
							<Button
								type="button"
								variant="outline"
								onClick={() =>
									navigate(id ? `/groups/${id}` : "/groups")
								}
								className="w-auto py-1 px-2 text-sm whitespace-nowrap"
							>
								Cancel
							</Button>
						</div>
					</div>

					<GroupForm
						formState={formState}
						setName={setName}
						setDescription={setDescription}
						setPriority={setPriority}
						errors={errors}
						animals={paginatedAnimals}
						isLoadingAnimals={isLoadingAnimals}
						isErrorAnimals={isErrorAnimals}
						selectedAnimalIds={selectedAnimalIds}
						toggleAnimalSelection={handleAnimalSelection}
						stagedStatusChanges={stagedStatusChanges}
						stagedFosterVisibilityChanges={
							stagedFosterVisibilityChanges
						}
						setStagedStatusForAll={setStagedStatusForAll}
						setStagedFosterVisibilityForAll={
							setStagedFosterVisibilityForAll
						}
						hasFosterVisibilityConflict={
							hasFosterVisibilityConflictComputed
						}
						sharedFosterVisibility={sharedFosterVisibilityComputed}
						onPhotosChange={setSelectedPhotos}
						existingPhotos={(group.group_photos || []).filter(
							(photo) => !photosToDelete.includes(photo.url)
						)}
						onRemovePhoto={handleRemovePhoto}
						photoError={photoUploadError}
						onSubmit={handleSubmit}
						loading={loading}
						submitError={submitError}
						successMessage={successMessage}
						submitButtonText="Update Group"
						showDeleteButton={true}
						deleteError={deleteError}
						showDeleteConfirm={showDeleteConfirm}
						onDeleteClick={() => setShowDeleteConfirm(true)}
						onDeleteCancel={() => {
							setShowDeleteConfirm(false);
							setDeleteError(null);
						}}
						onDeleteConfirm={handleDelete}
						deleting={deleting}
						// Search and filter props
						animalSearchTerm={animalSearchTerm}
						onAnimalSearch={handleAnimalSearch}
						animalFilters={animalFilters}
						onAnimalFiltersChange={handleAnimalFiltersChange}
						// Pagination props
						animalCurrentPage={animalPage}
						animalTotalPages={totalAnimalPages}
						animalTotalItems={finalAnimalCount}
						animalItemsPerPage={animalPageSize}
						onAnimalPageChange={handleAnimalPageChange}
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

				{/* Empty Group Confirmation Modal */}
				<ConfirmModal
					isOpen={showEmptyGroupConfirm}
					title="Empty Group"
					message="This group has no animals. Are you sure you want to save an empty group?"
					confirmLabel="Save Empty Group"
					cancelLabel="Cancel"
					onConfirm={handleConfirmEmptyGroup}
					onCancel={handleCancelEmptyGroup}
					variant="default"
				/>
			</div>
		</div>
	);
}
