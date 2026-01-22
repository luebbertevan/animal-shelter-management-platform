import type {
	AnimalStatus,
	SexSpayNeuterStatus,
	LifeStage,
	FosterVisibility,
} from "../../types";
import {
	PriorityFilter,
	SelectFilter,
	SortFilter,
	FilterButton,
} from "../shared/Filters";
import Button from "../ui/Button";

export interface AnimalFilters extends Record<string, unknown> {
	priority?: boolean;
	sex?: SexSpayNeuterStatus;
	life_stage?: LifeStage;
	inGroup?: boolean; // true = only in group, false = not in group, undefined = include groups (all)
	status?: AnimalStatus;
	foster_visibility?: FosterVisibility;
	sortByCreatedAt?: "newest" | "oldest";
}

interface AnimalFiltersProps {
	filters: AnimalFilters;
	onFiltersChange: (filters: AnimalFilters) => void;
}

// Status options
const statusOptions: { value: AnimalStatus; label: string }[] = [
	{ value: "in_foster", label: "In Foster" },
	{ value: "adopted", label: "Adopted" },
	{ value: "medical_hold", label: "Medical Hold" },
	{ value: "in_shelter", label: "In Shelter" },
	{ value: "transferring", label: "Transferring" },
];

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

// Foster visibility options
const fosterVisibilityOptions: { value: FosterVisibility; label: string }[] = [
	{ value: "available_now", label: "Available Now" },
	{ value: "available_future", label: "Available Future" },
	{ value: "foster_pending", label: "Foster Pending" },
	{ value: "not_visible", label: "Not Visible" },
];

// Sort options
const sortOptions: { value: "newest" | "oldest"; label: string }[] = [
	{ value: "newest", label: "Newest First" },
	{ value: "oldest", label: "Oldest First" },
];

// Helper function to count active filters
function countActiveFilters(filters: AnimalFilters): number {
	let count = 0;
	if (filters.priority === true) count++;
	if (filters.sex) count++;
	if (filters.life_stage) count++;
	if (filters.inGroup === true || filters.inGroup === false) count++;
	if (filters.status) count++;
	if (filters.foster_visibility) count++;
	if (filters.sortByCreatedAt) count++;
	return count;
}

// Helper function to clear all filters
function clearFilters(): AnimalFilters {
	return {};
}

export default function AnimalFilters({
	filters,
	onFiltersChange,
}: AnimalFiltersProps) {
	const activeFilterCount = countActiveFilters(filters);
	const hasActiveFilters = activeFilterCount > 0;

	const handleFilterChange = <K extends keyof AnimalFilters>(
		key: K,
		value: AnimalFilters[K]
	) => {
		// Convert empty/falsy values to undefined to clear the filter
		// Handle different types separately to avoid TypeScript errors
		let normalizedValue: AnimalFilters[K] | undefined;

		// Special handling for inGroup: preserve false
		if (key === "inGroup") {
			normalizedValue = value as boolean | undefined;
		} else if (value === false || value === undefined) {
			normalizedValue = undefined;
		} else {
			// For string values, check if empty
			const stringValue = value as string | boolean | "newest" | "oldest";
			if (typeof stringValue === "string" && stringValue === "") {
				normalizedValue = undefined;
			} else {
				normalizedValue = value;
			}
		}

		onFiltersChange({
			...filters,
			[key]: normalizedValue,
		});
	};

	const handleClearFilters = () => {
		onFiltersChange(clearFilters());
	};

	return (
		<FilterButton
			title="Filters"
			activeCount={activeFilterCount}
			defaultOpen={false}
			storageKey="animal-filters-open"
		>
			<div className="space-y-3">
				{/* Priority Filter - on its own line */}
				<PriorityFilter
					value={filters.priority ?? false}
					onChange={(value) => handleFilterChange("priority", value)}
					compact={true}
				/>

				{/* Dropdown filters - stacked vertically */}
				<div className="space-y-2.5 w-fit">
					<SelectFilter
						value={
							filters.inGroup === true
								? "in_group"
								: filters.inGroup === false
								? "not_in_group"
								: "all"
						}
						onChange={(value) => {
							if (value === "in_group") {
								handleFilterChange("inGroup", true);
							} else if (value === "not_in_group") {
								handleFilterChange("inGroup", false);
							} else {
								handleFilterChange("inGroup", undefined);
							}
						}}
						options={[
							{ value: "in_group", label: "Only In Group" },
							{ value: "not_in_group", label: "Not In Group" },
						]}
						placeholder="Include Groups"
						compact={true}
					/>
					<SelectFilter
						value={filters.sex ?? ""}
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
					<SelectFilter
						value={filters.life_stage ?? ""}
						onChange={(value) =>
							handleFilterChange("life_stage", value as LifeStage)
						}
						options={lifeStageOptions}
						placeholder="All Ages"
						compact={true}
					/>
					<SelectFilter
						value={filters.status ?? ""}
						onChange={(value) =>
							handleFilterChange("status", value as AnimalStatus)
						}
						options={statusOptions}
						placeholder="All Statuses"
						compact={true}
					/>
					<SelectFilter
						value={filters.foster_visibility ?? ""}
						onChange={(value) =>
							handleFilterChange(
								"foster_visibility",
								value as FosterVisibility
							)
						}
						options={fosterVisibilityOptions}
						placeholder="All Visibility"
						compact={true}
					/>
					<SortFilter
						value={filters.sortByCreatedAt ?? "newest"}
						onChange={(value) =>
							handleFilterChange(
								"sortByCreatedAt",
								value as "newest" | "oldest"
							)
						}
						options={sortOptions}
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
