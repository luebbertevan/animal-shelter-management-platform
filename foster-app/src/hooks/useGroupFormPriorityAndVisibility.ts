import { useState, useEffect, useMemo } from "react";
import type { Animal } from "../types";

/**
 * Encapsulates priority sync and "visibility explicitly cleared" reset for group create/edit forms.
 * Single source of truth so NewGroup and EditGroup don't duplicate this logic.
 */
export function useGroupFormPriorityAndVisibility({
	selectedAnimals,
	setPriority,
	selectedAnimalIdsLength,
	bulkAddRowsLength,
	setVisibilityExplicitlyCleared,
}: {
	selectedAnimals: Animal[];
	setPriority: (value: boolean) => void;
	selectedAnimalIdsLength: number;
	bulkAddRowsLength: number;
	setVisibilityExplicitlyCleared: (value: boolean) => void;
}) {
	const hasHighPriorityAnimal = useMemo(
		() => selectedAnimals.some((a) => a.priority === true),
		[selectedAnimals]
	);
	const [priorityTouchedByUser, setPriorityTouchedByUser] = useState(false);

	useEffect(() => {
		if (priorityTouchedByUser) return;
		setPriority(hasHighPriorityAnimal);
	}, [hasHighPriorityAnimal, priorityTouchedByUser, setPriority]);

	useEffect(() => {
		setVisibilityExplicitlyCleared(false);
	}, [selectedAnimalIdsLength, bulkAddRowsLength, setVisibilityExplicitlyCleared]);

	const setPriorityWithTouch = (value: boolean) => {
		setPriorityTouchedByUser(true);
		setPriority(value);
	};

	return { setPriorityWithTouch };
}
