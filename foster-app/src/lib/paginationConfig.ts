/**
 * Centralized pagination configuration.
 *
 * This file contains all pagination size constants for the application.
 * - MASTER_PAGE_SIZE: The shared default used by most features
 * - PAGE_SIZES: Feature-specific page sizes (can override the master default)
 */

/**
 * Master default page size for pagination across the app.
 * Change this single value to update the default for all features
 * that use MASTER_PAGE_SIZE.
 */
export const MASTER_PAGE_SIZE = 40;

/**
 * Feature-specific page sizes.
 *
 * Each feature can have its own page size. Set to MASTER_PAGE_SIZE
 * to use the shared default, or specify a custom number.
 *
 * To change all features at once: modify MASTER_PAGE_SIZE above.
 * To change one feature: modify the specific value below.
 */
export const PAGE_SIZES = {
	/** Animals list page (/animals) */
	ANIMALS_LIST: MASTER_PAGE_SIZE,

	/** Groups list page (/groups) */
	GROUPS_LIST: MASTER_PAGE_SIZE,

	/** Fosters Needed page - combined animals + groups (/fosters-needed) */
	FOSTERS_NEEDED: MASTER_PAGE_SIZE,

	/** Fosters list page (/fosters) */
	FOSTERS_LIST: MASTER_PAGE_SIZE,

	/** Animal selection in group forms (NewGroup, EditGroup pages) */
	GROUP_ANIMAL_SELECTION: MASTER_PAGE_SIZE,

	/** Tag selection modal - animals and groups tabs */
	TAG_SELECTION: MASTER_PAGE_SIZE,
} as const;

/**
 * Default page size for URL query parameter handling.
 * Used by filterUtils.ts for queryParamsToFilters/filtersToQueryParams.
 *
 * This should match the most commonly used page size to avoid
 * unnecessary URL parameters.
 */
export const DEFAULT_PAGE_SIZE = MASTER_PAGE_SIZE;

