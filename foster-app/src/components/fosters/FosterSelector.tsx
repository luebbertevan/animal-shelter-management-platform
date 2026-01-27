import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useProtectedAuth } from "../../hooks/useProtectedAuth";
import { fetchFosters, fetchFostersCount } from "../../lib/fosterQueries";
import { supabase } from "../../lib/supabase";
import SearchInput from "../shared/SearchInput";
import LoadingSpinner from "../ui/LoadingSpinner";
import Pagination from "../shared/Pagination";
import { PAGE_SIZES } from "../../lib/paginationConfig";
import { FosterFiltersContent, type FosterFilters } from "./FosterFilters";

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
	const [filters, setFilters] = useState<FosterFilters>({});

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

	// Fetch fosters
	const offset = (page - 1) * PAGE_SIZE;
	const { data: fosters = [], isLoading: isLoadingFosters } = useQuery({
		queryKey: [
			"foster-selector",
			profile.organization_id,
			searchTerm,
			filters.isCoordinator,
			page,
		],
		queryFn: async () => {
			const allFosters = await fetchFosters(profile.organization_id, {
				fields: ["id", "email", "full_name", "availability", "role"],
				orderBy: "full_name",
				orderDirection: "asc",
				limit: PAGE_SIZE,
				offset,
				searchTerm,
				includeCoordinators: true, // Include both fosters and coordinators by default
				filters, // Apply coordinator filter
			});

			// Filter out excluded fosters
			return allFosters.filter(
				(foster) => !excludeFosterIds.includes(foster.id)
			);
		},
		enabled: isOpen,
	});

	// Fetch foster count
	const { data: totalCount = 0 } = useQuery({
		queryKey: [
			"foster-selector-count",
			profile.organization_id,
			searchTerm,
			filters.isCoordinator,
		],
		queryFn: async () => {
			const count = await fetchFostersCount(
				profile.organization_id,
				true, // Include coordinators in count
				searchTerm,
				filters // Apply coordinator filter
			);
			// Subtract excluded fosters from count
			return Math.max(0, count - excludeFosterIds.length);
		},
		enabled: isOpen,
	});

	// Fetch current assignments count for each foster
	const { data: assignmentsMap = new Map() } = useQuery({
		queryKey: [
			"foster-assignments-count",
			profile.organization_id,
			fosters.map((f) => f.id).join(","),
		],
		queryFn: async () => {
			const map = new Map<string, number>();

			// Fetch animals assigned to these fosters
			const { data: animals, error: animalsError } = await supabase
				.from("animals")
				.select("current_foster_id")
				.in(
					"current_foster_id",
					fosters.map((f) => f.id)
				)
				.eq("organization_id", profile.organization_id);

			if (!animalsError && animals) {
				animals.forEach((animal) => {
					if (animal.current_foster_id) {
						const current = map.get(animal.current_foster_id) || 0;
						map.set(animal.current_foster_id, current + 1);
					}
				});
			}

			// Fetch groups assigned to these fosters
			const { data: groups, error: groupsError } = await supabase
				.from("animal_groups")
				.select("current_foster_id")
				.in(
					"current_foster_id",
					fosters.map((f) => f.id)
				)
				.eq("organization_id", profile.organization_id);

			if (!groupsError && groups) {
				groups.forEach((group) => {
					if (group.current_foster_id) {
						const current = map.get(group.current_foster_id) || 0;
						map.set(group.current_foster_id, current + 1);
					}
				});
			}

			return map;
		},
		enabled: isOpen && fosters.length > 0,
	});

	const handleSearch = (term: string) => {
		setSearchTerm(term);
		setPage(1); // Reset to page 1 when search changes
	};

	const handleFiltersChange = (newFilters: FosterFilters) => {
		setFilters(newFilters);
		setPage(1); // Reset to page 1 when filter changes
	};

	const handleSelect = (fosterId: string, fosterName: string) => {
		onSelect(fosterId, fosterName);
		onClose();
	};

	if (!isOpen) return null;

	const totalPages = Math.ceil(totalCount / PAGE_SIZE);

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
							Select Foster or Coordinator
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
						{/* Search and Filter */}
						<div className="mb-4 space-y-3">
							<SearchInput
								value={searchTerm}
								onSearch={handleSearch}
								placeholder="Search by name..."
							/>
							{/* Coordinator Filters */}
							<FosterFiltersContent
								filters={filters}
								onFiltersChange={handleFiltersChange}
							/>
						</div>

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
											const assignmentCount =
												assignmentsMap.get(foster.id) || 0;
											const fosterName =
												foster.full_name ||
												foster.email ||
												"Unknown";

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

															{/* Assignment Count */}
															{assignmentCount > 0 && (
																<span className="text-xs text-gray-500">
																	{assignmentCount}{" "}
																	{assignmentCount === 1
																		? "assignment"
																		: "assignments"}
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
											totalItems={totalCount}
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

