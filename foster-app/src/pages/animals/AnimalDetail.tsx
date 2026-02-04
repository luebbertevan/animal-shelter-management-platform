import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useProtectedAuth } from "../../hooks/useProtectedAuth";
import type {
	Animal,
	SexSpayNeuterStatus,
	LifeStage,
	FosterRequest,
} from "../../types";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import FieldDisplay from "../../components/animals/FieldDisplay";
import PhotoLightbox from "../../components/messaging/PhotoLightbox";
import FosterSelector from "../../components/fosters/FosterSelector";
import AssignmentConfirmationDialog from "../../components/animals/AssignmentConfirmationDialog";
import FosterRequestDialog from "../../components/fosters/FosterRequestDialog";
import CancelRequestDialog from "../../components/fosters/CancelRequestDialog";
import { fetchAnimalById } from "../../lib/animalQueries";
import { fetchFosterById } from "../../lib/fosterQueries";
import { assignAnimalToFoster, unassignAnimal, unassignGroup } from "../../lib/assignmentUtils";
import UnassignmentDialog from "../../components/animals/UnassignmentDialog";
import type { AnimalStatus, FosterVisibility } from "../../types";
import {
	createAnimalFosterRequest,
	cancelFosterRequest,
	checkAnimalInGroup,
} from "../../lib/fosterRequestUtils";
import {
	fetchPendingRequestForAnimal,
	fetchPendingRequestsForAnimalWithDetails,
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
import { calculateAgeFromDOB } from "../../lib/ageUtils";
import { supabase } from "../../lib/supabase";
import { getThumbnailUrl } from "../../lib/photoUtils";
import {
	formatDateForDisplay,
	hasMeaningfulUpdate,
} from "../../lib/metadataUtils";

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

import { formatFosterVisibility } from "../../lib/metadataUtils";

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
	const [groupConfirmation, setGroupConfirmation] = useState<{
		groupId: string;
		groupName: string;
	} | null>(null);

	// Coordinator request management state
	const [selectedRequest, setSelectedRequest] =
		useState<FosterRequestWithDetails | null>(null);
	const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
	const [isDenialDialogOpen, setIsDenialDialogOpen] = useState(false);

	// Unassignment state
	const [isUnassignmentDialogOpen, setIsUnassignmentDialogOpen] = useState(false);
	const [unassignmentError, setUnassignmentError] = useState<string | null>(null);

	// Group assignment dialog state
	const [isGroupAssignmentDialogOpen, setIsGroupAssignmentDialogOpen] = useState(false);

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
		queryKey: ["group-name", animal?.group_id],
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

	// Fetch foster name if animal has a current foster
	const { data: fosterName, isLoading: isLoadingFosterName } = useQuery<
		string | null,
		Error
	>({
		queryKey: ["foster", animal?.current_foster_id],
		queryFn: async () => {
			if (!animal?.current_foster_id) {
				return null;
			}
			try {
				const foster = await fetchFosterById(
					animal.current_foster_id,
					profile.organization_id
				);
				return foster.full_name || foster.email || null;
			} catch (error) {
				console.error("Error fetching foster:", error);
				return null;
			}
		},
		enabled: !!animal?.current_foster_id,
	});

	// Fetch pending request for this animal (for fosters only)
	const { data: pendingRequest, refetch: refetchPendingRequest } = useQuery<
		FosterRequest | null,
		Error
	>({
		queryKey: [
			"pending-request-animal",
			id,
			user.id,
			profile.organization_id,
		],
		queryFn: async () => {
			if (!id || isCoordinator) {
				return null;
			}
			return fetchPendingRequestForAnimal(
				id,
				user.id,
				profile.organization_id
			);
		},
		enabled: !!id && !isCoordinator,
	});

	// Fetch all pending requests for this animal (for coordinators)
	const {
		data: coordinatorPendingRequests = [],
		refetch: refetchCoordinatorPendingRequests,
	} = useQuery<FosterRequestWithDetails[], Error>({
		queryKey: [
			"coordinator-pending-requests-animal",
			id,
			profile.organization_id,
		],
		queryFn: async () => {
			if (!id || !isCoordinator) {
				return [];
			}
			// If animal is in a group, fetch group requests instead
			if (animal?.group_id) {
				return fetchPendingRequestsForGroupWithDetails(
					animal.group_id,
					profile.organization_id
				);
			}
			return fetchPendingRequestsForAnimalWithDetails(
				id,
				profile.organization_id
			);
		},
		enabled: !!id && isCoordinator && !!animal,
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
							</div>
						) : (
							<>
								<p className="text-gray-600 mb-4">
									Animal not found.
								</p>
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
			await assignAnimalToFoster(
				id,
				selectedFosterId,
				profile.organization_id,
				message,
				includeTag
			);

			// Invalidate queries to refresh data
			await queryClient.invalidateQueries({
				queryKey: ["animals", user.id, profile.organization_id, id],
			});
			await queryClient.invalidateQueries({
				queryKey: ["foster", selectedFosterId],
			});

			// Close dialog and reset state
			setIsConfirmationDialogOpen(false);
			setSelectedFosterId(null);
			setSelectedFosterName(null);
		} catch (error) {
			setAssignmentError(
				error instanceof Error
					? error.message
					: "Failed to assign animal. Please try again."
			);
		}
	};


	// Check if foster can request this animal
	const canRequest =
		!isCoordinator &&
		animal.foster_visibility !== "not_visible" &&
		animal.foster_visibility !== "foster_pending" &&
		animal.current_foster_id !== user.id &&
		!pendingRequest;

	// Handle request button click
	const handleRequestClick = async () => {
		if (!id) return;

		// Check if animal is in a group
		const groupInfo = await checkAnimalInGroup(id, profile.organization_id);

		if (groupInfo.inGroup && groupInfo.groupId) {
			// Show confirmation dialog about requesting the entire group
			setGroupConfirmation({
				groupId: groupInfo.groupId,
				groupName: groupInfo.groupName || "Unnamed Group",
			});
		}

		setIsRequestDialogOpen(true);
	};

	// Handle request confirmation
	const handleRequestConfirm = async (message: string) => {
		if (!id) return;

		await createAnimalFosterRequest(
			id,
			user.id,
			profile.organization_id,
			message
		);

		// Invalidate queries
		await queryClient.invalidateQueries({
			queryKey: ["animals", user.id, profile.organization_id, id],
		});
		await refetchPendingRequest();
		await queryClient.invalidateQueries({
			queryKey: ["fosters-needed-all-animals"],
		});
		await queryClient.invalidateQueries({
			queryKey: ["fosters-needed-groups"],
		});

		setGroupConfirmation(null);
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
			queryKey: ["animals", user.id, profile.organization_id, id],
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
			queryKey: ["animals", user.id, profile.organization_id, id],
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
			queryKey: ["animals", user.id, profile.organization_id, id],
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
		if (!id || !animal?.current_foster_id) return;

		setUnassignmentError(null);

		try {
			// If animal is in a group, unassign the entire group
			if (animal.group_id) {
				await unassignGroup(
					animal.group_id,
					profile.organization_id,
					newStatus,
					newVisibility,
					message,
					includeTag
				);
			} else {
				await unassignAnimal(
					id,
					profile.organization_id,
					newStatus,
					newVisibility,
					message,
					includeTag
				);
			}

			// Invalidate queries
			await queryClient.invalidateQueries({
				queryKey: ["animals", user.id, profile.organization_id, id],
			});
			await queryClient.invalidateQueries({
				queryKey: ["foster", animal.current_foster_id],
			});
			await queryClient.invalidateQueries({
				queryKey: ["fosters-needed-all-animals"],
			});
			await queryClient.invalidateQueries({
				queryKey: ["fosters-needed-groups"],
			});
			await queryClient.invalidateQueries({
				queryKey: ["coordinator-pending-requests-animal", id, profile.organization_id],
			});
			await queryClient.invalidateQueries({
				queryKey: ["org-pending-requests"],
			});
			await queryClient.invalidateQueries({
				queryKey: ["foster-requests"],
			});
			// If in a group, also invalidate group queries
			if (animal.group_id) {
				await queryClient.invalidateQueries({
					queryKey: ["groups", user.id, profile.organization_id, animal.group_id],
				});
				await queryClient.invalidateQueries({
					queryKey: ["group-animals", user.id, profile.organization_id],
				});
			}

			// Close dialog
			setIsUnassignmentDialogOpen(false);
		} catch (error) {
			setUnassignmentError(
				error instanceof Error
					? error.message
					: "Failed to unassign. Please try again."
			);
		}
	};

	return (
		<div className="min-h-screen p-4 bg-gray-50">
			<div className="max-w-4xl mx-auto">
				<div className="bg-white rounded-lg shadow-sm p-6">
					{/* Header Section */}
					<div className="mb-6">
						<div className="flex items-center justify-between mb-2">
							<h1 className="text-2xl font-bold text-gray-900">
								{animal.name?.trim() || "Unnamed Animal"}
							</h1>
							{isCoordinator && (
								<Link
									to={`/animals/${id}/edit`}
									className="px-4 py-2 border-2 border-pink-500 text-pink-600 rounded-md hover:bg-pink-50 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 text-sm font-medium transition-colors"
								>
									Edit
								</Link>
							)}
						</div>
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
						{/* Group Indicator */}
					</div>

					{/* Coordinator placement + pending requests (always show for coordinators) */}
					{isCoordinator && (
							<div className="mb-6 space-y-3">
								{/* Current group (only if animal is in a group) */}
								{animal.group_id && (
									<div className="flex items-center justify-between">
										<div className="text-sm">
											<span className="text-gray-500">
												Current group:{" "}
											</span>
											<Link
												to={`/groups/${animal.group_id}`}
												className="text-pink-600 hover:text-pink-700 hover:underline font-medium"
											>
												{groupName || "View group"}
											</Link>
										</div>
									</div>
								)}

								{/* Current foster (only if assigned) */}
								{animal.current_foster_id && (
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
													to={`/fosters/${animal.current_foster_id}`}
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
										{/* Unassign button - always show, clickable but shows alert if in a group */}
										<button
											type="button"
											onClick={() => {
												if (animal.group_id) {
													alert(
														"This animal is part of a group. Please manage assignments from the group detail page."
													);
													return;
												}
												setIsUnassignmentDialogOpen(true);
											}}
											className={`px-3 py-1.5 border border-gray-300 text-gray-700 rounded text-sm font-medium transition-colors ${
												animal.group_id
													? "opacity-50 cursor-not-allowed"
													: "hover:bg-gray-50"
											}`}
										>
											Unassign
										</button>
									</div>
								)}

								{/* Assign Foster Button - always show when not assigned, disabled if in a group */}
								{!animal.current_foster_id && (
									<div className="space-y-2">
										<button
											type="button"
											onClick={() => {
												if (animal.group_id) {
													setIsGroupAssignmentDialogOpen(true);
													return;
												}
												setIsFosterSelectorOpen(true);
												setAssignmentError(null);
											}}
											className={`px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 text-sm font-medium transition-colors ${
												animal.group_id
													? "bg-gray-300 text-gray-500 cursor-not-allowed"
													: "bg-pink-500 text-white hover:bg-pink-600"
											}`}
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

								{/* Pending requests list (only if there are requests) */}
								{coordinatorPendingRequests.length > 0 && (
									<div>
										{animal.group_id && (
											<p className="text-sm text-gray-600 mb-2">
												Requests for this animal are
												managed at the group level.{" "}
												<Link
													to={`/groups/${animal.group_id}`}
													className="text-pink-600 hover:text-pink-700 hover:underline font-medium"
												>
													View group
												</Link>
											</p>
										)}
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
									onClick={handleRequestClick}
									className="px-4 py-2 bg-pink-500 text-white rounded-md hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 text-sm font-medium transition-colors"
								>
									Request to Foster
								</button>
							)}
							{pendingRequest && (
								<div className="p-3 bg-purple-50 border border-purple-200 rounded-md">
									<p className="text-sm text-purple-800">
										You have a pending request for this animal.{" "}
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
							{animal.current_foster_id === user.id && (
								<div className="p-3 bg-green-50 border border-green-200 rounded-md">
									<p className="text-sm text-green-800">
										This animal is currently assigned to you.
									</p>
								</div>
							)}
						</div>
					)}

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

						{/* Visibility on Fosters Needed page */}
						<FieldDisplay
							label="Visibility on Fosters Needed page"
							value={
								animal.foster_visibility
									? formatFosterVisibility(
											animal.foster_visibility
									  )
									: null
							}
						/>

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
												src={getThumbnailUrl(url)}
												alt={`Photo ${index + 1}`}
												loading="lazy"
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
							<div className="pt-6 border-t border-gray-200 space-y-4 text-base">
								<div>
									<span className="text-gray-500">
										Created at:{" "}
									</span>
									<span className="text-gray-900">
										{formatDateForDisplay(
											animal.created_at
										)}
									</span>
								</div>
								{hasMeaningfulUpdate(
									animal.created_at,
									animal.updated_at
								) && (
									<div>
										<span className="text-gray-500">
											Updated at:{" "}
										</span>
										<span className="text-gray-900">
											{formatDateForDisplay(
												animal.updated_at!
											)}
										</span>
									</div>
								)}
							</div>
						)}
					</div>
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
					animal.current_foster_id
						? [animal.current_foster_id]
						: []
				}
			/>

			{/* Assignment Confirmation Dialog */}
			{selectedFosterId && selectedFosterName && (
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
					animalOrGroupName={animal.name || "Unnamed Animal"}
					isGroup={false}
				/>
			)}

			{/* Foster Request Dialog */}
			<FosterRequestDialog
				isOpen={isRequestDialogOpen}
				onClose={() => {
					setIsRequestDialogOpen(false);
					setGroupConfirmation(null);
				}}
				onConfirm={handleRequestConfirm}
				animalOrGroupName={
					groupConfirmation?.groupName ||
					animal.name ||
					"Unnamed Animal"
				}
				isGroup={!!groupConfirmation}
				groupConfirmation={groupConfirmation || undefined}
			/>

			{/* Cancel Request Dialog */}
			<CancelRequestDialog
				isOpen={isCancelDialogOpen}
				onClose={() => setIsCancelDialogOpen(false)}
				onConfirm={handleCancelRequest}
				animalOrGroupName={animal.name || "Unnamed Animal"}
			/>

			{/* Request Approval Dialog (coordinator) */}
			{selectedRequest && (
				<RequestApprovalDialog
					isOpen={isApprovalDialogOpen}
					onClose={() => {
						setIsApprovalDialogOpen(false);
						setSelectedRequest(null);
					}}
					onConfirm={handleApproveRequest}
					fosterName={selectedRequest.foster_name}
					animalOrGroupName={animal.name || "Unnamed Animal"}
				/>
			)}

			{/* Request Denial Dialog (coordinator) */}
			{selectedRequest && (
				<RequestDenialDialog
					isOpen={isDenialDialogOpen}
					onClose={() => {
						setIsDenialDialogOpen(false);
						setSelectedRequest(null);
					}}
					onConfirm={handleDenyRequest}
					fosterName={selectedRequest.foster_name}
					animalOrGroupName={animal.name || "Unnamed Animal"}
				/>
			)}

			{/* Group Assignment Dialog */}
			{isGroupAssignmentDialogOpen && animal.group_id && (
				<>
					{/* Backdrop */}
					<div
						className="fixed inset-0 z-40"
						style={{
							backgroundColor: "rgba(0, 0, 0, 0.65)",
							backdropFilter: "blur(4px)",
							WebkitBackdropFilter: "blur(4px)",
						}}
						onClick={() => setIsGroupAssignmentDialogOpen(false)}
					/>

					{/* Dialog */}
					<div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
						<div
							className="bg-white rounded-lg shadow-xl w-full max-w-md pointer-events-auto"
							onClick={(e) => e.stopPropagation()}
						>
							{/* Header */}
							<div className="p-6 border-b border-gray-200">
								<h3 className="text-lg font-semibold text-gray-900">
									Animal is in a Group
								</h3>
							</div>

							{/* Content */}
							<div className="p-6">
								<p className="text-sm text-gray-700 mb-6">
									This animal is part of a group. Please manage
									assignments from the group detail page.
								</p>

								{/* Footer */}
								<div className="flex justify-end gap-3">
									<button
										type="button"
										onClick={() =>
											setIsGroupAssignmentDialogOpen(false)
										}
										className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 text-sm font-medium transition-colors"
									>
										Cancel
									</button>
									<Link
										to={`/groups/${animal.group_id}`}
										onClick={() =>
											setIsGroupAssignmentDialogOpen(false)
										}
										className="px-4 py-2 bg-pink-500 text-white rounded-md hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 text-sm font-medium transition-colors"
									>
										Go to Group Page
									</Link>
								</div>
							</div>
						</div>
					</div>
				</>
			)}

			{/* Unassignment Dialog (coordinator) */}
			{animal.current_foster_id && fosterName && (
				<UnassignmentDialog
					isOpen={isUnassignmentDialogOpen}
					onClose={() => {
						setIsUnassignmentDialogOpen(false);
						setUnassignmentError(null);
					}}
					onConfirm={handleUnassign}
					fosterName={fosterName}
					animalOrGroupName={animal.name || "Unnamed Animal"}
					isGroup={false}
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
