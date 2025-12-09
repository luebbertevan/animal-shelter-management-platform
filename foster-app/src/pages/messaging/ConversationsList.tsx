import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { useProtectedAuth } from "../../hooks/useProtectedAuth";
import type { Conversation } from "../../types";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import Button from "../../components/ui/Button";
import { getErrorMessage } from "../../lib/errorUtils";
import { extractFullName } from "../../lib/supabaseUtils";

interface ConversationWithFosterName extends Conversation {
	foster_name?: string;
}

async function fetchConversations(organizationId: string) {
	// Fetch all conversations for the organization
	const { data: conversations, error: conversationsError } = await supabase
		.from("conversations")
		.select(
			`
			id,
			organization_id,
			type,
			foster_profile_id,
			created_at,
			updated_at,
			profiles!conversations_foster_profile_id_fkey(full_name)
		`
		)
		.eq("organization_id", organizationId)
		.order("updated_at", { ascending: false });

	if (conversationsError) {
		throw new Error(
			getErrorMessage(
				conversationsError,
				"Failed to load conversations. Please try again."
			)
		);
	}

	// Transform conversations to include foster name
	const conversationsWithFosterName: ConversationWithFosterName[] = (
		conversations || []
	).map((conv) => ({
		id: conv.id,
		organization_id: conv.organization_id,
		type: conv.type,
		foster_profile_id: conv.foster_profile_id,
		created_at: conv.created_at,
		updated_at: conv.updated_at,
		foster_name: extractFullName(conv.profiles),
	}));

	// Sort conversations: coordinator_group first, then foster_chats
	const sortedConversations = conversationsWithFosterName.sort((a, b) => {
		if (a.type === "coordinator_group" && b.type !== "coordinator_group") {
			return -1;
		}
		if (a.type !== "coordinator_group" && b.type === "coordinator_group") {
			return 1;
		}
		// If both are same type, maintain the updated_at order
		return 0;
	});

	return sortedConversations;
}

export default function ConversationsList() {
	const navigate = useNavigate();
	const { profile } = useProtectedAuth();

	const {
		data: conversations,
		isLoading,
		isError,
		error,
	} = useQuery<ConversationWithFosterName[]>({
		queryKey: ["conversations", profile.organization_id],
		queryFn: async () => {
			return fetchConversations(profile.organization_id);
		},
	});

	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<LoadingSpinner />
			</div>
		);
	}

	if (isError) {
		return (
			<div className="min-h-screen flex flex-col items-center justify-center p-4 space-y-4">
				<p className="text-red-500 text-center">
					{error instanceof Error
						? error.message
						: "Failed to load conversations"}
				</p>
				<Button
					onClick={() => navigate("/dashboard")}
					variant="secondary"
					className="w-auto"
				>
					Go to Dashboard
				</Button>
			</div>
		);
	}

	if (!conversations || conversations.length === 0) {
		return (
			<div className="min-h-screen p-4 bg-gray-50">
				<div className="max-w-4xl mx-auto">
					<div className="bg-white rounded-lg shadow-md p-6">
						<div className="flex items-center gap-4 mb-4">
							<Button
								variant="outline"
								onClick={() => navigate("/dashboard")}
								className="w-auto"
							>
								← Back
							</Button>
							<h1 className="text-2xl font-bold text-gray-900">
								Chats
							</h1>
						</div>
						<div className="text-center py-12 text-gray-500">
							<p className="text-lg mb-2">No conversations yet</p>
							<p className="text-sm">
								Conversations will appear here when messages are
								sent.
							</p>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50">
			<div className="max-w-4xl mx-auto">
				<div className="bg-white shadow-sm">
					<div className="p-4 border-b border-gray-200 flex items-center gap-4">
						<Button
							variant="outline"
							onClick={() => navigate("/dashboard")}
							className="w-auto"
						>
							← Back
						</Button>
						<h1 className="text-2xl font-bold text-gray-900">
							Chats
						</h1>
					</div>
					<div className="p-4 space-y-3">
						{conversations.map((conversation) => {
							const displayName =
								conversation.type === "coordinator_group"
									? "Coordinator Chat"
									: conversation.foster_name || "Foster Chat";

							const isCoordinatorChat =
								conversation.type === "coordinator_group";

							return (
								<button
									key={conversation.id}
									onClick={() =>
										navigate(`/chat/${conversation.id}`)
									}
									className={`w-full p-4 text-left transition-colors border border-pink-300 rounded-lg ${
										isCoordinatorChat
											? "bg-pink-50 hover:bg-pink-100"
											: "bg-white hover:bg-gray-50"
									}`}
								>
									<h2 className="text-lg font-semibold text-gray-900">
										{displayName}
									</h2>
								</button>
							);
						})}
					</div>
				</div>
			</div>
		</div>
	);
}
