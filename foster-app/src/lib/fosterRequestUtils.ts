import { supabase } from "./supabase";
import { getErrorMessage } from "./errorUtils";
import { transformTagsToLinks } from "./messageLinkUtils";
import type { MessageTag, FosterRequest } from "../types";
import { TAG_TYPES } from "../types";
import {
	fetchPendingRequestForAnimal,
	fetchPendingRequestForGroup,
} from "./fosterRequestQueries";

/**
 * Gets the foster's conversation ID for sending messages
 * Reused from assignmentUtils pattern
 */
async function getFosterConversationId(
	fosterId: string,
	organizationId: string
): Promise<string | null> {
	const { data, error } = await supabase
		.from("conversations")
		.select("id")
		.eq("type", "foster_chat")
		.eq("foster_profile_id", fosterId)
		.eq("organization_id", organizationId)
		.maybeSingle();

	if (error) {
		console.error("Error fetching foster conversation:", error);
		return null;
	}

	return data?.id || null;
}

/**
 * Sends a message to a foster's conversation with optional animal/group tag
 */
async function sendRequestMessage(
	fosterId: string,
	organizationId: string,
	message: string,
	tag?: MessageTag
): Promise<void> {
	const conversationId = await getFosterConversationId(
		fosterId,
		organizationId
	);

	if (!conversationId) {
		console.warn(
			`No conversation found for foster ${fosterId}, skipping message`
		);
		return;
	}

	// Get current user ID for sender
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		throw new Error("User not authenticated");
	}

	// Insert message
	const { data: messageData, error: messageError } = await supabase
		.from("messages")
		.insert({
			conversation_id: conversationId,
			sender_id: user.id,
			content: message.trim() || "",
		})
		.select("id")
		.single();

	if (messageError) {
		console.error("Error sending request message:", messageError);
		return;
	}

	// Insert message link (tag) if provided
	if (messageData?.id && tag) {
		const links = transformTagsToLinks(messageData.id, [tag]);
		const { error: linkError } = await supabase
			.from("message_links")
			.insert(links);

		if (linkError) {
			console.error("Error adding message tag:", linkError);
		}
	}
}

/**
 * Creates a foster request for an animal
 */
export async function createAnimalFosterRequest(
	animalId: string,
	fosterId: string,
	organizationId: string,
	customMessage?: string
): Promise<FosterRequest> {
	// Check for existing pending request
	const existingRequest = await fetchPendingRequestForAnimal(
		animalId,
		fosterId,
		organizationId
	);

	if (existingRequest) {
		throw new Error("You already have a pending request for this animal.");
	}

	// Fetch animal for message/tag (RPC will handle visibility update under RLS)
	const { data: animal, error: animalError } = await supabase
		.from("animals")
		.select("id, name, group_id")
		.eq("id", animalId)
		.eq("organization_id", organizationId)
		.single();

	if (animalError || !animal) {
		throw new Error(
			getErrorMessage(
				animalError,
				"Failed to fetch animal. Please try again."
			)
		);
	}

	// Create request via RPC (handles animal-in-group by upgrading to group request)
	const { data: request, error: requestError } = await supabase.rpc(
		"create_foster_request",
		{
			p_organization_id: organizationId,
			p_animal_id: animalId,
			p_group_id: null,
			p_message: customMessage || null,
		}
	);

	if (requestError || !request) {
		throw new Error(
			getErrorMessage(
				requestError,
				"Failed to create request. Please try again."
			)
		);
	}

	// Send message to foster's conversation
	// If the request was upgraded to a group request, tag/message should reference the group.
	let animalOrGroupName = animal.name || "Unnamed Animal";
	let tag: MessageTag = {
		type: TAG_TYPES.ANIMAL,
		id: animalId,
		name: animalOrGroupName,
	};

	if ((request as FosterRequest).group_id) {
		const groupId = (request as FosterRequest).group_id!;
		const { data: groupData } = await supabase
			.from("animal_groups")
			.select("id, name")
			.eq("id", groupId)
			.eq("organization_id", organizationId)
			.single();

		animalOrGroupName = groupData?.name || "Unnamed Group";
		tag = {
			type: TAG_TYPES.GROUP,
			id: groupId,
			name: animalOrGroupName,
		};
	}

	const defaultMessage = `Hi, I'm interested in fostering ${animalOrGroupName}.`;
	const finalMessage = customMessage?.trim() || defaultMessage;

	await sendRequestMessage(fosterId, organizationId, finalMessage, tag);

	return request as FosterRequest;
}

/**
 * Creates a foster request for a group
 */
