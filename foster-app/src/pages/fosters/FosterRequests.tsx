import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { useProtectedAuth } from "../../hooks/useProtectedAuth";
import type { LifeStage, PhotoMetadata } from "../../types";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import AnimalCard from "../../components/animals/AnimalCard";
import GroupCard from "../../components/animals/GroupCard";
import Pagination from "../../components/shared/Pagination";
import SearchInput from "../../components/shared/SearchInput";
import { FilterChip } from "../../components/shared/Filters";
import FosterRequestsFilters, {
	type FosterRequestsFilters as FosterRequestsFiltersType,
} from "../../components/fosters/FosterRequestsFilters";
import {
	fetchOrgPendingRequests,
	type FosterRequestWithDetails,
} from "../../lib/fosterRequestQueries";
import { fetchAnimals } from "../../lib/animalQueries";
import { isOffline } from "../../lib/errorUtils";
import { filtersToQueryParams, queryParamsToFilters } from "../../lib/filterUtils";

type RequestCardItem =
	| {
			type: "animal";
			key: string;
			requests: FosterRequestWithDetails[];
			requestCount: number;
			animal: NonNullable<FosterRequestWithDetails["animal"]>;
			priority: boolean;
			sortTimestamp: string; // ISO (request.created_at)
			requestedByLabel: string; // "Requested by X" or "X pending requests"
	  }
	| {
			type: "group";
			key: string;
			requests: FosterRequestWithDetails[];
			requestCount: number;
			group: NonNullable<FosterRequestWithDetails["group"]>;
			priority: boolean;
			sortTimestamp: string; // ISO (request.created_at)
			requestedByLabel: string; // "Requested by X" or "X pending requests"
	  };

