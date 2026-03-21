import { useMemo, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { useProtectedAuth } from "../../hooks/useProtectedAuth";
import type { FosterRequest } from "../../types";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import AnimalCard from "../../components/animals/AnimalCard";
import GroupCard from "../../components/animals/GroupCard";
import Pagination from "../../components/shared/Pagination";
import SearchInput from "../../components/shared/SearchInput";
import FostersNeededFilters, {
	type FostersNeededFilters as FostersNeededFiltersType,
} from "../../components/fosters/FostersNeededFilters";
import { FilterChip } from "../../components/shared/Filters";
import CancelRequestDialog from "../../components/fosters/CancelRequestDialog";
import { fetchAnimals } from "../../lib/animalQueries";
import { fetchGroups } from "../../lib/groupQueries";
import { fetchPendingRequestsForItems } from "../../lib/fosterRequestQueries";
import { cancelFosterRequest } from "../../lib/fosterRequestUtils";
import { isOffline } from "../../lib/errorUtils";
import {
	queryParamsToFilters,
	filtersToQueryParams,
} from "../../lib/filterUtils";
import {
	buildAnimalMapByGroupMembership,
	buildFostersNeededAnimalDataMap,
	buildGroupsWithFosterVisibility,
	combineAndSortFostersNeededItems,
	filterAnimalsForFostersNeededList,
} from "../../lib/fostersNeededList";

export default function FostersNeeded() {
	const { user, profile, isCoordinator } = useProtectedAuth();
	const queryClient = useQueryClient();
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();

	// Cancel dialog state
	const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
	const [cancelTarget, setCancelTarget] = useState<{
		requestId: string;
		name: string;
	} | null>(null);

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

	const animalsData = useMemo(
		() => filterAnimalsForFostersNeededList(allAnimals),
		[allAnimals]
	);

	// Collect all animal IDs and group IDs for pending request check
	const allItemIds = useMemo(() => {
		const animalIds = animalsData.map((a) => a.id);
		const groupIds = groupsData.map((g) => g.id);
		return { animalIds, groupIds };
	}, [animalsData, groupsData]);

	// Fetch pending requests for all displayed items (for fosters only)
	const { data: pendingRequestsMap, refetch: refetchPendingRequests } =
		useQuery<Map<string, FosterRequest>>({
			queryKey: [
				"pending-requests-batch",
				user.id,
				profile.organization_id,
				allItemIds,
			],
			queryFn: async () => {
				if (isCoordinator) {
					return new Map();
				}
				return fetchPendingRequestsForItems(
					allItemIds.animalIds,
					allItemIds.groupIds,
					user.id,
					profile.organization_id
				);
			},
			enabled: !isCoordinator,
		});

	const animalMapById = useMemo(
		() => buildAnimalMapByGroupMembership(allAnimals),
		[allAnimals]
	);

	const groupsWithVisibility = useMemo(
		() => buildGroupsWithFosterVisibility(groupsData, animalMapById),
		[groupsData, animalMapById]
	);

	const animalDataMap = useMemo(
		() => buildFostersNeededAnimalDataMap(allAnimals),
		[allAnimals]
	);

	const combinedItems = useMemo(
		() =>
			combineAndSortFostersNeededItems(
				animalsData,
				groupsWithVisibility,
				animalMapById,
				filters,
				searchTerm
			),
		[animalsData, groupsWithVisibility, animalMapById, filters, searchTerm]
	);

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

	// Refetch all queries
	const handleRefetch = async () => {
		await Promise.all([
			refetchAnimals(),
			refetchGroups(),
			refetchPendingRequests(),
		]);
	};

	// Handle cancel request
	const handleCancelRequest = useCallback(
		async (requestId: string, name: string) => {
			setCancelTarget({ requestId, name });
			setCancelDialogOpen(true);
		},
		[]
	);

	// Confirm cancel request
	const handleConfirmCancel = async (message: string) => {
		if (!cancelTarget) return;

		await cancelFosterRequest(
			cancelTarget.requestId,
			profile.organization_id,
			message
		);

		// Invalidate queries
		await queryClient.invalidateQueries({
			queryKey: ["fosters-needed-all-animals"],
		});
		await queryClient.invalidateQueries({
			queryKey: ["fosters-needed-groups"],
		});
		await refetchPendingRequests();
	};

	return (
		<div className="min-h-screen p-4 bg-gray-50">
			<div className="max-w-5xl mx-auto">
				<div className="mb-6">
					<div className="flex items-center justify-between mb-2">
						<h1 className="text-2xl font-bold text-gray-900">
							Fosters Needed
						</h1>
						<button
							type="button"
							onClick={handleRefetch}
							disabled={isLoading || isRefetching}
							className="inline-flex items-center justify-center gap-2 h-10 w-10 px-0 py-0 sm:h-auto sm:w-auto sm:px-5 sm:py-2.5 text-sm font-medium text-pink-600 bg-pink-50 border border-pink-200 rounded-[36px] hover:bg-pink-100 hover:border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-95"
							aria-label="Refresh fosters needed"
						>
							<ArrowPathIcon
								className={`h-5 w-5 shrink-0 ${
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
											const pendingRequest =
												pendingRequestsMap?.get(
													item.data.id
												);
											return (
												<AnimalCard
													key={`animal-${item.data.id}`}
													animal={item.data}
													foster_visibility={
														item.data
															.foster_visibility
													}
													hasPendingRequest={
														!!pendingRequest
													}
													requestId={pendingRequest?.id}
													onCancelRequest={
														pendingRequest
															? () =>
																	handleCancelRequest(
																		pendingRequest.id,
																		item
																			.data
																			.name ||
																			"Unnamed Animal"
																	)
															: undefined
													}
												/>
											);
										} else {
											const pendingRequest =
												pendingRequestsMap?.get(
													item.data.id
												);
											return (
												<GroupCard
													key={`group-${item.data.id}`}
													group={item.data}
													animalData={animalDataMap}
													foster_visibility={
														item.foster_visibility
													}
													hideEmptyGroupLabel
													hasPendingRequest={
														!!pendingRequest
													}
													requestId={pendingRequest?.id}
													onCancelRequest={
														pendingRequest
															? () =>
																	handleCancelRequest(
																		pendingRequest.id,
																		item
																			.data
																			.name ||
																			"Unnamed Group"
																	)
															: undefined
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

			{/* Cancel Request Dialog */}
			{cancelTarget && (
				<CancelRequestDialog
					isOpen={cancelDialogOpen}
					onClose={() => {
						setCancelDialogOpen(false);
						setCancelTarget(null);
					}}
					onConfirm={handleConfirmCancel}
					animalOrGroupName={cancelTarget.name}
				/>
			)}
		</div>
	);
}
