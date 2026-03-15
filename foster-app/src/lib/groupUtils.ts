import type { Animal, AnimalStatus, FosterVisibility } from "../types";

/** Derived state for GroupForm status/visibility messages and conflict UI (single source of truth for NewGroup + EditGroup). */
export interface GroupFormMessageState {
	sharedFosterVisibilityFromSelected: FosterVisibility | null;
	/** Shared visibility of selected animals from DB only (no staged changes). Used to show "match" vs "will be set". */
	sharedFosterVisibilityFromCurrentOnly: FosterVisibility | null;
	hasFosterVisibilityConflictComputed: boolean;
	hasConflictFromCurrentVisibility: boolean;
	sharedStatusFromSelected: AnimalStatus | "";
	hasMismatchFromCurrentStatus: boolean;
}

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
		return { sharedValue: null, hasConflict: true };
	}

	return {
		sharedValue: visibilityValues[0] || null,
		hasConflict: false,
	};
}

/**
 * Check if changing an animal's foster_visibility would create a conflict
 * with other animals in its group.
 *
 * @param animal - The animal whose visibility is being changed
 * @param newVisibility - The proposed new foster_visibility value
 * @param groupAnimals - All animals in the group (including the animal being changed)
 * @returns true if the change would create a conflict, false otherwise
 */
export function wouldFosterVisibilityChangeConflict(
	animal: Animal,
	newVisibility: FosterVisibility,
	groupAnimals: Animal[]
): boolean {
	// If not changing, no conflict
	if (animal.foster_visibility === newVisibility) {
		return false;
	}

	// Get other animals in the group (excluding the one being changed)
	const otherAnimals = groupAnimals.filter((a) => a.id !== animal.id);

	// If no other animals, no conflict
	if (otherAnimals.length === 0) {
		return false;
	}

	// Get visibility values of other animals
	const otherAnimalsVisibility = otherAnimals.map((a) => a.foster_visibility);
	const uniqueVisibility = new Set(otherAnimalsVisibility);

	// Conflict exists if:
	// 1. Other animals already have different visibility values (conflict already exists)
	// 2. The new value doesn't match the existing shared value (would create conflict)
	return (
		uniqueVisibility.size > 1 ||
		(uniqueVisibility.size === 1 && !uniqueVisibility.has(newVisibility))
	);
}

/**
 * Compute status/visibility message and conflict state for group create/edit forms.
 * Single source of truth so NewGroup and EditGroup don't duplicate this logic.
 */
export function getGroupFormMessageState(
	selectedAnimals: Animal[],
	selectedAnimalIds: string[],
	stagedStatusChanges: Map<string, AnimalStatus>,
	stagedFosterVisibilityChanges: Map<string, FosterVisibility>
): GroupFormMessageState {
	const {
		sharedValue: sharedFosterVisibilityFromSelected,
		hasConflict: hasFosterVisibilityConflictComputed,
	} = getGroupFosterVisibility(
		selectedAnimals,
		stagedFosterVisibilityChanges
	);
	const {
		sharedValue: sharedFosterVisibilityFromCurrentOnly,
		hasConflict: hasConflictFromCurrentVisibility,
	} = getGroupFosterVisibility(selectedAnimals, undefined);

	let sharedStatusFromSelected: AnimalStatus | "" = "";
	if (selectedAnimalIds.length > 0) {
		const fromStaged = selectedAnimalIds
			.map((id) => stagedStatusChanges.get(id))
			.filter((s): s is AnimalStatus => !!s);
		if (fromStaged.length === selectedAnimalIds.length) {
			const uniq = new Set(fromStaged);
			sharedStatusFromSelected =
				uniq.size === 1 ? fromStaged[0] : "";
		} else {
			const fromAnimals = selectedAnimals.map((a) => a.status);
			const uniq = new Set(fromAnimals);
			sharedStatusFromSelected =
				uniq.size === 1 ? fromAnimals[0] : "";
		}
	}

	// Only existing selected animals have statuses; bulk-add rows don't exist yet
	const hasMismatchFromCurrentStatus =
		selectedAnimalIds.length > 1 &&
		new Set(selectedAnimals.map((a) => a.status)).size > 1;

	return {
		sharedFosterVisibilityFromSelected:
			sharedFosterVisibilityFromSelected ?? null,
		sharedFosterVisibilityFromCurrentOnly:
			sharedFosterVisibilityFromCurrentOnly ?? null,
		hasFosterVisibilityConflictComputed,
		hasConflictFromCurrentVisibility,
		sharedStatusFromSelected,
		hasMismatchFromCurrentStatus,
	};
}

/** Error message when submit is blocked due to visibility conflict; null if submit is allowed. */
const VISIBILITY_CONFLICT_SUBMIT_MESSAGE =
	"Animals in a group must have the same Visibility on Fosters Needed page";

/**
 * Returns the submit-blocking error message when visibility conflicts and user hasn't set "set all visibility".
 * Returns null if submit can proceed. Use in both NewGroup and EditGroup handleSubmit.
 */
export function getVisibilityConflictSubmitError(
	messageState: GroupFormMessageState,
	stagedFosterVisibilityForAll: string
): string | null {
	if (
		messageState.hasFosterVisibilityConflictComputed &&
		!stagedFosterVisibilityForAll
	) {
		return VISIBILITY_CONFLICT_SUBMIT_MESSAGE;
	}
	return null;
}
