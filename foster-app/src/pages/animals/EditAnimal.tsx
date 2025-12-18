import { useState } from "react";
import type { FormEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { useProtectedAuth } from "../../hooks/useProtectedAuth";
import { useAnimalForm } from "../../hooks/useAnimalForm";
import NavLinkButton from "../../components/ui/NavLinkButton";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import ErrorMessage from "../../components/ui/ErrorMessage";
import AnimalForm from "../../components/animals/AnimalForm";
import ConfirmModal from "../../components/ui/ConfirmModal";
import { getErrorMessage, checkOfflineAndThrow } from "../../lib/errorUtils";
import {
	fetchBreedSuggestions,
	fetchPhysicalCharacteristicsSuggestions,
	fetchAnimalById,
	fetchAnimalsByIds,
} from "../../lib/animalQueries";
import { fetchGroupById } from "../../lib/groupQueries";
import { formatFosterVisibility } from "../../lib/metadataUtils";
import { wouldFosterVisibilityChangeConflict } from "../../lib/groupUtils";
import { calculateDOBFromAge } from "../../lib/ageUtils";
import { uploadAnimalPhoto, deleteAnimalPhoto } from "../../lib/photoUtils";
import { deleteAnimal } from "../../lib/animalUtils";
import type {
	AnimalStatus,
	SexSpayNeuterStatus,
	LifeStage,
	PhotoMetadata,
	Animal,
	FosterVisibility,
} from "../../types";

export default function EditAnimal() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { user, profile, isCoordinator } = useProtectedAuth();

	// Fetch animal data (must be before early return)
	const {
		data: animal,
		isLoading: isLoadingAnimal,
		isError: isErrorAnimal,
		error: animalError,
	} = useQuery({
		queryKey: ["animals", user.id, profile.organization_id, id],
		queryFn: async () => {
			if (!id) {
				throw new Error("Animal ID is required");
			}
			return fetchAnimalById(id, profile.organization_id);
		},
		enabled: !!id && isCoordinator,
	});

	// Use the form hook with existing animal data (must be before early return)
	const {
		formState,
		setName,
		setStatus,
		setFosterVisibility,
		setSexSpayNeuterStatus,
		setLifeStage,
		setPrimaryBreed,
		setPhysicalCharacteristics,
		setMedicalNeeds,
		setBehavioralNeeds,
		setAdditionalNotes,
		setBio,
		setPriority,
		handleDOBChange,
		handleDOBBlur,
		handleAgeValueChange,
		handleAgeValueBlur,
		handleAgeUnitChange,
		getTodayDateString,
		validateForm,
		errors,
	} = useAnimalForm({ initialAnimal: animal || null });

	const [loading, setLoading] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);
	const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
	const [uploadingPhotos, setUploadingPhotos] = useState(false);
	const [photoUploadError, setPhotoUploadError] = useState<string | null>(
		null
	);
	const [photosToDelete, setPhotosToDelete] = useState<string[]>([]);
	const [deleting, setDeleting] = useState(false);
	const [deleteError, setDeleteError] = useState<string | null>(null);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

	// Group conflict modal state
	const [showGroupConflictModal, setShowGroupConflictModal] = useState(false);
	const [originalFosterVisibility, setOriginalFosterVisibility] =
		useState<FosterVisibility | null>(null);

	// Fetch breed suggestions (must be before early return)
	const { data: breedSuggestions = [], isLoading: isLoadingBreeds } =
		useQuery<string[]>({
			queryKey: ["breedSuggestions", profile.organization_id],
			queryFn: () => fetchBreedSuggestions(profile.organization_id),
			staleTime: 5 * 60 * 1000,
			enabled: !!profile.organization_id,
		});

	// Fetch physical characteristics suggestions (must be before early return)
	const {
		data: physicalCharacteristicsSuggestions = [],
		isLoading: isLoadingPhysicalCharacteristics,
	} = useQuery<string[]>({
		queryKey: [
			"physicalCharacteristicsSuggestions",
			profile.organization_id,
		],
		queryFn: () =>
			fetchPhysicalCharacteristicsSuggestions(profile.organization_id),
		staleTime: 5 * 60 * 1000,
		enabled: !!profile.organization_id,
	});

	// Fetch group info if animal is in a group
	const { data: group } = useQuery({
		queryKey: ["group", animal?.group_id],
		queryFn: async () => {
			if (!animal?.group_id) {
				return null;
			}
			return fetchGroupById(animal.group_id, profile.organization_id);
		},
		enabled: !!animal?.group_id && isCoordinator,
	});

	// Fetch all animals in the group to check for conflicts
	const { data: groupAnimals = [] } = useQuery<Animal[], Error>({
		queryKey: [
			"group-animals",
			user.id,
			profile.organization_id,
			group?.animal_ids,
		],
		queryFn: async () => {
			if (!group?.animal_ids || group.animal_ids.length === 0) {
				return [];
			}
			return fetchAnimalsByIds(
				group.animal_ids,
				profile.organization_id,
				{
					fields: ["id", "foster_visibility"],
				}
			);
		},
		enabled: !!group && !!group.animal_ids && isCoordinator,
	});

	// Redirect non-coordinators (after all hooks)
	if (!isCoordinator) {
		navigate("/animals", { replace: true });
		return null;
	}

	const statusOptions: { value: AnimalStatus; label: string }[] = [
		{ value: "in_foster", label: "In Foster" },
		{ value: "adopted", label: "Adopted" },
		{ value: "medical_hold", label: "Medical Hold" },
		{ value: "in_shelter", label: "In Shelter" },
		{ value: "transferring", label: "Transferring" },
	];

	const sexSpayNeuterOptions: {
		value: SexSpayNeuterStatus | "";
		label: string;
	}[] = [
		{ value: "", label: "Select..." },
		{ value: "male", label: "Male" },
		{ value: "female", label: "Female" },
		{ value: "spayed_female", label: "Spayed Female" },
		{ value: "neutered_male", label: "Neutered Male" },
	];

	const lifeStageOptions: { value: LifeStage | ""; label: string }[] = [
		{ value: "", label: "Select..." },
		{ value: "kitten", label: "Kitten" },
		{ value: "adult", label: "Adult" },
		{ value: "senior", label: "Senior" },
		{ value: "unknown", label: "Unknown" },
	];

	// Handle photo removal - track photos to delete
	const handleRemovePhoto = (photoUrl: string) => {
		setPhotosToDelete((prev) => [...prev, photoUrl]);
	};

	const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setSubmitError(null);

		if (!validateForm()) {
			return;
		}

		if (!id || !animal) {
			setSubmitError("Animal ID is required");
			return;
		}

		// Check if animal is in a group and if foster_visibility change would conflict
		if (
			animal.group_id &&
			group &&
			groupAnimals.length > 0 &&
			wouldFosterVisibilityChangeConflict(
				animal,
				formState.fosterVisibility,
				groupAnimals
			)
		) {
			// Store the original foster_visibility value before showing modal
			setOriginalFosterVisibility(animal.foster_visibility);
			// Show modal to ask user if they want to update all animals in group
			setShowGroupConflictModal(true);
			return;
		}

		// No conflict, proceed with normal submit
		await performSubmit(false);
	};

	// Perform the actual submission
	const performSubmit = async (updateAllInGroup: boolean) => {
		if (!id || !animal) {
			setSubmitError("Animal ID is required");
			return;
		}

		setLoading(true);

		try {
			checkOfflineAndThrow();

			// Prepare data for update
			const animalData: Record<string, unknown> = {
				name: formState.name.trim() || null,
				status: formState.status,
			};

			// Add optional fields
			if (formState.sexSpayNeuterStatus) {
				animalData.sex_spay_neuter_status =
					formState.sexSpayNeuterStatus;
			} else {
				animalData.sex_spay_neuter_status = null;
			}

			if (formState.lifeStage) {
				animalData.life_stage = formState.lifeStage;
			} else {
				animalData.life_stage = null;
			}

			if (formState.primaryBreed.trim()) {
				animalData.primary_breed = formState.primaryBreed.trim();
			} else {
				animalData.primary_breed = null;
			}

			if (formState.physicalCharacteristics.trim()) {
				animalData.physical_characteristics =
					formState.physicalCharacteristics.trim();
			} else {
				animalData.physical_characteristics = null;
			}

			if (formState.medicalNeeds.trim()) {
				animalData.medical_needs = formState.medicalNeeds.trim();
			} else {
				animalData.medical_needs = null;
			}

			if (formState.behavioralNeeds.trim()) {
				animalData.behavioral_needs = formState.behavioralNeeds.trim();
			} else {
				animalData.behavioral_needs = null;
			}

			if (formState.additionalNotes.trim()) {
				animalData.additional_notes = formState.additionalNotes.trim();
			} else {
				animalData.additional_notes = null;
			}

			if (formState.bio.trim()) {
				animalData.bio = formState.bio.trim();
			} else {
				animalData.bio = null;
			}

			animalData.priority = formState.priority;
			// Add foster_visibility
			animalData.foster_visibility = formState.fosterVisibility;

			// If updating all animals in group, update them all
			if (updateAllInGroup && animal.group_id && group?.animal_ids) {
				const { error: groupUpdateError } = await supabase
					.from("animals")
					.update({ foster_visibility: formState.fosterVisibility })
					.in("id", group.animal_ids)
					.eq("organization_id", profile.organization_id);

				if (groupUpdateError) {
					console.error(
						"Error updating group animals' foster_visibility:",
						groupUpdateError
					);
					setSubmitError(
						"Failed to update all animals in group. Please try again."
					);
					setLoading(false);
					return;
				}
			}

			// Add date_of_birth
			let finalDOB: string | null = null;
			if (formState.dateOfBirth) {
				finalDOB = formState.dateOfBirth;
			} else if (
				formState.ageValue !== "" &&
				formState.ageValue > 0 &&
				formState.ageUnit
			) {
				const calculatedDOB = calculateDOBFromAge(
					formState.ageValue,
					formState.ageUnit
				);
				if (calculatedDOB) {
					finalDOB = calculatedDOB;
				}
			}
			animalData.date_of_birth = finalDOB;

			// Delete photos from storage first
			if (photosToDelete.length > 0) {
				const deletePromises = photosToDelete.map((photoUrl) =>
					deleteAnimalPhoto(photoUrl, profile.organization_id).catch(
						(err) => {
							console.error("Error deleting photo:", err);
							// Continue even if some deletions fail
							return null;
						}
					)
				);
				await Promise.all(deletePromises);
			}

			// Update animal in database
			const { error: updateError } = await supabase
				.from("animals")
				.update(animalData)
				.eq("id", id);

			if (updateError) {
				console.error("Error updating animal:", updateError);
				setSubmitError(
					getErrorMessage(
						updateError,
						"Failed to update animal. Please try again."
					)
				);
				setLoading(false);
				return;
			}

			// Upload new photos if any
			const existingPhotos = animal.photos || [];
			const remainingPhotos = existingPhotos.filter(
				(photo) => !photosToDelete.includes(photo.url)
			);
			const photoMetadata: PhotoMetadata[] = [...remainingPhotos];

			if (selectedPhotos.length > 0) {
				setUploadingPhotos(true);
				setPhotoUploadError(null);

				try {
					const uploadPromises = selectedPhotos.map(
						async (
							file
						): Promise<{
							success: boolean;
							url?: string;
							error?: unknown;
						}> => {
							try {
								const url = await uploadAnimalPhoto(
									file,
									profile.organization_id,
									id
								);
								return { success: true, url };
							} catch (err) {
								return { success: false, error: err };
							}
						}
					);

					const uploadResults = await Promise.all(uploadPromises);
					const successfulUploads: string[] = [];
					const failedUploads: number = uploadResults.filter(
						(result) => !result.success
					).length;

					uploadResults.forEach((result) => {
						if (result.success && result.url) {
							successfulUploads.push(result.url);
							photoMetadata.push({
								url: result.url,
								uploaded_at: new Date().toISOString(),
								uploaded_by: user.id,
							});
						}
					});

					setUploadingPhotos(false);

					// Update animal with photo metadata
					if (photoMetadata.length !== existingPhotos.length) {
						const { error: photoUpdateError } = await supabase
							.from("animals")
							.update({ photos: photoMetadata })
							.eq("id", id);

						if (photoUpdateError) {
							console.error(
								"Error updating animal photos:",
								photoUpdateError
							);
						}
					}

					if (failedUploads > 0) {
						setPhotoUploadError(
							`Animal updated successfully. ${failedUploads} photo${
								failedUploads !== 1 ? "s" : ""
							} failed to upload.`
						);
					}
				} catch (err) {
					console.error("Error uploading photos:", err);
					setUploadingPhotos(false);
					setPhotoUploadError(
						"Animal updated successfully, but photo upload failed."
					);
				}
			} else {
				// No new photos, but photos may have been deleted
				// Update photo metadata to reflect deletions
				if (photoMetadata.length !== existingPhotos.length) {
					const { error: photoUpdateError } = await supabase
						.from("animals")
						.update({ photos: photoMetadata })
						.eq("id", id);

					if (photoUpdateError) {
						console.error(
							"Error updating animal photos:",
							photoUpdateError
						);
					}
				}
			}

			// Invalidate queries to refresh data
			queryClient.invalidateQueries({
				queryKey: ["animals", user.id, profile.organization_id],
			});
			queryClient.invalidateQueries({
				queryKey: ["animals", user.id, profile.organization_id, id],
			});
			// If we updated all animals in group, invalidate group queries too
			if (updateAllInGroup && animal.group_id) {
				queryClient.invalidateQueries({
					queryKey: ["group", animal.group_id],
				});
				queryClient.invalidateQueries({
					queryKey: [
						"group-animals",
						user.id,
						profile.organization_id,
						group?.animal_ids,
					],
				});
				queryClient.invalidateQueries({
					queryKey: ["groups", user.id, profile.organization_id],
				});
			}

			setSuccessMessage("Animal updated successfully!");

			setTimeout(() => {
				navigate(`/animals/${id}`, { replace: true });
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
			setUploadingPhotos(false);
		}
	};

	const handleDelete = async () => {
		if (!id || !animal) {
			setDeleteError("Animal ID is required");
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

			await deleteAnimal(id, profile.organization_id, animal.photos);

			// Remove the deleted animal from cache and invalidate the list
			// Don't invalidate the specific animal query as it no longer exists (would cause 406 error)
			queryClient.removeQueries({
				queryKey: ["animals", user.id, profile.organization_id, id],
			});
			queryClient.invalidateQueries({
				queryKey: ["animals", user.id, profile.organization_id],
			});

			// Redirect to animals list
			navigate("/animals", { replace: true });
		} catch (err) {
			console.error("Error deleting animal:", err);
			setDeleteError(
				getErrorMessage(
					err,
					"Failed to delete animal. Please try again."
				)
			);
			setDeleting(false);
			setShowDeleteConfirm(false);
		}
	};

	if (isLoadingAnimal) {
		return (
			<div className="min-h-screen p-4 bg-gray-50 flex items-center justify-center">
				<LoadingSpinner />
			</div>
		);
	}

	if (isErrorAnimal || !animal) {
		return (
			<div className="min-h-screen p-4 bg-gray-50">
				<div className="max-w-4xl mx-auto">
					<div className="mb-6">
						<NavLinkButton to="/animals" label="Back to Animals" />
					</div>
					<div className="bg-white rounded-lg shadow-sm p-6">
						<ErrorMessage>
							{animalError
								? getErrorMessage(
										animalError,
										"Failed to load animal. Please try again."
								  )
								: "Animal not found."}
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
						to={id ? `/animals/${id}` : "/animals"}
						label="Back to Animal"
					/>
				</div>
				<div className="bg-white rounded-lg shadow-md p-6">
					<h1 className="text-2xl font-bold text-gray-900 mb-6">
						Edit Animal
					</h1>

					<AnimalForm
						formState={formState}
						setName={setName}
						setStatus={setStatus}
						setFosterVisibility={setFosterVisibility}
						setSexSpayNeuterStatus={setSexSpayNeuterStatus}
						setLifeStage={setLifeStage}
						setPrimaryBreed={setPrimaryBreed}
						setPhysicalCharacteristics={setPhysicalCharacteristics}
						setMedicalNeeds={setMedicalNeeds}
						setBehavioralNeeds={setBehavioralNeeds}
						setAdditionalNotes={setAdditionalNotes}
						setBio={setBio}
						setPriority={setPriority}
						handleDOBChange={handleDOBChange}
						handleDOBBlur={handleDOBBlur}
						handleAgeValueChange={handleAgeValueChange}
						handleAgeValueBlur={handleAgeValueBlur}
						handleAgeUnitChange={handleAgeUnitChange}
						getTodayDateString={getTodayDateString}
						errors={errors}
						statusOptions={statusOptions}
						sexSpayNeuterOptions={sexSpayNeuterOptions}
						lifeStageOptions={lifeStageOptions}
						breedSuggestions={breedSuggestions}
						isLoadingBreeds={isLoadingBreeds}
						physicalCharacteristicsSuggestions={
							physicalCharacteristicsSuggestions
						}
						isLoadingPhysicalCharacteristics={
							isLoadingPhysicalCharacteristics
						}
						onPhotosChange={setSelectedPhotos}
						existingPhotos={(animal.photos || []).filter(
							(photo) => !photosToDelete.includes(photo.url)
						)}
						onRemovePhoto={handleRemovePhoto}
						uploadingPhotos={uploadingPhotos}
						photoUploadError={photoUploadError}
						onSubmit={handleSubmit}
						loading={loading}
						submitError={submitError}
						successMessage={successMessage}
						submitButtonText="Update Animal"
						showDeleteButton={true}
						deleteError={deleteError}
						showDeleteConfirm={showDeleteConfirm}
						onDeleteClick={handleDelete}
						onDeleteCancel={() => {
							setShowDeleteConfirm(false);
							setDeleteError(null);
						}}
						onDeleteConfirm={handleDelete}
						deleting={deleting}
					/>

					{/* Group Conflict Modal */}
					{group && (
						<ConfirmModal
							isOpen={showGroupConflictModal}
							title="Group Visibility Conflict"
							message={
								<>
									<p className="mb-2">
										{animal.name || "This animal"} is in
										group:{" "}
										<strong>
											{group.name || "Unnamed Group"}
										</strong>
									</p>
									<p className="mb-2">
										All animals in a group must have the
										same Visibility on Fosters Needed page.
									</p>
									<p>
										Would you like to change all animals in
										this group to{" "}
										<strong>
											{formatFosterVisibility(
												formState.fosterVisibility
											)}
										</strong>
										?
									</p>
								</>
							}
							confirmLabel={`Change all animals in group to ${formatFosterVisibility(
								formState.fosterVisibility
							)}`}
							cancelLabel="Cancel"
							onConfirm={async () => {
								setShowGroupConflictModal(false);
								// Update all animals in group
								await performSubmit(true);
							}}
							onCancel={() => {
								setShowGroupConflictModal(false);
								// Revert foster_visibility to original value
								if (originalFosterVisibility) {
									setFosterVisibility(
										originalFosterVisibility
									);
								}
								setOriginalFosterVisibility(null);
							}}
							variant="default"
						/>
					)}
				</div>
			</div>
		</div>
	);
}
