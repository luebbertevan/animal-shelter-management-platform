import { useState, useEffect, useMemo } from "react";
import type { FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { useProtectedAuth } from "../../hooks/useProtectedAuth";
import { useGroupForm } from "../../hooks/useGroupForm";
import type { Animal } from "../../types";
import NavLinkButton from "../../components/ui/NavLinkButton";
import GroupForm from "../../components/animals/GroupForm";
import ConfirmModal from "../../components/ui/ConfirmModal";
import { getErrorMessage, checkOfflineAndThrow } from "../../lib/errorUtils";
import { fetchAnimals } from "../../lib/animalQueries";
import { createGroup, findGroupContainingAnimal } from "../../lib/groupQueries";
import { uploadGroupPhoto } from "../../lib/photoUtils";
import type { TimestampedPhoto } from "../../types";

export default function NewGroup() {
	const navigate = useNavigate();
	const { user, profile } = useProtectedAuth();

	// Use the form hook
	const {
		formState,
		setName,
		setDescription,
		setPriority,
		selectedAnimalIds,
		toggleAnimalSelection,
		validateForm,
		errors,
	} = useGroupForm();

	const [loading, setLoading] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);
	const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
	const [photoUploadError, setPhotoUploadError] = useState<string | null>(
		null
	);

	// Empty group confirmation modal state
	const [showEmptyGroupConfirm, setShowEmptyGroupConfirm] = useState(false);

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

	// Fetch available animals
	const {
		data: animals = [],
		isLoading: isLoadingAnimals,
		isError: isErrorAnimals,
	} = useQuery<Animal[], Error>({
		queryKey: ["animals", user.id, profile.organization_id],
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
				],
				orderBy: "created_at",
				orderDirection: "desc",
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
	});

	// Smart priority defaulting: check if any selected animal is high priority
	const selectedAnimals = useMemo(() => {
		return animals.filter((animal) =>
			selectedAnimalIds.includes(animal.id)
		);
	}, [animals, selectedAnimalIds]);

	const hasHighPriorityAnimal = useMemo(() => {
		return selectedAnimals.some((animal) => animal.priority === true);
	}, [selectedAnimals]);

	// Update priority when selected animals change (smart defaulting)
	// Only auto-SET to high when a high priority animal is selected
	// Never auto-clear - user must manually clear if they want
	useEffect(() => {
		if (hasHighPriorityAnimal && !formState.priority) {
			// Auto-set to high if any animal is high priority and priority is currently false
			setPriority(true);
		}
		// Note: We don't auto-clear priority. If user manually sets it to high,
		// it stays high even if no high priority animals are selected.
		// This allows coordinators to mark groups as high priority for other reasons.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [hasHighPriorityAnimal]);

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
				profile.organization_id
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

	const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setSubmitError(null);

		if (!validateForm()) {
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

	// Perform the actual group creation
	const performSubmit = async () => {
		setLoading(true);

		try {
			checkOfflineAndThrow();

			// Check if any selected animals are in other groups and remove them
			// This handles the "Move to new" scenario
			if (selectedAnimalIds.length > 0) {
				// Get current group_id for animals being added
				const { data: animalsToAdd, error: fetchError } = await supabase
					.from("animals")
					.select("id, group_id")
					.in("id", selectedAnimalIds)
					.eq("organization_id", profile.organization_id);

				if (fetchError) {
					console.error("Error fetching animals to add:", fetchError);
				} else if (animalsToAdd) {
					// Find animals that are in other groups
					const animalsInOtherGroups = animalsToAdd.filter(
						(a) => a.group_id !== null
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
				}
			}

			// Auto-fill name with "Group of #" if no name provided
			const groupName =
				formState.name.trim() || `Group of ${selectedAnimalIds.length}`;

			// Create the group
			const newGroup = await createGroup(profile.organization_id, {
				name: groupName,
				description: formState.description.trim() || null,
				animal_ids: selectedAnimalIds,
				priority: formState.priority,
				created_by: user.id,
			});

			// Animal created successfully - now upload photos if any
			const groupId = newGroup.id;
			const photoMetadata: TimestampedPhoto[] = [];

			if (selectedPhotos.length > 0) {
				setPhotoUploadError(null);

				try {
					// Upload all photos in parallel
					const uploadResults = await Promise.allSettled(
						selectedPhotos.map(
							async (
								file
							): Promise<{
								success: boolean;
								url?: string;
								uploaded_at?: string;
								uploaded_by?: string;
								error?: string;
							}> => {
								try {
									const photoUrl = await uploadGroupPhoto(
										file,
										profile.organization_id,
										groupId
									);
									return {
										success: true,
										url: photoUrl,
										uploaded_at: new Date().toISOString(),
										uploaded_by: user.id,
									};
								} catch (err) {
									console.error(
										"Error uploading photo:",
										err
									);
									return {
										success: false,
										error:
											err instanceof Error
												? err.message
												: "Unknown error",
									};
								}
							}
						)
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

					photoMetadata.push(...successfulUploads);

					// Update group with photo metadata
					if (photoMetadata.length > 0) {
						const { error: updateError } = await supabase
							.from("animal_groups")
							.update({ group_photos: photoMetadata })
							.eq("id", groupId);

						if (updateError) {
							console.error(
								"Error updating group with photos:",
								updateError
							);
							// Don't fail the whole operation - photos are uploaded even if metadata update fails
						}
					}

					// Show appropriate messages based on upload results
					if (failedUploads === selectedPhotos.length) {
						// All photos failed
						setPhotoUploadError(
							`Group created successfully, but all ${failedUploads} photo${
								failedUploads !== 1 ? "s" : ""
							} failed to upload. You can add photos later via the edit form.`
						);
					} else if (failedUploads > 0) {
						// Some photos failed
						setPhotoUploadError(
							`Group created successfully. ${failedUploads} photo${
								failedUploads !== 1 ? "s" : ""
							} failed to upload, but ${
								successfulUploads.length
							} photo${
								successfulUploads.length !== 1 ? "s" : ""
							} uploaded successfully.`
						);
					}
				} catch (err) {
					console.error("Error uploading photos:", err);
					setPhotoUploadError(
						"Group created successfully, but photo upload failed. "
					);
				}
			}

			// Update all selected animals to set their group_id
			const { error: updateError } = await supabase
				.from("animals")
				.update({ group_id: newGroup.id })
				.in("id", selectedAnimalIds)
				.eq("organization_id", profile.organization_id);

			if (updateError) {
				console.error(
					"Error updating animals with group_id:",
					updateError
				);
				// Note: Group was created successfully, but animals weren't updated
				// This is a partial success - we should still show success but warn user
				setSubmitError(
					"Group was created, but failed to update animals. Please manually assign animals to the group."
				);
			} else {
				setSuccessMessage("Group created successfully!");

				// Redirect to group detail page after a brief delay
				setTimeout(() => {
					navigate(`/groups/${newGroup.id}`, {
						replace: true,
					});
				}, 1500);
			}
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

	return (
		<div className="min-h-screen p-4 bg-gray-50">
			<div className="max-w-4xl mx-auto">
				<div className="mb-6">
					<NavLinkButton to="/groups" label="Back to Groups" />
				</div>
				<div className="bg-white rounded-lg shadow-md p-6">
					<h1 className="text-2xl font-bold text-gray-900 mb-6">
						Create New Group
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
						photoError={photoUploadError}
						onSubmit={handleSubmit}
						loading={loading}
						submitError={submitError}
						successMessage={successMessage}
						submitButtonText="Create Group"
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
