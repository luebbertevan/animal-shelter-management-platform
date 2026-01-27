import type { AnimalFilters } from "../components/animals/AnimalFilters";
import type { GroupFilters } from "../components/animals/GroupFilters";
import type { FosterFilters } from "../components/fosters/FosterFilters";
import type {
	AnimalStatus,
	SexSpayNeuterStatus,
	LifeStage,
	FosterVisibility,
} from "../types";
import { DEFAULT_PAGE_SIZE } from "./paginationConfig";

// Re-export for backwards compatibility
export { DEFAULT_PAGE_SIZE };

// Generic type for Supabase query builder that supports chaining
// This represents a query that can be chained with .eq(), .not(), .order(), etc.
type SupabaseQuery = {
	eq: (column: string, value: unknown) => SupabaseQuery;
	not: (column: string, operator: string, value: unknown) => SupabaseQuery;
	is: (column: string, value: unknown) => SupabaseQuery;
	ilike: (column: string, pattern: string) => SupabaseQuery;
	order: (column: string, options?: { ascending?: boolean }) => SupabaseQuery;
};

/**
 * Apply animal filters to a Supabase query
 */
export function applyAnimalFilters(
	query: SupabaseQuery,
	filters: AnimalFilters,
	organizationId: string
): SupabaseQuery {
	// Always filter by organization
	let filteredQuery = query.eq("organization_id", organizationId);

	// Priority filter
	if (filters.priority === true) {
		filteredQuery = filteredQuery.eq("priority", true);
	}

	// Sex filter
	if (filters.sex) {
		filteredQuery = filteredQuery.eq(
			"sex_spay_neuter_status",
			filters.sex as SexSpayNeuterStatus
		);
	}

	// Life stage filter
	if (filters.life_stage) {
		filteredQuery = filteredQuery.eq(
			"life_stage",
			filters.life_stage as LifeStage
		);
	}

	// In group filter
	// Default to undefined (Include Groups - show all) when undefined
	// true = Only In Group, false = Not In Group, undefined = Include Groups (all)
	if (filters.inGroup === true) {
		filteredQuery = filteredQuery.not("group_id", "is", null);
	} else if (filters.inGroup === false) {
		filteredQuery = filteredQuery.is("group_id", null);
	}
	// If filters.inGroup === undefined, don't apply any filter (show all - include groups)

	// Status filter
	if (filters.status) {
		filteredQuery = filteredQuery.eq(
			"status",
			filters.status as AnimalStatus
		);
	}

	// Foster visibility filter
	if (filters.foster_visibility) {
		filteredQuery = filteredQuery.eq(
			"foster_visibility",
			filters.foster_visibility as FosterVisibility
		);
	}

	// Sort by created_at (applied separately, not as a filter)
	// This will be handled by applySortByCreatedAt

	return filteredQuery;
}

/**
 * Apply group filters to a Supabase query
 */
export function applyGroupFilters(
	query: SupabaseQuery,
	filters: GroupFilters,
	organizationId: string
): SupabaseQuery {
	// Always filter by organization
	let filteredQuery = query.eq("organization_id", organizationId);

	// Priority filter
	if (filters.priority === true) {
		filteredQuery = filteredQuery.eq("priority", true);
	}

	// Sort by created_at (applied separately, not as a filter)
	// This will be handled by applySortByCreatedAt

	return filteredQuery;
}

/**
 * Apply foster filters to a Supabase query
 * Note: "currently fostering" filter requires checking if foster has assigned animals/groups
 * This is more complex and may need to be handled at the application level
 */
export function applyFosterFilters(
	query: SupabaseQuery,
	_filters: FosterFilters, // Currently unused - "currently fostering" handled at app level
	organizationId: string
): SupabaseQuery {
	// Always filter by organization
	let filteredQuery = query.eq("organization_id", organizationId);

	// Filter by role (only fosters, not coordinators)
	filteredQuery = filteredQuery.eq("role", "foster");

	// Note: "currently fostering" filter cannot be applied directly to profiles query
	// It requires checking if the foster has animals/groups with current_foster_id
	// This should be handled at the application level after fetching fosters

	return filteredQuery;
}

/**
 * Apply name search to a Supabase query (case-insensitive partial match)
 */
export function applyNameSearch(
	query: SupabaseQuery,
	searchTerm: string,
	fieldName: string = "name"
): SupabaseQuery {
	if (!searchTerm || searchTerm.trim() === "") {
		return query;
	}

	// Use ilike for case-insensitive partial matching
	// %${searchTerm}% matches anywhere in the string
	return query.ilike(fieldName, `%${searchTerm.trim()}%`);
}

/**
 * Apply created_at sorting to a Supabase query
 */
export function applySortByCreatedAt(
	query: SupabaseQuery,
	sortOrder: "newest" | "oldest" = "newest"
): SupabaseQuery {
	// newest = descending (most recent first)
	// oldest = ascending (oldest first)
	return query.order("created_at", {
		ascending: sortOrder === "oldest",
	});
}

