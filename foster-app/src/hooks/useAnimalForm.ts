import { useState, useEffect, startTransition } from "react";
import type {
	AnimalStatus,
	SexSpayNeuterStatus,
	LifeStage,
	FosterVisibility,
} from "../types";
import type { AgeUnit } from "../lib/ageUtils";
import {
	rolloverAge,
	calculateAgeFromDOB,
	calculateDOBFromAge,
	calculateLifeStageFromDOB,
	calculateLifeStageFromAge,
} from "../lib/ageUtils";
import type { AnimalFormState } from "../lib/animalFormUtils";
import { getEmptyFormState, animalToFormState } from "../lib/animalFormUtils";
import { getFosterVisibilityFromStatus } from "../lib/metadataUtils";
import type { Animal } from "../types";

export interface UseAnimalFormOptions {
	initialAnimal?: Animal | null;
}

export interface UseAnimalFormReturn {
	// Form state
	formState: AnimalFormState;
	// Setters
	setName: (value: string) => void;
	setStatus: (value: AnimalStatus) => void;
	setFosterVisibility: (value: FosterVisibility) => void;
	setSexSpayNeuterStatus: (value: SexSpayNeuterStatus | "") => void;
	setLifeStage: (value: LifeStage | "") => void;
	setPrimaryBreed: (value: string) => void;
	setPhysicalCharacteristics: (value: string) => void;
	setMedicalNeeds: (value: string) => void;
	setBehavioralNeeds: (value: string) => void;
	setAdditionalNotes: (value: string) => void;
	setBio: (value: string) => void;
	setPriority: (value: boolean) => void;
	// Handlers
	handleDOBChange: (dob: string) => void;
	handleDOBBlur: () => void;
	handleAgeValueChange: (value: string) => void;
	handleAgeValueBlur: () => void;
	handleAgeUnitChange: (newUnit: AgeUnit | "") => void;
	// Utilities
	getTodayDateString: () => string;
	validateForm: () => boolean;
	// State
	errors: Record<string, string>;
	dobWasManuallyCleared: boolean;
}

