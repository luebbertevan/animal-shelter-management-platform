import { useMemo } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
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

	const offset = (page - 1) * pageSize;

	const {
		data: groupsData = [],
		isLoading: isLoadingGroups,
		isError: isErrorGroups,
		error: groupsError,
		refetch,
	} = useQuery({
		queryKey: [
			"groups",
			user.id,
			profile.organization_id,
			filters,
			searchTerm,
			page,
			pageSize,
		],
		queryFn: () => {
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
				filters,
				searchTerm,
			});
		},
	});

	const { data: animalsData = [], isLoading: isLoadingAnimals } = useQuery({
		queryKey: ["animals", user.id, profile.organization_id],
		queryFn: () => {
			return fetchAnimals(profile.organization_id, {
				fields: ["id", "name", "photos", "life_stage"],
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

	// Get animal names for each group
	const groupsWithAnimalNames = useMemo(() => {
		return groupsData.map((group): GroupWithAnimalNames => {
			const animalNames =
				group.animal_ids
					?.map((id) => animalMap.get(id))
					.filter((name): name is string => name !== undefined) || [];
			return {
				...group,
				animalNames,
			};
		});
	}, [groupsData, animalMap]);

	// Fetch total count for pagination (with filters and search)
	const { data: totalCount = 0 } = useQuery({
		queryKey: [
			"groups-count",
			profile.organization_id,
			filters,
			searchTerm,
		],
		queryFn: () =>
			fetchGroupsCount(profile.organization_id, filters, searchTerm),
	});

	const isLoading = isLoadingGroups || isLoadingAnimals;
	const isError = isErrorGroups;
	const error = groupsError;
	const groups = groupsWithAnimalNames;
	const totalPages = Math.ceil(totalCount / pageSize);

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
					<div className="flex items-center justify-between mb-4">
						<div>
							<h1 className="text-2xl font-bold text-gray-900">
								Groups
							</h1>
							<p className="text-gray-600">
								Browse all animal groups currently tracked in
								the system.
							</p>
						</div>
						<div className="flex items-center gap-3">
							{isCoordinator && (
								<Link to="/groups/new">
									<Button>Add Group</Button>
								</Link>
							)}
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

				{!isLoading && !isError && groups.length === 0 && (
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
						) : totalCount === 0 &&
						  !searchTerm &&
						  activeFilterCount === 0 ? (
							<div className="text-gray-600">
								No groups found yet. Once you add groups, they
								will appear here.
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
									placeholder="Search groups by name..."
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
						{groups.length > 0 && (
							<>
								<div className="grid gap-1.5 grid-cols-1 min-[375px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
									{groups.map((group) => (
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
										totalItems={totalCount}
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
