import { useState, useMemo } from "react";
import type { FormEvent } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { useProtectedAuth } from "../../hooks/useProtectedAuth";
import { useGroupForm } from "../../hooks/useGroupForm";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import ErrorMessage from "../../components/ui/ErrorMessage";
import GroupForm from "../../components/animals/GroupForm";
import Button from "../../components/ui/Button";
import ConfirmModal from "../../components/ui/ConfirmModal";
import { getErrorMessage, checkOfflineAndThrow } from "../../lib/errorUtils";
import {
	fetchGroupById,
	updateGroup,
	deleteGroup,
} from "../../lib/groupQueries";
import {
	syncUnassignAnimalsRemovedFromGroup,
	unassignAnimalsWithOneMessage,
	unassignGroup,
	assignGroupToFoster,
} from "../../lib/assignmentUtils";
import UnassignmentDialog from "../../components/animals/UnassignmentDialog";
import AssignmentConfirmationDialog from "../../components/animals/AssignmentConfirmationDialog";
import { fetchFosterById } from "../../lib/fosterQueries";
import { fetchAnimals, fetchAnimalsCount, fetchAnimalsByIds } from "../../lib/animalQueries";
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
import { needsAllAnimalsForGroupForm } from "../../lib/filterUtils";
import type {
	Animal,
	TimestampedPhoto,
	AnimalStatus,
	FosterVisibility,
} from "../../types";
import { uploadGroupPhoto, deleteGroupPhoto } from "../../lib/photoUtils";
import type { AnimalFilters } from "../../components/animals/AnimalFilters";
import { PAGE_SIZES } from "../../lib/paginationConfig";

