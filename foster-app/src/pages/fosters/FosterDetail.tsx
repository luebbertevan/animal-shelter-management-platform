import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChatBubbleLeftIcon } from "@heroicons/react/24/outline";
import { supabase } from "../../lib/supabase";
import { useProtectedAuth } from "../../hooks/useProtectedAuth";
import type {
	Animal,
	AnimalGroup,
	LifeStage,
	PhotoMetadata,
} from "../../types";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import AnimalCard from "../../components/animals/AnimalCard";
import GroupCard from "../../components/animals/GroupCard";
import { fetchFosterById } from "../../lib/fosterQueries";
import { fetchAnimalsByFosterId, fetchAnimals } from "../../lib/animalQueries";
import { fetchGroupsByFosterId } from "../../lib/groupQueries";
import { isOffline, getErrorMessage } from "../../lib/errorUtils";

async function fetchFosterConversation(userId: string, organizationId: string) {
	const { data, error } = await supabase
		.from("conversations")
		.select("id")
		.eq("type", "foster_chat")
		.eq("foster_profile_id", userId)
		.eq("organization_id", organizationId)
		.single();

	if (error) {
		if (error.code === "PGRST116") {
			return null;
		}
		throw new Error(
			getErrorMessage(
				error,
				"Failed to load conversation. Please try again."
			)
		);
	}

	return data?.id || null;
}

async function fetchCoordinatorGroupChat(organizationId: string) {
	const { data, error } = await supabase
		.from("conversations")
		.select("id")
		.eq("type", "coordinator_group")
		.eq("organization_id", organizationId)
		.single();

	if (error) {
		if (error.code === "PGRST116") {
			return null;
		}
		throw new Error(
			getErrorMessage(
				error,
				"Failed to load conversation. Please try again."
			)
		);
	}

	return data?.id || null;
}

