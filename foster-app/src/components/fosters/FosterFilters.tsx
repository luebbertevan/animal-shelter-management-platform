import { ToggleFilter, SortFilter, FilterButton } from "../shared/Filters";
import Button from "../ui/Button";

export interface FosterFilters extends Record<string, unknown> {
	currentlyFostering?: boolean;
	sortByCreatedAt?: "newest" | "oldest";
}

interface FosterFiltersProps {
	filters: FosterFilters;
	onFiltersChange: (filters: FosterFilters) => void;
}

// Sort options
const sortOptions: { value: "newest" | "oldest"; label: string }[] = [
	{ value: "newest", label: "Newest First" },
	{ value: "oldest", label: "Oldest First" },
];

// Helper function to count active filters
function countActiveFilters(filters: FosterFilters): number {
	let count = 0;
	if (filters.currentlyFostering === true) count++;
	if (filters.sortByCreatedAt) count++;
	return count;
}

// Helper function to clear all filters
function clearFilters(): FosterFilters {
	return {};
}

export default function FosterFilters({
	filters,
	onFiltersChange,
}: FosterFiltersProps) {
	const activeFilterCount = countActiveFilters(filters);
	const hasActiveFilters = activeFilterCount > 0;

	const handleFilterChange = <K extends keyof FosterFilters>(
		key: K,
		value: FosterFilters[K]
	) => {
		// Convert false to undefined to clear the filter
		const normalizedValue: FosterFilters[K] | undefined =
			value === false || value === undefined ? undefined : value;

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
			storageKey="foster-filters-open"
		>
			<div className="space-y-3">
				{/* Currently Fostering Filter */}
				<ToggleFilter
					label="Currently Fostering"
					value={filters.currentlyFostering ?? false}
					onChange={(value) =>
						handleFilterChange("currentlyFostering", value)
					}
					compact={true}
				/>

				{/* Dropdown filters - stacked vertically */}
				<div className="space-y-2.5 w-fit">
					{/* Sort Filter */}
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
