import { useState, useEffect, useMemo } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { useProtectedAuth } from "../../hooks/useProtectedAuth";
import { useGroupForm } from "../../hooks/useGroupForm";
import type { Animal } from "../../types";
import NavLinkButton from "../../components/ui/NavLinkButton";
import GroupForm from "../../components/animals/GroupForm";
import { getErrorMessage, checkOfflineAndThrow } from "../../lib/errorUtils";
import { fetchAnimals } from "../../lib/animalQueries";
import { createGroup } from "../../lib/groupQueries";
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

	// Fetch available animals
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

	const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setSubmitError(null);

		// Validate that at least one animal is selected
		if (selectedAnimalIds.length === 0) {
			setSubmitError("Please select at least one animal");
			return;
		}

		if (!validateForm()) {
			return;
		}

		setLoading(true);

		try {
			checkOfflineAndThrow();

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
						toggleAnimalSelection={toggleAnimalSelection}
						onPhotosChange={setSelectedPhotos}
						photoError={photoUploadError}
						onSubmit={handleSubmit}
						loading={loading}
						submitError={submitError}
						successMessage={successMessage}
						submitButtonText="Create Group"
					/>
				</div>
			</div>
		</div>
	);
}
