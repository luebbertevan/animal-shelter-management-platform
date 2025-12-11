import { useNavigate, Link } from "react-router-dom";
import { useMemo } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useProtectedAuth } from "../hooks/useProtectedAuth";
import Button from "../components/ui/Button";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import AnimalCard from "../components/animals/AnimalCard";
import GroupCard from "../components/animals/GroupCard";
import { getErrorMessage } from "../lib/errorUtils";
import { fetchAssignedAnimals } from "../lib/animalQueries";
import { fetchAssignedGroups } from "../lib/groupQueries";
import type { Animal } from "../types";

async function fetchFosterConversation(userId: string, organizationId: string) {
	const { data, error } = await supabase
		.from("conversations")
		.select("id")
		.eq("type", "foster_chat")
		.eq("foster_profile_id", userId)
		.eq("organization_id", organizationId)
		.single();

	if (error) {
		// If no conversation found, for edge cases, return null
		if (error.code === "PGRST116") {
			return null;
		}
		throw new Error(
			getErrorMessage(
				error,
				"Failed to load conversation. Please try again."
			)
		);
	}

	return data?.id || null;
}

export default function Dashboard() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { user, profile, isFoster, isCoordinator } = useProtectedAuth();

	// Fetch foster's conversation ID if user is a foster
	const { data: conversationId } = useQuery<string | null>({
		queryKey: ["fosterConversation", user.id, profile.organization_id],
		queryFn: async () => {
			return fetchFosterConversation(user.id, profile.organization_id);
		},
		enabled: isFoster,
	});

	// Fetch assigned animals for Currently Fostering section
	const { data: assignedAnimals = [], isLoading: isLoadingAnimals } =
		useQuery({
			queryKey: ["assignedAnimals", user.id, profile.organization_id],
			queryFn: () => {
				return fetchAssignedAnimals(user.id, profile.organization_id);
			},
		});

	// Fetch assigned groups for Currently Fostering section
	const { data: assignedGroups = [], isLoading: isLoadingGroups } = useQuery({
		queryKey: ["assignedGroups", user.id, profile.organization_id],
		queryFn: () => {
			return fetchAssignedGroups(user.id, profile.organization_id);
		},
	});

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
				<div className="bg-white rounded-lg shadow-md p-6 mb-4">
					<div className="flex justify-between items-center mb-4">
						<div>
							{profile.organization_name && (
								<p className="text-lg font-semibold text-pink-600 mb-2">
									{profile.organization_name}
								</p>
							)}
							<h1 className="text-2xl font-bold text-gray-900">
								Dashboard
							</h1>
							<p className="text-sm text-gray-600 mt-1">
								Signed in as {user.email}
							</p>
						</div>
					</div>
				</div>

				<div className="bg-white rounded-lg shadow-md p-6 mb-4">
					<h2 className="text-lg font-semibold text-gray-900 mb-4">
						Quick Actions
					</h2>
					<div className="space-y-4">
						{isFoster && conversationId && (
							<Link
								to={`/chat/${conversationId}`}
								className="block"
							>
								<Button>Chat</Button>
							</Link>
						)}
						{isCoordinator && (
							<Link to="/chats" className="block">
								<Button>Chats</Button>
							</Link>
						)}
						<Link to="/animals" className="block">
							<Button>View Animals</Button>
						</Link>
						{isCoordinator && (
							<Link to="/animals/new" className="block">
								<Button>Create New Animal</Button>
							</Link>
						)}
						<Link to="/groups" className="block">
							<Button>View Groups</Button>
						</Link>
						{isCoordinator && (
							<Link to="/groups/new" className="block">
								<Button>Create New Group</Button>
							</Link>
						)}
						{isCoordinator && (
							<Link to="/fosters" className="block">
								<Button>View Fosters</Button>
							</Link>
						)}
					</div>
				</div>

				{showFosteringSection && (
					<div className="bg-white rounded-lg shadow-md p-6 mb-4">
						<h2 className="text-lg font-semibold text-gray-900 mb-4">
							Currently Fostering
						</h2>
						{isLoadingFostering ? (
							<LoadingSpinner message="Loading assigned animals and groups..." />
						) : (
							<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
								{assignedGroups.map((group) => (
									<GroupCard key={group.id} group={group} />
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

				<div className="bg-white rounded-lg shadow-md p-6">
					<h2 className="text-lg font-semibold text-gray-900 mb-4">
						Account
					</h2>
					<Button variant="outline" onClick={handleLogout}>
						Log out
					</Button>
				</div>
			</div>
		</div>
	);
}
