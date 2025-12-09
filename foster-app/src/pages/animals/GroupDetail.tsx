import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../hooks/useAuth";
import { useUserProfile } from "../../hooks/useUserProfile";
import type { AnimalGroup, Animal } from "../../types";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import NavLinkButton from "../../components/ui/NavLinkButton";
import { fetchGroupById } from "../../lib/groupQueries";
import { fetchAnimalsByIds } from "../../lib/animalQueries";
import { isOffline } from "../../lib/errorUtils";

export default function GroupDetail() {
	const { id } = useParams<{ id: string }>();
	const { user } = useAuth();
	const { profile } = useUserProfile();

	const {
		data: group,
		isLoading: isLoadingGroup,
		isError: isErrorGroup,
		error: groupError,
	} = useQuery<AnimalGroup, Error>({
		queryKey: ["groups", user?.id, profile?.organization_id, id],
		queryFn: async () => {
			if (!id) {
				throw new Error("Group ID is required");
			}

			if (!profile?.organization_id) {
				throw new Error("Organization ID not available");
			}

			return fetchGroupById(id, profile.organization_id);
		},
		enabled: !!id && !!user && !!profile?.organization_id,
	});

	const {
		data: animals = [],
		isLoading: isLoadingAnimals,
		isError: isErrorAnimals,
	} = useQuery<Animal[], Error>({
		queryKey: [
			"group-animals",
			user?.id,
			profile?.organization_id,
			group?.animal_ids,
		],
		queryFn: async () => {
			if (!group?.animal_ids || group.animal_ids.length === 0) {
				return [];
			}

			if (!profile?.organization_id) {
				throw new Error("Organization ID not available");
			}

			return fetchAnimalsByIds(
				group.animal_ids,
				profile.organization_id,
				{
					fields: ["id", "name", "priority"],
				}
			);
		},
		enabled:
			!!group &&
			!!user &&
			!!profile?.organization_id &&
			!!group.animal_ids,
	});

	const isLoading = isLoadingGroup || isLoadingAnimals;
	const isError = isErrorGroup || isErrorAnimals;
	const error = groupError;

	if (isLoading) {
		return (
			<div className="min-h-screen p-4 bg-gray-50">
				<div className="max-w-4xl mx-auto">
					<div className="bg-white rounded-lg shadow-sm p-6">
						<LoadingSpinner message="Loading group details..." />
					</div>
				</div>
			</div>
		);
	}

	if (isError) {
		return (
			<div className="min-h-screen p-4 bg-gray-50">
				<div className="max-w-4xl mx-auto">
					<div className="bg-white rounded-lg shadow-sm p-6 border border-red-200">
						<div className="text-red-700">
							<p className="font-medium mb-4">
								{error instanceof Error
									? error.message
									: "Unable to load group details. Please try again."}
							</p>
							<NavLinkButton
								to="/groups"
								label="Back to Groups"
							/>
						</div>
					</div>
				</div>
			</div>
		);
	}

	if (!group) {
		return (
			<div className="min-h-screen p-4 bg-gray-50">
				<div className="max-w-4xl mx-auto">
					<div className="bg-white rounded-lg shadow-sm p-6">
						{isOffline() ? (
							<div className="text-red-700">
								<p className="font-medium mb-4">
									Unable to load group details.
								</p>
								<p className="text-sm mb-4">
									Unable to connect to the server. Please
									check your internet connection and try
									again.
								</p>
								<NavLinkButton
									to="/groups"
									label="Back to Groups"
								/>
							</div>
						) : (
							<>
								<p className="text-gray-600 mb-4">
									Group not found.
								</p>
								<NavLinkButton
									to="/groups"
									label="Back to Groups"
								/>
							</>
						)}
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen p-4 bg-gray-50">
			<div className="max-w-4xl mx-auto">
				<div className="mb-6">
					<NavLinkButton to="/groups" label="Back to Groups" />
				</div>

				<div className="bg-white rounded-lg shadow-sm p-6">
					<div className="mb-6">
						<h1 className="text-2xl font-bold text-gray-900 mb-2">
							{group.name?.trim() || "Unnamed Group"}
						</h1>
					</div>

					<div className="space-y-4 mb-6">
						{group.description && (
							<div>
								<label className="block text-sm font-medium text-gray-500 mb-1">
									Description
								</label>
								<p className="text-lg text-gray-900">
									{group.description}
								</p>
							</div>
						)}

						{group.priority && (
							<div>
								<label className="block text-sm font-medium text-gray-500 mb-1">
									Priority
								</label>
								<span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-pink-100 text-pink-800">
									High Priority
								</span>
							</div>
						)}
					</div>

					{isLoadingAnimals && (
						<div className="mt-4">
							<LoadingSpinner message="Loading group members..." />
						</div>
					)}

					{isErrorAnimals && (
						<div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
							<p className="text-sm text-red-700">
								Failed to load group members. Please try
								refreshing the page.
							</p>
						</div>
					)}

					{!isLoadingAnimals &&
						!isErrorAnimals &&
						animals.length > 0 && (
							<div className="mt-6">
								<h2 className="text-lg font-semibold text-gray-900 mb-4">
									Animals in Group
								</h2>
								<div className="space-y-2">
									{animals.map((animal) => (
										<Link
											key={animal.id}
											to={`/animals/${animal.id}`}
											className="block p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
										>
											<div className="flex items-center justify-between">
												<span className="font-medium text-gray-900">
													{animal.name?.trim() ||
														"Unnamed Animal"}
												</span>
												{animal.priority && (
													<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
														High Priority
													</span>
												)}
											</div>
										</Link>
									))}
								</div>
							</div>
						)}

					{!isLoadingAnimals &&
						!isErrorAnimals &&
						animals.length === 0 &&
						(group.animal_ids?.length || 0) === 0 && (
							<div className="mt-6">
								<p className="text-gray-600">
									No animals in this group yet.
								</p>
							</div>
						)}
				</div>
			</div>
		</div>
	);
}
