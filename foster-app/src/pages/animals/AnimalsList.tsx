import { useMemo } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useProtectedAuth } from "../../hooks/useProtectedAuth";
import Button from "../../components/ui/Button";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import AnimalCard from "../../components/animals/AnimalCard";
import Pagination from "../../components/shared/Pagination";
import SearchInput from "../../components/shared/SearchInput";
import AnimalFilters, {
	type AnimalFilters as AnimalFiltersType,
} from "../../components/animals/AnimalFilters";
import { FilterChip } from "../../components/shared/Filters";
import { fetchAnimals, fetchAnimalsCount } from "../../lib/animalQueries";
import { isOffline } from "../../lib/errorUtils";
import {
	queryParamsToFilters,
	filtersToQueryParams,
	countActiveFilters,
} from "../../lib/filterUtils";
import { supabase } from "../../lib/supabase";

export default function AnimalsList() {
	const { user, profile } = useProtectedAuth();
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();

	// Parse filters, search, and pagination from URL
	const { filters, searchTerm, page, pageSize } = useMemo(() => {
		return queryParamsToFilters<AnimalFiltersType>(searchParams, {});
	}, [searchParams]);

	const offset = (page - 1) * pageSize;

	// Fetch animals with pagination, filters, and search
	const {
		data = [],
		isLoading,
		isError,
		error,
		refetch,
	} = useQuery({
		queryKey: [
			"animals",
			user.id,
			profile.organization_id,
			filters,
			searchTerm,
			page,
			pageSize,
		],
		queryFn: async () => {
			const animals = await fetchAnimals(profile.organization_id, {
				fields: [
					"id",
					"name",
					"status",
					"sex_spay_neuter_status",
					"priority",
					"photos",
					"date_of_birth",
					"group_id",
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

			// Fetch group names for animals that are in groups
			// Get unique group IDs first to minimize queries
			const groupIds = [
				...new Set(
					animals
						.map((a) => a.group_id)
						.filter((id): id is string => !!id)
				),
			];

			// Fetch all groups at once
			const groupsMap = new Map<string, string>();
			if (groupIds.length > 0) {
				try {
					const { data: groups, error: groupsError } = await supabase
						.from("animal_groups")
						.select("id, name")
						.in("id", groupIds);

					if (groupsError) {
						console.error("Error fetching groups:", groupsError);
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
			const animalsWithGroups = animals.map((animal) => {
				if (animal.group_id) {
					const groupName = groupsMap.get(animal.group_id);
					return {
						...animal,
						group_name: groupName,
					};
				}
				return animal;
			});

			return animalsWithGroups;
		},
	});

	// Fetch total count for pagination (with filters and search)
	const { data: totalCount = 0 } = useQuery({
		queryKey: [
			"animals-count",
			profile.organization_id,
			filters,
			searchTerm,
		],
		queryFn: () =>
			fetchAnimalsCount(profile.organization_id, filters, searchTerm),
	});

	const animals = useMemo(() => data, [data]);
	const totalPages = Math.ceil(totalCount / pageSize);

	// Handle filter changes
	const handleFiltersChange = (newFilters: AnimalFiltersType) => {
		const params = filtersToQueryParams(
			newFilters,
			searchTerm,
			1,
			pageSize
		);
		navigate(`/animals?${params.toString()}`, { replace: true });
	};

	// Handle search
	const handleSearch = (term: string) => {
		const params = filtersToQueryParams(filters, term, 1, pageSize);
		navigate(`/animals?${params.toString()}`, { replace: true });
	};

	// Handle page change
	const handlePageChange = (newPage: number) => {
		const params = filtersToQueryParams(
			filters,
			searchTerm,
			newPage,
			pageSize
		);
		navigate(`/animals?${params.toString()}`, { replace: true });
	};

	// Generate active filter chips
	const activeFilterChips = useMemo(() => {
		const chips: Array<{ label: string; onRemove: () => void }> = [];

		const createRemoveHandler =
			(key: keyof AnimalFiltersType, value: undefined) => () => {
				handleFiltersChange({ ...filters, [key]: value });
			};

		if (filters.priority === true) {
			chips.push({
				label: "High Priority",
				onRemove: createRemoveHandler("priority", undefined),
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

		if (filters.inGroup === true) {
			chips.push({
				label: "In Group",
				onRemove: createRemoveHandler("inGroup", undefined),
			});
		} else if (filters.inGroup === false) {
			chips.push({
				label: "Not In Group",
				onRemove: createRemoveHandler("inGroup", undefined),
			});
		}

		if (filters.status) {
			const statusLabels: Record<string, string> = {
				in_foster: "In Foster",
				adopted: "Adopted",
				medical_hold: "Medical Hold",
				in_shelter: "In Shelter",
				transferring: "Transferring",
			};
			chips.push({
				label: `Status: ${
					statusLabels[filters.status] || filters.status
				}`,
				onRemove: createRemoveHandler("status", undefined),
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
				label: `Visibility: ${
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

	const activeFilterCount = countActiveFilters(filters);

	return (
		<div className="min-h-screen p-4 bg-gray-50">
			<div className="max-w-5xl mx-auto">
				<div className="mb-6">
					<div className="flex items-center justify-between mb-4">
						<div>
							<h1 className="text-2xl font-bold text-gray-900">
								Animals
							</h1>
							<p className="text-gray-600">
								Browse all animals currently tracked in the
								system.
							</p>
						</div>
						<div className="flex items-center gap-3">
							{profile.role === "coordinator" && (
								<Link to="/animals/new">
									<Button>Add Animal</Button>
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
						<LoadingSpinner message="Loading animals..." />
					</div>
				)}

				{isError && (
					<div className="bg-white rounded-lg shadow-sm p-6 border border-red-200">
						<div className="text-red-700">
							<p className="font-medium mb-2">
								Unable to load animals right now.
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

				{!isLoading && !isError && animals.length === 0 && (
					<div className="bg-white rounded-lg shadow-sm p-6">
						{isOffline() ? (
							<div className="text-red-700">
								<p className="font-medium mb-2">
									Unable to load animals right now.
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
								No animals found yet. Once you add animals, they
								will appear here.
							</div>
						) : (
							<div className="text-gray-600">
								No animals found matching your search and
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
									placeholder="Search animals by name..."
									disabled={isLoading}
								/>
								<AnimalFilters
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
						{animals.length > 0 && (
							<>
								<div className="grid gap-1.5 grid-cols-1 min-[375px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
									{animals.map((animal) => (
										<AnimalCard
											key={animal.id}
											animal={animal}
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
