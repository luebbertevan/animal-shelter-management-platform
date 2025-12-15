import { supabase } from "./supabase";
import {
	getErrorMessage,
	isOffline,
	handleSupabaseNotFound,
} from "./errorUtils";
import type { AnimalGroup } from "../types";

export interface FetchGroupsOptions {
	// Fields to select. Default: ["id", "name", "description", "animal_ids", "priority"]
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
 * Fetch all groups for an organization
 */
export async function fetchGroups(
	organizationId: string,
	options: FetchGroupsOptions = {}
): Promise<AnimalGroup[]> {
	const {
		fields = ["id", "name", "description", "animal_ids", "priority"],
		orderBy = "created_at",
		orderDirection = "desc",
		checkOffline = false,
	} = options;

	try {
		const selectFields = fields.includes("*") ? "*" : fields.join(", ");
		let query = supabase
			.from("animal_groups")
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
					"Failed to fetch groups. Please try again."
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

		// Return empty array if no groups (this is valid, not an error)
		return (data || []) as unknown as AnimalGroup[];
	} catch (err) {
		// Catch network errors that occur before Supabase returns
		throw new Error(
			getErrorMessage(err, "Failed to fetch groups. Please try again.")
		);
	}
}

/**
 * Fetch a single group by ID
 */
export async function fetchGroupById(
	groupId: string,
	organizationId: string
): Promise<AnimalGroup> {
	try {
		const { data, error: fetchError } = await supabase
			.from("animal_groups")
			.select("*")
			.eq("id", groupId)
			.eq("organization_id", organizationId)
			.single();

		if (fetchError) {
			const notFoundError = handleSupabaseNotFound(
				fetchError,
				null,
				"Group"
			);

			if (notFoundError instanceof TypeError) {
				throw new Error(
					getErrorMessage(
						notFoundError,
						"Failed to load group details. Please try again."
					)
				);
			}

			throw notFoundError;
		}

		if (!data) {
			throw handleSupabaseNotFound(null, data, "Group");
		}

		return data as AnimalGroup;
	} catch (err) {
		throw new Error(
			getErrorMessage(
				err,
				"Failed to load group details. Please try again."
			)
		);
	}
}

export interface FetchGroupsByFosterIdOptions {
	// Fields to select. Default: ["id", "name", "description", "priority"]
	fields?: string[];
}

// Fetch groups assigned to a specific foster
export async function fetchGroupsByFosterId(
	fosterId: string,
	organizationId: string,
	options: FetchGroupsByFosterIdOptions = {}
): Promise<AnimalGroup[]> {
	const { fields = ["id", "name", "description", "priority"] } = options;

	try {
		const selectFields = fields.includes("*") ? "*" : fields.join(", ");
		const { data, error } = await supabase
			.from("animal_groups")
			.select(selectFields)
			.eq("organization_id", organizationId)
			.eq("current_foster_id", fosterId);

		if (error) {
			throw new Error(
				getErrorMessage(
					error,
					"Failed to load assigned groups. Please try again."
				)
			);
		}

		return (data || []) as unknown as AnimalGroup[];
	} catch (err) {
		throw new Error(
			getErrorMessage(
				err,
				"Failed to load assigned groups. Please try again."
			)
		);
	}
}

export interface FetchAssignedGroupsOptions {
	// Fields to select. Default: ["id", "name", "description", "priority", "animal_ids"]
	// Pass "*" to select all fields
	fields?: string[];
}

/**
 * Fetch groups assigned to a specific profile (for Currently Fostering section)
 * This function fetches groups where current_foster_id matches the profile ID
 */
export async function fetchAssignedGroups(
	profileId: string,
	organizationId: string,
	options: FetchAssignedGroupsOptions = {}
): Promise<AnimalGroup[]> {
	const { fields = ["id", "name", "description", "priority", "animal_ids"] } =
		options;

	try {
		const selectFields = fields.includes("*") ? "*" : fields.join(", ");
		const { data, error } = await supabase
			.from("animal_groups")
			.select(selectFields)
			.eq("organization_id", organizationId)
			.eq("current_foster_id", profileId);

		if (error) {
			throw new Error(
				getErrorMessage(
					error,
					"Failed to load assigned groups. Please try again."
				)
			);
		}

		// Return empty array if no groups (this is valid, not an error)
		return (data || []) as unknown as AnimalGroup[];
	} catch (err) {
		throw new Error(
			getErrorMessage(
				err,
				"Failed to load assigned groups. Please try again."
			)
		);
	}
}

/**
 * Create a new group
 */
export async function createGroup(
	organizationId: string,
	groupData: {
		name?: string | null;
		description?: string | null;
		priority?: boolean;
		animal_ids?: string[];
		photos?: unknown[] | null;
	}
): Promise<AnimalGroup> {
	try {
		const { data, error } = await supabase
			.from("animal_groups")
			.insert({
				...groupData,
				organization_id: organizationId,
			})
			.select()
			.single();

		if (error) {
			throw new Error(
				getErrorMessage(
					error,
					"Failed to create group. Please try again."
				)
			);
		}

		if (!data) {
			throw new Error("Group was not created. Please try again.");
		}

		return data as AnimalGroup;
	} catch (err) {
		throw new Error(
			getErrorMessage(err, "Failed to create group. Please try again.")
		);
	}
}

/**
 * Update an existing group
 */
export async function updateGroup(
	groupId: string,
	organizationId: string,
	groupData: {
		name?: string | null;
		description?: string | null;
		priority?: boolean;
		animal_ids?: string[];
		photos?: unknown[] | null;
	}
): Promise<AnimalGroup> {
	try {
		const { data, error } = await supabase
			.from("animal_groups")
			.update(groupData)
			.eq("id", groupId)
			.eq("organization_id", organizationId)
			.select()
			.single();

		if (error) {
			throw new Error(
				getErrorMessage(
					error,
					"Failed to update group. Please try again."
				)
			);
		}

		if (!data) {
			throw new Error("Group was not updated. Please try again.");
		}

		return data as AnimalGroup;
	} catch (err) {
		throw new Error(
			getErrorMessage(err, "Failed to update group. Please try again.")
		);
	}
}
