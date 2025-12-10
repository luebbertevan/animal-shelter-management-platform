import type {
	MessageLinkRaw,
	MessageTag,
	MessageWithLinks,
	MessageWithMetadata,
	TagType,
} from "../types";
import { TAG_TYPES } from "../types";
import { extractFullName } from "./supabaseUtils";

/**
 * Determines the entity type from a message link based on which ID field is set
 */
export function getEntityTypeFromLink(link: MessageLinkRaw): TagType | null {
	if (link.animal_id) return TAG_TYPES.ANIMAL;
	if (link.group_id) return TAG_TYPES.GROUP;
	if (link.foster_profile_id) return TAG_TYPES.FOSTER;
	return null;
}

/**
 * Gets the display name for a message link based on its entity type
 */
export function getDisplayNameFromLink(link: MessageLinkRaw): string | null {
	if (link.animal_id && link.animals) {
		return link.animals.name || "Unnamed Animal";
	}
	if (link.group_id && link.animal_groups) {
		return link.animal_groups.name || "Unnamed Group";
	}
	if (link.foster_profile_id && link.profiles) {
		return link.profiles.full_name || "Unknown Foster";
	}
	return null;
}

/**
 * Gets the entity ID from a message link based on its type
 */
export function getEntityIdFromLink(link: MessageLinkRaw): string | null {
	if (link.animal_id) return link.animal_id;
	if (link.group_id) return link.group_id;
	if (link.foster_profile_id) return link.foster_profile_id;
	return null;
}

/**
 * Transforms raw message link data from Supabase into a MessageTag
 */
export function transformLinkToTag(link: MessageLinkRaw): MessageTag | null {
	const type = getEntityTypeFromLink(link);
	if (!type) return null;

	const id = getEntityIdFromLink(link);
	if (!id) return null;

	const name = getDisplayNameFromLink(link);
	if (!name) return null;

	return { type, id, name };
}

/**
 * Transforms an array of raw message links into an array of MessageTags
 */
export function transformLinksToTags(
	links: MessageLinkRaw[] | null
): MessageTag[] {
	if (!links || links.length === 0) return [];

	try {
		return links
			.map(transformLinkToTag)
			.filter((tag): tag is MessageTag => tag !== null);
	} catch (error) {
		console.error("Error transforming links to tags:", error);
		return [];
	}
}

/**
 * Transforms MessageTags into database format for insertion into message_links table
 * @param messageId - The ID of the message these tags belong to
 * @param tags - Array of tags to transform
 * @returns Array of link objects ready for database insertion
 */
export function transformTagsToLinks(
	messageId: string,
	tags: MessageTag[]
): Array<{
	message_id: string;
	animal_id: string | null;
	group_id: string | null;
	foster_profile_id: string | null;
}> {
	return tags.map((tag) => {
		const link = {
			message_id: messageId,
			animal_id: null as string | null,
			group_id: null as string | null,
			foster_profile_id: null as string | null,
		};

		switch (tag.type) {
			case TAG_TYPES.ANIMAL:
				link.animal_id = tag.id;
				break;
			case TAG_TYPES.GROUP:
				link.group_id = tag.id;
				break;
			case TAG_TYPES.FOSTER:
				link.foster_profile_id = tag.id;
				break;
		}

		return link;
	});
}

/**
 * Normalizes Supabase response for message links
 * Handles inconsistency where Supabase may return arrays or single objects for joined data
 * @param links - Raw Supabase response (may have arrays or single objects)
 * @param messageId - The message ID these links belong to
 * @returns Normalized array of MessageLinkRaw
 */
export function normalizeSupabaseLinks(
	links: Array<{
		id: string;
		animal_id: string | null;
		group_id: string | null;
		foster_profile_id: string | null;
		animals: { name: string } | { name: string }[] | null;
		animal_groups: { name: string } | { name: string }[] | null;
		profiles: { full_name: string } | { full_name: string }[] | null;
	}>,
	messageId: string
): MessageLinkRaw[] {
	return links.map((link) => ({
		id: link.id,
		message_id: messageId,
		animal_id: link.animal_id,
		group_id: link.group_id,
		foster_profile_id: link.foster_profile_id,
		animals: Array.isArray(link.animals)
			? link.animals[0] || null
			: link.animals || null,
		animal_groups: Array.isArray(link.animal_groups)
			? link.animal_groups[0] || null
			: link.animal_groups || null,
		profiles: Array.isArray(link.profiles)
			? link.profiles[0] || null
			: link.profiles || null,
	}));
}

/**
 * Transforms a message with links from Supabase into a message with metadata for UI
 * Handles sender name extraction and tag transformation
 * @param msg - Message with links from Supabase query
 * @returns Message with sender name and tags for UI display
 */
export function transformMessageWithLinks(
	msg: MessageWithLinks
): MessageWithMetadata {
	const links: MessageLinkRaw[] = (msg.message_links || []).map((link) => ({
		id: link.id,
		message_id: msg.id,
		animal_id: link.animal_id,
		group_id: link.group_id,
		foster_profile_id: link.foster_profile_id,
		animals: link.animals,
		animal_groups: link.animal_groups,
		profiles: link.profiles,
	}));

	return {
		id: msg.id,
		conversation_id: msg.conversation_id,
		sender_id: msg.sender_id,
		content: msg.content,
		created_at: msg.created_at,
		edited_at: msg.edited_at ?? undefined,
		photo_urls: msg.photo_urls ?? undefined,
		sender_name: extractFullName(msg.profiles) ?? "",
		tags: transformLinksToTags(links),
	};
}

/**
 * Validates that tag IDs exist and are accessible to the user's organization
 * @param tags - Array of tags to validate
 * @param organizationId - User's organization ID
 * @returns Validation result with any errors
 */
export async function validateTagIds(
	tags: MessageTag[],
	organizationId: string
): Promise<{ valid: boolean; errors: string[] }> {
	if (tags.length === 0) {
		return { valid: true, errors: [] };
	}

	const errors: string[] = [];
	const { supabase } = await import("./supabase");

	// Validate each tag
	for (const tag of tags) {
		try {
			if (tag.type === TAG_TYPES.ANIMAL) {
				const { data, error } = await supabase
					.from("animals")
					.select("id, organization_id")
					.eq("id", tag.id)
					.eq("organization_id", organizationId)
					.single();

				if (error || !data) {
					errors.push(
						`Animal "${tag.name}" not found or not accessible`
					);
				}
			} else if (tag.type === TAG_TYPES.GROUP) {
				const { data, error } = await supabase
					.from("animal_groups")
					.select("id, organization_id")
					.eq("id", tag.id)
					.eq("organization_id", organizationId)
					.single();

				if (error || !data) {
					errors.push(
						`Group "${tag.name}" not found or not accessible`
					);
				}
			} else if (tag.type === TAG_TYPES.FOSTER) {
				const { data, error: profileError } = await supabase
					.from("profiles")
					.select("id, organization_id, role")
					.eq("id", tag.id)
					.eq("organization_id", organizationId)
					.eq("role", "foster")
					.single();

				if (profileError || !data) {
					errors.push(
						`Foster "${tag.name}" not found or not accessible`
					);
				}
			}
		} catch {
			errors.push(`Error validating ${tag.type} "${tag.name}"`);
		}
	}

	return {
		valid: errors.length === 0,
		errors,
	};
}
