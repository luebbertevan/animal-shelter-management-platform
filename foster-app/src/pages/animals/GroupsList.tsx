import { useMemo } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowPathIcon, PlusIcon } from "@heroicons/react/24/outline";
import { useProtectedAuth } from "../../hooks/useProtectedAuth";
import type { AnimalGroup, LifeStage, PhotoMetadata } from "../../types";
import Button from "../../components/ui/Button";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import GroupCard from "../../components/animals/GroupCard";
import Pagination from "../../components/shared/Pagination";
import SearchInput from "../../components/shared/SearchInput";
import GroupFilters, {
	type GroupFilters as GroupFiltersType,
} from "../../components/animals/GroupFilters";
import { FilterChip } from "../../components/shared/Filters";
import { fetchGroups, fetchGroupsCount } from "../../lib/groupQueries";
import { fetchAnimals } from "../../lib/animalQueries";
import { isOffline } from "../../lib/errorUtils";
import {
	queryParamsToFilters,
	filtersToQueryParams,
	countActiveGroupFilters,
} from "../../lib/filterUtils";
import { getGroupFosterVisibility } from "../../lib/groupUtils";
import type { Animal } from "../../types";

type GroupWithAnimalNames = Pick<
	AnimalGroup,
	"id" | "name" | "description" | "animal_ids" | "priority"
> & {
	animalNames: string[];
};

