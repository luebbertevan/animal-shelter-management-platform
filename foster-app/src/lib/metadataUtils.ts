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
