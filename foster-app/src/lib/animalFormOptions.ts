import type { LifeStage, SexSpayNeuterStatus } from "../types";

/** Sex / spay-neuter dropdown options for AnimalForm (new + edit animal pages). */
export type AnimalFormSexSpayNeuterOption = {
	value: SexSpayNeuterStatus | "";
	label: string;
};

export const ANIMAL_FORM_SEX_SPAY_NEUTER_OPTIONS: AnimalFormSexSpayNeuterOption[] =
	[
		{ value: "", label: "Select..." },
		{ value: "male", label: "Male" },
		{ value: "female", label: "Female" },
		{ value: "spayed_female", label: "Spayed Female" },
		{ value: "neutered_male", label: "Neutered Male" },
	];

/** Life stage dropdown options for AnimalForm (new + edit animal pages). */
export type AnimalFormLifeStageOption = {
	value: LifeStage | "";
	label: string;
};

export const ANIMAL_FORM_LIFE_STAGE_OPTIONS: AnimalFormLifeStageOption[] = [
	{ value: "", label: "Select..." },
	{ value: "kitten", label: "Kitten" },
	{ value: "adult", label: "Adult" },
	{ value: "senior", label: "Senior" },
	{ value: "unknown", label: "Unknown" },
];
