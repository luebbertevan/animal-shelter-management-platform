import { supabase } from "./supabase";
import { getErrorMessage } from "./errorUtils";
import type { FosterRequest } from "../types";

/**
 * Fetch a pending request for a specific animal by a specific foster
 */
export async function fetchPendingRequestForAnimal(
	animalId: string,
	fosterId: string,
	organizationId: string
): Promise<FosterRequest | null> {
	const { data, error } = await supabase
		.from("foster_requests")
		.select("*")
		.eq("organization_id", organizationId)
		.eq("foster_profile_id", fosterId)
		.eq("animal_id", animalId)
		.eq("status", "pending")
		.maybeSingle();

	if (error) {
		throw new Error(
			getErrorMessage(
				error,
				"Failed to check existing request. Please try again."
			)
		);
	}

	return data;
}

/**
 * Fetch a pending request for a specific group by a specific foster
 */
export async function fetchPendingRequestForGroup(
	groupId: string,
	fosterId: string,
	organizationId: string
): Promise<FosterRequest | null> {
	const { data, error } = await supabase
		.from("foster_requests")
		.select("*")
		.eq("organization_id", organizationId)
		.eq("foster_profile_id", fosterId)
		.eq("group_id", groupId)
		.eq("status", "pending")
		.maybeSingle();

	if (error) {
		throw new Error(
			getErrorMessage(
				error,
				"Failed to check existing request. Please try again."
			)
		);
	}

	return data;
}

/**
 * Batch check for pending requests for multiple animals and groups
 * Returns a map of item IDs to their request (if any)
 */
export async function fetchPendingRequestsForItems(
	animalIds: string[],
	groupIds: string[],
	fosterId: string,
	organizationId: string
): Promise<Map<string, FosterRequest>> {
	const resultMap = new Map<string, FosterRequest>();

	// Fetch animal requests
	if (animalIds.length > 0) {
		const { data: animalRequests, error: animalError } = await supabase
			.from("foster_requests")
			.select("*")
			.eq("organization_id", organizationId)
			.eq("foster_profile_id", fosterId)
			.in("animal_id", animalIds)
			.eq("status", "pending");

		if (animalError) {
			console.error("Error fetching animal requests:", animalError);
		} else if (animalRequests) {
			for (const request of animalRequests) {
				if (request.animal_id) {
					resultMap.set(request.animal_id, request);
				}
			}
		}
	}

	// Fetch group requests
	if (groupIds.length > 0) {
		const { data: groupRequests, error: groupError } = await supabase
			.from("foster_requests")
			.select("*")
			.eq("organization_id", organizationId)
			.eq("foster_profile_id", fosterId)
			.in("group_id", groupIds)
			.eq("status", "pending");

		if (groupError) {
			console.error("Error fetching group requests:", groupError);
		} else if (groupRequests) {
			for (const request of groupRequests) {
				if (request.group_id) {
					resultMap.set(request.group_id, request);
				}
			}
		}
	}

	return resultMap;
}

/**
 * Fetch all pending requests for a specific animal (for coordinators)
 */
export async function fetchAllPendingRequestsForAnimal(
	animalId: string,
	organizationId: string
): Promise<FosterRequest[]> {
	const { data, error } = await supabase
		.from("foster_requests")
		.select("*")
		.eq("organization_id", organizationId)
		.eq("animal_id", animalId)
		.eq("status", "pending")
		.order("created_at", { ascending: true });

	if (error) {
		throw new Error(
			getErrorMessage(
				error,
				"Failed to fetch pending requests. Please try again."
			)
		);
	}

	return data || [];
}

/**
 * Fetch all pending requests for a specific group (for coordinators)
 */
export async function fetchAllPendingRequestsForGroup(
	groupId: string,
	organizationId: string
): Promise<FosterRequest[]> {
	const { data, error } = await supabase
		.from("foster_requests")
		.select("*")
		.eq("organization_id", organizationId)
		.eq("group_id", groupId)
		.eq("status", "pending")
		.order("created_at", { ascending: true });

	if (error) {
		throw new Error(
			getErrorMessage(
				error,
				"Failed to fetch pending requests. Please try again."
			)
		);
	}

	return data || [];
}

/**
 * Fetch all pending requests for current foster user
 */
export async function fetchMyPendingRequests(
	fosterId: string,
	organizationId: string
): Promise<FosterRequest[]> {
	const { data, error } = await supabase
		.from("foster_requests")
		.select("*")
		.eq("organization_id", organizationId)
		.eq("foster_profile_id", fosterId)
		.eq("status", "pending")
		.order("created_at", { ascending: false });

	if (error) {
		throw new Error(
			getErrorMessage(
				error,
				"Failed to fetch your requests. Please try again."
			)
		);
	}

	return data || [];
}

/**
 * Fetch a request by ID
 */
export async function fetchRequestById(
	requestId: string,
	organizationId: string
): Promise<FosterRequest | null> {
	const { data, error } = await supabase
		.from("foster_requests")
		.select("*")
		.eq("id", requestId)
		.eq("organization_id", organizationId)
		.maybeSingle();

	if (error) {
		throw new Error(
			getErrorMessage(error, "Failed to fetch request. Please try again.")
		);
	}

	return data;
}

// Types for requests with joined data
export interface FosterRequestWithDetails extends FosterRequest {
	foster_name: string;
	animal?: {
		id: string;
		name: string | null;
		photos: Array<{ url: string; uploaded_at: string }> | null;
		status: string;
		priority: boolean | null;
		date_of_birth: string | null;
		group_id: string | null;
		foster_visibility: string;
		created_at: string;
	} | null;
	group?: {
		id: string;
		name: string | null;
		// Matches AnimalGroup.group_photos (TimestampedPhoto[])
		group_photos: Array<{ url: string; uploaded_at: string; uploaded_by: string }> | null;
		animal_ids: string[] | null;
		priority: boolean | null;
		created_at: string;
	} | null;
}

