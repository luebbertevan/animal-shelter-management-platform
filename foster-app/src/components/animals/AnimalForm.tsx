import type { FormEvent } from "react";
import type {
	AnimalStatus,
	SexSpayNeuterStatus,
	LifeStage,
	PhotoMetadata,
} from "../../types";
import type { AgeUnit } from "../../lib/ageUtils";
import type { AnimalFormState } from "../../lib/animalFormUtils";
import Input from "../ui/Input";
import Select from "../ui/Select";
import Toggle from "../ui/Toggle";
import Textarea from "../ui/Textarea";
import Button from "../ui/Button";
import ErrorMessage from "../ui/ErrorMessage";
import Combobox from "../ui/Combobox";
import PhotoUpload from "./PhotoUpload";

interface AnimalFormProps {
	// Form state and handlers from useAnimalForm
	formState: AnimalFormState;
	setName: (value: string) => void;
	setStatus: (value: AnimalStatus) => void;
	setDisplayPlacementRequest: (value: boolean) => void;
	setSexSpayNeuterStatus: (value: SexSpayNeuterStatus | "") => void;
	setLifeStage: (value: LifeStage | "") => void;
	setPrimaryBreed: (value: string) => void;
	setPhysicalCharacteristics: (value: string) => void;
	setMedicalNeeds: (value: string) => void;
	setBehavioralNeeds: (value: string) => void;
	setAdditionalNotes: (value: string) => void;
	setBio: (value: string) => void;
	setPriority: (value: boolean) => void;
	handleDOBChange: (dob: string) => void;
	handleDOBBlur: () => void;
	handleAgeValueChange: (value: string) => void;
	handleAgeValueBlur: () => void;
	handleAgeUnitChange: (newUnit: AgeUnit | "") => void;
	getTodayDateString: () => string;
	errors: Record<string, string>;

	// Form options
	statusOptions: { value: AnimalStatus; label: string }[];
	sexSpayNeuterOptions: { value: SexSpayNeuterStatus | ""; label: string }[];
	lifeStageOptions: { value: LifeStage | ""; label: string }[];
	breedSuggestions: string[];
	isLoadingBreeds: boolean;
	physicalCharacteristicsSuggestions: string[];
	isLoadingPhysicalCharacteristics: boolean;

