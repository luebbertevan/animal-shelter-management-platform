import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useProtectedAuth } from "../../hooks/useProtectedAuth";
import type {
	Animal,
	AnimalGroup,
	LifeStage,
	PhotoMetadata,
	FosterVisibility,
} from "../../types";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import AnimalCard from "../../components/animals/AnimalCard";
import GroupCard from "../../components/animals/GroupCard";
import { fetchAnimals } from "../../lib/animalQueries";
import { fetchGroups } from "../../lib/groupQueries";
import { isOffline } from "../../lib/errorUtils";

// Type for combined items (animals and groups) for sorting
type CombinedItem =
	| { type: "animal"; data: Animal; priority: boolean; created_at: string }
	| {
			type: "group";
			data: AnimalGroup;
			priority: boolean;
			created_at: string;
			foster_visibility: FosterVisibility;
	  };

export default function FostersNeeded() {
	const { user, profile } = useProtectedAuth();

	// Single fetch for all animals with all needed fields
	const {
		data: allAnimals = [],
		isLoading: isLoadingAnimals,
		isError: isErrorAnimals,
		error: animalsError,
		refetch,
	} = useQuery({
		queryKey: [
			"fosters-needed-all-animals",
			user.id,
			profile.organization_id,
		],
		queryFn: async () => {
			return fetchAnimals(profile.organization_id, {
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
					"created_at",
					"life_stage", // Needed for GroupCard
				],
				orderBy: "created_at",
				orderDirection: "asc",
				checkOffline: true,
			});
		},
	});

	// Fetch all groups
	const {
		data: groupsData = [],
		isLoading: isLoadingGroups,
		isError: isErrorGroups,
		error: groupsError,
	} = useQuery({
		queryKey: ["fosters-needed-groups", user.id, profile.organization_id],
		queryFn: async () => {
			return fetchGroups(profile.organization_id, {
				fields: [
					"id",
					"name",
					"description",
					"animal_ids",
					"priority",
					"group_photos",
					"created_at",
				],
				orderBy: "created_at",
				orderDirection: "asc",
				checkOffline: true,
			});
		},
	});

	// Filter animals not in groups for direct display
	const animalsData = useMemo(() => {
		return allAnimals.filter(
			(animal) =>
				animal.foster_visibility !== "not_visible" && !animal.group_id
		);
	}, [allAnimals]);

	// Create a map of animal ID to foster_visibility for quick lookup (only for animals in groups)
	const animalVisibilityMap = useMemo(() => {
		const map = new Map<string, FosterVisibility>();
		allAnimals.forEach((animal) => {
			if (animal.id && animal.foster_visibility && animal.group_id) {
				// Only map animals that are in groups
				map.set(animal.id, animal.foster_visibility);
			}
		});
		return map;
	}, [allAnimals]);

	// Filter groups: only show groups where all animals have foster_visibility != 'not_visible'
	const visibleGroups = useMemo(() => {
		return groupsData.filter((group) => {
			if (!group.animal_ids || group.animal_ids.length === 0) {
				return false; // Skip empty groups
			}

			// Check if all animals in the group are visible
			const allVisible = group.animal_ids.every((animalId) => {
				const visibility = animalVisibilityMap.get(animalId);
				return visibility && visibility !== "not_visible";
			});

			return allVisible;
		});
	}, [groupsData, animalVisibilityMap]);

	// Get foster_visibility for each group (all animals in a group have the same value)
	const groupsWithVisibility = useMemo(() => {
		return visibleGroups.map((group) => {
			if (!group.animal_ids || group.animal_ids.length === 0) {
				return { group, foster_visibility: null };
			}

			// Get visibility from first animal (all should be the same)
			const firstAnimalId = group.animal_ids[0];
			const visibility = animalVisibilityMap.get(firstAnimalId);

			return {
				group,
				foster_visibility: visibility || null,
			};
		});
	}, [visibleGroups, animalVisibilityMap]);

	// Create a map of animal data for GroupCard (only for animals in groups)
	const animalDataMap = useMemo(() => {
		const map = new Map<
			string,
			{ photos?: PhotoMetadata[]; life_stage?: LifeStage }
		>();
		allAnimals.forEach((animal) => {
			if (animal.id && animal.group_id) {
				// Only map animals that are in groups
				map.set(animal.id, {
					photos: animal.photos,
					life_stage: animal.life_stage,
				});
			}
		});
		return map;
	}, [allAnimals]);

	// Combine animals and groups into a single list for sorting
	const combinedItems = useMemo<CombinedItem[]>(() => {
		const items: CombinedItem[] = [];

		// Add animals
		animalsData.forEach((animal) => {
			items.push({
				type: "animal",
				data: animal,
				priority: animal.priority || false,
				created_at: animal.created_at,
			});
		});

		// Add groups
		groupsWithVisibility.forEach(({ group, foster_visibility }) => {
			if (foster_visibility) {
				items.push({
					type: "group",
					data: group,
					priority: group.priority || false,
					created_at: group.created_at,
					foster_visibility,
				});
			}
		});

		// Sort: priority DESC, then created_at ASC (oldest first)
		items.sort((a, b) => {
			// First sort by priority (high priority first)
			if (a.priority !== b.priority) {
				return a.priority ? -1 : 1;
			}
			// Then sort by created_at (oldest first)
			return (
				new Date(a.created_at).getTime() -
				new Date(b.created_at).getTime()
			);
		});

		return items;
	}, [animalsData, groupsWithVisibility]);

	const isLoading = isLoadingAnimals || isLoadingGroups;
	const isError = isErrorAnimals || isErrorGroups;
	const error = animalsError || groupsError;

	return (
		<div className="min-h-screen p-4 bg-gray-50">
			<div className="max-w-5xl mx-auto">
				<div className="mb-6">
					<div className="flex items-center justify-between mb-4">
						<div>
							<h1 className="text-2xl font-bold text-gray-900">
								Fosters Needed
							</h1>
							<p className="text-gray-600">
								Browse animals and groups that need foster
								placement.
							</p>
						</div>
						<button
							type="button"
							onClick={() => refetch()}
							className="text-sm text-pink-600 hover:text-pink-700 font-medium"
							disabled={isLoading}
						>
							Refresh
						</button>
					</div>
				</div>

				{isLoading && (
					<div className="bg-white rounded-lg shadow-sm p-6">
						<LoadingSpinner message="Loading fosters needed..." />
					</div>
				)}

				{isError && (
					<div className="bg-white rounded-lg shadow-sm p-6 border border-red-200">
						<div className="text-red-700">
							<p className="font-medium mb-2">
								Unable to load fosters needed right now.
							</p>
							<p className="text-sm mb-4">
								{error instanceof Error
									? error.message
									: "Unknown error"}
							</p>
							<button
								type="button"
								onClick={() => refetch()}
								className="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 text-sm font-medium transition-colors"
							>
								Try Again
							</button>
						</div>
					</div>
				)}

				{!isLoading && !isError && combinedItems.length === 0 && (
					<div className="bg-white rounded-lg shadow-sm p-6">
						{isOffline() ? (
							<div className="text-red-700">
								<p className="font-medium mb-2">
									Unable to load fosters needed right now.
								</p>
								<p className="text-sm mb-4">
									Unable to connect to the server. Please
									check your internet connection and try
									again.
								</p>
								<button
									type="button"
									onClick={() => refetch()}
									className="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 text-sm font-medium transition-colors"
								>
									Try Again
								</button>
							</div>
						) : (
							<div className="text-gray-600">
								No animals or groups need foster placement at
								this time.
							</div>
						)}
					</div>
				)}

				{combinedItems.length > 0 && (
					<div className="grid gap-1.5 grid-cols-1 min-[375px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
						{combinedItems.map((item) => {
							if (item.type === "animal") {
								return (
									<AnimalCard
										key={`animal-${item.data.id}`}
										animal={item.data}
										foster_visibility={
											item.data.foster_visibility
										}
									/>
								);
							} else {
								return (
									<GroupCard
										key={`group-${item.data.id}`}
										group={item.data}
										animalData={animalDataMap}
										foster_visibility={
											item.foster_visibility
										}
									/>
								);
							}
						})}
					</div>
				)}
			</div>
		</div>
	);
}
