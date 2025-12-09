import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../hooks/useAuth";
import { useUserProfile } from "../../hooks/useUserProfile";
import type { AnimalGroup } from "../../types";
import Button from "../../components/ui/Button";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { fetchGroups } from "../../lib/groupQueries";
import { fetchAnimals } from "../../lib/animalQueries";
import { isOffline } from "../../lib/errorUtils";

type GroupWithAnimalNames = Pick<
	AnimalGroup,
	"id" | "name" | "description" | "animal_ids" | "priority"
> & {
	animalNames: string[];
};

export default function GroupsList() {
	const { user } = useAuth();
	const { profile, isCoordinator } = useUserProfile();

	const {
		data: groupsData = [],
		isLoading: isLoadingGroups,
		isError: isErrorGroups,
		error: groupsError,
		refetch,
	} = useQuery({
		queryKey: ["groups", user?.id, profile?.organization_id], // Include user ID and org ID in cache key
		queryFn: () => {
			if (!profile?.organization_id) {
				throw new Error("Organization ID not available");
			}
			return fetchGroups(profile.organization_id, {
				fields: ["id", "name", "description", "animal_ids", "priority"],
				orderBy: "created_at",
				orderDirection: "desc",
				checkOffline: true,
			});
		},
		enabled: !!user && !!profile?.organization_id, // Only fetch if user is logged in and has org ID
	});

	const { data: animalsData = [], isLoading: isLoadingAnimals } = useQuery({
		queryKey: ["animals", user?.id, profile?.organization_id],
		queryFn: () => {
			if (!profile?.organization_id) {
				throw new Error("Organization ID not available");
			}
			return fetchAnimals(profile.organization_id, {
				fields: ["id", "name"],
			});
		},
		enabled: !!user && !!profile?.organization_id,
	});

	// Create a map of animal IDs to names for quick lookup
	const animalMap = useMemo(() => {
		const map = new Map<string, string>();
		animalsData.forEach((animal) => {
			map.set(animal.id, animal.name?.trim() || "Unnamed Animal");
		});
		return map;
	}, [animalsData]);

	// Get animal names for each group
	const groupsWithAnimalNames = useMemo(() => {
		return groupsData.map((group): GroupWithAnimalNames => {
			const animalNames =
				group.animal_ids
					?.map((id) => animalMap.get(id))
					.filter((name): name is string => name !== undefined) || [];
			return {
				...group,
				animalNames,
			};
		});
	}, [groupsData, animalMap]);

	const isLoading = isLoadingGroups || isLoadingAnimals;
	const isError = isErrorGroups;
	const error = groupsError;
	const groups = groupsWithAnimalNames;

	return (
		<div className="min-h-screen p-4 bg-gray-50">
			<div className="max-w-5xl mx-auto">
				<div className="mb-6">
					<div className="flex items-center justify-between mb-4">
						<div>
							<h1 className="text-2xl font-bold text-gray-900">
								Groups
							</h1>
							<p className="text-gray-600">
								Browse all animal groups currently tracked in
								the system.
							</p>
						</div>
						<button
							type="button"
							onClick={() => refetch()}
							className="text-sm text-pink-600 hover:text-pink-700 font-medium"
							disabled={isLoading}
						>
							Refresh
						</button>
					</div>
					<div className="space-y-4">
						<Link to="/dashboard" className="block">
							<Button variant="outline">Back to Dashboard</Button>
						</Link>
						{isCoordinator && (
							<Link to="/groups/new" className="block">
								<Button>Create New Group</Button>
							</Link>
						)}
					</div>
				</div>

				{isLoading && (
					<div className="bg-white rounded-lg shadow-sm p-6">
						<LoadingSpinner message="Loading groups..." />
					</div>
				)}

				{isError && (
					<div className="bg-white rounded-lg shadow-sm p-6 border border-red-200">
						<div className="text-red-700">
							<p className="font-medium mb-2">
								Unable to load groups right now.
							</p>
							<p className="text-sm mb-4">
								{error instanceof Error
									? error.message
									: "Unknown error"}
							</p>
							<button
								type="button"
								onClick={() => refetch()}
								className="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 text-sm font-medium transition-colors"
							>
								Try Again
							</button>
						</div>
					</div>
				)}

				{!isLoading && !isError && groups.length === 0 && (
					<div className="bg-white rounded-lg shadow-sm p-6">
						{isOffline() ? (
							<div className="text-red-700">
								<p className="font-medium mb-2">
									Unable to load groups right now.
								</p>
								<p className="text-sm mb-4">
									Unable to connect to the server. Please
									check your internet connection and try
									again.
								</p>
								<button
									type="button"
									onClick={() => refetch()}
									className="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 text-sm font-medium transition-colors"
								>
									Try Again
								</button>
							</div>
						) : (
							<div className="text-gray-600">
								No groups found yet. Once you add groups, they
								will appear here.
							</div>
						)}
					</div>
				)}

				{groups.length > 0 && (
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						{groups.map((group) => {
							return (
								<Link
									key={group.id}
									to={`/groups/${group.id}`}
									className="bg-white rounded-lg shadow-sm p-5 border border-pink-100 hover:shadow-md transition-shadow cursor-pointer block"
								>
									<h2 className="text-lg font-semibold text-gray-900 mb-3">
										{group.name?.trim() || "Unnamed Group"}
									</h2>

									<div className="space-y-2 text-sm">
										{group.description && (
											<p className="text-gray-600 line-clamp-2">
												{group.description}
											</p>
										)}
										{group.animalNames &&
										group.animalNames.length > 0 ? (
											<p>
												<span className="font-medium">
													{group.animalNames.join(
														", "
													)}
												</span>
											</p>
										) : (
											<p className="text-gray-500 italic">
												No animals in group
											</p>
										)}
										{group.priority && (
											<p>
												<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
													High Priority
												</span>
											</p>
										)}
									</div>
								</Link>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}
