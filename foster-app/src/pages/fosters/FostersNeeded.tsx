import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
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
import Pagination from "../../components/shared/Pagination";
import SearchInput from "../../components/shared/SearchInput";
import FostersNeededFilters, {
	type FostersNeededFilters as FostersNeededFiltersType,
} from "../../components/fosters/FostersNeededFilters";
import { FilterChip } from "../../components/shared/Filters";
import { fetchAnimals } from "../../lib/animalQueries";
import { fetchGroups } from "../../lib/groupQueries";
import { isOffline } from "../../lib/errorUtils";
import { getGroupFosterVisibility } from "../../lib/groupUtils";
import {
	queryParamsToFilters,
	filtersToQueryParams,
} from "../../lib/filterUtils";

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
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();

	// Parse filters, search, and pagination from URL
	const {
		filters: parsedFilters,
		searchTerm,
		page,
		pageSize,
	} = useMemo(() => {
		return queryParamsToFilters<FostersNeededFiltersType>(searchParams, {});
	}, [searchParams]);

	// Type filter: undefined = both, "groups" = groups only, "singles" = singles only
	const filters = useMemo(() => {
		return parsedFilters;
	}, [parsedFilters]);

	// Single fetch for all animals with all needed fields
	const {
		data: allAnimals = [],
		isLoading: isLoadingAnimals,
		isError: isErrorAnimals,
		error: animalsError,
		refetch: refetchAnimals,
		isRefetching: isRefetchingAnimals,
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
		refetch: refetchGroups,
		isRefetching: isRefetchingGroups,
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

	// Create a map of animal ID to animal for quick lookup (only for animals in groups)
	const animalMapById = useMemo(() => {
		const map = new Map<string, Animal>();
		allAnimals.forEach((animal) => {
			if (animal.id && animal.group_id) {
				// Only map animals that are in groups
				map.set(animal.id, animal);
			}
		});
		return map;
	}, [allAnimals]);

	// Compute group foster visibility using the utility function (reusing existing logic)
	// Filter groups: only show groups where all animals have foster_visibility != 'not_visible'
	const groupsWithVisibility = useMemo(() => {
		return groupsData
			.map((group) => {
				if (!group.animal_ids || group.animal_ids.length === 0) {
					return { group, foster_visibility: null };
				}

				// Get animals in this group
				const groupAnimals: Animal[] =
					group.animal_ids
						?.map((id) => animalMapById.get(id))
						.filter((animal): animal is Animal => !!animal) || [];

				// Compute foster visibility using the utility function
				const { sharedValue: fosterVisibility } =
					getGroupFosterVisibility(groupAnimals);

				return {
					group,
					foster_visibility: fosterVisibility,
				};
			})
			.filter(({ foster_visibility }) => {
				// Only show groups where visibility is not 'not_visible'
				return foster_visibility && foster_visibility !== "not_visible";
			});
	}, [groupsData, animalMapById]);

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

	// Combine animals and groups into a single list for sorting and filtering
	const combinedItems = useMemo<CombinedItem[]>(() => {
		const items: CombinedItem[] = [];

		// If sex filter is active, hide groups (sex filter doesn't apply to groups)
		// life_stage filter will show groups where at least one animal matches
		const shouldHideGroups = !!filters.sex;

		// Determine type filter, but override to hide groups if sex filter is active
		// undefined means "both", "groups" means groups only, "singles" means singles only
		let typeFilter = filters.type; // undefined = both
		if (shouldHideGroups) {
			typeFilter = "singles"; // Force to singles only when groups should be hidden
		}

		// Add animals (singles only - not in groups)
		if (typeFilter === undefined || typeFilter === "singles") {
			animalsData.forEach((animal) => {
				// Apply filters to animals
				if (filters.priority === true && !animal.priority) return;
				if (
					filters.sex &&
					animal.sex_spay_neuter_status !== filters.sex
				)
					return;
				if (
					filters.life_stage &&
					animal.life_stage !== filters.life_stage
				)
					return;
				// Status filter (only for coordinators)
				if (filters.status && animal.status !== filters.status) return;
				// Map availability filter to foster_visibility
				if (
					filters.availability &&
					animal.foster_visibility !== filters.availability
				)
					return;

				// Apply search to animals
				if (searchTerm) {
					const searchLower = searchTerm.toLowerCase();
					const animalName = animal.name?.toLowerCase() || "";
					if (!animalName.includes(searchLower)) return;
				}

				items.push({
					type: "animal",
					data: animal,
					priority: animal.priority || false,
					created_at: animal.created_at,
				});
			});
		}

		// Add groups (only if not hidden by sex filter)
		if (
			!shouldHideGroups &&
			(typeFilter === undefined || typeFilter === "groups")
		) {
			groupsWithVisibility.forEach(({ group, foster_visibility }) => {
				if (!foster_visibility) return;

				// Apply priority filter to groups
				if (filters.priority === true && !group.priority) return;

				// Apply life_stage filter: show group if at least one animal matches
				if (filters.life_stage) {
					const groupAnimals: Animal[] =
						group.animal_ids
							?.map((id) => animalMapById.get(id))
							.filter((animal): animal is Animal => !!animal) ||
						[];

					// Check if at least one animal matches the life_stage filter
					const hasMatchingLifeStage = groupAnimals.some(
						(animal) => animal.life_stage === filters.life_stage
					);

					if (!hasMatchingLifeStage) return;
				}

				// Apply search to groups
				if (searchTerm) {
					const searchLower = searchTerm.toLowerCase();
					const groupName = group.name?.toLowerCase() || "";
					if (!groupName.includes(searchLower)) return;
				}

				// Map availability filter to foster_visibility (groups inherit from animals)
				if (
					filters.availability &&
					foster_visibility !== filters.availability
				)
					return;

				items.push({
					type: "group",
					data: group,
					priority: group.priority || false,
					created_at: group.created_at,
					foster_visibility,
				});
			});
		}

		// Sort: priority DESC, then created_at ASC (oldest first) or DESC (newest first) based on filter
		items.sort((a, b) => {
			// First sort by priority (high priority first)
			if (a.priority !== b.priority) {
				return a.priority ? -1 : 1;
			}
			// Then sort by created_at
			const aTime = new Date(a.created_at).getTime();
			const bTime = new Date(b.created_at).getTime();
			if (filters.sortByCreatedAt === "newest") {
				return bTime - aTime; // Newest first
			}
			return aTime - bTime; // Oldest first (default)
		});

		return items;
	}, [animalsData, groupsWithVisibility, filters, searchTerm, animalMapById]);

	// Paginate the combined items
	const paginatedItems = useMemo(() => {
		const startIndex = (page - 1) * pageSize;
		const endIndex = startIndex + pageSize;
		return combinedItems.slice(startIndex, endIndex);
	}, [combinedItems, page, pageSize]);

	// Calculate total pages
	const totalItems = combinedItems.length;
	const totalPages = Math.ceil(totalItems / pageSize);

	// Handle filter changes
	const handleFiltersChange = (newFilters: FostersNeededFiltersType) => {
		const params = filtersToQueryParams(
			newFilters,
			searchTerm,
			1,
			pageSize
		);
		navigate(`/fosters-needed?${params.toString()}`, { replace: true });
	};

	// Handle search
	const handleSearch = (term: string) => {
		const params = filtersToQueryParams(filters, term, 1, pageSize);
		navigate(`/fosters-needed?${params.toString()}`, { replace: true });
	};

	// Handle page change
	const handlePageChange = (newPage: number) => {
		const params = filtersToQueryParams(
			filters,
			searchTerm,
			newPage,
			pageSize
		);
		navigate(`/fosters-needed?${params.toString()}`, { replace: true });
	};

	// Generate active filter chips
	const activeFilterChips = useMemo(() => {
		const chips: Array<{ label: string; onRemove: () => void }> = [];

		const createRemoveHandler =
			(key: keyof FostersNeededFiltersType, value: undefined) =>
			() => {
				handleFiltersChange({
					...filters,
					[key]: value,
				});
			};

		if (filters.priority === true) {
			chips.push({
				label: "High Priority",
				onRemove: createRemoveHandler("priority", undefined),
			});
		}

		if (filters.type) {
			const typeLabels: Record<string, string> = {
				groups: "Groups Only",
				singles: "Singles Only",
			};
			chips.push({
				label: typeLabels[filters.type] || filters.type,
				onRemove: createRemoveHandler("type", undefined),
			});
		}

		if (filters.sex) {
			const sexLabels: Record<string, string> = {
				male: "Male",
				female: "Female",
				spayed_female: "Spayed Female",
				neutered_male: "Neutered Male",
			};
			chips.push({
				label: `Sex: ${sexLabels[filters.sex] || filters.sex}`,
				onRemove: createRemoveHandler("sex", undefined),
			});
		}

		if (filters.life_stage) {
			const lifeStageLabels: Record<string, string> = {
				kitten: "Kitten",
				adult: "Adult",
				senior: "Senior",
				unknown: "Unknown",
			};
			chips.push({
				label: `Life Stage: ${
					lifeStageLabels[filters.life_stage] || filters.life_stage
				}`,
				onRemove: createRemoveHandler("life_stage", undefined),
			});
		}

		if (filters.availability) {
			const availabilityLabels: Record<string, string> = {
				available_now: "Available Now",
				available_future: "Available Future",
				foster_pending: "Foster Pending",
			};
			chips.push({
				label: `Availability: ${
					availabilityLabels[filters.availability] ||
					filters.availability
				}`,
				onRemove: createRemoveHandler("availability", undefined),
			});
		}

		if (filters.sortByCreatedAt) {
			chips.push({
				label: `Sort: ${
					filters.sortByCreatedAt === "oldest"
						? "Oldest First"
						: "Newest First"
				}`,
				onRemove: createRemoveHandler("sortByCreatedAt", undefined),
			});
		}

		return chips;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [filters]);

	// Count active filters (excluding default values)
	function countActiveFostersNeededFilters(
		filters: FostersNeededFiltersType
	): number {
		let count = 0;
		if (filters.priority === true) count++;
		if (filters.sex) count++;
		if (filters.life_stage) count++;
		if (filters.availability) count++;
		if (filters.type) count++;
		if (filters.sortByCreatedAt) count++;
		return count;
	}

	const activeFilterCount = countActiveFostersNeededFilters(filters);

	const isLoading = isLoadingAnimals || isLoadingGroups;
	const isRefetching = isRefetchingAnimals || isRefetchingGroups;
	const isError = isErrorAnimals || isErrorGroups;
	const error = animalsError || groupsError;

	// Refetch both queries
	const handleRefetch = async () => {
		await Promise.all([refetchAnimals(), refetchGroups()]);
	};

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
							onClick={handleRefetch}
							disabled={isLoading || isRefetching}
							className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 text-sm font-medium text-pink-600 bg-pink-50 border border-pink-200 rounded-md hover:bg-pink-100 hover:border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-95"
							aria-label="Refresh fosters needed"
						>
							<ArrowPathIcon
								className={`h-4 w-4 sm:h-5 sm:w-5 ${
									isRefetching ? "animate-spin" : ""
								}`}
							/>
							<span className="hidden sm:inline">Refresh</span>
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
								onClick={handleRefetch}
								disabled={isLoading || isRefetching}
								className="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
									onClick={handleRefetch}
									disabled={isLoading || isRefetching}
									className="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								>
									Try Again
								</button>
							</div>
						) : !searchTerm &&
						  activeFilterCount === 0 &&
						  animalsData.length === 0 &&
						  groupsWithVisibility.length === 0 ? (
							<div className="text-gray-600">
								No animals or groups need foster placement at
								this time.
							</div>
						) : (
							<div className="text-gray-600">
								No animals or groups found matching your search
								and filters.
							</div>
						)}
					</div>
				)}

				{!isLoading && !isError && (
					<>
						{/* Search Input and Filters - Inline Layout */}
						<div className="mb-4">
							<div className="flex items-center gap-2">
								<SearchInput
									value={searchTerm}
									onSearch={handleSearch}
									disabled={isLoading}
								/>
								<FostersNeededFilters
									filters={filters}
									onFiltersChange={handleFiltersChange}
								/>
							</div>
						</div>

						{/* Active Filter Chips */}
						{activeFilterChips.length > 0 && (
							<div className="mb-4 flex flex-wrap gap-2">
								{activeFilterChips.map((chip, index) => (
									<FilterChip
										key={index}
										label={chip.label}
										onRemove={chip.onRemove}
									/>
								))}
							</div>
						)}

						{/* Results */}
						{combinedItems.length > 0 && (
							<>
								<div className="grid gap-1.5 grid-cols-1 min-[375px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
									{paginatedItems.map((item) => {
										if (item.type === "animal") {
											return (
												<AnimalCard
													key={`animal-${item.data.id}`}
													animal={item.data}
													foster_visibility={
														item.data
															.foster_visibility
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
								<Pagination
									currentPage={page}
									totalPages={totalPages}
									onPageChange={handlePageChange}
									totalItems={totalItems}
									itemsPerPage={pageSize}
								/>
							</>
						)}
					</>
				)}
			</div>
		</div>
	);
}
