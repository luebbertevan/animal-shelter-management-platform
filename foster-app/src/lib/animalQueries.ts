import { supabase } from "./supabase";
import {
	getErrorMessage,
	isOffline,
	handleSupabaseNotFound,
} from "./errorUtils";
import type { Animal } from "../types";

export interface FetchAnimalsOptions {
	// Fields to select. Default: ["id", "name", "status", "sex_spay_neuter_status", "priority", "foster_visibility"]
	// Pass "*" to select all fields
	fields?: string[];
	// Order by field. Default: "created_at"
	orderBy?: string;
	// Order direction. Default: "desc"
	orderDirection?: "asc" | "desc";
	// Whether to check for offline state and throw error if offline with empty data.
	// Default: false
	checkOffline?: boolean;
}

/**
 * Fetch all animals for an organization
 */
export async function fetchAnimals(
	organizationId: string,
	options: FetchAnimalsOptions = {}
): Promise<Animal[]> {
	const {
		fields = [
			"id",
			"name",
			"status",
			"sex_spay_neuter_status",
			"priority",
			"foster_visibility",
		],
		orderBy = "created_at",
		orderDirection = "desc",
		checkOffline = false,
	} = options;

	try {
		const selectFields = fields.includes("*") ? "*" : fields.join(", ");
		let query = supabase
			.from("animals")
			.select(selectFields)
			.eq("organization_id", organizationId);

		// Add ordering if specified
		if (orderBy) {
			query = query.order(orderBy, {
				ascending: orderDirection === "asc",
			});
		}

		const { data, error } = await query;

		if (error) {
			throw new Error(
				getErrorMessage(
					error,
					"Failed to fetch animals. Please try again."
				)
			);
		}

		// Explicitly handle null/undefined data (shouldn't happen, but safety check)
		if (data === null || data === undefined) {
			throw new Error(
				"Unexpected error: No data returned from server. Please try again."
			);
		}

		// If we're offline and got empty data, treat it as a network error
		if (checkOffline && isOffline() && data.length === 0) {
			throw new TypeError("Failed to fetch");
		}

		// Return empty array if no animals (this is valid, not an error)
		return (data || []) as unknown as Animal[];
	} catch (err) {
		// Catch network errors that occur before Supabase returns
		throw new Error(
			getErrorMessage(err, "Failed to fetch animals. Please try again.")
		);
	}
}

/**
 * Fetch a single animal by ID
 */
export async function fetchAnimalById(
	animalId: string,
	organizationId: string
): Promise<Animal> {
	try {
		const { data, error: fetchError } = await supabase
			.from("animals")
			.select("*")
			.eq("id", animalId)
			.eq("organization_id", organizationId)
			.single();

		if (fetchError) {
			const notFoundError = handleSupabaseNotFound(
				fetchError,
				null,
				"Animal"
			);

			if (notFoundError instanceof TypeError) {
				throw new Error(
					getErrorMessage(
						notFoundError,
						"Failed to load animal details. Please try again."
					)
				);
			}

			throw notFoundError;
		}

		if (!data) {
			throw handleSupabaseNotFound(null, data, "Animal");
		}

		return data as Animal;
	} catch (err) {
		throw new Error(
			getErrorMessage(
				err,
				"Failed to load animal details. Please try again."
			)
		);
	}
}

export interface FetchAnimalsByIdsOptions {
	/**
	 * Fields to select. Default: ["id", "name", "priority", "foster_visibility"]
	 */
	fields?: string[];
}

/**
 * Fetch multiple animals by their IDs
 */
export async function fetchAnimalsByIds(
	animalIds: string[],
	organizationId: string,
	options: FetchAnimalsByIdsOptions = {}
): Promise<Animal[]> {
	const { fields = ["id", "name", "priority", "foster_visibility"] } = options;

	if (animalIds.length === 0) {
		return [];
	}

	try {
		const selectFields = fields.includes("*") ? "*" : fields.join(", ");
		const { data, error } = await supabase
			.from("animals")
			.select(selectFields)
			.in("id", animalIds)
			.eq("organization_id", organizationId);

		if (error) {
			throw new Error(
				getErrorMessage(
					error,
					"Failed to load animals. Please try again."
				)
			);
		}

		return (data || []) as unknown as Animal[];
	} catch (err) {
		throw new Error(
			getErrorMessage(err, "Failed to load animals. Please try again.")
		);
	}
}

export interface FetchAnimalsByFosterIdOptions {
	// Fields to select. Default: ["id", "name", "priority", "foster_visibility"]
	fields?: string[];
}

// Fetch animals assigned to a specific foster
export async function fetchAnimalsByFosterId(
	fosterId: string,
	organizationId: string,
	options: FetchAnimalsByFosterIdOptions = {}
): Promise<Animal[]> {
	const { fields = ["id", "name", "priority", "foster_visibility"] } = options;

	try {
		const selectFields = fields.includes("*") ? "*" : fields.join(", ");
		const { data, error } = await supabase
			.from("animals")
			.select(selectFields)
			.eq("organization_id", organizationId)
			.eq("current_foster_id", fosterId);

		if (error) {
			throw new Error(
				getErrorMessage(
					error,
					"Failed to load assigned animals. Please try again."
				)
			);
		}

		return (data || []) as unknown as Animal[];
	} catch (err) {
		throw new Error(
			getErrorMessage(
				err,
				"Failed to load assigned animals. Please try again."
			)
		);
	}
}

