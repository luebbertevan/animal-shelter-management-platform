import type { AnimalStatus, FosterVisibility } from "../types";

/**
 * Format a date string for display
 */
export function formatDateForDisplay(dateString: string): string {
	return new Date(dateString).toLocaleString(undefined, {
		year: "numeric",
		month: "numeric",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

/**
 * Check if updated_at is meaningfully different from created_at
 * Returns true if updated_at exists and is at least 1 second different from created_at
 */
export function hasMeaningfulUpdate(
	createdAt: string,
	updatedAt?: string | null
): boolean {
	if (!updatedAt) {
		return false;
	}
	const updatedTime = new Date(updatedAt).getTime();
	const createdTime = new Date(createdAt).getTime();
	// Consider timestamps the same if within 1 second (1000ms)
	// This handles cases where created_at and updated_at are set
	// at slightly different times during record creation
	const timeDifference = Math.abs(updatedTime - createdTime);
	return timeDifference >= 1000;
}

/**
 * Format foster visibility enum value for display
 */
export function formatFosterVisibility(visibility: FosterVisibility): string {
	switch (visibility) {
		case "available_now":
			return "Available Now";
		case "available_future":
			return "Available Future";
		case "foster_pending":
			return "Foster Pending";
		case "not_visible":
			return "Not Visible";
		default:
			return visibility;
	}
}

/**
 * Get the default foster visibility value based on animal status
 * This implements the one-directional sync rule: status changes update visibility
 */
export function getFosterVisibilityFromStatus(
	animalStatus: AnimalStatus
): FosterVisibility {
	switch (animalStatus) {
		case "in_shelter":
			return "available_now";
		case "medical_hold":
		case "transferring":
			return "available_future";
		case "in_foster":
		case "adopted":
			return "not_visible";
	}
}

/**
 * Format assignment counts (animals and groups) into badge text
 * Returns null if both counts are 0
 */
export function getAssignmentBadgeText(
	animalCount: number,
	groupCount: number
): string | null {
	if (animalCount === 0 && groupCount === 0) {
		return null;
	}

	const parts: string[] = [];

	if (groupCount > 0) {
		parts.push(
			`${groupCount} ${groupCount === 1 ? "group" : "groups"}`
		);
	}

	if (animalCount > 0) {
		parts.push(
			`${animalCount} ${animalCount === 1 ? "animal" : "animals"}`
		);
	}

	return parts.join(", ");
}