export default function EditGroup() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { user, profile, isCoordinator } = useProtectedAuth();

	// Fetch group data (must be before early return)
	const {
		data: group,
		isLoading: isLoadingGroup,
		isError: isErrorGroup,
		error: groupError,
	} = useQuery({
		queryKey: ["groups", user.id, profile.organization_id, id],
		queryFn: async () => {
			if (!id) {
				throw new Error("Group ID is required");
			}
			return fetchGroupById(id, profile.organization_id);
		},
		enabled: !!id && isCoordinator,
	});

	// Search and filter state for animal selection
	const [animalSearchTerm, setAnimalSearchTerm] = useState("");
	const [animalFilters, setAnimalFilters] = useState<AnimalFilters>({});

	// Pagination state for animal selection
	const [animalPage, setAnimalPage] = useState(1);
	const animalPageSize = PAGE_SIZES.GROUP_ANIMAL_SELECTION;

	const needsAllAnimals = needsAllAnimalsForGroupForm(
		animalSearchTerm,
		animalFilters
	);

	const animalOffset = needsAllAnimals
		? 0
		: (animalPage - 1) * animalPageSize;
	const animalLimit = needsAllAnimals ? undefined : animalPageSize;

	// Fetch all animals for selection with pagination, filters, and search
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
					"current_foster_id",
				],
				orderBy: "created_at",
				orderDirection: "desc",
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
		enabled: !!group && isCoordinator,
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
		enabled: !!group && isCoordinator && !needsAllAnimals,
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

	const [visibilityExplicitlyCleared, setVisibilityExplicitlyCleared] =
		useState(false);

	// Use the form hook with existing group data (must be before early return)
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
	} = useGroupForm({
		initialGroup: group || null,
		visibilityExplicitlyCleared,
	});

	const {
		rows: bulkAddRows,
		addRow: bulkAddRow,
		removeRow: bulkRemoveRow,
		updateRow: bulkUpdateRow,
		setRowCount: bulkSetRowCount,
		canAddMore: bulkCanAddMore,
		maxRows: bulkMaxRows,
	} = useBulkAddRows();

	// Get selected animals for conflict detection (after animals are fetched)
	const selectedAnimals = useMemo(() => {
		return animals.filter((animal) =>
			selectedAnimalIds.includes(animal.id)
		);
	}, [animals, selectedAnimalIds]);

	// Single source of truth for status/visibility messages and conflict state (DRY with NewGroup)
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
		excludeGroupId: id,
	});

	const [loading, setLoading] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);
	const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
	const [photosToDelete, setPhotosToDelete] = useState<string[]>([]);
	const [photoUploadError, setPhotoUploadError] = useState<string | null>(
		null
	);

	// Delete group confirmation modal state
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [deleteError, setDeleteError] = useState<string | null>(null);
	const [unassignBeforeDelete, setUnassignBeforeDelete] = useState(true);

	// When true, user confirmed delete with "unassign" on – show UnassignmentDialog then delete
	const [showUnassignmentForDelete, setShowUnassignmentForDelete] =
		useState(false);

	// Remove-from-group unassignment flow: choice modal and then optional UnassignmentDialog
	const [removeFromGroupChoice, setRemoveFromGroupChoice] = useState<{
		removedIds: string[];
		removedNames: string[];
	} | null>(null);
	const [unassignmentDialogForRemoved, setUnassignmentDialogForRemoved] =
		useState(false);
	const [unassignmentErrorForRemoved, setUnassignmentErrorForRemoved] =
		useState<string | null>(null);

	// Added animals already assigned: choice modal — list all animals and fosters; options: assign group to [each foster] or unassign all
	type AddChoiceAnimal = {
		id: string;
		name: string | null;
		fosterId: string;
		fosterName: string;
	};
	type AddChoiceModal = {
		animals: AddChoiceAnimal[];
		groupFosterId: string | null;
		groupFosterName: string | null;
	};
	const [addChoiceModal, setAddChoiceModal] = useState<AddChoiceModal | null>(null);
	// When user picks "Assign group to [foster]" we store which foster and which animals to unassign first
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
	// When user picks "Unassign all animals" we show one UnassignmentDialog per foster (same pattern as NewGroup / assign-to-foster flow).
	const [addChoicePendingUnassignAll, setAddChoicePendingUnassignAll] = useState<{
		unassignQueue: {
			fosterId: string;
			fosterName: string;
			animals: AddChoiceAnimal[];
		}[];
	} | null>(null);

	// Foster name for unassignment dialog when removing animals from group
	const { data: fosterNameForRemoved } = useQuery<string | null, Error>({
		queryKey: [
			"foster",
			group?.current_foster_id,
			profile.organization_id,
		],
		queryFn: async () => {
			if (!group?.current_foster_id) return null;
			const foster = await fetchFosterById(
				group.current_foster_id,
				profile.organization_id
			);
			return foster.full_name || foster.email || "Foster";
		},
		enabled:
			(!!removeFromGroupChoice ||
				unassignmentDialogForRemoved === true ||
				showUnassignmentForDelete === true) &&
			!!group?.current_foster_id,
	});

	// Handle photo removal - track photos to delete
	const handleRemovePhoto = (photoUrl: string) => {
		setPhotosToDelete((prev) => [...prev, photoUrl]);
	};

	// Handle delete group
	const handleDelete = async () => {
		if (!id || !group) {
			setDeleteError("Group ID is required");
			return;
		}

		// First click: show confirm (default unassign toggle on)
		if (!showDeleteConfirm) {
			setShowDeleteConfirm(true);
			setUnassignBeforeDelete(true);
			return;
		}

		// If unassign toggle is on and group has animals, show full unassignment dialog instead of deleting immediately
		const hasAnimals = (group.animal_ids?.length ?? 0) > 0;
		if (unassignBeforeDelete && group.current_foster_id && hasAnimals) {
			setShowDeleteConfirm(false);
			setShowUnassignmentForDelete(true);
			return;
		}

		setDeleting(true);
		setDeleteError(null);

		try {
			checkOfflineAndThrow();
			await deleteGroup(id, profile.organization_id, group.group_photos);

			queryClient.removeQueries({
				queryKey: ["groups", user.id, profile.organization_id, id],
			});
			queryClient.invalidateQueries({
				queryKey: ["groups", user.id, profile.organization_id],
			});
			queryClient.invalidateQueries({
				queryKey: ["animals", user.id, profile.organization_id],
			});
			navigate("/groups", { replace: true });
		} catch (err) {
			console.error("Error deleting group:", err);
			setDeleteError(
				getErrorMessage(
					err,
					"Failed to delete group. Please try again."
				)
			);
			setDeleting(false);
			setShowDeleteConfirm(false);
		}
	};

	// After user confirms in UnassignmentDialog for delete: unassign then delete
	const handleUnassignForDeleteConfirm = async (
		newStatus: AnimalStatus,
		newVisibility: FosterVisibility,
		message: string,
		includeTag: boolean,
		notifyFoster: boolean
	) => {
		if (!id || !group) return;
		setDeleteError(null);
		try {
			checkOfflineAndThrow();
			await unassignGroup(
				id,
				profile.organization_id,
				newStatus,
				newVisibility,
				message,
				includeTag,
				notifyFoster
			);
			await deleteGroup(id, profile.organization_id, group.group_photos);

			queryClient.removeQueries({
				queryKey: ["groups", user.id, profile.organization_id, id],
			});
			queryClient.invalidateQueries({
				queryKey: ["groups", user.id, profile.organization_id],
			});
			queryClient.invalidateQueries({
				queryKey: ["animals", user.id, profile.organization_id],
			});
			if (group.current_foster_id) {
				queryClient.invalidateQueries({
					queryKey: ["foster", group.current_foster_id],
				});
			}
			queryClient.invalidateQueries({
				queryKey: ["fosters-needed-all-animals"],
			});
			queryClient.invalidateQueries({
				queryKey: ["fosters-needed-groups"],
			});
			queryClient.invalidateQueries({
				queryKey: ["org-pending-requests"],
			});
			queryClient.invalidateQueries({
				queryKey: ["foster-requests"],
			});

			setShowUnassignmentForDelete(false);
			navigate("/groups", { replace: true });
		} catch (err) {
			console.error("Error unassigning/deleting group:", err);
			setDeleteError(
				getErrorMessage(
					err,
					"Failed to unassign or delete group. Please try again."
				)
			);
		}
	};

	// Remove-from-group: "Just remove" – silent sync only
	const handleJustRemoveFromGroup = () => {
		setRemoveFromGroupChoice(null);
		performSubmit({ skipSyncUnassignForRemoved: true });
	};

	// Remove-from-group: open full unassignment dialog
	const handleUnassignAndNotifyRemoved = () => {
		setUnassignmentDialogForRemoved(true);
	};

	// Remove-from-group: confirm full unassign (after UnassignmentDialog) – one message for all
	const handleUnassignRemovedConfirm = async (
		newStatus: AnimalStatus,
		newVisibility: FosterVisibility,
		message: string,
		includeTag: boolean,
		notifyFoster: boolean
	) => {
		if (!id || !group || !group.current_foster_id || !removeFromGroupChoice) return;
		setUnassignmentErrorForRemoved(null);
		try {
			await performSubmit({
				skipSyncUnassignForRemoved: true,
				skipSuccessAndNavigate: true,
			});
			await unassignAnimalsWithOneMessage(
				removeFromGroupChoice.removedIds,
				group.current_foster_id,
				profile.organization_id,
				newStatus,
				newVisibility,
				message,
				includeTag,
				notifyFoster
			);
			queryClient.invalidateQueries({
				queryKey: ["foster", group.current_foster_id],
			});
			queryClient.invalidateQueries({
				queryKey: ["fosters-needed-all-animals"],
			});
			queryClient.invalidateQueries({
				queryKey: ["fosters-needed-groups"],
			});
			queryClient.invalidateQueries({
				queryKey: ["org-pending-requests"],
			});
			queryClient.invalidateQueries({
				queryKey: ["foster-requests"],
			});
			setRemoveFromGroupChoice(null);
			setUnassignmentDialogForRemoved(false);
			setSuccessMessage("Group updated and animals unassigned.");
			setTimeout(() => {
				navigate(`/groups/${id}`, { replace: true });
			}, 1500);
		} catch (err) {
			setUnassignmentErrorForRemoved(
				err instanceof Error
					? err.message
					: "Failed to unassign. Please try again."
			);
		}
	};

	// Distinct fosters for modal buttons (from animals + group foster if any)
	const addChoiceDistinctFosters = useMemo(() => {
		if (!addChoiceModal) return [];
		const byId = new Map<string, string>();
		for (const a of addChoiceModal.animals) {
			byId.set(a.fosterId, a.fosterName);
		}
		if (
			addChoiceModal.groupFosterId &&
			!byId.has(addChoiceModal.groupFosterId)
		) {
			byId.set(
				addChoiceModal.groupFosterId,
				addChoiceModal.groupFosterName || "Foster"
			);
		}
		return Array.from(byId.entries()).map(([fosterId, fosterName]) => ({
			fosterId,
			fosterName,
		}));
	}, [addChoiceModal]);

	// Add-choice: assign group to [foster] — unassign animals with other fosters, then performSubmit + assignGroupToFoster if needed
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

	// Add-choice: unassign all animals — build per-foster queue; show one UnassignmentDialog per foster (same as assign-to-foster flow).
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

	// Add-choice: first step — unassign animals from their current fosters (show UnassignmentDialog); on confirm run unassigns then show assignment dialog
	const handleAddChoiceUnassignFirstConfirm = async (
		newStatus: AnimalStatus,
		newVisibility: FosterVisibility,
		message: string,
		includeTag: boolean,
		notifyFoster: boolean
	) => {
		if (!addChoicePendingAssign || addChoicePendingAssign.unassignQueue.length === 0) return;
		setUnassignmentErrorForRemoved(null);
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
			setUnassignmentErrorForRemoved(
				err instanceof Error
					? err.message
					: "Failed to unassign. Please try again."
			);
		}
	};

	// Add-choice assignment confirm (second step): performSubmit then assignGroupToFoster if needed; unassigns already done in first step
	const handleAddChoiceAssignmentConfirm = async (
		message: string,
		includeTag: boolean,
		notifyFoster: boolean
	) => {
		if (!id || !group || !addChoicePendingAssign) return;
		setSubmitError(null);
		try {
			await performSubmit({});
			const needAssign =
				group.current_foster_id !== addChoicePendingAssign.fosterId;
			if (needAssign) {
				await assignGroupToFoster(
					id,
					addChoicePendingAssign.fosterId,
					profile.organization_id,
					message,
					includeTag,
					notifyFoster,
					(stagedStatusForAll as AnimalStatus) || "in_foster",
					(stagedFosterVisibilityForAll as FosterVisibility) || "not_visible"
				);
			}
			queryClient.invalidateQueries({
				queryKey: ["groups", user.id, profile.organization_id, id],
			});
			queryClient.invalidateQueries({
				queryKey: ["foster", addChoicePendingAssign.fosterId],
			});
			queryClient.invalidateQueries({
				queryKey: ["group-animals", user.id, profile.organization_id],
			});
			setAddChoicePendingAssign(null);
			setSuccessMessage("Group updated and assigned successfully.");
			setTimeout(() => navigate(`/groups/${id}`, { replace: true }), 1500);
		} catch (err) {
			setSubmitError(
				getErrorMessage(err, "Failed to assign group. Please try again.")
			);
		}
	};

	// Add-choice unassign-all confirm: unassign current foster's animals (one dialog per foster), then advance queue; when empty, performSubmit.
	const handleAddChoiceUnassignAllConfirm = async (
		newStatus: AnimalStatus,
		newVisibility: FosterVisibility,
		message: string,
		includeTag: boolean,
		notifyFoster: boolean
	) => {
		if (
			!id ||
			!group ||
			!addChoicePendingUnassignAll ||
			addChoicePendingUnassignAll.unassignQueue.length === 0
		)
			return;
		setUnassignmentErrorForRemoved(null);
		try {
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
			const wasLastFoster =
				addChoicePendingUnassignAll.unassignQueue.length === 1;
			setAddChoicePendingUnassignAll((prev) => {
				if (!prev) return null;
				const remaining = prev.unassignQueue.slice(1);
				if (remaining.length === 0) return null;
				return { ...prev, unassignQueue: remaining };
			});
			if (wasLastFoster) {
				await performSubmit({});
				queryClient.invalidateQueries({
					queryKey: ["groups", user.id, profile.organization_id, id],
				});
				queryClient.invalidateQueries({
					queryKey: ["group-animals", user.id, profile.organization_id],
				});
				setSuccessMessage("Group updated and animals unassigned.");
				setTimeout(() => navigate(`/groups/${id}`, { replace: true }), 1500);
			}
		} catch (err) {
			setUnassignmentErrorForRemoved(
				err instanceof Error
					? err.message
					: "Failed to unassign. Please try again."
			);
		}
	};

	// Redirect non-coordinators (after all hooks)
	if (!isCoordinator) {
		navigate("/groups", { replace: true });
		return null;
	}

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

		if (!id || !group) {
			setSubmitError("Group ID is required");
			return;
		}

		// If removing animals from an assigned group, offer unassign + notify
		const originalAnimalIds = group.animal_ids || [];
		const removedAnimalIds = originalAnimalIds.filter(
			(animalId) => !selectedAnimalIds.includes(animalId)
		);
		if (
			removedAnimalIds.length > 0 &&
			group.current_foster_id
		) {
			const removedAnimalsData = await fetchAnimalsByIds(
				removedAnimalIds,
				profile.organization_id,
				{ fields: ["id", "name"] }
			);
			setRemoveFromGroupChoice({
				removedIds: removedAnimalIds,
				removedNames: removedAnimalsData.map(
					(a) => a.name?.trim() || "Unnamed animal"
				),
			});
			return;
		}

		// If adding animals that are already assigned to a foster, offer choice; list all and show assign-group or unassign-all
		const addedAnimalIds = selectedAnimalIds.filter(
			(id) => !originalAnimalIds.includes(id)
		);
		if (addedAnimalIds.length > 0) {
			const addedAnimalsData = await fetchAnimalsByIds(
				addedAnimalIds,
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
				const groupFosterId = group.current_foster_id ?? null;
				let groupFosterName: string | null = null;
				if (groupFosterId) {
					const gf = await fetchFosterById(
						groupFosterId,
						profile.organization_id
					);
					groupFosterName = gf.full_name || gf.email || "Foster";
				}
				setAddChoiceModal({
					animals: withFoster.map((a) => ({
						id: a.id,
						name: a.name ?? null,
						fosterId: a.current_foster_id,
						fosterName: fosterIdToName.get(a.current_foster_id) ?? "Foster",
					})),
					groupFosterId,
					groupFosterName,
				});
				return;
			}
		}

		// Proceed with submission
		await performSubmit({});
	};

	// Perform the actual group update
	type PerformSubmitOptions = {
		skipSyncUnassignForRemoved?: boolean;
		skipSuccessAndNavigate?: boolean;
	};
	const performSubmit = async (options: PerformSubmitOptions = {}) => {
		if (!id || !group) {
			setSubmitError("Group ID is required");
			return;
		}

		setLoading(true);

		try {
			checkOfflineAndThrow();

			if (!group) {
				setSubmitError("Group not found");
				return;
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

			// Get the original animal_ids to compare
			const originalAnimalIds = group.animal_ids || [];
			const newAnimalIds = [
				...selectedAnimalIds,
				...bulkCreatedIds,
			];

			// Find animals that were added and removed
			const addedAnimalIds = newAnimalIds.filter(
				(id) => !originalAnimalIds.includes(id)
			);
			const removedAnimalIds = originalAnimalIds.filter(
				(id) => !newAnimalIds.includes(id)
			);

			// Auto-update default name if it matches the pattern "Group of X"
			let groupName = formState.name.trim() || null;
			const defaultNamePattern = /^Group of (\d+)$/;
			if (groupName) {
				const match = groupName.match(defaultNamePattern);
				if (match) {
					const currentCount = Number.parseInt(match[1], 10);
					const updatedCount = newAnimalIds.length;
					if (!Number.isNaN(currentCount) && currentCount !== updatedCount) {
						groupName = `Group of ${updatedCount}`;
					}
				}
			}

			// Prepare data for update
			const groupData: Record<string, unknown> = {
				name: groupName,
				description: formState.description.trim() || null,
				priority: formState.priority,
				animal_ids: newAnimalIds,
			};

			// Delete photos from storage first
			if (photosToDelete.length > 0) {
				const deletePromises = photosToDelete.map((photoUrl) =>
					deleteGroupPhoto(photoUrl, profile.organization_id).catch(
						(err) => {
							console.error("Error deleting photo:", err);
							// Continue even if some deletions fail
							return null;
						}
					)
				);
				await Promise.all(deletePromises);
			}

			// Handle photo updates (additions and deletions)
			const existingPhotos = group.group_photos || [];
			const remainingPhotos = existingPhotos.filter(
				(photo) => !photosToDelete.includes(photo.url)
			);
			const photoMetadata: TimestampedPhoto[] = [...remainingPhotos];

			if (selectedPhotos.length > 0) {
				setPhotoUploadError(null);

				try {
					// Upload all photos in parallel
					const uploadResults = await Promise.allSettled(
						selectedPhotos.map(async (file) => {
							try {
								const photoUrl = await uploadGroupPhoto(
									file,
									profile.organization_id,
									id
								);
								return {
									success: true,
									url: photoUrl,
									uploaded_at: new Date().toISOString(),
									uploaded_by: user.id,
								};
							} catch (err) {
								console.error("Error uploading photo:", err);
								return {
									success: false,
									error:
										err instanceof Error
											? err.message
											: "Unknown error",
								};
							}
						})
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

					// Add successful uploads to metadata
					if (successfulUploads.length > 0) {
						photoMetadata.push(...successfulUploads);
					}

					// Show error message if some uploads failed
					if (failedUploads > 0) {
						setPhotoUploadError(
							`Group updated successfully. ${failedUploads} photo${
								failedUploads !== 1 ? "s" : ""
							} failed to upload.`
						);
					}
				} catch (err) {
					console.error("Error uploading photos:", err);
					setPhotoUploadError(
						"Group updated successfully, but photo upload failed."
					);
				}
			}

			// Include photos in group update (always update to ensure consistency)
			groupData.group_photos = photoMetadata;

			await updateGroup(id, profile.organization_id, groupData);

			// Assignment sync: when group is assigned, newly added animals get assigned to the group's foster
			const groupCurrentFosterId = group.current_foster_id ?? null;

			// Form-intended status/visibility for newly added animals (same as bulk-create defaults)
			// so we don't overwrite with in_foster/not_visible when group has a foster
			const formDefaultsForAdded = getBulkCreateGroupDefaults(
				selectedAnimalIds.length === 0,
				stagedStatusForAll,
				stagedFosterVisibilityForAll,
				messageState
			);

			// Apply staged changes to animals: status and foster_visibility
			// When "set all visibility" is set, include all selected animals so they get that visibility
			const allAnimalIdsToUpdate = new Set<string>([
				...removedAnimalIds,
				...addedAnimalIds,
				...Array.from(stagedStatusChanges.keys()),
				...Array.from(stagedFosterVisibilityChanges.keys()),
				...(stagedFosterVisibilityForAll ? selectedAnimalIds : []),
			]);

			// Update animals with staged changes and group_id changes
			if (allAnimalIdsToUpdate.size > 0) {
				const updatePromises = Array.from(allAnimalIdsToUpdate).map(
					(animalId) => {
						const update: Record<string, unknown> = {};
						const isAdded = addedAnimalIds.includes(animalId);

						// Handle group_id changes
						if (removedAnimalIds.includes(animalId)) {
							update.group_id = null;
						} else if (isAdded) {
							update.group_id = id;
							// Assignment sync: assign to group's foster only; do not force status/visibility
							if (groupCurrentFosterId) {
								update.current_foster_id = groupCurrentFosterId;
							}
						}

						// Status: staged per-animal, or for newly added use form-intended value
						const stagedStatus = stagedStatusChanges.get(animalId);
						if (stagedStatus) {
							update.status = stagedStatus;
						} else if (isAdded) {
							update.status = formDefaultsForAdded.groupStatus;
						}

						// Visibility: staged per-animal or "set for all", or for newly added use form-intended value
						const stagedVisibility =
							stagedFosterVisibilityChanges.get(animalId) ??
							(stagedFosterVisibilityForAll || undefined);
						if (stagedVisibility) {
							update.foster_visibility = stagedVisibility;
						} else if (isAdded) {
							update.foster_visibility =
								formDefaultsForAdded.groupFosterVisibility;
						}

						// Only update if there are changes
						if (Object.keys(update).length > 0) {
							return supabase
								.from("animals")
								.update(update)
								.eq("id", animalId)
								.eq("organization_id", profile.organization_id);
						}
						return Promise.resolve({ error: null });
					}
				);

				const updateResults = await Promise.all(updatePromises);
				const updateError = updateResults.find(
					(result) => result.error
				)?.error;
				if (updateError) {
					console.error("Error updating animals:", updateError);
					// Don't fail the whole operation, but log the error
				}
			}

			// Assignment sync: clear assignment for animals removed from this group
			// (only when not doing full unassign + notify; caller runs unassignAnimal per animal)
			if (
				!options.skipSyncUnassignForRemoved &&
				removedAnimalIds.length > 0 &&
				groupCurrentFosterId
			) {
				await syncUnassignAnimalsRemovedFromGroup(
					removedAnimalIds,
					groupCurrentFosterId,
					profile.organization_id
				);
			}

			// Handle animals being moved from other groups (for added animals)
			if (addedAnimalIds.length > 0) {
				// Get current group_id for animals being added
				const { data: animalsToAdd, error: fetchError } = await supabase
					.from("animals")
					.select("id, group_id")
					.in("id", addedAnimalIds)
					.eq("organization_id", profile.organization_id);

				if (fetchError) {
					console.error("Error fetching animals to add:", fetchError);
				} else if (animalsToAdd) {
					// Find animals that are in other groups
					const animalsInOtherGroups = animalsToAdd.filter(
						(a) => a.group_id && a.group_id !== id
					);

					// Remove these animals from their old groups' animal_ids array
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

			// Invalidate queries to refresh data
			queryClient.invalidateQueries({
				queryKey: ["groups", user.id, profile.organization_id],
			});
			queryClient.invalidateQueries({
				queryKey: ["groups", user.id, profile.organization_id, id],
			});
			queryClient.invalidateQueries({
				queryKey: ["animals", user.id, profile.organization_id],
			});
			queryClient.invalidateQueries({
				queryKey: ["group-animals", user.id, profile.organization_id],
			});

			if (!options.skipSuccessAndNavigate) {
				const successMsg =
					addedAnimalIds.length > 0 && groupCurrentFosterId
						? "Group edited and animals assigned successfully!"
						: "Group updated successfully!";
				setSuccessMessage(successMsg);
				setTimeout(() => {
					navigate(`/groups/${id}`, { replace: true });
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

	if (isLoadingGroup) {
		return (
			<div className="min-h-screen p-4 bg-gray-50 flex items-center justify-center">
				<LoadingSpinner />
			</div>
		);
	}

	if (isErrorGroup || !group) {
		return (
			<div className="min-h-screen p-4 bg-gray-50">
				<div className="max-w-4xl mx-auto">
					<div className="mb-6"></div>
					<div className="bg-white rounded-lg shadow-sm p-6">
						<ErrorMessage>
							{groupError
								? getErrorMessage(
										groupError,
										"Failed to load group. Please try again."
								  )
								: "Group not found."}
						</ErrorMessage>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen p-4 bg-gray-50">
			<div className="max-w-4xl mx-auto">
				<div className="bg-white rounded-lg shadow-md p-6">
					<div className="flex items-center justify-between mb-6">
						<h1 className="text-2xl font-bold text-gray-900">
							Edit Group
						</h1>
						<div className="flex items-center gap-2">
							<Button
								type="button"
								variant="outline"
								onClick={() =>
									navigate(id ? `/groups/${id}` : "/groups")
								}
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
						existingPhotos={(group.group_photos || []).filter(
							(photo) => !photosToDelete.includes(photo.url)
						)}
						onRemovePhoto={handleRemovePhoto}
						photoError={photoUploadError}
						onSubmit={handleSubmit}
						loading={loading}
						submitError={submitError}
						successMessage={successMessage}
						submitButtonText="Update Group"
						// Bulk add props
						bulkAddRows={bulkAddRows}
						onBulkAddRow={bulkAddRow}
						onBulkRemoveRow={bulkRemoveRow}
						onBulkUpdateRow={bulkUpdateRow}
						onBulkSetRowCount={bulkSetRowCount}
						bulkCanAddMore={bulkCanAddMore}
						bulkMaxRows={bulkMaxRows}
						showDeleteButton={true}
						deleteError={deleteError}
						showDeleteConfirm={showDeleteConfirm}
						onDeleteClick={() => setShowDeleteConfirm(true)}
						onDeleteCancel={() => {
							setShowDeleteConfirm(false);
							setDeleteError(null);
							setUnassignBeforeDelete(false);
						}}
						onDeleteConfirm={handleDelete}
						deleting={deleting}
						groupHasFoster={!!group.current_foster_id}
						groupHasAnimals={(group.animal_ids?.length ?? 0) > 0}
						unassignBeforeDelete={unassignBeforeDelete}
						onUnassignBeforeDeleteChange={setUnassignBeforeDelete}
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

				{/* Added animals already assigned: choice modal — list each animal/foster, then assign-group or unassign-all */}
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
						fixedVisibility={(stagedFosterVisibilityForAll as FosterVisibility) || "available_now"}
					/>
				)}
				{/* Add-choice: step 2 — assignment dialog (assign group to foster); only when no animals left to unassign */}
				{addChoicePendingAssign &&
					addChoicePendingAssign.unassignQueue.length === 0 &&
					group && (
					<AssignmentConfirmationDialog
						isOpen={true}
						onClose={() => setAddChoicePendingAssign(null)}
						onConfirm={handleAddChoiceAssignmentConfirm}
						fosterName={addChoicePendingAssign.fosterName}
						animalOrGroupName={group.name || "Unnamed Group"}
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
						defaultVisibility={(stagedFosterVisibilityForAll as FosterVisibility) || "not_visible"}
					/>
				)}

				{/* Add-choice: unassign-all — one UnassignmentDialog per foster (same props/phrasing as assign-to-foster flow). */}
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
										.name || "Unnamed animal"
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
						fixedVisibility={(stagedFosterVisibilityForAll as FosterVisibility) || "available_now"}
					/>
				)}

				{/* Remove from group: choice modal (hide when UnassignmentDialog is open) */}
				{removeFromGroupChoice && !unassignmentDialogForRemoved && (
					<>
						<div
							className="fixed inset-0 z-40"
							style={{
								backgroundColor: "rgba(0, 0, 0, 0.65)",
								backdropFilter: "blur(4px)",
								WebkitBackdropFilter: "blur(4px)",
							}}
							onClick={() => setRemoveFromGroupChoice(null)}
							aria-hidden
						/>
						<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
							<div
								className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
								onClick={(e) => e.stopPropagation()}
							>
								<h3 className="text-lg font-semibold text-gray-900 mb-6">
									You are removing{" "}
									{removeFromGroupChoice.removedNames.length === 1
										? removeFromGroupChoice.removedNames[0]
										: removeFromGroupChoice.removedNames.length === 2
										? `${removeFromGroupChoice.removedNames[0]} and ${removeFromGroupChoice.removedNames[1]}`
										: (() => {
												const allButLast =
													removeFromGroupChoice.removedNames
														.slice(0, -1)
														.join(", ");
												const last =
													removeFromGroupChoice.removedNames[
														removeFromGroupChoice.removedNames.length - 1
													];
												return `${allButLast}, and ${last}`;
										  })()}
									.{" "}
									{`They are currently assigned to ${
										fosterNameForRemoved || "the group’s foster"
									}.`}
								</h3>
								<div className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
									<Button
										variant="outline"
										onClick={() =>
											setRemoveFromGroupChoice(null)
										}
									>
										Cancel
									</Button>
									<Button
										variant="outline"
										className="border-pink-500 text-pink-600 hover:bg-pink-50 focus:ring-pink-500"
										onClick={handleJustRemoveFromGroup}
									>
										Remove only
									</Button>
									<Button
										variant="primary"
										onClick={handleUnassignAndNotifyRemoved}
									>
										Remove and unassign
									</Button>
								</div>
							</div>
						</div>
					</>
				)}

				{/* Remove from group: full unassignment dialog (reuses UnassignmentDialog); status/visibility from group form */}
				{unassignmentDialogForRemoved && removeFromGroupChoice && (
					<UnassignmentDialog
						isOpen={true}
						onClose={() => {
							setUnassignmentDialogForRemoved(false);
							setRemoveFromGroupChoice(null);
							setUnassignmentErrorForRemoved(null);
						}}
						onConfirm={handleUnassignRemovedConfirm}
						fosterName={fosterNameForRemoved ?? "Foster"}
						animalOrGroupName={
							removeFromGroupChoice.removedIds.length === 1
								? removeFromGroupChoice.removedNames[0]
								: `${removeFromGroupChoice.removedIds.length} animals`
						}
						isGroup={false}
						animalCount={removeFromGroupChoice.removedIds.length}
						animalNames={removeFromGroupChoice.removedNames}
						// Allow coordinator to set status/visibility here, same as animal unassignment flow.
						// Defaults (in_shelter / available_now) come from UnassignmentDialog.
					/>
				)}

				{unassignmentErrorForRemoved && (
					<div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50">
						<p className="text-sm">{unassignmentErrorForRemoved}</p>
						<button
							type="button"
							onClick={() =>
								setUnassignmentErrorForRemoved(null)
							}
							className="absolute top-1 right-1 text-red-700 hover:text-red-900"
							aria-label="Dismiss"
						>
							×
						</button>
					</div>
				)}

				{/* Unassignment dialog for delete (when user confirmed delete with unassign toggle on); status/visibility from group form */}
				{showUnassignmentForDelete && group && (
					<UnassignmentDialog
						isOpen={true}
						onClose={() => {
							setShowUnassignmentForDelete(false);
							setDeleteError(null);
						}}
						onConfirm={handleUnassignForDeleteConfirm}
						fosterName={fosterNameForRemoved ?? "Foster"}
						animalOrGroupName={group.name || "Unnamed Group"}
						isGroup={true}
						animalCount={group.animal_ids?.length ?? 0}
						hideStatusVisibility={true}
						fixedVisibility={(stagedFosterVisibilityForAll as FosterVisibility) || "available_now"}
					/>
				)}

				{deleteError && (
					<div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50">
						<p className="text-sm">{deleteError}</p>
						<button
							type="button"
							onClick={() => setDeleteError(null)}
							className="absolute top-1 right-1 text-red-700 hover:text-red-900"
							aria-label="Dismiss"
						>
							×
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
