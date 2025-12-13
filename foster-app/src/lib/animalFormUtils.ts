import type {
	Animal,
	AnimalStatus,
	SexSpayNeuterStatus,
	LifeStage,
} from "../types";
import type { AgeUnit } from "./ageUtils";

export interface AnimalFormState {
	name: string;
	status: AnimalStatus;
	displayPlacementRequest: boolean;
	sexSpayNeuterStatus: SexSpayNeuterStatus | "";
	lifeStage: LifeStage | "";
	primaryBreed: string;
	physicalCharacteristics: string;
	medicalNeeds: string;
	behavioralNeeds: string;
	additionalNotes: string;
	bio: string;
	priority: boolean;
	dateOfBirth: string;
	ageValue: number | "";
	ageUnit: AgeUnit | "";
}

export interface AnimalFormStateOptions {
	exclude?: (keyof AnimalFormState)[];
}

/**
 * Transforms an Animal object into form state for use in forms
 * @param animal - The animal object to transform
 * @param options - Options for excluding certain fields
 * @returns Form state object
 */
export function animalToFormState(
	animal: Animal | null | undefined,
	options: AnimalFormStateOptions = {}
): AnimalFormState {
	if (!animal) {
		return getEmptyFormState();
	}

	const { exclude = [] } = options;

	const state: AnimalFormState = {
		name: exclude.includes("name") ? "" : animal.name?.trim() || "",
		status: exclude.includes("status")
			? "in_shelter"
			: animal.status || "in_shelter",
		displayPlacementRequest:
			exclude.includes("displayPlacementRequest") ||
			animal.display_placement_request === undefined
				? true
				: animal.display_placement_request,
		sexSpayNeuterStatus:
			exclude.includes("sexSpayNeuterStatus") ||
			!animal.sex_spay_neuter_status
				? ""
				: animal.sex_spay_neuter_status,
		lifeStage:
			exclude.includes("lifeStage") || !animal.life_stage
				? ""
				: animal.life_stage,
		primaryBreed: exclude.includes("primaryBreed")
			? ""
			: animal.primary_breed?.trim() || "",
		physicalCharacteristics: exclude.includes("physicalCharacteristics")
			? ""
			: animal.physical_characteristics?.trim() || "",
		medicalNeeds: exclude.includes("medicalNeeds")
			? ""
			: animal.medical_needs?.trim() || "",
		behavioralNeeds: exclude.includes("behavioralNeeds")
			? ""
			: animal.behavioral_needs?.trim() || "",
		additionalNotes: exclude.includes("additionalNotes")
			? ""
			: animal.additional_notes?.trim() || "",
		bio: exclude.includes("bio") ? "" : animal.bio?.trim() || "",
		priority: exclude.includes("priority")
			? false
			: animal.priority || false,
		dateOfBirth: exclude.includes("dateOfBirth")
			? ""
			: animal.date_of_birth
			? animal.date_of_birth.split("T")[0] // Extract YYYY-MM-DD from ISO string
			: "",
		ageValue: "",
		ageUnit: "",
	};

	return state;
}

/**
 * Returns an empty form state
 */
export function getEmptyFormState(): AnimalFormState {
	return {
		name: "",
		status: "in_shelter",
		displayPlacementRequest: true,
		sexSpayNeuterStatus: "",
		lifeStage: "",
		primaryBreed: "",
		physicalCharacteristics: "",
		medicalNeeds: "",
		behavioralNeeds: "",
		additionalNotes: "",
		bio: "",
		priority: false,
		dateOfBirth: "",
		ageValue: "",
		ageUnit: "",
	};
}
