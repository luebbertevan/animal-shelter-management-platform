import { useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useProtectedAuth } from "../hooks/useProtectedAuth";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import AnimalCard from "../components/animals/AnimalCard";
import GroupCard from "../components/animals/GroupCard";
import { fetchAssignedAnimals, fetchAnimals } from "../lib/animalQueries";
import { fetchAssignedGroups } from "../lib/groupQueries";
import {
	fetchMyPendingRequests,
	fetchOrgPendingRequests,
	type FosterRequestWithDetails,
} from "../lib/fosterRequestQueries";
import { formatDateForDisplay } from "../lib/metadataUtils";
import { Link } from "react-router-dom";
import { getThumbnailUrl } from "../lib/photoUtils";
import type {
	Animal,
	AnimalGroup,
	LifeStage,
	PhotoMetadata,
	FosterRequest,
} from "../types";

export default function Dashboard() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { user, profile, isCoordinator, isFoster } = useProtectedAuth();

	// Fetch assigned animals for Currently Fostering section
	const { data: assignedAnimals = [], isLoading: isLoadingAnimals } =
		useQuery({
			queryKey: ["assignedAnimals", user.id, profile.organization_id],
			queryFn: async () => {
				const animals = await fetchAssignedAnimals(
					user.id,
					profile.organization_id,
					{
						fields: [
							"id",
							"name",
							"status",
							"sex_spay_neuter_status",
							"priority",
							"group_id",
							"photos",
							"date_of_birth",
						],
					}
				);

				// Fetch group names for animals that are in groups
				const groupIds = [
					...new Set(
						animals
							.map((a) => a.group_id)
							.filter((id): id is string => !!id)
					),
				];

				const groupsMap = new Map<string, string>();
				if (groupIds.length > 0) {
					try {
						const { data: groups, error: groupsError } =
							await supabase
								.from("animal_groups")
								.select("id, name")
								.in("id", groupIds);

						if (groupsError) {
							console.error(
								"Error fetching groups:",
								groupsError
							);
						} else {
							if (groups) {
								groups.forEach((group) => {
									if (group.id && group.name) {
										groupsMap.set(group.id, group.name);
									}
								});
							}
						}
					} catch (error) {
						console.error("Error fetching groups:", error);
					}
				}

				// Map animals with their group names
				return animals.map((animal) => {
					if (animal.group_id) {
						const groupName = groupsMap.get(animal.group_id);
						return {
							...animal,
							group_name: groupName,
						};
					}
					return animal;
				});
			},
		});

	// Fetch assigned groups for Currently Fostering section
	const { data: assignedGroups = [], isLoading: isLoadingGroups } = useQuery({
		queryKey: ["assignedGroups", user.id, profile.organization_id],
		queryFn: () => {
			return fetchAssignedGroups(user.id, profile.organization_id, {
				fields: [
					"id",
					"name",
					"description",
					"animal_ids",
					"priority",
					"group_photos",
				],
			});
		},
	});

	// Fetch all animals to get photos and life_stage for GroupCard
	const { data: allAnimalsData = [] } = useQuery({
		queryKey: ["allAnimals", user.id, profile.organization_id],
		queryFn: () => {
			return fetchAnimals(profile.organization_id, {
				fields: ["id", "photos", "life_stage"],
			});
		},
	});

	// Create a map of animal data (photos + life_stage) for GroupCard
	const animalDataMap = useMemo(() => {
		const map = new Map<
			string,
			{ photos?: PhotoMetadata[]; life_stage?: LifeStage }
		>();
		allAnimalsData.forEach((animal) => {
			map.set(animal.id, {
				photos: animal.photos,
				life_stage: animal.life_stage,
			});
		});
		return map;
	}, [allAnimalsData]);

	// Fetch pending requests for this foster (fosters only)
	const {
		data: pendingRequests = [],
		isLoading: isLoadingPendingRequests,
	} = useQuery<FosterRequest[], Error>({
		queryKey: ["pending-requests", user.id, profile.organization_id],
		queryFn: () => fetchMyPendingRequests(user.id, profile.organization_id),
		enabled: isFoster,
	});

	// Fetch org-wide pending requests for coordinators
	const {
		data: orgPendingRequests = [],
		isLoading: isLoadingOrgPendingRequests,
	} = useQuery<FosterRequestWithDetails[], Error>({
		queryKey: ["org-pending-requests", user.id, profile.organization_id],
		queryFn: () =>
			fetchOrgPendingRequests(profile.organization_id, {
				limit: 5,
				sortDirection: "desc",
			}),
		enabled: isCoordinator,
	});

	// Derive pending animal and group IDs
	const pendingAnimalIds = useMemo(
		() =>
			pendingRequests
				.map((r) => r.animal_id)
				.filter((id): id is string => !!id),
		[pendingRequests]
	);

	const pendingGroupIds = useMemo(
		() =>
			pendingRequests
				.map((r) => r.group_id)
				.filter((id): id is string => !!id),
		[pendingRequests]
	);

	// Fetch animals for pending requests
	const { data: pendingAnimals = [] } = useQuery<Animal[], Error>({
		queryKey: [
			"pending-animals",
			user.id,
			profile.organization_id,
			pendingAnimalIds,
		],
		queryFn: async () => {
			if (pendingAnimalIds.length === 0) return [];
			const { data, error } = await supabase
				.from("animals")
				.select(
					"id, name, status, sex_spay_neuter_status, priority, group_id, photos, date_of_birth"
				)
				.in("id", pendingAnimalIds)
				.eq("organization_id", profile.organization_id);

			if (error) {
				throw error;
			}

			return (data as Animal[]) || [];
		},
		enabled: pendingAnimalIds.length > 0,
	});

	// Fetch groups for pending requests
	const { data: pendingGroups = [] } = useQuery<AnimalGroup[], Error>({
		queryKey: [
			"pending-groups",
			user.id,
			profile.organization_id,
			pendingGroupIds,
		],
		queryFn: async () => {
			if (pendingGroupIds.length === 0) return [];
			const { data, error } = await supabase
				.from("animal_groups")
				.select(
					"id, name, description, animal_ids, priority, group_photos"
				)
				.in("id", pendingGroupIds)
				.eq("organization_id", profile.organization_id);

			if (error) {
				throw error;
			}

			return (data as AnimalGroup[]) || [];
		},
		enabled: pendingGroupIds.length > 0,
	});

	const isLoadingFostering = isLoadingAnimals || isLoadingGroups;

	// Group prioritization logic: Create a Set of assigned group IDs for quick lookup
	const assignedGroupIds = useMemo(() => {
		return new Set(assignedGroups.map((group) => group.id));
	}, [assignedGroups]);

	// Filter animals: only show animals that are NOT in an assigned group
	// If an animal is in a group that's assigned to this user, show the group instead
	const filteredAnimals = useMemo(() => {
		return assignedAnimals.filter((animal: Animal) => {
			// If animal has no group_id, always show it
			if (!animal.group_id) {
				return true;
			}
			// If animal has a group_id, only show it if that group is NOT assigned to this user
			// (If the group IS assigned, we'll show the group instead of the individual animal)
			return !assignedGroupIds.has(animal.group_id);
		});
	}, [assignedAnimals, assignedGroupIds]);

	// Check if there are any items to display (after filtering)
	const hasAssignedItems =
		filteredAnimals.length > 0 || assignedGroups.length > 0;

	// Pending requests section visibility (fosters)
	const hasPendingItems =
		pendingAnimals.length > 0 || pendingGroups.length > 0;
	const showPendingSection =
		isFoster && (isLoadingPendingRequests || hasPendingItems);

	// Coordinator org pending requests section visibility
	const hasOrgPendingRequests = orgPendingRequests.length > 0;
	const showOrgPendingSection =
		isCoordinator && (isLoadingOrgPendingRequests || hasOrgPendingRequests);

	// Only show section if loading (we don't know yet if there are items) or if there are items
	// After loading completes, if there are no items, the section will not appear
	const showFosteringSection = isLoadingFostering || hasAssignedItems;

	const handleLogout = async () => {
		const { error } = await supabase.auth.signOut();

		if (error) {
			console.error("Error signing out:", error);
		}

		// Clear React Query cache to prevent showing previous user's data
		queryClient.clear();

		// Always redirect - local session is cleared regardless of network errors
		navigate("/login", { replace: true });
	};

	return (
		<div className="min-h-screen p-4 bg-gray-50">
			<div className="max-w-4xl mx-auto">
				{profile.organization_name && (
					<h1 className="text-3xl font-semibold text-pink-600 mb-4">
						{profile.organization_name}
					</h1>
				)}

				{/* Coordinator Pending Foster Requests Section */}
				{showOrgPendingSection && (
					<div className="mb-6 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
						<div className="flex items-center justify-between mb-4">
							<h2 className="text-lg font-semibold text-gray-900">
								Pending Foster Requests
							</h2>
							<Link
								to="/foster-requests"
								className="text-sm text-pink-600 hover:text-pink-700 hover:underline font-medium"
							>
								View All
							</Link>
						</div>
						{isLoadingOrgPendingRequests ? (
							<LoadingSpinner message="Loading pending requests..." />
						) : (
							<ul className="space-y-3">
								{orgPendingRequests.map((request) => {
									const entityName =
										request.animal?.name ||
										request.group?.name ||
										"Unnamed";
									const isGroup = !!request.group;
									const entityLink = isGroup
										? `/groups/${request.group?.id}`
										: `/animals/${request.animal?.id}`;
									const photo =
										request.animal?.photos?.[0]?.url ||
										request.group?.group_photos?.[0]?.url;

									return (
										<li
											key={request.id}
											className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 transition-colors"
										>
											{/* Photo */}
											<Link
												to={entityLink}
												className="flex-shrink-0"
											>
												{photo ? (
													<img
														src={getThumbnailUrl(photo)}
														alt={entityName}
														loading="lazy"
														className="w-12 h-12 rounded-md object-cover"
													/>
												) : (
													<div className="w-12 h-12 rounded-md bg-gray-200 flex items-center justify-center text-gray-400 text-xs">
														No photo
													</div>
												)}
											</Link>

											{/* Details */}
											<div className="flex-1 min-w-0">
												<Link
													to={entityLink}
													className="text-sm font-medium text-gray-900 hover:text-pink-600 truncate block"
												>
													{entityName}
												</Link>
												<div className="flex items-center gap-2 text-xs text-gray-500">
													<Link
														to={`/fosters/${request.foster_profile_id}`}
														className="text-pink-600 hover:text-pink-700 hover:underline"
													>
														{request.foster_name}
													</Link>
													<span>•</span>
													<span>
														{formatDateForDisplay(
															request.created_at
														)}
													</span>
												</div>
											</div>

											{/* View action */}
											<Link
												to={entityLink}
												className="flex-shrink-0 text-xs text-pink-600 hover:text-pink-700 font-medium"
											>
												View
											</Link>
										</li>
									);
								})}
							</ul>
						)}
					</div>
				)}

				{showPendingSection && (
					<div className="mb-4">
						<h2 className="text-lg font-semibold text-gray-900 mb-4">
							Pending Requests
						</h2>
						{isLoadingPendingRequests ? (
							<LoadingSpinner message="Loading pending requests..." />
						) : (
							<div className="grid gap-1.5 grid-cols-1 min-[375px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
								{pendingGroups.map((group) => (
									<GroupCard
										key={group.id}
										group={group}
										animalData={animalDataMap}
									/>
								))}
								{pendingAnimals.map((animal) => (
									<AnimalCard
										key={animal.id}
										animal={animal}
									/>
								))}
							</div>
						)}
					</div>
				)}

				{showFosteringSection && (
					<div className="mb-4">
						<h2 className="text-lg font-semibold text-gray-900 mb-4">
							Currently Fostering
						</h2>
						{isLoadingFostering ? (
							<LoadingSpinner message="Loading assigned animals and groups..." />
						) : (
							<div className="grid gap-1.5 grid-cols-1 min-[375px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
								{assignedGroups.map((group) => (
									<GroupCard
										key={group.id}
										group={group}
										animalData={animalDataMap}
									/>
								))}
								{filteredAnimals.map((animal) => (
									<AnimalCard
										key={animal.id}
										animal={animal}
									/>
								))}
							</div>
						)}
					</div>
				)}

				<div className="mt-8 pb-4 text-center">
					<p className="text-sm text-gray-600">
						Signed in as {user.email}{" "}
						<button
							onClick={handleLogout}
							className="text-pink-600 hover:text-pink-700 hover:underline font-medium"
						>
							Log out
						</button>
					</p>
				</div>
			</div>
		</div>
	);
}
