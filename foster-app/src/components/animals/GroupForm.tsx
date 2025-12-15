import type { FormEvent } from "react";
import type { Animal, TimestampedPhoto } from "../../types";
import Input from "../ui/Input";
import Textarea from "../ui/Textarea";
import Toggle from "../ui/Toggle";
import Button from "../ui/Button";
import ErrorMessage from "../ui/ErrorMessage";
import LoadingSpinner from "../ui/LoadingSpinner";
import AnimalCard from "./AnimalCard";
import PhotoUpload from "./PhotoUpload";

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

	// Animal selection
	animals: Animal[];
	isLoadingAnimals: boolean;
	isErrorAnimals: boolean;
	selectedAnimalIds: string[];
	toggleAnimalSelection: (animalId: string) => void;

	// Photo upload
	onPhotosChange: (photos: File[]) => void;
	existingPhotos?: TimestampedPhoto[];
	onRemovePhoto?: (photoUrl: string) => void;
	photoError?: string | null;

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
	animals,
	isLoadingAnimals,
	isErrorAnimals,
	selectedAnimalIds,
	toggleAnimalSelection,
	onPhotosChange,
	existingPhotos = [],
	onRemovePhoto,
	photoError,
	onSubmit,
	loading,
	submitError,
	successMessage,
	submitButtonText,
}: GroupFormProps) {
	// Stable sort: selected animals first, then unselected (maintain order within each group)
	const sortedAnimals = [...animals].sort((a, b) => {
		const aSelected = selectedAnimalIds.includes(a.id);
		const bSelected = selectedAnimalIds.includes(b.id);
		if (aSelected && !bSelected) return -1;
		if (!aSelected && bSelected) return 1;
		return 0; // Maintain original order within each group
	});
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

			{/* Photo Upload Section */}
			<PhotoUpload
				maxPhotos={10}
				onPhotosChange={onPhotosChange}
				existingPhotos={existingPhotos}
				onRemovePhoto={onRemovePhoto}
				disabled={loading}
				error={photoError}
			/>

			{/* Animal Selection Section */}
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-2">
					Select Animals
				</label>
				{isLoadingAnimals && (
					<div className="p-4">
						<LoadingSpinner message="Loading animals..." />
					</div>
				)}
				{isErrorAnimals && (
					<div className="p-4 bg-red-50 border border-red-200 rounded-md">
						<p className="text-sm text-red-700">
							Failed to load animals. Please try refreshing the
							page.
						</p>
					</div>
				)}
				{!isLoadingAnimals &&
					!isErrorAnimals &&
					animals.length === 0 && (
						<p className="text-sm text-gray-500">
							No animals available. Create animals first before
							creating a group.
						</p>
					)}
				{!isLoadingAnimals && !isErrorAnimals && animals.length > 0 && (
					<div className="max-h-[520px] overflow-y-auto pt-6 pb-6 pl-2 pr-2 -mx-6">
						<div className="grid gap-1.5 grid-cols-1 min-[375px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
							{sortedAnimals.map((animal) => {
								const isSelected = selectedAnimalIds.includes(
									animal.id
								);
								return (
									<div
										key={animal.id}
										onClick={(e) => {
											e.preventDefault();
											e.stopPropagation();
											if (!loading) {
												toggleAnimalSelection(
													animal.id
												);
											}
										}}
										onMouseDown={(e) => {
											// Prevent link navigation
											e.preventDefault();
										}}
										className={`cursor-pointer transition-all relative rounded-lg ${
											isSelected
												? "ring-4 ring-pink-500 ring-offset-2"
												: ""
										}`}
									>
										<div style={{ pointerEvents: "none" }}>
											<AnimalCard animal={animal} />
										</div>
									</div>
								);
							})}
						</div>
					</div>
				)}
				{selectedAnimalIds.length > 0 && (
					<p className="mt-2 text-sm text-gray-500">
						{selectedAnimalIds.length} animal
						{selectedAnimalIds.length !== 1 ? "s" : ""} selected
					</p>
				)}
				{errors.animals && (
					<p className="mt-2 text-sm text-red-600">
						{errors.animals}
					</p>
				)}
			</div>

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
