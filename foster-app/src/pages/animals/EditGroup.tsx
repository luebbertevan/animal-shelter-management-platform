import { useState } from "react";
import type { FormEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { useProtectedAuth } from "../../hooks/useProtectedAuth";
import { useGroupForm } from "../../hooks/useGroupForm";
import NavLinkButton from "../../components/ui/NavLinkButton";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import ErrorMessage from "../../components/ui/ErrorMessage";
import GroupForm from "../../components/animals/GroupForm";
import { getErrorMessage, checkOfflineAndThrow } from "../../lib/errorUtils";
import { fetchGroupById, updateGroup } from "../../lib/groupQueries";
import { fetchAnimals } from "../../lib/animalQueries";
import type { Animal } from "../../types";

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

	// Fetch all animals for selection
	const {
		data: animals = [],
		isLoading: isLoadingAnimals,
		isError: isErrorAnimals,
	} = useQuery<Animal[], Error>({
		queryKey: ["animals", user.id, profile.organization_id],
		queryFn: () => {
			return fetchAnimals(profile.organization_id, {
				fields: [
					"id",
					"name",
					"status",
					"sex_spay_neuter_status",
					"priority",
					"photos",
					"date_of_birth",
					"group_id",
				],
				orderBy: "created_at",
				orderDirection: "desc",
			});
		},
		enabled: !!group && isCoordinator,
	});

	// Use the form hook with existing group data (must be before early return)
	const {
		formState,
		setName,
		setDescription,
		setPriority,
		selectedAnimalIds,
		toggleAnimalSelection,
		validateForm,
		errors,
	} = useGroupForm({ initialGroup: group || null });

	const [loading, setLoading] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);

	// Redirect non-coordinators (after all hooks)
	if (!isCoordinator) {
		navigate("/groups", { replace: true });
		return null;
	}

	const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setSubmitError(null);

		if (!validateForm()) {
			return;
		}

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

			// Get the original animal_ids to compare
			const originalAnimalIds = group.animal_ids || [];
			const newAnimalIds = selectedAnimalIds;

			// Find animals that were added and removed
			const addedAnimalIds = newAnimalIds.filter(
				(id) => !originalAnimalIds.includes(id)
			);
			const removedAnimalIds = originalAnimalIds.filter(
				(id) => !newAnimalIds.includes(id)
			);

			// Prepare data for update
			const groupData: Record<string, unknown> = {
				name: formState.name.trim() || null,
				description: formState.description.trim() || null,
				priority: formState.priority,
				animal_ids: newAnimalIds,
			};

			await updateGroup(id, profile.organization_id, groupData);

			// Update animals' group_id field
			// Remove group_id from animals that were removed from the group
			if (removedAnimalIds.length > 0) {
				const { error: removeError } = await supabase
					.from("animals")
					.update({ group_id: null })
					.in("id", removedAnimalIds)
					.eq("organization_id", profile.organization_id);

				if (removeError) {
					console.error(
						"Error removing group_id from animals:",
						removeError
					);
					// Don't fail the whole operation, but log the error
				}
			}

			// Add group_id to animals that were added to the group
			// First, check if any of these animals are already in another group
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

					// Update group_id for all added animals
					const { error: updateError } = await supabase
						.from("animals")
						.update({ group_id: id })
						.in("id", addedAnimalIds)
						.eq("organization_id", profile.organization_id);

					if (updateError) {
						console.error(
							"Error updating animals with group_id:",
							updateError
						);
						// Don't fail the whole operation, but log the error
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

			setSuccessMessage("Group updated successfully!");

			setTimeout(() => {
				navigate(`/groups/${id}`, { replace: true });
			}, 1500);
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
					<div className="mb-6">
						<NavLinkButton to="/groups" label="Back to Groups" />
					</div>
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
				<div className="mb-6">
					<NavLinkButton
						to={id ? `/groups/${id}` : "/groups"}
						label="Back to Group"
					/>
				</div>
				<div className="bg-white rounded-lg shadow-md p-6">
					<h1 className="text-2xl font-bold text-gray-900 mb-6">
						Edit Group
					</h1>

					<GroupForm
						formState={formState}
						setName={setName}
						setDescription={setDescription}
						setPriority={setPriority}
						errors={errors}
						animals={animals}
						isLoadingAnimals={isLoadingAnimals}
						isErrorAnimals={isErrorAnimals}
						selectedAnimalIds={selectedAnimalIds}
						toggleAnimalSelection={toggleAnimalSelection}
						onSubmit={handleSubmit}
						loading={loading}
						submitError={submitError}
						successMessage={successMessage}
						submitButtonText="Update Group"
					/>
				</div>
			</div>
		</div>
	);
}