/**
 * Count number of active filters in an AnimalFilters object
 */
export function countActiveFilters(filters: AnimalFilters): number {
	let count = 0;
	if (filters.priority === true) count++;
	if (filters.sex) count++;
	if (filters.life_stage) count++;
	// Count inGroup as active only if explicitly set to true or false (not null or undefined)
	if (filters.inGroup === true || filters.inGroup === false) count++;
	if (filters.status) count++;
	if (filters.foster_visibility) count++;
	if (filters.sortByCreatedAt) count++;
	return count;
}

/**
 * Count number of active filters in a GroupFilters object
 */
export function countActiveGroupFilters(filters: GroupFilters): number {
	let count = 0;
	if (filters.priority === true) count++;
	if (filters.foster_visibility) count++;
	if (filters.sortByCreatedAt) count++;
	return count;
}

/**
 * Count number of active filters in a FosterFilters object
 */
export function countActiveFosterFilters(filters: FosterFilters): number {
	let count = 0;
	if (filters.currentlyFostering === true) count++;
	if (filters.sortByCreatedAt) count++;
	return count;
}

/**
 * Check if any filters are active in an AnimalFilters object
 */
export function hasActiveFilters(filters: AnimalFilters): boolean {
	return countActiveFilters(filters) > 0;
}

/**
 * Check if any filters are active in a GroupFilters object
 */
export function hasActiveGroupFilters(filters: GroupFilters): boolean {
	return countActiveGroupFilters(filters) > 0;
}

/**
 * Check if any filters are active in a FosterFilters object
 */
export function hasActiveFosterFilters(filters: FosterFilters): boolean {
	return countActiveFosterFilters(filters) > 0;
}

/**
 * Return empty AnimalFilters object
 */
export function clearAnimalFilters(): AnimalFilters {
	return {};
}

/**
 * Return empty GroupFilters object
 */
export function clearGroupFilters(): GroupFilters {
	return {};
}

/**
 * Return empty FosterFilters object
 */
export function clearFosterFilters(): FosterFilters {
	return {};
}

/**
 * Convert filter object and search term to URL query parameters
 */
export function filtersToQueryParams(
	filters:
		| AnimalFilters
		| GroupFilters
		| FosterFilters
		| Record<string, unknown>,
	searchTerm: string = "",
	page: number = 1,
	pageSize: number = DEFAULT_PAGE_SIZE
): URLSearchParams {
	const params = new URLSearchParams();

	// Add search term
	if (searchTerm && searchTerm.trim() !== "") {
		params.set("search", searchTerm.trim());
	}

	// Add filter values
	for (const [key, value] of Object.entries(filters)) {
		if (value !== undefined && value !== null && value !== "") {
			if (typeof value === "boolean") {
				params.set(key, value ? "true" : "false");
			} else {
				params.set(key, String(value));
			}
		}
	}

	// Add pagination
	if (page > 1) {
		params.set("page", String(page));
	}
	if (pageSize !== DEFAULT_PAGE_SIZE) {
		// Only include pageSize if it's not the default
		params.set("pageSize", String(pageSize));
	}

	return params;
}

/**
 * Parse URL query parameters back to filter object, search term, and pagination
 */
export function queryParamsToFilters<T extends Record<string, unknown>>(
	searchParams: URLSearchParams,
	defaultFilters: T
): {
	filters: T;
	searchTerm: string;
	page: number;
	pageSize: number;
} {
	const filters = { ...defaultFilters } as T;
	let searchTerm = "";
	let page = 1;
	let pageSize = DEFAULT_PAGE_SIZE;

	// Extract search term
	const search = searchParams.get("search");
	if (search) {
		searchTerm = search;
	}

	// Extract pagination
	const pageParam = searchParams.get("page");
	if (pageParam) {
		const parsedPage = parseInt(pageParam, 10);
		if (!isNaN(parsedPage) && parsedPage > 0) {
			page = parsedPage;
		}
	}

	const pageSizeParam = searchParams.get("pageSize");
	if (pageSizeParam) {
		const parsedPageSize = parseInt(pageSizeParam, 10);
		if (!isNaN(parsedPageSize) && parsedPageSize > 0) {
			pageSize = parsedPageSize;
		}
	}

	// Extract filter values
	for (const [key, value] of searchParams.entries()) {
		if (key === "search" || key === "page" || key === "pageSize") {
			continue; // Already handled
		}

		// Try to parse as boolean first
		const filtersAny = filters as Record<string, unknown>;
		if (value === "true") {
			filtersAny[key] = true;
		} else if (value === "false") {
			filtersAny[key] = false;
		} else if (value !== "") {
			// Keep as string (will be validated by the filter component)
			filtersAny[key] = value;
		}
	}

	return { filters, searchTerm, page, pageSize };
}