/**
 * Fetch all pending foster requests for an organization (coordinator only)
 * Returns requests with animal/group and foster data joined
 */
export async function fetchOrgPendingRequests(
	organizationId: string,
	options?: {
		sortDirection?: "asc" | "desc";
		limit?: number;
		offset?: number;
	}
): Promise<FosterRequestWithDetails[]> {
	const { sortDirection = "desc", limit, offset } = options || {};

	let query = supabase
		.from("foster_requests")
		.select(
			`
			*,
			profiles!foster_requests_foster_profile_id_fkey(id, full_name, email),
			animals!foster_requests_animal_id_fkey(id, name, photos, status, priority, date_of_birth, group_id, foster_visibility, created_at),
			animal_groups!foster_requests_group_id_fkey(id, name, group_photos, animal_ids, priority, created_at)
		`
		)
		.eq("organization_id", organizationId)
		.eq("status", "pending")
		.order("created_at", { ascending: sortDirection === "asc" });

	if (limit) {
		query = query.limit(limit);
	}

	if (offset) {
		query = query.range(offset, offset + (limit || 10) - 1);
	}

	const { data, error } = await query;

	if (error) {
		throw new Error(
			getErrorMessage(
				error,
				"Failed to fetch pending requests. Please try again."
			)
		);
	}

	// Transform data to FosterRequestWithDetails
	return (data || []).map((item) => {
		const profiles = item.profiles as {
			id: string;
			full_name: string | null;
			email: string;
		} | null;
		const animals = item.animals as FosterRequestWithDetails["animal"];
		const animal_groups =
			item.animal_groups as FosterRequestWithDetails["group"];

		return {
			id: item.id,
			organization_id: item.organization_id,
			foster_profile_id: item.foster_profile_id,
			animal_id: item.animal_id,
			group_id: item.group_id,
			status: item.status,
			previous_foster_visibility: item.previous_foster_visibility,
			message: item.message,
			coordinator_message: item.coordinator_message,
			created_at: item.created_at,
			updated_at: item.updated_at,
			resolved_at: item.resolved_at,
			resolved_by: item.resolved_by,
			foster_name: profiles?.full_name || profiles?.email || "Unknown Foster",
			animal: animals,
			group: animal_groups,
		};
	});
}

/**
 * Fetch count of pending foster requests for an organization
 */
export async function fetchOrgPendingRequestsCount(
	organizationId: string
): Promise<number> {
	const { count, error } = await supabase
		.from("foster_requests")
		.select("id", { count: "exact", head: true })
		.eq("organization_id", organizationId)
		.eq("status", "pending");

	if (error) {
		throw new Error(
			getErrorMessage(
				error,
				"Failed to fetch requests count. Please try again."
			)
		);
	}

	return count || 0;
}

/**
 * Fetch pending requests for a specific animal with foster details (coordinator only)
 */
export async function fetchPendingRequestsForAnimalWithDetails(
	animalId: string,
	organizationId: string
): Promise<FosterRequestWithDetails[]> {
	const { data, error } = await supabase
		.from("foster_requests")
		.select(
			`
			*,
			profiles!foster_requests_foster_profile_id_fkey(id, full_name, email)
		`
		)
		.eq("organization_id", organizationId)
		.eq("animal_id", animalId)
		.eq("status", "pending")
		.order("created_at", { ascending: true });

	if (error) {
		throw new Error(
			getErrorMessage(
				error,
				"Failed to fetch pending requests. Please try again."
			)
		);
	}

	return (data || []).map((item) => {
		const profiles = item.profiles as {
			id: string;
			full_name: string | null;
			email: string;
		} | null;

		return {
			id: item.id,
			organization_id: item.organization_id,
			foster_profile_id: item.foster_profile_id,
			animal_id: item.animal_id,
			group_id: item.group_id,
			status: item.status,
			previous_foster_visibility: item.previous_foster_visibility,
			message: item.message,
			coordinator_message: item.coordinator_message,
			created_at: item.created_at,
			updated_at: item.updated_at,
			resolved_at: item.resolved_at,
			resolved_by: item.resolved_by,
			foster_name: profiles?.full_name || profiles?.email || "Unknown Foster",
		};
	});
}

/**
 * Fetch pending requests for a specific group with foster details (coordinator only)
 */
export async function fetchPendingRequestsForGroupWithDetails(
	groupId: string,
	organizationId: string
): Promise<FosterRequestWithDetails[]> {
	const { data, error } = await supabase
		.from("foster_requests")
		.select(
			`
			*,
			profiles!foster_requests_foster_profile_id_fkey(id, full_name, email)
		`
		)
		.eq("organization_id", organizationId)
		.eq("group_id", groupId)
		.eq("status", "pending")
		.order("created_at", { ascending: true });

	if (error) {
		throw new Error(
			getErrorMessage(
				error,
				"Failed to fetch pending requests. Please try again."
			)
		);
	}

	return (data || []).map((item) => {
		const profiles = item.profiles as {
			id: string;
			full_name: string | null;
			email: string;
		} | null;

		return {
			id: item.id,
			organization_id: item.organization_id,
			foster_profile_id: item.foster_profile_id,
			animal_id: item.animal_id,
			group_id: item.group_id,
			status: item.status,
			previous_foster_visibility: item.previous_foster_visibility,
			message: item.message,
			coordinator_message: item.coordinator_message,
			created_at: item.created_at,
			updated_at: item.updated_at,
			resolved_at: item.resolved_at,
			resolved_by: item.resolved_by,
			foster_name: profiles?.full_name || profiles?.email || "Unknown Foster",
		};
	});
}

