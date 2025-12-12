import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { useProtectedAuth } from "../../hooks/useProtectedAuth";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Toggle from "../../components/ui/Toggle";
import Textarea from "../../components/ui/Textarea";
import Button from "../../components/ui/Button";
import ErrorMessage from "../../components/ui/ErrorMessage";
import NavLinkButton from "../../components/ui/NavLinkButton";
import Combobox from "../../components/ui/Combobox";
import { getErrorMessage, checkOfflineAndThrow } from "../../lib/errorUtils";
import {
	fetchBreedSuggestions,
	fetchPhysicalCharacteristicsSuggestions,
} from "../../lib/animalQueries";
import {
	rolloverAge,
	calculateAgeFromDOB,
	calculateDOBFromAge,
	calculateLifeStageFromDOB,
	calculateLifeStageFromAge,
	type AgeUnit,
} from "../../lib/ageUtils";
import { uploadAnimalPhoto } from "../../lib/photoUtils";
import PhotoUpload from "../../components/animals/PhotoUpload";
import type { AnimalStatus, SexSpayNeuterStatus, LifeStage } from "../../types";

export default function NewAnimal() {
	const navigate = useNavigate();
	const { user, profile } = useProtectedAuth();
	const [name, setName] = useState("");
	const [status, setStatus] = useState<AnimalStatus>("in_shelter");
	const [displayPlacementRequest, setDisplayPlacementRequest] =
		useState(true); // Auto-calculated from initial status
	const [sexSpayNeuterStatus, setSexSpayNeuterStatus] = useState<
		SexSpayNeuterStatus | ""
	>("");
	const [lifeStage, setLifeStage] = useState<LifeStage | "">("");
	const [primaryBreed, setPrimaryBreed] = useState("");
	const [physicalCharacteristics, setPhysicalCharacteristics] = useState("");
	const [medicalNeeds, setMedicalNeeds] = useState("");
	const [behavioralNeeds, setBehavioralNeeds] = useState("");
	const [additionalNotes, setAdditionalNotes] = useState("");
	const [bio, setBio] = useState("");
	const [priority, setPriority] = useState(false);
	const [dateOfBirth, setDateOfBirth] = useState("");
	const [ageValue, setAgeValue] = useState<number | "">("");
	const [ageUnit, setAgeUnit] = useState<AgeUnit | "">("");
	const [dobWasManuallyCleared, setDobWasManuallyCleared] = useState(false);
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [loading, setLoading] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);
	const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
	const [uploadingPhotos, setUploadingPhotos] = useState(false);
	const [photoUploadError, setPhotoUploadError] = useState<string | null>(
		null
	);

	// Auto-update display_placement_request when status changes
	useEffect(() => {
		if (
			status === "in_shelter" ||
			status === "medical_hold" ||
			status === "transferring"
		) {
			setDisplayPlacementRequest(true);
		} else if (status === "adopted" || status === "in_foster") {
			setDisplayPlacementRequest(false);
		}
	}, [status]);

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

	// Get today's date in YYYY-MM-DD format for date input max attribute
	// Normalize to midnight to prevent selecting today or future dates
	const getTodayDateString = (): string => {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const year = today.getFullYear();
		const month = String(today.getMonth() + 1).padStart(2, "0");
		const day = String(today.getDate()).padStart(2, "0");
		return `${year}-${month}-${day}`;
	};

	// Handle DOB change - calculate age from DOB immediately
	const handleDOBChange = (dob: string) => {
		if (!dob) {
			// DOB was manually cleared by user
			setDateOfBirth("");
			setAgeValue("");
			setAgeUnit(""); // Clear unit to reset to "Select unit"
			setDobWasManuallyCleared(true);
			// Clear life stage when DOB is cleared
			setLifeStage("");
			setErrors((prev) => {
				const newErrors = { ...prev };
				delete newErrors.dateOfBirth;
				delete newErrors.ageValue;
				return newErrors;
			});
			return;
		}

		setDateOfBirth(dob);
		setDobWasManuallyCleared(false);

		// Validate: prevent future dates (normalize to midnight for comparison)
		const dobDate = new Date(dob);
		const today = new Date();
		dobDate.setHours(0, 0, 0, 0);
		today.setHours(0, 0, 0, 0);
		if (dobDate > today) {
			setErrors((prev) => ({
				...prev,
				dateOfBirth: "Date of birth cannot be in the future",
			}));
			setDateOfBirth("");
			setAgeValue("");
			setAgeUnit(""); // Clear unit to reset to "Select unit"
			return;
		}

		// Clear any previous DOB errors
		setErrors((prev) => {
			const newErrors = { ...prev };
			delete newErrors.dateOfBirth;
			delete newErrors.ageValue;
			return newErrors;
		});

		// Calculate age from DOB immediately
		const ageResult = calculateAgeFromDOB(dob);
		if (ageResult) {
			setAgeValue(ageResult.value);
			setAgeUnit(ageResult.unit);

			// Auto-fill life stage whenever DOB changes
			const calculatedLifeStage = calculateLifeStageFromDOB(dob);
			setLifeStage(calculatedLifeStage);
		} else {
			// Invalid date - clear age fields
			setAgeValue("");
			setAgeUnit("");
			// Clear life stage
			setLifeStage("");
		}
	};

	// Handle DOB field blur - only for validation
	const handleDOBBlur = () => {
		if (!dateOfBirth) {
			return;
		}

		// Validate: prevent future dates (normalize to midnight for comparison)
		const dobDate = new Date(dateOfBirth);
		const today = new Date();
		dobDate.setHours(0, 0, 0, 0);
		today.setHours(0, 0, 0, 0);
		if (dobDate > today) {
			setErrors((prev) => ({
				...prev,
				dateOfBirth: "Date of birth cannot be in the future",
			}));
			setDateOfBirth("");
			setAgeValue("");
			setAgeUnit(""); // Clear unit to reset to "Select unit"
			return;
		}

		// Clear any previous DOB errors
		setErrors((prev) => {
			const newErrors = { ...prev };
			delete newErrors.dateOfBirth;
			return newErrors;
		});
	};

	// Handle age number change - just update value, rollover on blur
	const handleAgeValueChange = (value: string) => {
		// Parse the value immediately
		if (value === "") {
			setAgeValue("");
		} else {
			const cleaned = value.replace(/[^0-9]/g, "");
			if (cleaned !== "") {
				const num = parseInt(cleaned, 10);
				if (!isNaN(num) && num >= 0) {
					setAgeValue(num);
				}
			} else {
				setAgeValue("");
			}
		}

		// Clear age errors while typing
		setErrors((prev) => {
			const newErrors = { ...prev };
			delete newErrors.ageValue;
			return newErrors;
		});
	};

	// Handle age number field blur - calculate DOB if needed, then apply rollover to display
	const handleAgeValueBlur = () => {
		// Don't do anything if no unit selected
		if (!ageUnit) {
			return;
		}

		if (ageValue === "" || ageValue <= 0) {
			// Clear DOB if age is invalid (only if DOB wasn't manually entered)
			if (!dobWasManuallyCleared) {
				setDateOfBirth("");
			}
			setErrors((prev) => {
				const newErrors = { ...prev };
				delete newErrors.ageValue;
				return newErrors;
			});
			return;
		}

		// Clear any previous age errors
		setErrors((prev) => {
			const newErrors = { ...prev };
			delete newErrors.ageValue;
			return newErrors;
		});

		// If user manually cleared DOB but has now entered age value (and unit is already selected),
		// reset the flag to allow DOB calculation (user clearly wants to recalculate DOB)
		// We know ageUnit exists because we return early if it doesn't
		if (
			dobWasManuallyCleared &&
			typeof ageValue === "number" &&
			ageValue > 0
		) {
			setDobWasManuallyCleared(false);
		}

		// Always recalculate DOB from the user's age input (unless DOB was manually cleared)
		// When user changes age, we need to update DOB to match the new age
		if (!dobWasManuallyCleared) {
			const calculatedDOB = calculateDOBFromAge(ageValue, ageUnit);
			if (calculatedDOB) {
				setDateOfBirth(calculatedDOB);
				setDobWasManuallyCleared(false);
				// Clear any DOB errors since we calculated it
				setErrors((prev) => {
					const newErrors = { ...prev };
					delete newErrors.dateOfBirth;
					return newErrors;
				});

				// Recalculate age from DOB (the source of truth) instead of using rollover
				// This ensures the displayed age matches the actual calendar age from DOB
				const ageFromDOB = calculateAgeFromDOB(calculatedDOB);
				if (ageFromDOB) {
					setAgeValue(ageFromDOB.value);
					setAgeUnit(ageFromDOB.unit);

					// Auto-fill life stage when DOB is set from age
					const calculatedLifeStage = calculateLifeStageFromAge(
						ageFromDOB.value,
						ageFromDOB.unit
					);
					setLifeStage(calculatedLifeStage);
					return; // Exit early since we've recalculated from DOB
				}
			}
		}

		// Fallback: Apply rollover to display only (only if DOB couldn't be calculated or was manually cleared)
		const rolledOver = rolloverAge(ageValue, ageUnit);
		setAgeValue(rolledOver.value);
		setAgeUnit(rolledOver.unit);
	};

	// Handle age unit change - calculate DOB from entered value, then apply rollover to display
	const handleAgeUnitChange = (newUnit: AgeUnit | "") => {
		// If unit is cleared, clear DOB
		if (!newUnit) {
			setAgeUnit("");
			setDateOfBirth("");
			setDobWasManuallyCleared(false);
			return;
		}

		if (ageValue === "" || ageValue <= 0) {
			setAgeUnit(newUnit);
			return;
		}

		// If user manually cleared DOB but has now entered age value and selected unit,
		// reset the flag to allow DOB calculation (user clearly wants to recalculate DOB)
		if (dobWasManuallyCleared) {
			setAgeUnit(newUnit);
			// If user has entered an age value, reset flag and continue to calculate DOB
			if (typeof ageValue === "number" && ageValue > 0) {
				setDobWasManuallyCleared(false);
				// Continue below to calculate DOB
			} else {
				// No age value yet, just update unit and return
				setDobWasManuallyCleared(false);
				return;
			}
		}

		// Clear any previous age errors
		setErrors((prev) => {
			const newErrors = { ...prev };
			delete newErrors.ageValue;
			return newErrors;
		});

		// Calculate DOB from entered value (this is the source of truth)
		const calculatedDOB = calculateDOBFromAge(ageValue, newUnit as AgeUnit);
		if (calculatedDOB) {
			setDateOfBirth(calculatedDOB);
			setDobWasManuallyCleared(false);
			// Clear any DOB errors since we calculated it
			setErrors((prev) => {
				const newErrors = { ...prev };
				delete newErrors.dateOfBirth;
				return newErrors;
			});

			// Recalculate age from DOB (the source of truth) instead of using rollover
			// This ensures the displayed age matches the actual calendar age from DOB
			const ageFromDOB = calculateAgeFromDOB(calculatedDOB);
			if (ageFromDOB) {
				setAgeValue(ageFromDOB.value);
				setAgeUnit(ageFromDOB.unit);

				// Auto-fill life stage when DOB is set from age unit change
				const calculatedLifeStage = calculateLifeStageFromAge(
					ageFromDOB.value,
					ageFromDOB.unit
				);
				setLifeStage(calculatedLifeStage);
				return; // Exit early since we've recalculated from DOB
			}
		}
	};

	const validateForm = (): boolean => {
		const newErrors: Record<string, string> = {};

		// Validate date of birth (if provided)
		if (dateOfBirth) {
			const dobDate = new Date(dateOfBirth);
			const today = new Date();
			// Normalize to midnight for comparison
			dobDate.setHours(0, 0, 0, 0);
			today.setHours(0, 0, 0, 0);

			// Check if date is valid
			if (isNaN(dobDate.getTime())) {
				newErrors.dateOfBirth = "Invalid date format";
			} else if (dobDate > today) {
				newErrors.dateOfBirth = "Date of birth cannot be in the future";
			}
		}

		// Validate age estimate (only if user has manually entered age)
		// Don't validate if age was auto-filled from DOB (ageValue will be set when DOB is set)
		// Only validate if user has selected a unit AND entered a value (or tried to)
		// If ageValue is empty but unit is selected, that's fine - user might be typing
		// Only show error on form submission if there's an invalid state
		if (ageValue !== "" && ageValue <= 0) {
			newErrors.ageValue = "Age must be a positive number";
		} else if (ageValue !== "" && !Number.isInteger(ageValue)) {
			newErrors.ageValue = "Age must be a whole number";
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setErrors({});
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
				name: name.trim() || null, // Empty string becomes null
				species: "cat", // Default to "cat" for MVP (can be made configurable later)
				status: status,
				created_by: user.id,
				organization_id: profile.organization_id, // Explicitly set from user's profile
			};

			// Add optional fields only if they have values
			if (sexSpayNeuterStatus) {
				animalData.sex_spay_neuter_status = sexSpayNeuterStatus;
			}

			if (lifeStage) {
				animalData.life_stage = lifeStage;
			}

			if (primaryBreed.trim()) {
				animalData.primary_breed = primaryBreed.trim();
			}

			if (physicalCharacteristics.trim()) {
				animalData.physical_characteristics =
					physicalCharacteristics.trim();
			}

			if (medicalNeeds.trim()) {
				animalData.medical_needs = medicalNeeds.trim();
			}

			if (behavioralNeeds.trim()) {
				animalData.behavioral_needs = behavioralNeeds.trim();
			}

			if (additionalNotes.trim()) {
				animalData.additional_notes = additionalNotes.trim();
			}

			if (bio.trim()) {
				animalData.bio = bio.trim();
			}

			// Add boolean fields
			animalData.priority = priority;
			animalData.display_placement_request = displayPlacementRequest;

			// Add date_of_birth (calculate from age if age provided and DOB not provided)
			let finalDOB: string | null = null;
			if (dateOfBirth) {
				finalDOB = dateOfBirth;
			} else if (ageValue !== "" && ageValue > 0 && ageUnit) {
				// Calculate DOB from age estimate (only if unit is selected)
				const calculatedDOB = calculateDOBFromAge(ageValue, ageUnit);
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
				const photoMetadata: Array<{
					url: string;
					uploaded_by: string;
				}> = [];

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

					<form onSubmit={handleSubmit} className="space-y-6">
						<Input
							label="Name"
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Enter animal name (optional)"
							disabled={loading}
						/>

						<PhotoUpload
							maxPhotos={10}
							onPhotosChange={setSelectedPhotos}
							disabled={loading || uploadingPhotos}
							error={photoUploadError}
						/>

						{uploadingPhotos && (
							<div className="p-2 bg-blue-50 border border-blue-200 rounded text-blue-600 text-sm flex items-center gap-2">
								<span>Uploading photos...</span>
							</div>
						)}

						{/* Status and Display Placement Request grouped together */}
						<div className="space-y-4">
							<Select
								label="Status"
								value={status}
								onChange={(e) =>
									setStatus(e.target.value as AnimalStatus)
								}
								options={statusOptions}
								required
								error={errors.status}
								disabled={loading}
							/>

							<Toggle
								label="Display Placement Request"
								checked={displayPlacementRequest}
								onChange={setDisplayPlacementRequest}
								disabled={loading}
							/>
						</div>

						<Select
							label="Sex"
							value={sexSpayNeuterStatus}
							onChange={(e) =>
								setSexSpayNeuterStatus(
									e.target.value as SexSpayNeuterStatus | ""
								)
							}
							options={sexSpayNeuterOptions}
							disabled={loading}
						/>

						{/* Date of Birth and Age Estimate */}
						<div className="space-y-4">
							<Input
								label="Date of Birth"
								type="date"
								value={dateOfBirth}
								onChange={(e) =>
									handleDOBChange(e.target.value)
								}
								onBlur={handleDOBBlur}
								max={getTodayDateString()}
								disabled={loading}
								error={errors.dateOfBirth}
							/>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Age Estimate
								</label>
								<div className="flex gap-2">
									<div className="flex-1">
										<input
											type="number"
											min="0"
											step="1"
											value={ageValue}
											onChange={(e) =>
												handleAgeValueChange(
													e.target.value
												)
											}
											onKeyDown={(e) => {
												// Prevent "e", "E", "+", ".", "-" from being entered
												if (
													e.key === "e" ||
													e.key === "E" ||
													e.key === "+" ||
													e.key === "." ||
													e.key === "-"
												) {
													e.preventDefault();
												}
											}}
											onBlur={handleAgeValueBlur}
											placeholder="Enter age"
											disabled={loading}
											className={`w-full px-3 py-2 border ${
												errors.ageValue
													? "border-red-300 focus:border-red-500 focus:ring-red-500"
													: "border-pink-300 focus:border-pink-500 focus:ring-pink-500"
											} rounded-md shadow-sm focus:outline-none focus:ring-2 disabled:bg-gray-100 disabled:cursor-not-allowed`}
										/>
									</div>
									<select
										value={ageUnit}
										onChange={(e) =>
											handleAgeUnitChange(
												e.target.value as AgeUnit | ""
											)
										}
										disabled={loading}
										className="px-3 py-2 border border-pink-300 focus:border-pink-500 focus:ring-pink-500 rounded-md shadow-sm focus:outline-none focus:ring-2 disabled:bg-gray-100 disabled:cursor-not-allowed bg-white"
									>
										<option value="">Select unit</option>
										<option value="days">Days</option>
										<option value="weeks">Weeks</option>
										<option value="months">Months</option>
										<option value="years">Years</option>
									</select>
								</div>
								{errors.ageValue && (
									<p className="mt-1 text-sm text-red-600">
										{errors.ageValue}
									</p>
								)}
							</div>
						</div>

						<Select
							label="Life Stage"
							value={lifeStage}
							onChange={(e) => {
								const newLifeStage = e.target.value as
									| LifeStage
									| "";
								setLifeStage(newLifeStage);
							}}
							options={lifeStageOptions}
							disabled={loading}
						/>

						<Combobox
							label="Primary Breed"
							value={primaryBreed}
							onChange={setPrimaryBreed}
							suggestions={
								isLoadingBreeds ? [] : breedSuggestions
							}
							placeholder="Enter primary breed (optional)"
							disabled={loading || isLoadingBreeds}
						/>

						<Combobox
							label="Physical Characteristics"
							value={physicalCharacteristics}
							onChange={setPhysicalCharacteristics}
							suggestions={
								isLoadingPhysicalCharacteristics
									? []
									: physicalCharacteristicsSuggestions
							}
							placeholder="Enter physical characteristics (optional)"
							disabled={
								loading || isLoadingPhysicalCharacteristics
							}
						/>

						<Toggle
							label="High Priority"
							checked={priority}
							onChange={setPriority}
							disabled={loading}
						/>

						<Textarea
							label="Medical Needs"
							value={medicalNeeds}
							onChange={(e) => setMedicalNeeds(e.target.value)}
							placeholder="Enter medical needs (optional)"
							rows={4}
							disabled={loading}
						/>

						<Textarea
							label="Behavioral Needs"
							value={behavioralNeeds}
							onChange={(e) => setBehavioralNeeds(e.target.value)}
							placeholder="Enter behavioral needs (optional)"
							rows={4}
							disabled={loading}
						/>

						<Textarea
							label="Additional Notes"
							value={additionalNotes}
							onChange={(e) => setAdditionalNotes(e.target.value)}
							placeholder="Enter any additional notes (optional)"
							rows={4}
							disabled={loading}
						/>

						<Textarea
							label="Adoption Bio"
							value={bio}
							onChange={(e) => setBio(e.target.value)}
							placeholder="Enter adoption bio (optional)"
							rows={4}
							disabled={loading}
						/>

						{Object.keys(errors).length > 0 && (
							<ErrorMessage>
								Please fix the errors above before submitting.
							</ErrorMessage>
						)}

						{submitError && (
							<ErrorMessage>{submitError}</ErrorMessage>
						)}

						{successMessage && (
							<div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm">
								{successMessage}
							</div>
						)}

						<div className="flex gap-4">
							<Button
								type="submit"
								disabled={loading || uploadingPhotos}
							>
								{uploadingPhotos
									? "Uploading photos..."
									: loading
									? "Creating..."
									: "Create Animal"}
							</Button>
						</div>
					</form>
				</div>
			</div>
		</div>
	);
}
