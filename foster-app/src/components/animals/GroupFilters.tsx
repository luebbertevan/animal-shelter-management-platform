import { PriorityFilter, SortFilter, FilterSection } from "../shared/Filters";
import Button from "../ui/Button";

export interface GroupFilters {
	priority?: boolean;
	sortByCreatedAt?: "newest" | "oldest";
}

interface GroupFiltersProps {
	filters: GroupFilters;
	onFiltersChange: (filters: GroupFilters) => void;
}

// Sort options
const sortOptions: { value: "newest" | "oldest"; label: string }[] = [
	{ value: "newest", label: "Newest First" },
	{ value: "oldest", label: "Oldest First" },
];

// Helper function to count active filters
function countActiveFilters(filters: GroupFilters): number {
	let count = 0;
	if (filters.priority === true) count++;
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
		<FilterSection
			title={`Filters${
				hasActiveFilters ? ` (${activeFilterCount})` : ""
			}`}
			defaultOpen={false}
			storageKey="group-filters-open"
		>
			<div className="space-y-4">
				{/* Priority Filter */}
				<PriorityFilter
					value={filters.priority ?? false}
					onChange={(value) => handleFilterChange("priority", value)}
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
				/>

				{/* Clear Filters Button */}
				{hasActiveFilters && (
					<div className="pt-2 border-t border-gray-200">
						<Button
							type="button"
							variant="outline"
							onClick={handleClearFilters}
							className="w-full"
						>
							Clear All Filters
						</Button>
					</div>
				)}
			</div>
		</FilterSection>
	);
}
