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

