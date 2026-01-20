import type { FosterVisibility } from "../../types";
import {
	PriorityFilter,
	SelectFilter,
	SortFilter,
	FilterButton,
} from "../shared/Filters";
import Button from "../ui/Button";

export interface GroupFilters extends Record<string, unknown> {
	priority?: boolean;
	foster_visibility?: FosterVisibility;
	sortByCreatedAt?: "newest" | "oldest";
}

interface GroupFiltersProps {
	filters: GroupFilters;
	onFiltersChange: (filters: GroupFilters) => void;
}

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
function countActiveFilters(filters: GroupFilters): number {
	let count = 0;
	if (filters.priority === true) count++;
	if (filters.foster_visibility) count++;
	if (filters.sortByCreatedAt) count++;
	return count;
}

// Helper function to clear all filters
function clearFilters(): GroupFilters {
	return {};
}

export default function GroupFilters({
	filters,
	onFiltersChange,
}: GroupFiltersProps) {
	const activeFilterCount = countActiveFilters(filters);
	const hasActiveFilters = activeFilterCount > 0;

	const handleFilterChange = <K extends keyof GroupFilters>(
		key: K,
		value: GroupFilters[K]
	) => {
		// Convert empty/falsy values to undefined to clear the filter
		// Handle different types separately to avoid TypeScript errors
		let normalizedValue: GroupFilters[K] | undefined;

		if (value === false || value === undefined) {
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
			storageKey="group-filters-open"
		>
			<div className="space-y-3">
				{/* Priority Filter */}
				<PriorityFilter
					value={filters.priority ?? false}
					onChange={(value) => handleFilterChange("priority", value)}
					compact={true}
				/>

				{/* Foster Visibility Filter */}
				<SelectFilter
					label="Foster Visibility"
					value={filters.foster_visibility || ""}
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

				{/* Sort by Created At */}
				<SortFilter
					label="Sort by Date"
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