	// Photo handling
	onPhotosChange: (photos: File[]) => void;
	existingPhotos?: PhotoMetadata[];
	onRemovePhoto?: (photoUrl: string) => void;
	uploadingPhotos: boolean;
	photoUploadError: string | null;

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

export default function AnimalForm({
	formState,
	setName,
	setStatus,
	setDisplayPlacementRequest,
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
	errors,
	statusOptions,
	sexSpayNeuterOptions,
	lifeStageOptions,
	breedSuggestions,
	isLoadingBreeds,
	physicalCharacteristicsSuggestions,
	isLoadingPhysicalCharacteristics,
	onPhotosChange,
	existingPhotos,
	onRemovePhoto,
	uploadingPhotos,
	photoUploadError,
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
}: AnimalFormProps) {
	return (
		<form onSubmit={onSubmit} className="space-y-6">
			<Input
				label="Name"
				type="text"
				value={formState.name}
				onChange={(e) => setName(e.target.value)}
				placeholder="Enter animal name (optional)"
				disabled={loading}
				autoComplete="off"
			/>

			<Select
				label="Status"
				value={formState.status}
				onChange={(e) => setStatus(e.target.value as AnimalStatus)}
				options={statusOptions}
				required
				error={errors.status}
				disabled={loading}
			/>

			<Toggle
				label="High Priority"
				checked={formState.priority}
				onChange={setPriority}
				disabled={loading}
			/>

			<Toggle
				label="Display Placement Request"
				checked={formState.displayPlacementRequest}
				onChange={setDisplayPlacementRequest}
				disabled={loading}
			/>

			{/* Date of Birth and Age Estimate (next to each other) */}
			<div className="grid grid-cols-1 min-[375px]:grid-cols-2 gap-4">
				<Input
					label="Date of Birth"
					type="date"
					value={formState.dateOfBirth}
					onChange={(e) => handleDOBChange(e.target.value)}
					onBlur={handleDOBBlur}
					max={getTodayDateString()}
					disabled={loading}
					error={errors.dateOfBirth}
				/>
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">
						Age Estimate
					</label>
					<div className="flex gap-2">
						<div className="flex-1">
							<input
								type="number"
								min="0"
								step="1"
								value={formState.ageValue}
								onChange={(e) =>
									handleAgeValueChange(e.target.value)
								}
								onKeyDown={(e) => {
									// Prevent "e", "E", "+", ".", "-" from being entered
									if (
										e.key === "e" ||
										e.key === "E" ||
										e.key === "+" ||
										e.key === "." ||
										e.key === "-"
									) {
										e.preventDefault();
									}
								}}
								onBlur={handleAgeValueBlur}
								placeholder="Age"
								disabled={loading}
								className={`w-full px-3 py-2 border ${
									errors.ageValue
										? "border-red-300 focus:border-red-500 focus:ring-red-500"
										: "border-pink-300 focus:border-pink-500 focus:ring-pink-500"
								} rounded-md shadow-sm focus:outline-none focus:ring-2 disabled:bg-gray-100 disabled:cursor-not-allowed`}
							/>
						</div>
						<select
							value={formState.ageUnit}
							onChange={(e) =>
								handleAgeUnitChange(
									e.target.value as AgeUnit | ""
								)
							}
							disabled={loading}
							className="px-3 py-2 border border-pink-300 focus:border-pink-500 focus:ring-pink-500 rounded-md shadow-sm focus:outline-none focus:ring-2 disabled:bg-gray-100 disabled:cursor-not-allowed bg-white"
						>
							<option value="">Unit</option>
							<option value="days">Days</option>
							<option value="weeks">Weeks</option>
							<option value="months">Months</option>
							<option value="years">Years</option>
						</select>
					</div>
					{errors.ageValue && (
						<p className="mt-1 text-sm text-red-600">
							{errors.ageValue}
						</p>
					)}
				</div>
			</div>

			{/* Sex and Life Stage (next to each other) */}
			<div className="grid grid-cols-1 min-[375px]:grid-cols-2 gap-4">
				<Select
					label="Sex"
					value={formState.sexSpayNeuterStatus}
					onChange={(e) =>
						setSexSpayNeuterStatus(
							e.target.value as SexSpayNeuterStatus | ""
						)
					}
					options={sexSpayNeuterOptions}
					disabled={loading}
				/>
				<Select
					label="Life Stage"
					value={formState.lifeStage}
					onChange={(e) => {
						const newLifeStage = e.target.value as LifeStage | "";
						setLifeStage(newLifeStage);
					}}
					options={lifeStageOptions}
					disabled={loading}
				/>
			</div>

			<PhotoUpload
				maxPhotos={10}
				onPhotosChange={onPhotosChange}
				existingPhotos={existingPhotos}
				onRemovePhoto={onRemovePhoto}
				disabled={loading || uploadingPhotos}
				error={photoUploadError}
			/>

			{uploadingPhotos && (
				<div className="p-2 bg-blue-50 border border-blue-200 rounded text-blue-600 text-sm flex items-center gap-2">
					<span>Uploading photos...</span>
				</div>
			)}

			<Combobox
				label="Primary Breed"
				value={formState.primaryBreed}
				onChange={setPrimaryBreed}
				suggestions={isLoadingBreeds ? [] : breedSuggestions}
				placeholder="Enter primary breed (optional)"
				disabled={loading || isLoadingBreeds}
			/>

			<Combobox
				label="Physical Characteristics"
				value={formState.physicalCharacteristics}
				onChange={setPhysicalCharacteristics}
				suggestions={
					isLoadingPhysicalCharacteristics
						? []
						: physicalCharacteristicsSuggestions
				}
				placeholder="Enter physical characteristics (optional)"
				disabled={loading || isLoadingPhysicalCharacteristics}
			/>

			<Textarea
				label="Medical Needs"
				value={formState.medicalNeeds}
				onChange={(e) => setMedicalNeeds(e.target.value)}
				placeholder="Enter medical needs (optional)"
				rows={4}
				disabled={loading}
			/>

			<Textarea
				label="Behavioral Needs"
				value={formState.behavioralNeeds}
				onChange={(e) => setBehavioralNeeds(e.target.value)}
				placeholder="Enter behavioral needs (optional)"
				rows={4}
				disabled={loading}
			/>

			<Textarea
				label="Additional Notes"
				value={formState.additionalNotes}
				onChange={(e) => setAdditionalNotes(e.target.value)}
				placeholder="Enter any additional notes (optional)"
				rows={4}
				disabled={loading}
			/>

			<Textarea
				label="Adoption Bio"
				value={formState.bio}
				onChange={(e) => setBio(e.target.value)}
				placeholder="Enter adoption bio (optional)"
				rows={4}
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

			{deleteError && <ErrorMessage>{deleteError}</ErrorMessage>}

			{showDeleteConfirm && (
				<div className="bg-red-50 border border-red-200 rounded-md p-4">
					<p className="text-sm text-red-800 mb-3">
						Are you sure you want to delete this animal? This action
						cannot be undone. The animal will be removed from all
						groups and all photos will be deleted.
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
							{deleting ? "Deleting..." : "Delete Animal"}
						</Button>
					</div>
				</div>
			)}

			<div className="flex gap-4">
				<Button type="submit" disabled={loading || uploadingPhotos}>
					{uploadingPhotos
						? "Uploading photos..."
						: loading
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
						disabled={loading || uploadingPhotos || deleting}
					>
						Delete Animal
					</Button>
				)}
			</div>
		</form>
	);
}