export interface FetchAssignedAnimalsOptions {
	// Fields to select. Default: ["id", "name", "status", "sex_spay_neuter_status", "priority", "group_id", "foster_visibility"]
	// Pass "*" to select all fields
	fields?: string[];
}

/**
 * Fetch animals assigned to a specific profile (for Currently Fostering section)
 * This function fetches animals where current_foster_id matches the profile ID
 */
export async function fetchAssignedAnimals(
	profileId: string,
	organizationId: string,
	options: FetchAssignedAnimalsOptions = {}
): Promise<Animal[]> {
	const {
		fields = [
			"id",
			"name",
			"status",
			"sex_spay_neuter_status",
			"priority",
			"group_id",
			"foster_visibility",
		],
	} = options;

	try {
		const selectFields = fields.includes("*") ? "*" : fields.join(", ");
		const { data, error } = await supabase
			.from("animals")
			.select(selectFields)
			.eq("organization_id", organizationId)
			.eq("current_foster_id", profileId);

		if (error) {
			throw new Error(
				getErrorMessage(
					error,
					"Failed to load assigned animals. Please try again."
				)
			);
		}

		// Return empty array if no animals (this is valid, not an error)
		return (data || []) as unknown as Animal[];
	} catch (err) {
		throw new Error(
			getErrorMessage(
				err,
				"Failed to load assigned animals. Please try again."
			)
		);
	}
}

/**
 * Generic helper function to fetch field suggestions for a given field name.
 * Returns the top N most frequent unique values for the specified field.
 *
 * @param organizationId - The organization ID to filter by
 * @param fieldName - The name of the field to get suggestions for (e.g., 'primary_breed', 'physical_characteristics')
 * @param limit - Maximum number of suggestions to return (default: 20)
 * @returns Array of unique field values sorted by frequency (most frequent first), then alphabetically
 */
export async function fetchFieldSuggestions(
	organizationId: string,
	fieldName: string,
	limit: number = 20
): Promise<string[]> {
	try {
		// Fetch all non-null values for the specified field in the organization
		const { data, error } = await supabase
			.from("animals")
			.select(fieldName)
			.eq("organization_id", organizationId)
			.not(fieldName, "is", null);

		if (error) {
			throw new Error(
				getErrorMessage(
					error,
					`Failed to fetch ${fieldName} suggestions. Please try again.`
				)
			);
		}

		// Handle empty result
		if (!data || data.length === 0) {
			return [];
		}

		// Client-side processing: Count frequency of each exact value (case-sensitive)
		type ValueCount = { value: string; count: number };

		const valueCounts = new Map<string, number>();

		// Count occurrences of each value
		for (const row of data) {
			// Type assertion: we know fieldName is a valid key since we queried for it
			const rowObj = row as unknown as Record<string, unknown>;
			const value = rowObj[fieldName] as string | null | undefined;
			if (
				value != null &&
				typeof value === "string" &&
				value.trim() !== ""
			) {
				valueCounts.set(value, (valueCounts.get(value) || 0) + 1);
			}
		}

		// Convert to array and sort by frequency (descending), then alphabetically
		const sortedValues: ValueCount[] = Array.from(
			valueCounts.entries()
		).map(([value, count]) => ({ value, count }));

		sortedValues.sort((a, b) => {
			// First sort by count (descending - most frequent first)
			if (b.count !== a.count) {
				return b.count - a.count;
			}
			// If counts are equal, sort alphabetically (ascending)
			return a.value.localeCompare(b.value);
		});

		// Return top N values
		return sortedValues.slice(0, limit).map((item) => item.value);
	} catch (err) {
		throw new Error(
			getErrorMessage(
				err,
				`Failed to fetch ${fieldName} suggestions. Please try again.`
			)
		);
	}
}

/**
 * Fetch breed suggestions for an organization.
 * Returns the top 20 most frequent primary_breed values.
 *
 * @param organizationId - The organization ID to filter by
 * @returns Array of unique breed strings sorted by frequency (most frequent first)
 */
export async function fetchBreedSuggestions(
	organizationId: string
): Promise<string[]> {
	return fetchFieldSuggestions(organizationId, "primary_breed", 20);
}

/**
 * Fetch physical characteristics suggestions for an organization.
 * Returns the top 20 most frequent physical_characteristics values.
 *
 * @param organizationId - The organization ID to filter by
 * @returns Array of unique characteristic strings sorted by frequency (most frequent first)
 */
export async function fetchPhysicalCharacteristicsSuggestions(
	organizationId: string
): Promise<string[]> {
	return fetchFieldSuggestions(
		organizationId,
		"physical_characteristics",
		20
	);
}
