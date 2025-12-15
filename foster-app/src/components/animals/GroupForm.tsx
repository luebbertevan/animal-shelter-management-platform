import type { FormEvent } from "react";
import Input from "../ui/Input";
import Textarea from "../ui/Textarea";
import Toggle from "../ui/Toggle";
import Button from "../ui/Button";
import ErrorMessage from "../ui/ErrorMessage";

interface GroupFormProps {
	// Form state and handlers from useGroupForm
	formState: {
		name: string;
		description: string;
		priority: boolean;
	};
	setName: (value: string) => void;
	setDescription: (value: string) => void;
	setPriority: (value: boolean) => void;
	errors: Record<string, string>;

	// Form submission
	onSubmit: (e: FormEvent<HTMLFormElement>) => void;
	loading: boolean;
	submitError: string | null;
	successMessage: string | null;
	submitButtonText: string;
}

export default function GroupForm({
	formState,
	setName,
	setDescription,
	setPriority,
	errors,
	onSubmit,
	loading,
	submitError,
	successMessage,
	submitButtonText,
}: GroupFormProps) {
	return (
		<form onSubmit={onSubmit} className="space-y-6">
			<Input
				label="Group Name"
				type="text"
				value={formState.name}
				onChange={(e) => setName(e.target.value)}
				placeholder="Enter group name (optional)"
				disabled={loading}
				autoComplete="off"
				error={errors.name}
			/>

			<Textarea
				label="Description"
				value={formState.description}
				onChange={(e) => setDescription(e.target.value)}
				placeholder="Enter group description (optional)"
				rows={4}
				disabled={loading}
				error={errors.description}
			/>

			<Toggle
				label="High Priority"
				checked={formState.priority}
				onChange={setPriority}
				disabled={loading}
			/>

			{Object.keys(errors).length > 0 && (
				<ErrorMessage>
					Please fix the errors above before submitting.
				</ErrorMessage>
			)}

			{submitError && <ErrorMessage>{submitError}</ErrorMessage>}

			{successMessage && (
				<div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm">
					{successMessage}
				</div>
			)}

			<div className="flex gap-4">
				<Button type="submit" disabled={loading}>
					{loading
						? submitButtonText.includes("Create")
							? "Creating..."
							: "Updating..."
						: submitButtonText}
				</Button>
			</div>
		</form>
	);
}
