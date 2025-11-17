import { useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Toggle from "../../components/ui/Toggle";
import Button from "../../components/ui/Button";
import ErrorMessage from "../../components/ui/ErrorMessage";
import type { AnimalStatus, Sex } from "../../types";

export default function NewAnimal() {
	const { user } = useAuth();
	const [name, setName] = useState("");
	const [status, setStatus] = useState<AnimalStatus>("needs_foster");
	const [sex, setSex] = useState<Sex | "">("");
	const [priority, setPriority] = useState(false);
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [loading, setLoading] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);

	const statusOptions: { value: AnimalStatus; label: string }[] = [
		{ value: "needs_foster", label: "Needs Foster" },
		{ value: "in_foster", label: "In Foster" },
		{ value: "adopted", label: "Adopted" },
		{ value: "medical_hold", label: "Medical Hold" },
		{ value: "in_shelter", label: "In Shelter" },
		{ value: "transferring", label: "Transferring" },
	];

	const sexOptions: { value: Sex | ""; label: string }[] = [
		{ value: "", label: "Select..." },
		{ value: "male", label: "Male" },
		{ value: "female", label: "Female" },
	];

	const validateForm = (): boolean => {
		const newErrors: Record<string, string> = {};

		// Status always has a default value, so no validation needed
		// Add other validation rules here as needed

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setErrors({});
		setSubmitError(null);

		if (!validateForm()) {
			return;
		}

		if (!user) {
			setSubmitError("You must be logged in to create an animal.");
			return;
		}

		setLoading(true);

		try {
			// Prepare data for insertion
			const animalData: Record<string, unknown> = {
				name: name.trim() || null, // Empty string becomes null
				species: "cat", // Default to "cat" for MVP (can be made configurable later)
				status: status,
				created_by: user.id,
			};

			// Add optional fields only if they have values
			if (sex) {
				animalData.sex = sex;
			}

			// Add priority as a tag if high priority
			if (priority) {
				animalData.tags = ["high_priority"];
			}

			const { error: insertError } = await supabase
				.from("animals")
				.insert(animalData);

			if (insertError) {
				console.error("Error creating animal:", insertError);
				setSubmitError(
					insertError.message ||
						"Failed to create animal. Please try again."
				);
				setLoading(false);
			} else {
				// Success - redirect will be handled in Task 4
				// For now, just reset loading
				setLoading(false);
			}
		} catch (err) {
			console.error("Unexpected error:", err);
			setSubmitError("An unexpected error occurred. Please try again.");
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen p-4 bg-gray-50">
			<div className="max-w-4xl mx-auto">
				<div className="bg-white rounded-lg shadow-md p-6">
					<h1 className="text-2xl font-bold text-gray-900 mb-6">
						Create New Animal
					</h1>

					<form onSubmit={handleSubmit} className="space-y-6">
						<Input
							label="Name"
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Enter animal name (optional)"
							disabled={loading}
						/>

						<Select
							label="Status"
							value={status}
							onChange={(e) =>
								setStatus(e.target.value as AnimalStatus)
							}
							options={statusOptions}
							required
							error={errors.status}
							disabled={loading}
						/>

						<Select
							label="Sex"
							value={sex}
							onChange={(e) => setSex(e.target.value as Sex | "")}
							options={sexOptions}
							disabled={loading}
						/>

						<Toggle
							label="High Priority"
							checked={priority}
							onChange={setPriority}
							disabled={loading}
						/>

						{Object.keys(errors).length > 0 && (
							<ErrorMessage>
								Please fix the errors above before submitting.
							</ErrorMessage>
						)}

						{submitError && (
							<ErrorMessage>{submitError}</ErrorMessage>
						)}

						<div className="flex gap-4">
							<Button type="submit" disabled={loading}>
								{loading ? "Creating..." : "Create Animal"}
							</Button>
						</div>
					</form>
				</div>
			</div>
		</div>
	);
}