export default function GroupsList() {
	const { user, profile, isCoordinator } = useProtectedAuth();
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();

	// Parse filters, search, and pagination from URL
	const { filters, searchTerm, page, pageSize } = useMemo(() => {
		return queryParamsToFilters<GroupFiltersType>(searchParams, {});
	}, [searchParams]);

	// If foster_visibility filter is active, we need all groups for client-side filtering
	// Otherwise, we can use server-side pagination
	const needsAllGroups = !!filters.foster_visibility;
	const offset = (page - 1) * pageSize;

	const {
		data: groupsData = [],
		isLoading: isLoadingGroups,
		isError: isErrorGroups,
		error: groupsError,
		refetch,
		isRefetching: isRefetchingGroups,
	} = useQuery({
		queryKey: [
			"groups",
			user.id,
			profile.organization_id,
			filters,
			searchTerm,
			needsAllGroups ? "all" : page,
			needsAllGroups ? "all" : pageSize,
		],
		queryFn: () => {
			// When foster_visibility filter is active, fetch all groups for client-side filtering
			// Otherwise, use server-side pagination
			if (needsAllGroups) {
				return fetchGroups(profile.organization_id, {
					fields: [
						"id",
						"name",
						"description",
						"animal_ids",
						"priority",
						"group_photos",
					],
					orderBy: "created_at",
					orderDirection:
						filters.sortByCreatedAt === "oldest" ? "asc" : "desc",
					checkOffline: true,
					// Don't pass limit/offset to fetch all groups
				});
			} else {
				// Server-side pagination when foster_visibility filter is not active
				return fetchGroups(profile.organization_id, {
					fields: [
						"id",
						"name",
						"description",
						"animal_ids",
						"priority",
						"group_photos",
					],
					orderBy: "created_at",
					orderDirection:
						filters.sortByCreatedAt === "oldest" ? "asc" : "desc",
					checkOffline: true,
					limit: pageSize,
					offset,
					filters: { priority: filters.priority },
					searchTerm,
				});
			}
		},
	});

	const { data: animalsData = [], isLoading: isLoadingAnimals } = useQuery({
		queryKey: ["animals", user.id, profile.organization_id],
		queryFn: () => {
			return fetchAnimals(profile.organization_id, {
				fields: [
					"id",
					"name",
					"photos",
					"life_stage",
					"foster_visibility",
					"group_id",
				],
			});
		},
	});

	// Create a map of animal IDs to names for quick lookup
	const animalMap = useMemo(() => {
		const map = new Map<string, string>();
		animalsData.forEach((animal) => {
			map.set(animal.id, animal.name?.trim() || "Unnamed Animal");
		});
		return map;
	}, [animalsData]);

	// Create a map of animal data (photos + life_stage) for GroupCard
	const animalDataMap = useMemo(() => {
		const map = new Map<
			string,
			{ photos?: PhotoMetadata[]; life_stage?: LifeStage }
		>();
		animalsData.forEach((animal) => {
			map.set(animal.id, {
				photos: animal.photos,
				life_stage: animal.life_stage,
			});
		});
		return map;
	}, [animalsData]);

	// Compute group foster visibility using the utility function (reusing existing logic)
	const groupsWithVisibility = useMemo(() => {
		// Create a map of animal ID to animal for quick lookup
		const animalMapById = new Map<string, Animal>();
		animalsData.forEach((animal) => {
			if (animal.id) {
				animalMapById.set(animal.id, animal);
			}
		});

		return groupsData.map((group) => {
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
				fosterVisibility,
			};
		});
	}, [groupsData, animalsData]);

	// Get animal names for each group and apply foster_visibility filter
	const groupsWithAnimalNames = useMemo(() => {
		return groupsWithVisibility
			.filter(({ fosterVisibility }) => {
				// Apply foster_visibility filter if set
				if (filters.foster_visibility) {
					return fosterVisibility === filters.foster_visibility;
				}
				return true;
			})
			.map(({ group }): GroupWithAnimalNames => {
				const animalNames =
					group.animal_ids
						?.map((id) => animalMap.get(id))
						.filter((name): name is string => name !== undefined) ||
					[];
				return {
					...group,
					animalNames,
				};
			});
	}, [groupsWithVisibility, animalMap, filters.foster_visibility]);

	// Apply search filter client-side (needed when foster_visibility filter is active)
	// Also apply priority filter client-side when foster_visibility is active
	const filteredGroups = useMemo(() => {
		let filtered = groupsWithAnimalNames;

		// Apply priority filter client-side if foster_visibility filter is active
		// (because we fetched all groups in that case)
		if (needsAllGroups && filters.priority === true) {
			filtered = filtered.filter((group) => group.priority === true);
		}

		// Apply search filter (client-side when all groups are fetched)
		if (needsAllGroups && searchTerm) {
			const searchLower = searchTerm.toLowerCase();
			filtered = filtered.filter((group) => {
				const groupName = group.name?.toLowerCase() || "";
				return groupName.includes(searchLower);
			});
		}

		return filtered;
	}, [groupsWithAnimalNames, needsAllGroups, filters.priority, searchTerm]);

	const isLoading = isLoadingGroups || isLoadingAnimals;
	const isRefetching = isRefetchingGroups;
	const isError = isErrorGroups;
	const error = groupsError;

	// Paginate after filtering when foster_visibility filter is active
	// Otherwise, groupsData is already paginated from server
	const paginatedGroups = useMemo(() => {
		if (needsAllGroups) {
			const startIndex = (page - 1) * pageSize;
			const endIndex = startIndex + pageSize;
			return filteredGroups.slice(startIndex, endIndex);
		}
		return filteredGroups;
	}, [filteredGroups, needsAllGroups, page, pageSize]);

	// Calculate total count based on whether we're using client-side or server-side filtering
	const totalCount = useMemo(() => {
		if (needsAllGroups) {
			return filteredGroups.length;
		}
		// When using server-side pagination, we need to fetch total count
		// But we need to exclude foster_visibility from the filter for the count query
		return 0; // Will be handled by separate query below
	}, [filteredGroups.length, needsAllGroups]);

	// Fetch total count for server-side pagination (when foster_visibility filter is not active)
	const { data: serverTotalCount = 0 } = useQuery({
		queryKey: [
			"groups-count",
			profile.organization_id,
			{ priority: filters.priority },
			searchTerm,
		],
		queryFn: () =>
			fetchGroupsCount(
				profile.organization_id,
				{ priority: filters.priority },
				searchTerm
			),
		enabled: !needsAllGroups, // Only fetch when using server-side pagination
	});

	const finalTotalCount = needsAllGroups ? totalCount : serverTotalCount;
	const totalPages = Math.ceil(finalTotalCount / pageSize);

	// Handle filter changes
	const handleFiltersChange = (newFilters: GroupFiltersType) => {
		const params = filtersToQueryParams(
			newFilters,
			searchTerm,
			1,
			pageSize
		);
		navigate(`/groups?${params.toString()}`, { replace: true });
	};

	// Handle search
	const handleSearch = (term: string) => {
		const params = filtersToQueryParams(filters, term, 1, pageSize);
		navigate(`/groups?${params.toString()}`, { replace: true });
	};

	// Handle page change
	const handlePageChange = (newPage: number) => {
		const params = filtersToQueryParams(
			filters,
			searchTerm,
			newPage,
			pageSize
		);
		navigate(`/groups?${params.toString()}`, { replace: true });
	};

	// Generate active filter chips
	const activeFilterChips = useMemo(() => {
		const chips: Array<{ label: string; onRemove: () => void }> = [];

		const createRemoveHandler =
			(key: keyof GroupFiltersType, value: undefined) => () => {
				handleFiltersChange({ ...filters, [key]: value });
			};

		if (filters.priority === true) {
			chips.push({
				label: "High Priority",
				onRemove: createRemoveHandler("priority", undefined),
			});
		}

		if (filters.foster_visibility) {
			const visibilityLabels: Record<string, string> = {
				available_now: "Available Now",
				available_future: "Available Future",
				foster_pending: "Foster Pending",
				not_visible: "Not Visible",
			};
			chips.push({
				label: `Foster Visibility: ${
					visibilityLabels[filters.foster_visibility] ||
					filters.foster_visibility
				}`,
				onRemove: createRemoveHandler("foster_visibility", undefined),
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

	const activeFilterCount = countActiveGroupFilters(filters);

	return (
		<div className="min-h-screen p-4 bg-gray-50">
			<div className="max-w-5xl mx-auto">
				<div className="mb-6">
					<div className="flex items-center justify-between mb-2">
						<h1 className="text-2xl font-bold text-gray-900">
							Groups
						</h1>
						<div className="flex items-center gap-2 sm:gap-3">
							{isCoordinator && (
								<Link to="/groups/new">
									<Button
										className="w-10 h-10 sm:w-auto sm:h-auto px-0 py-0 sm:px-4 sm:py-2 flex items-center justify-center gap-2 whitespace-nowrap"
										aria-label="Add group"
									>
										<PlusIcon className="h-5 w-5" />
										<span className="hidden sm:inline">
											Add Group
										</span>
									</Button>
								</Link>
							)}
							<button
								type="button"
								onClick={() => refetch()}
								disabled={isLoading || isRefetching}
								className="flex items-center justify-center gap-2 w-10 h-10 sm:w-auto sm:h-auto px-0 py-0 sm:px-4 sm:py-2 text-sm font-medium text-pink-600 bg-pink-50 border border-pink-200 rounded-md hover:bg-pink-100 hover:border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-95"
								aria-label="Refresh groups"
							>
								<ArrowPathIcon
									className={`h-4 w-4 sm:h-5 sm:w-5 ${
										isRefetching ? "animate-spin" : ""
									}`}
								/>
								<span className="hidden sm:inline">
									Refresh
								</span>
							</button>
						</div>
					</div>
					<p className="text-gray-600">
						Browse all animal groups currently tracked in the
						system.
					</p>
				</div>

				{isLoading && (
					<div className="bg-white rounded-lg shadow-sm p-6">
						<LoadingSpinner message="Loading groups..." />
					</div>
				)}

				{isError && (
					<div className="bg-white rounded-lg shadow-sm p-6 border border-red-200">
						<div className="text-red-700">
							<p className="font-medium mb-2">
								Unable to load groups right now.
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

				{!isLoading &&
					!isError &&
					paginatedGroups.length === 0 &&
					filteredGroups.length === 0 && (
						<div className="bg-white rounded-lg shadow-sm p-6">
							{isOffline() ? (
								<div className="text-red-700">
									<p className="font-medium mb-2">
										Unable to load groups right now.
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
							) : finalTotalCount === 0 &&
							  !searchTerm &&
							  activeFilterCount === 0 ? (
								<div className="text-gray-600">
									No groups found yet. Once you add groups,
									they will appear here.
								</div>
							) : (
								<div className="text-gray-600">
									No groups found matching your search and
									filters.
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
								<GroupFilters
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
						{paginatedGroups.length > 0 && (
							<>
								<div className="grid gap-1.5 grid-cols-1 min-[375px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
									{paginatedGroups.map((group) => (
										<GroupCard
											key={group.id}
											group={group}
											animalData={animalDataMap}
										/>
									))}
								</div>
								{totalPages > 1 && (
									<Pagination
										currentPage={page}
										totalPages={totalPages}
										onPageChange={handlePageChange}
										totalItems={finalTotalCount}
										itemsPerPage={pageSize}
									/>
								)}
							</>
						)}
					</>
				)}
			</div>
		</div>
	);
}
