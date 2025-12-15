import { useState } from "react";
import type { FormEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useProtectedAuth } from "../../hooks/useProtectedAuth";
import { useGroupForm } from "../../hooks/useGroupForm";
import NavLinkButton from "../../components/ui/NavLinkButton";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import ErrorMessage from "../../components/ui/ErrorMessage";
import GroupForm from "../../components/animals/GroupForm";
import { getErrorMessage, checkOfflineAndThrow } from "../../lib/errorUtils";
import { fetchGroupById, updateGroup } from "../../lib/groupQueries";

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

	// Use the form hook with existing group data (must be before early return)
	const {
		formState,
		setName,
		setDescription,
		setPriority,
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

			// Prepare data for update
			const groupData: Record<string, unknown> = {
				name: formState.name.trim() || null,
				description: formState.description.trim() || null,
				priority: formState.priority,
			};

			await updateGroup(id, profile.organization_id, groupData);

			// Invalidate queries to refresh data
			queryClient.invalidateQueries({
				queryKey: ["groups", user.id, profile.organization_id],
			});
			queryClient.invalidateQueries({
				queryKey: ["groups", user.id, profile.organization_id, id],
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
