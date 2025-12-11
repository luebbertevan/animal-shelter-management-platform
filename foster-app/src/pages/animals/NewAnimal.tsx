import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useProtectedAuth } from "../../hooks/useProtectedAuth";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Toggle from "../../components/ui/Toggle";
import Textarea from "../../components/ui/Textarea";
import Button from "../../components/ui/Button";
import ErrorMessage from "../../components/ui/ErrorMessage";
import NavLinkButton from "../../components/ui/NavLinkButton";
import { getErrorMessage, checkOfflineAndThrow } from "../../lib/errorUtils";
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
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [loading, setLoading] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

	const validateForm = (): boolean => {
		const newErrors: Record<string, string> = {};

		// Status always has a default value, so no validation needed
		// Add other validation rules here as needed

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
							label="Sex/SpayNeuter Status"
							value={sexSpayNeuterStatus}
							onChange={(e) =>
								setSexSpayNeuterStatus(
									e.target.value as SexSpayNeuterStatus | ""
								)
							}
							options={sexSpayNeuterOptions}
							disabled={loading}
						/>

						<Select
							label="Life Stage"
							value={lifeStage}
							onChange={(e) =>
								setLifeStage(e.target.value as LifeStage | "")
							}
							options={lifeStageOptions}
							disabled={loading}
						/>

						<Input
							label="Primary Breed"
							type="text"
							value={primaryBreed}
							onChange={(e) => setPrimaryBreed(e.target.value)}
							placeholder="Enter primary breed (optional)"
							disabled={loading}
						/>

						<Input
							label="Physical Characteristics"
							type="text"
							value={physicalCharacteristics}
							onChange={(e) =>
								setPhysicalCharacteristics(e.target.value)
							}
							placeholder="Enter physical characteristics (optional)"
							disabled={loading}
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
							<Button type="submit" disabled={loading}>
								{loading ? "Creating..." : "Create Animal"}
							</Button>
						</div>
					</form>
				</div>
			</div>
		</div>
	);
}
