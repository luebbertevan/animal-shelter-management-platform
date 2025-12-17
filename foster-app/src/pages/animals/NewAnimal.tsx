import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { useProtectedAuth } from "../../hooks/useProtectedAuth";
import { useAnimalForm } from "../../hooks/useAnimalForm";
import NavLinkButton from "../../components/ui/NavLinkButton";
import AnimalForm from "../../components/animals/AnimalForm";
import { getErrorMessage, checkOfflineAndThrow } from "../../lib/errorUtils";
import {
	fetchBreedSuggestions,
	fetchPhysicalCharacteristicsSuggestions,
} from "../../lib/animalQueries";
import { calculateDOBFromAge } from "../../lib/ageUtils";
import { uploadAnimalPhoto } from "../../lib/photoUtils";
import type {
	AnimalStatus,
	SexSpayNeuterStatus,
	LifeStage,
	PhotoMetadata,
} from "../../types";

export default function NewAnimal() {
	const navigate = useNavigate();
	const { user, profile } = useProtectedAuth();

	// Use the form hook for all form state management
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
	} = useAnimalForm();

	const [loading, setLoading] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);
	const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
	const [uploadingPhotos, setUploadingPhotos] = useState(false);
	const [photoUploadError, setPhotoUploadError] = useState<string | null>(
		null
	);

	// Fetch breed suggestions with React Query (5-minute cache)
	const { data: breedSuggestions = [], isLoading: isLoadingBreeds } =
		useQuery<string[]>({
			queryKey: ["breedSuggestions", profile.organization_id],
			queryFn: () => fetchBreedSuggestions(profile.organization_id),
			staleTime: 5 * 60 * 1000, // 5 minutes
			enabled: !!profile.organization_id,
		});

	// Fetch physical characteristics suggestions with React Query (5-minute cache)
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
		staleTime: 5 * 60 * 1000, // 5 minutes
		enabled: !!profile.organization_id,
	});

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

	const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setSubmitError(null);

		if (!validateForm()) {
			return;
		}

		setLoading(true);

		try {
			// Check if we're offline before making the request
			checkOfflineAndThrow();

			// Prepare data for insertion
			const animalData: Record<string, unknown> = {
				name: formState.name.trim() || null, // Empty string becomes null
				species: "cat", // Default to "cat" for MVP (can be made configurable later)
				status: formState.status,
				created_by: user.id,
				organization_id: profile.organization_id, // Explicitly set from user's profile
			};

			// Add optional fields only if they have values
			if (formState.sexSpayNeuterStatus) {
				animalData.sex_spay_neuter_status =
					formState.sexSpayNeuterStatus;
			}

			if (formState.lifeStage) {
				animalData.life_stage = formState.lifeStage;
			}

			if (formState.primaryBreed.trim()) {
				animalData.primary_breed = formState.primaryBreed.trim();
			}

			if (formState.physicalCharacteristics.trim()) {
				animalData.physical_characteristics =
					formState.physicalCharacteristics.trim();
			}

			if (formState.medicalNeeds.trim()) {
				animalData.medical_needs = formState.medicalNeeds.trim();
			}

			if (formState.behavioralNeeds.trim()) {
				animalData.behavioral_needs = formState.behavioralNeeds.trim();
			}

			if (formState.additionalNotes.trim()) {
				animalData.additional_notes = formState.additionalNotes.trim();
			}

			if (formState.bio.trim()) {
				animalData.bio = formState.bio.trim();
			}

			// Add boolean fields
			animalData.priority = formState.priority;
			// Add foster_visibility
			animalData.foster_visibility = formState.fosterVisibility;
			// Keep display_placement_request for backward compatibility (deprecated)
			animalData.display_placement_request =
				formState.displayPlacementRequest;

			// Add date_of_birth (calculate from age if age provided and DOB not provided)
			let finalDOB: string | null = null;
			if (formState.dateOfBirth) {
				finalDOB = formState.dateOfBirth;
			} else if (
				formState.ageValue !== "" &&
				formState.ageValue > 0 &&
				formState.ageUnit
			) {
				// Calculate DOB from age estimate (only if unit is selected)
				const calculatedDOB = calculateDOBFromAge(
					formState.ageValue,
					formState.ageUnit
				);
				if (calculatedDOB) {
					finalDOB = calculatedDOB;
				}
			}

			if (finalDOB) {
				animalData.date_of_birth = finalDOB;
			}

			const { data: insertedData, error: insertError } = await supabase
				.from("animals")
				.insert(animalData)
				.select()
				.single();

			if (insertError) {
				console.error("Error creating animal:", insertError);
				setSubmitError(
					getErrorMessage(
						insertError,
						"Failed to create animal. Please try again."
					)
				);
			} else if (!insertedData) {
				// No error but no data returned (unexpected)
				setSubmitError("Animal was not created. Please try again.");
			} else {
				// Animal created successfully - now upload photos if any
				const animalId = insertedData.id;
				const photoMetadata: PhotoMetadata[] = [];

				if (selectedPhotos.length > 0) {
					setUploadingPhotos(true);
					setPhotoUploadError(null);

					try {
						// Upload all photos in parallel
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
										animalId
									);
									return { success: true, url };
								} catch (err) {
									return { success: false, error: err };
								}
							}
						);

						const uploadResults = await Promise.all(uploadPromises);

						// Separate successful and failed uploads
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

						// Update animal with photo metadata (even if some failed)
						if (photoMetadata.length > 0) {
							const { error: updateError } = await supabase
								.from("animals")
								.update({ photos: photoMetadata })
								.eq("id", animalId);

							if (updateError) {
								console.error(
									"Error updating animal with photos:",
									updateError
								);
								// Don't fail the whole operation - photos are uploaded even if metadata update fails
							}
						}

						// Show appropriate messages based on upload results
						if (failedUploads === selectedPhotos.length) {
							// All photos failed
							setPhotoUploadError(
								`Animal created successfully, but all ${failedUploads} photo${
									failedUploads !== 1 ? "s" : ""
								} failed to upload. You can add photos later via the edit form.`
							);
						} else if (failedUploads > 0) {
							// Some photos failed
							setPhotoUploadError(
								`Animal created successfully. ${failedUploads} photo${
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
						setUploadingPhotos(false);
						setPhotoUploadError(
							"Animal created successfully, but photo upload failed. "
						);
					}
				}

				// Success - data exists and no error
				setSuccessMessage("Animal created successfully!");

				// Redirect to dashboard after a brief delay to show success message
				// (Will redirect to /animals list page once M2.2 is complete)
				setTimeout(() => {
					navigate("/dashboard", { replace: true });
				}, 1500);
			}
		} catch (err) {
			console.error("Unexpected error:", err);
			// This catch handles errors that occur outside the Supabase call
			// (e.g., network errors before the request completes, or other unexpected errors)
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

	return (
		<div className="min-h-screen p-4 bg-gray-50">
			<div className="max-w-4xl mx-auto">
				<div className="mb-6">
					<NavLinkButton to="/dashboard" label="Back to Dashboard" />
				</div>
				<div className="bg-white rounded-lg shadow-md p-6">
					<h1 className="text-2xl font-bold text-gray-900 mb-6">
						Create New Animal
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
						uploadingPhotos={uploadingPhotos}
						photoUploadError={photoUploadError}
						onSubmit={handleSubmit}
						loading={loading}
						submitError={submitError}
						successMessage={successMessage}
						submitButtonText="Create Animal"
					/>
				</div>
			</div>
		</div>
	);
}
