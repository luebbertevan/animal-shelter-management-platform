import { supabase } from "./supabase";
import { getErrorMessage } from "./errorUtils";
import { transformTagsToLinks } from "./messageLinkUtils";
import type { MessageTag, AnimalStatus, FosterVisibility } from "../types";
import { TAG_TYPES } from "../types";

/**
 * Gets the coordinator group conversation ID for an organization
 */
async function getCoordinatorGroupConversationId(
	organizationId: string
): Promise<string | null> {
	const { data, error } = await supabase
		.from("conversations")
		.select("id")
		.eq("type", "coordinator_group")
		.eq("organization_id", organizationId)
		.maybeSingle();

	if (error) {
		// Log error but don't fail assignment - return null gracefully
		console.error("Error fetching coordinator group conversation:", error);
		return null;
	}

	return data?.id || null;
}

/**
 * Gets the foster's conversation ID for sending messages
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
		// Log error but don't fail assignment - return null gracefully
		console.error("Error fetching foster conversation:", error);
		return null;
	}

	return data?.id || null;
}

/**
 * Sends a message to a foster's conversation with optional animal/group tag
 * If the foster is a coordinator, routes to the coordinator_group conversation instead
 */
async function sendAssignmentMessage(
	fosterId: string,
	organizationId: string,
	message: string,
	tag?: MessageTag
): Promise<void> {
	// Check if the foster is a coordinator
	const { data: fosterProfile, error: profileError } = await supabase
		.from("profiles")
		.select("role")
		.eq("id", fosterId)
		.eq("organization_id", organizationId)
		.single();

	if (profileError) {
		// Log error but don't fail assignment - try to get conversation anyway
		console.error("Error fetching foster profile:", profileError);
	}

	// If foster is a coordinator, use coordinator_group conversation
	// Otherwise, use foster_chat conversation
	let conversationId: string | null = null;
	if (fosterProfile?.role === "coordinator") {
		conversationId = await getCoordinatorGroupConversationId(
			organizationId
		);
	} else {
		conversationId = await getFosterConversationId(
			fosterId,
			organizationId
		);
	}

	if (!conversationId) {
		// No conversation found - skip sending message
		console.warn(
			`No conversation found for foster ${fosterId} (role: ${fosterProfile?.role || "unknown"}), skipping message`
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
		// Log error but don't fail assignment
		console.error("Error sending assignment message:", messageError);
		return;
	}

	// Insert message link (tag) if provided
	if (messageData?.id && tag) {
		const links = transformTagsToLinks(messageData.id, [tag]);
		const { error: linkError } = await supabase
			.from("message_links")
			.insert(links);

		if (linkError) {
			// Log error but don't fail assignment
			console.error("Error adding message tag:", linkError);
		}
	}
}

/**
 * Checks if assigning an animal would conflict with group assignment
 */
export async function checkGroupAssignmentConflict(
	animalId: string,
	fosterId: string,
	organizationId: string
): Promise<{ hasConflict: boolean; groupId?: string; groupFosterId?: string }> {
	// Check if animal is in a group
	const { data: animal, error: animalError } = await supabase
		.from("animals")
		.select("group_id")
		.eq("id", animalId)
		.eq("organization_id", organizationId)
		.single();

	if (animalError || !animal?.group_id) {
		// Animal not found or not in a group - no conflict
		return { hasConflict: false };
	}

	// Check if group is assigned to a different foster
	const { data: group, error: groupError } = await supabase
		.from("animal_groups")
		.select("id, current_foster_id")
		.eq("id", animal.group_id)
		.eq("organization_id", organizationId)
		.single();

	if (groupError || !group) {
		// Group not found - no conflict
		return { hasConflict: false };
	}

	// If group has a foster assigned and it's different from the one we're trying to assign
	if (group.current_foster_id && group.current_foster_id !== fosterId) {
		return {
			hasConflict: true,
			groupId: group.id,
			groupFosterId: group.current_foster_id,
		};
	}

	return { hasConflict: false };
}

/**
 * Validates that all animals in a group can be assigned together
 */
export async function validateGroupAssignment(
	groupId: string,
	organizationId: string
): Promise<{ valid: boolean; errors: string[] }> {
	const errors: string[] = [];

	// Fetch group
	const { data: group, error: groupError } = await supabase
		.from("animal_groups")
		.select("id, animal_ids")
		.eq("id", groupId)
		.eq("organization_id", organizationId)
		.single();

	if (groupError || !group) {
		errors.push("Group not found");
		return { valid: false, errors };
	}

	if (!group.animal_ids || group.animal_ids.length === 0) {
		errors.push("Group has no animals");
		return { valid: false, errors };
	}

	// Check that all animals exist and belong to the organization
	const { data: animals, error: animalsError } = await supabase
		.from("animals")
		.select("id, name")
		.in("id", group.animal_ids)
		.eq("organization_id", organizationId);

	if (animalsError) {
		errors.push("Failed to validate group animals");
		return { valid: false, errors };
	}

	if (!animals || animals.length !== group.animal_ids.length) {
		errors.push("Some animals in the group were not found");
		return { valid: false, errors };
	}

	return { valid: true, errors: [] };
}

/**
 * Assigns a group and all its animals to a foster
 */
export async function assignGroupToFoster(
	groupId: string,
	fosterId: string,
	organizationId: string,
	message?: string
): Promise<void> {
	// Validate group assignment
	const validation = await validateGroupAssignment(groupId, organizationId);
	if (!validation.valid) {
		throw new Error(
			`Cannot assign group: ${validation.errors.join(", ")}`
		);
	}

	// Fetch group to get animal_ids and name
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

	// Fetch foster name for message
	const { data: foster, error: fosterError } = await supabase
		.from("profiles")
		.select("full_name, email")
		.eq("id", fosterId)
		.eq("organization_id", organizationId)
		.single();

	if (fosterError || !foster) {
		throw new Error(
			getErrorMessage(
				fosterError,
				"Failed to fetch foster. Please try again."
			)
		);
	}

	const fosterName = foster.full_name || foster.email || "Foster";

	// Update group: set current_foster_id, status, and foster_visibility
	const { error: updateGroupError } = await supabase
		.from("animal_groups")
		.update({
			current_foster_id: fosterId,
		})
		.eq("id", groupId)
		.eq("organization_id", organizationId);

	if (updateGroupError) {
		throw new Error(
			getErrorMessage(
				updateGroupError,
				"Failed to assign group. Please try again."
			)
		);
	}

	// Update all animals in the group
	if (group.animal_ids && group.animal_ids.length > 0) {
		const { error: updateAnimalsError } = await supabase
			.from("animals")
			.update({
				current_foster_id: fosterId,
				status: "in_foster",
				foster_visibility: "not_visible",
			})
			.in("id", group.animal_ids)
			.eq("organization_id", organizationId);

		if (updateAnimalsError) {
			throw new Error(
				getErrorMessage(
					updateAnimalsError,
					"Failed to assign animals in group. Please try again."
				)
			);
		}
	}

	// Send message to foster's conversation
	const groupName = group.name || "Unnamed Group";
	const defaultMessage = `Hi ${fosterName}, ${groupName} has been assigned to you.`;
	const finalMessage = message?.trim() || defaultMessage;

	// Create tag for the group
	const groupTag: MessageTag = {
		type: TAG_TYPES.GROUP,
		id: groupId,
		name: groupName,
	};

	await sendAssignmentMessage(fosterId, organizationId, finalMessage, groupTag);
}

/**
 * Assigns an individual animal to a foster
 */
export async function assignAnimalToFoster(
	animalId: string,
	fosterId: string,
	organizationId: string,
	message?: string
): Promise<void> {
	// Check for group assignment conflict
	const conflict = await checkGroupAssignmentConflict(
		animalId,
		fosterId,
		organizationId
	);

	if (conflict.hasConflict) {
		throw new Error(
			"This animal is in a group that is assigned to a different foster. Please assign the entire group instead."
		);
	}

	// Fetch animal to get name
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

	// If animal is in a group, block individual assignment
	if (animal.group_id) {
		throw new Error(
			"This animal is in a group. Please assign the entire group instead."
		);
	}

	// Fetch foster name for message
	const { data: foster, error: fosterError } = await supabase
		.from("profiles")
		.select("full_name, email")
		.eq("id", fosterId)
		.eq("organization_id", organizationId)
		.single();

	if (fosterError || !foster) {
		throw new Error(
			getErrorMessage(
				fosterError,
				"Failed to fetch foster. Please try again."
			)
		);
	}

	const fosterName = foster.full_name || foster.email || "Foster";

	// Update animal: set current_foster_id, status, and foster_visibility
	const { error: updateError } = await supabase
		.from("animals")
		.update({
			current_foster_id: fosterId,
			status: "in_foster",
			foster_visibility: "not_visible",
		})
		.eq("id", animalId)
		.eq("organization_id", organizationId);

	if (updateError) {
		throw new Error(
			getErrorMessage(
				updateError,
				"Failed to assign animal. Please try again."
			)
		);
	}

	// Send message to foster's conversation
	const animalName = animal.name || "Unnamed Animal";
	const defaultMessage = `Hi ${fosterName}, ${animalName} has been assigned to you.`;
	const finalMessage = message?.trim() || defaultMessage;

	// Create tag for the animal
	const animalTag: MessageTag = {
		type: TAG_TYPES.ANIMAL,
		id: animalId,
		name: animalName,
	};

	await sendAssignmentMessage(fosterId, organizationId, finalMessage, animalTag);
}

/**
 * Unassigns a group and all its animals from the current foster
 */
export async function unassignGroup(
	groupId: string,
	organizationId: string,
	newStatus: AnimalStatus = "in_shelter",
	newVisibility: FosterVisibility = "available_now",
	message?: string
): Promise<void> {
	// Fetch group to get animal_ids, name, and current_foster_id
	const { data: group, error: groupError } = await supabase
		.from("animal_groups")
		.select("id, name, animal_ids, current_foster_id")
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

	if (!group.current_foster_id) {
		throw new Error("This group is not currently assigned to a foster.");
	}

	const fosterId = group.current_foster_id;

	// Fetch foster name for message
	const { data: foster, error: fosterError } = await supabase
		.from("profiles")
		.select("full_name, email")
		.eq("id", fosterId)
		.eq("organization_id", organizationId)
		.single();

	if (fosterError || !foster) {
		throw new Error(
			getErrorMessage(
				fosterError,
				"Failed to fetch foster. Please try again."
			)
		);
	}

	const fosterName = foster.full_name || foster.email || "Foster";

	// Update group: clear current_foster_id
	const { error: updateGroupError } = await supabase
		.from("animal_groups")
		.update({
			current_foster_id: null,
		})
		.eq("id", groupId)
		.eq("organization_id", organizationId);

	if (updateGroupError) {
		throw new Error(
			getErrorMessage(
				updateGroupError,
				"Failed to unassign group. Please try again."
			)
		);
	}

	// Update all animals in the group
	if (group.animal_ids && group.animal_ids.length > 0) {
		const { error: updateAnimalsError } = await supabase
			.from("animals")
			.update({
				current_foster_id: null,
				status: newStatus,
				foster_visibility: newVisibility,
			})
			.in("id", group.animal_ids)
			.eq("organization_id", organizationId);

		if (updateAnimalsError) {
			throw new Error(
				getErrorMessage(
					updateAnimalsError,
					"Failed to unassign animals in group. Please try again."
				)
			);
		}
	}

	// Send message to foster's conversation
	const groupName = group.name || "Unnamed Group";
	const defaultMessage = `Hi ${fosterName}, ${groupName} is no longer assigned to you.`;
	const finalMessage = message?.trim() || defaultMessage;

	// Create tag for the group
	const groupTag: MessageTag = {
		type: TAG_TYPES.GROUP,
		id: groupId,
		name: groupName,
	};

	await sendAssignmentMessage(fosterId, organizationId, finalMessage, groupTag);
}

/**
 * Unassigns an individual animal from the current foster
 */
export async function unassignAnimal(
	animalId: string,
	organizationId: string,
	newStatus: AnimalStatus = "in_shelter",
	newVisibility: FosterVisibility = "available_now",
	message?: string
): Promise<void> {
	// Fetch animal to get name, group_id, and current_foster_id
	const { data: animal, error: animalError } = await supabase
		.from("animals")
		.select("id, name, group_id, current_foster_id")
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

	// If animal is in a group, block individual unassignment
	if (animal.group_id) {
		throw new Error(
			"This animal is in a group. Please unassign the entire group instead."
		);
	}

	if (!animal.current_foster_id) {
		throw new Error("This animal is not currently assigned to a foster.");
	}

	const fosterId = animal.current_foster_id;

	// Fetch foster name for message
	const { data: foster, error: fosterError } = await supabase
		.from("profiles")
		.select("full_name, email")
		.eq("id", fosterId)
		.eq("organization_id", organizationId)
		.single();

	if (fosterError || !foster) {
		throw new Error(
			getErrorMessage(
				fosterError,
				"Failed to fetch foster. Please try again."
			)
		);
	}

	const fosterName = foster.full_name || foster.email || "Foster";

	// Update animal: clear current_foster_id and update status/visibility
	const { error: updateError } = await supabase
		.from("animals")
		.update({
			current_foster_id: null,
			status: newStatus,
			foster_visibility: newVisibility,
		})
		.eq("id", animalId)
		.eq("organization_id", organizationId);

	if (updateError) {
		throw new Error(
			getErrorMessage(
				updateError,
				"Failed to unassign animal. Please try again."
			)
		);
	}

	// Send message to foster's conversation
	const animalName = animal.name || "Unnamed Animal";
	const defaultMessage = `Hi ${fosterName}, ${animalName} is no longer assigned to you.`;
	const finalMessage = message?.trim() || defaultMessage;

	// Create tag for the animal
	const animalTag: MessageTag = {
		type: TAG_TYPES.ANIMAL,
		id: animalId,
		name: animalName,
	};

	await sendAssignmentMessage(fosterId, organizationId, finalMessage, animalTag);
}

