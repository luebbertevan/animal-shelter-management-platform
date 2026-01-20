import { supabase } from "./supabase";
import {
	getErrorMessage,
	isOffline,
	handleSupabaseNotFound,
} from "./errorUtils";
import { deleteGroupFolder, deleteGroupPhoto } from "./photoUtils";
import type { AnimalGroup } from "../types";
import type { GroupFilters } from "../components/animals/GroupFilters";
import { applyGroupFilters, applyNameSearch } from "./filterUtils";

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
	// Pagination: limit (page size). Default: 50
	limit?: number;
	// Pagination: offset (number of records to skip). Default: 0
	offset?: number;
	// Filters to apply to the query
	filters?: GroupFilters;
	// Search term to filter by group name
	searchTerm?: string;
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
		limit,
		offset = 0,
		filters = {},
		searchTerm = "",
	} = options;

	try {
		const selectFields = fields.includes("*") ? "*" : fields.join(", ");
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let query: any = supabase.from("animal_groups").select(selectFields);

		// Apply filters (includes organization_id filter)
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		query = applyGroupFilters(query, filters, organizationId) as any;

		// Apply search
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		query = applyNameSearch(query, searchTerm, "name") as any;

		// Add ordering if specified (or from filters)
		const finalOrderBy =
			filters.sortByCreatedAt === "oldest" ? "created_at" : orderBy;
		const finalOrderDirection =
			filters.sortByCreatedAt === "oldest" ? "asc" : orderDirection;

		if (finalOrderBy) {
			query = query.order(finalOrderBy, {
				ascending: finalOrderDirection === "asc",
			});
		}

		// Add pagination if specified
		if (limit !== undefined) {
			query = query.range(offset, offset + limit - 1);
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
		created_by?: string;
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
		group_photos?: unknown[] | null;
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

/**
 * Find which group (if any) contains a specific animal
 * Returns the group ID and name if found, null otherwise
 */
export async function findGroupContainingAnimal(
	animalId: string,
	organizationId: string,
	excludeGroupId?: string // Optional: exclude a specific group (useful for edit mode)
): Promise<{ id: string; name: string } | null> {
	try {
		// Fetch all groups and filter in JavaScript
		// (Supabase .contains() may not work as expected for array contains)
		const { data: allGroups, error } = await supabase
			.from("animal_groups")
			.select("id, name, animal_ids")
			.eq("organization_id", organizationId);

		if (error) {
			throw new Error(
				getErrorMessage(
					error,
					"Failed to check for duplicate group assignment."
				)
			);
		}

		if (!allGroups || allGroups.length === 0) {
			return null;
		}

		// Find groups that contain this animal
		const matchingGroups = allGroups.filter(
			(group) =>
				group.animal_ids &&
				Array.isArray(group.animal_ids) &&
				group.animal_ids.includes(animalId) &&
				(!excludeGroupId || group.id !== excludeGroupId)
		);

		if (matchingGroups.length === 0) {
			return null;
		}

		// Return the first matching group
		return {
			id: matchingGroups[0].id,
			name: matchingGroups[0].name,
		};
	} catch (err) {
		throw new Error(
			getErrorMessage(
				err,
				"Failed to check for duplicate group assignment."
			)
		);
	}
}

/**
 * Delete a group and all associated data
 * - Deletes group photos from storage
 * - Sets animals' group_id to null (does NOT delete animals)
 * - Deletes the group record
 */
export async function deleteGroup(
	groupId: string,
	organizationId: string,
	groupPhotos?: Array<{ url: string }>
): Promise<void> {
	try {
		// Step 1: Delete all photos from storage and clean up the group folder
		// We delete the entire folder to ensure cleanup of any orphaned files
		// This matches the pattern used in deleteAnimal
		try {
			await deleteGroupFolder(groupId, organizationId);
		} catch (folderError) {
			// If folder deletion fails, try deleting individual photos as fallback
			// This handles cases where folder deletion fails due to RLS or other issues
			if (groupPhotos && groupPhotos.length > 0) {
				console.error(
					"Group folder deletion failed, trying individual photo deletion:",
					folderError
				);
				const deleteResults = await Promise.allSettled(
					groupPhotos.map((photo) =>
						deleteGroupPhoto(photo.url, organizationId)
					)
				);

				const failures = deleteResults.filter(
					(result) => result.status === "rejected"
				);
				if (failures.length > 0) {
					console.error(
						`Failed to delete ${failures.length} of ${groupPhotos.length} group photos after folder deletion failed`
					);
				}
			}
			// Note: We continue with group deletion even if photo deletion fails
			// This is intentional - we don't want to leave orphaned group records
		}

		// Step 2: Set animals' group_id to null (do NOT delete animals)
		const { data: groupData, error: fetchError } = await supabase
			.from("animal_groups")
			.select("animal_ids")
			.eq("id", groupId)
			.eq("organization_id", organizationId)
			.single();

		if (fetchError) {
			// If we can't fetch the group, we can't delete it
			throw new Error(
				getErrorMessage(
					fetchError,
					"Group not found or you don't have permission to delete it."
				)
			);
		}

		if (
			groupData &&
			groupData.animal_ids &&
			groupData.animal_ids.length > 0
		) {
			const animalIds = groupData.animal_ids as string[];
			const { error: updateError } = await supabase
				.from("animals")
				.update({ group_id: null })
				.in("id", animalIds)
				.eq("organization_id", organizationId);

			if (updateError) {
				console.error("Error updating animals' group_id:", updateError);
				// Continue with group deletion even if animal update fails
				// Log warning but don't fail the operation
			}
		}

		// Step 3: Delete the group record
		const { data, error: deleteError } = await supabase
			.from("animal_groups")
			.delete()
			.eq("id", groupId)
			.eq("organization_id", organizationId)
			.select();

		if (deleteError) {
			// Check if it's a permission/RLS error
			if (
				deleteError.code === "PGRST301" ||
				deleteError.message?.includes("permission") ||
				deleteError.message?.includes("policy")
			) {
				throw new Error(
					"You don't have permission to delete this group."
				);
			}
			throw new Error(
				getErrorMessage(
					deleteError,
					"Failed to delete group. Please try again."
				)
			);
		}

		// Verify that a row was actually deleted
		if (!data || data.length === 0) {
			// If we got here, the group existed in Step 2 but couldn't be deleted
			// This likely means an RLS policy is blocking the delete
			throw new Error(
				"You don't have permission to delete this group, or the group was already deleted."
			);
		}
	} catch (err) {
		throw new Error(
			getErrorMessage(err, "Failed to delete group. Please try again.")
		);
	}
}

/**
 * Get total count of groups for an organization (for pagination)
 * This function applies the same filters as fetchGroups but only returns the count
 */
export async function fetchGroupsCount(
	organizationId: string,
	filters: GroupFilters = {},
	searchTerm: string = ""
): Promise<number> {
	try {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let query: any = supabase
			.from("animal_groups")
			.select("*", { count: "exact", head: true });

		// Apply filters (includes organization_id filter)
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		query = applyGroupFilters(query, filters, organizationId) as any;

		// Apply search
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		query = applyNameSearch(query, searchTerm, "name") as any;

		const { count, error } = await query;

		if (error) {
			throw new Error(
				getErrorMessage(
					error,
					"Failed to fetch group count. Please try again."
				)
			);
		}

		return count || 0;
	} catch (err) {
		throw new Error(
			getErrorMessage(
				err,
				"Failed to fetch group count. Please try again."
			)
		);
	}
}
