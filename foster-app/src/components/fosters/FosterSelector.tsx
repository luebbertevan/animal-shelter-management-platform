import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useProtectedAuth } from "../../hooks/useProtectedAuth";
import { fetchFosters, fetchFostersCount } from "../../lib/fosterQueries";
import { fetchAnimals } from "../../lib/animalQueries";
import { fetchGroups } from "../../lib/groupQueries";
import { supabase } from "../../lib/supabase";
import SearchInput from "../shared/SearchInput";
import LoadingSpinner from "../ui/LoadingSpinner";
import Pagination from "../shared/Pagination";
import { FilterChip } from "../shared/Filters";
import { PAGE_SIZES } from "../../lib/paginationConfig";
import { getAssignmentBadgeText } from "../../lib/metadataUtils";
import FosterFilters, {
	type FosterFilters as FosterFiltersType,
} from "./FosterFilters";

interface AssignmentCounts {
	animalCount: number;
	groupCount: number;
}

interface FosterSelectorProps {
	isOpen: boolean;
	onClose: () => void;
	onSelect: (fosterId: string, fosterName: string) => void;
	excludeFosterIds?: string[];
}

const PAGE_SIZE = PAGE_SIZES.FOSTERS_LIST;

export default function FosterSelector({
	isOpen,
	onClose,
	onSelect,
	excludeFosterIds = [],
}: FosterSelectorProps) {
	const { profile } = useProtectedAuth();
	const [searchTerm, setSearchTerm] = useState("");
	const [page, setPage] = useState(1);
	const [filters, setFilters] = useState<FosterFiltersType>({});

	// Close on Escape key
	useEffect(() => {
		if (!isOpen) return;

		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onClose();
			}
		};

		document.addEventListener("keydown", handleEscape);
		return () => document.removeEventListener("keydown", handleEscape);
	}, [isOpen, onClose]);

	// If "currently fostering" filter is active, we need all fosters for client-side filtering
	// Otherwise, we can use server-side pagination
	const needsAllFosters = filters.currentlyFostering === true;
	const offset = (page - 1) * PAGE_SIZE;

	// Fetch fosters
	const { data: allFosters = [], isLoading: isLoadingFosters } = useQuery({
		queryKey: [
			"foster-selector",
			profile.organization_id,
			searchTerm,
			filters,
			needsAllFosters ? "all" : page,
			needsAllFosters ? "all" : PAGE_SIZE,
		],
		queryFn: async () => {
			// When "currently fostering" filter is active, fetch all fosters for client-side filtering
			// Otherwise, use server-side pagination
			if (needsAllFosters) {
				const allFosters = await fetchFosters(profile.organization_id, {
					fields: ["id", "email", "full_name", "availability", "role"],
					orderBy: "full_name",
					orderDirection: "asc",
					checkOffline: true,
					includeCoordinators: true,
					searchTerm,
					filters,
				});
				return allFosters.filter(
					(foster) => !excludeFosterIds.includes(foster.id)
				);
			} else {
				const allFosters = await fetchFosters(profile.organization_id, {
					fields: ["id", "email", "full_name", "availability", "role"],
					orderBy: "full_name",
					orderDirection: "asc",
					checkOffline: true,
					includeCoordinators: true,
					limit: PAGE_SIZE,
					offset,
					searchTerm,
					filters,
				});
				return allFosters.filter(
					(foster) => !excludeFosterIds.includes(foster.id)
				);
			}
		},
		enabled: isOpen,
	});

	// Fetch animals and groups to check "currently fostering" filter
	// Only fetch if the filter is active
	const { data: animalsData = [] } = useQuery({
		queryKey: ["animals-for-foster-selector", profile.organization_id],
		queryFn: () => {
			return fetchAnimals(profile.organization_id, {
				fields: ["id", "current_foster_id"],
			});
		},
		enabled: isOpen && filters.currentlyFostering === true,
	});

	const { data: groupsData = [] } = useQuery({
		queryKey: ["groups-for-foster-selector", profile.organization_id],
		queryFn: () => {
			return fetchGroups(profile.organization_id, {
				fields: ["id", "current_foster_id"],
			});
		},
		enabled: isOpen && filters.currentlyFostering === true,
	});

	// Filter fosters by "currently fostering" if filter is active
	const filteredFosters = useMemo(() => {
		if (filters.currentlyFostering !== true) {
			return allFosters;
		}

		// Create a set of foster IDs that have animals or groups assigned
		const fosteringFosterIds = new Set<string>();
		animalsData.forEach((animal) => {
			if (animal.current_foster_id) {
				fosteringFosterIds.add(animal.current_foster_id);
			}
		});
		groupsData.forEach((group) => {
			if (group.current_foster_id) {
				fosteringFosterIds.add(group.current_foster_id);
			}
		});

		// Filter fosters to only those in the set
		return allFosters.filter((foster) => fosteringFosterIds.has(foster.id));
	}, [allFosters, filters.currentlyFostering, animalsData, groupsData]);

	// Paginate the filtered fosters (client-side pagination when "currently fostering" is active)
	const fosters = useMemo(() => {
		if (needsAllFosters) {
			// Client-side pagination
			const startIndex = (page - 1) * PAGE_SIZE;
			const endIndex = startIndex + PAGE_SIZE;
			return filteredFosters.slice(startIndex, endIndex);
		}
		return filteredFosters;
	}, [filteredFosters, needsAllFosters, page]);

	// Fetch foster count for pagination (with search, but "currently fostering" handled client-side)
	const { data: totalCount = 0 } = useQuery({
		queryKey: [
			"foster-selector-count",
			profile.organization_id,
			searchTerm,
			filters,
		],
		queryFn: async () => {
			const count = await fetchFostersCount(
				profile.organization_id,
				true, // Include coordinators in count
				searchTerm,
				filters // Apply filters
			);
			// Subtract excluded fosters from count
			return Math.max(0, count - excludeFosterIds.length);
		},
		enabled: isOpen && !needsAllFosters,
	});

	// Calculate total count - use filtered count if "currently fostering" is active
	const adjustedTotalCount = useMemo(() => {
		if (filters.currentlyFostering === true) {
			return filteredFosters.length;
		}
		return totalCount;
	}, [filters.currentlyFostering, totalCount, filteredFosters.length]);

	// Fetch assignment counts (animals and groups) for fosters
	const { data: assignmentCounts = new Map<string, AssignmentCounts>() } =
		useQuery<Map<string, AssignmentCounts>, Error>({
			queryKey: [
				"foster-assignment-counts-selector",
				profile.organization_id,
				fosters.map((f) => f.id).join(","),
			],
			queryFn: async () => {
				if (fosters.length === 0) {
					return new Map<string, AssignmentCounts>();
				}

				const fosterIds = fosters.map((f) => f.id);

				// Fetch individual animals (not in groups) assigned to these fosters
				const { data: animalsData, error: animalsError } = await supabase
					.from("animals")
					.select("current_foster_id")
					.eq("organization_id", profile.organization_id)
					.in("current_foster_id", fosterIds)
					.is("group_id", null);

				if (animalsError) {
					throw animalsError;
				}

				// Fetch groups assigned to these fosters
				const { data: groupsData, error: groupsError } = await supabase
					.from("animal_groups")
					.select("current_foster_id")
					.eq("organization_id", profile.organization_id)
					.in("current_foster_id", fosterIds);

				if (groupsError) {
					throw groupsError;
				}

				// Count animals per foster
				const animalCounts = new Map<string, number>();
				(animalsData as Array<{ current_foster_id: string }>).forEach(
					(row) => {
						const id = row.current_foster_id;
						if (!id) return;
						animalCounts.set(id, (animalCounts.get(id) ?? 0) + 1);
					}
				);

				// Count groups per foster
				const groupCounts = new Map<string, number>();
				(groupsData as Array<{ current_foster_id: string }>).forEach(
					(row) => {
						const id = row.current_foster_id;
						if (!id) return;
						groupCounts.set(id, (groupCounts.get(id) ?? 0) + 1);
					}
				);

				// Combine into AssignmentCounts map
				const map = new Map<string, AssignmentCounts>();
				fosterIds.forEach((fosterId) => {
					const animalCount = animalCounts.get(fosterId) ?? 0;
					const groupCount = groupCounts.get(fosterId) ?? 0;
					if (animalCount > 0 || groupCount > 0) {
						map.set(fosterId, { animalCount, groupCount });
					}
				});

				return map;
			},
			enabled: isOpen && fosters.length > 0,
		});

	const handleSearch = (term: string) => {
		setSearchTerm(term);
		setPage(1); // Reset to page 1 when search changes
	};

	const handleFiltersChange = (newFilters: FosterFiltersType) => {
		setFilters(newFilters);
		setPage(1); // Reset to page 1 when filter changes
	};

	const handleSelect = (fosterId: string, fosterName: string) => {
		onSelect(fosterId, fosterName);
		onClose();
	};

	// Generate active filter chips
	const activeFilterChips = useMemo(() => {
		const chips: Array<{ label: string; onRemove: () => void }> = [];

		if (filters.currentlyFostering === true) {
			chips.push({
				label: "Currently Fostering",
				onRemove: () =>
					handleFiltersChange({
						...filters,
						currentlyFostering: undefined,
					}),
			});
		}

		if (filters.isCoordinator !== undefined) {
			chips.push({
				label:
					filters.isCoordinator === true
						? "Coordinators Only"
						: "Fosters Only",
				onRemove: () =>
					handleFiltersChange({
						...filters,
						isCoordinator: undefined,
					}),
			});
		}

		if (filters.sortByCreatedAt) {
			chips.push({
				label: `Sort: ${
					filters.sortByCreatedAt === "oldest"
						? "Oldest First"
						: "Newest First"
				}`,
				onRemove: () =>
					handleFiltersChange({
						...filters,
						sortByCreatedAt: undefined,
					}),
			});
		}

		return chips;
	}, [filters]);

	if (!isOpen) return null;

	const totalPages = Math.ceil(adjustedTotalCount / PAGE_SIZE);

	return (
		<>
			{/* Backdrop */}
			<div
				className="fixed inset-x-0 top-16 bottom-0 z-40"
				style={{
					backgroundColor: "rgba(0, 0, 0, 0.65)",
					backdropFilter: "blur(4px)",
					WebkitBackdropFilter: "blur(4px)",
				}}
				onClick={onClose}
			/>

			{/* Modal */}
			<div className="fixed inset-x-0 top-16 bottom-0 z-50 flex items-center justify-center p-4 md:p-8 pointer-events-none">
				<div
					className="bg-white rounded-lg shadow-xl w-full h-full md:h-auto md:max-h-[90vh] md:max-w-2xl flex flex-col pointer-events-auto"
					onClick={(e) => e.stopPropagation()}
				>
					{/* Header */}
					<div className="p-4 border-b border-gray-200 flex items-center justify-between">
						<h3 className="text-lg font-semibold text-gray-900">
							Select Foster
						</h3>
						<button
							type="button"
							onClick={onClose}
							className="px-2 py-1 text-xs font-medium border-2 border-pink-500 text-pink-600 rounded-md hover:bg-pink-50 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 transition-colors"
						>
							Cancel
						</button>
					</div>

					{/* Content */}
					<div className="flex-1 overflow-y-auto p-4">
						{/* Search Input and Filters - Inline Layout */}
						<div className="mb-4">
							<div className="flex items-center gap-2">
								<SearchInput
									value={searchTerm}
									onSearch={handleSearch}
									placeholder="Search by name..."
								/>
								<FosterFilters
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

						{/* Loading State */}
						{isLoadingFosters && (
							<div className="flex justify-center py-8">
								<LoadingSpinner />
							</div>
						)}

						{/* Fosters List */}
						{!isLoadingFosters && (
							<>
								{fosters.length === 0 ? (
									<div className="text-center py-8 text-gray-500">
										No fosters or coordinators found
									</div>
								) : (
									<div className="space-y-2">
										{fosters.map((foster) => {
											const fosterName =
												foster.full_name ||
												foster.email ||
												"Unknown";
											const counts = assignmentCounts.get(foster.id);
											const assignmentBadgeText = counts
												? getAssignmentBadgeText(
														counts.animalCount,
														counts.groupCount
													)
												: null;

											return (
												<button
													key={foster.id}
													type="button"
													onClick={() =>
														handleSelect(
															foster.id,
															fosterName
														)
													}
													className="w-full text-left p-4 border border-gray-200 rounded-md hover:bg-pink-50 hover:border-pink-300 transition-colors"
												>
													<div className="flex items-center justify-between">
														<div className="flex-1">
															<div className="flex items-center gap-2">
																<span className="font-medium text-gray-900">
																	{fosterName}
																</span>
																{foster.role === "coordinator" && (
																	<span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">
																		Coordinator
																	</span>
																)}
															</div>
															<div className="text-sm text-gray-500 mt-1">
																{foster.email}
															</div>
														</div>
														<div className="flex items-center gap-3 ml-4">
															{/* Availability Status - only show for fosters, not coordinators */}
															{foster.role === "foster" &&
																foster.availability === true && (
																	<span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">
																		Available
																	</span>
																)}
															{foster.role === "foster" &&
																foster.availability === false && (
																	<span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
																		Not Available
																	</span>
																)}

															{/* Assignment Badge */}
															{assignmentBadgeText && (
																<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
																	{assignmentBadgeText}
																</span>
															)}
														</div>
													</div>
												</button>
											);
										})}
									</div>
								)}

								{/* Pagination */}
								{totalPages > 1 && (
									<div className="mt-4">
										<Pagination
											currentPage={page}
											totalPages={totalPages}
											onPageChange={setPage}
											totalItems={adjustedTotalCount}
											itemsPerPage={PAGE_SIZE}
										/>
									</div>
								)}
							</>
						)}
					</div>
				</div>
			</div>
		</>
	);
}

