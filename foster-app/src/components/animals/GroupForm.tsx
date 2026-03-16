import { useMemo, useState, useEffect } from "react";
import type { FormEvent } from "react";
import type {
	Animal,
	TimestampedPhoto,
	AnimalStatus,
	FosterVisibility,
} from "../../types";
import type { BulkAddAnimalRow } from "../../hooks/useBulkAddRows";
import Input from "../ui/Input";
import Textarea from "../ui/Textarea";
import Toggle from "../ui/Toggle";
import Select from "../ui/Select";
import Button from "../ui/Button";
import ErrorMessage from "../ui/ErrorMessage";
import InfoTooltip from "../ui/InfoTooltip";
import LoadingSpinner from "../ui/LoadingSpinner";
import AnimalCard from "./AnimalCard";
import BulkAddAnimalRows from "./BulkAddAnimalRows";
import PhotoUpload from "./PhotoUpload";
import Pagination from "../shared/Pagination";
import SearchInput from "../shared/SearchInput";
import AnimalFilters, {
	type AnimalFilters as AnimalFiltersType,
} from "./AnimalFilters";
import { FilterChip } from "../shared/Filters";

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
	stagedStatusForAll: AnimalStatus | "";
	stagedFosterVisibilityForAll: FosterVisibility | "";
	setStagedStatusForAll: (status: AnimalStatus | "") => void;
	setStagedFosterVisibilityForAll: (
		visibility: FosterVisibility | ""
	) => void;
	/** Called when user explicitly selects "Select..." (true) or a visibility value (false) for the visibility dropdown. */
	onVisibilityExplicitlyCleared?: (cleared: boolean) => void;
	/** Raw conflict: selected animals have different visibility (before "set for all" is applied). */
	hasFosterVisibilityConflictComputed: boolean;
	/** True when selected animals' actual (current) visibilities differ, ignoring staged "set for all". */
	hasConflictFromCurrentVisibility?: boolean;
	/** When pre-existing animals are selected, their shared status/visibility (for dropdown default). */
	sharedStatusFromSelected?: AnimalStatus | "";
	sharedVisibilityFromSelected?: FosterVisibility | null;
	/** Shared visibility of selected animals from DB only (no staged). Used to show "match" vs "will be set". */
	sharedVisibilityFromCurrentOnly?: FosterVisibility | null;
	/** True when selected animals' actual statuses differ (ignoring staged "set for all"). Used for "will be set" vs "have different" message. */
	hasMismatchFromCurrentStatus?: boolean;

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
	/** When true, show option to unassign all animals from current foster before delete (only relevant if group has animals) */
	groupHasFoster?: boolean;
	/** When false (e.g. group has zero animals), unassign option is hidden and unassign flow is skipped */
	groupHasAnimals?: boolean;
	unassignBeforeDelete?: boolean;
	onUnassignBeforeDeleteChange?: (value: boolean) => void;

	// Search and filters for animal selection (optional)
	animalSearchTerm?: string;
	onAnimalSearch?: (term: string) => void;
	animalFilters?: AnimalFiltersType;
	onAnimalFiltersChange?: (filters: AnimalFiltersType) => void;

	// Pagination for animal selection (optional)
	animalCurrentPage?: number;
	animalTotalPages?: number;
	animalTotalItems?: number;
	animalItemsPerPage?: number;
	onAnimalPageChange?: (page: number) => void;

	// Bulk add animals
	bulkAddRows?: BulkAddAnimalRow[];
	onBulkAddRow?: () => void;
	onBulkRemoveRow?: (id: string) => void;
	onBulkUpdateRow?: (
		id: string,
		field: keyof BulkAddAnimalRow,
		value: string
	) => void;
	onBulkSetRowCount?: (count: number) => void;
	bulkCanAddMore?: boolean;
	bulkMaxRows?: number;
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
	stagedStatusForAll,
	stagedFosterVisibilityForAll,
	setStagedStatusForAll,
	setStagedFosterVisibilityForAll,
	hasFosterVisibilityConflictComputed,
	hasConflictFromCurrentVisibility = false,
	sharedStatusFromSelected = "",
	sharedVisibilityFromSelected = null,
	sharedVisibilityFromCurrentOnly = null,
	hasMismatchFromCurrentStatus = false,
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
	groupHasFoster = false,
	groupHasAnimals = true,
	unassignBeforeDelete = false,
	onUnassignBeforeDeleteChange,
	// Search and filter props
	animalSearchTerm,
	onAnimalSearch,
	animalFilters,
	onAnimalFiltersChange,
	// Pagination props
	animalCurrentPage,
	animalTotalPages,
	animalTotalItems,
	animalItemsPerPage,
	onAnimalPageChange,
	// Bulk add props
	bulkAddRows = [],
	onBulkAddRow,
	onBulkRemoveRow,
	onBulkUpdateRow,
	onBulkSetRowCount,
	bulkCanAddMore = true,
	bulkMaxRows = 30,
}: GroupFormProps) {
	// Generate active filter chips
	const activeFilterChips = useMemo(() => {
		if (!animalFilters || !onAnimalFiltersChange) return [];

		const chips: Array<{ label: string; onRemove: () => void }> = [];

		const createRemoveHandler =
			(key: keyof AnimalFiltersType, value: undefined) => () => {
				onAnimalFiltersChange({
					...animalFilters,
					[key]: value,
				});
			};

		if (animalFilters.priority === true) {
			chips.push({
				label: "High Priority",
				onRemove: createRemoveHandler("priority", undefined),
			});
		}

		if (animalFilters.sex) {
			const sexLabels: Record<string, string> = {
				male: "Male",
				female: "Female",
				spayed_female: "Spayed Female",
				neutered_male: "Neutered Male",
			};
			chips.push({
				label: `Sex: ${
					sexLabels[animalFilters.sex] || animalFilters.sex
				}`,
				onRemove: createRemoveHandler("sex", undefined),
			});
		}

		if (animalFilters.life_stage) {
			const lifeStageLabels: Record<string, string> = {
				kitten: "Kitten",
				adult: "Adult",
				senior: "Senior",
			};
			chips.push({
				label: `Life Stage: ${
					lifeStageLabels[animalFilters.life_stage] ||
					animalFilters.life_stage
				}`,
				onRemove: createRemoveHandler("life_stage", undefined),
			});
		}

		if (animalFilters.inGroup === true) {
			chips.push({
				label: "In Group",
				onRemove: createRemoveHandler("inGroup", undefined),
			});
		} else if (animalFilters.inGroup === false) {
			chips.push({
				label: "Not In Group",
				onRemove: createRemoveHandler("inGroup", undefined),
			});
		}

		if (animalFilters.status) {
			const statusLabels: Record<string, string> = {
				in_foster: "In Foster",
				adopted: "Adopted",
				medical_hold: "Medical Hold",
				in_shelter: "In Shelter",
				transferring: "Transferring",
			};
			chips.push({
				label: `Status: ${
					statusLabels[animalFilters.status] || animalFilters.status
				}`,
				onRemove: createRemoveHandler("status", undefined),
			});
		}

		if (animalFilters.foster_visibility) {
			const visibilityLabels: Record<string, string> = {
				available_now: "Available Now",
				available_future: "Available Future",
				foster_pending: "Foster Pending",
				not_visible: "Not Visible",
			};
			chips.push({
				label: `Visibility: ${
					visibilityLabels[animalFilters.foster_visibility] ||
					animalFilters.foster_visibility
				}`,
				onRemove: createRemoveHandler("foster_visibility", undefined),
			});
		}

		if (animalFilters.sortByCreatedAt) {
			chips.push({
				label: `Sort: ${
					animalFilters.sortByCreatedAt === "oldest"
						? "Oldest First"
						: "Newest First"
				}`,
				onRemove: createRemoveHandler("sortByCreatedAt", undefined),
			});
		}

		return chips;
	}, [animalFilters, onAnimalFiltersChange]);

	// Stable sort: selected animals first, then unselected (maintain order within each group)
	const sortedAnimals = [...animals].sort((a, b) => {
		const aSelected = selectedAnimalIds.includes(a.id);
		const bSelected = selectedAnimalIds.includes(b.id);
		if (aSelected && !bSelected) return -1;
		if (!aSelected && bSelected) return 1;
		return 0; // Maintain original order within each group
	});

	const hasAnyAnimalsStaged =
		selectedAnimalIds.length > 0 || bulkAddRows.length > 0;

	// Only bulk-add rows (no pre-existing selected): show defaults so it's clear what new animals will get
	const onlyBulkAdd =
		selectedAnimalIds.length === 0 && bulkAddRows.length > 0;
	const statusDropdownValue =
		stagedStatusForAll ||
		(onlyBulkAdd ? "in_shelter" : sharedStatusFromSelected) ||
		"";

	// When user explicitly selects "Select...", keep showing empty until they pick a value or selection changes
	const [userHasClearedVisibility, setUserHasClearedVisibility] =
		useState(false);
	const bulkRowCount = bulkAddRows?.length ?? 0;
	useEffect(() => {
		// Reset "cleared" when selection changes so dropdown can show derived value for new set (deferred to avoid sync setState in effect)
		queueMicrotask(() => setUserHasClearedVisibility(false));
	}, [selectedAnimalIds.length, bulkRowCount]);
	const visibilityDropdownValue = userHasClearedVisibility
		? ""
		: stagedFosterVisibilityForAll ||
			(onlyBulkAdd ? "available_now" : sharedVisibilityFromSelected ?? "") ||
			"";

	// Only show visibility conflict as blocking error when user has not set "set all visibility"
	const showVisibilityConflictError =
		hasFosterVisibilityConflictComputed && !stagedFosterVisibilityForAll;

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

			{/* Bulk Add Animals Section */}
			{onBulkAddRow && onBulkRemoveRow && onBulkUpdateRow && onBulkSetRowCount && (
				<BulkAddAnimalRows
					rows={bulkAddRows}
					onAddRow={onBulkAddRow}
					onRemoveRow={onBulkRemoveRow}
					onUpdateRow={onBulkUpdateRow}
					onSetRowCount={onBulkSetRowCount}
					canAddMore={bulkCanAddMore}
					maxRows={bulkMaxRows}
					disabled={loading}
				/>
			)}

			{/* Set all animals status dropdown */}
			{hasAnyAnimalsStaged && (
				<div>
					<div className="flex items-center gap-1.5 mb-1">
						<label
							htmlFor="group-form-set-all-status"
							className="text-sm font-medium text-gray-700"
						>
							Set all animals status
						</label>
						<InfoTooltip
							content="Animals in the same group are allowed to have different statuses"
							ariaLabel="Status info"
						/>
					</div>
					<Select
						id="group-form-set-all-status"
						label={undefined}
						value={statusDropdownValue}
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
					{hasMismatchFromCurrentStatus && (
						<p className="mt-1 text-sm text-yellow-700">
							{stagedStatusForAll
								? "All animals in this group will be set to this status."
								: "Grouped animals have different statuses."}
						</p>
					)}
				</div>
			)}

			{/* Set all animals visibility on Fosters Needed page dropdown */}
			{hasAnyAnimalsStaged && (
				<div>
					<div className="flex items-center gap-1.5 mb-1">
						<label
							htmlFor="group-form-set-all-visibility"
							className="text-sm font-medium text-gray-700"
						>
							Set all animals visibility on Fosters Needed page
						</label>
						<InfoTooltip
							content="Animals in a group must have the same visibility on Fosters Needed page."
							ariaLabel="Visibility info"
						/>
					</div>
					<Select
						id="group-form-set-all-visibility"
						label={undefined}
						value={visibilityDropdownValue}
						onChange={(e) => {
							const value = (e.target.value ||
								"") as FosterVisibility | "";
							setStagedFosterVisibilityForAll(value);
							setUserHasClearedVisibility(value === "");
						}}
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
							hasFosterVisibilityConflictComputed &&
							!stagedFosterVisibilityForAll
								? errors.fosterVisibility
								: undefined
						}
					/>
					{hasFosterVisibilityConflictComputed &&
					!stagedFosterVisibilityForAll ? (
						<div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
							<p className="text-sm text-red-700">
								Animals in a group must have the same
								visibility on Fosters Needed page
							</p>
						</div>
					) : stagedFosterVisibilityForAll &&
					  (hasConflictFromCurrentVisibility ||
						sharedVisibilityFromCurrentOnly !==
							stagedFosterVisibilityForAll) ? (
						<p className="mt-2 text-sm text-yellow-700">
							All animals in this group will be set to this
							visibility.
						</p>
					) : stagedFosterVisibilityForAll &&
					  sharedVisibilityFromCurrentOnly ===
						stagedFosterVisibilityForAll &&
					  selectedAnimalIds.length + (bulkAddRows?.length ?? 0) >
						1 ? (
						<p className="mt-2 text-sm text-green-700">
							All grouped animals match this visibility.
						</p>
					) : null}
				</div>
			)}

			{/* Animal Selection Section */}
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-2">
					Select Animals
				</label>

				{/* Search and Filters for Animal Selection */}
				{!isLoadingAnimals && !isErrorAnimals && (
					<div className="mb-4">
						<div className="flex items-center gap-2">
							{/* Search Input */}
							{onAnimalSearch && (
								<SearchInput
									value={animalSearchTerm || ""}
									onSearch={onAnimalSearch}
									disabled={loading || isLoadingAnimals}
								/>
							)}
							{/* Filters */}
							{onAnimalFiltersChange &&
								animalFilters !== undefined && (
									<AnimalFilters
										filters={animalFilters}
										onFiltersChange={onAnimalFiltersChange}
									/>
								)}
						</div>

						{/* Active Filter Chips */}
						{activeFilterChips.length > 0 && (
							<div className="mt-3 flex flex-wrap gap-2">
								{activeFilterChips.map(
									(
										chip: {
											label: string;
											onRemove: () => void;
										},
										index: number
									) => (
										<FilterChip
											key={index}
											label={chip.label}
											onRemove={chip.onRemove}
										/>
									)
								)}
								{animalSearchTerm && onAnimalSearch && (
									<FilterChip
										label={`Search: "${animalSearchTerm}"`}
										onRemove={() => onAnimalSearch("")}
									/>
								)}
							</div>
						)}
					</div>
				)}

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
					<>
						<div className="max-h-[520px] overflow-y-auto pt-6 pb-6 pl-2 pr-2 -mx-6">
							<div className="grid gap-1.5 grid-cols-1 min-[375px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
								{sortedAnimals.map((animal) => {
									const isSelected =
										selectedAnimalIds.includes(animal.id);
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
											<div
												style={{
													pointerEvents: "none",
												}}
											>
												<AnimalCard animal={animal} />
											</div>
										</div>
									);
								})}
							</div>
						</div>
						{/* Pagination for animal selection */}
						{animalCurrentPage &&
							animalTotalPages !== undefined &&
							animalTotalItems !== undefined &&
							animalItemsPerPage !== undefined &&
							onAnimalPageChange &&
							animalTotalPages > 1 && (
								<div className="mt-4">
									<Pagination
										currentPage={animalCurrentPage}
										totalPages={animalTotalPages}
										onPageChange={onAnimalPageChange}
										totalItems={animalTotalItems}
										itemsPerPage={animalItemsPerPage}
									/>
								</div>
							)}
					</>
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

			{showVisibilityConflictError && (
				<ErrorMessage>
					Alert: Animals in a group must have the same visibility on
					Fosters Needed page
				</ErrorMessage>
			)}

			{Object.keys(errors).length > 0 && !showVisibilityConflictError && (
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
					<p className="text-sm text-red-800 mb-2">
						Are you sure you want to delete this group?
						{groupHasAnimals &&
							" The animals in this group will remain but will no longer be grouped together."}
					</p>
					{groupHasFoster && groupHasAnimals && onUnassignBeforeDeleteChange && (
						<div className="mb-3">
							<Toggle
								label="Unassign all animals from current foster"
								checked={unassignBeforeDelete}
								onChange={onUnassignBeforeDeleteChange}
								disabled={deleting}
								switchOnLeft
							/>
						</div>
					)}
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
					disabled={loading || showVisibilityConflictError}
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
