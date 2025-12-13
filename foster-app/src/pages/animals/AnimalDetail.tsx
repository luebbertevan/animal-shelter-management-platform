import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useProtectedAuth } from "../../hooks/useProtectedAuth";
import type { Animal, SexSpayNeuterStatus, LifeStage } from "../../types";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import NavLinkButton from "../../components/ui/NavLinkButton";
import Button from "../../components/ui/Button";
import FieldDisplay from "../../components/animals/FieldDisplay";
import PhotoLightbox from "../../components/messaging/PhotoLightbox";
import { fetchAnimalById } from "../../lib/animalQueries";
import { isOffline } from "../../lib/errorUtils";
import { calculateAgeFromDOB } from "../../lib/ageUtils";
import { supabase } from "../../lib/supabase";

// Helper function to format sex/spay-neuter status for display
function formatSexSpayNeuterStatus(status: SexSpayNeuterStatus): string {
	switch (status) {
		case "male":
			return "Male";
		case "female":
			return "Female";
		case "spayed_female":
			return "Spayed Female";
		case "neutered_male":
			return "Neutered Male";
		default:
			return status;
	}
}

// Helper function to format life stage for display
function formatLifeStage(lifeStage: LifeStage): string {
	switch (lifeStage) {
		case "kitten":
			return "Kitten";
		case "adult":
			return "Adult";
		case "senior":
			return "Senior";
		case "unknown":
			return "Unknown";
		default:
			return lifeStage;
	}
}

// Helper function to format status for display
function formatStatus(status: string): string {
	return status
		.split("_")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}

// Helper function to get status badge color
function getStatusBadgeColor(status: string): string {
	switch (status) {
		case "in_foster":
			return "bg-blue-100 text-blue-800";
		case "adopted":
			return "bg-green-100 text-green-800";
		case "medical_hold":
			return "bg-yellow-100 text-yellow-800";
		case "in_shelter":
			return "bg-gray-100 text-gray-800";
		case "transferring":
			return "bg-purple-100 text-purple-800";
		default:
			return "bg-gray-100 text-gray-800";
	}
}

// Helper function to format age for display
function formatAgeForDisplay(
	dateOfBirth: string | undefined | null
): string | null {
	// If DOB exists, calculate age from DOB
	if (dateOfBirth) {
		try {
			// Extract just the date part (YYYY-MM-DD) from ISO string if needed
			const dateOnly = dateOfBirth.split("T")[0];
			const age = calculateAgeFromDOB(dateOnly);
			if (!age) {
				return null;
			}
			const unitLabel =
				age.unit === "years"
					? "year"
					: age.unit === "months"
					? "month"
					: age.unit === "weeks"
					? "week"
					: "day";
			return `${age.value} ${unitLabel}${age.value !== 1 ? "s" : ""} old`;
		} catch {
			return null;
		}
	}

	return null;
}

