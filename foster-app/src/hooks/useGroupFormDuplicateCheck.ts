import { useState, useCallback } from "react";
import type { Animal } from "../types";
import { findGroupContainingAnimal } from "../lib/groupQueries";

export interface DuplicateGroupModalState {
	isOpen: boolean;
	animalId: string;
	animalName: string;
	existingGroupId: string;
	existingGroupName: string;
}

const INITIAL_DUPLICATE_MODAL: DuplicateGroupModalState = {
	isOpen: false,
	animalId: "",
	animalName: "",
	existingGroupId: "",
	existingGroupName: "",
};

/**
 * Handles duplicate-check when adding an animal to a group (already in another group).
 * Single source of truth for NewGroup and EditGroup.
 */
export function useGroupFormDuplicateCheck({
	selectedAnimalIds,
	toggleAnimalSelection,
	animals,
	organizationId,
	excludeGroupId,
}: {
	selectedAnimalIds: string[];
	toggleAnimalSelection: (animalId: string) => void;
	animals: Animal[];
	organizationId: string;
	excludeGroupId?: string;
}) {
	const [duplicateModal, setDuplicateModal] =
		useState<DuplicateGroupModalState>(INITIAL_DUPLICATE_MODAL);

	const closeDuplicateModal = useCallback(() => {
		setDuplicateModal(INITIAL_DUPLICATE_MODAL);
	}, []);

	const handleAnimalSelection = useCallback(
		async (animalId: string) => {
			if (selectedAnimalIds.includes(animalId)) {
				toggleAnimalSelection(animalId);
				return;
			}
			try {
				const existingGroup = await findGroupContainingAnimal(
					animalId,
					organizationId,
					excludeGroupId
				);
				if (existingGroup) {
					const animal = animals.find((a) => a.id === animalId);
					const animalName = animal?.name || "This animal";
					setDuplicateModal({
						isOpen: true,
						animalId,
						animalName,
						existingGroupId: existingGroup.id,
						existingGroupName: existingGroup.name,
					});
				} else {
					toggleAnimalSelection(animalId);
				}
			} catch (err) {
				console.error(
					"Error checking for duplicate group assignment:",
					err
				);
				toggleAnimalSelection(animalId);
			}
		},
		[
			selectedAnimalIds,
			toggleAnimalSelection,
			animals,
			organizationId,
			excludeGroupId,
		]
	);

	const handleMoveToNew = useCallback(() => {
		toggleAnimalSelection(duplicateModal.animalId);
		closeDuplicateModal();
	}, [duplicateModal.animalId, toggleAnimalSelection, closeDuplicateModal]);

	const handleCancelMove = useCallback(() => {
		closeDuplicateModal();
	}, [closeDuplicateModal]);

	return {
		duplicateModal,
		handleAnimalSelection,
		handleMoveToNew,
		handleCancelMove,
	};
}
