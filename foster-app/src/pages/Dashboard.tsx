import { useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useProtectedAuth } from "../hooks/useProtectedAuth";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import AnimalCard from "../components/animals/AnimalCard";
import GroupCard from "../components/animals/GroupCard";
import { fetchAssignedAnimals, fetchAnimals } from "../lib/animalQueries";
import { fetchAssignedGroups } from "../lib/groupQueries";
import type { Animal, LifeStage, PhotoMetadata } from "../types";

export default function Dashboard() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { user, profile } = useProtectedAuth();

	// Fetch assigned animals for Currently Fostering section
	const { data: assignedAnimals = [], isLoading: isLoadingAnimals } =
		useQuery({
			queryKey: ["assignedAnimals", user.id, profile.organization_id],
			queryFn: async () => {
				const animals = await fetchAssignedAnimals(
					user.id,
					profile.organization_id,
					{
						fields: [
							"id",
							"name",
							"status",
							"sex_spay_neuter_status",
							"priority",
							"group_id",
							"photos",
							"date_of_birth",
						],
					}
				);

				// Fetch group names for animals that are in groups
				const groupIds = [
					...new Set(
						animals
							.map((a) => a.group_id)
							.filter((id): id is string => !!id)
					),
				];

				const groupsMap = new Map<string, string>();
				if (groupIds.length > 0) {
					try {
						const { data: groups, error: groupsError } =
							await supabase
								.from("animal_groups")
								.select("id, name")
								.in("id", groupIds);

						if (groupsError) {
							console.error(
								"Error fetching groups:",
								groupsError
							);
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

				// Map animals with their group names
				return animals.map((animal) => {
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

	// Fetch assigned groups for Currently Fostering section
	const { data: assignedGroups = [], isLoading: isLoadingGroups } = useQuery({
		queryKey: ["assignedGroups", user.id, profile.organization_id],
		queryFn: () => {
			return fetchAssignedGroups(user.id, profile.organization_id, {
				fields: [
					"id",
					"name",
					"description",
					"animal_ids",
					"priority",
					"group_photos",
				],
			});
		},
	});

	// Fetch all animals to get photos and life_stage for GroupCard
	const { data: allAnimalsData = [] } = useQuery({
		queryKey: ["allAnimals", user.id, profile.organization_id],
		queryFn: () => {
			return fetchAnimals(profile.organization_id, {
				fields: ["id", "photos", "life_stage"],
			});
		},
	});

	// Create a map of animal data (photos + life_stage) for GroupCard
	const animalDataMap = useMemo(() => {
		const map = new Map<
			string,
			{ photos?: PhotoMetadata[]; life_stage?: LifeStage }
		>();
		allAnimalsData.forEach((animal) => {
			map.set(animal.id, {
				photos: animal.photos,
				life_stage: animal.life_stage,
			});
		});
		return map;
	}, [allAnimalsData]);

	const isLoadingFostering = isLoadingAnimals || isLoadingGroups;

	// Group prioritization logic: Create a Set of assigned group IDs for quick lookup
	const assignedGroupIds = useMemo(() => {
		return new Set(assignedGroups.map((group) => group.id));
	}, [assignedGroups]);

	// Filter animals: only show animals that are NOT in an assigned group
	// If an animal is in a group that's assigned to this user, show the group instead
	const filteredAnimals = useMemo(() => {
		return assignedAnimals.filter((animal: Animal) => {
			// If animal has no group_id, always show it
			if (!animal.group_id) {
				return true;
			}
			// If animal has a group_id, only show it if that group is NOT assigned to this user
			// (If the group IS assigned, we'll show the group instead of the individual animal)
			return !assignedGroupIds.has(animal.group_id);
		});
	}, [assignedAnimals, assignedGroupIds]);

	// Check if there are any items to display (after filtering)
	const hasAssignedItems =
		filteredAnimals.length > 0 || assignedGroups.length > 0;

	// Only show section if loading (we don't know yet if there are items) or if there are items
	// After loading completes, if there are no items, the section will not appear
	const showFosteringSection = isLoadingFostering || hasAssignedItems;

	const handleLogout = async () => {
		const { error } = await supabase.auth.signOut();

		if (error) {
			console.error("Error signing out:", error);
		}

		// Clear React Query cache to prevent showing previous user's data
		queryClient.clear();

		// Always redirect - local session is cleared regardless of network errors
		navigate("/login", { replace: true });
	};

	return (
		<div className="min-h-screen p-4 bg-gray-50">
			<div className="max-w-4xl mx-auto">
				{profile.organization_name && (
					<h1 className="text-3xl font-semibold text-pink-600 mb-4">
						{profile.organization_name}
					</h1>
				)}

				{showFosteringSection && (
					<div className="mb-4">
						<h2 className="text-lg font-semibold text-gray-900 mb-4">
							Currently Fostering
						</h2>
						{isLoadingFostering ? (
							<LoadingSpinner message="Loading assigned animals and groups..." />
						) : (
							<div className="grid gap-1.5 grid-cols-1 min-[375px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
								{assignedGroups.map((group) => (
									<GroupCard
										key={group.id}
										group={group}
										animalData={animalDataMap}
									/>
								))}
								{filteredAnimals.map((animal) => (
									<AnimalCard
										key={animal.id}
										animal={animal}
									/>
								))}
							</div>
						)}
					</div>
				)}

				<div className="mt-8 pb-4 text-center">
					<p className="text-sm text-gray-600">
						Signed in as {user.email}{" "}
						<button
							onClick={handleLogout}
							className="text-pink-600 hover:text-pink-700 hover:underline font-medium"
						>
							Log out
						</button>
					</p>
				</div>
			</div>
		</div>
	);
}
