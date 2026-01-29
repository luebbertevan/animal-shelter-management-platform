import { useMemo } from "react";
import { PriorityFilter, SortFilter, FilterButton } from "../shared/Filters";
import Button from "../ui/Button";

export interface FosterRequestsFilters extends Record<string, unknown> {
	priority?: boolean;
	/** Sort by request created_at (the time the request was made) */
	sortByRequestDate?: "newest" | "oldest";
}

interface FosterRequestsFiltersProps {
	filters: FosterRequestsFilters;
	onFiltersChange: (filters: FosterRequestsFilters) => void;
}

const sortOptions: { value: "newest" | "oldest"; label: string }[] = [
	{ value: "newest", label: "Request date: newest first" },
	{ value: "oldest", label: "Request date: oldest first" },
];

function countActiveFilters(filters: FosterRequestsFilters): number {
	let count = 0;
	if (filters.priority === true) count++;
	if (filters.sortByRequestDate && filters.sortByRequestDate !== "newest") count++;
	return count;
}

export default function FosterRequestsFilters({
	filters,
	onFiltersChange,
}: FosterRequestsFiltersProps) {
	const activeCount = useMemo(() => countActiveFilters(filters), [filters]);
	const hasActiveFilters = activeCount > 0;

	const handleFilterChange = <K extends keyof FosterRequestsFilters>(
		key: K,
		value: FosterRequestsFilters[K]
	) => {
		// Normalize defaults to undefined to keep URLs clean (matches other pages)
		let normalizedValue: FosterRequestsFilters[K] | undefined;

		if (value === false || value === undefined) {
			normalizedValue = undefined;
		} else if (value === "newest") {
			// newest is the default
			normalizedValue = undefined;
		} else {
			normalizedValue = value;
		}

		onFiltersChange({
			...filters,
			[key]: normalizedValue,
		});
	};

	const handleClear = () => {
		onFiltersChange({});
	};

	return (
		<FilterButton
			title="Filters"
			activeCount={activeCount}
			defaultOpen={false}
			storageKey="foster-requests-filters-open"
		>
			<div className="space-y-2">
				<div className="flex flex-col space-y-2">
					<PriorityFilter
						value={filters.priority || false}
						onChange={(value) => handleFilterChange("priority", value)}
						compact={true}
					/>
				</div>

				<div className="space-y-2.5 w-fit">
					<SortFilter
						value={filters.sortByRequestDate || "newest"}
						options={sortOptions}
						onChange={(value) =>
							handleFilterChange(
								"sortByRequestDate",
								value as "newest" | "oldest"
							)
						}
						compact={true}
					/>
				</div>

				{hasActiveFilters && (
					<div className="pt-2 border-t border-gray-200">
						<Button
							type="button"
							variant="outline"
							onClick={handleClear}
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


