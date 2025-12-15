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
	const [errors, setErrors] = useState<Record<string, string>>({});

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
		validateForm,
		errors,
	};
}
