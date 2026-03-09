import { useState, useEffect, startTransition } from "react";
import type { AnimalGroup, AnimalStatus, FosterVisibility } from "../types";
import { getEmptyFormState, groupToFormState } from "../lib/groupFormUtils";
import { getFosterVisibilityFromStatus } from "../lib/metadataUtils";

export interface UseGroupFormOptions {
	initialGroup?: AnimalGroup | null;
	/** True when user explicitly chose "Select..." for visibility; skip status→visibility sync when set. */
	visibilityExplicitlyCleared?: boolean;
}

export interface UseGroupFormReturn {
	// Form state
	formState: {
		name: string;
		description: string;
		priority: boolean;
	};
	// Setters
	setName: (value: string) => void;
	setDescription: (value: string) => void;
	setPriority: (value: boolean) => void;
	// Animal selection
	selectedAnimalIds: string[];
	setSelectedAnimalIds: (ids: string[]) => void;
	toggleAnimalSelection: (animalId: string) => void;
	// Staged changes for status and foster_visibility
	stagedStatusChanges: Map<string, AnimalStatus>; // animalId -> new status
	stagedFosterVisibilityChanges: Map<string, FosterVisibility>; // animalId -> new foster_visibility
	stagedStatusForAll: AnimalStatus | ""; // value for "Set all" dropdown (used for bulk-add when no selected animals)
	stagedFosterVisibilityForAll: FosterVisibility | "";
	setStagedStatusForAll: (status: AnimalStatus | "") => void;
	setStagedFosterVisibilityForAll: (
		visibility: FosterVisibility | ""
	) => void;
	// Validation
	validateForm: () => boolean;
	// State
	errors: Record<string, string>;
}

export function useGroupForm(
	options: UseGroupFormOptions = {}
): UseGroupFormReturn {
	const { initialGroup, visibilityExplicitlyCleared = false } = options;

	// Initialize form state from group or empty
	const initialState = initialGroup
		? groupToFormState(initialGroup)
		: getEmptyFormState();

	const [name, setName] = useState(initialState.name);
	const [description, setDescription] = useState(initialState.description);
	const [priority, setPriority] = useState(initialState.priority);
	const [selectedAnimalIds, setSelectedAnimalIds] = useState<string[]>(
		initialGroup?.animal_ids || []
	);
	const [errors, setErrors] = useState<Record<string, string>>({});

	// Track if we've initialized from initialGroup (to handle async loading)
	const [hasInitializedFromGroup, setHasInitializedFromGroup] = useState(
		!!initialGroup
	);

	// Staged changes - stored in form state, not applied until submission
	const [stagedStatusChanges, setStagedStatusChanges] = useState<
		Map<string, AnimalStatus>
	>(new Map());
	const [stagedFosterVisibilityChanges, setStagedFosterVisibilityChanges] =
		useState<Map<string, FosterVisibility>>(new Map());

	// "Set for all" values shown in dropdowns (used when only bulk-add rows are staged)
	const [stagedStatusForAll, setStagedStatusForAllState] = useState<
		AnimalStatus | ""
	>("");
	const [stagedFosterVisibilityForAll, setStagedFosterVisibilityForAllState] =
		useState<FosterVisibility | "">("");

	// Sync form state when initialGroup becomes available (e.g., after page reload)
	useEffect(() => {
		if (initialGroup && !hasInitializedFromGroup) {
			const groupState = groupToFormState(initialGroup);

			// Wrap all state updates in startTransition to mark as non-urgent
			// This satisfies the linter and is the recommended pattern for syncing props to state
			startTransition(() => {
				setName(groupState.name);
				setDescription(groupState.description);
				setPriority(groupState.priority);
				setSelectedAnimalIds(initialGroup.animal_ids || []);
				setHasInitializedFromGroup(true);
			});
		}
	}, [initialGroup, hasInitializedFromGroup]);

	const toggleAnimalSelection = (animalId: string) => {
		setSelectedAnimalIds((prev) => {
			if (prev.includes(animalId)) {
				// Remove animal - also clear any staged changes for this animal
				setStagedStatusChanges((statusMap) => {
					const newMap = new Map(statusMap);
					newMap.delete(animalId);
					return newMap;
				});
				setStagedFosterVisibilityChanges((visibilityMap) => {
					const newMap = new Map(visibilityMap);
					newMap.delete(animalId);
					return newMap;
				});
				return prev.filter((id) => id !== animalId);
			} else {
				return [...prev, animalId];
			}
		});
	};

	// Stage status changes for all selected animals (and store "for all" for dropdown / bulk-add)
	// Syncs foster_visibility from status (one-directional) only when user has not explicitly set visibility to "Select..."
	const setStagedStatusForAll = (status: AnimalStatus | "") => {
		if (status === "") {
			setStagedStatusForAllState("");
			setStagedStatusChanges(new Map());
			return;
		}

		const visibility = getFosterVisibilityFromStatus(status);
		setStagedStatusForAllState(status);

		// Sync visibility from status unless user explicitly chose "Select..." for visibility
		if (!visibilityExplicitlyCleared) {
			setStagedFosterVisibilityForAllState(visibility);
			setStagedFosterVisibilityChanges((prev) => {
				const newMap = new Map(prev);
				selectedAnimalIds.forEach((animalId) => {
					newMap.set(animalId, visibility);
				});
				return newMap;
			});
		}

		setStagedStatusChanges((prev) => {
			const newMap = new Map(prev);
			selectedAnimalIds.forEach((animalId) => {
				newMap.set(animalId, status);
			});
			return newMap;
		});
	};

	// Stage foster_visibility changes for all selected animals (and store "for all" for dropdown / bulk-add)
	const setStagedFosterVisibilityForAll = (
		visibility: FosterVisibility | ""
	) => {
		if (visibility === "") {
			setStagedFosterVisibilityForAllState("");
			setStagedFosterVisibilityChanges(new Map());
			return;
		}

		setStagedFosterVisibilityForAllState(visibility);
		setStagedFosterVisibilityChanges((prev) => {
			const newMap = new Map(prev);
			selectedAnimalIds.forEach((animalId) => {
				newMap.set(animalId, visibility);
			});
			return newMap;
		});
	};

	const validateForm = (): boolean => {
		const newErrors: Record<string, string> = {};

		// Note: foster_visibility conflict validation is done in the parent component
		// where we have access to the actual animal data

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const formState = {
		name,
		description,
		priority,
	};

	return {
		formState,
		setName,
		setDescription,
		setPriority,
		selectedAnimalIds,
		setSelectedAnimalIds,
		toggleAnimalSelection,
		stagedStatusChanges,
		stagedFosterVisibilityChanges,
		stagedStatusForAll,
		stagedFosterVisibilityForAll,
		setStagedStatusForAll,
		setStagedFosterVisibilityForAll,
		validateForm,
		errors,
	};
}
