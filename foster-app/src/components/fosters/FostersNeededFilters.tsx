import type {
	SexSpayNeuterStatus,
	LifeStage,
	FosterVisibility,
	AnimalStatus,
} from "../../types";
import { useProtectedAuth } from "../../hooks/useProtectedAuth";
import {
	PriorityFilter,
	SelectFilter,
	SortFilter,
	FilterButton,
} from "../shared/Filters";
import Button from "../ui/Button";

export interface FostersNeededFilters extends Record<string, unknown> {
	priority?: boolean;
	sex?: SexSpayNeuterStatus;
	life_stage?: LifeStage;
	availability?: FosterVisibility; // Renamed from foster_visibility for UI clarity
	status?: AnimalStatus; // Only visible to coordinators
	sortByCreatedAt?: "newest" | "oldest";
	type?: "groups" | "singles" | "both"; // New filter: groups only, singles only, or both
}

interface FostersNeededFiltersProps {
	filters: FostersNeededFilters;
	onFiltersChange: (filters: FostersNeededFilters) => void;
}

// Sex/Spay Neuter options
const sexOptions: { value: SexSpayNeuterStatus; label: string }[] = [
	{ value: "male", label: "Male" },
	{ value: "female", label: "Female" },
	{ value: "spayed_female", label: "Spayed Female" },
	{ value: "neutered_male", label: "Neutered Male" },
];

// Life stage options
const lifeStageOptions: { value: LifeStage; label: string }[] = [
	{ value: "kitten", label: "Kitten" },
	{ value: "adult", label: "Adult" },
	{ value: "senior", label: "Senior" },
];

// Availability options (foster_visibility without "not_visible")
const availabilityOptions: { value: FosterVisibility; label: string }[] = [
	{ value: "available_now", label: "Available Now" },
	{ value: "available_future", label: "Available Future" },
	{ value: "foster_pending", label: "Foster Pending" },
];

// Status options (for coordinators only)
const statusOptions: { value: AnimalStatus; label: string }[] = [
	{ value: "in_foster", label: "In Foster" },
	{ value: "adopted", label: "Adopted" },
	{ value: "medical_hold", label: "Medical Hold" },
	{ value: "in_shelter", label: "In Shelter" },
	{ value: "transferring", label: "Transferring" },
];

// Type options (groups/singles/both)
const typeOptions: { value: "groups" | "singles" | "both"; label: string }[] = [
	{ value: "both", label: "Both" },
	{ value: "groups", label: "Groups Only" },
	{ value: "singles", label: "Singles Only" },
];

// Sort options
const sortOptions: { value: "newest" | "oldest"; label: string }[] = [
	{ value: "newest", label: "Newest First" },
	{ value: "oldest", label: "Oldest First" },
];

// Helper function to count active filters
function countActiveFilters(filters: FostersNeededFilters): number {
	let count = 0;
	if (filters.priority === true) count++;
	if (filters.sex) count++;
	if (filters.life_stage) count++;
	if (filters.availability) count++;
	if (filters.status) count++;
	if (filters.type && filters.type !== "both") count++; // Only count if not default
	if (filters.sortByCreatedAt) count++;
	return count;
}

// Helper function to clear all filters
function clearFilters(): FostersNeededFilters {
	return { type: "both" }; // Default type is "both"
}

export default function FostersNeededFilters({
	filters,
	onFiltersChange,
}: FostersNeededFiltersProps) {
	const { isCoordinator } = useProtectedAuth();
	const activeFilterCount = countActiveFilters(filters);
	const hasActiveFilters = activeFilterCount > 0;

	const handleFilterChange = <K extends keyof FostersNeededFilters>(
		key: K,
		value: FostersNeededFilters[K]
	) => {
		// Convert empty/falsy values to undefined to clear the filter
		let normalizedValue: FostersNeededFilters[K] | undefined;

		if (value === false || value === undefined) {
			normalizedValue = undefined;
		} else if (typeof value === "string" && value === "") {
			normalizedValue = undefined;
		} else {
			normalizedValue = value;
		}

		const updatedFilters = {
			...filters,
			[key]: normalizedValue,
		};

		// Ensure type defaults to "both" if undefined
		if (updatedFilters.type === undefined) {
			updatedFilters.type = "both";
		}

		onFiltersChange(updatedFilters);
	};

	const handleClearFilters = () => {
		onFiltersChange(clearFilters());
	};

	return (
		<FilterButton
			title="Filters"
			activeCount={activeFilterCount}
			defaultOpen={false}
			storageKey="fosters-needed-filters-open"
		>
			<div className="space-y-3">
				{/* Priority Filter - on its own line */}
				<PriorityFilter
					value={filters.priority || false}
					onChange={(value) => handleFilterChange("priority", value)}
					compact={true}
				/>

				{/* Dropdown filters - stacked vertically */}
				<div className="space-y-2.5 w-fit">
					{/* Type Filter - Groups/Singles/Both */}
					<SelectFilter
						value={filters.type || "both"}
						onChange={(value) =>
							handleFilterChange(
								"type",
								value as "groups" | "singles" | "both"
							)
						}
						options={typeOptions}
						placeholder="Include Groups"
						compact={true}
					/>

					{/* Sex Filter */}
					<SelectFilter
						value={filters.sex || ""}
						onChange={(value) =>
							handleFilterChange(
								"sex",
								value as SexSpayNeuterStatus
							)
						}
						options={sexOptions}
						placeholder="All Sexes"
						compact={true}
					/>

					{/* Life Stage Filter */}
					<SelectFilter
						value={filters.life_stage || ""}
						onChange={(value) =>
							handleFilterChange("life_stage", value as LifeStage)
						}
						options={lifeStageOptions}
						placeholder="All Ages"
						compact={true}
					/>

					{/* Availability Filter (foster_visibility without not_visible) */}
					<SelectFilter
						value={filters.availability || ""}
						onChange={(value) =>
							handleFilterChange(
								"availability",
								value as FosterVisibility
							)
						}
						options={availabilityOptions}
						placeholder="All Availability"
						compact={true}
					/>

					{/* Status Filter - Only for coordinators */}
					{isCoordinator && (
						<SelectFilter
							value={filters.status || ""}
							onChange={(value) =>
								handleFilterChange(
									"status",
									value as AnimalStatus
								)
							}
							options={statusOptions}
							placeholder="All Statuses"
							compact={true}
						/>
					)}

					{/* Sort by Created At */}
					<SortFilter
						value={filters.sortByCreatedAt || "newest"}
						options={sortOptions}
						onChange={(value) =>
							handleFilterChange(
								"sortByCreatedAt",
								value as "newest" | "oldest"
							)
						}
						compact={true}
					/>
				</div>

				{/* Clear Filters Button */}
				{hasActiveFilters && (
					<div className="pt-2 border-t border-gray-200">
						<Button
							type="button"
							variant="outline"
							onClick={handleClearFilters}
							className="w-full text-sm py-1.5"
						>
							Clear All Filters
						</Button>
					</div>
				)}
			</div>
		</FilterButton>
	);
}
