import type { Animal, FosterVisibility } from "../types";

/**
 * Get the effective foster_visibility for an animal
 * (staged change if provided, otherwise current value)
 */
function getEffectiveFosterVisibility(
	animal: Animal,
	stagedChanges?: Map<string, FosterVisibility>
): FosterVisibility {
	if (stagedChanges) {
		const staged = stagedChanges.get(animal.id);
		if (staged) {
			return staged;
		}
	}
	return animal.foster_visibility;
}

/**
 * Check if all animals in a group have the same foster_visibility
 * Returns the shared value if all match, null if there's a conflict
 *
 * @param animals - Array of animals to check
 * @param stagedChanges - Optional map of staged foster_visibility changes (for forms)
 * @returns Object with shared value and conflict status
 */
export function getGroupFosterVisibility(
	animals: Animal[],
	stagedChanges?: Map<string, FosterVisibility>
): {
	sharedValue: FosterVisibility | null;
	hasConflict: boolean;
} {
	if (animals.length === 0) {
		return { sharedValue: null, hasConflict: false };
	}

	// Get effective foster_visibility for each animal
	const visibilityValues = animals.map((animal) =>
		getEffectiveFosterVisibility(animal, stagedChanges)
	);

	// Check if all values are the same
	const uniqueValues = new Set(visibilityValues);
	const hasConflict = uniqueValues.size > 1;

	if (hasConflict) {
		console.warn(
			"Group has animals with different foster_visibility values:",
			Array.from(uniqueValues)
		);
		return { sharedValue: null, hasConflict: true };
	}

	return {
		sharedValue: visibilityValues[0] || null,
		hasConflict: false,
	};
}