export default function AnimalDetail() {
	const { id } = useParams<{ id: string }>();
	const { user, profile, isCoordinator } = useProtectedAuth();
	const [lightboxOpen, setLightboxOpen] = useState(false);
	const [lightboxIndex, setLightboxIndex] = useState(0);

	const {
		data: animal,
		isLoading,
		isError,
		error,
	} = useQuery<Animal, Error>({
		queryKey: ["animals", user.id, profile.organization_id, id],
		queryFn: async () => {
			if (!id) {
				throw new Error("Animal ID is required");
			}
			return fetchAnimalById(id, profile.organization_id);
		},
		enabled: !!id,
	});

	// Fetch group name if animal is in a group
	const { data: groupName } = useQuery<string | null, Error>({
		queryKey: ["group", animal?.group_id],
		queryFn: async () => {
			if (!animal?.group_id) {
				return null;
			}
			const { data } = await supabase
				.from("animal_groups")
				.select("name")
				.eq("id", animal.group_id)
				.single();

			if (!data) {
				return null;
			}
			return data.name || null;
		},
		enabled: !!animal?.group_id,
	});

	if (isLoading) {
		return (
			<div className="min-h-screen p-4 bg-gray-50">
				<div className="max-w-4xl mx-auto">
					<div className="bg-white rounded-lg shadow-sm p-6">
						<LoadingSpinner message="Loading animal details..." />
					</div>
				</div>
			</div>
		);
	}

	if (isError) {
		return (
			<div className="min-h-screen p-4 bg-gray-50">
				<div className="max-w-4xl mx-auto">
					<div className="bg-white rounded-lg shadow-sm p-6 border border-red-200">
						<div className="text-red-700">
							<p className="font-medium mb-4">
								{error instanceof Error
									? error.message
									: "Unable to load animal details. Please try again."}
							</p>
							<NavLinkButton
								to="/animals"
								label="Back to Animals"
							/>
						</div>
					</div>
				</div>
			</div>
		);
	}

	if (!animal) {
		return (
			<div className="min-h-screen p-4 bg-gray-50">
				<div className="max-w-4xl mx-auto">
					<div className="bg-white rounded-lg shadow-sm p-6">
						{isOffline() ? (
							<div className="text-red-700">
								<p className="font-medium mb-4">
									Unable to load animal details.
								</p>
								<p className="text-sm mb-4">
									Unable to connect to the server. Please
									check your internet connection and try
									again.
								</p>
								<NavLinkButton
									to="/animals"
									label="Back to Animals"
								/>
							</div>
						) : (
							<>
								<p className="text-gray-600 mb-4">
									Animal not found.
								</p>
								<NavLinkButton
									to="/animals"
									label="Back to Animals"
								/>
							</>
						)}
					</div>
				</div>
			</div>
		);
	}

	// Extract photo URLs for lightbox
	const photoUrls = animal.photos?.map((photo) => photo.url) || [];

	// Handle photo click
	const handlePhotoClick = (index: number) => {
		setLightboxIndex(index);
		setLightboxOpen(true);
	};

	// Calculate age for display
	// Note: age is calculated from DOB only (age_value and age_unit are not stored in Animal type)
	const ageDisplay = formatAgeForDisplay(animal.date_of_birth);

	return (
		<div className="min-h-screen p-4 bg-gray-50">
			<div className="max-w-4xl mx-auto">
				<div className="mb-6 space-y-4">
					<NavLinkButton to="/animals" label="Back to Animals" />
					{/* Edit Button */}
					{isCoordinator && (
						<Button
							variant="outline"
							onClick={() => {
								// Placeholder - will be functional in a later milestone
								alert("Edit functionality coming soon!");
							}}
						>
							Edit
						</Button>
					)}
				</div>

				<div className="bg-white rounded-lg shadow-sm p-6">
					{/* Header Section */}
					<div className="mb-6">
						<h1 className="text-2xl font-bold text-gray-900 mb-2">
							{animal.name?.trim() || "Unnamed Animal"}
						</h1>
						{/* Badges under name */}
						<div className="flex items-center gap-2 mb-2">
							{/* Status Badge */}
							{animal.status && (
								<span
									className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ${getStatusBadgeColor(
										animal.status
									)}`}
								>
									{formatStatus(animal.status)}
								</span>
							)}
							{/* Priority Badge */}
							{animal.priority && (
								<span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-pink-100 text-pink-800">
									High Priority
								</span>
							)}
							{/* Foster Requested Badge */}
							{animal.display_placement_request && (
								<span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
									Foster Requested
								</span>
							)}
						</div>
						{/* Group Indicator */}
						{animal.group_id && (
							<div className="mb-2">
								<Link
									to={`/groups/${animal.group_id}`}
									className="text-sm text-pink-600 hover:text-pink-700 hover:underline"
								>
									In group: {groupName || "View group"}
								</Link>
							</div>
						)}
					</div>

					<div className="space-y-6">
						{/* Date of Birth and Age (next to each other) */}
						<div className="grid grid-cols-1 min-[375px]:grid-cols-2 gap-4">
							<FieldDisplay
								label="Date of Birth"
								value={
									animal.date_of_birth
										? new Date(
												animal.date_of_birth
										  ).toLocaleDateString()
										: null
								}
							/>
							<div>
								<label className="block text-sm font-medium text-gray-500 mb-1">
									Age
								</label>
								{ageDisplay ? (
									<p className="text-lg font-medium text-gray-900">
										{ageDisplay}
									</p>
								) : (
									<p className="text-lg font-medium text-gray-400 italic">
										Not provided
									</p>
								)}
							</div>
						</div>

						{/* Sex and Life Stage (next to each other) */}
						<div className="grid grid-cols-1 min-[375px]:grid-cols-2 gap-4">
							<FieldDisplay
								label="Sex"
								value={
									animal.sex_spay_neuter_status
										? formatSexSpayNeuterStatus(
												animal.sex_spay_neuter_status
										  )
										: null
								}
							/>
							<FieldDisplay
								label="Life Stage"
								value={
									animal.life_stage
										? formatLifeStage(animal.life_stage)
										: null
								}
							/>
						</div>

						{/* Photos */}
						<div>
							<label className="block text-sm font-medium text-gray-500 mb-2">
								Photos
							</label>
							{photoUrls.length > 0 ? (
								<div className="flex flex-wrap gap-2">
									{photoUrls.map((url, index) => (
										<div
											key={index}
											className="relative group"
										>
											<img
												src={url}
												alt={`Photo ${index + 1}`}
												className="w-20 h-20 object-cover rounded border border-gray-300 cursor-pointer hover:opacity-90 transition-opacity"
												onClick={() =>
													handlePhotoClick(index)
												}
											/>
										</div>
									))}
								</div>
							) : (
								<p className="text-lg font-medium text-gray-400 italic">
									Not provided
								</p>
							)}
						</div>

						{/* Primary Breed */}
						<FieldDisplay
							label="Primary Breed"
							value={animal.primary_breed || null}
						/>

						{/* Physical Characteristics */}
						<FieldDisplay
							label="Physical Characteristics"
							value={animal.physical_characteristics || null}
						/>

						{/* Medical Needs */}
						<FieldDisplay
							label="Medical Needs"
							value={animal.medical_needs || null}
						/>

						{/* Behavioral Needs */}
						<FieldDisplay
							label="Behavioral Needs"
							value={animal.behavioral_needs || null}
						/>

						{/* Additional Notes */}
						<FieldDisplay
							label="Additional Notes"
							value={animal.additional_notes || null}
						/>

						{/* Adoption Bio */}
						<FieldDisplay
							label="Adoption Bio"
							value={animal.bio || null}
						/>

						{/* Metadata Section (coordinators only) */}
						{isCoordinator && (
							<div className="pt-6 border-t border-gray-200 space-y-2">
								<div className="space-y-2 text-sm">
									<div>
										<span className="text-gray-500">
											Created at:{" "}
										</span>
										<span className="text-gray-900">
											{new Date(
												animal.created_at
											).toLocaleString(undefined, {
												year: "numeric",
												month: "numeric",
												day: "numeric",
												hour: "2-digit",
												minute: "2-digit",
											})}
										</span>
									</div>
									{animal.updated_at !==
										animal.created_at && (
										<div>
											<span className="text-gray-500">
												Updated at:{" "}
											</span>
											<span className="text-gray-900">
												{new Date(
													animal.updated_at
												).toLocaleString(undefined, {
													year: "numeric",
													month: "numeric",
													day: "numeric",
													hour: "2-digit",
													minute: "2-digit",
												})}
											</span>
										</div>
									)}
									{animal.current_foster_id && (
										<div>
											<span className="text-gray-500">
												Current foster:{" "}
											</span>
											<span className="text-gray-900">
												{animal.current_foster_id}
											</span>
										</div>
									)}
								</div>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Photo Lightbox */}
			{photoUrls.length > 0 && (
				<PhotoLightbox
					photos={photoUrls}
					initialIndex={lightboxIndex}
					isOpen={lightboxOpen}
					onClose={() => setLightboxOpen(false)}
				/>
			)}
		</div>
	);
}
