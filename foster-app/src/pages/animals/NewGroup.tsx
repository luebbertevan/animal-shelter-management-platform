import { useState, useMemo } from "react";
import type { FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { useProtectedAuth } from "../../hooks/useProtectedAuth";
import { useGroupForm } from "../../hooks/useGroupForm";
import type { Animal, AnimalStatus, FosterVisibility } from "../../types";
import GroupForm from "../../components/animals/GroupForm";
import Button from "../../components/ui/Button";
import ConfirmModal from "../../components/ui/ConfirmModal";
import { getErrorMessage, checkOfflineAndThrow } from "../../lib/errorUtils";
import { fetchAnimals, fetchAnimalsCount, fetchAnimalsByIds } from "../../lib/animalQueries";
import { createGroup } from "../../lib/groupQueries";
import { assignGroupToFoster, unassignAnimalsWithOneMessage } from "../../lib/assignmentUtils";
import AssignmentConfirmationDialog from "../../components/animals/AssignmentConfirmationDialog";
import UnassignmentDialog from "../../components/animals/UnassignmentDialog";
import { fetchFosterById } from "../../lib/fosterQueries";
import { uploadGroupPhoto } from "../../lib/photoUtils";
import {
	getGroupFormMessageState,
	getVisibilityConflictSubmitError,
} from "../../lib/groupUtils";
import { isDeceasedOrEuthanized } from "../../lib/metadataUtils";
import {
	bulkCreateAnimals,
	getBulkCreateGroupDefaults,
} from "../../lib/bulkAnimalUtils";
import { useBulkAddRows } from "../../hooks/useBulkAddRows";
import { useGroupFormPriorityAndVisibility } from "../../hooks/useGroupFormPriorityAndVisibility";
import { useGroupFormDuplicateCheck } from "../../hooks/useGroupFormDuplicateCheck";
import { useEmptyGroupConfirm } from "../../hooks/useEmptyGroupConfirm";
import { needsAllAnimalsForGroupForm } from "../../lib/filterUtils";
import type { TimestampedPhoto } from "../../types";
import type { AnimalFilters } from "../../components/animals/AnimalFilters";
import { PAGE_SIZES } from "../../lib/paginationConfig";

export default function NewGroup() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { user, profile } = useProtectedAuth();

	const [visibilityExplicitlyCleared, setVisibilityExplicitlyCleared] =
		useState(false);

	// Use the form hook (before animals are fetched)
	const {
		formState,
		setName,
		setDescription,
		setPriority,
		selectedAnimalIds,
		toggleAnimalSelection,
		setStagedStatusForAll,
		setStagedFosterVisibilityForAll,
		stagedStatusChanges,
		stagedFosterVisibilityChanges,
		stagedStatusForAll,
		stagedFosterVisibilityForAll,
		validateForm,
		errors,
	} = useGroupForm({ visibilityExplicitlyCleared });

	const {
		rows: bulkAddRows,
		addRow: bulkAddRow,
		removeRow: bulkRemoveRow,
		updateRow: bulkUpdateRow,
		setRowCount: bulkSetRowCount,
		canAddMore: bulkCanAddMore,
		maxRows: bulkMaxRows,
	} = useBulkAddRows();

	const [loading, setLoading] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);
	const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
	const [photoUploadError, setPhotoUploadError] = useState<string | null>(
		null
	);

	// Search and filter state for animal selection
	const [animalSearchTerm, setAnimalSearchTerm] = useState("");
	const [animalFilters, setAnimalFilters] = useState<AnimalFilters>({});

	// Pagination state for animal selection
	const [animalPage, setAnimalPage] = useState(1);
	const animalPageSize = PAGE_SIZES.GROUP_ANIMAL_SELECTION;

	const {
		showEmptyGroupConfirm,
		requestEmptyGroupConfirm,
		handleConfirmEmptyGroup,
		handleCancelEmptyGroup,
	} = useEmptyGroupConfirm();

	// Added animals already assigned (create group): choice modal — list all, then assign group to [foster] or unassign all
	type AddChoiceAnimal = {
		id: string;
		name: string | null;
		fosterId: string;
		fosterName: string;
	};
	type AddChoiceModal = { animals: AddChoiceAnimal[] };
	const [addChoiceModal, setAddChoiceModal] = useState<AddChoiceModal | null>(null);
	const [addChoicePendingAssign, setAddChoicePendingAssign] = useState<{
		fosterId: string;
		fosterName: string;
		// Per-foster unassignment steps; we show ONE dialog per foster.
		unassignQueue: {
			fosterId: string;
			fosterName: string;
			animals: AddChoiceAnimal[];
		}[];
	} | null>(null);
	const [addChoicePendingUnassignAll, setAddChoicePendingUnassignAll] = useState<{
		// Per-foster unassignment steps for the "Unassign all animals" choice.
		unassignQueue: {
			fosterId: string;
			fosterName: string;
			animals: AddChoiceAnimal[];
		}[];
	} | null>(null);

	const needsAllAnimals = needsAllAnimalsForGroupForm(
		animalSearchTerm,
		animalFilters
	);

	const animalOffset = needsAllAnimals
		? 0
		: (animalPage - 1) * animalPageSize;
	const animalLimit = needsAllAnimals ? undefined : animalPageSize;

	// Fetch available animals with pagination, filters, and search
	const {
		data: animals = [],
		isLoading: isLoadingAnimals,
		isError: isErrorAnimals,
	} = useQuery<Animal[], Error>({
		queryKey: [
			"animals",
			user.id,
			profile.organization_id,
			needsAllAnimals ? "all" : animalPage,
			needsAllAnimals ? "all" : animalPageSize,
			animalFilters,
			animalSearchTerm,
		],
		queryFn: async () => {
			const animalsData = await fetchAnimals(profile.organization_id, {
				fields: [
					"id",
					"name",
					"status",
					"sex_spay_neuter_status",
					"priority",
					"photos",
					"date_of_birth",
					"group_id",
					"foster_visibility",
					"life_stage",
				],
				orderBy: "created_at",
				orderDirection:
					animalFilters.sortByCreatedAt === "newest" ? "desc" : "asc",
				limit: animalLimit,
				offset: animalOffset,
				filters: animalFilters,
				searchTerm: animalSearchTerm,
			});

			// Fetch group names for animals that are in groups
			const groupIds = [
				...new Set(
					animalsData
						.map((a) => a.group_id)
						.filter((id): id is string => !!id)
				),
			];

			const groupsMap = new Map<string, string>();
			if (groupIds.length > 0) {
				try {
					const { data: groups, error: groupsError } = await supabase
						.from("animal_groups")
						.select("id, name")
						.in("id", groupIds);

					if (groupsError) {
						console.error("Error fetching groups:", groupsError);
					} else {
						if (groups) {
							groups.forEach((group) => {
								if (group.id && group.name) {
									groupsMap.set(group.id, group.name);
								}
							});
						}
					}
				} catch (error) {
					console.error("Error fetching groups:", error);
				}
			}

			// Map animals with their group names, and exclude deceased/euthanized (they cannot be added to groups)
			return animalsData
				.filter(
					(animal) => !isDeceasedOrEuthanized(animal.status as AnimalStatus)
				)
				.map((animal) => {
					if (animal.group_id) {
						const groupName = groupsMap.get(animal.group_id);
						return {
							...animal,
							group_name: groupName,
						};
					}
					return animal;
				});
		},
	});

	// Filter animals client-side when filters/search are active
	// Now showing animals in groups to allow transferring between groups
	const filteredAnimals = useMemo(() => {
		let filtered = animals;

		// Apply search filter if active (already applied server-side, but apply again for consistency)
		if (animalSearchTerm) {
			const searchLower = animalSearchTerm.toLowerCase();
			filtered = filtered.filter((animal) => {
				const animalName = animal.name?.toLowerCase() || "";
				return animalName.includes(searchLower);
			});
		}

		// Apply filters client-side if needed (already applied server-side, but apply again for consistency)
		// This ensures consistency when we switch between server-side and client-side filtering
		if (animalFilters.priority === true) {
			filtered = filtered.filter((animal) => animal.priority === true);
		}
		if (animalFilters.sex) {
			filtered = filtered.filter(
				(animal) => animal.sex_spay_neuter_status === animalFilters.sex
			);
		}
		if (animalFilters.life_stage) {
			filtered = filtered.filter(
				(animal) => animal.life_stage === animalFilters.life_stage
			);
		}
		if (animalFilters.status) {
			filtered = filtered.filter(
				(animal) => animal.status === animalFilters.status
			);
		}
		if (animalFilters.inGroup === false) {
			filtered = filtered.filter((animal) => !animal.group_id);
		}

		return filtered;
	}, [animals, animalSearchTerm, animalFilters]);

	// Paginate filtered animals client-side when filters/search are active
	const paginatedAnimals = useMemo(() => {
		if (needsAllAnimals) {
			const startIndex = (animalPage - 1) * animalPageSize;
			const endIndex = startIndex + animalPageSize;
			return filteredAnimals.slice(startIndex, endIndex);
		}
		return filteredAnimals;
	}, [filteredAnimals, needsAllAnimals, animalPage, animalPageSize]);

	// Fetch total count of animals for pagination (when using server-side pagination)
	const { data: totalAnimalCount = 0 } = useQuery({
		queryKey: [
			"animals-count",
			profile.organization_id,
			animalFilters,
			animalSearchTerm,
		],
		queryFn: () =>
			fetchAnimalsCount(
				profile.organization_id,
				animalFilters,
				animalSearchTerm
			),
		enabled: !needsAllAnimals, // Only fetch when using server-side pagination
	});

	const finalAnimalCount = needsAllAnimals
		? filteredAnimals.length
		: totalAnimalCount;
	const totalAnimalPages = Math.ceil(finalAnimalCount / animalPageSize);

	// Handle page change for animal selection
	const handleAnimalPageChange = (newPage: number) => {
		setAnimalPage(newPage);
	};

	// Handle search for animal selection
	const handleAnimalSearch = (term: string) => {
		setAnimalSearchTerm(term);
		setAnimalPage(1); // Reset to first page on search
	};

	// Handle filter change for animal selection
	const handleAnimalFiltersChange = (newFilters: AnimalFilters) => {
		setAnimalFilters(newFilters);
		setAnimalPage(1); // Reset to first page on filter change
	};

	// Get selected animals for conflict detection (after animals are fetched)
	const selectedAnimals = useMemo(() => {
		return animals.filter((animal) =>
			selectedAnimalIds.includes(animal.id)
		);
	}, [animals, selectedAnimalIds]);

	// Single source of truth for status/visibility messages and conflict state (DRY with EditGroup)
	const messageState = useMemo(
		() =>
			getGroupFormMessageState(
				selectedAnimals,
				selectedAnimalIds,
				stagedStatusChanges,
				stagedFosterVisibilityChanges
			),
		[
			selectedAnimals,
			selectedAnimalIds,
			stagedStatusChanges,
			stagedFosterVisibilityChanges,
		]
	);

	const { setPriorityWithTouch } = useGroupFormPriorityAndVisibility({
		selectedAnimals,
		setPriority,
		selectedAnimalIdsLength: selectedAnimalIds.length,
		bulkAddRowsLength: bulkAddRows.length,
		setVisibilityExplicitlyCleared,
	});

	const {
		duplicateModal,
		handleAnimalSelection,
		handleMoveToNew,
		handleCancelMove,
	} = useGroupFormDuplicateCheck({
		selectedAnimalIds,
		toggleAnimalSelection,
		animals,
		organizationId: profile.organization_id,
	});

	// Distinct fosters for modal buttons (from animals)
	const addChoiceDistinctFosters = useMemo(() => {
		if (!addChoiceModal) return [];
		const byId = new Map<string, string>();
		for (const a of addChoiceModal.animals) {
			byId.set(a.fosterId, a.fosterName);
		}
		return Array.from(byId.entries()).map(([fosterId, fosterName]) => ({
			fosterId,
			fosterName,
		}));
	}, [addChoiceModal]);

	// Add-choice: assign group to [foster] — unassign animals with other fosters, then create group + assignGroupToFoster
	const handleAddChoiceAssignGroupToFoster = (fosterId: string, fosterName: string) => {
		if (!addChoiceModal) return;
		const animalsToUnassign = addChoiceModal.animals.filter(
			(a) => a.fosterId !== fosterId
		);
		const byFoster = new Map<string, { fosterName: string; animals: AddChoiceAnimal[] }>();
		for (const a of animalsToUnassign) {
			const existing = byFoster.get(a.fosterId);
			if (existing) {
				existing.animals.push(a);
			} else {
				byFoster.set(a.fosterId, { fosterName: a.fosterName, animals: [a] });
			}
		}
		setAddChoicePendingAssign({
			fosterId,
			fosterName,
			unassignQueue: Array.from(byFoster.entries()).map(([fid, v]) => ({
				fosterId: fid,
				fosterName: v.fosterName,
				animals: v.animals,
			})),
		});
		setAddChoiceModal(null);
	};

	// Add-choice: unassign all animals — build per-foster queues; on confirm unassign per foster then create group
	const handleAddChoiceUnassignAll = () => {
		if (!addChoiceModal) return;
		const byFoster = new Map<string, { fosterName: string; animals: AddChoiceAnimal[] }>();
		for (const a of addChoiceModal.animals) {
			const existing = byFoster.get(a.fosterId);
			if (existing) {
				existing.animals.push(a);
			} else {
				byFoster.set(a.fosterId, { fosterName: a.fosterName, animals: [a] });
			}
		}
		setAddChoicePendingUnassignAll({
			unassignQueue: Array.from(byFoster.entries()).map(([fosterId, value]) => ({
				fosterId,
				fosterName: value.fosterName,
				animals: value.animals,
			})),
		});
		setAddChoiceModal(null);
	};

	// Add-choice: step 1 — unassign animals from their current fosters; on confirm run unassigns then show assignment dialog
	const handleAddChoiceUnassignFirstConfirm = async (
		newStatus: AnimalStatus,
		newVisibility: FosterVisibility,
		message: string,
		includeTag: boolean,
		notifyFoster: boolean
	) => {
		if (!addChoicePendingAssign || addChoicePendingAssign.unassignQueue.length === 0) return;
		setSubmitError(null);
		try {
			const current = addChoicePendingAssign.unassignQueue[0];
			await unassignAnimalsWithOneMessage(
				current.animals.map((a) => a.id),
				current.fosterId,
				profile.organization_id,
				newStatus,
				newVisibility,
				message,
				includeTag,
				notifyFoster
			);
			await queryClient.invalidateQueries({ queryKey: ["foster", current.fosterId] });
			setAddChoicePendingAssign((prev) =>
				prev ? { ...prev, unassignQueue: prev.unassignQueue.slice(1) } : null
			);
		} catch (err) {
			setSubmitError(
				getErrorMessage(err, "Failed to unassign. Please try again.")
			);
		}
	};

	// Add-choice assignment confirm (step 2): create group + assignGroupToFoster; unassigns already done in step 1
	const handleAddChoiceAssignmentConfirm = async (
		message: string,
		includeTag: boolean,
		notifyFoster: boolean
	) => {
		if (!addChoicePendingAssign) return;
		setSubmitError(null);
		try {
			const groupId = await performSubmit({ skipNavigateAndReturnId: true });
			if (!groupId) {
				setSubmitError("Group was created but could not complete assignment.");
				return;
			}
			await assignGroupToFoster(
				groupId,
				addChoicePendingAssign.fosterId,
				profile.organization_id,
				message,
				includeTag,
				notifyFoster,
				(stagedStatusForAll as AnimalStatus) || "in_foster",
				(stagedFosterVisibilityForAll as FosterVisibility) || "not_visible"
			);
			queryClient.invalidateQueries({
				queryKey: ["groups", user.id, profile.organization_id],
			});
			queryClient.invalidateQueries({
				queryKey: ["foster", addChoicePendingAssign.fosterId],
			});
			queryClient.invalidateQueries({
				queryKey: ["group-animals", user.id, profile.organization_id],
			});
			setAddChoicePendingAssign(null);
			setSuccessMessage("Group created and assigned successfully!");
			setTimeout(() => navigate(`/groups/${groupId}`, { replace: true }), 1500);
		} catch (err) {
			setSubmitError(
				getErrorMessage(err, "Failed to create or assign group. Please try again.")
			);
		}
	};

	// Add-choice unassign-all confirm: unassign each foster's animals (one message per foster), then create group
	const handleAddChoiceUnassignAllConfirm = async (
		newStatus: AnimalStatus,
		newVisibility: FosterVisibility,
		message: string,
		includeTag: boolean,
		notifyFoster: boolean
	) => {
		if (
			!addChoicePendingUnassignAll ||
			addChoicePendingUnassignAll.unassignQueue.length === 0
		) {
			return;
		}
		setSubmitError(null);
		try {
			// Take the current foster at the front of the queue
			const current = addChoicePendingUnassignAll.unassignQueue[0];
			await unassignAnimalsWithOneMessage(
				current.animals.map((a) => a.id),
				current.fosterId,
				profile.organization_id,
				newStatus,
				newVisibility,
				message,
				includeTag,
				notifyFoster
			);
			await queryClient.invalidateQueries({
				queryKey: ["foster", current.fosterId],
			});

			// Advance the queue
			setAddChoicePendingUnassignAll((prev) => {
				if (!prev) return null;
				const remaining = prev.unassignQueue.slice(1);
				if (remaining.length === 0) {
					return null;
				}
				return { ...prev, unassignQueue: remaining };
			});

			// If that was the last foster, create the group and refresh group queries
			if (addChoicePendingUnassignAll.unassignQueue.length === 1) {
				await performSubmit({});
				queryClient.invalidateQueries({
					queryKey: ["groups", user.id, profile.organization_id],
				});
			}
		} catch (err) {
			setSubmitError(
				getErrorMessage(err, "Failed to unassign or create group. Please try again.")
			);
		}
	};

	const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setSubmitError(null);

		const visibilityError = getVisibilityConflictSubmitError(
			messageState,
			stagedFosterVisibilityForAll
		);
		if (visibilityError) {
			setSubmitError(visibilityError);
			return;
		}

		if (!validateForm()) {
			return;
		}

		// If adding animals that are already assigned to a foster, offer choice; list all and show assign-group or unassign-all
		if (selectedAnimalIds.length > 0) {
			const addedAnimalsData = await fetchAnimalsByIds(
				selectedAnimalIds,
				profile.organization_id,
				{ fields: ["id", "name", "current_foster_id"] }
			);
			const withFoster = addedAnimalsData.filter(
				(a): a is Animal & { current_foster_id: string } => !!a.current_foster_id
			);
			if (withFoster.length > 0) {
				const fosterIds = [...new Set(withFoster.map((a) => a.current_foster_id))];
				const fosterNames = await Promise.all(
					fosterIds.map((fid) =>
						fetchFosterById(fid, profile.organization_id).then(
							(f) => f.full_name || f.email || "Foster"
						)
					)
				);
				const fosterIdToName = new Map(
					fosterIds.map((fid, i) => [fid, fosterNames[i]])
				);
				setAddChoiceModal({
					animals: withFoster.map((a) => ({
						id: a.id,
						name: a.name ?? null,
						fosterId: a.current_foster_id,
						fosterName: fosterIdToName.get(a.current_foster_id) ?? "Foster",
					})),
				});
				return;
			}
		}

		// Check for empty group and show confirmation modal
		if (selectedAnimalIds.length === 0 && bulkAddRows.length === 0) {
			requestEmptyGroupConfirm(() => {
				void performSubmit({});
			});
			return;
		}

		// Proceed with submission
		await performSubmit({});
	};

	// Perform the actual group creation
	type PerformSubmitOptions = { skipNavigateAndReturnId?: boolean };
	const performSubmit = async (
		options: PerformSubmitOptions = {}
	): Promise<string | void> => {
		const { skipNavigateAndReturnId = false } = options;
		setLoading(true);

		try {
			checkOfflineAndThrow();

			// Check if any selected animals are in other groups and remove them
			// This handles the "Move to new" scenario
			if (selectedAnimalIds.length > 0) {
				// Get current group_id for animals being added
				const { data: animalsToAdd, error: fetchError } = await supabase
					.from("animals")
					.select("id, group_id")
					.in("id", selectedAnimalIds)
					.eq("organization_id", profile.organization_id);

				if (fetchError) {
					console.error("Error fetching animals to add:", fetchError);
				} else if (animalsToAdd) {
					// Find animals that are in other groups
					const animalsInOtherGroups = animalsToAdd.filter(
						(a) => a.group_id !== null
					);

					// Remove these animals from their old groups
					if (animalsInOtherGroups.length > 0) {
						const oldGroupIds = [
							...new Set(
								animalsInOtherGroups
									.map((a) => a.group_id)
									.filter((gid): gid is string => !!gid)
							),
						];

						// Update each old group to remove the animal from animal_ids
						for (const oldGroupId of oldGroupIds) {
							const { data: oldGroup } = await supabase
								.from("animal_groups")
								.select("animal_ids")
								.eq("id", oldGroupId)
								.eq("organization_id", profile.organization_id)
								.single();

							if (oldGroup && oldGroup.animal_ids) {
								const updatedAnimalIds = (
									oldGroup.animal_ids as string[]
								).filter(
									(aid) =>
										!animalsInOtherGroups
											.map((a) => a.id)
											.includes(aid)
								);

								await supabase
									.from("animal_groups")
									.update({ animal_ids: updatedAnimalIds })
									.eq("id", oldGroupId)
									.eq(
										"organization_id",
										profile.organization_id
									);
							}
						}
					}
				}
			}

			// Create bulk-add animals if any
			let bulkCreatedIds: string[] = [];
			if (bulkAddRows.length > 0) {
				const onlyBulkAdd = selectedAnimalIds.length === 0;
				const defaults = getBulkCreateGroupDefaults(
					onlyBulkAdd,
					stagedStatusForAll,
					stagedFosterVisibilityForAll,
					messageState
				);
				const result = await bulkCreateAnimals(bulkAddRows, {
					organizationId: profile.organization_id,
					createdBy: user.id,
					...defaults,
				});
				bulkCreatedIds = result.createdIds;
				if (result.failedCount > 0) {
					setSubmitError(
						`${result.failedCount} animal(s) failed to create. ${bulkCreatedIds.length} created successfully.`
					);
				}
			}

			const allAnimalIds = [
				...selectedAnimalIds,
				...bulkCreatedIds,
			];

			// Auto-fill name with "Group of #" if no name provided
			const groupName =
				formState.name.trim() || `Group of ${allAnimalIds.length}`;

			// Create the group
			const newGroup = await createGroup(profile.organization_id, {
				name: groupName,
				description: formState.description.trim() || null,
				animal_ids: allAnimalIds,
				priority: formState.priority,
				created_by: user.id,
			});

			// Animal created successfully - now upload photos if any
			const groupId = newGroup.id;
			const photoMetadata: TimestampedPhoto[] = [];

			if (selectedPhotos.length > 0) {
				setPhotoUploadError(null);

				try {
					// Upload all photos in parallel
					const uploadResults = await Promise.allSettled(
						selectedPhotos.map(
							async (
								file
							): Promise<{
								success: boolean;
								url?: string;
								uploaded_at?: string;
								uploaded_by?: string;
								error?: string;
							}> => {
								try {
									const photoUrl = await uploadGroupPhoto(
										file,
										profile.organization_id,
										groupId
									);
									return {
										success: true,
										url: photoUrl,
										uploaded_at: new Date().toISOString(),
										uploaded_by: user.id,
									};
								} catch (err) {
									console.error(
										"Error uploading photo:",
										err
									);
									return {
										success: false,
										error:
											err instanceof Error
												? err.message
												: "Unknown error",
									};
								}
							}
						)
					);

					// Process upload results
					const successfulUploads: TimestampedPhoto[] = uploadResults
						.filter(
							(result) =>
								result.status === "fulfilled" &&
								result.value.success
						)
						.map((result) => {
							const value = (
								result as PromiseFulfilledResult<{
									success: true;
									url: string;
									uploaded_at: string;
									uploaded_by: string;
								}>
							).value;
							// Extract only the fields needed for photo metadata
							return {
								url: value.url,
								uploaded_at: value.uploaded_at,
								uploaded_by: value.uploaded_by,
							};
						});

					const failedUploads = uploadResults.filter(
						(result) =>
							result.status === "rejected" ||
							(result.status === "fulfilled" &&
								!result.value.success)
					).length;

					photoMetadata.push(...successfulUploads);

					// Update group with photo metadata
					if (photoMetadata.length > 0) {
						const { error: updateError } = await supabase
							.from("animal_groups")
							.update({ group_photos: photoMetadata })
							.eq("id", groupId);

						if (updateError) {
							console.error(
								"Error updating group with photos:",
								updateError
							);
							// Don't fail the whole operation - photos are uploaded even if metadata update fails
						}
					}

					// Show appropriate messages based on upload results
					if (failedUploads === selectedPhotos.length) {
						// All photos failed
						setPhotoUploadError(
							`Group created successfully, but all ${failedUploads} photo${
								failedUploads !== 1 ? "s" : ""
							} failed to upload. You can add photos later via the edit form.`
						);
					} else if (failedUploads > 0) {
						// Some photos failed
						setPhotoUploadError(
							`Group created successfully. ${failedUploads} photo${
								failedUploads !== 1 ? "s" : ""
							} failed to upload, but ${
								successfulUploads.length
							} photo${
								successfulUploads.length !== 1 ? "s" : ""
							} uploaded successfully.`
						);
					}
				} catch (err) {
					console.error("Error uploading photos:", err);
					setPhotoUploadError(
						"Group created successfully, but photo upload failed. "
					);
				}
			}

			// Apply staged changes to existing selected animals: status and foster_visibility
			const animalUpdates: Record<string, unknown>[] = [];

			selectedAnimalIds.forEach((animalId) => {
				const update: Record<string, unknown> = {
					group_id: newGroup.id,
				};

				const stagedStatus = stagedStatusChanges.get(animalId);
				if (stagedStatus) {
					update.status = stagedStatus;
				}

				const stagedVisibility =
					(stagedFosterVisibilityChanges.get(animalId) ??
						stagedFosterVisibilityForAll) ||
					undefined;
				if (stagedVisibility) {
					update.foster_visibility = stagedVisibility;
				}

				animalUpdates.push({ id: animalId, ...update });
			});

			// Also set group_id for bulk-created animals
			bulkCreatedIds.forEach((animalId) => {
				animalUpdates.push({ id: animalId, group_id: newGroup.id });
			});

			const updatePromises = animalUpdates.map((update) => {
				const { id, ...updateData } = update;
				return supabase
					.from("animals")
					.update(updateData)
					.eq("id", id)
					.eq("organization_id", profile.organization_id);
			});

			const updateResults = await Promise.all(updatePromises);
			const updateError = updateResults.find(
				(result) => result.error
			)?.error;

			if (updateError) {
				console.error(
					"Error updating animals with group_id:",
					updateError
				);
				// Note: Group was created successfully, but animals weren't updated
				// This is a partial success - we should still show success but warn user
				setSubmitError(
					"Group was created, but failed to update animals. Please manually assign animals to the group."
				);
			} else if (skipNavigateAndReturnId) {
				return newGroup.id;
			} else {
				setSuccessMessage("Group created successfully!");

				// Redirect to group detail page after a brief delay
				setTimeout(() => {
					navigate(`/groups/${newGroup.id}`, {
						replace: true,
					});
				}, 1500);
			}
		} catch (err) {
			console.error("Unexpected error:", err);
			setSubmitError(
				getErrorMessage(
					err,
					"An unexpected error occurred. Please try again."
				)
			);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen p-4 bg-gray-50">
			<div className="max-w-4xl mx-auto">
				<div className="bg-white rounded-lg shadow-md p-6">
					<div className="flex items-center justify-between mb-6">
						<h1 className="text-2xl font-bold text-gray-900">
							Create New Group
						</h1>
						<div className="flex items-center gap-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => navigate("/groups")}
								className="w-auto py-1 px-2 text-sm whitespace-nowrap"
							>
								Cancel
							</Button>
						</div>
					</div>

					<GroupForm
						formState={formState}
						setName={setName}
						setDescription={setDescription}
						setPriority={setPriorityWithTouch}
						errors={errors}
						animals={paginatedAnimals}
						isLoadingAnimals={isLoadingAnimals}
						isErrorAnimals={isErrorAnimals}
						selectedAnimalIds={selectedAnimalIds}
						toggleAnimalSelection={handleAnimalSelection}
						stagedStatusForAll={stagedStatusForAll}
						stagedFosterVisibilityForAll={
							stagedFosterVisibilityForAll
						}
						setStagedStatusForAll={setStagedStatusForAll}
						setStagedFosterVisibilityForAll={
							setStagedFosterVisibilityForAll
						}
						onVisibilityExplicitlyCleared={
							setVisibilityExplicitlyCleared
						}
						hasFosterVisibilityConflictComputed={
							messageState.hasFosterVisibilityConflictComputed
						}
						hasConflictFromCurrentVisibility={
							messageState.hasConflictFromCurrentVisibility
						}
						hasMismatchFromCurrentStatus={
							messageState.hasMismatchFromCurrentStatus
						}
						sharedStatusFromSelected={
							messageState.sharedStatusFromSelected
						}
						sharedVisibilityFromSelected={
							messageState.sharedFosterVisibilityFromSelected
						}
						sharedVisibilityFromCurrentOnly={
							messageState.sharedFosterVisibilityFromCurrentOnly
						}
						onPhotosChange={setSelectedPhotos}
						photoError={photoUploadError}
						onSubmit={handleSubmit}
						loading={loading}
						submitError={submitError}
						successMessage={successMessage}
						submitButtonText="Create Group"
						// Bulk add props
						bulkAddRows={bulkAddRows}
						onBulkAddRow={bulkAddRow}
						onBulkRemoveRow={bulkRemoveRow}
						onBulkUpdateRow={bulkUpdateRow}
						onBulkSetRowCount={bulkSetRowCount}
						bulkCanAddMore={bulkCanAddMore}
						bulkMaxRows={bulkMaxRows}
						// Search and filter props
						animalSearchTerm={animalSearchTerm}
						onAnimalSearch={handleAnimalSearch}
						animalFilters={animalFilters}
						onAnimalFiltersChange={handleAnimalFiltersChange}
						excludeStatusesFromAnimalFilter={["deceased", "euthanized"]}
						// Pagination props
						animalCurrentPage={animalPage}
						animalTotalPages={totalAnimalPages}
						animalTotalItems={finalAnimalCount}
						animalItemsPerPage={animalPageSize}
						onAnimalPageChange={handleAnimalPageChange}
					/>
				</div>

				{/* Added animals already assigned: choice modal (create group) — list each animal/foster, then assign-group or unassign-all */}
				{addChoiceModal && (
					<>
						<div
							className="fixed inset-0 z-40"
							style={{
								backgroundColor: "rgba(0, 0, 0, 0.65)",
								backdropFilter: "blur(4px)",
								WebkitBackdropFilter: "blur(4px)",
							}}
							onClick={() => setAddChoiceModal(null)}
							aria-hidden
						/>
						<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
							<div
								className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
								onClick={(e) => e.stopPropagation()}
							>
								<h3 className="text-lg font-semibold text-gray-900 mb-2">
									Animals already assigned
								</h3>
								<p className="text-sm text-gray-700 mb-2">
									{addChoiceModal.animals
										.map(
											(a) =>
												`${a.name || "Unnamed animal"} is assigned to ${a.fosterName}.`
										)
										.join(" ")}
								</p>
								<p className="text-sm text-gray-700 mb-4">
									All animals in a group must be assigned to the same foster.
								</p>
								<div className="flex flex-col gap-2">
									<Button
										variant="outline"
										onClick={() => setAddChoiceModal(null)}
									>
										Cancel
									</Button>
									{addChoiceDistinctFosters.map(({ fosterId, fosterName }) => (
										<Button
											key={fosterId}
											variant="primary"
											onClick={() =>
												handleAddChoiceAssignGroupToFoster(fosterId, fosterName)
											}
										>
											Assign group to {fosterName}
										</Button>
									))}
									<Button
										variant="outline"
										className="border-pink-500 text-pink-600 hover:bg-pink-50"
										onClick={handleAddChoiceUnassignAll}
									>
										Unassign all animals
									</Button>
								</div>
							</div>
						</div>
					</>
				)}

				{/* Add-choice: step 1 — unassign animals from their current fosters (then step 2 will show assignment dialog) */}
				{addChoicePendingAssign &&
					addChoicePendingAssign.unassignQueue.length > 0 && (
					<UnassignmentDialog
						isOpen={true}
						onClose={() => setAddChoicePendingAssign(null)}
						onConfirm={handleAddChoiceUnassignFirstConfirm}
						fosterName={addChoicePendingAssign.unassignQueue[0].fosterName}
						animalOrGroupName={
							addChoicePendingAssign.unassignQueue[0].animals.length === 1
								? (addChoicePendingAssign.unassignQueue[0].animals[0].name || "1 animal")
								: `${addChoicePendingAssign.unassignQueue[0].animals.length} animals`
						}
						isGroup={false}
						animalCount={addChoicePendingAssign.unassignQueue[0].animals.length}
						animalNames={addChoicePendingAssign.unassignQueue[0].animals.map(
							(a) => a.name || "Unnamed animal"
						)}
						hideStatusVisibility={true}
						fixedVisibility={
							(stagedFosterVisibilityForAll as FosterVisibility) || "available_now"
						}
					/>
				)}
				{/* Add-choice: step 2 — assignment dialog (create group then assign to foster); only when no animals left to unassign */}
				{addChoicePendingAssign &&
					addChoicePendingAssign.unassignQueue.length === 0 && (
					<AssignmentConfirmationDialog
						isOpen={true}
						onClose={() => setAddChoicePendingAssign(null)}
						onConfirm={handleAddChoiceAssignmentConfirm}
						fosterName={addChoicePendingAssign.fosterName}
						animalOrGroupName={`Group of ${selectedAnimalIds.length + bulkAddRows.length}`}
						isGroup={true}
						animalCount={selectedAnimalIds.length + bulkAddRows.length}
						groupAnimalNames={[
							...selectedAnimals.map((a) => a.name || "Unnamed animal"),
							...bulkAddRows.map(
								(row) => row.name?.trim() || "Unnamed animal"
							),
						]}
						hideStatusVisibility={true}
						defaultStatus={(stagedStatusForAll as AnimalStatus) || "in_foster"}
						defaultVisibility={
							(stagedFosterVisibilityForAll as FosterVisibility) || "not_visible"
						}
					/>
				)}

				{/* Add-choice: unassign-all dialog; visibility fixed to group form.
				    Reuse the same per-foster flow/phrasing as the assign-to-[foster] path. */}
				{addChoicePendingUnassignAll &&
					addChoicePendingUnassignAll.unassignQueue.length > 0 && (
					<UnassignmentDialog
						isOpen={true}
						onClose={() => setAddChoicePendingUnassignAll(null)}
						onConfirm={handleAddChoiceUnassignAllConfirm}
						fosterName={
							addChoicePendingUnassignAll.unassignQueue[0].fosterName
						}
						animalOrGroupName={
							addChoicePendingUnassignAll.unassignQueue[0].animals.length === 1
								? addChoicePendingUnassignAll.unassignQueue[0].animals[0]
										.name || "1 animal"
								: `${addChoicePendingUnassignAll.unassignQueue[0].animals.length} animals`
						}
						isGroup={false}
						animalCount={
							addChoicePendingUnassignAll.unassignQueue[0].animals.length
						}
						animalNames={addChoicePendingUnassignAll.unassignQueue[0].animals.map(
							(a) => a.name || "Unnamed animal"
						)}
						hideStatusVisibility={true}
						fixedVisibility={
							(stagedFosterVisibilityForAll as FosterVisibility) || "available_now"
						}
					/>
				)}

				{/* Duplicate Group Assignment Modal */}
				<ConfirmModal
					isOpen={duplicateModal.isOpen}
					title="Animal Already in Group"
					message={
						<>
							<p className="mb-2">
								{duplicateModal.animalName} is already in group:{" "}
								<Link
									to={`/groups/${duplicateModal.existingGroupId}`}
									className="text-pink-600 hover:text-pink-700 underline"
									onClick={() => handleCancelMove()}
								>
									{duplicateModal.existingGroupName}
								</Link>
								.
							</p>
							<p>Move them to this group?</p>
						</>
					}
					confirmLabel="Move to new"
					cancelLabel="Cancel"
					onConfirm={handleMoveToNew}
					onCancel={handleCancelMove}
					variant="default"
				/>

				{/* Empty Group Confirmation Modal */}
				<ConfirmModal
					isOpen={showEmptyGroupConfirm}
					title="Empty Group"
					message="This group has no animals. Are you sure you want to save an empty group?"
					confirmLabel="Save Empty Group"
					cancelLabel="Cancel"
					onConfirm={handleConfirmEmptyGroup}
					onCancel={handleCancelEmptyGroup}
					variant="default"
				/>
			</div>
		</div>
	);
}