export async function createGroupFosterRequest(
	groupId: string,
	fosterId: string,
	organizationId: string,
	customMessage?: string
): Promise<FosterRequest> {
	// Check for existing pending request
	const existingRequest = await fetchPendingRequestForGroup(
		groupId,
		fosterId,
		organizationId
	);

	if (existingRequest) {
		throw new Error("You already have a pending request for this group.");
	}

	// Fetch group to get name for message/tag
	const { data: group, error: groupError } = await supabase
		.from("animal_groups")
		.select("id, name, animal_ids")
		.eq("id", groupId)
		.eq("organization_id", organizationId)
		.single();

	if (groupError || !group) {
		throw new Error(
			getErrorMessage(
				groupError,
				"Failed to fetch group. Please try again."
			)
		);
	}

	const groupName = group.name || "Unnamed Group";

	// Create request via RPC (handles visibility update under RLS)
	const { data: request, error: requestError } = await supabase.rpc(
		"create_foster_request",
		{
			p_organization_id: organizationId,
			p_animal_id: null,
			p_group_id: groupId,
			p_message: customMessage || null,
		}
	);

	if (requestError || !request) {
		throw new Error(
			getErrorMessage(
				requestError,
				"Failed to create request. Please try again."
			)
		);
	}

	// Send message to foster's conversation
	const defaultMessage = `Hi, I'm interested in fostering ${groupName}.`;
	const finalMessage = customMessage?.trim() || defaultMessage;

	const groupTag: MessageTag = {
		type: TAG_TYPES.GROUP,
		id: groupId,
		name: groupName,
	};

	await sendRequestMessage(fosterId, organizationId, finalMessage, groupTag);

	return request as FosterRequest;
}

/**
 * Cancels a foster request
 */
export async function cancelFosterRequest(
	requestId: string,
	organizationId: string,
	customCancelMessage?: string
): Promise<void> {
	// Fetch request first so we can message/tag after cancellation
	const { data: request, error: fetchError } = await supabase
		.from("foster_requests")
		.select("id, animal_id, group_id, foster_profile_id, status")
		.eq("id", requestId)
		.eq("organization_id", organizationId)
		.single();

	if (fetchError || !request) {
		throw new Error(
			getErrorMessage(
				fetchError,
				"Failed to fetch request. Please try again."
			)
		);
	}

	// Cancel via RPC (handles reverting foster_visibility under RLS)
	const { error } = await supabase.rpc("cancel_foster_request", {
		p_organization_id: organizationId,
		p_request_id: requestId,
	});

	if (error) {
		throw new Error(
			getErrorMessage(error, "Failed to cancel request. Please try again.")
		);
	}

	// Auto-message: notify coordinators in the foster chat that the request was cancelled
	// (message is authored by the foster, visible to coordinators)
	const {
		data: { user },
	} = await supabase.auth.getUser();

	// If we can't identify the current user, skip messaging gracefully
	if (!user) return;

	let name = "this animal";
	let tag: MessageTag | undefined;

	if (request.group_id) {
		const { data: group } = await supabase
			.from("animal_groups")
			.select("id, name")
			.eq("id", request.group_id)
			.eq("organization_id", organizationId)
			.single();

		name = group?.name || "Unnamed Group";
		tag = {
			type: TAG_TYPES.GROUP,
			id: request.group_id,
			name,
		};
	} else if (request.animal_id) {
		const { data: animal } = await supabase
			.from("animals")
			.select("id, name")
			.eq("id", request.animal_id)
			.eq("organization_id", organizationId)
			.single();

		name = animal?.name || "Unnamed Animal";
		tag = {
			type: TAG_TYPES.ANIMAL,
			id: request.animal_id,
			name,
		};
	}

	const defaultCancelMessage = `I have cancelled my request to foster ${name}.`;
	const finalCancelMessage = customCancelMessage?.trim() || defaultCancelMessage;
	await sendRequestMessage(user.id, organizationId, finalCancelMessage, tag);
}

/**
 * Check if an animal is in a group
 */
export async function checkAnimalInGroup(
	animalId: string,
	organizationId: string
): Promise<{ inGroup: boolean; groupId?: string; groupName?: string }> {
	const { data: animal, error } = await supabase
		.from("animals")
		.select("group_id")
		.eq("id", animalId)
		.eq("organization_id", organizationId)
		.single();

	if (error || !animal || !animal.group_id) {
		return { inGroup: false };
	}

	// Fetch group name
	const { data: group } = await supabase
		.from("animal_groups")
		.select("name")
		.eq("id", animal.group_id)
		.single();

	return {
		inGroup: true,
		groupId: animal.group_id,
		groupName: group?.name || "Unnamed Group",
	};
}

