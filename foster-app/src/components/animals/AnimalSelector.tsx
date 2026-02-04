import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useProtectedAuth } from "../../hooks/useProtectedAuth";
import { fetchAnimals, fetchAnimalsCount } from "../../lib/animalQueries";
import SearchInput from "../shared/SearchInput";
import LoadingSpinner from "../ui/LoadingSpinner";
import Pagination from "../shared/Pagination";
import { FilterChip } from "../shared/Filters";
import { PAGE_SIZES } from "../../lib/paginationConfig";
import AnimalFilters, { type AnimalFilters as AnimalFiltersType } from "./AnimalFilters";
import AnimalCard from "./AnimalCard";
import type { Animal } from "../../types";

interface AnimalSelectorProps {
	isOpen: boolean;
	onClose: () => void;
	onSelect: (animal: Animal) => void;
	excludeAnimalIds?: string[];
	title?: string;
}

const PAGE_SIZE = PAGE_SIZES.ANIMALS_LIST;

export default function AnimalSelector({
	isOpen,
	onClose,
	onSelect,
	excludeAnimalIds = [],
	title = "Select Animal",
}: AnimalSelectorProps) {
	const { profile } = useProtectedAuth();
	const [searchTerm, setSearchTerm] = useState("");
	const [page, setPage] = useState(1);
	const [filters, setFilters] = useState<AnimalFiltersType>({});

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

	const offset = (page - 1) * PAGE_SIZE;

	// Fetch animals with pagination
	const { data: allAnimals = [], isLoading: isLoadingAnimals } = useQuery({
		queryKey: [
			"animal-selector",
			profile.organization_id,
			searchTerm,
			filters,
			page,
			PAGE_SIZE,
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
					"foster_visibility",
					"life_stage",
					"primary_breed",
					"physical_characteristics",
					"medical_needs",
					"behavioral_needs",
					"additional_notes",
					"bio",
				],
				orderBy: "created_at",
				orderDirection: filters.sortByCreatedAt === "oldest" ? "asc" : "desc",
				checkOffline: true,
				limit: PAGE_SIZE,
				offset,
				filters,
				searchTerm,
			});
			return animals.filter(
				(animal) => !excludeAnimalIds.includes(animal.id)
			);
		},
		enabled: isOpen,
	});

	// Fetch animal count for pagination
	const { data: totalCount = 0 } = useQuery({
		queryKey: [
			"animal-selector-count",
			profile.organization_id,
			searchTerm,
			filters,
		],
		queryFn: async () => {
			const count = await fetchAnimalsCount(
				profile.organization_id,
				filters,
				searchTerm
			);
			// Subtract excluded animals from count
			return Math.max(0, count - excludeAnimalIds.length);
		},
		enabled: isOpen,
	});

	const handleSearch = (term: string) => {
		setSearchTerm(term);
		setPage(1); // Reset to page 1 when search changes
	};

	const handleFiltersChange = (newFilters: AnimalFiltersType) => {
		setFilters(newFilters);
		setPage(1); // Reset to page 1 when filter changes
	};

	const handleSelect = (animal: Animal) => {
		onSelect(animal);
		onClose();
	};

	// Generate active filter chips
	const activeFilterChips = useMemo(() => {
		const chips: Array<{ label: string; onRemove: () => void }> = [];

		if (filters.priority === true) {
			chips.push({
				label: "High Priority",
				onRemove: () =>
					handleFiltersChange({
						...filters,
						priority: undefined,
					}),
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
				onRemove: () =>
					handleFiltersChange({
						...filters,
						sex: undefined,
					}),
			});
		}

		if (filters.life_stage) {
			const lifeStageLabels: Record<string, string> = {
				kitten: "Kitten",
				adult: "Adult",
				senior: "Senior",
			};
			chips.push({
				label: `Life Stage: ${lifeStageLabels[filters.life_stage] || filters.life_stage}`,
				onRemove: () =>
					handleFiltersChange({
						...filters,
						life_stage: undefined,
					}),
			});
		}

		if (filters.inGroup === true) {
			chips.push({
				label: "In Group",
				onRemove: () =>
					handleFiltersChange({
						...filters,
						inGroup: undefined,
					}),
			});
		} else if (filters.inGroup === false) {
			chips.push({
				label: "Not In Group",
				onRemove: () =>
					handleFiltersChange({
						...filters,
						inGroup: undefined,
					}),
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
				label: `Status: ${statusLabels[filters.status] || filters.status}`,
				onRemove: () =>
					handleFiltersChange({
						...filters,
						status: undefined,
					}),
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
				label: `Visibility: ${visibilityLabels[filters.foster_visibility] || filters.foster_visibility}`,
				onRemove: () =>
					handleFiltersChange({
						...filters,
						foster_visibility: undefined,
					}),
			});
		}

		if (filters.sortByCreatedAt) {
			chips.push({
				label: `Sort: ${filters.sortByCreatedAt === "oldest" ? "Oldest First" : "Newest First"}`,
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
					className="bg-white rounded-lg shadow-xl w-full h-full md:h-auto md:max-h-[90vh] md:max-w-4xl flex flex-col pointer-events-auto"
					onClick={(e) => e.stopPropagation()}
				>
					{/* Header */}
					<div className="p-4 border-b border-gray-200 flex items-center justify-between">
						<h3 className="text-lg font-semibold text-gray-900">
							{title}
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
								{searchTerm && (
									<FilterChip
										label={`Search: "${searchTerm}"`}
										onRemove={() => handleSearch("")}
									/>
								)}
							</div>
						)}

						{/* Search chip (when no other filters) */}
						{activeFilterChips.length === 0 && searchTerm && (
							<div className="mb-4 flex flex-wrap gap-2">
								<FilterChip
									label={`Search: "${searchTerm}"`}
									onRemove={() => handleSearch("")}
								/>
							</div>
						)}

						{/* Loading State */}
						{isLoadingAnimals && (
							<div className="flex justify-center py-8">
								<LoadingSpinner />
							</div>
						)}

						{/* Animals Grid */}
						{!isLoadingAnimals && (
							<>
								{allAnimals.length === 0 ? (
									<div className="text-center py-8 text-gray-500">
										No animals found
									</div>
								) : (
									<div className="grid gap-1.5 grid-cols-2 min-[375px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
										{allAnimals.map((animal) => (
											<div
												key={animal.id}
												onClick={(e) => {
													e.preventDefault();
													e.stopPropagation();
													handleSelect(animal);
												}}
												onMouseDown={(e) => {
													// Prevent link navigation
													e.preventDefault();
												}}
												className="cursor-pointer transition-all relative rounded-lg hover:ring-4 hover:ring-pink-300 hover:ring-offset-2"
											>
												<div
													style={{
														pointerEvents: "none",
													}}
												>
													<AnimalCard
														animal={animal}
														hideGroupIndicator={false}
													/>
												</div>
											</div>
										))}
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
