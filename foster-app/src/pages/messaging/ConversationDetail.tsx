import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { useUserProfile } from "../../hooks/useUserProfile";
import type { Conversation } from "../../types";
import MessageList from "../../components/messaging/MessageList";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import Button from "../../components/ui/Button";
import { getErrorMessage } from "../../lib/errorUtils";

async function fetchConversation(
	conversationId: string,
	organizationId: string
) {
	const { data, error } = await supabase
		.from("conversations")
		.select("*")
		.eq("id", conversationId)
		.eq("organization_id", organizationId)
		.single();

	if (error) {
		throw new Error(
			getErrorMessage(
				error,
				"Failed to load conversation. Please try again."
			)
		);
	}

	return data as Conversation;
}

export default function ConversationDetail() {
	const { conversationId } = useParams<{ conversationId: string }>();
	const navigate = useNavigate();
	const { profile } = useUserProfile();

	const {
		data: conversation,
		isLoading,
		isError,
		error,
	} = useQuery<Conversation, Error>({
		queryKey: ["conversation", conversationId, profile?.organization_id],
		queryFn: async () => {
			if (!conversationId) {
				throw new Error("Conversation ID is required");
			}
			if (!profile?.organization_id) {
				throw new Error("Organization ID not available");
			}
			return fetchConversation(conversationId, profile.organization_id);
		},
		enabled: !!conversationId && !!profile?.organization_id,
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
			<div className="min-h-screen flex items-center justify-center p-4">
				<div className="text-center">
					<p className="text-red-500 mb-4">
						{error instanceof Error
							? error.message
							: "Failed to load conversation"}
					</p>
					<Button onClick={() => navigate(-1)}>Go Back</Button>
				</div>
			</div>
		);
	}

	if (!conversation) {
		// This should only happen if query is disabled or still initializing
		// Show loading state instead of "not found" to prevent flash
		return (
			<div className="min-h-screen flex items-center justify-center">
				<LoadingSpinner />
			</div>
		);
	}

	// Determine conversation header text
	const headerText =
		conversation.type === "coordinator_group"
			? "Coordinator Chat"
			: "Foster Chat";

	return (
		<div className="min-h-screen flex flex-col">
			{/* Header */}
			<div className="bg-white border-b border-gray-200 p-4 flex items-center gap-4">
				<Button
					onClick={() => navigate(-1)}
					variant="outline"
					className="w-auto"
				>
					← Back
				</Button>
				<h1 className="text-xl font-semibold">{headerText}</h1>
			</div>

			{/* Message List */}
			<div className="flex-1 overflow-y-auto">
				<MessageList conversationId={conversation.id} />
			</div>

			{/* MessageInput will be added in M 5.5b */}
		</div>
	);
}
