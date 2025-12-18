import { useNavigate } from "react-router-dom";
import { HomeIcon, ChatBubbleLeftIcon } from "@heroicons/react/24/outline";
import { useProtectedAuth } from "../hooks/useProtectedAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
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
		// If no conversation found, return null
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

export default function NavigationBar() {
	const navigate = useNavigate();
	const { user, profile, isFoster, isCoordinator } = useProtectedAuth();

	// Fetch conversation ID only for fosters
	const { data: conversationId } = useQuery<string | null>({
		queryKey: ["fosterConversation", user.id, profile.organization_id],
		queryFn: async () => {
			return fetchFosterConversation(user.id, profile.organization_id);
		},
		enabled: isFoster,
	});

	const handleChatClick = () => {
		if (isCoordinator) {
			// Coordinators navigate to chat list
			navigate("/chats");
		} else if (isFoster) {
			// Fosters navigate to their household chat
			if (conversationId) {
				navigate(`/chat/${conversationId}`);
			} else {
				// Fallback to chats list if conversation not found
				navigate("/chats");
			}
		}
	};

	return (
		<nav className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50">
			<div className="max-w-7xl mx-auto px-4">
				<div className="flex items-center justify-between h-16">
					<button
						onClick={() => navigate("/dashboard")}
						className="flex items-center justify-center p-3 rounded-lg hover:bg-gray-100 transition-colors"
						aria-label="Home"
					>
						<HomeIcon className="h-6 w-6 text-gray-700" />
					</button>

					<button
						onClick={handleChatClick}
						className="flex items-center justify-center p-3 rounded-lg hover:bg-gray-100 transition-colors"
						aria-label="Chat"
					>
						<ChatBubbleLeftIcon className="h-6 w-6 text-gray-700" />
					</button>
				</div>
			</div>
		</nav>
	);
}
