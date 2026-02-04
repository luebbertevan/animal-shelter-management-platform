import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useProtectedAuth } from "../../hooks/useProtectedAuth";
import type { AnimalGroup, Animal, FosterRequest } from "../../types";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import PhotoLightbox from "../../components/messaging/PhotoLightbox";
import AnimalCard from "../../components/animals/AnimalCard";
import FieldDisplay from "../../components/animals/FieldDisplay";
import FosterSelector from "../../components/fosters/FosterSelector";
import AssignmentConfirmationDialog from "../../components/animals/AssignmentConfirmationDialog";
import FosterRequestDialog from "../../components/fosters/FosterRequestDialog";
import CancelRequestDialog from "../../components/fosters/CancelRequestDialog";
import { fetchGroupById } from "../../lib/groupQueries";
import { fetchAnimalsByIds } from "../../lib/animalQueries";
import { assignGroupToFoster, unassignGroup } from "../../lib/assignmentUtils";
import UnassignmentDialog from "../../components/animals/UnassignmentDialog";
import type { AnimalStatus, FosterVisibility } from "../../types";
import {
	createGroupFosterRequest,
	cancelFosterRequest,
} from "../../lib/fosterRequestUtils";
import {
	fetchPendingRequestForGroup,
	fetchPendingRequestsForGroupWithDetails,
	type FosterRequestWithDetails,
} from "../../lib/fosterRequestQueries";
import {
	approveFosterRequest,
	denyFosterRequest,
} from "../../lib/fosterRequestUtils";
import RequestApprovalDialog from "../../components/fosters/RequestApprovalDialog";
import RequestDenialDialog from "../../components/fosters/RequestDenialDialog";
import { isOffline } from "../../lib/errorUtils";
import {
	formatDateForDisplay,
	hasMeaningfulUpdate,
	formatFosterVisibility,
} from "../../lib/metadataUtils";
import { getGroupFosterVisibility } from "../../lib/groupUtils";
import { fetchFosterById } from "../../lib/fosterQueries";
import { getThumbnailUrl } from "../../lib/photoUtils";

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

	// Foster request state
	const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
	const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);

	// Coordinator request management state
	const [selectedRequest, setSelectedRequest] =
		useState<FosterRequestWithDetails | null>(null);
	const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
	const [isDenialDialogOpen, setIsDenialDialogOpen] = useState(false);

	// Unassignment state
	const [isUnassignmentDialogOpen, setIsUnassignmentDialogOpen] = useState(false);
	const [unassignmentError, setUnassignmentError] = useState<string | null>(null);

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

	// Fetch pending request for this group (for fosters only)
	const { data: pendingRequest, refetch: refetchPendingRequest } = useQuery<
		FosterRequest | null,
		Error
	>({
		queryKey: [
			"pending-request-group",
			id,
			user.id,
			profile.organization_id,
		],
		queryFn: async () => {
			if (!id || isCoordinator) {
				return null;
			}
			return fetchPendingRequestForGroup(
				id,
				user.id,
				profile.organization_id
			);
		},
		enabled: !!id && !isCoordinator,
	});

	// Fetch all pending requests for this group (for coordinators)
	const {
		data: coordinatorPendingRequests = [],
		refetch: refetchCoordinatorPendingRequests,
	} = useQuery<FosterRequestWithDetails[], Error>({
		queryKey: [
			"coordinator-pending-requests-group",
			id,
			profile.organization_id,
		],
		queryFn: async () => {
			if (!id || !isCoordinator) {
				return [];
			}
			return fetchPendingRequestsForGroupWithDetails(
				id,
				profile.organization_id
			);
		},
		enabled: !!id && isCoordinator,
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
	const handleAssignmentConfirm = async (message: string, includeTag: boolean) => {
		if (!selectedFosterId || !id) {
			return;
		}

		setAssignmentError(null);

		try {
			await assignGroupToFoster(
				id,
				selectedFosterId,
				profile.organization_id,
				message,
				includeTag
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

	// Check if foster can request this group
	const canRequest =
		!isCoordinator &&
		groupFosterVisibility !== "not_visible" &&
		groupFosterVisibility !== "foster_pending" &&
		group?.current_foster_id !== user.id &&
		!pendingRequest;

	// Handle request confirmation
	const handleRequestConfirm = async (message: string) => {
		if (!id) return;

		await createGroupFosterRequest(
			id,
			user.id,
			profile.organization_id,
			message
		);

		// Invalidate queries
		await queryClient.invalidateQueries({
			queryKey: ["groups", user.id, profile.organization_id, id],
		});
		await queryClient.invalidateQueries({
			queryKey: ["group-animals", user.id, profile.organization_id],
		});
		await refetchPendingRequest();
		await queryClient.invalidateQueries({
			queryKey: ["fosters-needed-all-animals"],
		});
		await queryClient.invalidateQueries({
			queryKey: ["fosters-needed-groups"],
		});
	};

	// Handle cancel request
	const handleCancelRequest = async (message: string) => {
		if (!pendingRequest) return;

		await cancelFosterRequest(
			pendingRequest.id,
			profile.organization_id,
			message
		);

		// Invalidate queries
		await queryClient.invalidateQueries({
			queryKey: ["groups", user.id, profile.organization_id, id],
		});
		await queryClient.invalidateQueries({
			queryKey: ["group-animals", user.id, profile.organization_id],
		});
		await refetchPendingRequest();
		await queryClient.invalidateQueries({
			queryKey: ["fosters-needed-all-animals"],
		});
		await queryClient.invalidateQueries({
			queryKey: ["fosters-needed-groups"],
		});
	};

	// Handle approve request (coordinator)
	const handleApproveRequest = async (message: string) => {
		if (!selectedRequest) return;

		await approveFosterRequest(
			selectedRequest.id,
			profile.organization_id,
			user.id,
			message
		);

		// Invalidate queries
		await queryClient.invalidateQueries({
			queryKey: ["groups", user.id, profile.organization_id, id],
		});
		await queryClient.invalidateQueries({
			queryKey: ["group-animals", user.id, profile.organization_id],
		});
		await refetchCoordinatorPendingRequests();
		await queryClient.invalidateQueries({
			queryKey: ["fosters-needed-all-animals"],
		});
		await queryClient.invalidateQueries({
			queryKey: ["fosters-needed-groups"],
		});
		await queryClient.invalidateQueries({
			queryKey: ["org-pending-requests"],
		});
		await queryClient.invalidateQueries({
			queryKey: ["foster-requests"],
		});
	};

	// Handle deny request (coordinator)
	const handleDenyRequest = async (message: string) => {
		if (!selectedRequest) return;

		await denyFosterRequest(
			selectedRequest.id,
			profile.organization_id,
			user.id,
			message
		);

		// Invalidate queries
		await queryClient.invalidateQueries({
			queryKey: ["groups", user.id, profile.organization_id, id],
		});
		await queryClient.invalidateQueries({
			queryKey: ["group-animals", user.id, profile.organization_id],
		});
		await refetchCoordinatorPendingRequests();
		await queryClient.invalidateQueries({
			queryKey: ["fosters-needed-all-animals"],
		});
		await queryClient.invalidateQueries({
			queryKey: ["fosters-needed-groups"],
		});
		await queryClient.invalidateQueries({
			queryKey: ["org-pending-requests"],
		});
		await queryClient.invalidateQueries({
			queryKey: ["foster-requests"],
		});
	};

	// Handle unassignment (coordinator)
	const handleUnassign = async (
		newStatus: AnimalStatus,
		newVisibility: FosterVisibility,
		message: string,
		includeTag: boolean
	) => {
		if (!id || !group?.current_foster_id) return;

		setUnassignmentError(null);

		try {
			await unassignGroup(
				id,
				profile.organization_id,
				newStatus,
				newVisibility,
				message,
				includeTag
			);

			// Invalidate queries
			await queryClient.invalidateQueries({
				queryKey: ["groups", user.id, profile.organization_id, id],
			});
			await queryClient.invalidateQueries({
				queryKey: ["group-animals", user.id, profile.organization_id],
			});
			await queryClient.invalidateQueries({
				queryKey: ["foster", group.current_foster_id],
			});
			// Invalidate each animal's detail query
			if (group.animal_ids) {
				for (const animalId of group.animal_ids) {
					await queryClient.invalidateQueries({
						queryKey: ["animals", user.id, profile.organization_id, animalId],
					});
				}
			}
			await queryClient.invalidateQueries({
				queryKey: ["fosters-needed-all-animals"],
			});
			await queryClient.invalidateQueries({
				queryKey: ["fosters-needed-groups"],
			});
			await queryClient.invalidateQueries({
				queryKey: ["coordinator-pending-requests-group", id, profile.organization_id],
			});
			await queryClient.invalidateQueries({
				queryKey: ["org-pending-requests"],
			});
			await queryClient.invalidateQueries({
				queryKey: ["foster-requests"],
			});

			// Close dialog
			setIsUnassignmentDialogOpen(false);
		} catch (error) {
			setUnassignmentError(
				error instanceof Error
					? error.message
					: "Failed to unassign group. Please try again."
			);
		}
	};

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
					<div className="mb-6">
						<div className="flex items-center justify-between mb-2">
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
						{/* Badges under name */}
						<div className="flex items-center gap-2">
							{/* Priority Badge */}
							{group.priority && (
								<span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-pink-100 text-pink-800">
									High Priority
								</span>
							)}
							{/* Requested Badge - for foster who has pending request */}
							{!isCoordinator && pendingRequest && (
								<button
									type="button"
									onClick={() => setIsCancelDialogOpen(true)}
									className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 hover:bg-purple-200 transition-colors cursor-pointer"
								>
									Requested
								</button>
							)}
						</div>
					</div>

					{/* Coordinator placement + pending requests (always show for coordinators) */}
					{isCoordinator && (
							<div className="mb-6 space-y-3">
								{/* Current foster (only if assigned) */}
								{group.current_foster_id && (
									<div className="flex items-center justify-between">
										<div className="text-sm">
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
													className="text-pink-600 hover:text-pink-700 hover:underline font-medium"
												>
													{fosterName}
												</Link>
											) : (
												<span className="text-gray-400">
													Unknown
												</span>
											)}
										</div>
										{/* Unassign button */}
										<button
											type="button"
											onClick={() => setIsUnassignmentDialogOpen(true)}
											className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-50 transition-colors"
										>
											Unassign
										</button>
									</div>
								)}

								{/* Assign Foster Button (only if not assigned) */}
								{!group.current_foster_id && (
									<div className="space-y-2">
										<button
											type="button"
											onClick={() => {
												setIsFosterSelectorOpen(true);
												setAssignmentError(null);
											}}
											className="px-4 py-2 bg-pink-500 text-white rounded-md hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 text-sm font-medium transition-colors"
										>
											Assign Foster
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
								)}

								{coordinatorPendingRequests.length > 0 && (
									<div>
										<h3 className="text-sm font-medium text-gray-700 mb-2">
											Pending Requests (
											{coordinatorPendingRequests.length}
											)
										</h3>
										<ul className="space-y-2">
											{coordinatorPendingRequests.map(
												(request) => (
													<li
														key={request.id}
														className="flex items-center justify-between bg-white p-3 rounded border border-gray-200"
													>
														<div className="flex-1 min-w-0">
															<Link
																to={`/fosters/${request.foster_profile_id}`}
																className="text-pink-600 hover:text-pink-700 hover:underline font-medium"
															>
																{request.foster_name}
															</Link>
															<p className="text-xs text-gray-500 mt-0.5">
																Requested{" "}
																{formatDateForDisplay(
																	request.created_at
																)}
															</p>
														</div>
														<div className="flex gap-2 ml-3">
															<button
																type="button"
																onClick={() => {
																	setSelectedRequest(
																		request
																	);
																	setIsApprovalDialogOpen(
																		true
																	);
																}}
																className="px-3 py-1.5 bg-green-500 text-white rounded text-sm font-medium hover:bg-green-600 transition-colors"
															>
																Accept
															</button>
															<button
																type="button"
																onClick={() => {
																	setSelectedRequest(
																		request
																	);
																	setIsDenialDialogOpen(
																		true
																	);
																}}
																className="px-3 py-1.5 bg-red-500 text-white rounded text-sm font-medium hover:bg-red-600 transition-colors"
															>
																Deny
															</button>
														</div>
													</li>
												)
											)}
										</ul>
									</div>
								)}
							</div>
						)}

					{/* Foster Request Actions (foster only - moved to top) */}
					{!isCoordinator && (
						<div className="mb-6">
							{canRequest && (
								<button
									type="button"
									onClick={() => setIsRequestDialogOpen(true)}
									className="px-4 py-2 bg-pink-500 text-white rounded-md hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 text-sm font-medium transition-colors"
								>
									Request to Foster
								</button>
							)}
							{pendingRequest && (
								<div className="p-3 bg-purple-50 border border-purple-200 rounded-md">
									<p className="text-sm text-purple-800">
										You have a pending request for this group.{" "}
										<button
											type="button"
											onClick={() => setIsCancelDialogOpen(true)}
											className="font-medium underline hover:text-purple-900"
										>
											Cancel request
										</button>
									</p>
								</div>
							)}
							{group.current_foster_id === user.id && (
								<div className="p-3 bg-green-50 border border-green-200 rounded-md">
									<p className="text-sm text-green-800">
										This group is currently assigned to you.
									</p>
								</div>
							)}
						</div>
					)}

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
										src={getThumbnailUrl(url)}
										alt={`Group photo ${index + 1}`}
										loading="lazy"
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

			{/* Foster Request Dialog */}
			{group && (
				<FosterRequestDialog
					isOpen={isRequestDialogOpen}
					onClose={() => setIsRequestDialogOpen(false)}
					onConfirm={handleRequestConfirm}
					animalOrGroupName={group.name || "Unnamed Group"}
					isGroup={true}
					animalCount={animals.length}
				/>
			)}

			{/* Cancel Request Dialog */}
			{group && (
				<CancelRequestDialog
					isOpen={isCancelDialogOpen}
					onClose={() => setIsCancelDialogOpen(false)}
					onConfirm={handleCancelRequest}
					animalOrGroupName={group.name || "Unnamed Group"}
				/>
			)}

			{/* Request Approval Dialog (coordinator) */}
			{selectedRequest && group && (
				<RequestApprovalDialog
					isOpen={isApprovalDialogOpen}
					onClose={() => {
						setIsApprovalDialogOpen(false);
						setSelectedRequest(null);
					}}
					onConfirm={handleApproveRequest}
					fosterName={selectedRequest.foster_name}
					animalOrGroupName={group.name || "Unnamed Group"}
				/>
			)}

			{/* Request Denial Dialog (coordinator) */}
			{selectedRequest && group && (
				<RequestDenialDialog
					isOpen={isDenialDialogOpen}
					onClose={() => {
						setIsDenialDialogOpen(false);
						setSelectedRequest(null);
					}}
					onConfirm={handleDenyRequest}
					fosterName={selectedRequest.foster_name}
					animalOrGroupName={group.name || "Unnamed Group"}
				/>
			)}

			{/* Unassignment Dialog (coordinator) */}
			{group?.current_foster_id && fosterName && (
				<UnassignmentDialog
					isOpen={isUnassignmentDialogOpen}
					onClose={() => {
						setIsUnassignmentDialogOpen(false);
						setUnassignmentError(null);
					}}
					onConfirm={handleUnassign}
					fosterName={fosterName}
					animalOrGroupName={group.name || "Unnamed Group"}
					isGroup={true}
					animalCount={animals.length}
					hasPendingRequests={coordinatorPendingRequests.length > 0}
				/>
			)}

			{/* Unassignment Error Display */}
			{unassignmentError && (
				<div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50">
					<p className="text-sm">{unassignmentError}</p>
					<button
						type="button"
						onClick={() => setUnassignmentError(null)}
						className="absolute top-1 right-1 text-red-700 hover:text-red-900"
					>
						×
					</button>
				</div>
			)}
		</div>
	);
}