export default function FosterDetail() {
	const { id } = useParams<{ id: string }>();
	const { user, profile, isCoordinator } = useProtectedAuth();

	const {
		data: foster,
		isLoading: isLoadingFoster,
		isError: isErrorFoster,
		error: fosterError,
	} = useQuery({
		queryKey: ["fosters", user.id, profile.organization_id, id],
		queryFn: async () => {
			if (!id) {
				throw new Error("Foster ID is required");
			}
			return fetchFosterById(id, profile.organization_id);
		},
		enabled: !!id && isCoordinator,
	});

	// Fetch assigned animals with fields needed for AnimalCard
	const { data: assignedAnimals = [], isLoading: isLoadingAnimals } =
		useQuery<Animal[], Error>({
			queryKey: [
				"foster-animals",
				user.id,
				profile.organization_id,
				foster?.id,
			],
			queryFn: async () => {
				if (!foster?.id) {
					return [];
				}
				const animals = await fetchAnimalsByFosterId(
					foster.id,
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
								groups.forEach(
									(group: { id: string; name: string }) => {
										if (group.id && group.name) {
											groupsMap.set(group.id, group.name);
										}
									}
								);
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
			enabled: !!foster,
		});

	// Fetch assigned groups
	const { data: assignedGroups = [], isLoading: isLoadingGroups } = useQuery<
		AnimalGroup[],
		Error
	>({
		queryKey: [
			"foster-groups",
			user.id,
			profile.organization_id,
			foster?.id,
		],
		queryFn: async () => {
			if (!foster?.id) {
				return [];
			}

			return fetchGroupsByFosterId(foster.id, profile.organization_id, {
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
		enabled: !!foster,
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

	const isLoading = isLoadingFoster || isLoadingAnimals || isLoadingGroups;
	const isError = isErrorFoster;
	const error = fosterError;

	// Group prioritization logic: Create a Set of assigned group IDs for quick lookup
	const assignedGroupIds = useMemo(() => {
		return new Set(assignedGroups.map((group) => group.id));
	}, [assignedGroups]);

	// Filter animals: only show animals that are NOT in an assigned group
	// If an animal is in a group that's assigned to this foster, show the group instead
	const filteredAnimals = useMemo(() => {
		return assignedAnimals.filter((animal: Animal) => {
			// If animal has no group_id, always show it
			if (!animal.group_id) {
				return true;
			}
			// If animal has a group_id, only show it if that group is NOT assigned to this foster
			return !assignedGroupIds.has(animal.group_id);
		});
	}, [assignedAnimals, assignedGroupIds]);

	// Check if there are any items to display (after filtering)
	const hasAssignedItems =
		filteredAnimals.length > 0 || assignedGroups.length > 0;

	// Fetch conversation ID for the foster/coordinator
	const { data: conversationId } = useQuery<string | null>({
		queryKey: [
			foster?.role === "coordinator"
				? "coordinatorGroupChat"
				: "fosterConversation",
			foster?.id,
			profile.organization_id,
		],
		queryFn: async () => {
			if (!foster) return null;
			if (foster.role === "coordinator") {
				return fetchCoordinatorGroupChat(profile.organization_id);
			}
			return fetchFosterConversation(foster.id, profile.organization_id);
		},
		enabled: !!foster && isCoordinator && foster.id !== user.id,
	});

	// Determine if we should show the chat icon (don't show for current user)
	const showChatIcon = foster && foster.id !== user.id && conversationId;

	if (isLoading) {
		return (
			<div className="min-h-screen p-4 bg-gray-50">
				<div className="max-w-4xl mx-auto">
					<div className="bg-white rounded-lg shadow-sm p-6">
						<LoadingSpinner message="Loading foster details..." />
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
									: "Unable to load foster details. Please try again."}
							</p>
						</div>
					</div>
				</div>
			</div>
		);
	}

	if (!foster) {
		return (
			<div className="min-h-screen p-4 bg-gray-50">
				<div className="max-w-4xl mx-auto">
					<div className="bg-white rounded-lg shadow-sm p-6">
						{isOffline() ? (
							<div className="text-red-700">
								<p className="font-medium mb-4">
									Unable to load foster details.
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
									Foster not found.
								</p>
							</>
						)}
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen p-4 bg-gray-50">
			<div className="max-w-4xl mx-auto">
				<div className="bg-white rounded-lg shadow-sm p-6 mb-6">
					<div className="mb-6">
						<div className="flex items-center gap-3 mb-2">
							<h1 className="text-2xl font-bold text-gray-900">
								{foster.full_name?.trim() ||
									foster.email ||
									"Unnamed Foster"}
							</h1>
							{foster.role === "coordinator" && (
								<span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
									Coordinator
								</span>
							)}
							{showChatIcon && (
								<Link
									to={`/chat/${conversationId}`}
									className="ml-auto p-2 rounded-lg hover:bg-gray-100 transition-colors"
									aria-label="Chat"
								>
									<ChatBubbleLeftIcon className="h-6 w-6 text-gray-700" />
								</Link>
							)}
						</div>
					</div>

					<div className="space-y-4">
						{foster.email && (
							<div>
								<label className="block text-sm font-medium text-gray-500 mb-1">
									Email
								</label>
								<p className="text-lg font-medium">
									{foster.email}
								</p>
							</div>
						)}

						{foster.phone_number && (
							<div>
								<label className="block text-sm font-medium text-gray-500 mb-1">
									Phone Number
								</label>
								<p className="text-lg font-medium">
									{foster.phone_number}
								</p>
							</div>
						)}

						{foster.full_address && (
							<div>
								<label className="block text-sm font-medium text-gray-500 mb-1">
									Address
								</label>
								<p className="text-lg font-medium">
									{foster.full_address}
								</p>
							</div>
						)}

						{foster.home_inspection && (
							<div>
								<label className="block text-sm font-medium text-gray-500 mb-1">
									Home Inspection
								</label>
								<p className="text-lg font-medium whitespace-pre-wrap">
									{foster.home_inspection}
								</p>
							</div>
						)}

						{foster.experience_level && (
							<div>
								<label className="block text-sm font-medium text-gray-500 mb-1">
									Experience Level
								</label>
								<p className="text-lg font-medium capitalize">
									{foster.experience_level}
								</p>
							</div>
						)}

						{foster.availability != null && (
							<div>
								<label className="block text-sm font-medium text-gray-500 mb-1">
									Availability
								</label>
								<span
									className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
										foster.availability
											? "bg-green-100 text-green-800"
											: "bg-gray-100 text-gray-800"
									}`}
								>
									{foster.availability
										? "Available"
										: "Not Available"}
								</span>
							</div>
						)}
					</div>
				</div>

				{/* Currently Fostering */}
				{hasAssignedItems && (
					<div className="mb-4">
						<h2 className="text-lg font-semibold text-gray-900 mb-4">
							Currently Fostering
						</h2>
						<div className="grid gap-1.5 grid-cols-1 min-[375px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
							{assignedGroups.map((group) => (
								<GroupCard
									key={group.id}
									group={group}
									animalData={animalDataMap}
								/>
							))}
							{filteredAnimals.map((animal) => (
								<AnimalCard key={animal.id} animal={animal} />
							))}
						</div>
					</div>
				)}

				{!hasAssignedItems && (
					<div className="bg-white rounded-lg shadow-sm p-6">
						<p className="text-gray-600">
							No animals or groups currently assigned to this
							foster.
						</p>
					</div>
				)}
			</div>
		</div>
	);
}
