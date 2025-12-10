import { supabase } from "./supabase";
import {
	getErrorMessage,
	isOffline,
	handleSupabaseNotFound,
} from "./errorUtils";
import type { Animal } from "../types";

export interface FetchAnimalsOptions {
	// Fields to select. Default: ["id", "name", "status", "sex", "priority"]
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
		fields = ["id", "name", "status", "sex", "priority"],
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
	 * Fields to select. Default: ["id", "name", "priority"]
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
	const { fields = ["id", "name", "priority"] } = options;

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
	// Fields to select. Default: ["id", "name", "priority"]
	fields?: string[];
}

// Fetch animals assigned to a specific foster
export async function fetchAnimalsByFosterId(
	fosterId: string,
	organizationId: string,
	options: FetchAnimalsByFosterIdOptions = {}
): Promise<Animal[]> {
	const { fields = ["id", "name", "priority"] } = options;

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
	// Fields to select. Default: ["id", "name", "status", "sex", "priority", "group_id"]
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
	const { fields = ["id", "name", "status", "sex", "priority", "group_id"] } =
		options;

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
