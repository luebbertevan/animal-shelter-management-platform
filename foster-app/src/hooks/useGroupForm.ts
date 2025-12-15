import { useState } from "react";
import type { AnimalGroup } from "../types";
import { getEmptyFormState, groupToFormState } from "../lib/groupFormUtils";

export interface UseGroupFormOptions {
	initialGroup?: AnimalGroup | null;
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
	// Validation
	validateForm: () => boolean;
	// State
	errors: Record<string, string>;
}

export function useGroupForm(
	options: UseGroupFormOptions = {}
): UseGroupFormReturn {
	const { initialGroup } = options;

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

	const toggleAnimalSelection = (animalId: string) => {
		setSelectedAnimalIds((prev) => {
			if (prev.includes(animalId)) {
				return prev.filter((id) => id !== animalId);
			} else {
				return [...prev, animalId];
			}
		});
	};

	const validateForm = (): boolean => {
		const newErrors: Record<string, string> = {};

		// Name is optional, but if provided should not be empty string
		// No validation errors for now - all fields are optional

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
		validateForm,
		errors,
	};
}
