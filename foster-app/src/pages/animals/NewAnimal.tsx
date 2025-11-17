import { useState } from "react";
import type { FormEvent } from "react";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Toggle from "../../components/ui/Toggle";
import Button from "../../components/ui/Button";
import ErrorMessage from "../../components/ui/ErrorMessage";
import type { AnimalStatus, Sex } from "../../types";

export default function NewAnimal() {
	const [name, setName] = useState("");
	const [status, setStatus] = useState<AnimalStatus>("needs_foster");
	const [sex, setSex] = useState<Sex | "">("");
	const [priority, setPriority] = useState(false);
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [loading, setLoading] = useState(false);

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

		if (!validateForm()) {
			return;
		}

		setLoading(true);
		// Form submission will be handled in Task 3
		setLoading(false);
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