export function useAnimalForm(
	options: UseAnimalFormOptions = {}
): UseAnimalFormReturn {
	const { initialAnimal } = options;

	// Initialize form state from animal or empty
	const initialState = initialAnimal
		? animalToFormState(initialAnimal)
		: getEmptyFormState();

	// If initialAnimal has DOB, calculate age from it
	if (initialAnimal?.date_of_birth) {
		const ageResult = calculateAgeFromDOB(
			initialAnimal.date_of_birth.split("T")[0]
		);
		if (ageResult) {
			initialState.ageValue = ageResult.value;
			initialState.ageUnit = ageResult.unit;
		}
	}

	const [name, setName] = useState(initialState.name);
	const [status, setStatusState] = useState<AnimalStatus>(
		initialState.status
	);
	const [fosterVisibility, setFosterVisibility] = useState<FosterVisibility>(
		initialState.fosterVisibility
	);
	const [sexSpayNeuterStatus, setSexSpayNeuterStatus] = useState<
		SexSpayNeuterStatus | ""
	>(initialState.sexSpayNeuterStatus);
	const [lifeStage, setLifeStage] = useState<LifeStage | "">(
		initialState.lifeStage
	);
	const [primaryBreed, setPrimaryBreed] = useState(initialState.primaryBreed);
	const [physicalCharacteristics, setPhysicalCharacteristics] = useState(
		initialState.physicalCharacteristics
	);
	const [medicalNeeds, setMedicalNeeds] = useState(initialState.medicalNeeds);
	const [behavioralNeeds, setBehavioralNeeds] = useState(
		initialState.behavioralNeeds
	);
	const [additionalNotes, setAdditionalNotes] = useState(
		initialState.additionalNotes
	);
	const [bio, setBio] = useState(initialState.bio);
	const [priority, setPriority] = useState(initialState.priority);
	const [dateOfBirth, setDateOfBirth] = useState(initialState.dateOfBirth);
	const [ageValue, setAgeValue] = useState<number | "">(
		initialState.ageValue
	);
	const [ageUnit, setAgeUnit] = useState<AgeUnit | "">(initialState.ageUnit);
	const [dobWasManuallyCleared, setDobWasManuallyCleared] = useState(false);
	const [errors, setErrors] = useState<Record<string, string>>({});

	// Track if we've initialized from animal data to prevent overwriting user changes
	const [hasInitializedFromAnimal, setHasInitializedFromAnimal] = useState(
		!!initialAnimal
	);

	// Sync state when initialAnimal first becomes available (e.g., after page reload)
	// This preserves the animal's actual values, including unsynced foster_visibility
	// Using startTransition to mark these as non-urgent updates (satisfies linter)
	useEffect(() => {
		if (initialAnimal && !hasInitializedFromAnimal) {
			const animalState = animalToFormState(initialAnimal);

			// Wrap all state updates in startTransition to mark as non-urgent
			// This satisfies the linter and is the recommended pattern for syncing props to state
			startTransition(() => {
				setName(animalState.name);
				setStatusState(animalState.status);
				// Preserve actual foster_visibility value from database, don't sync it
				setFosterVisibility(animalState.fosterVisibility);
				setSexSpayNeuterStatus(animalState.sexSpayNeuterStatus);
				setLifeStage(animalState.lifeStage);
				setPrimaryBreed(animalState.primaryBreed);
				setPhysicalCharacteristics(animalState.physicalCharacteristics);
				setMedicalNeeds(animalState.medicalNeeds);
				setBehavioralNeeds(animalState.behavioralNeeds);
				setAdditionalNotes(animalState.additionalNotes);
				setBio(animalState.bio);
				setPriority(animalState.priority);
				setDateOfBirth(animalState.dateOfBirth);
				setAgeValue(animalState.ageValue);
				setAgeUnit(animalState.ageUnit);

				// If initialAnimal has DOB, calculate age from it
				if (initialAnimal.date_of_birth) {
					const ageResult = calculateAgeFromDOB(
						initialAnimal.date_of_birth.split("T")[0]
					);
					if (ageResult) {
						setAgeValue(ageResult.value);
						setAgeUnit(ageResult.unit);
					}
				}

				setHasInitializedFromAnimal(true);
			});
		}
	}, [initialAnimal, hasInitializedFromAnimal]);

	// Custom setStatus that automatically syncs foster_visibility
	// This avoids the linter warning about calling setState in effects
	const setStatus = (newStatus: AnimalStatus) => {
		setStatusState(newStatus);
		// One-directional sync: automatically update foster_visibility when status changes
		const newVisibility = getFosterVisibilityFromStatus(newStatus);
		setFosterVisibility(newVisibility);
	};

	// Get today's date in YYYY-MM-DD format for date input max attribute
	const getTodayDateString = (): string => {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const year = today.getFullYear();
		const month = String(today.getMonth() + 1).padStart(2, "0");
		const day = String(today.getDate()).padStart(2, "0");
		return `${year}-${month}-${day}`;
	};

	// Handle DOB change - calculate age from DOB immediately
	const handleDOBChange = (dob: string) => {
		if (!dob) {
			// DOB was manually cleared by user
			setDateOfBirth("");
			setAgeValue("");
			setAgeUnit("");
			setDobWasManuallyCleared(true);
			setLifeStage("");
			setErrors((prev) => {
				const newErrors = { ...prev };
				delete newErrors.dateOfBirth;
				delete newErrors.ageValue;
				return newErrors;
			});
			return;
		}

		setDateOfBirth(dob);
		setDobWasManuallyCleared(false);

		// Validate: prevent future dates
		const dobDate = new Date(dob);
		const today = new Date();
		dobDate.setHours(0, 0, 0, 0);
		today.setHours(0, 0, 0, 0);
		if (dobDate > today) {
			setErrors((prev) => ({
				...prev,
				dateOfBirth: "Date of birth cannot be in the future",
			}));
			setDateOfBirth("");
			setAgeValue("");
			setAgeUnit("");
			return;
		}

		// Clear any previous DOB errors
		setErrors((prev) => {
			const newErrors = { ...prev };
			delete newErrors.dateOfBirth;
			delete newErrors.ageValue;
			return newErrors;
		});

		// Calculate age from DOB immediately
		const ageResult = calculateAgeFromDOB(dob);
		if (ageResult) {
			setAgeValue(ageResult.value);
			setAgeUnit(ageResult.unit);
			const calculatedLifeStage = calculateLifeStageFromDOB(dob);
			setLifeStage(calculatedLifeStage);
		} else {
			setAgeValue("");
			setAgeUnit("");
			setLifeStage("");
		}
	};

	// Handle DOB field blur - only for validation
	const handleDOBBlur = () => {
		if (!dateOfBirth) {
			return;
		}

		const dobDate = new Date(dateOfBirth);
		const today = new Date();
		dobDate.setHours(0, 0, 0, 0);
		today.setHours(0, 0, 0, 0);
		if (dobDate > today) {
			setErrors((prev) => ({
				...prev,
				dateOfBirth: "Date of birth cannot be in the future",
			}));
			setDateOfBirth("");
			setAgeValue("");
			setAgeUnit("");
			return;
		}

		setErrors((prev) => {
			const newErrors = { ...prev };
			delete newErrors.dateOfBirth;
			return newErrors;
		});
	};

	// Handle age number change
	const handleAgeValueChange = (value: string) => {
		if (value === "") {
			setAgeValue("");
		} else {
			const cleaned = value.replace(/[^0-9]/g, "");
			if (cleaned !== "") {
				const num = parseInt(cleaned, 10);
				if (!isNaN(num) && num >= 0) {
					setAgeValue(num);
				}
			} else {
				setAgeValue("");
			}
		}

		setErrors((prev) => {
			const newErrors = { ...prev };
			delete newErrors.ageValue;
			return newErrors;
		});
	};

	// Handle age number field blur
	const handleAgeValueBlur = () => {
		if (!ageUnit) {
			return;
		}

		if (ageValue === "" || ageValue <= 0) {
			if (!dobWasManuallyCleared) {
				setDateOfBirth("");
			}
			setErrors((prev) => {
				const newErrors = { ...prev };
				delete newErrors.ageValue;
				return newErrors;
			});
			return;
		}

		setErrors((prev) => {
			const newErrors = { ...prev };
			delete newErrors.ageValue;
			return newErrors;
		});

		if (
			dobWasManuallyCleared &&
			typeof ageValue === "number" &&
			ageValue > 0
		) {
			setDobWasManuallyCleared(false);
		}

		if (!dobWasManuallyCleared) {
			const calculatedDOB = calculateDOBFromAge(ageValue, ageUnit);
			if (calculatedDOB) {
				setDateOfBirth(calculatedDOB);
				setDobWasManuallyCleared(false);
				setErrors((prev) => {
					const newErrors = { ...prev };
					delete newErrors.dateOfBirth;
					return newErrors;
				});

				const ageFromDOB = calculateAgeFromDOB(calculatedDOB);
				if (ageFromDOB) {
					setAgeValue(ageFromDOB.value);
					setAgeUnit(ageFromDOB.unit);
					const calculatedLifeStage = calculateLifeStageFromAge(
						ageFromDOB.value,
						ageFromDOB.unit
					);
					setLifeStage(calculatedLifeStage);
					return;
				}
			}
		}

		const rolledOver = rolloverAge(ageValue, ageUnit);
		setAgeValue(rolledOver.value);
		setAgeUnit(rolledOver.unit);
	};

	// Handle age unit change
	const handleAgeUnitChange = (newUnit: AgeUnit | "") => {
		if (!newUnit) {
			setAgeUnit("");
			setDateOfBirth("");
			setDobWasManuallyCleared(false);
			return;
		}

		if (ageValue === "" || ageValue <= 0) {
			setAgeUnit(newUnit);
			return;
		}

		if (dobWasManuallyCleared) {
			setAgeUnit(newUnit);
			if (typeof ageValue === "number" && ageValue > 0) {
				setDobWasManuallyCleared(false);
			} else {
				setDobWasManuallyCleared(false);
				return;
			}
		}

		setErrors((prev) => {
			const newErrors = { ...prev };
			delete newErrors.ageValue;
			return newErrors;
		});

		const calculatedDOB = calculateDOBFromAge(ageValue, newUnit as AgeUnit);
		if (calculatedDOB) {
			setDateOfBirth(calculatedDOB);
			setDobWasManuallyCleared(false);
			setErrors((prev) => {
				const newErrors = { ...prev };
				delete newErrors.dateOfBirth;
				return newErrors;
			});

			const ageFromDOB = calculateAgeFromDOB(calculatedDOB);
			if (ageFromDOB) {
				setAgeValue(ageFromDOB.value);
				setAgeUnit(ageFromDOB.unit);
				const calculatedLifeStage = calculateLifeStageFromAge(
					ageFromDOB.value,
					ageFromDOB.unit
				);
				setLifeStage(calculatedLifeStage);
				return;
			}
		}
	};

	const validateForm = (): boolean => {
		const newErrors: Record<string, string> = {};

		if (dateOfBirth) {
			const dobDate = new Date(dateOfBirth);
			const today = new Date();
			dobDate.setHours(0, 0, 0, 0);
			today.setHours(0, 0, 0, 0);

			if (isNaN(dobDate.getTime())) {
				newErrors.dateOfBirth = "Invalid date format";
			} else if (dobDate > today) {
				newErrors.dateOfBirth = "Date of birth cannot be in the future";
			}
		}

		if (ageValue !== "" && ageValue <= 0) {
			newErrors.ageValue = "Age must be a positive number";
		} else if (ageValue !== "" && !Number.isInteger(ageValue)) {
			newErrors.ageValue = "Age must be a whole number";
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const formState: AnimalFormState = {
		name,
		status,
		fosterVisibility,
		sexSpayNeuterStatus,
		lifeStage,
		primaryBreed,
		physicalCharacteristics,
		medicalNeeds,
		behavioralNeeds,
		additionalNotes,
		bio,
		priority,
		dateOfBirth,
		ageValue,
		ageUnit,
	};

	return {
		formState,
		setName,
		setStatus,
		setFosterVisibility,
		setSexSpayNeuterStatus,
		setLifeStage,
		setPrimaryBreed,
		setPhysicalCharacteristics,
		setMedicalNeeds,
		setBehavioralNeeds,
		setAdditionalNotes,
		setBio,
		setPriority,
		handleDOBChange,
		handleDOBBlur,
		handleAgeValueChange,
		handleAgeValueBlur,
		handleAgeUnitChange,
		getTodayDateString,
		validateForm,
		errors,
		dobWasManuallyCleared,
	};
}
