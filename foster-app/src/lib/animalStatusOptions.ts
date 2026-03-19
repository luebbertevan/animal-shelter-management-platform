import type { AnimalStatus } from "../types";

/**
 * Single source of truth for human-readable animal status labels.
 */
export const ANIMAL_STATUS_LABELS: Record<AnimalStatus, string> = {
	in_shelter: "In Shelter",
	in_foster: "In Foster",
	transferring: "Transferring",
	medical_hold: "Medical Hold",
	adopted: "Adopted",
	deceased: "Deceased",
	euthanized: "Euthanized",
};

/**
 * Intuitive dropdown order for active lifecycle statuses (no deceased/euthanized).
 * Used for: new animal, group "set all status", bulk add, assignment/unassignment dialogs, Fosters Needed filters.
 */
export const ANIMAL_STATUS_ORDER_STANDARD = [
	"in_shelter",
	"in_foster",
	"transferring",
	"medical_hold",
	"adopted",
] as const satisfies readonly AnimalStatus[];

/** Terminal statuses — only on Edit Animal and coordinator list filters. */
export const ANIMAL_STATUS_ORDER_TERMINAL = [
	"deceased",
	"euthanized",
] as const satisfies readonly AnimalStatus[];

export type AnimalStatusSelectOption = {
	value: AnimalStatus;
	label: string;
};

export function animalStatusLabel(status: AnimalStatus): string {
	return ANIMAL_STATUS_LABELS[status];
}

export function animalStatusDropdownOptionsStandard(): AnimalStatusSelectOption[] {
	return ANIMAL_STATUS_ORDER_STANDARD.map((value) => ({
		value,
		label: ANIMAL_STATUS_LABELS[value],
	}));
}

/** Edit Animal (and anywhere full status including terminal, in order). */
export function animalStatusDropdownOptionsWithTerminal(): AnimalStatusSelectOption[] {
	return [
		...animalStatusDropdownOptionsStandard(),
		...ANIMAL_STATUS_ORDER_TERMINAL.map((value) => ({
			value,
			label: ANIMAL_STATUS_LABELS[value],
		})),
	];
}

/**
 * Status filter dropdown options (Animals List, etc.). Same ordering as edit;
 * optionally exclude values (e.g. deceased/euthanized in group animal picker).
 */
export function animalStatusFilterOptions(
	excludeStatuses?: AnimalStatus[]
): AnimalStatusSelectOption[] {
	const all = animalStatusDropdownOptionsWithTerminal();
	if (!excludeStatuses?.length) return all;
	return all.filter((o) => !excludeStatuses.includes(o.value));
}
