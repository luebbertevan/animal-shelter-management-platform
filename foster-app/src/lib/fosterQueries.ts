import { supabase } from "./supabase";
import {
	getErrorMessage,
	isOffline,
	handleSupabaseNotFound,
} from "./errorUtils";

export interface FosterProfile {
	id: string;
	email: string;
	full_name?: string;
	role: "foster" | "coordinator";
	phone_number?: string;
	full_address?: string;
	home_inspection?: string;
	experience_level?: string;
	household_details?: string;
	preferred_animal_profiles?: string;
	availability?: boolean;
	organization_id: string;
	created_at: string;
	updated_at: string;
}

export interface FetchFostersOptions {
	// Fields to select. Default: ["id", "email", "full_name", "phone_number", "availability"]
	// Pass "*" to select all fields
	fields?: string[];
	// Order by field. Default: "full_name"
	orderBy?: string;
	// Order direction. Default: "asc"
	orderDirection?: "asc" | "desc";
	// Whether to check for offline state and throw error if offline with empty data.
	// Default: false
	checkOffline?: boolean;
	// Whether to include coordinators in the results. Default: false
	includeCoordinators?: boolean;
}

// Fetch all fosters for an organization
export async function fetchFosters(
	organizationId: string,
	options: FetchFostersOptions = {}
): Promise<FosterProfile[]> {
	const {
		fields = ["id", "email", "full_name", "phone_number", "availability"],
		orderBy = "full_name",
		orderDirection = "asc",
		checkOffline = false,
		includeCoordinators = false,
	} = options;

	try {
		const selectFields = fields.includes("*") ? "*" : fields.join(", ");
		let query = supabase
			.from("profiles")
			.select(selectFields)
			.eq("organization_id", organizationId);

		// Filter by role - either just fosters or both fosters and coordinators
		if (includeCoordinators) {
			query = query.in("role", ["foster", "coordinator"]);
		} else {
			query = query.eq("role", "foster");
		}

		// Add ordering if specified
		if (orderBy) {
			query = query.order(orderBy, {
				ascending: orderDirection === "asc",
				nullsFirst: false,
			});
		}

		const { data, error } = await query;

		if (error) {
			throw new Error(
				getErrorMessage(
					error,
					"Failed to fetch fosters. Please try again."
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

		// Return empty array if no fosters (this is valid, not an error)
		return (data || []) as unknown as FosterProfile[];
	} catch (err) {
		// Catch network errors that occur before Supabase returns
		throw new Error(
			getErrorMessage(err, "Failed to fetch fosters. Please try again.")
		);
	}
}

// Fetch a single foster or coordinator by ID
export async function fetchFosterById(
	fosterId: string,
	organizationId: string
): Promise<FosterProfile> {
	try {
		const { data, error: fetchError } = await supabase
			.from("profiles")
			.select("*")
			.eq("id", fosterId)
			.eq("organization_id", organizationId)
			.in("role", ["foster", "coordinator"])
			.single();

		if (fetchError) {
			const notFoundError = handleSupabaseNotFound(
				fetchError,
				null,
				"Foster"
			);

			if (notFoundError instanceof TypeError) {
				throw new Error(
					getErrorMessage(
						notFoundError,
						"Failed to load foster details. Please try again."
					)
				);
			}

			throw notFoundError;
		}

		if (!data) {
			throw handleSupabaseNotFound(null, data, "Foster");
		}

		return data as FosterProfile;
	} catch (err) {
		throw new Error(
			getErrorMessage(
				err,
				"Failed to load foster details. Please try again."
			)
		);
	}
}
