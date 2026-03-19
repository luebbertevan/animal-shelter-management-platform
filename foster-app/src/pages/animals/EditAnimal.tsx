import { useState } from "react";
import type { FormEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { useProtectedAuth } from "../../hooks/useProtectedAuth";
import { useAnimalForm } from "../../hooks/useAnimalForm";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import ErrorMessage from "../../components/ui/ErrorMessage";
import AnimalForm from "../../components/animals/AnimalForm";
import AnimalSelector from "../../components/animals/AnimalSelector";
import Button from "../../components/ui/Button";
import ConfirmModal from "../../components/ui/ConfirmModal";
import { getErrorMessage, checkOfflineAndThrow } from "../../lib/errorUtils";
import {
	fetchBreedSuggestions,
	fetchPhysicalCharacteristicsSuggestions,
	fetchAnimalById,
	fetchAnimalsByIds,
} from "../../lib/animalQueries";
import { fetchGroupById } from "../../lib/groupQueries";
import { fetchFosterById } from "../../lib/fosterQueries";
import {
	formatFosterVisibility,
	isDeceasedOrEuthanized,
} from "../../lib/metadataUtils";
import { wouldFosterVisibilityChangeConflict } from "../../lib/groupUtils";
import { calculateDOBFromAge } from "../../lib/ageUtils";
import { uploadAnimalPhoto, deleteAnimalPhoto } from "../../lib/photoUtils";
import { deleteAnimal } from "../../lib/animalUtils";
import { animalToFormState } from "../../lib/animalFormUtils";
import { animalStatusDropdownOptionsWithTerminal } from "../../lib/animalStatusOptions";
import type {
	SexSpayNeuterStatus,
	LifeStage,
	PhotoMetadata,
	Animal,
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

	// Group conflict modal state (visibility)
	const [showGroupConflictModal, setShowGroupConflictModal] = useState(false);

	// Group status modal (apply status to group or only this animal)
	const [showGroupStatusModal, setShowGroupStatusModal] = useState(false);
	// When true, show visibility modal after user chooses an option in status modal (both status and visibility changed)
	const [pendingVisibilityModalAfterStatus, setPendingVisibilityModalAfterStatus] =
		useState(false);
	// Staged status choice: true = change all, false = only this animal, null = not from status flow (visibility-only)
	// Form is not submitted until all modals are answered; cancel on visibility modal = no submit
	const [stagedApplyStatusToAll, setStagedApplyStatusToAll] = useState<
		boolean | null
	>(null);

	// Copy from Animal state
	const [isAnimalSelectorOpen, setIsAnimalSelectorOpen] = useState(false);
	const [copiedFromAnimalName, setCopiedFromAnimalName] = useState<string | null>(null);

	// Confirmation when saving as deceased/euthanized (removal from group and/or unassignment)
	const [showDeceasedEuthanizedConfirm, setShowDeceasedEuthanizedConfirm] =
		useState(false);

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

	// Fetch current foster name for deceased/euthanized confirmation dialog
	const { data: currentFoster } = useQuery({
		queryKey: ["foster", animal?.current_foster_id],
		queryFn: async () => {
			if (!animal?.current_foster_id) return null;
			return fetchFosterById(
				animal.current_foster_id,
				profile.organization_id
			);
		},
		enabled: !!animal?.current_foster_id && isCoordinator,
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

	// Edit Animal is the only place where deceased/euthanized can be selected
	const statusOptions = animalStatusDropdownOptionsWithTerminal();

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

	// Handle copying data from selected animal
	const handleCopyFromAnimal = (sourceAnimal: Animal) => {
		// Use animalToFormState with exclusions for name, bio, and photos
		const copiedState = animalToFormState(sourceAnimal, {
			exclude: ["name", "bio"],
		});

		// Update all form fields with copied values
		setStatus(copiedState.status);
		setFosterVisibility(copiedState.fosterVisibility);
		setSexSpayNeuterStatus(copiedState.sexSpayNeuterStatus);
		setLifeStage(copiedState.lifeStage);
		setPrimaryBreed(copiedState.primaryBreed);
				setPhysicalCharacteristics(copiedState.physicalCharacteristics);
				setMedicalNeeds(copiedState.medicalNeeds);
				setBehavioralNeeds(copiedState.behavioralNeeds);
		setPriority(copiedState.priority);

		// Handle date of birth - use handleDOBChange to properly calculate age
		if (copiedState.dateOfBirth) {
			handleDOBChange(copiedState.dateOfBirth);
		} else {
			// Clear DOB if source animal doesn't have one
			handleDOBChange("");
		}

		// Set success message with animal name
		const animalName = sourceAnimal.name?.trim() || "Unnamed Animal";
		setCopiedFromAnimalName(animalName);

		// Clear the copied message after 5 seconds
		setTimeout(() => {
			setCopiedFromAnimalName(null);
		}, 5000);
	};

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

		const visibilityConflict =
			animal.group_id &&
			group &&
			groupAnimals.length > 0 &&
			wouldFosterVisibilityChangeConflict(
				animal,
				formState.fosterVisibility,
				groupAnimals
			);
		const statusChanged = formState.status !== animal.status;
		const newStatusIsDeceasedOrEuthanized =
			isDeceasedOrEuthanized(formState.status);

		// When marking deceased/euthanized: only show confirmation if animal is in a group or assigned (removal/unassignment will occur)
		if (newStatusIsDeceasedOrEuthanized) {
			if (animal.group_id || animal.current_foster_id) {
				setShowDeceasedEuthanizedConfirm(true);
				return;
			}
			await performSubmit(false, false);
			return;
		}

		// If animal is in a group and status changed, show status modal first (then visibility modal if both changed)
		if (
			animal.group_id &&
			group &&
			group.animal_ids &&
			group.animal_ids.length > 0 &&
			statusChanged
		) {
			setPendingVisibilityModalAfterStatus(!!visibilityConflict);
			setShowGroupStatusModal(true);
			return;
		}

		// If animal is in a group and visibility change would conflict (status unchanged), show visibility modal only
		if (visibilityConflict) {
			setShowGroupConflictModal(true);
			return;
		}

		// No group, proceed with normal submit
		await performSubmit(false, false);
	};

	// Perform the actual submission
	// updateAllVisibility: when true, update all group animals' foster_visibility (visibility conflict flow)
	// updateAllStatus: when true, update all group animals' status and foster_visibility (status-in-group flow)
	const performSubmit = async (
		updateAllVisibility: boolean,
		updateAllStatus: boolean
	) => {
		if (!id || !animal) {
			setSubmitError("Animal ID is required");
			return;
		}

		setLoading(true);

		try {
			checkOfflineAndThrow();

			// When saving as deceased/euthanized, unassign and remove from group
			const savingAsDeceasedOrEuthanized =
				isDeceasedOrEuthanized(formState.status);
			const previousGroupId = animal.group_id ?? null;

			// Prepare data for update
			const animalData: Record<string, unknown> = {
				name: formState.name.trim() || null,
				status: formState.status,
			};

			if (savingAsDeceasedOrEuthanized) {
				animalData.current_foster_id = null;
				animalData.group_id = null;
				animalData.foster_visibility = "not_visible";
			}

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

			if (formState.bio.trim()) {
				animalData.bio = formState.bio.trim();
			} else {
				animalData.bio = null;
			}

			animalData.priority = formState.priority;
			// Add foster_visibility (unless already set for deceased/euthanized)
			if (!savingAsDeceasedOrEuthanized) {
				animalData.foster_visibility = formState.fosterVisibility;
			}

			// If updating all animals in group (visibility conflict), update their foster_visibility
			if (
				updateAllVisibility &&
				animal.group_id &&
				group?.animal_ids
			) {
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

			// If applying status to all animals in group, update their status and foster_visibility
			if (
				updateAllStatus &&
				animal.group_id &&
				group?.animal_ids
			) {
				const { error: groupStatusError } = await supabase
					.from("animals")
					.update({
						status: formState.status,
						foster_visibility: formState.fosterVisibility,
					})
					.in("id", group.animal_ids)
					.eq("organization_id", profile.organization_id);

				if (groupStatusError) {
					console.error(
						"Error updating group animals' status:",
						groupStatusError
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

			// When saved as deceased/euthanized, remove animal from group's animal_ids
			if (savingAsDeceasedOrEuthanized && previousGroupId && group?.animal_ids) {
				const updatedAnimalIds = group.animal_ids.filter(
					(animalId: string) => animalId !== id
				);
				const { error: groupUpdateError } = await supabase
					.from("animal_groups")
					.update({ animal_ids: updatedAnimalIds })
					.eq("id", previousGroupId)
					.eq("organization_id", profile.organization_id);

				if (groupUpdateError) {
					console.error(
						"Error removing animal from group:",
						groupUpdateError
					);
					setSubmitError(
						"Animal updated, but failed to remove from group. Please edit the group to remove this animal."
					);
					setLoading(false);
					return;
				}
			}

			// Handle photo updates (additions and deletions)
			const existingPhotos = animal.photos || [];
			const remainingPhotos = existingPhotos.filter(
				(photo) => !photosToDelete.includes(photo.url)
			);
			const photoMetadata: PhotoMetadata[] = [...remainingPhotos];

			// Track if photos were modified (either deleted or added)
			const photosWereDeleted = photosToDelete.length > 0;
			let photosWereAdded = false;

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
							photosWereAdded = true;
						}
					});

					setUploadingPhotos(false);

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
			}

			// Update photo metadata in database if photos were added or deleted
			if (photosWereDeleted || photosWereAdded) {
				const { error: photoUpdateError } = await supabase
					.from("animals")
					.update({ photos: photoMetadata })
					.eq("id", id);

				if (photoUpdateError) {
					console.error(
						"Error updating animal photos:",
						photoUpdateError
					);
					setSubmitError(
						getErrorMessage(
							photoUpdateError,
							"Failed to update photo metadata. Please try again."
						)
					);
				}
			}

			// Invalidate queries to refresh data
			queryClient.invalidateQueries({
				queryKey: ["animals", user.id, profile.organization_id],
			});
			queryClient.invalidateQueries({
				queryKey: ["animals", user.id, profile.organization_id, id],
			});
			// If we updated all animals in group or removed this animal from a group, invalidate group queries
			const groupIdToInvalidate =
				(updateAllVisibility || updateAllStatus) && animal.group_id
					? animal.group_id
					: savingAsDeceasedOrEuthanized && previousGroupId
						? previousGroupId
						: null;
			if (groupIdToInvalidate) {
				queryClient.invalidateQueries({
					queryKey: ["group", groupIdToInvalidate],
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
					<div className="mb-6"></div>
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
				<div className="bg-white rounded-lg shadow-md p-6">
					<div className="flex items-center justify-between mb-6">
						<h1 className="text-2xl font-bold text-gray-900">
							Edit Animal
						</h1>
						<div className="flex items-center gap-2">
							<Button
								type="button"
								variant="primary"
								onClick={() => setIsAnimalSelectorOpen(true)}
								disabled={loading || uploadingPhotos}
								className="w-auto py-1 px-2 text-sm whitespace-nowrap"
							>
								Copy animal
							</Button>
							<Button
								type="button"
								variant="outline"
								onClick={() =>
									navigate(id ? `/animals/${id}` : "/animals")
								}
								className="w-auto py-1 px-2 text-sm whitespace-nowrap"
							>
								Cancel
							</Button>
						</div>
					</div>

					{/* Success message when data is copied */}
					{copiedFromAnimalName && (
						<div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-md flex items-center gap-2">
							<svg
								className="w-5 h-5 text-green-600 flex-shrink-0"
								fill="currentColor"
								viewBox="0 0 20 20"
							>
								<path
									fillRule="evenodd"
									d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
									clipRule="evenodd"
								/>
							</svg>
							<span className="text-sm text-green-800">
								Data copied from <strong>{copiedFromAnimalName}</strong>
							</span>
						</div>
					)}

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
						visibilityDropdownDisabled={isDeceasedOrEuthanized(
							formState.status
						)}
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

					{/* Deceased/euthanized confirmation: removal from group and/or unassignment */}
					<ConfirmModal
						isOpen={showDeceasedEuthanizedConfirm}
						title={
							formState.status === "deceased"
								? "Confirm Deceased status change"
								: "Confirm Euthanized status change"
						}
						message={
							<div className="space-y-2">
								{animal?.group_id && group && (
									<p>
										<strong>{animal?.name || "This animal"}</strong> will be
										removed from{" "}
										<strong>{group.name || "Unnamed Group"}</strong>
									</p>
								)}
								{animal?.current_foster_id && currentFoster && (
									<p>
										<strong>{animal?.name || "This animal"}</strong> will be
										unassigned from{" "}
										<strong>
											{currentFoster.full_name ||
												currentFoster.email ||
												"the current foster"}
										</strong>
									</p>
								)}
							</div>
						}
						confirmLabel="Confirm"
						cancelLabel="Cancel"
						onConfirm={async () => {
							setShowDeceasedEuthanizedConfirm(false);
							await performSubmit(false, false);
						}}
						onCancel={() => setShowDeceasedEuthanizedConfirm(false)}
						variant="default"
					/>

					{/* Group visibility conflict modal */}
					{group && (
						<ConfirmModal
							isOpen={showGroupConflictModal}
							title="Group visibility conflict"
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
										same visibility on Fosters Needed page.
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
								// Apply visibility to all; if we came from status modal, use staged status choice for updateAllStatus
								const updateAllStatus = stagedApplyStatusToAll ?? false;
								setStagedApplyStatusToAll(null);
								await performSubmit(true, updateAllStatus);
							}}
							onCancel={() => {
								setShowGroupConflictModal(false);
								setStagedApplyStatusToAll(null);
							}}
							variant="default"
							buttonsLayout="column"
						/>
					)}

					{/* Group status modal: apply status to all in group or only this animal */}
					{group && showGroupStatusModal && (
						<>
							<div
								className="fixed inset-0 z-40"
								style={{
									backgroundColor: "rgba(0, 0, 0, 0.65)",
									backdropFilter: "blur(4px)",
									WebkitBackdropFilter: "blur(4px)",
								}}
								onClick={() => setShowGroupStatusModal(false)}
							/>
							<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
								<div
									className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
									onClick={(e) => e.stopPropagation()}
								>
									<h3 className="text-lg font-semibold text-gray-900 mb-4">
										Change status
									</h3>
									<p className="text-gray-700 mb-2">
										{animal.name || "This animal"} is in
										group:{" "}
										<strong>
											{group.name || "Unnamed Group"}
										</strong>
									</p>
									<p className="text-gray-700 mb-6">
										Would you like to change all animals in
										this group to{" "}
										<strong>
											{statusOptions.find(
												(o) => o.value === formState.status
											)?.label ?? formState.status}
										</strong>
										?
									</p>
									<div className="flex flex-col gap-3">
										<Button
											variant="outline"
											onClick={() => {
												setShowGroupStatusModal(false);
												setPendingVisibilityModalAfterStatus(false);
												setStagedApplyStatusToAll(null);
											}}
										>
											Cancel
										</Button>
										<Button
											variant="primary"
											onClick={() => {
												const showVisibilityAfter = pendingVisibilityModalAfterStatus;
												setStagedApplyStatusToAll(false);
												setShowGroupStatusModal(false);
												setPendingVisibilityModalAfterStatus(false);
												if (showVisibilityAfter) {
													setShowGroupConflictModal(true);
												}
											}}
										>
											Only change{" "}
											{animal.name || "this animal"} to{" "}
											{statusOptions.find(
												(o) => o.value === formState.status
											)?.label ?? formState.status}
										</Button>
										<Button
											variant="primary"
											onClick={async () => {
												const showVisibilityAfter = pendingVisibilityModalAfterStatus;
												setStagedApplyStatusToAll(true);
												setShowGroupStatusModal(false);
												setPendingVisibilityModalAfterStatus(false);
												if (showVisibilityAfter) {
													setShowGroupConflictModal(true);
												} else {
													await performSubmit(false, true);
												}
											}}
										>
											Change all animals in this group to{" "}
											{statusOptions.find(
												(o) => o.value === formState.status
											)?.label ?? formState.status}
										</Button>
									</div>
								</div>
							</div>
						</>
					)}
				</div>
			</div>

			{/* Animal Selector Modal for Copy from Animal */}
			<AnimalSelector
				isOpen={isAnimalSelectorOpen}
				onClose={() => setIsAnimalSelectorOpen(false)}
				onSelect={handleCopyFromAnimal}
				title="Copy data from animal"
				excludeAnimalIds={id ? [id] : []}
			/>
		</div>
	);
}
