import { ToggleFilter, SortFilter, FilterButton } from "../shared/Filters";
import Button from "../ui/Button";

export interface FosterFilters extends Record<string, unknown> {
	currentlyFostering?: boolean;
	sortByCreatedAt?: "newest" | "oldest";
	isCoordinator?: boolean; // true = coordinators only, false = fosters only, undefined = all
}

interface FosterFiltersProps {
	filters: FosterFilters;
	onFiltersChange: (filters: FosterFilters) => void;
}

// Props for inline filter content (without FilterButton wrapper)
interface FosterFiltersContentProps {
	filters: FosterFilters;
	onFiltersChange: (filters: FosterFilters) => void;
	showCurrentlyFostering?: boolean;
	showSort?: boolean;
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
	if (filters.isCoordinator !== undefined) count++;
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
		// For currentlyFostering, convert false to undefined to clear the filter
		// For isCoordinator, preserve false (it means "fosters only")
		let normalizedValue: FosterFilters[K] | undefined = value;
		if (key === "currentlyFostering" && (value === false || value === undefined)) {
			normalizedValue = undefined;
		}
		// For isCoordinator, we want to preserve false, true, and undefined
		// For sortByCreatedAt, we want to preserve the value or undefined

		onFiltersChange({
			...filters,
			[key]: normalizedValue,
		});
	};

	const handleCoordinatorToggle = (isCoordinator: boolean) => {
		// If toggling on, set the value and turn off the other
		// If toggling off, clear the filter (set to undefined)
		if (filters.isCoordinator === isCoordinator) {
			// Toggling off the currently active one
			handleFilterChange("isCoordinator", undefined);
		} else {
			// Toggling on a new one (or switching from one to the other)
			handleFilterChange("isCoordinator", isCoordinator);
		}
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
			<div className="space-y-2">
				{/* All toggle filters in one container for alignment */}
				<div className="flex flex-col space-y-2">
					{/* Coordinator Filters - Two toggles, only one can be active */}
					<ToggleFilter
						label="Fosters Only"
						value={filters.isCoordinator === false}
						onChange={() => handleCoordinatorToggle(false)}
						compact={true}
					/>
					<ToggleFilter
						label="Coordinators Only"
						value={filters.isCoordinator === true}
						onChange={() => handleCoordinatorToggle(true)}
						compact={true}
					/>
					{/* Currently Fostering Filter */}
					<ToggleFilter
						label="Currently Fostering"
						value={filters.currentlyFostering ?? false}
						onChange={(value) =>
							handleFilterChange("currentlyFostering", value)
						}
						compact={true}
					/>
				</div>

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

/**
 * Inline filter content component (without FilterButton wrapper)
 * Used in FosterSelector modal
 */
export function FosterFiltersContent({
	filters,
	onFiltersChange,
	showCurrentlyFostering = false,
	showSort = false,
}: FosterFiltersContentProps) {
	const handleFilterChange = <K extends keyof FosterFilters>(
		key: K,
		value: FosterFilters[K]
	) => {
		let normalizedValue: FosterFilters[K] | undefined = value;
		if (key === "currentlyFostering" && (value === false || value === undefined)) {
			normalizedValue = undefined;
		}

		onFiltersChange({
			...filters,
			[key]: normalizedValue,
		});
	};

	const handleCoordinatorToggle = (isCoordinator: boolean) => {
		if (filters.isCoordinator === isCoordinator) {
			handleFilterChange("isCoordinator", undefined);
		} else {
			handleFilterChange("isCoordinator", isCoordinator);
		}
	};

	return (
		<div className="flex flex-col space-y-2">
			<ToggleFilter
				label="Fosters Only"
				value={filters.isCoordinator === false}
				onChange={() => handleCoordinatorToggle(false)}
				compact={true}
			/>
			<ToggleFilter
				label="Coordinators Only"
				value={filters.isCoordinator === true}
				onChange={() => handleCoordinatorToggle(true)}
				compact={true}
			/>
			{showCurrentlyFostering && (
				<ToggleFilter
					label="Currently Fostering"
					value={filters.currentlyFostering ?? false}
					onChange={(value) =>
						handleFilterChange("currentlyFostering", value)
					}
					compact={true}
				/>
			)}
			{showSort && (
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
			)}
		</div>
	);
}
