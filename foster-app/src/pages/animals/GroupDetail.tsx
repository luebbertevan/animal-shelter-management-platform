import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useProtectedAuth } from "../../hooks/useProtectedAuth";
import type { AnimalGroup, Animal } from "../../types";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import PhotoLightbox from "../../components/messaging/PhotoLightbox";
import AnimalCard from "../../components/animals/AnimalCard";
import FieldDisplay from "../../components/animals/FieldDisplay";
import FosterSelector from "../../components/fosters/FosterSelector";
import AssignmentConfirmationDialog from "../../components/animals/AssignmentConfirmationDialog";
import { fetchGroupById } from "../../lib/groupQueries";
import { fetchAnimalsByIds } from "../../lib/animalQueries";
import { assignGroupToFoster } from "../../lib/assignmentUtils";
import { isOffline } from "../../lib/errorUtils";
import {
	formatDateForDisplay,
	hasMeaningfulUpdate,
	formatFosterVisibility,
} from "../../lib/metadataUtils";
import { getGroupFosterVisibility } from "../../lib/groupUtils";
import { fetchFosterById } from "../../lib/fosterQueries";

export default function GroupDetail() {
	const { id } = useParams<{ id: string }>();
	const { user, profile, isCoordinator } = useProtectedAuth();
	const queryClient = useQueryClient();
	const [lightboxOpen, setLightboxOpen] = useState(false);
	const [lightboxIndex, setLightboxIndex] = useState(0);
	const [isFosterSelectorOpen, setIsFosterSelectorOpen] = useState(false);
	const [isConfirmationDialogOpen, setIsConfirmationDialogOpen] =
		useState(false);
	const [selectedFosterId, setSelectedFosterId] = useState<string | null>(
		null
	);
	const [selectedFosterName, setSelectedFosterName] = useState<string | null>(
		null
	);
	const [assignmentError, setAssignmentError] = useState<string | null>(null);

	const {
		data: group,
		isLoading: isLoadingGroup,
		isError: isErrorGroup,
		error: groupError,
	} = useQuery<AnimalGroup, Error>({
		queryKey: ["groups", user.id, profile.organization_id, id],
		queryFn: async () => {
			if (!id) {
				throw new Error("Group ID is required");
			}
			return fetchGroupById(id, profile.organization_id);
		},
		enabled: !!id,
	});

	const {
		data: animals = [],
		isLoading: isLoadingAnimals,
		isError: isErrorAnimals,
	} = useQuery<Animal[], Error>({
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
					],
				}
			);
		},
		enabled: !!group && !!group.animal_ids,
	});

	// Fetch foster name if group has a current foster
	const { data: fosterName, isLoading: isLoadingFosterName } = useQuery<
		string | null,
		Error
	>({
		queryKey: ["foster", group?.current_foster_id],
		queryFn: async () => {
			if (!group?.current_foster_id) {
				return null;
			}
			try {
				const foster = await fetchFosterById(
					group.current_foster_id,
					profile.organization_id
				);
				return foster.full_name || foster.email || null;
			} catch (error) {
				console.error("Error fetching foster:", error);
				return null;
			}
		},
		enabled: !!group?.current_foster_id,
	});

	const photoUrls = group?.group_photos?.map((photo) => photo.url) || [];

	// Compute group foster_visibility (should be same for all animals)
	const { sharedValue: groupFosterVisibility, hasConflict } = useMemo(
		() => getGroupFosterVisibility(animals),
		[animals]
	);

	// Handle photo click
	const handlePhotoClick = (index: number) => {
		setLightboxIndex(index);
		setLightboxOpen(true);
	};

	// Handle foster selection
	const handleFosterSelect = (fosterId: string, fosterName: string) => {
		setSelectedFosterId(fosterId);
		setSelectedFosterName(fosterName);
		setIsFosterSelectorOpen(false);
		setIsConfirmationDialogOpen(true);
		setAssignmentError(null);
	};

	// Handle assignment confirmation
	const handleAssignmentConfirm = async (message: string) => {
		if (!selectedFosterId || !id) {
			return;
		}

		setAssignmentError(null);

		try {
			await assignGroupToFoster(
				id,
				selectedFosterId,
				profile.organization_id,
				message
			);

			// Invalidate queries to refresh data
			await queryClient.invalidateQueries({
				queryKey: ["groups", user.id, profile.organization_id, id],
			});
			await queryClient.invalidateQueries({
				queryKey: ["foster", selectedFosterId],
			});
			await queryClient.invalidateQueries({
				queryKey: ["group-animals", user.id, profile.organization_id],
			});

			// Close dialog and reset state
			setIsConfirmationDialogOpen(false);
			setSelectedFosterId(null);
			setSelectedFosterName(null);
		} catch (error) {
			setAssignmentError(
				error instanceof Error
					? error.message
					: "Failed to assign group. Please try again."
			);
		}
	};

	const isLoading = isLoadingGroup || isLoadingAnimals;
	const isError = isErrorGroup || isErrorAnimals;
	const error = groupError;

	if (isLoading) {
		return (
			<div className="min-h-screen p-4 bg-gray-50">
				<div className="max-w-4xl mx-auto">
					<div className="bg-white rounded-lg shadow-sm p-6">
						<LoadingSpinner message="Loading group details..." />
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
									: "Unable to load group details. Please try again."}
							</p>
						</div>
					</div>
				</div>
			</div>
		);
	}

	if (!group) {
		return (
			<div className="min-h-screen p-4 bg-gray-50">
				<div className="max-w-4xl mx-auto">
					<div className="bg-white rounded-lg shadow-sm p-6">
						{isOffline() ? (
							<div className="text-red-700">
								<p className="font-medium mb-4">
									Unable to load group details.
								</p>
								<p className="text-sm mb-4">
									Unable to connect to the server. Please
									check your internet connection and try
									again.
								</p>
							</div>
						) : (
							<>
								<p className="text-gray-600 mb-4">
									Group not found.
								</p>
							</>
						)}
					</div>
				</div>

				{/* Photo Lightbox */}
				{photoUrls.length > 0 && (
					<PhotoLightbox
						key={`${lightboxIndex}-${lightboxOpen}`}
						photos={photoUrls}
						initialIndex={lightboxIndex}
						isOpen={lightboxOpen}
						onClose={() => setLightboxOpen(false)}
					/>
				)}
			</div>
		);
	}

	return (
		<div className="min-h-screen p-4 bg-gray-50">
			<div className="max-w-4xl mx-auto">
				<div className="bg-white rounded-lg shadow-sm p-6">
					<div className="mb-6 flex items-center justify-between">
						<h1 className="text-2xl font-bold text-gray-900">
							{group.name?.trim() || "Unnamed Group"}
						</h1>
						{isCoordinator && (
							<Link
								to={`/groups/${id}/edit`}
								className="px-4 py-2 border-2 border-pink-500 text-pink-600 rounded-md hover:bg-pink-50 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 text-sm font-medium transition-colors"
							>
								Edit
							</Link>
						)}
					</div>

					{/* Photos */}
					{photoUrls.length > 0 && (
						<div className="mb-6">
							<label className="block text-sm font-medium text-gray-500 mb-2">
								Photos
							</label>
							<div className="flex flex-wrap gap-2">
								{photoUrls.map((url, index) => (
									<div
										key={index}
										className="relative group cursor-pointer"
										onClick={() => handlePhotoClick(index)}
									>
										<img
											src={url}
											alt={`Group photo ${index + 1}`}
											className="w-24 h-24 object-cover rounded border border-gray-300 hover:opacity-80 transition-opacity"
										/>
									</div>
								))}
							</div>
						</div>
					)}

					<div className="space-y-4 mb-6">
						{group.description && (
							<div>
								<label className="block text-sm font-medium text-gray-500 mb-1">
									Description
								</label>
								<p className="text-lg text-gray-900">
									{group.description}
								</p>
							</div>
						)}

						{group.priority && (
							<div>
								<label className="block text-sm font-medium text-gray-500 mb-1">
									Priority
								</label>
								<span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-pink-100 text-pink-800">
									High Priority
								</span>
							</div>
						)}

						{/* Visibility on Fosters Needed page */}
						<FieldDisplay
							label="Visibility on Fosters Needed page"
							value={
								groupFosterVisibility
									? formatFosterVisibility(
											groupFosterVisibility
									  )
									: null
							}
						/>
						{hasConflict && (
							<div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
								<p className="text-sm text-red-800 font-medium">
									⚠️ Warning: Animals in this group have
									different Visibility on Fosters Needed page
									values. This may indicate a data
									inconsistency.
								</p>
							</div>
						)}
					</div>

					{isLoadingAnimals && (
						<div className="mt-4">
							<LoadingSpinner message="Loading group members..." />
						</div>
					)}

					{isErrorAnimals && (
						<div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
							<p className="text-sm text-red-700">
								Failed to load group members. Please try
								refreshing the page.
							</p>
						</div>
					)}

					{!isLoadingAnimals &&
						!isErrorAnimals &&
						animals.length > 0 && (
							<div className="mt-6">
								<h2 className="text-lg font-semibold text-gray-900 mb-4">
									Animals in Group
								</h2>
								<div className="grid gap-1.5 grid-cols-1 min-[375px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
									{animals.map((animal) => (
										<AnimalCard
											key={animal.id}
											animal={{
												...animal,
												group_name: group.name,
											}}
											hideGroupIndicator={true}
										/>
									))}
								</div>
							</div>
						)}

					{!isLoadingAnimals &&
						!isErrorAnimals &&
						animals.length === 0 &&
						(group.animal_ids?.length || 0) === 0 && (
							<div className="mt-6">
								<p className="text-gray-600">
									No animals in this group yet.
								</p>
							</div>
						)}

					{/* Metadata Section (coordinators only) */}
					{isCoordinator && (
						<div className="pt-6 border-t border-gray-200 space-y-4 text-base">
							{/* Assignment Section */}
							<div className="space-y-2">
								{group.current_foster_id && (
									<div>
										<span className="text-gray-500">
											Current foster:{" "}
										</span>
										{isLoadingFosterName ? (
											<span className="text-gray-400">
												Loading...
											</span>
										) : fosterName ? (
											<Link
												to={`/fosters/${group.current_foster_id}`}
												className="text-pink-600 hover:text-pink-700 hover:underline"
											>
												{fosterName}
											</Link>
										) : (
											<span className="text-gray-400">
												Unknown
											</span>
										)}
									</div>
								)}

								{/* Assign Foster Button */}
								<button
									type="button"
									onClick={() => {
										setIsFosterSelectorOpen(true);
										setAssignmentError(null);
									}}
									className="px-4 py-2 bg-pink-500 text-white rounded-md hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 text-sm font-medium transition-colors"
								>
									{group.current_foster_id
										? "Reassign Foster"
										: "Assign Foster"}
								</button>

								{/* Assignment Error */}
								{assignmentError && (
									<div className="p-3 bg-red-50 border border-red-200 rounded-md">
										<p className="text-sm text-red-800">
											{assignmentError}
										</p>
									</div>
								)}
							</div>
							<div>
								<span className="text-gray-500">
									Created at:{" "}
								</span>
								<span className="text-gray-900">
									{formatDateForDisplay(group.created_at)}
								</span>
							</div>
							{hasMeaningfulUpdate(
								group.created_at,
								group.updated_at
							) && (
								<div>
									<span className="text-gray-500">
										Updated at:{" "}
									</span>
									<span className="text-gray-900">
										{formatDateForDisplay(
											group.updated_at!
										)}
									</span>
								</div>
							)}
						</div>
					)}
				</div>
			</div>

			{/* Photo Lightbox */}
			{photoUrls.length > 0 && (
				<PhotoLightbox
					key={`${lightboxIndex}-${lightboxOpen}`}
					photos={photoUrls}
					initialIndex={lightboxIndex}
					isOpen={lightboxOpen}
					onClose={() => setLightboxOpen(false)}
				/>
			)}

			{/* Foster Selector */}
			<FosterSelector
				isOpen={isFosterSelectorOpen}
				onClose={() => setIsFosterSelectorOpen(false)}
				onSelect={handleFosterSelect}
				excludeFosterIds={
					group?.current_foster_id ? [group.current_foster_id] : []
				}
			/>

			{/* Assignment Confirmation Dialog */}
			{selectedFosterId && selectedFosterName && group && (
				<AssignmentConfirmationDialog
					isOpen={isConfirmationDialogOpen}
					onClose={() => {
						setIsConfirmationDialogOpen(false);
						setSelectedFosterId(null);
						setSelectedFosterName(null);
						setAssignmentError(null);
					}}
					onConfirm={handleAssignmentConfirm}
					fosterName={selectedFosterName}
					animalOrGroupName={group.name || "Unnamed Group"}
					isGroup={true}
					animalCount={animals.length}
				/>
			)}
		</div>
	);
}
