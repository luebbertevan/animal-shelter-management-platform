import type { FormEvent } from "react";
import type {
	Animal,
	TimestampedPhoto,
	AnimalStatus,
	FosterVisibility,
} from "../../types";
import Input from "../ui/Input";
import Textarea from "../ui/Textarea";
import Toggle from "../ui/Toggle";
import Select from "../ui/Select";
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

	// Staged changes for status and foster_visibility
	stagedStatusChanges: Map<string, AnimalStatus>;
	stagedFosterVisibilityChanges: Map<string, FosterVisibility>;
	setStagedStatusForAll: (status: AnimalStatus | "") => void;
	setStagedFosterVisibilityForAll: (
		visibility: FosterVisibility | ""
	) => void;
	hasFosterVisibilityConflict: boolean;
	sharedFosterVisibility: FosterVisibility | null;

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

	// Delete functionality (optional, for edit mode)
	showDeleteButton?: boolean;
	deleteError?: string | null;
	showDeleteConfirm?: boolean;
	onDeleteClick?: () => void;
	onDeleteCancel?: () => void;
	onDeleteConfirm?: () => void;
	deleting?: boolean;
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
	stagedStatusChanges,
	setStagedStatusForAll,
	setStagedFosterVisibilityForAll,
	hasFosterVisibilityConflict,
	sharedFosterVisibility,
	onPhotosChange,
	existingPhotos = [],
	onRemovePhoto,
	photoError,
	onSubmit,
	loading,
	submitError,
	successMessage,
	submitButtonText,
	showDeleteButton = false,
	deleteError,
	showDeleteConfirm = false,
	onDeleteClick,
	onDeleteCancel,
	onDeleteConfirm,
	deleting = false,
}: GroupFormProps) {
	// Stable sort: selected animals first, then unselected (maintain order within each group)
	const sortedAnimals = [...animals].sort((a, b) => {
		const aSelected = selectedAnimalIds.includes(a.id);
		const bSelected = selectedAnimalIds.includes(b.id);
		if (aSelected && !bSelected) return -1;
		if (!aSelected && bSelected) return 1;
		return 0; // Maintain original order within each group
	});

	// Compute shared status value for the dropdown (if all selected animals have the same staged status)
	const sharedStagedStatus = (() => {
		if (selectedAnimalIds.length === 0) return "";
		const statuses = selectedAnimalIds
			.map((id) => stagedStatusChanges.get(id))
			.filter((status): status is AnimalStatus => !!status);
		if (statuses.length === 0) return "";
		const uniqueStatuses = new Set(statuses);
		return uniqueStatuses.size === 1 ? statuses[0] : "";
	})();

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

			{/* Set all animals status dropdown */}
			{selectedAnimalIds.length > 0 && (
				<Select
					label="Set all animals status"
					value={sharedStagedStatus}
					onChange={(e) =>
						setStagedStatusForAll(
							(e.target.value || "") as AnimalStatus | ""
						)
					}
					options={[
						{ value: "", label: "Select..." },
						{ value: "in_shelter", label: "In Shelter" },
						{ value: "in_foster", label: "In Foster" },
						{ value: "adopted", label: "Adopted" },
						{ value: "medical_hold", label: "Medical Hold" },
						{ value: "transferring", label: "Transferring" },
					]}
					disabled={loading}
				/>
			)}
			{selectedAnimalIds.length > 0 && (
				<p className="text-sm text-gray-500 -mt-2">
					Animals in the same group are allowed to have different
					statuses
				</p>
			)}

			{/* Set all animals Visibility on Fosters Needed page dropdown */}
			{selectedAnimalIds.length > 0 && (
				<div>
					<Select
						label="Set all animals Visibility on Fosters Needed page"
						value={
							sharedFosterVisibility !== null
								? sharedFosterVisibility
								: ""
						}
						onChange={(e) =>
							setStagedFosterVisibilityForAll(
								(e.target.value || "") as FosterVisibility | ""
							)
						}
						options={[
							{ value: "", label: "Select..." },
							{ value: "available_now", label: "Available Now" },
							{
								value: "available_future",
								label: "Available Future",
							},
							{
								value: "foster_pending",
								label: "Foster Pending",
							},
							{ value: "not_visible", label: "Not Visible" },
						]}
						disabled={loading}
						error={
							hasFosterVisibilityConflict
								? errors.fosterVisibility
								: undefined
						}
					/>
					{hasFosterVisibilityConflict ? (
						<div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
							<p className="text-sm text-red-800 font-medium">
								⚠️ Animals in a group must have the same
								Visibility on Fosters Needed page
							</p>
						</div>
					) : sharedFosterVisibility !== null ? (
						<div className="mt-2 flex items-center gap-2 text-sm text-green-700">
							<svg
								className="w-5 h-5"
								fill="currentColor"
								viewBox="0 0 20 20"
							>
								<path
									fillRule="evenodd"
									d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
									clipRule="evenodd"
								/>
							</svg>
							<span>All grouped animals visibility matches</span>
						</div>
					) : null}
					<p className="text-sm text-gray-500 mt-2">
						Animals in a group must have the same Visibility on
						Fosters Needed page. This controls whether the group
						appears on the Fosters Needed page and what badge
						message is shown.
					</p>
				</div>
			)}

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

			{hasFosterVisibilityConflict && (
				<ErrorMessage>
					Alert: Animals in a group must have the same Visibility on
					Fosters Needed page
				</ErrorMessage>
			)}

			{Object.keys(errors).length > 0 && !hasFosterVisibilityConflict && (
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

			{deleteError && <ErrorMessage>{deleteError}</ErrorMessage>}

			{showDeleteConfirm && (
				<div className="bg-red-50 border border-red-200 rounded-md p-4">
					<p className="text-sm text-red-800 mb-3">
						Are you sure you want to delete this group? The animals
						in this group will remain but will no longer be grouped
						together.
					</p>
					<div className="flex gap-2">
						<Button
							variant="outline"
							onClick={onDeleteCancel}
							disabled={deleting}
						>
							Cancel
						</Button>
						<Button
							variant="danger"
							onClick={onDeleteConfirm}
							disabled={deleting}
						>
							{deleting ? "Deleting..." : "Delete Group"}
						</Button>
					</div>
				</div>
			)}

			<div className="flex gap-4">
				<Button
					type="submit"
					disabled={loading || hasFosterVisibilityConflict}
				>
					{loading
						? submitButtonText.includes("Create")
							? "Creating..."
							: "Updating..."
						: submitButtonText}
				</Button>
				{showDeleteButton && !showDeleteConfirm && (
					<Button
						type="button"
						variant="danger"
						onClick={onDeleteClick}
						disabled={loading || deleting}
					>
						Delete Group
					</Button>
				)}
			</div>
		</form>
	);
}
