import { useNavigate, Link } from "react-router-dom";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { useUserProfile } from "../hooks/useUserProfile";
import Button from "../components/ui/Button";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import { getErrorMessage } from "../lib/errorUtils";

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
	const { user, loading: isLoadingAuth } = useAuth();
	const {
		profile,
		isLoading: isLoadingProfile,
		isFoster,
		isCoordinator,
	} = useUserProfile();

	// Fetch foster's conversation ID if user is a foster
	const { data: conversationId } = useQuery<string | null>({
		queryKey: ["fosterConversation", user?.id, profile?.organization_id],
		queryFn: async () => {
			if (!user?.id || !profile?.organization_id || !isFoster) {
				return null;
			}
			return fetchFosterConversation(user.id, profile.organization_id);
		},
		enabled: !!user?.id && !!profile?.organization_id && isFoster,
	});

	// Wait for both auth and profile to load before showing content
	// This prevents partial rendering and ensures everything appears at once
	if (isLoadingAuth || isLoadingProfile) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<LoadingSpinner />
			</div>
		);
	}

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
							{profile?.organization_name && (
								<p className="text-lg font-semibold text-pink-600 mb-2">
									{profile.organization_name}
								</p>
							)}
							<h1 className="text-2xl font-bold text-gray-900">
								Dashboard
							</h1>
							{user && (
								<p className="text-sm text-gray-600 mt-1">
									Signed in as {user.email}
								</p>
							)}
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
