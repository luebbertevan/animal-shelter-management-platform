import type { AnimalGroup } from "../types";

export interface GroupFormState {
	name: string;
	description: string;
	priority: boolean;
}

/**
 * Transforms an AnimalGroup object into form state for use in forms
 * @param group - The group object to transform
 * @returns Form state object
 */
export function groupToFormState(
	group: AnimalGroup | null | undefined
): GroupFormState {
	if (!group) {
		return getEmptyFormState();
	}

	return {
		name: group.name?.trim() || "",
		description: group.description?.trim() || "",
		priority: group.priority || false,
	};
}

/**
 * Returns an empty form state
 */
export function getEmptyFormState(): GroupFormState {
	return {
		name: "",
		description: "",
		priority: false,
	};
}