export default function FosterRequests() {
	const { user, profile, isCoordinator } = useProtectedAuth();
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();

	const {
		filters: parsedFilters,
		searchTerm,
		page,
		pageSize,
	} = useMemo(() => {
		return queryParamsToFilters<FosterRequestsFiltersType>(searchParams, {});
	}, [searchParams]);

	const filters = useMemo(() => parsedFilters, [parsedFilters]);

	// Fetch pending requests
	const {
		data: pendingRequests = [],
		isLoading: isLoadingRequests,
		isError: isErrorRequests,
		error: requestsError,
		refetch: refetchRequests,
		isRefetching: isRefetchingRequests,
	} = useQuery({
		queryKey: ["foster-requests", user.id, profile.organization_id],
		queryFn: async () =>
			fetchOrgPendingRequests(profile.organization_id, {
				// We sort client-side to match FostersNeeded pattern
				sortDirection: "desc",
			}),
		enabled: isCoordinator,
	});

	// Fetch all animals for GroupCard photos/life_stage
	const { data: allAnimals = [] } = useQuery({
		queryKey: ["all-animals-for-requests", user.id, profile.organization_id],
		queryFn: () =>
			fetchAnimals(profile.organization_id, {
				fields: ["id", "photos", "life_stage"],
			}),
		enabled: isCoordinator,
	});

	// Create animal data map for GroupCard
	const animalDataMap = useMemo(() => {
		const map = new Map<
			string,
			{ photos?: PhotoMetadata[]; life_stage?: LifeStage }
		>();
		allAnimals.forEach((animal) => {
			map.set(animal.id, {
				photos: animal.photos,
				life_stage: animal.life_stage,
			});
		});
		return map;
	}, [allAnimals]);

	// Group, search, filter, sort (by request date), then paginate — matches FostersNeeded approach
	const requestItems = useMemo<RequestCardItem[]>(() => {
		const grouped = new Map<string, FosterRequestWithDetails[]>();

		for (const req of pendingRequests) {
			const key = req.animal_id ? `animal:${req.animal_id}` : `group:${req.group_id}`;
			if (!grouped.has(key)) grouped.set(key, []);
			grouped.get(key)!.push(req);
		}

		let items: RequestCardItem[] = [];

		for (const [key, requests] of grouped.entries()) {
			const first = requests[0];
			const requestCount = requests.length;
			const createdAts = requests.map((r) => r.created_at);

			// For sorting by request date, use the newest/oldest request timestamp for the item.
			const newest = createdAts.reduce((a, b) => (a > b ? a : b));
			const oldest = createdAts.reduce((a, b) => (a < b ? a : b));
			const sortTimestamp =
				(filters.sortByRequestDate || "newest") === "oldest" ? oldest : newest;

			if (first.animal) {
				const priority = !!first.animal.priority;
				items.push({
					type: "animal",
					key,
					requests,
					requestCount,
					animal: first.animal,
					priority,
					sortTimestamp,
					requestedByLabel:
						requestCount === 1
							? `Requested by ${first.foster_name}`
							: `${requestCount} requests`,
				});
			} else if (first.group) {
				const priority = !!first.group.priority;
				items.push({
					type: "group",
					key,
					requests,
					requestCount,
					group: first.group,
					priority,
					sortTimestamp,
					requestedByLabel:
						requestCount === 1
							? `Requested by ${first.foster_name}`
							: `${requestCount} requests`,
				});
			}
		}

		// Priority filter
		if (filters.priority === true) {
			items = items.filter((i) => i.priority);
		}

		// Search filter (entity name + any foster names)
		const term = searchTerm.trim().toLowerCase();
		if (term) {
			items = items.filter((i) => {
				const entityName =
					i.type === "animal"
						? i.animal.name || "Unnamed Animal"
						: i.group.name || "Unnamed Group";
				const fosterNames = i.requests.map((r) => r.foster_name).join(" ");
				const haystack = `${entityName} ${fosterNames}`.toLowerCase();
				return haystack.includes(term);
			});
		}

		// Sort by request date (not entity created date)
		items.sort((a, b) => {
			if ((filters.sortByRequestDate || "newest") === "oldest") {
				return a.sortTimestamp.localeCompare(b.sortTimestamp);
			}
			return b.sortTimestamp.localeCompare(a.sortTimestamp);
		});

		return items;
	}, [pendingRequests, filters.priority, filters.sortByRequestDate, searchTerm]);

	const totalItems = requestItems.length;
	const totalPages = Math.ceil(totalItems / pageSize);

	const paginatedItems = useMemo(() => {
		const startIndex = (page - 1) * pageSize;
		const endIndex = startIndex + pageSize;
		return requestItems.slice(startIndex, endIndex);
	}, [requestItems, page, pageSize]);

	const isLoading = isLoadingRequests;
	const isError = isErrorRequests;
	const error = requestsError;

	const handleFiltersChange = (newFilters: FosterRequestsFiltersType) => {
		const params = filtersToQueryParams(newFilters, searchTerm, 1, pageSize);
		navigate(`/foster-requests?${params.toString()}`, { replace: true });
	};

	const handleSearch = (term: string) => {
		const params = filtersToQueryParams(filters, term, 1, pageSize);
		navigate(`/foster-requests?${params.toString()}`, { replace: true });
	};

	const handlePageChange = (newPage: number) => {
		const params = filtersToQueryParams(filters, searchTerm, newPage, pageSize);
		navigate(`/foster-requests?${params.toString()}`, { replace: true });
	};

	const activeFilterChips = useMemo(() => {
		const chips: Array<{ label: string; onRemove: () => void }> = [];

		const remove = (patch: Partial<FosterRequestsFiltersType>) => () => {
			handleFiltersChange({ ...filters, ...patch });
		};

		if (filters.priority === true) {
			chips.push({ label: "High Priority", onRemove: remove({ priority: undefined }) });
		}
		if (filters.sortByRequestDate === "oldest") {
			chips.push({
				label: "Request date: oldest first",
				onRemove: remove({ sortByRequestDate: undefined }),
			});
		}

		return chips;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [filters]);

	// Show access denied for non-coordinators
	if (!isCoordinator) {
		return (
			<div className="min-h-screen p-4 bg-gray-50">
				<div className="max-w-6xl mx-auto">
					<div className="bg-white rounded-lg shadow-sm p-6">
						<p className="text-gray-600">
							This page is only accessible to coordinators.
						</p>
					</div>
				</div>
			</div>
		);
	}

	if (isLoading) {
		return (
			<div className="min-h-screen p-4 bg-gray-50">
				<div className="max-w-6xl mx-auto">
					<div className="bg-white rounded-lg shadow-sm p-6">
						<LoadingSpinner message="Loading foster requests..." />
					</div>
				</div>
			</div>
		);
	}

	if (isError) {
		return (
			<div className="min-h-screen p-4 bg-gray-50">
				<div className="max-w-6xl mx-auto">
					<div className="bg-white rounded-lg shadow-sm p-6 border border-red-200">
						<div className="text-red-700">
							<p className="font-medium mb-4">
								{error instanceof Error
									? error.message
									: "Unable to load foster requests. Please try again."}
							</p>
							{isOffline() && (
								<p className="text-sm mb-4">
									Unable to connect to the server. Please
									check your internet connection and try
									again.
								</p>
							)}
							<button
								onClick={() => refetchRequests()}
								className="text-sm text-pink-600 hover:text-pink-800 flex items-center gap-1"
							>
								<ArrowPathIcon className="w-4 h-4" />
								Retry
							</button>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen p-4 bg-gray-50">
			<div className="max-w-6xl mx-auto">
				<div className="bg-white rounded-lg shadow-sm p-6">
					{/* Header */}
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
						<div>
							<h1 className="text-2xl font-bold text-gray-900">
								Foster Requests
							</h1>
							<p className="text-sm text-gray-500 mt-1">
								{totalItems} pending{" "}
								{totalItems === 1 ? "request" : "requests"}
							</p>
						</div>
						<button
							type="button"
							onClick={() => refetchRequests()}
							disabled={isLoading || isRefetchingRequests}
							className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 text-sm font-medium text-pink-600 bg-pink-50 border border-pink-200 rounded-md hover:bg-pink-100 hover:border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-95"
							aria-label="Refresh foster requests"
						>
							<ArrowPathIcon
								className={`h-4 w-4 sm:h-5 sm:w-5 ${
									isRefetchingRequests ? "animate-spin" : ""
								}`}
							/>
							<span className="hidden sm:inline">Refresh</span>
						</button>
					</div>

					{/* Search + Filters (matches FostersNeeded layout) */}
					<div className="mb-4">
						<div className="flex items-center gap-2">
							<SearchInput
								value={searchTerm}
								onSearch={handleSearch}
								disabled={isLoading}
							/>
							<FosterRequestsFilters
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
					{requestItems.length === 0 ? (
						<div className="py-12 text-center">
							<p className="text-gray-500">
								No pending foster requests.
							</p>
						</div>
					) : (
						<>
							{/* Grid of cards */}
							<div className="grid gap-1.5 grid-cols-1 min-[375px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
								{paginatedItems.map((item) =>
									renderRequestCardItem(item, animalDataMap)
								)}
							</div>

							{/* Pagination */}
							{totalPages > 1 && (
								<div className="mt-6">
									<Pagination
										currentPage={page}
										totalPages={totalPages}
										onPageChange={handlePageChange}
										totalItems={totalItems}
										itemsPerPage={pageSize}
									/>
								</div>
							)}
						</>
					)}
				</div>
			</div>
		</div>
	);
}

/**
 * Render the appropriate card for a request item (animal or group)
 */
function renderRequestCardItem(
	item: RequestCardItem,
	animalDataMap: Map<
		string,
		{ photos?: PhotoMetadata[]; life_stage?: LifeStage }
	>
) {
	if (item.type === "animal") {
		const singleRequest = item.requestCount === 1 ? item.requests[0] : null;
		return (
			<div key={item.key} className="relative">
				<AnimalCard
					animal={{
						id: item.animal.id,
						name: item.animal.name || undefined,
						status: item.animal.status as
							| "in_foster"
							| "adopted"
							| "medical_hold"
							| "in_shelter"
							| "transferring",
						priority: item.animal.priority || undefined,
						photos: item.animal.photos || undefined,
						date_of_birth: item.animal.date_of_birth || undefined,
						group_id: item.animal.group_id || undefined,
					}}
					requestedByLabel={item.requestedByLabel}
					requestedByFosterId={singleRequest?.foster_profile_id}
				/>
			</div>
		);
	}

	if (item.type === "group") {
		const singleRequest = item.requestCount === 1 ? item.requests[0] : null;
		return (
			<div key={item.key} className="relative">
				<GroupCard
					group={{
						id: item.group.id,
						name: item.group.name || undefined,
						animal_ids: item.group.animal_ids || [],
						priority: item.group.priority || undefined,
						group_photos: item.group.group_photos || undefined,
					}}
					animalData={animalDataMap}
					requestedByLabel={item.requestedByLabel}
					requestedByFosterId={singleRequest?.foster_profile_id}
				/>
			</div>
		);
	}

	// Fallback - should not happen
	return null;
}

