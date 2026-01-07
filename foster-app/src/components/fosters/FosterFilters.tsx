import { ToggleFilter, FilterSection } from "../shared/Filters";
import Button from "../ui/Button";

export interface FosterFilters {
	currentlyFostering?: boolean;
}

interface FosterFiltersProps {
	filters: FosterFilters;
	onFiltersChange: (filters: FosterFilters) => void;
}

// Helper function to count active filters
function countActiveFilters(filters: FosterFilters): number {
	let count = 0;
	if (filters.currentlyFostering === true) count++;
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
		<FilterSection
			title={`Filters${
				hasActiveFilters ? ` (${activeFilterCount})` : ""
			}`}
			defaultOpen={false}
			storageKey="foster-filters-open"
		>
			<div className="space-y-4">
				{/* Currently Fostering Filter */}
				<ToggleFilter
					label="Currently Fostering"
					value={filters.currentlyFostering ?? false}
					onChange={(value) =>
						handleFilterChange("currentlyFostering", value)
					}
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
